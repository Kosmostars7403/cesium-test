import {Directive, ElementRef, Inject, NgZone, OnDestroy, OnInit} from '@angular/core';
import {
  CallbackProperty,
  Cartesian3,
  Cartographic,
  Color,
  ColorMaterialProperty,
  createOsmBuildings,
  createWorldTerrain,
  defined,
  Entity,
  GeoJsonDataSource,
  HeightReference,
  Ion,
  JulianDate,
  Math as CesiumMath,
  PathGraphics,
  PolygonHierarchy,
  SampledPositionProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  TimeInterval,
  TimeIntervalCollection,
  Viewer
} from 'cesium';
import {of, Subject, switchMap, takeUntil, tap} from 'rxjs';
import {API_KEY} from '../../access.token';
import {CesiumService} from '../../cesium.service';
import {GeoJson, GeoResponse, Times} from '../../models/geo-response.model';
import {GeoJsonPreparer} from './geojson-preparer';

const ANIMATION_FRAME_START = 28

@Directive({
  selector: '[appCesium]',
  exportAs: 'viewer'
})
export class CesiumDirective implements OnInit, OnDestroy {
  viewer!: Viewer

  unsubscribe$ = new Subject()

  drawingMode: 'LineString' | 'Polygon' = 'LineString'

  activeShapePoints: Cartesian3[] = [];
  activeShape: Entity | undefined;
  floatingPoint: Entity | undefined;

  constructor(
    private el: ElementRef,
    private cesiumService: CesiumService,
    private ngZone: NgZone,
    @Inject(API_KEY) private apiKey: string
  ) {
  }

  createPoint(worldPosition: any) {
    return this.viewer.entities.add({
      position: worldPosition,
      point: {
        color: Color.WHITE,
        pixelSize: 5,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
  }

  drawShape(positionData: any) {
    let shape;
    if (this.drawingMode === 'LineString') {
      shape = this.viewer.entities.add({
        polyline: {
          positions: positionData,
          clampToGround: true,
          width: 3,
        },
      });
    } else if (this.drawingMode === 'Polygon') {
      shape = this.viewer.entities.add({
        polygon: {
          hierarchy: positionData,
          material: new ColorMaterialProperty(
            Color.WHITE.withAlpha(0.7)
          ),
        },
      });
    }
    return shape;
  }

  finishDrawing() {
    this.activeShapePoints.pop();
    const shape = this.drawShape(this.activeShapePoints);
    if (this.drawingMode === 'Polygon') {
      const {positions} = shape?.polygon?.hierarchy?.getValue(JulianDate.now())
      const geoJson = new GeoJsonPreparer(this.drawingMode, positions)
        .toGeoJSon()?.normalizeIntoFeatureCollection()
      console.log(geoJson)
    } else {
      const positions = shape?.polyline?.positions?.getValue(JulianDate.now())
      const geoJson = new GeoJsonPreparer(this.drawingMode, positions)
        .toGeoJSon()?.normalizeIntoFeatureCollection()
      console.log(geoJson)
    }

    if (this.floatingPoint) this.viewer.entities.remove(this.floatingPoint);
    if (this.activeShape) this.viewer.entities.remove(this.activeShape);
    this.floatingPoint = undefined;
    this.activeShape = undefined;
    this.activeShapePoints = [];
  }

  private testDraw() {
    // ???????????? ?? ??????, ???????? ?????????????? ???????????? ???????????????? ?? ?????????????? ??????????, ?????? ?????? ??????????????????
    this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // ScreenSpaceEventHandler - ?????????????? ?????????? ?????????? ???? ???????????????????? ??????????????. ???????????????? ???????????? ?????????? ?????????? Cesium
    const handler = new ScreenSpaceEventHandler(this.viewer.canvas);

    // ???????? ????????, ?????? addEventListener, ???????????????? CB ?? ???????????????? ??????????????
    handler.setInputAction((event: any) => {
      // ???????????????? ???????????????????? ???? ??????????????, ?????????????? "????????????" ???????? ?????????? ?? ?????????????????????????? ???? ???? ?????????????? ????????????????????
      const earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        if (this.activeShapePoints.length === 0) {
          this.floatingPoint = this.createPoint(earthPosition);
          this.activeShapePoints.push(earthPosition);
          const dynamicPositions = new CallbackProperty(() => {
            if (this.drawingMode === 'Polygon') {
              return new PolygonHierarchy(this.activeShapePoints);
            }
            return this.activeShapePoints;
          }, false);
          this.activeShape = this.drawShape(dynamicPositions);
        }
        this.activeShapePoints.push(earthPosition);
        this.createPoint(earthPosition);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((event: any) => {
      if (this.floatingPoint) {
        const newPosition = this.viewer.scene.pickPosition(event.endPosition);
        if (newPosition) {
          this.activeShapePoints.pop();
          this.activeShapePoints.push(newPosition);
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction((event: any) => {
      this.finishDrawing();
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initializeMap()
    })

    this.testDraw()
    this.watchDataSource()
  }

  private watchDataSource() {
    this.cesiumService.animate$.pipe(
      switchMap(isAnimate => {
        this.cleanMap()

        if (isAnimate) {
          return this.cesiumService.flight$.pipe(
            tap(geometry => {
              if (!geometry) return of(null)
              return this.drawTrajectory(geometry)
            })
          )
        }

        return this.cesiumService.geometry$
          .pipe(
            tap(async (geometry) => {
              if (geometry) await this.drawGeoJson(geometry)
            }))
      }),
      takeUntil(this.unsubscribe$)
    ).subscribe()
  }

  private initializeMap() {
    Ion.defaultAccessToken = this.apiKey

    this.viewer = new Viewer(this.el.nativeElement, {
      terrainProvider: createWorldTerrain(),
      requestRenderMode: true
    });

    this.viewer.scene.primitives.add(createOsmBuildings());
  }

  private async drawGeoJson(geometry: GeoJson) {
    const geoJSON = await GeoJsonDataSource.load(geometry)
    const dataSource = await this.viewer.dataSources.add(geoJSON);
    const entity = dataSource.entities.values[0];

    for (const point of entity.polyline?.positions?.getValue(new JulianDate())) {
      this.drawPoint(point, point.x, point.y, point.z)
    }

    await this.viewer.flyTo(dataSource);
  }

  private drawTrajectory({coordinates, times}: GeoResponse) {
    const startStop = this.setClock(times)
    const positionProperty = this.setPointsPositionProperty({coordinates, times})

    const droneEntity = this.viewer.entities.add({
      availability: new TimeIntervalCollection([new TimeInterval(startStop)]),
      position: positionProperty,
      point: {pixelSize: 30, color: Color.GREENYELLOW},
      path: new PathGraphics({width: 3})
    });

    this.viewer.trackedEntity = droneEntity;
  }

  private setClock(times: Times) {
    const start = JulianDate.fromIso8601(times[ANIMATION_FRAME_START]);
    const stop = JulianDate.fromIso8601(times.at(-1) ?? '');
    this.viewer.clock.startTime = start.clone();
    this.viewer.clock.stopTime = stop.clone();
    this.viewer.clock.currentTime = start.clone();
    this.viewer.timeline.zoomTo(start, stop);
    this.viewer.clock.multiplier = 5;
    this.viewer.clock.shouldAnimate = true;

    return {start, stop}
  }

  private setPointsPositionProperty({coordinates, times}: GeoResponse) {
    const positionProperty = new SampledPositionProperty();

    for (let i = ANIMATION_FRAME_START; i < coordinates.length; i++) {
      const dataPoint = coordinates[i];
      if (Math.abs(coordinates[i - 1]?.[0] - dataPoint[0]) > 0.01) continue

      const time = JulianDate.fromIso8601(times[i]);
      const position = Cartesian3.fromDegrees(dataPoint[0], dataPoint[1], dataPoint[2]);

      this.drawPoint(position, dataPoint[0], dataPoint[1], dataPoint[2])

      positionProperty.addSample(time, position);
    }

    return positionProperty
  }

  private drawPoint(position: Cartesian3, x: number, y: number, z: number) {
    this.viewer.entities.add({
      description: `Location: (${x}, ${y}, ${z})`,
      position,
      point: {pixelSize: 10, color: Color.RED}
    });
  }

  private cleanMap() {
    this.viewer.entities.removeAll();
    this.viewer.dataSources.removeAll();
  }

  ngOnDestroy() {
    this.unsubscribe$.next('')
    this.unsubscribe$.complete()
  }
}

import {Directive, ElementRef, Inject, NgZone, OnDestroy, OnInit} from '@angular/core';
import {
  Cartesian3,
  Color,
  createOsmBuildings,
  createWorldTerrain, GeoJsonDataSource,
  Ion,
  JulianDate,
  PathGraphics,
  SampledPositionProperty,
  TimeInterval,
  TimeIntervalCollection,
  Viewer
} from 'cesium';
import {of, Subject, switchMap, takeUntil, tap} from 'rxjs';
import {API_KEY} from './access.token';
import {CesiumService} from './cesium.service';
import {GeoResponse, Times} from './models/geo-response.model';

const ANIMATION_FRAME_START = 28

@Directive({
  selector: '[appCesium]'
})
export class CesiumDirective implements OnInit, OnDestroy {
  viewer!: Viewer

  unsubscribe$ = new Subject()

  constructor(
    private el: ElementRef,
    private cesiumService: CesiumService,
    private ngZone: NgZone,
    @Inject(API_KEY) private apiKey: string
  ) {
  }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initializeMap()
    })

    this.cesiumService.animate$.pipe(
      switchMap(isAnimate => {
        this.viewer.entities.removeAll();
        this.viewer.dataSources.removeAll();
        if (isAnimate) {
          return this.cesiumService.flight$.pipe(
            tap(geometry => {
              if (!geometry) return of(null)
              return this.drawTrajectory(geometry)
            })
          )
        }
        return this.cesiumService.geometry$
          .pipe(tap(async (geometry) => {
            const geoJSON = await GeoJsonDataSource.load(geometry, { clampToGround: true });
            const dataSource = await this.viewer.dataSources.add(geoJSON);
            await this.viewer.flyTo(dataSource);
          }))
      }),
      takeUntil(this.unsubscribe$)
    ).subscribe()
  }

  private initializeMap() {
    Ion.defaultAccessToken = this.apiKey

    this.viewer = new Viewer(this.el.nativeElement, {
      terrainProvider: createWorldTerrain()
    });

    this.viewer.scene.primitives.add(createOsmBuildings());
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
      if (Math.abs(coordinates[i-1]?.[0] - dataPoint[0]) > 0.01) continue

      const time = JulianDate.fromIso8601(times[i]);
      const position = Cartesian3.fromDegrees(dataPoint[0], dataPoint[1], dataPoint[2]);

      this.viewer.entities.add({
        description: `Location: (${dataPoint[0]}, ${dataPoint[1]}, ${dataPoint[2]})`,
        position: position,
        point: {pixelSize: 10, color: Color.RED}
      });

      positionProperty.addSample(time, position);
    }

    return positionProperty
  }

  ngOnDestroy() {
    this.unsubscribe$.next('')
    this.unsubscribe$.complete()
  }
}

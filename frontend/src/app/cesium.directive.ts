import {Directive, ElementRef, Inject, OnDestroy, OnInit} from '@angular/core';
import {
  Cartesian3,
  Color,
  createOsmBuildings,
  createWorldTerrain,
  Ion, IonResource,
  JulianDate, PathGraphics,
  SampledPositionProperty, TimeInterval, TimeIntervalCollection, VelocityOrientationProperty,
  Viewer
} from 'cesium';
import {Subject, takeUntil} from 'rxjs';
import {API_KEY} from './access.token';
import {CesiumService} from './cesium.service';
import {GeoResponse, Point, Times} from './models/geo-response.model';

@Directive({
  selector: '[appCesium]'
})
export class CesiumDirective implements OnInit, OnDestroy{
  viewer!: Viewer

  unsubscribe$ = new Subject()

  constructor(
    private el: ElementRef,
    private cesiumService: CesiumService,
    @Inject(API_KEY) private apiKey: string
  ) {
  }

  ngOnInit(): void {
    this.initializeMap()

    this.cesiumService.geometry$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(geometry => {
        this.viewer.entities.removeAll();
        this.drawTrajectory(geometry)
      })
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
      availability: new TimeIntervalCollection([ new TimeInterval(startStop) ]),
      position: positionProperty,
      point: { pixelSize: 30, color: Color.GREENYELLOW },
      path: new PathGraphics({ width: 3 })
    });

    this.viewer.trackedEntity = droneEntity;
  }

  private setClock(times: Times) {
    const start = JulianDate.fromIso8601(times[0]);
    const stop = JulianDate.fromIso8601(times.at(-1) ?? '');
    this.viewer.clock.startTime = start.clone();
    this.viewer.clock.stopTime = stop.clone();
    this.viewer.clock.currentTime = start.clone();
    this.viewer.timeline.zoomTo(start, stop);
    this.viewer.clock.multiplier = 20;
    this.viewer.clock.shouldAnimate = true;

    return {start, stop}
  }

  private setPointsPositionProperty({coordinates, times}: GeoResponse) {
    const positionProperty = new SampledPositionProperty();

    for (let i = 0; i < coordinates.length; i++) {
      const dataPoint = coordinates[i];

      const time = JulianDate.fromIso8601(times[i]);
      const position = Cartesian3.fromDegrees(dataPoint[0], dataPoint[1], dataPoint[2]);

      this.viewer.entities.add({
        description: `Location: (${dataPoint[0]}, ${dataPoint[1]}, ${dataPoint[2]})`,
        position: position,
        point: { pixelSize: 10, color: Color.RED }
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

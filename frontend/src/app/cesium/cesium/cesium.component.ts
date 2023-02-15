import { Component } from '@angular/core';
import {CesiumService} from '../../cesium.service';

@Component({
  selector: 'app-cesium',
  templateUrl: './cesium.component.html',
  styleUrls: ['./cesium.component.scss']
})
export class CesiumComponent {
  kmlFile: File | null = null
  animate$ = this.cesiumService.animate$
  geometry$ = this.cesiumService.geometry$

  constructor(private cesiumService: CesiumService) {
  }

  upload() {
    if (this.kmlFile) {
      this.cesiumService.uploadKml(this.kmlFile)
        .subscribe()
    }
  }

  onDropFile({files}: HTMLInputElement) {
    this.kmlFile = files?.[0] ?? null
  }
}

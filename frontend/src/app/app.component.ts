import {Component} from '@angular/core';
import {CesiumService} from './cesium.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  kmlFile: File | null = null

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

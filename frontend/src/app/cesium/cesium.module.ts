import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterModule} from '@angular/router';
import { CesiumComponent } from './cesium/cesium.component';
import {CesiumDirective} from './cesium/cesium.directive';



@NgModule({
  declarations: [
    CesiumComponent,
    CesiumDirective
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([{
      path: '', component: CesiumComponent
    }]),
  ]
})
export class CesiumModule { }

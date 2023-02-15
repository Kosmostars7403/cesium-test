import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {RouterModule} from '@angular/router';
import {API_KEY} from './access.token';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([
      {
        path: 'cesium',
        loadChildren: () => import('./cesium/cesium.module').then(m => m.CesiumModule)
      }
    ])
  ],
  providers: [
    {
      provide: API_KEY,
      useValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzZWE4NmU3Mi03MjRhLTQ5NmMtYjYyNi1lOTNlOWFjNWYxNDgiLCJpZCI6MTIzMjM0LCJpYXQiOjE2NzUzNTQ3NjZ9.ksXDKOB00GPQSNZvWLZAhM85oHsTyrcHQblm0VAvI-g'
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

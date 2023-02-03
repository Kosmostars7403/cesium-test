import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {API_KEY} from './access.token';

import { AppComponent } from './app.component';
import { CesiumDirective } from './cesium.directive';

@NgModule({
  declarations: [
    AppComponent,
    CesiumDirective
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
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

import {HttpClient} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {Subject, tap} from 'rxjs';
import {GeoResponse} from './models/geo-response.model';


@Injectable({
  providedIn: 'root'
})
export class CesiumService {
  geometry$ = new Subject<GeoResponse>()

  constructor(private http: HttpClient) {}

  uploadKml(kml: File) {
    const fd = new FormData()
    fd.append('file', kml)
    fd.append('body', '')

    return this.http.post<GeoResponse>('http://127.0.0.1:8000/', fd)
      .pipe(
        tap(val => this.geometry$.next(val))
      )
  }

}

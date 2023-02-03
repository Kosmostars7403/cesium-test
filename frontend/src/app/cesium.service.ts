import {HttpClient} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {BehaviorSubject, Subject, tap} from 'rxjs';
import {GeoJson, GeoResponse} from './models/geo-response.model';


@Injectable({
  providedIn: 'root'
})
export class CesiumService {
  geometry$ = new BehaviorSubject<GeoJson | null>(null)
  flight$ = new BehaviorSubject<GeoResponse | null>(null)
  animate$ = new Subject()

  constructor(private http: HttpClient) {}

  uploadKml(kml: File) {
    const fd = new FormData()
    fd.append('file', kml)
    fd.append('body', '')

    return this.http.post<GeoJson>('http://127.0.0.1:8000/', fd)
      .pipe(
        tap(geoData => {
          this.geometry$.next(geoData)
          const feature = geoData?.features?.[0]
          this.flight$.next({
            coordinates: feature?.geometry.coordinates,
            times: feature?.properties.times
          })
        })
      )
  }
}

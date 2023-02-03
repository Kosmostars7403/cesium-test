export type Point = [number, number, number]

export type Times = string[]

export interface GeoResponse {
  coordinates: Point[],
  times: Times
}

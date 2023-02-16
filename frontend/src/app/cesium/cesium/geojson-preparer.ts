import {Cartesian3, Cartographic, Math as CesiumMath} from 'cesium';

export type GeoJsonShape = 'LineString' | 'Polygon'

export class GeoJsonPreparer {
  type!: GeoJsonShape
  coords!: Cartesian3[]

  geoJsonEntity: any

  constructor(
    type: GeoJsonShape,
    coords: Cartesian3[]
  ) {
    this.type = type
    this.coords = coords
  }

  toGeoJSon() {
    if (this.type === 'Polygon') {
      return this.convertCartesianPolygonToGeoJson(this.coords)
    }

    if (this.type === 'LineString') {
      return this.convertCartesianLineToGeoJson(this.coords)
    }

    return null
  }

  private convertCartesianPolygonToGeoJson(cartesianCoords: Cartesian3[]) {
    const geoJson: { type: 'Polygon', coordinates: number[][][] } = {
      type: 'Polygon',
      coordinates: [[]]
    }

    const coords = geoJson.coordinates[0]

    for (let cartesian of cartesianCoords) {
      const cartographicPoint = Cartographic.fromCartesian(cartesian)
      coords.push([
        CesiumMath.toDegrees(cartographicPoint.longitude),
        CesiumMath.toDegrees(cartographicPoint.latitude)
      ])
    }

    coords.push(coords[0])
    this.geoJsonEntity = geoJson

    return this
  }

  private convertCartesianLineToGeoJson(cartesianCoords: Cartesian3[]) {
    const geoJson: { type: 'LineString', coordinates: number[][] } = {
      type: 'LineString',
      coordinates: []
    }

    for (let cartesian of cartesianCoords) {
      const cartographicPoint = Cartographic.fromCartesian(cartesian)
      geoJson.coordinates.push([
        CesiumMath.toDegrees(cartographicPoint.longitude),
        CesiumMath.toDegrees(cartographicPoint.latitude)
      ])
    }

    this.geoJsonEntity = geoJson

    return this
  }

  normalizeIntoFeatureCollection() {
    return {
      'type': 'FeatureCollection',
      'features': [
        {
          'type': 'Feature',
          'properties': {},
          'geometry': this.geoJsonEntity
        }
      ]
    }
  }

}

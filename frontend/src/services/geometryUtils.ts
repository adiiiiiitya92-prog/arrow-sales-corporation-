/**
 * Geometry utilities for solar panel fitting and shadow analysis.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Checks if a 2D point is inside a polygon using the Ray-Casting algorithm.
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let isInside = false;
  const { x, y } = point;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi);
      
    if (intersect) isInside = !isInside;
  }
  
  return isInside;
}

/**
 * Converts a Lat/Lng point to 2D meter coordinates relative to an origin point.
 * Uses the Google Maps spherical geometry library under the hood.
 */
export function latLngToMeters(
  point: google.maps.LatLng | google.maps.LatLngLiteral,
  origin: google.maps.LatLng | google.maps.LatLngLiteral,
  googleMaps: any
): Point2D {
  const spherical = googleMaps.geometry.spherical;
  
  // Convert input to LatLng objects if they aren't already
  const pLatLng = new googleMaps.LatLng(point.lat, point.lng);
  const oLatLng = new googleMaps.LatLng(origin.lat, origin.lng);
  
  const distance = spherical.computeDistanceBetween(oLatLng, pLatLng);
  const heading = spherical.computeHeading(oLatLng, pLatLng);
  const headingRad = (heading * Math.PI) / 180;
  
  return {
    x: distance * Math.sin(headingRad),
    y: distance * Math.cos(headingRad)
  };
}

/**
 * Converts 2D local meter coordinates back to Lat/Lng coordinates based on an origin.
 */
export function metersToLatLng(
  coord: Point2D,
  origin: google.maps.LatLng | google.maps.LatLngLiteral,
  googleMaps: any
): google.maps.LatLng {
  const spherical = googleMaps.geometry.spherical;
  const oLatLng = new googleMaps.LatLng(origin.lat, origin.lng);
  
  const distance = Math.sqrt(coord.x * coord.x + coord.y * coord.y);
  const headingRad = Math.atan2(coord.x, coord.y);
  const headingDeg = (headingRad * 180) / Math.PI;
  
  return spherical.computeOffset(oLatLng, distance, headingDeg);
}

/**
 * Calculates the shortest distance from point p to the line segment ab.
 */
export function distanceToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }
  
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const closestX = a.x + t * dx;
  const closestY = a.y + t * dy;
  
  return Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);
}

/**
 * Computes the minimum distance from a point to any edge of a polygon.
 */
export function minDistanceToPolygonEdges(p: Point2D, poly: Point2D[]): number {
  let minD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const d = distanceToSegment(p, a, b);
    if (d < minD) {
      minD = d;
    }
  }
  return minD;
}

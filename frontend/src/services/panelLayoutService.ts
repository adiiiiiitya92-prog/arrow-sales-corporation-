import {
  isPointInPolygon,
  latLngToMeters,
  metersToLatLng,
  minDistanceToPolygonEdges
} from './geometryUtils';
import type { Point2D } from './geometryUtils';

export interface PanelSpec {
  width: number;       // default 1.1m
  length: number;      // default 1.7m
  wattage: number;     // default 550W
}

export interface LayoutConfig {
  setback: number;     // default 0.5m
  rowSpacing: number;  // default 0.02m
  colSpacing: number;  // default 0.02m
  orientation: 'portrait' | 'landscape';
}

export interface Obstruction {
  id: string;
  type: string; // 'cylinder' | 'polygon'
  lat: number;  // primary pin marker latitude
  lng: number;  // primary pin marker longitude
  heightMeters: number;
  widthMeters: number; // diameter for cylinders
  path?: google.maps.LatLngLiteral[]; // outline for polygon obstructions
}

export interface FittedPanel {
  id: string;
  bounds: google.maps.LatLngLiteral[]; // 4 corners for maps
  center: google.maps.LatLngLiteral;   // center for shading/maps
  localBounds: Point2D[];              // local 2D corners
  localCenter: Point2D;                // local 2D center
  shadingLoss: number;                 // shading % (0 to 100)
  isRecommended: boolean;              // false if shading > 40%
}

export interface LayoutResult {
  panels: FittedPanel[];
  totalPanels: number;
  systemSizeKw: number;
  usableAreaSqm: number;
}

/**
 * Fit panels on the roof polygon, respecting setback boundaries and obstruction footprints.
 */
export function calculatePanelLayout(
  roofPolygon: google.maps.LatLngLiteral[],
  panelSpec: PanelSpec,
  layoutConfig: LayoutConfig,
  obstructions: Obstruction[],
  googleMaps: any
): LayoutResult {
  if (!roofPolygon || roofPolygon.length < 3) {
    return { panels: [], totalPanels: 0, systemSizeKw: 0, usableAreaSqm: 0 };
  }

  const origin = roofPolygon[0];
  
  // Convert polygon vertices to local coordinates
  const localPoly = roofPolygon.map(p => latLngToMeters(p, origin, googleMaps));

  // Find bounding box in local coordinates
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  localPoly.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  // Determine panel size on local grid based on orientation
  const panelW = layoutConfig.orientation === 'portrait' ? panelSpec.width : panelSpec.length;
  const panelH = layoutConfig.orientation === 'portrait' ? panelSpec.length : panelSpec.width;

  // Convert circular obstructions to local footprints
  const localObsCylinders = obstructions
    .filter(obs => obs.type !== 'polygon')
    .map(obs => {
      const localPos = latLngToMeters({ lat: obs.lat, lng: obs.lng }, origin, googleMaps);
      const radius = (obs.widthMeters / 2) + 0.1; // 10cm clearance buffer
      return { x: localPos.x, y: localPos.y, radius };
    });

  // Convert polygon obstructions to local coordinate arrays
  const localObsPolygons = obstructions
    .filter(obs => obs.type === 'polygon' && obs.path && obs.path.length >= 3)
    .map(obs => {
      return obs.path!.map(pt => latLngToMeters(pt, origin, googleMaps));
    });

  const fittedPanels: FittedPanel[] = [];
  let panelIdCounter = 1;

  // Step and grid scan
  const xStep = panelW + layoutConfig.colSpacing;
  const yStep = panelH + layoutConfig.rowSpacing;

  for (let x = minX + layoutConfig.setback; x <= maxX - layoutConfig.setback - panelW; x += xStep) {
    for (let y = minY + layoutConfig.setback; y <= maxY - layoutConfig.setback - panelH; y += yStep) {
      // 4 corners of the prospective panel
      const c1: Point2D = { x, y };
      const c2: Point2D = { x: x + panelW, y };
      const c3: Point2D = { x: x + panelW, y: y + panelH };
      const c4: Point2D = { x, y: y + panelH };
      const corners = [c1, c2, c3, c4];

      // Check 1: Are all 4 corners inside the roof polygon?
      const allInside = corners.every(c => isPointInPolygon(c, localPoly));
      if (!allInside) continue;

      // Check 2: Are all 4 corners at least 'setback' meters away from all polygon edges?
      const respectsSetback = corners.every(c => minDistanceToPolygonEdges(c, localPoly) >= layoutConfig.setback);
      if (!respectsSetback) continue;

      // Check 3a: Does it overlap any circular cylinder obstruction footprint?
      const overlapsCircular = localObsCylinders.some(obs => {
        const closestX = Math.max(x, Math.min(obs.x, x + panelW));
        const closestY = Math.max(y, Math.min(obs.y, y + panelH));
        const dx = obs.x - closestX;
        const dy = obs.y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < obs.radius;
      });
      if (overlapsCircular) continue;

      // Check 3b: Does it overlap or sit too close to any polygon obstruction?
      const localCenter: Point2D = { x: x + panelW / 2, y: y + panelH / 2 };
      const overlapsPolygon = localObsPolygons.some(poly => {
        // 1. Center is inside
        if (isPointInPolygon(localCenter, poly)) return true;
        // 2. Any corner is inside
        if (corners.some(c => isPointInPolygon(c, poly))) return true;
        // 3. Any vertex of the obstruction polygon is inside the panel rectangle
        if (poly.some(pt => pt.x >= x && pt.x <= x + panelW && pt.y >= y && pt.y <= y + panelH)) return true;
        // 4. Any panel corner is within 25cm safety buffer from the structure walls
        if (corners.some(c => minDistanceToPolygonEdges(c, poly) < 0.25)) return true;
        return false;
      });
      if (overlapsPolygon) continue;

      // If all checks pass, we add this panel!

      // Project corners and center back to Lat/Lng
      const boundsLatLng = corners.map(c => {
        const ll = metersToLatLng(c, origin, googleMaps);
        return { lat: ll.lat(), lng: ll.lng() };
      });
      const centerLatLng = metersToLatLng(localCenter, origin, googleMaps);

      fittedPanels.push({
        id: `panel_${panelIdCounter++}`,
        bounds: boundsLatLng,
        center: { lat: centerLatLng.lat(), lng: centerLatLng.lng() },
        localBounds: corners,
        localCenter,
        shadingLoss: 0,
        isRecommended: true
      });
    }
  }

  const systemSizeKw = (fittedPanels.length * panelSpec.wattage) / 1000;
  const singlePanelArea = panelSpec.width * panelSpec.length;
  const usableAreaSqm = fittedPanels.length * singlePanelArea;

  return {
    panels: fittedPanels,
    totalPanels: fittedPanels.length,
    systemSizeKw,
    usableAreaSqm
  };
}

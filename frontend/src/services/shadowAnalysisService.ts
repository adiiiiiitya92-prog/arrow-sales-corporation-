import SunCalc from 'suncalc';
import { isPointInPolygon, latLngToMeters } from './geometryUtils';
import type { Point2D } from './geometryUtils';
import type { FittedPanel, Obstruction } from './panelLayoutService';

export interface ShadingAnalysisResult {
  panels: FittedPanel[];
  overallShadingLoss: number;
  totalRecommended: number;
  totalNotRecommended: number;
  usablePanelsCount: number;
}

/**
 * Perform annual shading analysis for each fitted panel.
 * Projects shadows from obstructions at solstice and equinox hourly intervals
 * and updates panel shading percentages and recommendations.
 */
export function calculateShading(
  panels: FittedPanel[],
  obstructions: Obstruction[],
  siteLatLng: { lat: number; lng: number },
  googleMaps: any
): ShadingAnalysisResult {
  if (panels.length === 0) {
    return {
      panels,
      overallShadingLoss: 0,
      totalRecommended: 0,
      totalNotRecommended: 0,
      usablePanelsCount: 0
    };
  }

  // 1. Define sample dates representing seasonal variations:
  // - Summer Solstice (June 21)
  // - Winter Solstice (Dec 21)
  // - Spring Equinox (March 21)
  // - Autumn Equinox (September 21)
  const sampleDates = [
    new Date(2026, 5, 21),
    new Date(2026, 11, 21),
    new Date(2026, 2, 21),
    new Date(2026, 8, 21)
  ];

  // Hourly sampling from 9 AM to 5 PM (productive solar hours)
  const sampleHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  
  // Total sample slots (4 dates * 9 hours = 36 slots)
  const totalSlots = sampleDates.length * sampleHours.length;

  const origin = siteLatLng;

  // Initialize shading counts for each panel
  const panelShadeCounts = new Map<string, number>();
  panels.forEach(p => panelShadeCounts.set(p.id, 0));

  // Convert obstruction base coordinates to local meter coordinates
  const localObs = obstructions.map(obs => {
    const localPath = obs.type === 'polygon' && obs.path
      ? obs.path.map(pt => latLngToMeters(pt, origin, googleMaps))
      : undefined;

    const localPos = latLngToMeters({ lat: obs.lat, lng: obs.lng }, origin, googleMaps);
    return {
      id: obs.id,
      type: obs.type,
      height: obs.heightMeters,
      width: obs.widthMeters,
      localPos,
      localPath
    };
  });

  // Calculate local coordinates of panel centers
  const localPanelCenters = panels.map(p => ({
    id: p.id,
    localCenter: p.localCenter
  }));

  // 2. Loop through all sample dates and hours
  sampleDates.forEach(date => {
    sampleHours.forEach(hour => {
      const dateTime = new Date(date);
      dateTime.setHours(hour, 0, 0, 0);

      // Compute sun position using suncalc
      const sunPos = SunCalc.getPosition(dateTime, siteLatLng.lat, siteLatLng.lng);
      const altitude = sunPos.altitude; 
      const azimuth = sunPos.azimuth;   

      // If sun is below or at the horizon, skip
      if (altitude <= 0) return;

      // Project shadow polygons for each obstruction
      const shadowPolygons: Point2D[][] = [];

      localObs.forEach(obs => {
        // Shadow length = height / tan(altitude)
        const shadowLength = obs.height / Math.tan(altitude);
        const cappedLength = Math.min(shadowLength, 50);

        // Shadow direction vector
        const dx = Math.sin(azimuth);
        const dy = Math.cos(azimuth);

        if (obs.type === 'polygon' && obs.localPath && obs.localPath.length >= 3) {
          // Polygon shadow: project shadow from each segment of the polygon obstruction
          const poly = obs.localPath;
          const n = poly.length;

          for (let i = 0; i < n; i++) {
            const v1 = poly[i];
            const v2 = poly[(i + 1) % n]; // next vertex (wrap around)

            const v1Shifted: Point2D = {
              x: v1.x + cappedLength * dx,
              y: v1.y + cappedLength * dy
            };
            const v2Shifted: Point2D = {
              x: v2.x + cappedLength * dx,
              y: v2.y + cappedLength * dy
            };

            // Quadrilateral shadow cast by this segment
            shadowPolygons.push([v1, v2, v2Shifted, v1Shifted]);
          }
        } else {
          // Cylinder shadow (capsule shape)
          const px = -dy;
          const py = dx;
          const halfW = obs.width / 2;

          const bl: Point2D = {
            x: obs.localPos.x - halfW * px,
            y: obs.localPos.y - halfW * py
          };
          const br: Point2D = {
            x: obs.localPos.x + halfW * px,
            y: obs.localPos.y + halfW * py
          };
          const tl: Point2D = {
            x: bl.x + cappedLength * dx,
            y: bl.y + cappedLength * dy
          };
          const tr: Point2D = {
            x: br.x + cappedLength * dx,
            y: br.y + cappedLength * dy
          };

          shadowPolygons.push([bl, br, tr, tl]);
        }
      });

      // 3. Test if panel centers lie within any shadow polygon
      localPanelCenters.forEach(p => {
        const isShaded = shadowPolygons.some(poly => isPointInPolygon(p.localCenter, poly));
        if (isShaded) {
          panelShadeCounts.set(p.id, (panelShadeCounts.get(p.id) || 0) + 1);
        }
      });
    });
  });

  // 4. Compute shading scores and update panel recommendation statuses
  let totalRecommended = 0;
  let totalNotRecommended = 0;
  let shadingLossSum = 0;

  const updatedPanels = panels.map(p => {
    const shadedSlots = panelShadeCounts.get(p.id) || 0;
    const shadingLoss = Math.round((shadedSlots / totalSlots) * 100);
    const isRecommended = shadingLoss <= 40;

    if (isRecommended) {
      totalRecommended++;
      shadingLossSum += shadingLoss;
    } else {
      totalNotRecommended++;
    }

    return {
      ...p,
      shadingLoss,
      isRecommended
    };
  });

  // Overall shading loss is average shading loss across RECOMMENDED panels
  const overallShadingLoss = totalRecommended > 0 ? Math.round(shadingLossSum / totalRecommended) : 0;
  const usablePanelsCount = totalRecommended;

  return {
    panels: updatedPanels,
    overallShadingLoss,
    totalRecommended,
    totalNotRecommended,
    usablePanelsCount
  };
}

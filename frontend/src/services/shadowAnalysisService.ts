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

export interface ShadowVisualizationResult {
  shadowPolygons: Point2D[][];  // in local meter coords
  sunAltitude: number;
  sunAzimuth: number;
  timestamp: Date;
}

export interface ShadingConfig {
  analysisDate?: Date;       // specific date for analysis (defaults to seasonal sampling)
  timeStart?: number;        // start hour (default 9)
  timeEnd?: number;          // end hour (default 17)
  panelTiltDeg?: number;     // panel tilt in degrees
  panelAzimuthDeg?: number;  // panel azimuth in degrees
}

/**
 * Calculate the suggestive pitch distance based on panel tilt, length, and latitude.
 * Uses the winter solstice noon solar altitude to ensure no inter-row shading.
 * Formula: pitchDistance = panelLength × sin(tilt) / tan(winterSolarAltitude) + panelLength × cos(tilt)
 */
export function calculateSuggestedPitchDistance(
  panelLengthM: number,
  tiltDeg: number,
  latitudeDeg: number
): number {
  if (tiltDeg <= 0) return panelLengthM;

  // Winter solstice noon solar altitude ≈ 90 - latitude - 23.45
  const winterSolarAltitudeDeg = 90 - Math.abs(latitudeDeg) - 23.45;
  const winterSolarAltitudeRad = (Math.max(winterSolarAltitudeDeg, 5) * Math.PI) / 180;
  const tiltRad = (tiltDeg * Math.PI) / 180;

  // Shadow length from tilted panel rear edge
  const panelHeight = panelLengthM * Math.sin(tiltRad);
  const shadowLength = panelHeight / Math.tan(winterSolarAltitudeRad);

  // Total pitch = horizontal projection of panel + shadow gap
  const horizontalProjection = panelLengthM * Math.cos(tiltRad);
  const pitch = horizontalProjection + shadowLength;

  return Math.round(pitch * 100) / 100; // round to cm
}

/**
 * Calculate shadow polygons for a specific date/time for real-time map visualization.
 * Returns shadow polygons in local meter coordinates relative to siteLatLng.
 */
export function calculateShadowPolygonsForVisualization(
  obstructions: Obstruction[],
  siteLatLng: { lat: number; lng: number },
  dateTime: Date,
  googleMaps: any
): ShadowVisualizationResult {
  const origin = siteLatLng;
  const sunPos = SunCalc.getPosition(dateTime, siteLatLng.lat, siteLatLng.lng);
  const altitude = sunPos.altitude;
  const azimuth = sunPos.azimuth;

  if (altitude <= 0) {
    return {
      shadowPolygons: [],
      sunAltitude: (altitude * 180) / Math.PI,
      sunAzimuth: (azimuth * 180) / Math.PI,
      timestamp: dateTime
    };
  }

  const localObs = obstructions.map(obs => {
    const localPath = obs.type === 'polygon' && obs.path
      ? obs.path.map(pt => latLngToMeters(pt, origin, googleMaps))
      : undefined;
    const localPos = latLngToMeters({ lat: obs.lat, lng: obs.lng }, origin, googleMaps);
    return { id: obs.id, type: obs.type, height: obs.heightMeters, width: obs.widthMeters, localPos, localPath };
  });

  const shadowPolygons: Point2D[][] = [];

  localObs.forEach(obs => {
    const shadowLength = Math.min(obs.height / Math.tan(altitude), 50);
    const dx = Math.sin(azimuth);
    const dy = Math.cos(azimuth);

    if (obs.type === 'polygon' && obs.localPath && obs.localPath.length >= 3) {
      const poly = obs.localPath;
      for (let i = 0; i < poly.length; i++) {
        const v1 = poly[i];
        const v2 = poly[(i + 1) % poly.length];
        shadowPolygons.push([
          v1, v2,
          { x: v2.x + shadowLength * dx, y: v2.y + shadowLength * dy },
          { x: v1.x + shadowLength * dx, y: v1.y + shadowLength * dy }
        ]);
      }
    } else {
      const px = -dy;
      const py = dx;
      const halfW = obs.width / 2;
      const bl: Point2D = { x: obs.localPos.x - halfW * px, y: obs.localPos.y - halfW * py };
      const br: Point2D = { x: obs.localPos.x + halfW * px, y: obs.localPos.y + halfW * py };
      const tl: Point2D = { x: bl.x + shadowLength * dx, y: bl.y + shadowLength * dy };
      const tr: Point2D = { x: br.x + shadowLength * dx, y: br.y + shadowLength * dy };
      shadowPolygons.push([bl, br, tr, tl]);
    }
  });

  return {
    shadowPolygons,
    sunAltitude: (altitude * 180) / Math.PI,
    sunAzimuth: (azimuth * 180) / Math.PI,
    timestamp: dateTime
  };
}

/**
 * Perform shading analysis for each fitted panel.
 * Supports custom date, time range, and panel tilt/azimuth.
 * Projects shadows from obstructions and computes per-panel shading percentage.
 */
export function calculateShading(
  panels: FittedPanel[],
  obstructions: Obstruction[],
  siteLatLng: { lat: number; lng: number },
  googleMaps: any,
  config?: ShadingConfig
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

  // Determine sample dates
  const sampleDates: Date[] = [];
  if (config?.analysisDate) {
    // Use the specific user-selected date
    sampleDates.push(new Date(config.analysisDate));
  } else {
    // Default: seasonal sampling (solstices + equinoxes)
    sampleDates.push(
      new Date(2026, 5, 21),   // Summer Solstice
      new Date(2026, 11, 21),  // Winter Solstice
      new Date(2026, 2, 21),   // Spring Equinox
      new Date(2026, 8, 21)    // Autumn Equinox
    );
  }

  // Determine hourly sample range
  const startHour = config?.timeStart ?? 9;
  const endHour = config?.timeEnd ?? 17;
  const sampleHours: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    sampleHours.push(h);
  }

  const totalSlots = sampleDates.length * sampleHours.length;
  const origin = siteLatLng;

  // Initialize shading counts
  const panelShadeCounts = new Map<string, number>();
  panels.forEach(p => panelShadeCounts.set(p.id, 0));

  // Convert obstructions to local coordinates
  const localObs = obstructions.map(obs => {
    const localPath = obs.type === 'polygon' && obs.path
      ? obs.path.map(pt => latLngToMeters(pt, origin, googleMaps))
      : undefined;
    const localPos = latLngToMeters({ lat: obs.lat, lng: obs.lng }, origin, googleMaps);
    return { id: obs.id, type: obs.type, height: obs.heightMeters, width: obs.widthMeters, localPos, localPath };
  });

  const localPanelCenters = panels.map(p => ({ id: p.id, localCenter: p.localCenter }));

  // Factor in panel tilt for effective obstruction height calculation
  const panelTiltRad = ((config?.panelTiltDeg ?? 0) * Math.PI) / 180;
  // A tilted panel's rear edge is elevated, making it slightly more resistant to ground-level shadows
  // but the effective ground shadow from obstructions still matters for the center point check

  // Loop through all sample dates and hours
  sampleDates.forEach(date => {
    sampleHours.forEach(hour => {
      const dateTime = new Date(date);
      dateTime.setHours(hour, 0, 0, 0);

      const sunPos = SunCalc.getPosition(dateTime, siteLatLng.lat, siteLatLng.lng);
      const altitude = sunPos.altitude;
      const azimuth = sunPos.azimuth;

      if (altitude <= 0) return;

      const shadowPolygons: Point2D[][] = [];

      localObs.forEach(obs => {
        // Effective obstruction height considers panel tilt
        // If panels are tilted, the rear edge is elevated by panelLength * sin(tilt)
        // So the obstruction needs to be taller than this to cast shadow on the panel surface
        const effectiveHeight = panelTiltRad > 0
          ? Math.max(0, obs.height - 0.3 * Math.sin(panelTiltRad)) // slight reduction for elevated panels
          : obs.height;

        if (effectiveHeight <= 0) return;

        const shadowLength = Math.min(effectiveHeight / Math.tan(altitude), 50);
        const dx = Math.sin(azimuth);
        const dy = Math.cos(azimuth);

        if (obs.type === 'polygon' && obs.localPath && obs.localPath.length >= 3) {
          const poly = obs.localPath;
          for (let i = 0; i < poly.length; i++) {
            const v1 = poly[i];
            const v2 = poly[(i + 1) % poly.length];
            shadowPolygons.push([
              v1, v2,
              { x: v2.x + shadowLength * dx, y: v2.y + shadowLength * dy },
              { x: v1.x + shadowLength * dx, y: v1.y + shadowLength * dy }
            ]);
          }
        } else {
          const px = -dy;
          const py = dx;
          const halfW = obs.width / 2;
          const bl: Point2D = { x: obs.localPos.x - halfW * px, y: obs.localPos.y - halfW * py };
          const br: Point2D = { x: obs.localPos.x + halfW * px, y: obs.localPos.y + halfW * py };
          const tl: Point2D = { x: bl.x + shadowLength * dx, y: bl.y + shadowLength * dy };
          const tr: Point2D = { x: br.x + shadowLength * dx, y: br.y + shadowLength * dy };
          shadowPolygons.push([bl, br, tr, tl]);
        }
      });

      // Test panel centers against shadow polygons
      localPanelCenters.forEach(p => {
        const isShaded = shadowPolygons.some(poly => isPointInPolygon(p.localCenter, poly));
        if (isShaded) {
          panelShadeCounts.set(p.id, (panelShadeCounts.get(p.id) || 0) + 1);
        }
      });
    });
  });

  // Compute shading scores
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

    return { ...p, shadingLoss, isRecommended };
  });

  const overallShadingLoss = totalRecommended > 0 ? Math.round(shadingLossSum / totalRecommended) : 0;

  return {
    panels: updatedPanels,
    overallShadingLoss,
    totalRecommended,
    totalNotRecommended,
    usablePanelsCount: totalRecommended
  };
}

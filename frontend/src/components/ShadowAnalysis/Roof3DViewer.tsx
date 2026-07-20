import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import SunCalc from 'suncalc';
import {
  Rotate3d,
  ZoomIn,
  ZoomOut,
  Building2,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  Sun,
  Moon,
  Clock,
  Sparkles,
  Map
} from 'lucide-react';
import type { FittedPanel, Obstruction, PanelSpec } from '../../services/panelLayoutService';
import { latLngToMeters, isPointInPolygon } from '../../services/geometryUtils';
import type { Point2D } from '../../services/geometryUtils';

interface Roof3DViewerProps {
  roofPolygon: google.maps.LatLngLiteral[];
  panels: FittedPanel[];
  obstructions: Obstruction[];
  panelSpec?: PanelSpec;
  siteLatLng?: google.maps.LatLngLiteral | null;
  analysisDate?: string;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Affine triangle texture mapping utility for rendering 3D perspective satellite images on canvas.
 */
function drawTriangleTexture(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x0: number, y0: number, u0: number, v0: number,
  x1: number, y1: number, u1: number, v1: number,
  x2: number, y2: number, u2: number, v2: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  const delta = u0 * (v1 - v2) - v0 * (u1 - u2) + (u1 * v2 - u2 * v1);
  if (Math.abs(delta) < 0.001) {
    ctx.restore();
    return;
  }

  const deltaA = x0 * (v1 - v2) - v0 * (x1 - x2) + (x1 * v2 - x2 * v1);
  const deltaB = u0 * (x1 - x2) - x0 * (u1 - u2) + (u1 * x2 - u2 * x1);
  const deltaC = u0 * (v1 * x2 - v2 * x1) - v0 * (u1 * x2 - u2 * x1) + x0 * (u1 * v2 - u2 * v1);

  const deltaD = y0 * (v1 - v2) - v0 * (y1 - y2) + (y1 * v2 - y2 * v1);
  const deltaE = u0 * (y1 - y2) - y0 * (u1 - u2) + (u1 * y2 - u2 * y1);
  const deltaF = u0 * (v1 * y2 - v2 * y1) - v0 * (u1 * y2 - u2 * y1) + y0 * (u1 * v2 - u2 * v1);

  ctx.transform(
    deltaA / delta, deltaD / delta,
    deltaB / delta, deltaE / delta,
    deltaC / delta, deltaF / delta
  );

  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export const Roof3DViewer: React.FC<Roof3DViewerProps> = ({
  roofPolygon,
  panels,
  obstructions,
  panelSpec,
  siteLatLng,
  analysisDate
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D View Angles & Controls State
  const [yaw, setYaw] = useState<number>(-35); // rotation around vertical Z axis (degrees)
  const [pitch, setPitch] = useState<number>(32); // camera tilt angle (degrees)
  const [zoom, setZoom] = useState<number>(1.0);
  const [buildingHeight, setBuildingHeight] = useState<number>(7.5); // Building height in meters
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [showSatelliteGround, setShowSatelliteGround] = useState<boolean>(true);

  // Satellite Imagery Texture Image State
  const [satelliteImage, setSatelliteImage] = useState<HTMLImageElement | null>(null);

  // Load Satellite Image Snapshot for 3D Ground Texture
  useEffect(() => {
    if (!siteLatLng) return;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = `https://maps.googleapis.com/maps/api/staticmap?center=${siteLatLng.lat},${siteLatLng.lng}&zoom=19&size=640x640&maptype=satellite&key=AIzaSyDcjbZggQipAnCQiVDL_GekJ7k-BjKGXdw`;
    img.onload = () => setSatelliteImage(img);
  }, [siteLatLng]);

  // Morning-to-Evening Sun Shading Simulation State
  const [simHour, setSimHour] = useState<number>(10.0); // Default 10:00 AM
  const [isSimulatingDay, setIsSimulatingDay] = useState<boolean>(false);

  // Drag tracking state
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D Projection Math (Ground Z=0 sits at bottom, building extends UPWARDS)
  const project3D = useCallback((pt: Point3D, width: number, height: number, scale: number) => {
    const radYaw = (yaw * Math.PI) / 180;
    const radPitch = (pitch * Math.PI) / 180;

    // 1. Rotate around vertical Z-axis (Yaw)
    const xRot = pt.x * Math.cos(radYaw) - pt.y * Math.sin(radYaw);
    const yRot = pt.x * Math.sin(radYaw) + pt.y * Math.cos(radYaw);

    // 2. Project 3D onto 2D screen coordinates
    const yProj = yRot * Math.cos(radPitch);
    const zProj = pt.z * Math.sin(radPitch);

    const screenX = width / 2 + xRot * scale * zoom;
    const screenY = height * 0.58 - yProj * scale * zoom - zProj * scale * zoom;

    return { x: screenX, y: screenY };
  }, [yaw, pitch, zoom]);

  // Auto 360° Turntable spin loop
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setYaw(prev => (prev + 0.8) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Morning-to-Evening Sun Day Simulation loop (6 AM to 6 PM)
  useEffect(() => {
    if (!isSimulatingDay) return;
    const interval = setInterval(() => {
      setSimHour(prev => {
        if (prev >= 18.0) return 6.0;
        return parseFloat((prev + 0.25).toFixed(2));
      });
    }, 120);
    return () => clearInterval(interval);
  }, [isSimulatingDay]);

  // GLOBAL WINDOW DRAG LISTENERS
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      setYaw(prev => (prev + dx * 0.5) % 360);
      setPitch(prev => Math.max(5, Math.min(88, prev + dy * 0.4)));

      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Compute Current Sun Position (Altitude & Azimuth)
  const sunPositionData = useMemo(() => {
    const lat = siteLatLng?.lat ?? 19.076;
    const lng = siteLatLng?.lng ?? 72.877;
    const date = analysisDate ? new Date(analysisDate) : new Date();

    const hourInt = Math.floor(simHour);
    const minInt = Math.round((simHour - hourInt) * 60);
    date.setHours(hourInt, minInt, 0, 0);

    const sunPos = SunCalc.getPosition(date, lat, lng);
    const altitudeDeg = (sunPos.altitude * 180) / Math.PI;
    const azimuthDeg = (sunPos.azimuth * 180) / Math.PI;

    return {
      altitudeRad: sunPos.altitude,
      azimuthRad: sunPos.azimuth,
      altitudeDeg,
      azimuthDeg,
      isDaylight: sunPos.altitude > 0,
      timestamp: date
    };
  }, [siteLatLng, analysisDate, simHour]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !roofPolygon || roofPolygon.length < 3) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const origin = roofPolygon[0];
    const googleMaps = window.google?.maps;
    if (!googleMaps) return;

    // 1. Project roof polygon coordinates to local 2D meters relative to origin
    const localPoly = roofPolygon.map(pt => latLngToMeters(pt, origin, googleMaps));

    // Find local bounding coordinates
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    localPoly.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const dx = maxX - minX;
    const dy = maxY - minY;
    const centerLocal = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    // Auto-scale to fit canvas bounds
    const maxBound = Math.max(dx, dy, buildingHeight * 1.5, 12);
    const scale = (Math.min(width, height) * 0.5) / maxBound;

    // Convert roof coordinates to centered 3D coordinates
    const roofBase3D: Point3D[] = localPoly.map(p => ({
      x: p.x - centerLocal.x,
      y: p.y - centerLocal.y,
      z: 0 // Ground level
    }));

    const roofTop3D: Point3D[] = localPoly.map(p => ({
      x: p.x - centerLocal.x,
      y: p.y - centerLocal.y,
      z: buildingHeight // Roof deck level
    }));

    const tiltDeg = panelSpec?.tiltDeg || 0;
    const tiltRad = (tiltDeg * Math.PI) / 180;

    // Convert panels to 3D with elevation on racking on top of roof
    const panels3D = panels.map(p => {
      const bounds3D: Point3D[] = p.localBounds.map((pt, idx) => {
        const tiltElev = (idx >= 2) ? (p.localBounds[2].y - p.localBounds[0].y) * Math.sin(tiltRad) : 0;
        return {
          x: pt.x - centerLocal.x,
          y: pt.y - centerLocal.y,
          z: buildingHeight + 0.35 + tiltElev
        };
      });

      return {
        id: p.id,
        bounds: bounds3D,
        shadingLoss: p.shadingLoss,
        isRecommended: p.isRecommended,
        yCenter: p.localCenter.y - centerLocal.y,
        localCenter: { x: p.localCenter.x - centerLocal.x, y: p.localCenter.y - centerLocal.y }
      };
    });

    // Convert obstructions to 3D on top of roof deck
    const obs3D = obstructions.map(obs => {
      const localPos = latLngToMeters({ lat: obs.lat, lng: obs.lng }, origin, googleMaps);
      const localCenter = {
        x: localPos.x - centerLocal.x,
        y: localPos.y - centerLocal.y
      };

      const path3D = obs.type === 'polygon' && obs.path
        ? obs.path.map(pt => {
            const loc = latLngToMeters(pt, origin, googleMaps);
            return { x: loc.x - centerLocal.x, y: loc.y - centerLocal.y };
          })
        : undefined;

      return {
        id: obs.id,
        type: obs.type,
        center: localCenter,
        height: obs.heightMeters,
        width: obs.widthMeters,
        path: path3D,
        yCenter: localCenter.y
      };
    });

    // Clear Canvas with sleek sky gradient depending on time of day
    const bgGrad = ctx.createRadialGradient(width/2, height/2, 20, width/2, height/2, width*0.7);
    if (!sunPositionData.isDaylight) {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
    } else if (sunPositionData.altitudeDeg < 15) {
      bgGrad.addColorStop(0, '#331e38');
      bgGrad.addColorStop(1, '#0f172a');
    } else {
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // --- 0. PHOTOREALISTIC SATELLITE MAP GROUND PLANE (NEIGHBORHOOD 3D TEXTURE) ---
    if (showSatelliteGround && satelliteImage) {
      const gBound = Math.max(dx, dy, 20) * 1.8; // 35-40m ground radius
      const gridDivs = 8;
      const step = (gBound * 2) / gridDivs;
      const imgW = satelliteImage.width;
      const imgH = satelliteImage.height;

      ctx.save();
      ctx.globalAlpha = sunPositionData.isDaylight ? 0.92 : 0.45;

      for (let gx = 0; gx < gridDivs; gx++) {
        for (let gy = 0; gy < gridDivs; gy++) {
          const x0 = -gBound + gx * step;
          const y0 = -gBound + gy * step;
          const x1 = x0 + step;
          const y1 = y0 + step;

          const p00 = project3D({ x: x0, y: y0, z: 0 }, width, height, scale);
          const p10 = project3D({ x: x1, y: y0, z: 0 }, width, height, scale);
          const p11 = project3D({ x: x1, y: y1, z: 0 }, width, height, scale);
          const p01 = project3D({ x: x0, y: y1, z: 0 }, width, height, scale);

          const u0 = (gx / gridDivs) * imgW;
          const v0 = ((gridDivs - gy) / gridDivs) * imgH;
          const u1 = ((gx + 1) / gridDivs) * imgW;
          const v1 = ((gridDivs - 1 - gy) / gridDivs) * imgH;

          drawTriangleTexture(ctx, satelliteImage, p00.x, p00.y, u0, v0, p10.x, p10.y, u1, v0, p01.x, p01.y, u0, v1);
          drawTriangleTexture(ctx, satelliteImage, p10.x, p10.y, u1, v0, p11.x, p11.y, u1, v1, p01.x, p01.y, u0, v1);
        }
      }
      ctx.restore();
    } else {
      // Fallback Grid Floor
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1.0;
      const gridSpacing = 4 * scale * zoom;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // --- 1. RENDER 3D SUN IN SKY ---
    if (sunPositionData.isDaylight) {
      const sunDist = 38; // meters away in 3D space
      const sunX = sunDist * Math.sin(sunPositionData.azimuthRad) * Math.cos(sunPositionData.altitudeRad);
      const sunY = sunDist * Math.cos(sunPositionData.azimuthRad) * Math.cos(sunPositionData.altitudeRad);
      const sunZ = buildingHeight + sunDist * Math.sin(sunPositionData.altitudeRad);

      const sunScr = project3D({ x: sunX, y: sunY, z: sunZ }, width, height, scale);

      // Glowing Sun Sphere
      const sunGrad = ctx.createRadialGradient(sunScr.x, sunScr.y, 4, sunScr.x, sunScr.y, 24);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.4, '#eab308');
      sunGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');

      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunScr.x, sunScr.y, 24, 0, Math.PI * 2);
      ctx.fill();

      // Core Sun Disc
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sunScr.x, sunScr.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- 2. CALCULATE 3D OBSTACLE SHADOW POLYGONS ---
    const localShadowPolygons: Point2D[][] = [];
    if (sunPositionData.isDaylight) {
      const shadowLengthFactor = Math.min(45, 1.0 / Math.tan(sunPositionData.altitudeRad));
      const dxShadow = Math.sin(sunPositionData.azimuthRad);
      const dyShadow = Math.cos(sunPositionData.azimuthRad);

      obs3D.forEach(obs => {
        const cappedLength = Math.min(obs.height * shadowLengthFactor, 40);

        if (obs.type === 'polygon' && obs.path && obs.path.length >= 3) {
          const poly = obs.path;
          for (let i = 0; i < poly.length; i++) {
            const v1 = poly[i];
            const v2 = poly[(i + 1) % poly.length];
            localShadowPolygons.push([
              v1, v2,
              { x: v2.x + cappedLength * dxShadow, y: v2.y + cappedLength * dyShadow },
              { x: v1.x + cappedLength * dxShadow, y: v1.y + cappedLength * dyShadow }
            ]);
          }
        } else {
          const px = -dyShadow;
          const py = dxShadow;
          const halfW = obs.width / 2;
          const bl: Point2D = { x: obs.center.x - halfW * px, y: obs.center.y - halfW * py };
          const br: Point2D = { x: obs.center.x + halfW * px, y: obs.center.y + halfW * py };
          const tl: Point2D = { x: bl.x + cappedLength * dxShadow, y: bl.y + cappedLength * dyShadow };
          const tr: Point2D = { x: br.x + cappedLength * dxShadow, y: br.y + cappedLength * dyShadow };
          localShadowPolygons.push([bl, br, tr, tl]);
        }
      });
    }

    const shadedPanelIds = new Set<string>();
    if (sunPositionData.isDaylight) {
      panels3D.forEach(p => {
        const isShaded = localShadowPolygons.some(poly => isPointInPolygon(p.localCenter, poly));
        if (isShaded) shadedPanelIds.add(p.id);
      });
    }

    // --- 3. RENDER 3D BUILDING WALLS ---
    const groundPoints = roofBase3D.map(p => project3D(p, width, height, scale));
    const roofPoints = roofTop3D.map(p => project3D(p, width, height, scale));

    if (roofPoints.length >= 3) {
      const numVertices = roofTop3D.length;
      for (let i = 0; i < numVertices; i++) {
        const nextIdx = (i + 1) % numVertices;
        const g1 = groundPoints[i];
        const g2 = groundPoints[nextIdx];
        const r1 = roofPoints[i];
        const r2 = roofPoints[nextIdx];

        const wallAngle = Math.atan2(roofTop3D[nextIdx].y - roofTop3D[i].y, roofTop3D[nextIdx].x - roofTop3D[i].x);
        const lightIntensity = Math.abs(Math.sin(wallAngle + (yaw * Math.PI) / 180));
        const wallBrightness = Math.round(85 + lightIntensity * 65);

        ctx.fillStyle = `rgb(${wallBrightness}, ${wallBrightness + 12}, ${wallBrightness + 28})`;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(g1.x, g1.y);
        ctx.lineTo(g2.x, g2.y);
        ctx.lineTo(r2.x, r2.y);
        ctx.lineTo(r1.x, r1.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Floor Band Lines
        const numFloors = Math.max(1, Math.floor(buildingHeight / 3));
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.8;
        for (let f = 1; f < numFloors; f++) {
          const fRatio = f / numFloors;
          const p1 = project3D({ ...roofBase3D[i], z: buildingHeight * fRatio }, width, height, scale);
          const p2 = project3D({ ...roofBase3D[nextIdx], z: buildingHeight * fRatio }, width, height, scale);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // --- 4. RENDER BUILDING ROOF DECK & REAL SATELLITE PHOTO TEXTURE ---
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(roofPoints[0].x, roofPoints[0].y);
      for (let i = 1; i < roofPoints.length; i++) {
        ctx.lineTo(roofPoints[i].x, roofPoints[i].y);
      }
      ctx.closePath();

      if (showSatelliteGround && satelliteImage) {
        ctx.clip(); // Clip satellite texture strictly inside 3D roof polygon boundary

        const gBound = Math.max(dx, dy, 20) * 1.8;
        const gridDivs = 8;
        const step = (gBound * 2) / gridDivs;
        const imgW = satelliteImage.width;
        const imgH = satelliteImage.height;

        for (let gx = 0; gx < gridDivs; gx++) {
          for (let gy = 0; gy < gridDivs; gy++) {
            const x0 = -gBound + gx * step;
            const y0 = -gBound + gy * step;
            const x1 = x0 + step;
            const y1 = y0 + step;

            const p00 = project3D({ x: x0, y: y0, z: buildingHeight }, width, height, scale);
            const p10 = project3D({ x: x1, y: y0, z: buildingHeight }, width, height, scale);
            const p11 = project3D({ x: x1, y: y1, z: buildingHeight }, width, height, scale);
            const p01 = project3D({ x: x0, y: y1, z: buildingHeight }, width, height, scale);

            const u0 = (gx / gridDivs) * imgW;
            const v0 = ((gridDivs - gy) / gridDivs) * imgH;
            const u1 = ((gx + 1) / gridDivs) * imgW;
            const v1 = ((gridDivs - 1 - gy) / gridDivs) * imgH;

            drawTriangleTexture(ctx, satelliteImage, p00.x, p00.y, u0, v0, p10.x, p10.y, u1, v0, p01.x, p01.y, u0, v1);
            drawTriangleTexture(ctx, satelliteImage, p10.x, p10.y, u1, v0, p11.x, p11.y, u1, v1, p01.x, p01.y, u0, v1);
          }
        }
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(roofPoints[0].x, roofPoints[0].y);
      for (let i = 1; i < roofPoints.length; i++) {
        ctx.lineTo(roofPoints[i].x, roofPoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Render 3D Obstacle Shadows on Roof Surface
      if (sunPositionData.isDaylight && localShadowPolygons.length > 0) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        localShadowPolygons.forEach(poly => {
          const sPts = poly.map(pt => project3D({ x: pt.x, y: pt.y, z: buildingHeight + 0.05 }, width, height, scale));
          ctx.beginPath();
          ctx.moveTo(sPts[0].x, sPts[0].y);
          for (let i = 1; i < sPts.length; i++) {
            ctx.lineTo(sPts[i].x, sPts[i].y);
          }
          ctx.closePath();
          ctx.fill();
        });
      }

      // Parapet Wall
      const parapetTop = roofTop3D.map(p => project3D({ ...p, z: buildingHeight + 0.35 }, width, height, scale));
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(parapetTop[0].x, parapetTop[0].y);
      for (let i = 1; i < parapetTop.length; i++) {
        ctx.lineTo(parapetTop[i].x, parapetTop[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // --- 5. RENDER PANELS & OBSTRUCTIONS (PAINTER'S ALGORITHM) ---
    const elementsToRender = [
      ...panels3D.map(p => ({ type: 'panel', y: p.yCenter, data: p })),
      ...obs3D.map(o => ({ type: 'obstruction', y: o.yCenter, data: o }))
    ];

    elementsToRender.sort((a, b) => b.y - a.y);

    elementsToRender.forEach(el => {
      if (el.type === 'panel') {
        const panel = el.data as typeof panels3D[0];
        const pts = panel.bounds.map(p => project3D(p, width, height, scale));

        if (pts.length >= 4) {
          // Racking Legs
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.2;
          panel.bounds.forEach(pBound => {
            const roofDeckPt = project3D({ x: pBound.x, y: pBound.y, z: buildingHeight }, width, height, scale);
            const panelPt = project3D(pBound, width, height, scale);
            ctx.beginPath();
            ctx.moveTo(roofDeckPt.x, roofDeckPt.y);
            ctx.lineTo(panelPt.x, panelPt.y);
            ctx.stroke();
          });

          // Solar Module Face Color
          const isCurrentlyShaded = shadedPanelIds.has(panel.id);

          if (isCurrentlyShaded) {
            ctx.fillStyle = '#f97316';
            ctx.strokeStyle = '#c2410c';
          } else if (panel.isRecommended) {
            ctx.fillStyle = '#1d4ed8';
            ctx.strokeStyle = '#1e3a8a';
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#b91c1c';
          }
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sub-cell Grid Divider
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.lineWidth = 0.8;
          const mLeft = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          const mRight = { x: (pts[2].x + pts[3].x) / 2, y: (pts[2].y + pts[3].y) / 2 };
          ctx.beginPath();
          ctx.moveTo(mLeft.x, mLeft.y);
          ctx.lineTo(mRight.x, mRight.y);
          ctx.stroke();
        }
      } else {
        const obs = el.data as typeof obs3D[0];
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;

        if (obs.type === 'polygon' && obs.path && obs.path.length >= 3) {
          const basePts = obs.path.map(pt => project3D({ x: pt.x, y: pt.y, z: buildingHeight }, width, height, scale));
          const topPts = obs.path.map(pt => project3D({ x: pt.x, y: pt.y, z: buildingHeight + obs.height }, width, height, scale));

          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          for (let i = 0; i < basePts.length; i++) {
            const nextIdx = (i + 1) % basePts.length;
            ctx.beginPath();
            ctx.moveTo(basePts[i].x, basePts[i].y);
            ctx.lineTo(basePts[nextIdx].x, basePts[nextIdx].y);
            ctx.lineTo(topPts[nextIdx].x, topPts[nextIdx].y);
            ctx.lineTo(topPts[i].x, topPts[i].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.beginPath();
          ctx.moveTo(topPts[0].x, topPts[0].y);
          for (let i = 1; i < topPts.length; i++) {
            ctx.lineTo(topPts[i].x, topPts[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          const rad = obs.width / 2;
          const segments = 16;
          const baseRing: { x: number; y: number }[] = [];
          const topRing: { x: number; y: number }[] = [];

          for (let i = 0; i < segments; i++) {
            const theta = (i * 2 * Math.PI) / segments;
            const dx = rad * Math.cos(theta);
            const dy = rad * Math.sin(theta);
            baseRing.push(project3D({ x: obs.center.x + dx, y: obs.center.y + dy, z: buildingHeight }, width, height, scale));
            topRing.push(project3D({ x: obs.center.x + dx, y: obs.center.y + dy, z: buildingHeight + obs.height }, width, height, scale));
          }

          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          for (let i = 0; i < segments; i++) {
            const nextIdx = (i + 1) % segments;
            ctx.beginPath();
            ctx.moveTo(baseRing[i].x, baseRing[i].y);
            ctx.lineTo(baseRing[nextIdx].x, baseRing[nextIdx].y);
            ctx.lineTo(topRing[nextIdx].x, topRing[nextIdx].y);
            ctx.lineTo(topRing[i].x, topRing[i].y);
            ctx.closePath();
            ctx.fill();
            if (i % 4 === 0) ctx.stroke();
          }

          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.beginPath();
          ctx.moveTo(topRing[0].x, topRing[0].y);
          for (let i = 1; i < topRing.length; i++) {
            ctx.lineTo(topRing[i].x, topRing[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    });
  }, [roofPolygon, panels, obstructions, yaw, pitch, zoom, buildingHeight, panelSpec, project3D, sunPositionData, showSatelliteGround, satelliteImage]);

  // MOUSE & TOUCH EVENT HANDLERS
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;

    setYaw(prev => (prev + dx * 0.5) % 360);
    setPitch(prev => Math.max(5, Math.min(88, prev + dy * 0.4)));

    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom(z => Math.max(0.4, Math.min(3.0, z - e.deltaY * 0.0015)));
  };

  const formatTimeStr = (hourVal: number) => {
    const h = Math.floor(hourVal);
    const m = Math.round((hourVal - h) * 60);
    const mStr = m < 10 ? `0${m}` : `${m}`;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${mStr} ${period}`;
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* 3D View Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="w-full flex-1 cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Top HUD: Title & Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
        <div className="bg-slate-900/90 border border-slate-800 text-white p-3 rounded-2xl flex items-center space-x-2.5 shadow-lg backdrop-blur-md">
          <Rotate3d className="w-5 h-5 text-emerald-500 animate-spin-slow shrink-0" />
          <div>
            <h4 className="text-[10px] font-black tracking-tight uppercase">3D Photorealistic Satellite View</h4>
            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Drag to orbit • Satellite neighborhood texture mapped</p>
          </div>
        </div>

        {/* Satellite Map Toggle, Building Height & Zoom Controls */}
        <div className="bg-slate-900/90 border border-slate-800 text-slate-300 p-2 px-3 rounded-2xl flex items-center space-x-3 shadow-lg backdrop-blur-md pointer-events-auto">
          {/* Satellite Map Toggle Button */}
          <button
            onClick={() => setShowSatelliteGround(prev => !prev)}
            className={`p-1.5 px-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 text-[10px] font-black border ${
              showSatelliteGround
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle 3D Satellite Map Neighborhood Texture"
          >
            <Map className="w-3.5 h-3.5" />
            <span>{showSatelliteGround ? 'Satellite Map ON' : 'Grid Mode'}</span>
          </button>

          {/* Building Height Slider */}
          <div className="flex items-center space-x-1.5 border-l border-r border-slate-800 px-3">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px] font-bold text-slate-400">Height:</span>
            <input
              type="range"
              min="3"
              max="25"
              step="0.5"
              value={buildingHeight}
              onChange={(e) => setBuildingHeight(parseFloat(e.target.value))}
              className="w-16 accent-emerald-500 h-1 bg-slate-700 rounded-lg cursor-pointer outline-none"
            />
            <span className="text-[9px] font-black text-emerald-400 w-8">{buildingHeight.toFixed(1)}m</span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-14 accent-emerald-500 h-1 bg-slate-700 rounded-lg cursor-pointer outline-none"
            />
            <button
              onClick={() => setZoom(z => Math.min(3.0, z + 0.15))}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MORNING TO EVENING SUN SHADING CONTROLLER TOOLBAR (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-800 text-slate-200 p-2.5 px-4 rounded-2xl flex flex-col items-center space-y-2 shadow-2xl backdrop-blur-md z-30 min-w-[440px]">
        {/* Sun Timeline Slider Header */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center space-x-2">
            <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-black text-white">{formatTimeStr(simHour)}</span>
            <span className="text-[9px] text-slate-400 font-semibold">
              ({sunPositionData.isDaylight ? `Sun Alt: ${Math.round(sunPositionData.altitudeDeg)}°` : 'Night'})
            </span>
          </div>

          <button
            onClick={() => setIsSimulatingDay(prev => !prev)}
            className={`p-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 text-[10px] font-extrabold ${
              isSimulatingDay
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/30 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSimulatingDay ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isSimulatingDay ? 'Pause Day' : 'Simulate Day (6AM-6PM)'}</span>
          </button>
        </div>

        {/* Timeline Range Slider */}
        <div className="w-full flex items-center space-x-2">
          <span className="text-[9px] font-bold text-amber-400 flex items-center space-x-0.5">
            <Sun className="w-3 h-3" />
            <span>6 AM</span>
          </span>
          <input
            type="range"
            min="6.0"
            max="18.0"
            step="0.25"
            value={simHour}
            onChange={(e) => setSimHour(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer outline-none"
          />
          <span className="text-[9px] font-bold text-slate-400 flex items-center space-x-0.5">
            <Moon className="w-3 h-3 text-indigo-400" />
            <span>6 PM</span>
          </span>
        </div>

        {/* Orbit Angle & View Controls */}
        <div className="flex justify-between items-center w-full border-t border-slate-800/80 pt-2 text-[9px] text-slate-400 font-semibold">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setYaw(y => (y - 45) % 360)}
              className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer flex items-center space-x-1 font-extrabold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>-45°</span>
            </button>
            <button
              onClick={() => setYaw(y => (y + 45) % 360)}
              className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer flex items-center space-x-1 font-extrabold"
            >
              <RotateCw className="w-3 h-3" />
              <span>+45°</span>
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => { setYaw(-35); setPitch(32); setZoom(1.0); }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer font-bold"
            >
              Isometric
            </button>
            <button
              onClick={() => { setYaw(0); setPitch(75); setZoom(1.0); }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer font-bold"
            >
              Top Deck
            </button>
          </div>

          <button
            onClick={() => setIsAutoRotating(prev => !prev)}
            className={`p-1 px-2 rounded-lg transition-all cursor-pointer flex items-center space-x-1 text-[9px] font-extrabold ${
              isAutoRotating ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{isAutoRotating ? 'Spin On' : '360° Spin'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Left Info Indicator */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 p-2 px-3 rounded-xl flex items-center space-x-1.5 text-[9px] font-bold text-slate-400 shadow backdrop-blur select-none pointer-events-none">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span>Shading Forecast for {formatTimeStr(simHour)}</span>
      </div>
    </div>
  );
};

export default Roof3DViewer;

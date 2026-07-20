import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Rotate3d, ZoomIn, ZoomOut, Info } from 'lucide-react';
import type { FittedPanel, Obstruction } from '../../services/panelLayoutService';
import { latLngToMeters } from '../../services/geometryUtils';

interface Roof3DViewerProps {
  roofPolygon: google.maps.LatLngLiteral[];
  panels: FittedPanel[];
  obstructions: Obstruction[];
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export const Roof3DViewer: React.FC<Roof3DViewerProps> = ({
  roofPolygon,
  panels,
  obstructions
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D View Angles & Controls State
  const [yaw, setYaw] = useState<number>(-45); // rotation around vertical Z axis (degrees)
  const [pitch, setPitch] = useState<number>(35); // tilt angle (degrees)
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 3D Projection Math
  const project3D = useCallback((pt: Point3D, width: number, height: number, scale: number) => {
    const radYaw = (yaw * Math.PI) / 180;
    const radPitch = (pitch * Math.PI) / 180;

    // 1. Rotate around vertical Z-axis (Yaw)
    const xRot = pt.x * Math.cos(radYaw) - pt.y * Math.sin(radYaw);
    const yRot = pt.x * Math.sin(radYaw) + pt.y * Math.cos(radYaw);

    // 2. Rotate around horizontal X-axis (Pitch / Tilt)
    const zRot = pt.z;
    const yProj = yRot * Math.cos(radPitch) - zRot * Math.sin(radPitch);

    // Center offset on canvas
    const screenX = width / 2 + xRot * scale * zoom;
    const screenY = height / 2 - yProj * scale * zoom; // Invert Y for screen space

    return { x: screenX, y: screenY };
  }, [yaw, pitch, zoom]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !roofPolygon || roofPolygon.length < 3) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get parent bounds
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const origin = roofPolygon[0];
    const googleMaps = window.google?.maps;
    if (!googleMaps) return;

    // 1. Project roof polygon coordinates to local 2D meters relative to origin
    const localPoly = roofPolygon.map(pt => latLngToMeters(pt, origin, googleMaps));

    // Find local bounding coordinates to compute auto-scaling
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
    const maxBound = Math.max(dx, dy, 15);
    const scale = (Math.min(width, height) * 0.6) / maxBound;

    // Convert local 2D roof coordinates into centered local coordinates
    const roof3D: Point3D[] = localPoly.map(p => ({
      x: p.x - centerLocal.x,
      y: p.y - centerLocal.y,
      z: 0
    }));

    // Convert panels to centered local coordinates
    const panels3D = panels.map(p => {
      const bounds3D: Point3D[] = p.localBounds.map(pt => ({
        x: pt.x - centerLocal.x,
        y: pt.y - centerLocal.y,
        z: 0.15 // Slightly raised above roof level to simulate racking structure
      }));
      return {
        id: p.id,
        bounds: bounds3D,
        shadingLoss: p.shadingLoss,
        isRecommended: p.isRecommended,
        yCenter: p.localCenter.y - centerLocal.y
      };
    });

    // Convert obstructions to centered local coordinates
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

    // Clear Canvas with sleek slate gradient background
    const bgGrad = ctx.createRadialGradient(width/2, height/2, 20, width/2, height/2, width*0.7);
    bgGrad.addColorStop(0, '#1e293b'); // Dark Slate Blue
    bgGrad.addColorStop(1, '#0f172a'); // Rich Slate Navy
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Floor lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1.0;
    const gridSpacing = 5 * scale * zoom;
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

    // DRAW ROOF CONCRETE SLAB (BASE)
    ctx.fillStyle = 'rgba(100, 116, 139, 0.4)'; // Slate Grey Roof Fill
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.0;

    const roofPoints = roof3D.map(p => project3D(p, width, height, scale));
    if (roofPoints.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(roofPoints[0].x, roofPoints[0].y);
      for (let i = 1; i < roofPoints.length; i++) {
        ctx.lineTo(roofPoints[i].x, roofPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw bottom slab depth edge to make it look solid 3D
      ctx.fillStyle = 'rgba(71, 85, 105, 0.55)'; // Slab depth wall
      for (let i = 0; i < roof3D.length; i++) {
        const nextIdx = (i + 1) % roof3D.length;
        const p1Top = roofPoints[i];
        const p2Top = roofPoints[nextIdx];
        
        // Slab bottom vertices (shifted down on Z-axis by 0.5m)
        const p1Bot = project3D({ ...roof3D[i], z: -0.5 }, width, height, scale);
        const p2Bot = project3D({ ...roof3D[nextIdx], z: -0.5 }, width, height, scale);

        // Only draw walls facing the camera (depth sorting proxy)
        if (p2Top.x > p1Top.x || p1Top.y > p1Bot.y) {
          ctx.beginPath();
          ctx.moveTo(p1Top.x, p1Top.y);
          ctx.lineTo(p2Top.x, p2Top.y);
          ctx.lineTo(p2Bot.x, p2Bot.y);
          ctx.lineTo(p1Bot.x, p1Bot.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // PAINTER'S ALGORITHM (Depth sorting elements from North to South / Back to Front)
    // Combine panels and obstructions into a single array sorted by local Y coordinate (increasing Y represents background)
    const elementsToRender = [
      ...panels3D.map(p => ({ type: 'panel', y: p.yCenter, data: p })),
      ...obs3D.map(o => ({ type: 'obstruction', y: o.yCenter, data: o }))
    ];

    // Sort descending by Y: larger local Y values (drawn first, further away) to smaller local Y values (drawn last, closer)
    elementsToRender.sort((a, b) => b.y - a.y);

    elementsToRender.forEach(el => {
      if (el.type === 'panel') {
        const panel = el.data as typeof panels3D[0];
        const pts = panel.bounds.map(p => project3D(p, width, height, scale));

        if (pts.length >= 4) {
          // Solar panel color palette (Silicon Blue/Cobalt)
          ctx.fillStyle = '#1d4ed8'; // Premium Cobalt Blue
          ctx.strokeStyle = '#1e3a8a'; // Dark Navy frame
          ctx.lineWidth = 1.0;

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Render internal white PV grid dividers
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.lineWidth = 0.8;
          
          // Midpoints
          const mLeft = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          const mRight = { x: (pts[2].x + pts[3].x) / 2, y: (pts[2].y + pts[3].y) / 2 };
          const mBottom = { x: (pts[0].x + pts[3].x) / 2, y: (pts[0].y + pts[3].y) / 2 };
          const mTop = { x: (pts[1].x + pts[2].x) / 2, y: (pts[1].y + pts[2].y) / 2 };

          ctx.beginPath();
          ctx.moveTo(mLeft.x, mLeft.y);
          ctx.lineTo(mRight.x, mRight.y);
          ctx.moveTo(mBottom.x, mBottom.y);
          ctx.lineTo(mTop.x, mTop.y);
          ctx.stroke();
        }
      } else {
        const obs = el.data as typeof obs3D[0];
        
        ctx.strokeStyle = '#dc2626'; // Red outline
        ctx.lineWidth = 1.5;

        if (obs.type === 'polygon' && obs.path && obs.path.length >= 3) {
          // RENDER 3D POLYGON PRISM (e.g. lift room, skylight)
          const basePts = obs.path.map(pt => project3D({ x: pt.x, y: pt.y, z: 0 }, width, height, scale));
          const topPts = obs.path.map(pt => project3D({ x: pt.x, y: pt.y, z: obs.height }, width, height, scale));

          // Draw prism side walls
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'; // Semi-transparent Red
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

          // Draw top roof of the prism structure
          ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
          ctx.beginPath();
          ctx.moveTo(topPts[0].x, topPts[0].y);
          for (let i = 1; i < topPts.length; i++) {
            ctx.lineTo(topPts[i].x, topPts[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // RENDER 3D CYLINDER (e.g. water tank, tree)
          const rad = obs.width / 2;
          const segments = 16;
          const baseRing: { x: number; y: number }[] = [];
          const topRing: { x: number; y: number }[] = [];

          for (let i = 0; i < segments; i++) {
            const theta = (i * 2 * Math.PI) / segments;
            const dx = rad * Math.cos(theta);
            const dy = rad * Math.sin(theta);
            
            baseRing.push(project3D({ x: obs.center.x + dx, y: obs.center.y + dy, z: 0 }, width, height, scale));
            topRing.push(project3D({ x: obs.center.x + dx, y: obs.center.y + dy, z: obs.height }, width, height, scale));
          }

          // Draw cylinder sides
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          for (let i = 0; i < segments; i++) {
            const nextIdx = (i + 1) % segments;
            ctx.beginPath();
            ctx.moveTo(baseRing[i].x, baseRing[i].y);
            ctx.lineTo(baseRing[nextIdx].x, baseRing[nextIdx].y);
            ctx.lineTo(topRing[nextIdx].x, topRing[nextIdx].y);
            ctx.lineTo(topRing[i].x, topRing[i].y);
            ctx.closePath();
            ctx.fill();
            
            // Draw select structural ribs on the cylinder to give perspective depth
            if (i % 4 === 0) ctx.stroke();
          }

          // Draw top lid circle
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.beginPath();
          ctx.moveTo(topRing[0].x, topRing[0].y);
          for (let i = 1; i < topRing.length; i++) {
            ctx.lineTo(topRing[i].x, topRing[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw base ring outline
          ctx.beginPath();
          ctx.moveTo(baseRing[0].x, baseRing[0].y);
          for (let i = 1; i < baseRing.length; i++) {
            ctx.lineTo(baseRing[i].x, baseRing[i].y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    });
  }, [roofPolygon, panels, obstructions, yaw, pitch, zoom, project3D]);

  // MOUSE DRAG ROTATION EVENT HANDLERS
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    // Rotate model yaw/pitch reactively based on drag distances
    setYaw(prev => prev + dx * 0.45);
    setPitch(prev => Math.max(15, Math.min(80, prev + dy * 0.45)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-slate-950 overflow-hidden">
      {/* 3D Viewer Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full flex-1 cursor-grab active:cursor-grabbing"
      />

      {/* Control overlay HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none select-none">
        <div className="bg-slate-900/90 border border-slate-800 text-white p-3 rounded-2xl flex items-center space-x-2.5 shadow-lg backdrop-blur-md">
          <Rotate3d className="w-5 h-5 text-emerald-500 animate-spin-slow" />
          <div>
            <h4 className="text-[10px] font-black tracking-tight uppercase">Interactive 3D Racking Mode</h4>
            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Click & drag mouse to rotate roof view</p>
          </div>
        </div>

        {/* Zoom Controls Panel */}
        <div className="bg-slate-900/90 border border-slate-800 text-slate-400 p-2 rounded-xl flex items-center space-x-2 shadow-lg backdrop-blur-md pointer-events-auto">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="p-1 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-16 accent-emerald-500 h-1 bg-slate-700 rounded-lg cursor-pointer outline-none"
          />
          <button
            onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}
            className="p-1 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom status HUD */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-850 p-2 px-3 rounded-xl flex items-center space-x-1.5 text-[9px] font-bold text-slate-450 shadow backdrop-blur select-none pointer-events-none">
        <Info className="w-3.5 h-3.5 text-emerald-500" />
        <span>Racking height: 15cm | Orbit Pitch: {Math.round(pitch)}° Yaw: {Math.round(yaw)}°</span>
      </div>
    </div>
  );
};

export default Roof3DViewer;

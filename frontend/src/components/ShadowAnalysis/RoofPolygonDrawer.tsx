import React from 'react';
import { Trash2, Undo, HelpCircle } from 'lucide-react';

interface RoofPolygonDrawerProps {
  polygonPath: google.maps.LatLngLiteral[];
  onPolygonChange: (path: google.maps.LatLngLiteral[]) => void;
  onClear: () => void;
  areaSqm: number;
  projectName?: string;
  setProjectName?: (val: string) => void;
  drawMode?: 'work_area' | 'free_area' | 'shadow_cast';
  setDrawMode?: (val: 'work_area' | 'free_area' | 'shadow_cast') => void;
  roofShapeType?: 'polygon' | 'circle';
  setRoofShapeType?: (type: 'polygon' | 'circle') => void;
  circleRoofRadius?: number;
  setCircleRoofRadius?: (val: number) => void;
  analysisDate?: string;
  setAnalysisDate?: (val: string) => void;
  timeStart?: number;
  setTimeStart?: (val: number) => void;
  timeEnd?: number;
  setTimeEnd?: (val: number) => void;
  panelTiltDeg?: number;
  setPanelTiltDeg?: (val: number) => void;
  panelAzimuthDeg?: number;
  setPanelAzimuthDeg?: (val: number) => void;
  pitchDistance?: number;
  setPitchDistance?: (val: number) => void;
  onSuggestPitch?: () => void;
}

export const RoofPolygonDrawer: React.FC<RoofPolygonDrawerProps> = ({
  polygonPath,
  onPolygonChange,
  onClear,
  areaSqm,
  projectName = 'Solar Project',
  setProjectName,
  drawMode = 'work_area',
  setDrawMode,
  roofShapeType = 'polygon',
  setRoofShapeType,
  circleRoofRadius = 6.0,
  setCircleRoofRadius,
  analysisDate,
  setAnalysisDate,
  timeStart = 8,
  setTimeStart,
  timeEnd = 17,
  setTimeEnd,
  panelTiltDeg = 0,
  setPanelTiltDeg,
  panelAzimuthDeg = 180,
  setPanelAzimuthDeg,
  pitchDistance = 0,
  setPitchDistance,
  onSuggestPitch
}) => {
  const areaSqft = Math.round(areaSqm * 10.7639);

  const handleUndo = () => {
    if (polygonPath.length > 0) {
      onPolygonChange(polygonPath.slice(0, -1));
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
          Step 2: Trace Roof Outline
        </label>
        <div className="flex items-center space-x-1.5">
          {polygonPath.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center space-x-1 text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-350 text-slate-700 font-extrabold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo Point</span>
            </button>
          )}
          {polygonPath.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center space-x-1 text-[9px] bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-extrabold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Outline</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Name Field */}
      <div className="space-y-1">
        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName?.(e.target.value)}
          placeholder="e.g. Roof Top Commercial Solar"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
        />
      </div>

      {/* Roof Shape Tool Selector (Polygon vs Circle Tool) */}
      <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Roof Shape Tool</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRoofShapeType?.('polygon')}
            className={`text-[9px] font-black py-2 px-2.5 rounded-xl transition-all border flex items-center justify-center space-x-1 ${
              roofShapeType === 'polygon'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>📐 Custom Polygon</span>
          </button>
          <button
            type="button"
            onClick={() => setRoofShapeType?.('circle')}
            className={`text-[9px] font-black py-2 px-2.5 rounded-xl transition-all border flex items-center justify-center space-x-1 ${
              roofShapeType === 'circle'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>⭕ Circle Roof Tool</span>
          </button>
        </div>

        {roofShapeType === 'circle' && (
          <div className="pt-1 border-t border-slate-200/60 space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[9px] text-slate-500 font-semibold">Circle Radius (m)</label>
              <span className="text-[10px] font-black text-emerald-600">{circleRoofRadius.toFixed(1)}m</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCircleRoofRadius?.(Math.max(1.0, circleRoofRadius - 1.0))}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-black text-[9px] px-2 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                - 1m
              </button>
              <input
                type="range"
                min="1.0"
                max="35.0"
                step="0.5"
                value={circleRoofRadius}
                onChange={(e) => setCircleRoofRadius?.(parseFloat(e.target.value) || 1.0)}
                className="flex-1 accent-emerald-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer outline-none"
              />
              <button
                type="button"
                onClick={() => setCircleRoofRadius?.(Math.min(40.0, circleRoofRadius + 1.0))}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-black text-[9px] px-2 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                + 1m
              </button>
            </div>
            <p className="text-[8px] text-slate-400 font-medium italic">
              Use slider or +/- buttons to expand or shrink circle radius.
            </p>
          </div>
        )}
      </div>

      {/* Draw Mode Selector (Work Area / Free Area / Shadow Cast) */}
      <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Draw Mode</span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setDrawMode?.('work_area')}
            className={`text-[9px] font-black py-1.5 px-2 rounded-xl transition-all border ${
              drawMode === 'work_area'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Work Area
          </button>
          <button
            type="button"
            onClick={() => setDrawMode?.('free_area')}
            className={`text-[9px] font-black py-1.5 px-2 rounded-xl transition-all border ${
              drawMode === 'free_area'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Free Area
          </button>
          <button
            type="button"
            onClick={() => setDrawMode?.('shadow_cast')}
            className={`text-[9px] font-black py-1.5 px-2 rounded-xl transition-all border ${
              drawMode === 'shadow_cast'
                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Shadow Cast
          </button>
        </div>
      </div>

      {/* Date & Time Range Controls */}
      <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Shading Simulation Window</span>
        <div className="space-y-2">
          <div>
            <label className="text-[9px] text-slate-500 font-semibold block mb-0.5">Simulation Date</label>
            <input
              type="date"
              value={analysisDate || ''}
              onChange={(e) => setAnalysisDate?.(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-slate-500 font-semibold block mb-0.5">Start Hour</label>
              <select
                value={timeStart}
                onChange={(e) => setTimeStart?.(parseInt(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              >
                {[6, 7, 8, 9, 10, 11].map(h => (
                  <option key={h} value={h}>{h < 10 ? `0${h}` : h}:00 AM</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-slate-500 font-semibold block mb-0.5">End Hour</label>
              <select
                value={timeEnd}
                onChange={(e) => setTimeEnd?.(parseInt(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              >
                {[14, 15, 16, 17, 18, 19].map(h => (
                  <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 PM</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tilt, Azimuth & Pitch Distance Controls */}
      <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Panel Tilt & Orientation</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-slate-500 font-semibold block mb-0.5">Tilt Angle (°)</label>
            <input
              type="number"
              min="0"
              max="60"
              value={panelTiltDeg || ''}
              onChange={(e) => setPanelTiltDeg?.(e.target.value === '' ? 0 : parseInt(e.target.value))}
              placeholder="e.g. 15"
              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-500 font-semibold block mb-0.5">Azimuth (°)</label>
            <input
              type="number"
              min="0"
              max="360"
              value={panelAzimuthDeg || ''}
              onChange={(e) => setPanelAzimuthDeg?.(e.target.value === '' ? 0 : parseInt(e.target.value))}
              placeholder="e.g. 180"
              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-0.5">
            <label className="text-[9px] text-slate-500 font-semibold">Pitch Distance (m)</label>
            {onSuggestPitch && (
              <button
                type="button"
                onClick={onSuggestPitch}
                className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
              >
                Suggestive Pitch
              </button>
            )}
          </div>
          <input
            type="number"
            step="0.05"
            min="0"
            value={pitchDistance || ''}
            onChange={(e) => setPitchDistance?.(e.target.value === '' ? 0 : parseFloat(e.target.value))}
            placeholder="e.g. 1.2"
            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
          />
        </div>
      </div>

      {polygonPath.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <HelpCircle className="w-5 h-5 animate-pulse" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">How to draw the roof:</h4>
          <ul className="text-[10px] text-slate-500 font-semibold max-w-xs mx-auto space-y-1.5 text-left list-decimal pl-4 leading-relaxed">
            <li>Click directly on the satellite map to place the first roof corner.</li>
            <li>Continue clicking around the roof boundary to place subsequent corners.</li>
            <li>The coordinates will automatically link to form a boundary area.</li>
            <li>Place at least 3 corner points to finalize the outline.</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Live Area Card */}
          <div className="bg-emerald-50/50 border border-emerald-250/60 rounded-2xl p-4 space-y-1.5">
            <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider block">
              Calculated Boundary Size
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-700">{areaSqm.toFixed(1)} m²</span>
              <span className="text-xs font-bold text-slate-400">({areaSqft.toLocaleString()} sqft)</span>
            </div>
            <p className="text-[9px] text-slate-450 font-semibold leading-relaxed pt-1.5 border-t border-emerald-200/50">
              * Active points placed: <strong className="text-slate-700">{polygonPath.length}</strong>. You can drag any vertex point on the map to refine the boundary shapes.
            </p>
          </div>

          {polygonPath.length < 3 && (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-center text-[10px] font-semibold text-slate-500">
              Please click the satellite map to place at least {3 - polygonPath.length} more point(s) to form a usable shape.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoofPolygonDrawer;

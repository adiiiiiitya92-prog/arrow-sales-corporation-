import React from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { Trash2, Undo, Plus, Check, X } from 'lucide-react';
import type { Obstruction } from '../../services/panelLayoutService';

interface ObstructionMarkerProps {
  obstructions: Obstruction[];
  onObstructionUpdate: (id: string, updatedFields: Partial<Obstruction>) => void;
  onObstructionDelete: (id: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;

  // Optional drawing props passed from the coordinator
  isDrawingObs?: boolean;
  setIsDrawingObs?: (val: boolean) => void;
  activeObsPath?: google.maps.LatLngLiteral[];
  setActiveObsPath?: (path: google.maps.LatLngLiteral[]) => void;
  obsDrawingType?: 'cylinder' | 'polygon';
  setObsDrawingType?: (type: 'cylinder' | 'polygon') => void;
  activeObsHeight?: number;
  setActiveObsHeight?: (height: number) => void;
  activeObsName?: string;
  setActiveObsName?: (name: string) => void;
  onSavePolygonObs?: () => void;
}

export const ObstructionMarker: React.FC<ObstructionMarkerProps> = ({
  obstructions,
  onObstructionUpdate,
  onObstructionDelete,
  activeId,
  setActiveId,

  isDrawingObs = false,
  setIsDrawingObs,
  activeObsPath = [],
  setActiveObsPath,
  obsDrawingType: _obsDrawingType = 'cylinder',
  setObsDrawingType,
  activeObsHeight = 2.0,
  setActiveObsHeight,
  activeObsName = 'Lift Room Structure',
  setActiveObsName,
  onSavePolygonObs
}) => {

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'tree': return '#22c55e'; // Green
      case 'tank': return '#3b82f6'; // Blue
      case 'chimney': return '#f97316'; // Orange
      case 'wall': return '#6b7280'; // Slate
      case 'polygon': return '#ef4444'; // Red
      default: return '#a855f7'; // Purple
    }
  };

  const getObstructionName = (obs: Obstruction) => {
    if (obs.type === 'polygon') return obs.id.includes('Lift') || obs.heightMeters > 3 ? 'Structure / Room' : 'Parapet / Wall';
    switch (obs.type) {
      case 'tree': return 'Tree';
      case 'tank': return 'Water Tank';
      case 'chimney': return 'Chimney';
      case 'wall': return 'Parapet Wall';
      default: return 'Obstruction';
    }
  };

  const startPolygonDrawing = () => {
    if (setIsDrawingObs && setObsDrawingType && setActiveObsPath) {
      setIsDrawingObs(true);
      setObsDrawingType('polygon');
      setActiveObsPath([]);
    }
  };

  const cancelDrawing = () => {
    if (setIsDrawingObs && setActiveObsPath) {
      setIsDrawingObs(false);
      setActiveObsPath([]);
    }
  };

  const undoLastPoint = () => {
    if (setActiveObsPath && activeObsPath.length > 0) {
      setActiveObsPath(activeObsPath.slice(0, -1));
    }
  };

  // Undo the last placed obstruction
  const undoLastPlaced = () => {
    if (obstructions.length > 0) {
      onObstructionDelete(obstructions[obstructions.length - 1].id);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center select-none">
        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
          Step 3: Mark Obstructions
        </label>
        <div className="flex items-center space-x-1.5">
          {obstructions.length > 0 && !isDrawingObs && (
            <button
              type="button"
              onClick={undoLastPlaced}
              className="flex items-center space-x-1 text-[9px] bg-slate-100 hover:bg-slate-250 border border-slate-300 text-slate-700 font-extrabold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo Placed</span>
            </button>
          )}
          {!isDrawingObs && (
            <span className="text-[9px] bg-slate-100 text-slate-650 font-bold px-2 py-1 rounded border border-slate-200">
              Click map to pin cylinder
            </span>
          )}
        </div>
      </div>

      {/* DRAWING MANAGER PANEL FOR POLYGON OBSTRUCTIONS */}
      {isDrawingObs ? (
        <div className="bg-rose-50 border border-rose-250/60 rounded-2xl p-4 space-y-3.5 select-none">
          <div className="space-y-1">
            <span className="text-[9px] text-rose-600 font-extrabold uppercase tracking-widest block">
              Custom Obstruction Designer
            </span>
            <h4 className="text-xs font-black text-slate-800">Drawing Red Outline Structure</h4>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Click corners on the satellite map to trace the structure boundary. Vertices placed: <strong className="text-rose-600">{activeObsPath.length}</strong>.
            </p>
          </div>

          {/* Form parameters */}
          <div className="space-y-2">
            <div>
              <label className="text-[9px] font-bold text-slate-450 uppercase block mb-0.5">Structure Name</label>
              <input
                type="text"
                value={activeObsName}
                onChange={(e) => setActiveObsName?.(e.target.value)}
                className="w-full bg-white border border-rose-200 rounded-lg p-1.5 text-xs font-semibold text-slate-850 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-450 uppercase block mb-0.5">Height (meters)</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={activeObsHeight}
                onChange={(e) => setActiveObsHeight?.(parseFloat(e.target.value) || 0.1)}
                className="w-full bg-white border border-rose-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none text-center"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {activeObsPath.length > 0 && (
              <button
                type="button"
                onClick={undoLastPoint}
                className="flex-1 bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 font-extrabold text-[9px] py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                <Undo className="w-3.5 h-3.5" />
                <span>Undo Point</span>
              </button>
            )}
            <button
              type="button"
              onClick={onSavePolygonObs}
              disabled={activeObsPath.length < 3}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] py-2 rounded-xl transition-all shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save shape</span>
            </button>
            <button
              type="button"
              onClick={cancelDrawing}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold text-[9px] px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* TRIGGER DRAWING MODE BUTTON */
        <button
          onClick={startPolygonDrawing}
          className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 font-extrabold text-xs py-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4 text-rose-600" />
          <span>Draw Red Outline Obstruction</span>
        </button>
      )}

      {/* PLACED OBSTRUCTIONS LIST */}
      {obstructions.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center space-y-1.5 select-none">
          <p className="text-xs font-bold text-slate-700">No obstructions placed</p>
          <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto leading-relaxed">
            Click map directly to place cylinder objects (water tanks/chimneys), or click "Draw Red Outline Obstruction" to trace walls and lift rooms corner-by-corner.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
          {obstructions.map((obs, idx) => (
            <div
              key={obs.id}
              onClick={() => setActiveId(obs.id)}
              className={`border rounded-2xl p-3 bg-white transition-all cursor-pointer ${
                activeId === obs.id
                  ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/10'
                  : 'border-slate-200 hover:border-slate-350'
              }`}
            >
              <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-1.5">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getMarkerColor(obs.type) }}
                  ></div>
                  <span className="text-xs font-extrabold text-slate-800">
                    #{idx + 1} {getObstructionName(obs)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onObstructionDelete(obs.id);
                  }}
                  className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Remove Obstruction"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block mb-0.5">
                    Type
                  </label>
                  <span className="text-[10px] font-bold text-slate-700 capitalize">
                    {obs.type === 'polygon' ? 'Polygon' : obs.type}
                  </span>
                </div>

                <div>
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block mb-0.5">
                    Height (m)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={obs.heightMeters}
                    onChange={(e) => onObstructionUpdate(obs.id, { heightMeters: parseFloat(e.target.value) || 0.1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-[10px] font-bold text-slate-700 outline-none text-center"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block mb-0.5">
                    Size (m)
                  </label>
                  {obs.type === 'polygon' ? (
                    <span className="text-[9px] font-bold text-rose-600 block mt-1">
                      {obs.path?.length || 0} pts
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={obs.widthMeters}
                      onChange={(e) => onObstructionUpdate(obs.id, { widthMeters: parseFloat(e.target.value) || 0.1 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-[10px] font-bold text-slate-700 outline-none text-center"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render Markers on the map - cylinders only (Polygons are drawn in index.tsx) */}
      {obstructions
        .filter(obs => obs.type !== 'polygon')
        .map((obs) => (
          <Marker
            key={obs.id}
            position={{ lat: obs.lat, lng: obs.lng }}
            onClick={() => setActiveId(obs.id)}
            options={{
              icon: window.google
                ? {
                    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    fillColor: getMarkerColor(obs.type),
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 1.8,
                    scale: 6.5
                  }
                : undefined
            }}
          />
        ))}

      {/* Render InfoWindow for the selected cylinder or polygon marker */}
      {activeId && obstructions.find((o) => o.id === activeId) && (() => {
        const obs = obstructions.find((o) => o.id === activeId)!;
        return (
          <InfoWindow
            position={{ lat: obs.lat, lng: obs.lng }}
            onCloseClick={() => setActiveId(null)}
          >
            <div className="p-2 space-y-2 text-slate-800" style={{ minWidth: '160px' }}>
              <h4 className="text-[11px] font-black tracking-tight flex items-center space-x-1 border-b pb-1">
                <span>Configure Obstruction</span>
              </h4>
              <div className="space-y-1.5 text-[10px] font-bold">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-rose-700 font-extrabold capitalize">{obs.type === 'polygon' ? 'Red Outline Structure' : obs.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Height:</span>
                  <span>{obs.heightMeters} m</span>
                </div>
                {obs.type !== 'polygon' ? (
                  <div className="flex justify-between">
                    <span>Diameter:</span>
                    <span>{obs.widthMeters} m</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>Vertices:</span>
                    <span>{obs.path?.length || 0} points</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onObstructionDelete(obs.id)}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[9px] py-1 rounded font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </InfoWindow>
        );
      })()}
    </div>
  );
};

export default ObstructionMarker;

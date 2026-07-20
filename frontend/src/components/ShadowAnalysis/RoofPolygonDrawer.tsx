import React from 'react';
import { Trash2, Undo, HelpCircle } from 'lucide-react';

interface RoofPolygonDrawerProps {
  polygonPath: google.maps.LatLngLiteral[];
  onPolygonChange: (path: google.maps.LatLngLiteral[]) => void;
  onClear: () => void;
  areaSqm: number;
}

export const RoofPolygonDrawer: React.FC<RoofPolygonDrawerProps> = ({
  polygonPath,
  onPolygonChange,
  onClear,
  areaSqm
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

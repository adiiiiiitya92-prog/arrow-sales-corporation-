import React from 'react';
import { Settings, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import type { PanelSpec, LayoutConfig } from '../../services/panelLayoutService';

interface ShadowAnalysisResultsProps {
  panelSpec: PanelSpec;
  setPanelSpec: (spec: PanelSpec) => void;
  layoutConfig: LayoutConfig;
  setLayoutConfig: (config: LayoutConfig) => void;
  totalRoofArea: number;
  totalPanels: number;
  usablePanels: number;
  excludedPanels: number;
  systemSizeKw: number;
  overallShadingLoss: number;
  onRecalculate: () => void;
  onExport: () => void;
  address?: string;
}

export const ShadowAnalysisResults: React.FC<ShadowAnalysisResultsProps> = ({
  panelSpec,
  setPanelSpec,
  layoutConfig,
  setLayoutConfig,
  totalRoofArea,
  totalPanels,
  usablePanels,
  excludedPanels,
  systemSizeKw,
  overallShadingLoss,
  onRecalculate,
  onExport,
  address = ''
}) => {
  const sunEfficiency = 100 - overallShadingLoss;
  const singlePanelArea = panelSpec.width * panelSpec.length;
  const usableAreaSqm = usablePanels * singlePanelArea;
  const usableAreaSqft = usableAreaSqm * 10.7639;

  const getWhatsAppShareUrl = () => {
    const text = encodeURIComponent(
`*Solar CRM - Installation Proposal* ☀️
----------------------------------
📍 *Address:* ${address || 'Not specified'}
📐 *Usable Roof Area:* ${usableAreaSqm.toFixed(1)} m² / ${usableAreaSqft.toFixed(1)} sq.ft
💎 *Recommended Panels:* ${usablePanels} modules (${panelSpec.wattage}W each)
⚡ *System Size:* ${systemSizeKw.toFixed(2)} kWp
📊 *Est. Shading Loss:* ${overallShadingLoss}%
📈 *Shading Score:* ${sunEfficiency}% (Clean capture)

_Generated using Solar CRM Shadow & Panel Layout Fitter._`
    );
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const handleSpecChange = (field: keyof PanelSpec, value: number) => {
    setPanelSpec({ ...panelSpec, [field]: value });
  };

  const handleConfigChange = (field: keyof LayoutConfig, value: any) => {
    setLayoutConfig({ ...layoutConfig, [field]: value });
  };

  return (
    <div className="space-y-5 select-none">
      {/* Tab Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
          Step 4: Layout & Shading Output
        </label>
        <button
          onClick={onRecalculate}
          className="flex items-center space-x-1.5 text-[10px] bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 text-white font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer hover:shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recalculate Layout</span>
        </button>
      </div>

      {/* RESULTS DISPLAY CARD */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[50px]"></div>
        
        <div>
          <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest">
            Estimated System Metrics
          </span>
          <h3 className="text-3xl font-black tracking-tight text-white mt-1">
            {systemSizeKw.toFixed(2)} kWp
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Designed solar capacity based on recommended panels.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
              Roof Size
            </span>
            <span className="text-sm font-black text-slate-200">
              {totalRoofArea.toFixed(1)} m²
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
              Panels Fitted
            </span>
            <span className="text-sm font-black text-slate-200">
              {usablePanels} / {totalPanels}
            </span>
          </div>
        </div>

        {/* SHADING SCORE GAUGE */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">
              Sun Capture Efficiency
            </span>
            <span className={`text-xs font-black ${sunEfficiency > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {sunEfficiency}%
            </span>
          </div>
          
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                sunEfficiency > 80 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${sunEfficiency}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold">
            <span>Overall Shading Loss: {overallShadingLoss}%</span>
            <span>Recommended limit: &lt; 40%</span>
          </div>
        </div>
      </div>

      {/* RECOMMENDATIONS SUMMARY */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 border-b pb-1.5 flex items-center space-x-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Fitted Panels Breakdown</span>
        </h4>
        
        <div className="space-y-2 text-[10px] font-semibold text-slate-600">
          <div className="flex justify-between items-center">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Recommended (Shading &le; 40%)</span>
            </span>
            <span className="font-extrabold text-slate-800">{usablePanels} panels</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Not Recommended (Shading &gt; 40%)</span>
            </span>
            <span className="font-extrabold text-slate-800">{excludedPanels} panels</span>
          </div>
        </div>

        {excludedPanels > 0 && (
          <div className="bg-amber-55/60 border border-amber-200/80 rounded-xl p-2.5 flex items-start space-x-2 text-[10px] text-amber-800 font-semibold leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              We have automatically flagged {excludedPanels} panels as not recommended due to high seasonal shading. They are rendered with low opacity and excluded from system sizing.
            </span>
          </div>
        )}
      </div>

      {/* PANEL AND LAYOUT SETTINGS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 border-b pb-1.5 flex items-center space-x-1.5">
          <Settings className="w-4 h-4 text-emerald-600" />
          <span>Layout & Sizing Settings</span>
        </h4>

        {/* Panel Dimensions & Layout Preset */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
              Panel Specifications & Preset
            </span>
            <select
              value={layoutConfig.layoutType || 'custom'}
              onChange={(e) => {
                const val = e.target.value as any;
                if (val === '2mx1m') {
                  setPanelSpec({ ...panelSpec, length: 2.0, width: 1.0, wattage: 450 });
                  setLayoutConfig({ ...layoutConfig, layoutType: val });
                } else if (val === '2.3mx1.1m') {
                  setPanelSpec({ ...panelSpec, length: 2.28, width: 1.13, wattage: 550 });
                  setLayoutConfig({ ...layoutConfig, layoutType: val });
                } else if (val === '2.1mx1.05m') {
                  setPanelSpec({ ...panelSpec, length: 2.1, width: 1.05, wattage: 500 });
                  setLayoutConfig({ ...layoutConfig, layoutType: val });
                } else {
                  setLayoutConfig({ ...layoutConfig, layoutType: 'custom' });
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-md p-1 text-[10px] font-bold text-slate-700 outline-none"
            >
              <option value="custom">Custom Panel Preset</option>
              <option value="2.3mx1.1m">Layout 1 (550W - 2.28m × 1.13m)</option>
              <option value="2.1mx1.05m">Layout 2 (500W - 2.10m × 1.05m)</option>
              <option value="2mx1m">Layout 3 (450W - 2.00m × 1.00m)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1">Width (m)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                value={panelSpec.width}
                onChange={(e) => handleSpecChange('width', parseFloat(e.target.value) || 1.1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1">Length (m)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                value={panelSpec.length}
                onChange={(e) => handleSpecChange('length', parseFloat(e.target.value) || 1.7)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1">Wattage (W)</label>
              <input
                type="number"
                step="5"
                min="100"
                value={panelSpec.wattage}
                onChange={(e) => handleSpecChange('wattage', parseInt(e.target.value) || 550)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tilt, Azimuth & Pitch Distance Controls */}
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
            Panel Tilt & Alignment
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1">Tilt (deg)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="60"
                value={panelSpec.tiltDeg || 0}
                onChange={(e) => handleSpecChange('tiltDeg', parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1">Azimuth (deg)</label>
              <input
                type="number"
                step="5"
                min="0"
                max="360"
                value={panelSpec.azimuthDeg ?? 180}
                onChange={(e) => handleSpecChange('azimuthDeg', parseInt(e.target.value) || 180)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1">Pitch Dist (m)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={layoutConfig.pitchDistance || 0}
                onChange={(e) => handleConfigChange('pitchDistance', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Spacing & Setback */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
            Grid Fitting Spacers
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1" title="Safety setback from roof border">
                Setback (m)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={layoutConfig.setback}
                onChange={(e) => handleConfigChange('setback', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1">Row Gap (m)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={layoutConfig.rowSpacing}
                onChange={(e) => handleConfigChange('rowSpacing', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block mb-1">Col Gap (m)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={layoutConfig.colSpacing}
                onChange={(e) => handleConfigChange('colSpacing', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Orientation dropdown */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
            Panel Placement Orientation
          </label>
          <select
            value={layoutConfig.orientation}
            onChange={(e) => handleConfigChange('orientation', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="portrait">Portrait Mode (Vertical)</option>
            <option value="landscape">Landscape Mode (Horizontal)</option>
          </select>
        </div>
      </div>
      
      {/* EXPORT & SHARE WORKFLOW */}
      <div className="flex gap-2 pb-2">
        <button
          onClick={onExport}
          className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-extrabold py-3.5 rounded-xl shadow transition-all cursor-pointer flex items-center justify-center space-x-1"
        >
          <span>Export PDF</span>
        </button>

        <a
          href={getWhatsAppShareUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-3.5 rounded-xl shadow transition-all flex items-center justify-center space-x-1.5 cursor-pointer no-underline border border-emerald-700"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.464L0 24zm6.59-4.846c1.6.95 3.198 1.451 4.796 1.452 5.518 0 9.986-4.477 9.989-9.999.002-2.675-1.03-5.19-2.903-7.07C16.559 1.65 14.07 0.61 11.458 0.61c-5.522 0-10.014 4.495-10.016 10.02-.001 1.705.452 3.37 1.31 4.86L1.71 21.05l5.77-1.516c-1.125-.626-2.28-1.52-2.83-2.046z"/>
            <path d="M17.487 14.39c-.27-.136-1.602-.79-1.85-.88-.25-.09-.43-.136-.61.136-.18.27-.69.88-.85 1.06-.15.18-.3.2-.57.064-.27-.135-1.137-.42-2.167-1.34-.8-.713-1.34-1.595-1.5-1.86-.15-.27-.015-.415.12-.55.125-.124.27-.315.405-.47.135-.16.18-.27.27-.45.09-.18.045-.34-.02-.47-.07-.13-.61-1.47-.83-2.01-.22-.53-.44-.45-.61-.46h-.52c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.27s.97 2.63 1.11 2.82c.14.19 1.9 2.9 4.6 4.07.64.28 1.14.45 1.53.57.65.2 1.24.18 1.7.11.52-.08 1.6-.66 1.83-1.29.23-.63.23-1.18.16-1.29-.07-.12-.27-.18-.54-.315z"/>
          </svg>
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
};

export default ShadowAnalysisResults;

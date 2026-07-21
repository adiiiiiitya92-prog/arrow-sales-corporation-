import React, { useEffect, useState, useRef } from 'react';
import { leadService } from '../../services/leadService';
import type { Lead } from '../../types';
import {
  FileText,
  Printer,
  RotateCcw,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { compressImage } from '../../services/imageCompressionService';
import { uploadImageToFirebase } from '../../services/firebase';

export const WcrDocument: React.FC<{ defaultLeadId?: string; isEmbedded?: boolean }> = ({ defaultLeadId, isEmbedded }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Form Fields
  const [companyName, setCompanyName] = useState('Arrow Sales Corporation');
  const [consumerName, setConsumerName] = useState('');
  const [consumerNumber, setConsumerNumber] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Private Sector');
  const [sanctionNumber, setSanctionNumber] = useState('');
  const [sanctionedCapacity, setSanctionedCapacity] = useState('10');
  const [installedCapacity, setInstalledCapacity] = useState('10');

  // Module Specs
  const [moduleMake, setModuleMake] = useState('Waaree Energies Ltd');
  const [almmModel, setAlmmModel] = useState('Bi-12-540');
  const [moduleWattage, setModuleWattage] = useState('540');
  const [moduleCount, setModuleCount] = useState('18');
  const [moduleCapacityKwp, setModuleCapacityKwp] = useState('9.72');
  const [moduleWarrantee, setModuleWarrantee] = useState('10 yrs product + 25 yrs performance');

  // PCU specs
  const [inverterMakeModel, setInverterMakeModel] = useState('Growatt MOD 10KTL3-X');
  const [inverterRating, setInverterRating] = useState('10 KW');
  const [controllerType, setControllerType] = useState('MPPT Integrated');
  const [inverterCapacity, setInverterCapacity] = useState('10 KW');
  const [hpd, setHpd] = useState('Type II SPD Integrated');
  const [inverterMfgYear, setInverterMfgYear] = useState('2026');

  // Earthing & Protections
  const [earthingCount, setEarthingCount] = useState('3 Nos (LA, DC, AC)');
  const [earthCertifiedText, setEarthCertifiedText] = useState('Yes (< 5 Ohms verified)');
  const [lightningArrester, setLightningArrester] = useState('Yes (Solid Copper ESE LA)');

  // Signature state
  const [vendorSignatureUrl, setVendorSignatureUrl] = useState('');
  const [consumerSignatureUrl, setConsumerSignatureUrl] = useState('');

  // Page 2 Aadhar & Guarantee state
  const [aadharNumber, setAadharNumber] = useState('');
  const [aadharXeroxUrl, setAadharXeroxUrl] = useState('');

  // Canvas refs for both signatures
  const vendorCanvasRef = useRef<HTMLCanvasElement>(null);
  const consumerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeCanvas, setActiveCanvas] = useState<'vendor' | 'consumer'>('vendor');
  const [isDrawing, setIsDrawing] = useState(false);

  // UI state
  const [expandedSection, setExpandedSection] = useState<string>('lead');
  const [isEditable, setIsEditable] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const lList = await leadService.getLeads();
        setLeads(lList);
      } catch (err) {
        console.error('Error fetching leads:', err);
      }
    };
    fetchLeads();
  }, []);

  // Sync defaultLeadId when leads load
  useEffect(() => {
    if (leads.length > 0 && defaultLeadId) {
      setSelectedLeadId(defaultLeadId);
      const lead = leads.find((l) => l.id === defaultLeadId);
      if (lead) {
        setConsumerName(lead.name);
        setConsumerNumber(lead.phoneNumber || 'ASC-' + lead.id.replace('lead_', '').toUpperCase());
        setAddress(lead.description || 'Site address as per registration records');
        
        // Auto-extract capacity from lead requirement
        const capMatch = lead.requirement.match(/(\d+(\.\d+)?)\s*(kw|kwp)/i);
        if (capMatch) {
          setSanctionedCapacity(capMatch[1]);
          setInstalledCapacity(capMatch[1]);
          const capKw = parseFloat(capMatch[1]);
          if (!isNaN(capKw)) {
            setInverterRating(capMatch[0]);
            setInverterCapacity(capMatch[0]);
            const defaultCount = Math.ceil((capKw * 1000) / 540);
            setModuleCount(String(defaultCount));
            setModuleCapacityKwp(String(capKw));
          }
        }
        setSanctionNumber('SANC-' + lead.id.replace('lead_', '').toUpperCase());
      }
    }
  }, [leads, defaultLeadId]);

  // Autofill form when lead changes
  const handleLeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const leadId = e.target.value;
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setConsumerName(lead.name);
      setConsumerNumber(lead.phoneNumber || 'ASC-' + lead.id.replace('lead_', '').toUpperCase());
      setAddress(lead.description || 'Site address as per registration records');
      
      const capMatch = lead.requirement.match(/(\d+(\.\d+)?)\s*(kw|kwp)/i);
      if (capMatch) {
        setSanctionedCapacity(capMatch[1]);
        setInstalledCapacity(capMatch[1]);
        const capKw = parseFloat(capMatch[1]);
        if (!isNaN(capKw)) {
          setInverterRating(capMatch[0]);
          setInverterCapacity(capMatch[0]);
          const defaultCount = Math.ceil((capKw * 1000) / 540);
          setModuleCount(String(defaultCount));
          setModuleCapacityKwp(String(capKw));
        }
      }
      setSanctionNumber('SANC-' + lead.id.replace('lead_', '').toUpperCase());
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvasImage();
  };

  const startTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = activeCanvas === 'vendor' ? vendorCanvasRef.current : consumerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (activeCanvas === 'vendor') setVendorSignatureUrl('');
    else setConsumerSignatureUrl('');
  };

  const saveCanvasImage = () => {
    const canvas = activeCanvas === 'vendor' ? vendorCanvasRef.current : consumerCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (activeCanvas === 'vendor') setVendorSignatureUrl(dataUrl);
    else setConsumerSignatureUrl(dataUrl);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const resetForm = () => {
    if (confirm('Are you sure you want to reset all WCR details to defaults?')) {
      setSelectedLeadId('');
      setCompanyName('Arrow Sales Corporation');
      setConsumerName('');
      setConsumerNumber('');
      setAddress('');
      setCategory('Private Sector');
      setSanctionNumber('');
      setSanctionedCapacity('10');
      setInstalledCapacity('10');
      setModuleMake('Waaree Energies Ltd');
      setAlmmModel('Bi-12-540');
      setModuleWattage('540');
      setModuleCount('18');
      setModuleCapacityKwp('9.72');
      setModuleWarrantee('10 yrs product + 25 yrs performance');
      setInverterMakeModel('Growatt MOD 10KTL3-X');
      setInverterRating('10 KW');
      setControllerType('MPPT Integrated');
      setInverterCapacity('10 KW');
      setHpd('Type II SPD Integrated');
      setInverterMfgYear('2026');
      setEarthingCount('3 Nos (LA, DC, AC)');
      setEarthCertifiedText('Yes (< 5 Ohms verified)');
      setLightningArrester('Yes (Solid Copper ESE LA)');
      setVendorSignatureUrl('');
      setConsumerSignatureUrl('');
      if (vendorCanvasRef.current) {
        vendorCanvasRef.current.getContext('2d')?.clearRect(0, 0, 320, 112);
      }
      if (consumerCanvasRef.current) {
        consumerCanvasRef.current.getContext('2d')?.clearRect(0, 0, 320, 112);
      }
    }
  };

  return (
    <div className={isEmbedded ? "h-[650px] bg-slate-50 flex flex-col border border-slate-200 rounded-xl overflow-hidden shadow-xs relative" : "min-h-screen bg-slate-50 flex flex-col -mx-4 -my-6 md:-mx-8 md:-my-8 relative"}>
      {/* Styles for print layout overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .dcr-page {
          font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        @page {
          size: A4;
          margin: 0 !important;
        }

        @media print {
          /* Hide all UI containers & print-hidden annotated components */
          header, 
          aside, 
          nav, 
          .action-sidebar, 
          .dcr-header-bar,
          .bg-amber-500 {
            display: none !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          html, 
          body, 
          #root, 
          #root > div,
          #root > div > div,
          .h-screen,
          main, 
          main > div,
          main > div > div,
          main div.lg\\:flex-row,
          .min-h-screen, 
          .main-content-wrapper {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Strip card/container wrapper paddings, borders, shadows & backgrounds on print */
          main .rounded-2xl,
          main .rounded-xl {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .dcr-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 auto !important;
            padding: 8mm 10mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          .dcr-page:last-child {
            page-break-after: avoid !important;
          }

          .dcr-page .pt-4,
          .dcr-page .space-y-1,
          .dcr-page .max-w-sm {
            page-break-inside: avoid !important;
          }
        }

        @media screen and (max-width: 640px) {
          .dcr-page {
            transform: scale(0.44) !important;
            transform-origin: top center !important;
            margin-bottom: -155mm !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
          }
        }
        @media screen and (min-width: 641px) and (max-width: 1024px) {
          .dcr-page {
            transform: scale(0.70) !important;
            transform-origin: top center !important;
            margin-bottom: -80mm !important;
          }
        }
      `}} />

      {/* Header bar with Print Button */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 select-none dcr-header-bar print:hidden">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 text-emerald-800 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-650" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-800 tracking-tight">WCR Report Certificate Generator</h1>
              <p className="text-xs text-slate-400 font-medium">Generate domestic Solar Power Plant Work Completion Reports</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetForm}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Fields</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

      {/* Mobile Segmented Switch (Form Controls vs Document Preview) */}
      <div className="flex lg:hidden bg-slate-100 p-1.5 border-b border-slate-200 justify-center gap-2 select-none shrink-0 print:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            mobileTab === 'form' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>📝 Form Controls</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            mobileTab === 'preview' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-650 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>📄 Document Preview</span>
        </button>
      </div>

      {/* Main split viewport */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: Form Controls */}
        <div className={`bg-white border-r border-slate-200 overflow-y-auto space-y-4 action-sidebar shrink-0 select-none transition-all duration-300 ${
          mobileTab === 'form' ? 'w-full block' : 'hidden lg:block'
        } ${
          isSidebarCollapsed ? 'lg:w-0 lg:p-0 lg:border-r-0 lg:opacity-0 pointer-events-none' : 'w-full lg:w-96 p-4 opacity-100'
        }`}>
          
          {/* Custom Edit Toggle */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex flex-col space-y-3 shadow-xs select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Edit3 className="w-4 h-4 text-emerald-655" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Direct Page Editor</h4>
                  <p className="text-[9px] text-slate-400 font-medium">Click and type on preview to edit any text</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditable(!isEditable)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEditable ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isEditable ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            {isEmbedded && (
              <div className="flex items-center space-x-2 pt-2 border-t border-emerald-100/50">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 flex items-center justify-center space-x-1 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 text-[10px] font-bold transition-colors cursor-pointer bg-white"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Form</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center space-x-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Lead Selection and Autofill */}
          {!isEmbedded && (
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
              <button
                onClick={() => toggleSection('lead')}
                className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between font-bold text-xs text-slate-700 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Autofill from CRM Lead</span>
                </div>
                {expandedSection === 'lead' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === 'lead' && (
                <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Select Active Lead</label>
                  <select
                    value={selectedLeadId}
                    onChange={handleLeadChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Choose Lead (Autofill) --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        👤 {l.name} ({l.requirement})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Consumer Details */}
          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
            <button
              onClick={() => toggleSection('consumer')}
              className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between font-bold text-xs text-slate-700 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Consumer details</span>
              </div>
              {expandedSection === 'consumer' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'consumer' && (
              <div className="p-4 bg-white border-t border-slate-100 space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Consumer Name</label>
                  <input
                    type="text"
                    value={consumerName}
                    onChange={(e) => setConsumerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Consumer Number</label>
                  <input
                    type="text"
                    value={consumerNumber}
                    onChange={(e) => setConsumerNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Complete Address</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Sector Category (Govt/Private)</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Sanction number</label>
                  <input
                    type="text"
                    value={sanctionNumber}
                    onChange={(e) => setSanctionNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Sanctioned (KW)</label>
                    <input
                      type="text"
                      value={sanctionedCapacity}
                      onChange={(e) => setSanctionedCapacity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Installed (KW)</label>
                    <input
                      type="text"
                      value={installedCapacity}
                      onChange={(e) => setInstalledCapacity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Module & PCU Specifications */}
          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
            <button
              onClick={() => toggleSection('specs')}
              className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between font-bold text-xs text-slate-700 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Components Details</span>
              </div>
              {expandedSection === 'specs' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'specs' && (
              <div className="p-4 bg-white border-t border-slate-100 space-y-3.5">
                <h4 className="text-[10px] font-bold text-emerald-600 uppercase border-b border-emerald-50 pb-1">1. Modules Specs</h4>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Make of Module</label>
                  <input
                    type="text"
                    value={moduleMake}
                    onChange={(e) => setModuleMake(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">ALMM Model Number</label>
                  <input
                    type="text"
                    value={almmModel}
                    onChange={(e) => setAlmmModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Wattage per mod</label>
                    <input
                      type="text"
                      value={moduleWattage}
                      onChange={(e) => setModuleWattage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">No. of Modules</label>
                    <input
                      type="text"
                      value={moduleCount}
                      onChange={(e) => setModuleCount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Total Capacity (KWP)</label>
                  <input
                    type="text"
                    value={moduleCapacityKwp}
                    onChange={(e) => setModuleCapacityKwp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Warrantee Details</label>
                  <input
                    type="text"
                    value={moduleWarrantee}
                    onChange={(e) => setModuleWarrantee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>

                <h4 className="text-[10px] font-bold text-emerald-600 uppercase border-b border-emerald-50 pb-1 pt-2">2. Inverter (PCU) Specs</h4>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Make & Model number</label>
                  <input
                    type="text"
                    value={inverterMakeModel}
                    onChange={(e) => setInverterMakeModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Rating</label>
                    <input
                      type="text"
                      value={inverterRating}
                      onChange={(e) => setInverterRating(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Controller Type</label>
                    <input
                      type="text"
                      value={controllerType}
                      onChange={(e) => setControllerType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">HPD / SPD details</label>
                    <input
                      type="text"
                      value={hpd}
                      onChange={(e) => setHpd(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Mfg Year</label>
                    <input
                      type="text"
                      value={inverterMfgYear}
                      onChange={(e) => setInverterMfgYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Earthing & Signatures */}
          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
            <button
              onClick={() => toggleSection('earthing')}
              className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between font-bold text-xs text-slate-700 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FileSignature className="w-4 h-4 text-emerald-600" />
                <span>Earthing & Protections</span>
              </div>
              {expandedSection === 'earthing' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'earthing' && (
              <div className="p-4 bg-white border-t border-slate-100 space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Separate Earthings count</label>
                  <input
                    type="text"
                    value={earthingCount}
                    onChange={(e) => setEarthingCount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Earth Resistance certified</label>
                  <input
                    type="text"
                    value={earthCertifiedText}
                    onChange={(e) => setEarthCertifiedText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Lightning Arrester make</label>
                  <input
                    type="text"
                    value={lightningArrester}
                    onChange={(e) => setLightningArrester(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Vendor (M/S) Company</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Signature Pad */}
          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
            <button
              onClick={() => toggleSection('signatures')}
              className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between font-bold text-xs text-slate-700 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FileSignature className="w-4 h-4 text-emerald-600" />
                <span>Draw Signatures</span>
              </div>
              {expandedSection === 'signatures' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'signatures' && (
              <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 gap-1 select-none">
                  <button
                    type="button"
                    onClick={() => { setActiveCanvas('vendor'); clearSignature(); }}
                    className={`flex-1 py-1 text-center font-bold text-[10px] rounded transition-colors ${
                      activeCanvas === 'vendor' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    M/S Vendor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveCanvas('consumer'); clearSignature(); }}
                    className={`flex-1 py-1 text-center font-bold text-[10px] rounded transition-colors ${
                      activeCanvas === 'consumer' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Consumer
                  </button>
                </div>

                <div className="flex justify-between items-center mb-1 pt-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Draw {activeCanvas === 'vendor' ? 'Vendor' : 'Consumer'} Sign</label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="border border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50 h-28 relative">
                  <canvas
                    ref={activeCanvas === 'vendor' ? vendorCanvasRef : consumerCanvasRef}
                    width={320}
                    height={112}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startTouchDrawing}
                    onTouchMove={drawTouch}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full cursor-crosshair bg-slate-50 touch-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Page 2 & Aadhar Details */}
          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
            <button
              onClick={() => toggleSection('aadhar')}
              className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between font-bold text-xs text-slate-700 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Page 2 & Aadhar Details</span>
              </div>
              {expandedSection === 'aadhar' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'aadhar' && (
              <div className="p-4 bg-white border-t border-slate-100 space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Consumer Aadhar Number</label>
                  <input
                    type="text"
                    value={aadharNumber}
                    onChange={(e) => setAadharNumber(e.target.value)}
                    placeholder="Enter 12 digit Aadhar number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-555"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Upload Aadhar Card Xerox</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compFile = await compressImage(file, { isDocument: true, maxSizeKB: 75 });
                          const storagePath = `wcr/aadhar_${Date.now()}.webp`;
                          const url = await uploadImageToFirebase(compFile, storagePath);
                          setAadharXeroxUrl(url);
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {aadharXeroxUrl && (
                    <button
                      type="button"
                      onClick={() => setAadharXeroxUrl('')}
                      className="text-[10px] text-rose-500 font-bold hover:underline pt-1 block cursor-pointer"
                    >
                      Remove uploaded image
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: WCR A4 Preview */}
        {(() => {
          const renderUnderlinedField = (value: string | null | undefined, placeholder: string = '...........................................................................', minWidthClass: string = 'min-w-[60px]', textAlignment: string = 'text-center') => {
            const isFilled = !!value;
            return (
              <span className={`font-bold px-1 ${minWidthClass} inline-block ${textAlignment} ${isFilled ? 'border-b border-dotted border-black' : ''}`}>
                {value || placeholder}
              </span>
            );
          };

          const renderTableCellValue = (value: string | null | undefined, textAlignment: string = 'text-left') => {
            return (
              <span className={`font-bold px-1 inline-block ${textAlignment}`}>
                {value || ''}
              </span>
            );
          };

          return (
            <div className={`flex-1 overflow-y-auto overflow-x-auto bg-slate-100 p-2 sm:p-4 md:p-8 flex flex-col items-center space-y-6 main-content-wrapper select-none relative max-w-full ${
              mobileTab === 'preview' ? 'block w-full' : 'hidden lg:flex'
            }`}>
              {isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="absolute left-0 top-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-4 rounded-r-xl shadow-md flex items-center space-x-1 print:hidden cursor-pointer hover:pl-3 transition-all duration-200"
                  title="Expand Controls Sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider [writing-mode:vertical-lr] select-none">Controls</span>
                </button>
              )}

              {/* PAGE 1: WCR Complete */}
              <div className="dcr-page bg-white shadow-xl w-[210mm] h-[297mm] max-h-[297mm] p-[10mm] text-slate-800 flex flex-col justify-between font-serif relative box-border border border-slate-300 print:shadow-none print:border-none print:m-0 text-xs leading-normal overflow-hidden">
                <div className="space-y-2">
                  <div 
                    className="text-center font-bold text-sm underline uppercase font-serif pt-1 pb-1"
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                  >
                    Work Completion Report for Solar Power Plant
                  </div>

                  {/* Table Structure matching image exactly */}
                  <div 
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    className="pt-0.5"
                  >
                    <table className="w-full table-fixed border-collapse border border-black text-[10px] leading-snug font-serif">
                      <thead>
                        <tr className="bg-slate-50 font-bold border-b border-black text-center">
                          <th className="border-r border-black py-1 px-1 w-[8%]">Sr.No</th>
                          <th className="border-r border-black py-1 px-1.5 w-[42%] text-left">Component</th>
                          <th className="py-1 px-1.5 w-[50%] text-left">Observation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1 text-center">1</td>
                          <td className="border-r border-black py-1 px-1.5">Name</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(consumerName)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1 text-center">2</td>
                          <td className="border-r border-black py-1 px-1.5">Consumer number</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(consumerNumber)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1 text-center">3</td>
                          <td className="border-r border-black py-1 px-1.5">Site/Location With Complete Address</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(address)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1 text-center">4</td>
                          <td className="border-r border-black py-1 px-1.5">Category:Govt/Private Sector</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(category)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1 text-center">5</td>
                          <td className="border-r border-black py-1 px-1.5">Sanction number</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(sanctionNumber)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1 text-center" rowSpan={2}>6</td>
                          <td className="border-r border-black py-1 px-1.5">Sanctioned Capacity of solar PV system (KW) Installed</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(sanctionedCapacity)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5">Capacity of solar PV system (KW)</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(installedCapacity)}</td>
                        </tr>
                        
                        {/* Subheader: Module Specs */}
                        <tr className="border-b border-black bg-slate-50 font-bold">
                          <td className="border-r border-black py-1 px-1 text-center" rowSpan={7}>7</td>
                          <td className="py-1 px-1.5 text-center border-r border-black" colSpan={2}>Specification of the Modules</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Make of Module</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(moduleMake)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">ALMM Model Number</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(almmModel)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Wattage per module</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(moduleWattage)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">No.of Module</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(moduleCount)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Total Capacity (KWP)</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(moduleCapacityKwp)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Warrantee Details (Product + Performance)</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(moduleWarrantee)}</td>
                        </tr>

                        {/* Subheader: PCU */}
                        <tr className="border-b border-black bg-slate-50 font-bold">
                          <td className="border-r border-black py-1 px-1 text-center" rowSpan={7}>8</td>
                          <td className="py-1 px-1.5 text-center border-r border-black" colSpan={2}>PCU</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Make & Model number of Inverter</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(inverterMakeModel)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Rating</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(inverterRating)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Type of charge controller/ MPPT</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(controllerType)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Capacity of Inverter</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(inverterCapacity)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">HPD</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(hpd)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">Year of manufacturing</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(inverterMfgYear)}</td>
                        </tr>

                        {/* Subheader: Earthing */}
                        <tr className="border-b border-black bg-slate-50 font-bold">
                          <td className="border-r border-black py-1 px-1 text-center" rowSpan={4}>9</td>
                          <td className="py-1 px-1.5 text-center border-r border-black" colSpan={2}>Earthing and Protections</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3">No of Separate Earthings with earth Resistance</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(earthingCount)}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 pl-3 text-justify leading-snug">
                            It is certified that the Earth Resistance measure in presence of Licensed Electrical Contractor/Supervisor and found in order i.e. &lt; 5 Ohms as per MNRE OM Dtd.07.06.24 for CFA Component.
                          </td>
                          <td className="py-1 px-1.5">{renderTableCellValue(earthCertifiedText)}</td>
                        </tr>
                        <tr>
                          <td className="border-r border-black py-1 px-1.5 pl-3">Lightening Arrester</td>
                          <td className="py-1 px-1.5">{renderTableCellValue(lightningArrester)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Justified Paragraph declarations below table matching screenshot */}
                  <div 
                    className="space-y-5 pt-5 pb-3 text-[11px] text-justify leading-loose font-serif text-slate-900 w-full"
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                  >
                    <p className="text-justify w-full leading-loose">
                      We {renderUnderlinedField(companyName, '...........................................................................', 'min-w-[160px]', 'text-center')} [Vendor] & {renderUnderlinedField(consumerName, '...........................................................................', 'min-w-[160px]', 'text-center')} [Consumer] bearing Consumer Number {renderUnderlinedField(consumerNumber, '..................................................', 'min-w-[130px]', 'text-center')} Ensured structural stability of installed solar power plant and obtained requisite permissions from the concerned authority. If in future, by virtue of any means due to collapsing or damage to installed solar power plant, MSEDCL will not be held responsible for any loss to property or human life, if any.
                    </p>
                    <p className="text-justify w-full leading-loose">
                      This is to Certified above Installed Solar PV System is working properly with electrical safety & Islanding switch in case of any presence of backup inverter an arrangement should be made in such way the backup inverter supply should never be synchronized with solar inverter to avoid any electrical accident due to back feeding. We will be held responsible for non-working of islanding mechanism and back feed to the de-energized grid.
                    </p>
                  </div>
                </div>

                {/* Signatures section */}
                <div className="pt-5 pb-1 flex justify-between items-end">
                  {/* Left: Vendor Signature */}
                  <div className="relative text-[10.5px] font-bold text-left w-48 font-serif">
                    {vendorSignatureUrl ? (
                      <div className="absolute -top-12 left-2 w-28 h-11 select-none pointer-events-none">
                        <img
                          src={vendorSignatureUrl}
                          alt="Vendor Signature"
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                    ) : (
                      <div className="h-7"></div>
                    )}
                    <div className="border-t border-dotted border-black pt-1 text-center w-36">
                      Signature [Vendor]
                    </div>
                  </div>

                  {/* Right: Consumer Signature */}
                  <div className="relative text-[10.5px] font-bold text-right w-48 font-serif flex flex-col items-end">
                    {consumerSignatureUrl ? (
                      <div className="absolute -top-12 right-2 w-28 h-11 select-none pointer-events-none">
                        <img
                          src={consumerSignatureUrl}
                          alt="Consumer Signature"
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                    ) : (
                      <div className="h-7"></div>
                    )}
                    <div className="border-t border-dotted border-black pt-1 text-center w-36">
                      Signature [Consumer]
                    </div>
                  </div>
                </div>

              </div>

              {/* PAGE 2: Guarantee Certificate Undertaking & Aadhar Xerox */}
              <div className="dcr-page bg-white shadow-xl w-[210mm] h-[297mm] max-h-[297mm] p-[15mm] text-slate-900 flex flex-col justify-between font-serif relative box-border border border-slate-300 print:shadow-none print:border-none print:m-0 text-xs leading-relaxed overflow-hidden">
                <div className="space-y-6">
                  {/* Page 2 Title */}
                  <div 
                    className="font-bold text-sm leading-snug font-serif pt-2 text-slate-900"
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                  >
                    Guarantee Certificate Undertaking to be submitted by VENDOR
                  </div>

                  {/* Guarantee Undertaking Declaration Paragraph */}
                  <div 
                    className="text-xs text-justify leading-relaxed font-serif text-slate-900 space-y-4 pt-1"
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                  >
                    <p>
                      The undersigned will provide the services to the consumers for repairs/maintenance of the RTS plant free of cost for 5 years of the comprehensive Maintenance Contract (CMC) period from the date of commissioning of the plant. Non performing/under-performing system component will be replaced/repaired free of cost in the CMC period
                    </p>
                  </div>

                  {/* Vendor Signature & Stamp section */}
                  <div className="pt-10 space-y-2">
                    <div className="relative text-xs font-bold text-left w-56 font-serif">
                      {vendorSignatureUrl ? (
                        <div className="absolute -top-12 left-2 w-32 h-12 select-none pointer-events-none">
                          <img
                            src={vendorSignatureUrl}
                            alt="Vendor Signature"
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        </div>
                      ) : (
                        <div className="h-8"></div>
                      )}
                      <div className="pt-1">
                        Signature [Vendor]
                      </div>
                      <div className="text-slate-700 font-normal pt-4">
                        Stamp & Seal
                      </div>
                    </div>
                  </div>

                  {/* Identity Details of Consumer */}
                  <div 
                    className="pt-8 space-y-3 text-xs font-serif text-slate-900"
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">Identity Details of Consumer: -</span>
                      <span className="border-b border-dotted border-black min-w-[280px] px-1 font-bold inline-block">
                        {consumerName || '...........................................................................................................................................'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">Aadhar <span className="underline">Number</span>:-</span>
                      <span className="border-b border-dotted border-black min-w-[240px] px-1 font-bold inline-block">
                        {aadharNumber || '...................................................................................................'}
                      </span>
                    </div>
                  </div>

                  {/* Box for Aadhar Card Xerox Upload */}
                  <div className="pt-4 flex justify-center">
                    <div className="w-[140mm] h-[85mm] border-2 border-black flex flex-col items-center justify-center p-4 text-center font-bold text-xs space-y-2 bg-slate-50/50 relative overflow-hidden">
                      {aadharXeroxUrl ? (
                        <img
                          src={aadharXeroxUrl}
                          alt="Aadhar Card Xerox"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <>
                          <p className="text-slate-900 tracking-wide font-serif">Upload Xerox of AADHAR CARD HERE</p>
                          <p className="text-slate-800 text-[10px] tracking-wider font-serif">SHOULDBESELFATTESTEDBYCONSUMER</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}

      </div>
    </div>
  );
};

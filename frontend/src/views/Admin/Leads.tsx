import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { leadService } from '../../services/leadService';
import { quotationService } from '../../services/quotationService';
import { orderService } from '../../services/orderService';
import { employeeService } from '../../services/employeeService';
import { mapService } from '../../services/mapService';
import { pdfService } from '../../services/pdfService';
import { productService } from '../../services/productService';
import type { Lead, Quotation, OrderConfirmation, Profile, ClientDocument, ClientRegistration, InstallationPhoto, QuotationItem, Product } from '../../types';
import { Timeline } from '../../components/Pipeline/Timeline';
import { SignatureCapture } from '../../components/Signature/SignatureCapture';
import { LeafletMap } from '../../components/Map/LeafletMap';
import imageCompression from 'browser-image-compression';
import { compressImage } from '../../services/imageCompressionService';
import { uploadImageToFirebase } from '../../services/firebase';
import { DcrDocument } from './DcrDocument';
import { WcrDocument } from './WcrDocument';
import { ModelAgreementDocument } from './ModelAgreementDocument';
import { AnnexureProformaDocument } from './AnnexureProformaDocument';
import {
  Search, Plus, FileText, Camera, CheckSquare, UploadCloud,
  ChevronLeft, Trash2, Send, Star, FileCheck, CheckCircle, Compass, X, Eye, Download
} from 'lucide-react';
import dayjs from 'dayjs';

export const Leads: React.FC = () => {
  const { currentRole, currentUser } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Selected Lead (Details View)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'quotation' | 'order' | 'installation' | 'registration' | 'documentation'>('timeline');
  const [docSubTab, setDocSubTab] = useState<'dcr' | 'wcr' | 'model_agreement' | 'annexure_proforma'>('dcr');

  // Form: Create Lead
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadRequirement, setLeadRequirement] = useState('');
  const [leadDescription, setLeadDescription] = useState('');
  const [leadAssignedEmployeeId, setLeadAssignedEmployeeId] = useState('');

  // Quotation Creator States
  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([{ itemName: '', qty: 1, rate: 0, amount: 0 }]);
  const [quoteFollowUp, setQuoteFollowUp] = useState('');
  const [quoteRating, setQuoteRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  // PDF Preview Modal State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>('');

  const handleViewPdf = (q: Quotation) => {
    if (!q.pdfBlob) return;
    const url = URL.createObjectURL(q.pdfBlob);
    setPreviewPdfUrl(url);
    setPreviewPdfTitle(q.quotationNumber);
  };

  // Order Booking States
  const [bookingItems, setBookingItems] = useState<QuotationItem[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<OrderConfirmation['paymentMode']>('utr');
  const [paymentReference, setPaymentReference] = useState('');
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isBookingOrder, setIsBookingOrder] = useState(false);

  // KYC Document Slots States
  const [kycDocs, setKycDocs] = useState<ClientDocument[]>([]);

  // Client Registration Checklist States
  const [regChecklist, setRegChecklist] = useState<ClientRegistration | null>(null);

  // Installation Quality States
  const [installPhotos, setInstallPhotos] = useState<InstallationPhoto[]>([]);
  const [isCapturingInstall, setIsCapturingInstall] = useState(false);
  const [installPhotoType, setInstallPhotoType] = useState<InstallationPhoto['photoType']>('earthing');
  const [isLocatingInstall, setIsLocatingInstall] = useState(false);

  // Release Dept states
  const [releaseNotes, setReleaseNotes] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string; type: string } | null>(null);

  const loadData = async () => {
    let list = await leadService.getLeads();
    if (currentRole === 'field_employee' && currentUser) {
      list = list.filter(l => l.assignedEmployeeId === currentUser.id);
    }
    setLeads(list);

    const empList = await employeeService.getEmployees();
    setEmployees(empList);

    const profiles = await employeeService.getAllProfiles();
    const names: Record<string, string> = {};
    profiles.forEach(p => {
      names[p.id] = p.fullName;
    });
    setEmployeeNames(names);

    const prodList = await productService.getProducts();
    setCatalogProducts(prodList);
  };

  useEffect(() => {
    loadData();
  }, [currentRole, currentUser]);

  // Load contextual data for details panel
  const handleSelectLead = async (lead: Lead) => {
    setSelectedLead(lead);
    setActiveTab('timeline');
    
    // Load KYC Docs
    const docs = await orderService.getClientDocumentsByLeadId(lead.id);
    setKycDocs(docs);

    // Load Registration Checklist
    const reg = await orderService.getClientRegistrationByLeadId(lead.id);
    setRegChecklist(reg || null);

    // Load Installation Photos
    const photos = await orderService.getInstallationPhotosByLeadId(lead.id);
    setInstallPhotos(photos);

    // Auto load quote items if quotation exists
    const quotations = await quotationService.getQuotationsByLeadId(lead.id);
    if (quotations.length > 0) {
      setBookingItems(quotations[0].items);
    } else {
      setBookingItems([]);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadPhone || !leadRequirement) {
      alert('Please fill out Name, Phone and Requirement.');
      return;
    }

    await leadService.createLead({
      name: leadName,
      phoneNumber: leadPhone,
      email: leadEmail || undefined,
      requirement: leadRequirement,
      description: leadDescription,
      assignedEmployeeId: leadAssignedEmployeeId || undefined,
      createdBy: currentUser?.id || 'mock_admin',
      status: 'new'
    });

    // Reset
    setLeadName('');
    setLeadPhone('');
    setLeadEmail('');
    setLeadRequirement('');
    setLeadDescription('');
    setLeadAssignedEmployeeId('');
    setShowCreateModal(false);
    loadData();
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('WARNING: Are you sure you want to delete this lead? All associated quotations, contracts, photos, and files will be permanently erased.')) {
      await leadService.deleteLead(id);
      setSelectedLead(null);
      loadData();
    }
  };

  const handleAssignEmployee = async (employeeId: string) => {
    if (selectedLead) {
      await leadService.assignLead(selectedLead.id, employeeId || undefined);
      const updated = await leadService.getLeadById(selectedLead.id);
      if (updated) setSelectedLead(updated);
      loadData();
    }
  };

  // 1. Quotation building helpers
  const handleAddQuoteItem = () => {
    setQuoteItems([...quoteItems, { itemName: '', qty: 1, rate: 0, amount: 0 }]);
  };

  const handleUpdateQuoteItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...quoteItems];
    const item = updated[index];
    if (field === 'itemName') {
      item.itemName = value;
    } else if (field === 'qty') {
      item.qty = Number(value);
      item.amount = item.qty * item.rate;
    } else if (field === 'rate') {
      item.rate = Number(value);
      item.amount = item.qty * item.rate;
    }
    setQuoteItems(updated);
  };

  const handleSelectCatalogProduct = (index: number, name: string, rate: number) => {
    const updated = [...quoteItems];
    updated[index] = {
      ...updated[index],
      itemName: name,
      rate: rate,
      amount: updated[index].qty * rate
    };
    setQuoteItems(updated);
  };

  const handleRemoveQuoteItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleGenerateQuotation = async () => {
    if (!selectedLead) return;
    if (quoteItems.some(item => !item.itemName || item.rate <= 0)) {
      alert('Please fill in valid names and rates for all items.');
      return;
    }

    setIsGeneratingQuote(true);
    try {
      const subtotal = quoteItems.reduce((sum, item) => sum + item.amount, 0);
      const grandTotal = subtotal;

      // Draft quotation
      const quoteDraft: Omit<Quotation, 'id' | 'createdAt'> = {
        leadId: selectedLead.id,
        quotationNumber: `Q-${dayjs().format('YYYY')}-${Math.floor(1000 + Math.random() * 9000)}`,
        items: quoteItems,
        subtotal,
        grandTotal,
        followUpDate: quoteFollowUp || dayjs().add(7, 'day').format('YYYY-MM-DD'),
        createdBy: currentUser?.id || 'mock_emp',
        sentViaWhatsapp: false
      };

      // Generate PDF Blob
      const pdfBlob = await pdfService.generateQuotationPDF(
        quoteDraft as any,
        selectedLead,
        currentUser?.fullName || 'Sales Agent'
      );

      // Save to DB
      await quotationService.createQuotation({
        ...quoteDraft,
        pdfBlob
      });

      // Update lead rating
      await leadService.updateLeadRating(selectedLead.id, quoteRating);

      // Refresh lead details
      const updated = await leadService.getLeadById(selectedLead.id);
      if (updated) setSelectedLead(updated);
      
      // Load quotations timeline
      handleSelectLead(updated || selectedLead);

      // Fetch saved quotations to get full object (including generated ID)
      const list = await quotationService.getQuotationsByLeadId(selectedLead.id);
      const savedQuote = list.find(item => item.quotationNumber === quoteDraft.quotationNumber);

      if (savedQuote && savedQuote.pdfBlob) {
        handleViewPdf(savedQuote);
      }

      if (confirm(`Quotation ${quoteDraft.quotationNumber} successfully generated & saved!\n\nWould you like to open WhatsApp to share this quotation summary with ${selectedLead.name} immediately?`)) {
        if (savedQuote) {
          handleWhatsappShare(savedQuote);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error creating quotation.');
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  // WhatsApp share helper
  const handleWhatsappShare = async (q: Quotation) => {
    if (!selectedLead) return;

    // Check if browser supports sharing files (Web Share API)
    if (q.pdfBlob && navigator.canShare) {
      const file = new File([q.pdfBlob], `Quotation_${q.quotationNumber}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Quotation ${q.quotationNumber}`,
            text: `Dear ${selectedLead.name}, please find attached the quotation from Arrow Solar Corp.`
          });
          await quotationService.markQuotationAsSent(q.id);
          handleSelectLead(selectedLead);
          return; // Successfully shared file!
        } catch (err) {
          console.log('Web share failed/cancelled, falling back to link sharing...', err);
        }
      }
    }
    
    // Fallback: Download the file automatically to the device
    if (q.pdfBlob) {
      const url = URL.createObjectURL(q.pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation_${q.quotationNumber}.pdf`;
      a.click();
    }

    // Build text summary for WhatsApp Web chat window
    const summaryText = `*ARROW SOLAR CORP - PROPOSAL SUMMARY*\n\n` +
      `Proposal No: ${q.quotationNumber}\n` +
      `Client Name: ${selectedLead.name}\n` +
      `Requirement: ${selectedLead.requirement}\n` +
      `-------------------------------------\n` +
      q.items.map(item => `• ${item.itemName} (x${item.qty}) - ₹${item.amount.toLocaleString('en-IN')}`).join('\n') +
      `\n-------------------------------------\n` +
      `*Grand Total: ₹${q.grandTotal.toLocaleString('en-IN')}*\n` +
      `Follow-up Date: ${dayjs(q.followUpDate).format('DD MMM YYYY')}\n\n` +
      `_Note: I have downloaded the official PDF proposal to your device. Please attach and send it here._`;

    const encodedMsg = encodeURIComponent(summaryText);
    const whatsappUrl = `https://wa.me/91${selectedLead.phoneNumber}?text=${encodedMsg}`;
    
    // Mark as sent in DB
    await quotationService.markQuotationAsSent(q.id);
    window.open(whatsappUrl, '_blank');
    
    // Reload UI
    handleSelectLead(selectedLead);
  };

  // 2. Booking order confirmation
  const handleConfirmOrder = async () => {
    if (!selectedLead) return;
    if (bookingItems.length === 0) {
      alert('No quotation items found to book. Please create a quotation first.');
      return;
    }
    if (advanceAmount <= 0) {
      alert('Please input a valid advance payment amount.');
      return;
    }
    if (!signatureBlob) {
      alert('Please capture the client signature first.');
      return;
    }

    setIsBookingOrder(true);
    try {
      const subtotal = bookingItems.reduce((sum, item) => sum + item.amount, 0);

      const ocDraft: Omit<OrderConfirmation, 'id' | 'createdAt'> = {
        leadId: selectedLead.id,
        quotationId: 'q_link', // mockup link
        itemsConfirmed: bookingItems,
        subtotal,
        advanceAmount,
        paymentMode,
        paymentReference: paymentReference || undefined,
        clientSignatureBlob: signatureBlob,
        createdBy: currentUser?.id || 'mock_emp'
      };

      // Compile receipt PDF
      const pdf = await pdfService.generateConfirmationPDF(
        ocDraft as any,
        selectedLead,
        currentUser?.fullName || 'Booking Manager',
        signatureUrl || ''
      );

      await orderService.createOrderConfirmation({
        ...ocDraft,
        confirmationPdfBlob: pdf
      });

      alert('Order booking confirmed! Booking receipt generated and saved.');
      
      const updated = await leadService.getLeadById(selectedLead.id);
      if (updated) setSelectedLead(updated);
      handleSelectLead(updated || selectedLead);
    } catch (err) {
      console.error(err);
      alert('Error confirming order.');
    } finally {
      setIsBookingOrder(false);
    }
  };

  // 3. File KYC upload
  const handleDocUpload = async (docType: ClientDocument['docType'], file: File) => {
    if (!selectedLead) return;

    try {
      let processedBlob: Blob = file;
      if (file.type.startsWith('image/')) {
        processedBlob = await compressImage(file, { isDocument: true, maxSizeKB: 75 });
        const storagePath = `documents/${selectedLead.id}/${docType}_${Date.now()}.webp`;
        await uploadImageToFirebase(processedBlob, storagePath);
      }

      await orderService.uploadClientDocument({
        leadId: selectedLead.id,
        docType,
        fileBlob: processedBlob,
        uploadedBy: currentUser?.id || 'mock_admin'
      });

      alert(`${docType.toUpperCase().replace('_', ' ')} successfully uploaded.`);
      handleSelectLead(selectedLead);
    } catch (err) {
      alert('File upload error.');
    }
  };

  const handleDocDelete = async (docId: string) => {
    if (confirm('Delete this KYC document?')) {
      await orderService.deleteClientDocument(docId);
      handleSelectLead(selectedLead!);
    }
  };

  // 4. Registration checklists
  const handleChecklistToggle = async (field: keyof ClientRegistration, val: any) => {
    if (!selectedLead || !regChecklist) return;

    const updated = {
      ...regChecklist,
      [field]: val
    };

    await orderService.saveClientRegistration(updated);
    
    const updatedLead = await leadService.getLeadById(selectedLead.id);
    if (updatedLead) setSelectedLead(updatedLead);
    handleSelectLead(updatedLead || selectedLead);
  };

  const handleBankFileUpload = async (file: File) => {
    if (!selectedLead || !regChecklist) return;

    try {
      let processedBlob: Blob = file;
      if (file.type.startsWith('image/')) {
        processedBlob = await compressImage(file, { isDocument: true, maxSizeKB: 75 });
        const storagePath = `documents/${selectedLead.id}/bank_${Date.now()}.webp`;
        await uploadImageToFirebase(processedBlob, storagePath);
      }

      const updated = {
        ...regChecklist,
        bankDocumentBlob: processedBlob,
        bankFileUploaded: true
      };

      await orderService.saveClientRegistration(updated);
      alert('Bank document uploaded.');
      handleSelectLead(selectedLead);
    } catch (err) {
      alert('Error uploading bank document.');
    }
  };

  // 5. Image Compression & Watermarked Geo-Tagging canvas
  const handleCaptureInstallPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedLead || !e.target.files?.[0]) return;
    const file = e.target.files[0];

    setIsCapturingInstall(true);

    try {
      // 1. Get GPS Geolocation
      setIsLocatingInstall(true);
      const coords = await mapService.getCurrentCoordinates();
      const address = await mapService.reverseGeocode(coords.latitude, coords.longitude);
      setIsLocatingInstall(false);

      // 2. Compress image file client-side (target < 55 KB)
      const compressed = await compressImage(file, { maxSizeKB: 55 });

      // 3. Stamp GPS coordinate metadata using HTML Canvas overlay watermarking
      const img = new Image();
      img.src = URL.createObjectURL(compressed);
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, img.height - 70, img.width, 70);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px Arial';
          ctx.fillText(`GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`, 20, img.height - 45);
          ctx.fillText(`Address: ${address.substring(0, 75)}...`, 20, img.height - 25);
          ctx.fillText(`Timestamp: ${dayjs().format('DD MMM YYYY, hh:mm A [IST]')}`, 20, img.height - 8);

          canvas.toBlob(async (blob) => {
            if (blob) {
              const compBlob = await compressImage(blob, { maxSizeKB: 55 });
              const storagePath = `installations/${selectedLead.id}/${installPhotoType}_${Date.now()}.webp`;
              await uploadImageToFirebase(compBlob, storagePath);

              await orderService.uploadInstallationPhoto({
                leadId: selectedLead.id,
                photoType: installPhotoType,
                photoBlob: compBlob,
                location: {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  placeName: address,
                  capturedAt: new Date().toISOString()
                },
                uploadedBy: currentUser?.id || 'mock_emp'
              });

              alert(`Watermarked Installation photo (${installPhotoType.toUpperCase()}) uploaded to Firebase Storage!`);
              handleSelectLead(selectedLead);
            }
          }, 'image/jpeg', 0.95);
        }
      };
    } catch (err) {
      console.error(err);
      alert('Location acquisition or camera capture error. Ensure device location permissions are active.');
    } finally {
      setIsCapturingInstall(false);
      setIsLocatingInstall(false);
    }
  };

  // 6. Release Upload
  const handleReleaseUpload = async (file: File) => {
    if (!selectedLead) return;

    try {
      let processed: Blob = file;
      if (file.type.startsWith('image/')) {
        const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
        processed = await imageCompression(file, options);
      }

      await orderService.uploadReleaseDocument({
        leadId: selectedLead.id,
        fileBlob: processed,
        uploadedBy: currentUser?.id || 'mock_admin',
        notes: releaseNotes || undefined
      });

      alert('Release Document successfully received. Pipeline closed.');
      setReleaseNotes('');
      
      const updated = await leadService.getLeadById(selectedLead.id);
      if (updated) setSelectedLead(updated);
      handleSelectLead(updated || selectedLead);
    } catch (err) {
      alert('Error uploading release document.');
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    if (searchTerm && !lead.name.toLowerCase().includes(searchTerm.toLowerCase()) && !lead.phoneNumber.includes(searchTerm)) return false;
    if (statusFilter && lead.status !== statusFilter) return false;
    if (employeeFilter && lead.assignedEmployeeId !== employeeFilter) return false;
    return true;
  });

  const getStatusBadge = (status: Lead['status']) => {
    const classes: Record<string, string> = {
      new: 'bg-slate-100 text-slate-800 border-slate-200',
      quotation_sent: 'bg-amber-100 text-amber-800 border-amber-200',
      confirmed: 'bg-violet-100 text-violet-800 border-violet-200',
      registered: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      installed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      closed: 'bg-emerald-800 text-white border-emerald-900',
      lost: 'bg-rose-100 text-rose-800 border-rose-200'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${classes[status] || 'bg-gray-100'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Detail Panel Trigger */}
      {selectedLead ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4 print:hidden">
            <button
              onClick={() => setSelectedLead(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Leads</span>
            </button>

            <div className="flex items-center gap-2">
              {getStatusBadge(selectedLead.status)}
              {currentRole === 'super_admin' && (
                <button
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete Lead"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Client Bio & Assign Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start print:hidden">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">{selectedLead.name}</h2>
              <p className="text-xs text-slate-500 font-semibold">📞 +91 {selectedLead.phoneNumber} | ✉️ {selectedLead.email || 'No email provided'}</p>
              <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <strong>Project:</strong> {selectedLead.requirement}
              </p>
            </div>

            {/* Admin representative assigner dropdown */}
            {currentRole !== 'field_employee' && (
              <div className="space-y-1.5 md:text-right">
                <label className="block text-xs font-bold text-slate-500">Assigned Field Representative</label>
                <select
                  value={selectedLead.assignedEmployeeId || ''}
                  onChange={(e) => handleAssignEmployee(e.target.value)}
                  className="w-full md:w-64 border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-xs font-bold focus:outline-none cursor-pointer text-slate-700"
                >
                  <option value="">-- Unassigned / Cold --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tab Menu Options */}
          <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-bold text-slate-400 select-none shrink-0 print:hidden">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 px-4 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'timeline' ? 'border-emerald-600 text-emerald-600 font-extrabold' : 'border-transparent hover:text-slate-800'
              }`}
            >
              Timeline Stepper
            </button>
            
            {/* Quotations builder available for Employee & Admin */}
            {['admin', 'field_employee'].includes(currentRole) && (
              <button
                onClick={() => setActiveTab('quotation')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'quotation' ? 'border-emerald-600 text-emerald-600 font-extrabold' : 'border-transparent hover:text-slate-800'
                }`}
              >
                Create Quotation
              </button>
            )}

            {/* Confirm booking receipt */}
            {['admin', 'field_employee'].includes(currentRole) && (
              <button
                onClick={() => setActiveTab('order')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'order' ? 'border-emerald-600 text-emerald-600 font-extrabold' : 'border-transparent hover:text-slate-800'
                }`}
              >
                Order & KYC Docs
              </button>
            )}

            {/* Geo photos */}
            <button
              onClick={() => setActiveTab('installation')}
              className={`py-3 px-4 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'installation' ? 'border-emerald-600 text-emerald-600 font-extrabold' : 'border-transparent hover:text-slate-800'
              }`}
            >
              Installation Photos
            </button>

            {/* Documentation tab containing DCR Certificate generator */}
            <button
              onClick={() => setActiveTab('documentation')}
              className={`py-3 px-4 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'documentation' ? 'border-emerald-600 text-emerald-600 font-extrabold' : 'border-transparent hover:text-slate-800'
              }`}
            >
              Documentation
            </button>

            {/* Registration checklists & Release (Admin only) */}
            {currentRole !== 'field_employee' && (
              <button
                onClick={() => setActiveTab('registration')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'registration' ? 'border-emerald-600 text-emerald-600 font-extrabold' : 'border-transparent hover:text-slate-800'
                }`}
              >
                Registration & Release
              </button>
            )}
          </div>

          {/* TAB CONTENTS */}
          <div className="pt-2">
            {/* Tab 1: Timeline */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Project Timeline History</h3>
                <Timeline lead={selectedLead} />
              </div>
            )}

            {/* Tab 2: Quotation Builder */}
            {activeTab === 'quotation' && (
              <div className="space-y-6 max-w-3xl text-xs font-semibold">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Quotation Line-Items Builder</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Add solar products, adjust counts, and generate proposal PDF invoices.</p>
                </div>

                <div className="space-y-3">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[9px] font-bold border-b border-slate-100">
                        <th className="pb-2">Product/Item Name</th>
                        <th className="pb-2 text-center w-16">Qty</th>
                        <th className="pb-2 text-right w-28">Rate (₹)</th>
                        <th className="pb-2 text-right w-32">Amount (₹)</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quoteItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 space-y-1.5">
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                  handleUpdateQuoteItem(idx, 'itemName', '');
                                } else if (val) {
                                  const prod = catalogProducts.find(p => p.id === val);
                                  if (prod) {
                                    handleSelectCatalogProduct(idx, prod.name, prod.rate);
                                  }
                                }
                              }}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 font-bold text-slate-700 cursor-pointer text-[10px]"
                            >
                              <option value="">-- Select Product Catalog Item --</option>
                              {catalogProducts.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} (₹{p.rate.toLocaleString('en-IN')})</option>
                              ))}
                              <option value="custom">-- Custom Item / Service --</option>
                            </select>

                            <input
                              type="text"
                              required
                              value={item.itemName}
                              onChange={(e) => handleUpdateQuoteItem(idx, 'itemName', e.target.value)}
                              placeholder="Double-check or type custom product description..."
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => handleUpdateQuoteItem(idx, 'qty', e.target.value)}
                              className="w-12 text-center border border-slate-200 rounded-lg py-1.5 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              value={item.rate || ''}
                              onChange={(e) => handleUpdateQuoteItem(idx, 'rate', e.target.value)}
                              placeholder="0"
                              className="w-24 text-right border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-800">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 text-center">
                            {quoteItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuoteItem(idx)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    onClick={handleAddQuoteItem}
                    className="text-[10px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Proposal Hotness (1–5 Stars)</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setQuoteRating(star as any)}
                          className="star-btn cursor-pointer focus:outline-none"
                        >
                          <Star className={`w-5 h-5 ${star <= quoteRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500">Follow-up Inspection Date</label>
                    <input
                      type="date"
                      value={quoteFollowUp}
                      onChange={(e) => setQuoteFollowUp(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none bg-slate-50"
                    />
                  </div>

                  <div className="flex flex-col justify-end text-right bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Quote</span>
                    <span className="text-xl font-extrabold text-emerald-600">
                      ₹{quoteItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateQuotation}
                  disabled={isGeneratingQuote}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer flex justify-center items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isGeneratingQuote ? 'Compiling Proposal & PDF...' : 'Compile & Save Quotation'}</span>
                </button>

                {/* Proposals History List with Whatsapp redirection */}
                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Generated Quotations History</h4>
                  
                  <LeadQuotationsTimeline leadId={selectedLead.id} onShare={handleWhatsappShare} onViewPdf={handleViewPdf} />
                </div>
              </div>
            )}

            {/* Tab 3: Order Booking & KYC */}
            {activeTab === 'order' && (
              <div className="space-y-8 text-xs font-semibold">
                {/* Order Confirmation Block */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Book Order Confirmation Receipt</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Record client deposit details and collect agreement signature.</p>
                  </div>

                  {bookingItems.length === 0 ? (
                    <p className="text-slate-400 font-medium italic">Please generate a proposal/quotation first before booking.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-slate-500 mb-1">Advance Amount Collected (₹)</label>
                          <input
                            type="number"
                            required
                            value={advanceAmount || ''}
                            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                            placeholder="e.g. 50000"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 mb-1">Payment Mode</label>
                          <select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value as any)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none cursor-pointer text-slate-700"
                          >
                            <option value="utr">Bank UTR</option>
                            <option value="transaction_id">Online Transaction ID</option>
                            <option value="cheque">Cheque Number</option>
                            <option value="cash">Cash Receipt</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-500 mb-1">Transaction Ref / Cheque No</label>
                          <input
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="e.g. UTR12345678"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Signature Capture component */}
                      <div className="max-w-md">
                        <SignatureCapture onSave={(blob, dataUrl) => {
                          setSignatureBlob(blob);
                          setSignatureUrl(dataUrl);
                          alert('Client signature saved successfully!');
                        }} />

                        {signatureBlob && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Signature Canvas Captured</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmOrder}
                        disabled={isBookingOrder}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer flex justify-center items-center gap-2"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>{isBookingOrder ? 'Booking Order & Receipt...' : 'Book Order & Lock Contract'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* KYC Document uploads slots */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Utility & KYC Document Uploads (5 Slots)</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Verify identity and billing accounts. Target size compressed automatically &lt; 1MB.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {(['pan_card', 'aadhar_card', 'electricity_bill', 'tax_paper', 'account_details'] as const).map((docType) => {
                      const doc = kycDocs.find(d => d.docType === docType);
                      return (
                        <div key={docType} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative flex flex-col justify-between h-36">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              {docType.replace('_', ' ')}
                            </span>
                            {doc ? (
                              <div className="space-y-1.5">
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" /> Completed
                                </span>
                                <p className="text-[9px] text-slate-400 font-medium">Uploaded: {dayjs(doc.uploadedAt).format('DD MMM YYYY')}</p>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-slate-400 italic">Document Missing</span>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center">
                            {doc ? (
                              <>
                                <div className="flex gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = URL.createObjectURL(doc.fileBlob);
                                      setPreviewDoc({
                                        name: doc.docType.replace('_', ' ').toUpperCase(),
                                        url,
                                        type: doc.fileBlob.type
                                      });
                                    }}
                                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-black cursor-pointer"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = URL.createObjectURL(doc.fileBlob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `${doc.docType}_${selectedLead.name.replace(/\s+/g, '_')}`;
                                      a.click();
                                    }}
                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                                  >
                                    Download
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDocDelete(doc.id)}
                                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <div className="relative overflow-hidden w-full">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => e.target.files?.[0] && handleDocUpload(docType, e.target.files[0])}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                />
                                <button
                                  type="button"
                                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1 pointer-events-none"
                                >
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>Choose File</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Installation Photos & Quality Checks */}
            {activeTab === 'installation' && (
              <div className="space-y-6 text-xs font-semibold">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Quality Assurance Installation Photos</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Capture coordinates and watermarked metadata stamped visibly on image uploads.</p>
                </div>

                {/* Capture photo input form */}
                {['admin', 'field_employee'].includes(currentRole) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 max-w-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-500 mb-1">Target Photo Category</label>
                        <select
                          value={installPhotoType}
                          onChange={(e) => setInstallPhotoType(e.target.value as any)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white cursor-pointer"
                        >
                          <option value="earthing">Earthing System</option>
                          <option value="meter">Bi-directional Meter</option>
                          <option value="grouting">Structure Grouting</option>
                          <option value="other">Other Components</option>
                        </select>
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="relative overflow-hidden w-full">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            disabled={isCapturingInstall}
                            onChange={handleCaptureInstallPhoto}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 pointer-events-none"
                          >
                            <Camera className="w-4 h-4" />
                            <span>{isCapturingInstall ? 'Processing & Geotagging...' : 'Capture Photo'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {isLocatingInstall && (
                      <p className="text-[10px] text-emerald-600 font-bold animate-pulse">🛰️ Acquiring precision GPS satellite location coordinates...</p>
                    )}
                  </div>
                )}

                {/* Uploaded Gallery Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {installPhotos.map((photo) => {
                    const objectUrl = URL.createObjectURL(photo.photoBlob);
                    return (
                      <div key={photo.id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-3 shadow-xs">
                        <div className="flex justify-between items-start">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                            {photo.photoType}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Delete this installation photo?')) {
                                await orderService.deleteInstallationPhoto(photo.id);
                                handleSelectLead(selectedLead);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <a href={objectUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-100 bg-slate-50 aspect-video">
                          <img src={objectUrl} alt="Inspection tag" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </a>

                        <div>
                          <LeafletMap latitude={photo.location.latitude} longitude={photo.location.longitude} placeName={photo.location.placeName} />
                        </div>
                      </div>
                    );
                  })}

                  {installPhotos.length === 0 && (
                    <p className="col-span-full text-slate-400 font-medium italic py-6 text-center">No quality assurance photographs captured yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Documentation containing DCR & WCR Certificate generator */}
            {activeTab === 'documentation' && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 print:hidden">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Client Documentation Portal</h3>
                    <p className="text-[11px] text-slate-450 font-semibold mt-0.5">Manage and print Domestic Content Requirement (DCR) and Work Completion Reports (WCR) for this lead.</p>
                  </div>
                  
                  {/* Nested Tab Selection Buttons */}
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start select-none gap-1">
                    <button
                      onClick={() => setDocSubTab('dcr')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        docSubTab === 'dcr' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      DCR Certificate
                    </button>
                    <button
                      onClick={() => setDocSubTab('wcr')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        docSubTab === 'wcr' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      WCR Report
                    </button>
                    <button
                      onClick={() => setDocSubTab('model_agreement')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        docSubTab === 'model_agreement' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      Model Agreement
                    </button>
                    <button
                      onClick={() => setDocSubTab('annexure_proforma')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        docSubTab === 'annexure_proforma' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      Annexure Proforma
                    </button>
                  </div>
                </div>

                {/* Render Selected Document inside a styled viewport container */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  {docSubTab === 'dcr' ? (
                    <DcrDocument defaultLeadId={selectedLead?.id} isEmbedded={true} />
                  ) : docSubTab === 'wcr' ? (
                    <WcrDocument defaultLeadId={selectedLead?.id} isEmbedded={true} />
                  ) : docSubTab === 'model_agreement' ? (
                    <ModelAgreementDocument defaultLeadId={selectedLead?.id} isEmbedded={true} />
                  ) : (
                    <AnnexureProformaDocument defaultLeadId={selectedLead?.id} isEmbedded={true} />
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Registration Checklist & Release (Admin/Super Admin only) */}
            {activeTab === 'registration' && currentRole !== 'field_employee' && (
              <div className="space-y-6 text-xs font-semibold max-w-2xl">
                {/* checklist card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-200/60 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Office Checklist & Approvals</h3>
                  </div>

                  {regChecklist ? (
                    <div className="space-y-4">
                      {/* Checkboxes */}
                      <div className="space-y-3">
                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={regChecklist.registrationDone}
                            onChange={(e) => handleChecklistToggle('registrationDone', e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">1. DISCOM Registration Done</span>
                        </label>

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={regChecklist.fileMade}
                            onChange={(e) => handleChecklistToggle('fileMade', e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">2. Customer Physical File Compiled</span>
                        </label>

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={regChecklist.bankFileUploaded}
                            onChange={(e) => handleChecklistToggle('bankFileUploaded', e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">3. Bank File Uploaded Checklist</span>
                        </label>
                      </div>

                      {/* Bank file uploader field if bank file checked */}
                      {regChecklist.bankFileUploaded && (
                        <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-2">
                          <label className="block text-[10px] text-slate-500 uppercase font-bold">Bank File / Loan Document Upload</label>
                          <div className="flex items-center justify-between gap-4">
                            {regChecklist.bankDocumentBlob ? (
                              <>
                                <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                                  <CheckSquare className="w-3.5 h-3.5" /> File Saved
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = URL.createObjectURL(regChecklist.bankDocumentBlob!);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Bank_File_${selectedLead.name.replace(/\s+/g, '_')}`;
                                    a.click();
                                  }}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                                >
                                  Download File
                                </button>
                              </>
                            ) : (
                              <input
                                type="file"
                                onChange={(e) => e.target.files?.[0] && handleBankFileUpload(e.target.files[0])}
                                className="text-[10px] font-semibold text-slate-500 cursor-pointer"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Loan status dropdown */}
                      <div className="space-y-1">
                        <label className="block text-slate-500">Loan Approval Status</label>
                        <select
                          value={regChecklist.loanStatus}
                          onChange={(e) => handleChecklistToggle('loanStatus', e.target.value)}
                          className="w-full sm:w-64 border border-slate-200 rounded-xl p-2.5 bg-white cursor-pointer"
                        >
                          <option value="pending">Pending Review</option>
                          <option value="approved">Approved & Disbursed</option>
                          <option value="rejected">Rejected / Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 font-medium italic">Please confirm the client order booking to initialize office registrations.</p>
                  )}
                </div>

                {/* Release Dept documents */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-200/60 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Release Department (Final Phase)</h3>
                    <p className="text-[10px] text-slate-400">Upload physical completion handover sheets/NOC. This closes the lead in CRM.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-500 mb-1">Release Comments / Inspector Notes</label>
                      <input
                        type="text"
                        value={releaseNotes}
                        onChange={(e) => setReleaseNotes(e.target.value)}
                        placeholder="e.g. Net metering tests passed, system is live."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Handover Document Upload</label>
                      <input
                        type="file"
                        onChange={(e) => e.target.files?.[0] && handleReleaseUpload(e.target.files[0])}
                        className="text-[10px] font-semibold text-slate-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Leads List View */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lead Management</h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitor leads, assign staff, and track progress.</p>
            </div>
            {['admin', 'field_employee'].includes(currentRole) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New Lead</span>
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-bold">
            <div className="sm:col-span-2 flex items-center space-x-3 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search leads by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent focus:outline-none w-full text-slate-800 font-medium"
              />
            </div>

            <div className="space-y-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none cursor-pointer text-slate-700"
              >
                <option value="">All Stages</option>
                <option value="new">New Lead</option>
                <option value="quotation_sent">Quotation Sent</option>
                <option value="confirmed">Confirmed</option>
                <option value="registered">Registered</option>
                <option value="installed">Installed</option>
                <option value="closed">Closed</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {currentRole !== 'field_employee' && (
              <div className="space-y-1">
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none cursor-pointer text-slate-700"
                >
                  <option value="">All Assigned Staff</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Leads Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleSelectLead(lead)}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer relative flex flex-col justify-between min-h-48 group"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{lead.name}</h3>
                    {getStatusBadge(lead.status)}
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">📞 +91 {lead.phoneNumber}</p>

                  <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                    {lead.requirement}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{lead.description}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>Rep: {employeeNames[lead.assignedEmployeeId || ''] || 'Unassigned / Cold'}</span>
                  <span>{dayjs(lead.createdAt).format('DD MMM YYYY')}</span>
                </div>
              </div>
            ))}

            {filteredLeads.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 text-center py-12 rounded-2xl">
                <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold">No leads found matching details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Lead Modal popup */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 m-4 animate-scale-in">
            <h3 className="text-lg font-black text-slate-900 mb-4">Create Lead Entry</h3>
            <form onSubmit={handleCreateLead} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1">Lead Name</label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="e.g. Ramesh Chenoy"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="e.g. 9123456780"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Primary Requirement</label>
                <input
                  type="text"
                  required
                  value={leadRequirement}
                  onChange={(e) => setLeadRequirement(e.target.value)}
                  placeholder="e.g. 5kW On-Grid System"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Additional Project Details</label>
                <textarea
                  rows={2}
                  value={leadDescription}
                  onChange={(e) => setLeadDescription(e.target.value)}
                  placeholder="e.g. Shading from neighboring trees, concrete slab terrace structure..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Assign to Representative (Optional)</label>
                <select
                  value={leadAssignedEmployeeId}
                  onChange={(e) => setLeadAssignedEmployeeId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none cursor-pointer text-slate-700 font-bold"
                >
                  <option value="">-- Leave Unassigned (Cold Lead) --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl p-6 m-4 animate-scale-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-900">{previewDoc.name} PREVIEW</h3>
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewDoc.url);
                  setPreviewDoc(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50 rounded-xl p-4 flex justify-center items-center min-h-[400px]">
              {previewDoc.type.startsWith('image/') ? (
                <img
                  src={previewDoc.url}
                  alt="Document Preview"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  title="Document PDF Preview"
                  className="w-full h-[60vh] rounded-lg border border-slate-200 bg-white"
                />
              )}
            </div>
            
            <div className="flex justify-end pt-4 mt-2">
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewDoc.url);
                  setPreviewDoc(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PDF Quotation Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in select-none">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="font-extrabold text-sm tracking-tight">Quotation Preview — {previewPdfTitle}</span>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <span>Open Full Tab ↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={previewPdfUrl}
                title="Quotation PDF Document"
                className="w-full h-full rounded-xl border border-slate-200 shadow-inner bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Isolated Sub-component to prevent parent rerender lists
const LeadQuotationsTimeline: React.FC<{
  leadId: string;
  onShare: (q: Quotation) => void;
  onViewPdf: (q: Quotation) => void;
}> = ({ leadId, onShare, onViewPdf }) => {
  const [quotes, setQuotes] = useState<Quotation[]>([]);

  useEffect(() => {
    quotationService.getQuotationsByLeadId(leadId).then(setQuotes);
  }, [leadId]);

  return (
    <div className="space-y-3">
      {quotes.map((q) => (
        <div key={q.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{q.quotationNumber}</span>
              <span className="text-[9px] text-slate-400">{dayjs(q.createdAt).format('DD MMM YYYY')}</span>
            </div>
            <p className="text-slate-600 font-medium">Grand Total: <span className="font-bold">₹{q.grandTotal.toLocaleString('en-IN')}</span></p>
            {q.sentViaWhatsapp && q.whatsappSentAt && (
              <p className="text-[9px] text-emerald-600 font-semibold">✓ Shared via WhatsApp on {dayjs(q.whatsappSentAt).format('DD MMM, hh:mm A')}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {q.pdfBlob && (
              <>
                <button
                  type="button"
                  onClick={() => onViewPdf(q)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = URL.createObjectURL(q.pdfBlob!);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Quotation_${q.quotationNumber}.pdf`;
                    a.click();
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onShare(q)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>Share (WhatsApp)</span>
            </button>
          </div>
        </div>
      ))}

      {quotes.length === 0 && (
        <p className="text-slate-400 font-medium italic">No proposals generated yet.</p>
      )}
    </div>
  );
};

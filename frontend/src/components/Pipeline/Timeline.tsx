import React, { useEffect, useState } from 'react';
import type { Lead, Quotation, OrderConfirmation, ClientDocument, ClientRegistration, InstallationPhoto, ReleaseDocument, FieldVisitReport } from '../../types';
import { quotationService } from '../../services/quotationService';
import { orderService } from '../../services/orderService';
import { visitService } from '../../services/visitService';
import { employeeService } from '../../services/employeeService';
import dayjs from 'dayjs';
import { LeafletMap } from '../Map/LeafletMap';

interface TimelineProps {
  lead: Lead;
}

export const Timeline: React.FC<TimelineProps> = ({ lead }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [registration, setRegistration] = useState<ClientRegistration | null>(null);
  const [photos, setPhotos] = useState<InstallationPhoto[]>([]);
  const [release, setRelease] = useState<ReleaseDocument[]>([]);
  const [visits, setVisits] = useState<FieldVisitReport[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const loadData = async () => {
    const qList = await quotationService.getQuotationsByLeadId(lead.id);
    setQuotations(qList);

    const conf = await orderService.getOrderConfirmationByLeadId(lead.id);
    setConfirmation(conf || null);

    const docs = await orderService.getClientDocumentsByLeadId(lead.id);
    setDocuments(docs);

    const reg = await orderService.getClientRegistrationByLeadId(lead.id);
    setRegistration(reg || null);

    const photoList = await orderService.getInstallationPhotosByLeadId(lead.id);
    setPhotos(photoList);

    const relList = await orderService.getReleaseDocumentsByLeadId(lead.id);
    setRelease(relList);

    const visitList = await visitService.getVisitReportsByLead(lead.id);
    setVisits(visitList);

    // Load profiles names for mapping
    const users = await employeeService.getAllProfiles();
    const userMap: Record<string, string> = {};
    users.forEach(u => {
      userMap[u.id] = u.fullName;
    });
    setProfiles(userMap);
  };

  useEffect(() => {
    loadData();
    // Set up polling or listen to database events if required, but simple load works on mount/change
  }, [lead.id]);

  const formatDate = (isoStr: string) => {
    return dayjs(isoStr).format('DD MMM YYYY, hh:mm A [IST]');
  };

  // Helper to convert blob to object URL for image tags
  const renderBlobImage = (blob: Blob) => {
    try {
      return URL.createObjectURL(blob);
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="relative pl-6 border-l-2 border-slate-200 ml-4 space-y-8 py-2">
      {/* 1. Lead Entry */}
      <div className="relative">
        <div className="absolute -left-[31px] top-1 bg-emerald-500 text-white rounded-full p-1.5 shadow-sm border border-white">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 mb-2">
            Lead Generated
          </span>
          <h4 className="text-sm font-bold text-slate-800">{lead.requirement}</h4>
          <p className="text-xs text-slate-500 mt-1">{lead.description}</p>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
            <span>By: {profiles[lead.createdBy] || lead.createdBy}</span>
            <span>{formatDate(lead.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 2. Site Visit Logs */}
      {visits.map((visit) => (
        <div key={visit.id} className="relative">
          <div className="absolute -left-[31px] top-1 bg-sky-500 text-white rounded-full p-1.5 shadow-sm border border-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 mb-2">
              Site Visit Logged
            </span>
            <h4 className="text-sm font-bold text-slate-800">Met: {visit.personMetName} ({visit.personMetContact})</h4>
            <p className="text-xs text-slate-500 mt-1">{visit.description}</p>

            {/* Visit photos if any */}
            {visit.photoBlobs && visit.photoBlobs.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {visit.photoBlobs.map((blob, idx) => (
                  <a key={idx} href={renderBlobImage(blob)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200">
                    <img
                      src={renderBlobImage(blob)}
                      alt="Visit report thumbnail"
                      className="w-full h-16 object-cover hover:scale-110 transition-transform"
                    />
                  </a>
                ))}
              </div>
            )}

            {/* Map preview */}
            <div className="mt-3">
              <LeafletMap latitude={visit.location.latitude} longitude={visit.location.longitude} placeName={visit.location.placeName} />
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              <span>By: {profiles[visit.employeeId] || visit.employeeId}</span>
              <span>{formatDate(visit.visitedAt)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* 3. Quotation Stage */}
      {quotations.map((q) => (
        <div key={q.id} className="relative">
          <div className="absolute -left-[31px] top-1 bg-amber-500 text-white rounded-full p-1.5 shadow-sm border border-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 mb-2">
                Quotation Sent ({q.quotationNumber})
              </span>
              {q.sentViaWhatsapp && (
                <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded gap-0.5">
                  <svg className="w-3 h-3 fill-emerald-600" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.37 5.378 0 12.022 0a12.025 12.025 0 0 1 8.499 3.522 11.975 11.975 0 0 1 3.525 8.514c-.003 6.649-5.379 12.022-12.021 12.022-1.996-.001-3.957-.496-5.717-1.442L0 24zm6.59-4.846c1.6.95 3.1 1.448 4.7 1.449 5.568 0 10.1-4.531 10.103-10.1.002-2.7-1.052-5.239-2.962-7.15A10.02 10.02 0 0 0 12.022 1.9c-5.57 0-10.105 4.532-10.108 10.1-.001 1.74.459 3.42 1.33 4.9L2.2 21.8l5.127-1.346c1.65.9 3.4 1.34 5.32 1.34z" /></svg>
                  WhatsApp
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-slate-800">Grand Total: ₹{q.grandTotal.toLocaleString('en-IN')}</h4>
            <div className="mt-2 text-xs text-slate-600">
              <span className="font-semibold">Items:</span>
              <ul className="list-disc pl-4 space-y-0.5 mt-1">
                {q.items.map((item, idx) => (
                  <li key={idx}>{item.itemName} (x{item.qty})</li>
                ))}
              </ul>
            </div>

            {q.pdfBlob && (
              <button
                type="button"
                onClick={() => {
                  const url = URL.createObjectURL(q.pdfBlob!);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Quotation_${q.quotationNumber}.pdf`;
                  a.click();
                }}
                className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                📥 Download Quotation PDF
              </button>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              <span>By: {profiles[q.createdBy] || q.createdBy}</span>
              <span>{formatDate(q.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* 4. Order Confirmation Stage */}
      {confirmation && (
        <div className="relative">
          <div className="absolute -left-[31px] top-1 bg-violet-600 text-white rounded-full p-1.5 shadow-sm border border-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 mb-2">
              Order Confirmed & Booked
            </span>
            <h4 className="text-sm font-bold text-slate-800">Advance Collected: ₹{confirmation.advanceAmount.toLocaleString('en-IN')}</h4>
            <p className="text-xs text-slate-600 mt-1">Payment Mode: <span className="font-semibold uppercase">{confirmation.paymentMode.replace('_', ' ')}</span></p>
            {confirmation.paymentReference && (
              <p className="text-xs text-slate-600">Reference No: <span className="font-semibold font-mono">{confirmation.paymentReference}</span></p>
            )}

            {confirmation.clientSignatureBlob && (
              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Signed Signature:</span>
                <img
                  src={renderBlobImage(confirmation.clientSignatureBlob)}
                  alt="Client Signature preview"
                  className="h-12 border border-slate-200 rounded p-1 bg-slate-50"
                />
              </div>
            )}

            {confirmation.confirmationPdfBlob && (
              <button
                type="button"
                onClick={() => {
                  const url = URL.createObjectURL(confirmation.confirmationPdfBlob!);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Order_Confirmation_${lead.name.replace(/\s+/g, '_')}.pdf`;
                  a.click();
                }}
                className="mt-3 text-xs text-violet-600 hover:text-violet-700 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                📥 Download Confirmation Receipt
              </button>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              <span>Confirmed By: {profiles[confirmation.createdBy] || confirmation.createdBy}</span>
              <span>{formatDate(confirmation.createdAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Client Registration & Checklist */}
      {registration && (
        <div className="relative">
          <div className="absolute -left-[31px] top-1 bg-indigo-500 text-white rounded-full p-1.5 shadow-sm border border-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 mb-2">
              Client Registration Pipeline
            </span>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 mt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${registration.registrationDone ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                <span className={registration.registrationDone ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Registration Done</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${registration.fileMade ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                <span className={registration.fileMade ? 'text-slate-700 font-semibold' : 'text-slate-400'}>File Made</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${registration.bankFileUploaded ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                <span className={registration.bankFileUploaded ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Bank File Uploaded</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  registration.loanStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  registration.loanStatus === 'rejected' ? 'bg-rose-100 text-rose-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  Loan: {registration.loanStatus.toUpperCase()}
                </span>
              </div>
            </div>

            {registration.bankDocumentBlob && (
              <button
                type="button"
                onClick={() => {
                  const url = URL.createObjectURL(registration.bankDocumentBlob!);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Bank_Document_${lead.name.replace(/\s+/g, '_')}`;
                  a.click();
                }}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                📥 Download Bank File Document
              </button>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              <span>Updated At:</span>
              <span>{formatDate(registration.updatedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Uploaded Documents */}
      {documents.length > 0 && (
        <div className="relative">
          <div className="absolute -left-[31px] top-1 bg-slate-600 text-white rounded-full p-1.5 shadow-sm border border-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 mb-2">
              KYC & Utility Documents Uploaded ({documents.length})
            </span>
            <div className="space-y-2 mt-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="font-semibold text-slate-700 uppercase">{doc.docType.replace('_', ' ')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = URL.createObjectURL(doc.fileBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${doc.docType}_${lead.name.replace(/\s+/g, '_')}`;
                      a.click();
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Installation Photos Stage */}
      {photos.length > 0 && (
        <div className="relative">
          <div className="absolute -left-[31px] top-1 bg-emerald-600 text-white rounded-full p-1.5 shadow-sm border border-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 mb-2">
              Installation Quality Assurance
            </span>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {photos.map((ph) => (
                <div key={ph.id} className="border border-slate-200 rounded-lg p-2 bg-slate-50 relative group">
                  <span className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                    {ph.photoType}
                  </span>
                  <a href={renderBlobImage(ph.photoBlob)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-slate-200 aspect-video">
                    <img
                      src={renderBlobImage(ph.photoBlob)}
                      alt={`${ph.photoType} photo`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                    />
                  </a>
                  <div className="mt-2">
                    <LeafletMap latitude={ph.location.latitude} longitude={ph.location.longitude} placeName={ph.location.placeName} />
                  </div>
                  <div className="mt-1.5 flex justify-between items-center text-[9px] text-slate-400">
                    <span>Uploaded: {profiles[ph.uploadedBy] || ph.uploadedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Release Department Stage */}
      {release.map((rel) => (
        <div key={rel.id} className="relative">
          <div className="absolute -left-[31px] top-1 bg-red-500 text-white rounded-full p-1.5 shadow-sm border border-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mb-2">
              Release Document Received
            </span>
            {rel.notes && (
              <p className="text-xs text-slate-600 mt-1 italic">"{rel.notes}"</p>
            )}

            <button
              type="button"
              onClick={() => {
                const url = URL.createObjectURL(rel.fileBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Release_Doc_${lead.name.replace(/\s+/g, '_')}`;
                a.click();
              }}
              className="mt-3 text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              📥 Download Release Document
            </button>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              <span>Uploaded By: {profiles[rel.uploadedBy] || rel.uploadedBy}</span>
              <span>{formatDate(rel.uploadedAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

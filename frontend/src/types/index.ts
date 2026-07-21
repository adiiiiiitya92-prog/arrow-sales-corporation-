export interface Profile {
  id: string;
  fullName: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'field_employee';
  email?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  joiningDate?: string;
  designation?: string;
  createdBy?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  requirement: string;
  description: string;
  assignedEmployeeId?: string;
  createdBy: string;
  status: 'new' | 'quotation_sent' | 'confirmed' | 'registered' | 'installed' | 'closed' | 'lost';
  clientRating?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  itemName: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Quotation {
  id: string;
  leadId: string;
  quotationNumber: string;
  items: QuotationItem[];
  subtotal: number;
  grandTotal: number;
  followUpDate: string;
  pdfBlob?: Blob; // stored in IndexedDB
  createdBy: string;
  createdAt: string;
  sentViaWhatsapp: boolean;
  whatsappSentAt?: string;
}

export interface OrderConfirmation {
  id: string;
  leadId: string;
  quotationId: string;
  itemsConfirmed: QuotationItem[];
  subtotal: number;
  advanceAmount: number;
  paymentMode: 'transaction_id' | 'utr' | 'cheque' | 'cash';
  paymentReference?: string;
  clientSignatureBlob: Blob | string; // PNG or Firebase Storage URL
  confirmationPdfBlob?: Blob | string;
  createdBy: string;
  createdAt: string;
}

export interface ClientDocument {
  id: string;
  leadId: string;
  docType: 'pan_card' | 'aadhar_card' | 'electricity_bill' | 'tax_paper' | 'account_details';
  fileBlob: Blob | string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ClientRegistration {
  leadId: string;
  registrationDone: boolean;
  fileMade: boolean;
  bankFileUploaded: boolean;
  bankDocumentBlob?: Blob | string;
  loanStatus: 'pending' | 'approved' | 'rejected';
  updatedAt: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  placeName: string;
  capturedAt: string; // ISO string, display formatted as 12hr IST
}

export interface InstallationPhoto {
  id: string;
  leadId: string;
  photoType: 'earthing' | 'meter' | 'grouting' | 'other';
  photoBlob: Blob | string;
  location: GeoLocation;
  uploadedBy: string;
}

export interface ReleaseDocument {
  id: string;
  leadId: string;
  fileBlob: Blob | string; // image or PDF or URL
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface FieldVisitReport {
  id: string;
  employeeId: string;
  leadId?: string; // optional — visit may not tie to an existing lead
  personMetName: string;
  personMetContact: string;
  description: string;
  location: GeoLocation;
  photoBlobs: (Blob | string)[];
  visitedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'solar_panel' | 'inverter' | 'battery' | 'structure' | 'other';
  rate: number;
  description?: string;
  stockQuantity: number;
  minStockThreshold: number;
  createdAt: string;
}

export interface ChallanItem {
  productId: string;
  productName: string;
  qty: number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  leadId: string;
  leadName: string;
  assignedEmployeeId: string;
  employeeName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  items: ChallanItem[];
  notes?: string;
  createdAt: string;
}

export interface ShadowAnalysisRecord {
  id: string;
  projectName: string;
  leadId?: string;
  leadName?: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  roofAreaSqMeters: number;
  systemSizeKw: number;
  usablePanels: number;
  shadingLossPercentage: number;
  panelSpec: any;
  layoutConfig: any;
  polygonPath: { lat: number; lng: number }[];
  obstructions: any[];
  createdBy: string;
  createdAt: string;
}

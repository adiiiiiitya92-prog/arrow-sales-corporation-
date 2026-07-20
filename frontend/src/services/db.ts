import Dexie, { type Table } from 'dexie';
import type {
  Profile,
  Lead,
  Quotation,
  OrderConfirmation,
  ClientDocument,
  ClientRegistration,
  InstallationPhoto,
  ReleaseDocument,
  FieldVisitReport,
  Product,
  Challan
} from '../types';

export class SolarCRMDatabase extends Dexie {
  profiles!: Table<Profile>;
  leads!: Table<Lead>;
  quotations!: Table<Quotation>;
  orderConfirmations!: Table<OrderConfirmation>;
  clientDocuments!: Table<ClientDocument>;
  clientRegistrations!: Table<ClientRegistration>;
  installationPhotos!: Table<InstallationPhoto>;
  releaseDocuments!: Table<ReleaseDocument>;
  fieldVisitReports!: Table<FieldVisitReport>;
  products!: Table<Product>;
  challans!: Table<Challan>;

  constructor() {
    super('SolarCRMDatabase');
    this.version(2).stores({
      profiles: 'id, role, isActive',
      leads: 'id, assignedEmployeeId, status, createdAt',
      quotations: 'id, leadId, quotationNumber, createdAt',
      orderConfirmations: 'id, leadId, quotationId',
      clientDocuments: 'id, leadId, docType',
      clientRegistrations: 'leadId',
      installationPhotos: 'id, leadId, photoType',
      releaseDocuments: 'id, leadId',
      fieldVisitReports: 'id, employeeId, leadId, visitedAt',
      products: 'id, name, category',
      challans: 'id, leadId, assignedEmployeeId, challanNumber, createdAt'
    });
  }
}

export const db = new SolarCRMDatabase();

// Create a dummy transparent 1x1 PNG Blob for initial seed images if needed
const getDummyBlob = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 1, 1);
  }
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
};

export async function seedDemoData(force = false) {
  const profileCount = await db.profiles.count();
  let shouldSeed = profileCount === 0 || force;
  
  if (!shouldSeed && profileCount > 0) {
    const sample = await db.profiles.toCollection().first();
    if (sample && !sample.email) {
      shouldSeed = true;
      force = true;
    }
  }

  if (profileCount > 0 && !shouldSeed) {
    return; // Already seeded
  }

  if (force) {
    await db.transaction('rw', [
      db.profiles,
      db.leads,
      db.quotations,
      db.orderConfirmations,
      db.clientDocuments,
      db.clientRegistrations,
      db.installationPhotos,
      db.releaseDocuments,
      db.fieldVisitReports,
      db.products
    ], async () => {
      await db.profiles.clear();
      await db.leads.clear();
      await db.quotations.clear();
      await db.orderConfirmations.clear();
      await db.clientDocuments.clear();
      await db.clientRegistrations.clear();
      await db.installationPhotos.clear();
      await db.releaseDocuments.clear();
      await db.fieldVisitReports.clear();
      await db.products.clear();
    });
  }

  const dummyBlob = await getDummyBlob();

  // 1. Seed Profiles (Employees & Admins)
  const mockProfiles: Profile[] = [
    { id: 'sa1', fullName: 'Vikram Aditya (Super)', phone: '9876543210', role: 'super_admin', email: 'vikram.aditya@solar.com', aadhaarNumber: '123456789012', panNumber: 'ABCDE1234F', joiningDate: '2026-01-01', designation: 'Managing Director', isActive: true, createdAt: new Date('2026-01-01').toISOString() },
    { id: 'a1', fullName: 'Neha Sharma (Admin)', phone: '9876543211', role: 'admin', email: 'neha.sharma@solar.com', aadhaarNumber: '123456789013', panNumber: 'ABCDE1234G', joiningDate: '2026-01-02', designation: 'HR Administrator', isActive: true, createdAt: new Date('2026-01-02').toISOString() },
    { id: 'emp1', fullName: 'Amit Patel', phone: '9876543220', role: 'field_employee', email: 'amit.patel@solar.com', aadhaarNumber: '123456789014', panNumber: 'ABCDE1234H', joiningDate: '2026-01-05', designation: 'Sales Executive', isActive: true, createdAt: new Date('2026-01-05').toISOString() },
    { id: 'emp2', fullName: 'Rajesh Kumar', phone: '9876543221', role: 'field_employee', email: 'rajesh.kumar@solar.com', aadhaarNumber: '123456789015', panNumber: 'ABCDE1234I', joiningDate: '2026-01-05', designation: 'Site Inspector', isActive: true, createdAt: new Date('2026-01-05').toISOString() },
    { id: 'emp3', fullName: 'Priya Nair', phone: '9876543222', role: 'field_employee', email: 'priya.nair@solar.com', aadhaarNumber: '123456789016', panNumber: 'ABCDE1234J', joiningDate: '2026-01-06', designation: 'Senior Accountant', isActive: true, createdAt: new Date('2026-01-06').toISOString() },
    { id: 'emp4', fullName: 'Sanjay Dutt', phone: '9876543223', role: 'field_employee', email: 'sanjay.dutt@solar.com', aadhaarNumber: '123456789017', panNumber: 'ABCDE1234K', joiningDate: '2026-01-06', designation: 'Survey Coordinator', isActive: true, createdAt: new Date('2026-01-06').toISOString() },
    { id: 'emp5', fullName: 'Sneha Patil', phone: '9876543224', role: 'field_employee', email: 'sneha.patil@solar.com', aadhaarNumber: '123456789018', panNumber: 'ABCDE1234L', joiningDate: '2026-01-07', designation: 'Project Manager', isActive: true, createdAt: new Date('2026-01-07').toISOString() },
    { id: 'emp6', fullName: 'Rohan Mehta', phone: '9876543225', role: 'field_employee', email: 'rohan.mehta@solar.com', aadhaarNumber: '123456789019', panNumber: 'ABCDE1234M', joiningDate: '2026-01-07', designation: 'Billing Associate', isActive: true, createdAt: new Date('2026-01-07').toISOString() },
    { id: 'emp7', fullName: 'Deepak Verma', phone: '9876543226', role: 'field_employee', email: 'deepak.verma@solar.com', aadhaarNumber: '123456789020', panNumber: 'ABCDE1234N', joiningDate: '2026-01-08', designation: 'Installation Lead', isActive: true, createdAt: new Date('2026-01-08').toISOString() },
    { id: 'emp8', fullName: 'Kriti Singh', phone: '9876543227', role: 'field_employee', email: 'kriti.singh@solar.com', aadhaarNumber: '123456789021', panNumber: 'ABCDE1234O', joiningDate: '2026-01-08', designation: 'Field Engineer', isActive: true, createdAt: new Date('2026-01-08').toISOString() },
    { id: 'emp9', fullName: 'Anil Deshmukh', phone: '9876543228', role: 'field_employee', email: 'anil.deshmukh@solar.com', aadhaarNumber: '123456789022', panNumber: 'ABCDE1234P', joiningDate: '2026-01-09', designation: 'Procurement Specialist', isActive: true, createdAt: new Date('2026-01-09').toISOString() },
    { id: 'emp10', fullName: 'Pooja Hegde', phone: '9876543229', role: 'field_employee', email: 'pooja.hegde@solar.com', aadhaarNumber: '123456789023', panNumber: 'ABCDE1234Q', joiningDate: '2026-01-10', designation: 'Support Desk Coordinator', isActive: true, createdAt: new Date('2026-01-10').toISOString() }
  ];

  await db.profiles.bulkAdd(mockProfiles);

  // 2. Seed Leads
  const mockLeads: Lead[] = [
    {
      id: 'lead1',
      name: 'Ramesh Chenoy',
      phoneNumber: '9123456780',
      email: 'ramesh.chenoy@example.com',
      requirement: '5kW On-Grid System',
      description: 'Needs net metering, roof is concrete, south facing.',
      assignedEmployeeId: 'emp1',
      createdBy: 'a1',
      status: 'installed',
      clientRating: 5,
      createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-06-20T16:00:00Z').toISOString()
    },
    {
      id: 'lead2',
      name: 'Anita Desai',
      phoneNumber: '9123456781',
      email: 'anita.desai@example.com',
      requirement: '3kW Off-Grid System',
      description: 'Rural location, needs power backup for 6 hours daily.',
      assignedEmployeeId: 'emp1',
      createdBy: 'a1',
      status: 'confirmed',
      clientRating: 4,
      createdAt: new Date('2026-06-05T11:30:00Z').toISOString(),
      updatedAt: new Date('2026-06-18T14:20:00Z').toISOString()
    },
    {
      id: 'lead3',
      name: 'Gopal Krishnan',
      phoneNumber: '9123456782',
      email: 'gopal.k@example.com',
      requirement: '10kW Hybrid System',
      description: 'Commercial shop, high load requirement during daytime.',
      assignedEmployeeId: 'emp2',
      createdBy: 'a1',
      status: 'quotation_sent',
      clientRating: 3,
      createdAt: new Date('2026-06-10T09:15:00Z').toISOString(),
      updatedAt: new Date('2026-06-12T10:00:00Z').toISOString()
    },
    {
      id: 'lead4',
      name: 'Sunita Rao',
      phoneNumber: '9123456783',
      email: 'sunita.rao@example.com',
      requirement: '8kW On-Grid System',
      description: 'Residential villa, tin roof structure.',
      assignedEmployeeId: 'emp3',
      createdBy: 'a1',
      status: 'new',
      createdAt: new Date('2026-07-01T14:00:00Z').toISOString(),
      updatedAt: new Date('2026-07-01T14:00:00Z').toISOString()
    },
    {
      id: 'lead5',
      name: 'Ketan Mehta',
      phoneNumber: '9123456784',
      email: 'ketan.mehta@example.com',
      requirement: '5kW On-Grid System',
      description: 'Looking for prompt execution, terrace available.',
      assignedEmployeeId: 'emp2',
      createdBy: 'emp2',
      status: 'lost',
      createdAt: new Date('2026-05-15T12:00:00Z').toISOString(),
      updatedAt: new Date('2026-05-25T17:00:00Z').toISOString()
    }
  ];

  await db.leads.bulkAdd(mockLeads);

  // 3. Seed Quotations
  const mockQuotations: Quotation[] = [
    {
      id: 'q1',
      leadId: 'lead1',
      quotationNumber: 'Q-2026-0001',
      items: [
        { itemName: 'Solar Panels 500W (Mono PERC)', qty: 10, rate: 12000, amount: 120000 },
        { itemName: '5kW Grid-Tie Inverter (Growatt)', qty: 1, rate: 45000, amount: 45000 },
        { itemName: 'Structure, ACDB/DCDB, Earthing & Cables', qty: 1, rate: 35000, amount: 35000 },
        { itemName: 'Installation & Net Metering Charges', qty: 1, rate: 15000, amount: 15000 }
      ],
      subtotal: 215000,
      grandTotal: 215000,
      followUpDate: '2026-06-10',
      createdBy: 'emp1',
      createdAt: new Date('2026-06-03T12:00:00Z').toISOString(),
      sentViaWhatsapp: true,
      whatsappSentAt: new Date('2026-06-03T12:05:00Z').toISOString()
    },
    {
      id: 'q2',
      leadId: 'lead2',
      quotationNumber: 'Q-2026-0002',
      items: [
        { itemName: 'Solar Panels 330W (Poly)', qty: 9, rate: 8000, amount: 72000 },
        { itemName: '3kW Off-Grid Inverter (Luminous)', qty: 1, rate: 28000, amount: 28000 },
        { itemName: 'Solar Battery 150Ah (Tubular)', qty: 4, rate: 14000, amount: 56000 },
        { itemName: 'Mounting Structure & DC Cabling', qty: 1, rate: 20000, amount: 20000 }
      ],
      subtotal: 176000,
      grandTotal: 176000,
      followUpDate: '2026-06-12',
      createdBy: 'emp1',
      createdAt: new Date('2026-06-07T15:00:00Z').toISOString(),
      sentViaWhatsapp: false
    },
    {
      id: 'q3',
      leadId: 'lead3',
      quotationNumber: 'Q-2026-0003',
      items: [
        { itemName: 'Solar Panels 540W (Bifacial)', qty: 18, rate: 15000, amount: 270000 },
        { itemName: '10kW Hybrid Inverter (Deye)', qty: 1, rate: 110000, amount: 110000 },
        { itemName: 'Structure & Accessories', qty: 1, rate: 50000, amount: 50000 }
      ],
      subtotal: 430000,
      grandTotal: 430000,
      followUpDate: '2026-06-25',
      createdBy: 'emp2',
      createdAt: new Date('2026-06-11T16:30:00Z').toISOString(),
      sentViaWhatsapp: true,
      whatsappSentAt: new Date('2026-06-11T16:35:00Z').toISOString()
    }
  ];

  await db.quotations.bulkAdd(mockQuotations);

  // 4. Seed Order Confirmations
  const mockConfirmations: OrderConfirmation[] = [
    {
      id: 'oc1',
      leadId: 'lead1',
      quotationId: 'q1',
      itemsConfirmed: [
        { itemName: 'Solar Panels 500W (Mono PERC)', qty: 10, rate: 12000, amount: 120000 },
        { itemName: '5kW Grid-Tie Inverter (Growatt)', qty: 1, rate: 45000, amount: 45000 },
        { itemName: 'Structure, ACDB/DCDB, Earthing & Cables', qty: 1, rate: 35000, amount: 35000 },
        { itemName: 'Installation & Net Metering Charges', qty: 1, rate: 15000, amount: 15000 }
      ],
      subtotal: 215000,
      advanceAmount: 50000,
      paymentMode: 'utr',
      paymentReference: 'UTR9876543210',
      clientSignatureBlob: dummyBlob,
      createdBy: 'emp1',
      createdAt: new Date('2026-06-08T11:00:00Z').toISOString()
    },
    {
      id: 'oc2',
      leadId: 'lead2',
      quotationId: 'q2',
      itemsConfirmed: [
        { itemName: 'Solar Panels 330W (Poly)', qty: 9, rate: 8000, amount: 72000 },
        { itemName: '3kW Off-Grid Inverter (Luminous)', qty: 1, rate: 28000, amount: 28000 },
        { itemName: 'Solar Battery 150Ah (Tubular)', qty: 4, rate: 14000, amount: 56000 },
        { itemName: 'Mounting Structure & DC Cabling', qty: 1, rate: 20000, amount: 20000 }
      ],
      subtotal: 176000,
      advanceAmount: 30000,
      paymentMode: 'transaction_id',
      paymentReference: 'TXN1234567890',
      clientSignatureBlob: dummyBlob,
      createdBy: 'emp1',
      createdAt: new Date('2026-06-15T10:00:00Z').toISOString()
    }
  ];

  await db.orderConfirmations.bulkAdd(mockConfirmations);

  // 5. Seed Client Registration Checklists
  const mockRegistration: ClientRegistration[] = [
    {
      leadId: 'lead1',
      registrationDone: true,
      fileMade: true,
      bankFileUploaded: true,
      loanStatus: 'approved',
      updatedAt: new Date('2026-06-12T14:00:00Z').toISOString()
    },
    {
      leadId: 'lead2',
      registrationDone: true,
      fileMade: true,
      bankFileUploaded: false,
      loanStatus: 'pending',
      updatedAt: new Date('2026-06-18T10:00:00Z').toISOString()
    }
  ];

  await db.clientRegistrations.bulkAdd(mockRegistration);

  // 6. Seed Installation Photos
  const mockPhotos: InstallationPhoto[] = [
    {
      id: 'photo1',
      leadId: 'lead1',
      photoType: 'earthing',
      photoBlob: dummyBlob,
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        placeName: 'Vidhana Soudha, Bengaluru, Karnataka, India',
        capturedAt: new Date('2026-06-19T09:30:00Z').toISOString()
      },
      uploadedBy: 'emp1'
    },
    {
      id: 'photo2',
      leadId: 'lead1',
      photoType: 'grouting',
      photoBlob: dummyBlob,
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        placeName: 'Vidhana Soudha, Bengaluru, Karnataka, India',
        capturedAt: new Date('2026-06-19T11:45:00Z').toISOString()
      },
      uploadedBy: 'emp1'
    }
  ];

  await db.installationPhotos.bulkAdd(mockPhotos);

  // 7. Seed Release Documents
  const mockReleases: ReleaseDocument[] = [
    {
      id: 'rel1',
      leadId: 'lead1',
      fileBlob: dummyBlob,
      uploadedBy: 'a1',
      uploadedAt: new Date('2026-06-20T16:00:00Z').toISOString(),
      notes: 'Net metering inspector signed off. Release complete.'
    }
  ];

  await db.releaseDocuments.bulkAdd(mockReleases);

  // 8. Seed Field Visit Reports
  const mockVisits: FieldVisitReport[] = [
    {
      id: 'visit1',
      employeeId: 'emp1',
      leadId: 'lead1',
      personMetName: 'Ramesh Chenoy',
      personMetContact: '9123456780',
      description: 'Initial site visit. Measured roof space (approx 600 sq ft). Roof has no shading issue. Discussed 5kW load.',
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        placeName: 'Vidhana Soudha, Bengaluru, Karnataka, India',
        capturedAt: new Date('2026-06-02T11:00:00Z').toISOString()
      },
      photoBlobs: [dummyBlob],
      visitedAt: new Date('2026-06-02T11:00:00Z').toISOString()
    },
    {
      id: 'visit2',
      employeeId: 'emp1',
      leadId: 'lead2',
      personMetName: 'Anita Desai',
      personMetContact: '9123456781',
      description: 'Discussed battery backup options. Customer requested tubular batteries. Location is a farmhouse.',
      location: {
        latitude: 13.0827,
        longitude: 80.2707,
        placeName: 'Central Chennai, Tamil Nadu, India',
        capturedAt: new Date('2026-06-06T14:30:00Z').toISOString()
      },
      photoBlobs: [dummyBlob],
      visitedAt: new Date('2026-06-06T14:30:00Z').toISOString()
    },
    {
      id: 'visit3',
      employeeId: 'emp2',
      personMetName: 'Harish Patel (Cold Lead)',
      personMetContact: '9888877777',
      description: 'Cold visit to an industrial park. Met the warehouse manager. They might need 50kW in Q4.',
      location: {
        latitude: 19.0760,
        longitude: 72.8777,
        placeName: 'Bandra Kurla Complex, Mumbai, Maharashtra, India',
        capturedAt: new Date('2026-06-25T16:00:00Z').toISOString()
      },
      photoBlobs: [],
      visitedAt: new Date('2026-06-25T16:00:00Z').toISOString()
    }
  ];

  await db.fieldVisitReports.bulkAdd(mockVisits);

  // Seed Products Catalog
  const mockProducts: Product[] = [
    { id: 'prod1', name: 'Mono PERC Solar Panel 540W', category: 'solar_panel', rate: 12000, description: 'High-efficiency mono solar panels with a 25-year warranty.', stockQuantity: 45, minStockThreshold: 10, createdAt: new Date().toISOString() },
    { id: 'prod2', name: 'Bifacial Solar Panel 550W', category: 'solar_panel', rate: 15000, description: 'Dual-sided power generation panels.', stockQuantity: 30, minStockThreshold: 10, createdAt: new Date().toISOString() },
    { id: 'prod3', name: 'Growatt 5kW Grid-Tie Inverter', category: 'inverter', rate: 45000, description: 'Single-phase on-grid solar inverter with Wi-Fi monitoring.', stockQuantity: 3, minStockThreshold: 5, createdAt: new Date().toISOString() },
    { id: 'prod4', name: 'Deye 10kW Hybrid Inverter', category: 'inverter', rate: 110000, description: 'Three-phase hybrid inverter supporting battery systems.', stockQuantity: 8, minStockThreshold: 3, createdAt: new Date().toISOString() },
    { id: 'prod5', name: 'Tubular Solar Battery 150Ah', category: 'battery', rate: 14000, description: 'Deep-cycle C10 rated lead-acid battery.', stockQuantity: 2, minStockThreshold: 6, createdAt: new Date().toISOString() },
    { id: 'prod6', name: 'Lithium-Ion Battery Pack 5kWh', category: 'battery', rate: 95000, description: '48V LiFePO4 wall-mounted smart battery.', stockQuantity: 12, minStockThreshold: 4, createdAt: new Date().toISOString() },
    { id: 'prod7', name: 'Galvanized Mounting Structure 3kW', category: 'structure', rate: 15000, description: 'Hot-dip galvanized structure for concrete roofs.', stockQuantity: 15, minStockThreshold: 5, createdAt: new Date().toISOString() },
    { id: 'prod8', name: 'Galvanized Mounting Structure 5kW', category: 'structure', rate: 25000, description: 'Elevated roof structure with wind resistance.', stockQuantity: 10, minStockThreshold: 4, createdAt: new Date().toISOString() },
    { id: 'prod9', name: 'ACDB & DCDB Distribution Box', category: 'other', rate: 10000, description: 'Includes surge protection and MCBs.', stockQuantity: 20, minStockThreshold: 8, createdAt: new Date().toISOString() },
    { id: 'prod10', name: 'Copper Earthing Kit & Cables', category: 'other', rate: 12000, description: 'Dual chemical earthing rods and 4sqmm solar cables.', stockQuantity: 4, minStockThreshold: 5, createdAt: new Date().toISOString() }
  ];

  await db.products.bulkAdd(mockProducts);
}

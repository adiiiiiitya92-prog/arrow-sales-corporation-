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
  Challan,
  ShadowAnalysisRecord
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
  shadowAnalyses!: Table<ShadowAnalysisRecord>;

  constructor() {
    super('SolarCRMDatabase');
    this.version(3).stores({
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
      challans: 'id, leadId, assignedEmployeeId, challanNumber, createdAt',
      shadowAnalyses: 'id, leadId, projectName, createdAt'
    });
  }
}

export const db = new SolarCRMDatabase();

/**
 * Clears all local mock data across all tables and seeds only clean initial role accounts.
 */
export async function seedDemoData(_force = true) {
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
    db.products,
    db.challans
  ], async () => {
    // Clear all tables
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
    await db.challans.clear();

    // Clean initial System Role Profiles (Super Admin, Admin, Field Employee)
    const initialProfiles: Profile[] = [
      {
        id: 'admin_super',
        fullName: 'System Administrator',
        phone: '9876543210',
        role: 'super_admin',
        email: 'admin@arrowsales.com',
        aadhaarNumber: '123456789012',
        panNumber: 'ABCDE1234F',
        joiningDate: new Date().toISOString().split('T')[0],
        designation: 'Managing Director',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'admin_ops',
        fullName: 'Operations Admin',
        phone: '9876543211',
        role: 'admin',
        email: 'admin@arrow.com',
        aadhaarNumber: '123456789013',
        panNumber: 'ABCDE1234G',
        joiningDate: new Date().toISOString().split('T')[0],
        designation: 'Operations Manager',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'emp_field',
        fullName: 'Field Executive',
        phone: '9876543220',
        role: 'field_employee',
        email: 'field@arrow.com',
        aadhaarNumber: '123456789014',
        panNumber: 'ABCDE1234H',
        joiningDate: new Date().toISOString().split('T')[0],
        designation: 'Field Inspector',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    await db.profiles.bulkAdd(initialProfiles);
  });

  console.log("🧹 Database clean initialized with production Super Admin, Admin, and Field Employee roles!");
}

/**
 * Completely wipes local database and re-initializes clean state
 */
export async function resetDatabaseToClean() {
  await seedDemoData(true);
}

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

/**
 * Clears all local mock data across all tables and seeds only 1 default Admin profile.
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
    // Clear all dummy mock data
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

    // Seed only 1 default Admin Profile for clean login access
    const adminProfile: Profile = {
      id: 'admin_1',
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
    };

    await db.profiles.add(adminProfile);
  });

  console.log("🧹 All mock data cleared successfully! Database starts 100% clean.");
}

/**
 * Completely wipes local database and re-initializes clean state
 */
export async function resetDatabaseToClean() {
  await seedDemoData(true);
}

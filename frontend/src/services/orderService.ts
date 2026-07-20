import { db } from './db';
import type { OrderConfirmation, ClientDocument, ClientRegistration, InstallationPhoto, ReleaseDocument } from '../types';

export const orderService = {
  // Order Confirmations
  async getOrderConfirmationByLeadId(leadId: string): Promise<OrderConfirmation | undefined> {
    return db.orderConfirmations.where({ leadId }).first();
  },

  async createOrderConfirmation(ocData: Omit<OrderConfirmation, 'id' | 'createdAt'>): Promise<string> {
    const id = 'oc_' + Math.random().toString(36).substring(2, 11);
    const newOc: OrderConfirmation = {
      ...ocData,
      id,
      createdAt: new Date().toISOString()
    };
    await db.transaction('rw', [db.orderConfirmations, db.leads, db.clientRegistrations], async () => {
      await db.orderConfirmations.add(newOc);
      
      // Update Lead Status to 'confirmed'
      const lead = await db.leads.get(ocData.leadId);
      if (lead) {
        lead.status = 'confirmed';
        lead.updatedAt = new Date().toISOString();
        await db.leads.put(lead);
      }

      // Initialize Client Registration Checklist if not exists
      const reg = await db.clientRegistrations.get(ocData.leadId);
      if (!reg) {
        await db.clientRegistrations.add({
          leadId: ocData.leadId,
          registrationDone: false,
          fileMade: false,
          bankFileUploaded: false,
          loanStatus: 'pending',
          updatedAt: new Date().toISOString()
        });
      }
    });
    return id;
  },

  // Client Registrations Checklist
  async getClientRegistrationByLeadId(leadId: string): Promise<ClientRegistration | undefined> {
    return db.clientRegistrations.get(leadId);
  },

  async saveClientRegistration(registration: ClientRegistration): Promise<void> {
    registration.updatedAt = new Date().toISOString();
    await db.transaction('rw', [db.clientRegistrations, db.leads], async () => {
      await db.clientRegistrations.put(registration);
      
      // If registration is complete, check if we need to promote status
      const lead = await db.leads.get(registration.leadId);
      if (lead && lead.status === 'confirmed' && registration.registrationDone) {
        lead.status = 'registered';
        lead.updatedAt = new Date().toISOString();
        await db.leads.put(lead);
      }
    });
  },

  // Client Documents (Slots: PAN, Aadhar, Bill, Tax, Bank etc)
  async getClientDocumentsByLeadId(leadId: string): Promise<ClientDocument[]> {
    return db.clientDocuments.where({ leadId }).toArray();
  },

  async uploadClientDocument(docData: Omit<ClientDocument, 'id' | 'uploadedAt'>): Promise<string> {
    const id = 'doc_' + Math.random().toString(36).substring(2, 11);
    const newDoc: ClientDocument = {
      ...docData,
      id,
      uploadedAt: new Date().toISOString()
    };
    // If it is the bank file, toggle the checklist in registration
    await db.transaction('rw', [db.clientDocuments, db.clientRegistrations], async () => {
      // Find if we already have a document of this type for this lead and overwrite it if so
      const existing = await db.clientDocuments.where({ leadId: docData.leadId, docType: docData.docType }).first();
      if (existing) {
        await db.clientDocuments.delete(existing.id);
      }
      await db.clientDocuments.add(newDoc);

      if (docData.docType === 'account_details') {
        const reg = await db.clientRegistrations.get(docData.leadId);
        if (reg) {
          reg.bankFileUploaded = true;
          reg.updatedAt = new Date().toISOString();
          await db.clientRegistrations.put(reg);
        }
      }
    });
    return id;
  },

  async deleteClientDocument(id: string): Promise<void> {
    const doc = await db.clientDocuments.get(id);
    if (!doc) return;
    await db.transaction('rw', [db.clientDocuments, db.clientRegistrations], async () => {
      await db.clientDocuments.delete(id);
      if (doc.docType === 'account_details') {
        const reg = await db.clientRegistrations.get(doc.leadId);
        if (reg) {
          reg.bankFileUploaded = false;
          reg.updatedAt = new Date().toISOString();
          await db.clientRegistrations.put(reg);
        }
      }
    });
  },

  // Installation Photos
  async getInstallationPhotosByLeadId(leadId: string): Promise<InstallationPhoto[]> {
    return db.installationPhotos.where({ leadId }).toArray();
  },

  async uploadInstallationPhoto(photoData: Omit<InstallationPhoto, 'id'>): Promise<string> {
    const id = 'photo_' + Math.random().toString(36).substring(2, 11);
    const newPhoto: InstallationPhoto = {
      ...photoData,
      id
    };
    await db.transaction('rw', [db.installationPhotos, db.leads], async () => {
      // Add photo
      await db.installationPhotos.add(newPhoto);

      // Check if they have uploaded the primary photo types (Earthing, Meter, Grouting)
      // If yes, and lead status is registered, advance lead to 'installed'
      const photos = await db.installationPhotos.where({ leadId: photoData.leadId }).toArray();
      const types = photos.map(p => p.photoType);
      const hasRequired = ['earthing', 'meter', 'grouting'].every(type => types.includes(type as any));

      const lead = await db.leads.get(photoData.leadId);
      if (lead && hasRequired && lead.status === 'registered') {
        lead.status = 'installed';
        lead.updatedAt = new Date().toISOString();
        await db.leads.put(lead);
      }
    });
    return id;
  },

  async deleteInstallationPhoto(id: string): Promise<void> {
    await db.installationPhotos.delete(id);
  },

  // Release Documents
  async getReleaseDocumentsByLeadId(leadId: string): Promise<ReleaseDocument[]> {
    return db.releaseDocuments.where({ leadId }).toArray();
  },

  async uploadReleaseDocument(relData: Omit<ReleaseDocument, 'id' | 'uploadedAt'>): Promise<string> {
    const id = 'rel_' + Math.random().toString(36).substring(2, 11);
    const newRel: ReleaseDocument = {
      ...relData,
      id,
      uploadedAt: new Date().toISOString()
    };
    await db.transaction('rw', [db.releaseDocuments, db.leads], async () => {
      await db.releaseDocuments.add(newRel);

      // Set lead status to 'closed' (representing completed pipeline release)
      const lead = await db.leads.get(relData.leadId);
      if (lead && lead.status === 'installed') {
        lead.status = 'closed';
        lead.updatedAt = new Date().toISOString();
        await db.leads.put(lead);
      }
    });
    return id;
  }
};

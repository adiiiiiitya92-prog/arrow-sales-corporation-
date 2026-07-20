import { db } from './db';
import type { Quotation } from '../types';
import { saveRecordToFirestore, fetchCollectionFromFirestore } from './firebase';

export const quotationService = {
  async getQuotations(): Promise<Quotation[]> {
    try {
      const remoteQuotes = await fetchCollectionFromFirestore<Quotation>('quotations');
      if (remoteQuotes && remoteQuotes.length > 0) {
        await db.quotations.bulkPut(remoteQuotes);
      }
    } catch (err) {
      console.warn("Firestore quotations sync offline note:", err);
    }
    return db.quotations.orderBy('createdAt').reverse().toArray();
  },

  async getQuotationById(id: string): Promise<Quotation | undefined> {
    return db.quotations.get(id);
  },

  async getQuotationsByLeadId(leadId: string): Promise<Quotation[]> {
    return db.quotations.where({ leadId }).reverse().sortBy('createdAt');
  },

  async createQuotation(qData: Omit<Quotation, 'id' | 'createdAt'>): Promise<string> {
    const id = 'q_' + Math.random().toString(36).substring(2, 11);
    const newQuotation: Quotation = {
      ...qData,
      id,
      createdAt: new Date().toISOString()
    };
    await db.transaction('rw', [db.quotations, db.leads], async () => {
      await db.quotations.add(newQuotation);
      const lead = await db.leads.get(qData.leadId);
      if (lead && lead.status === 'new') {
        lead.status = 'quotation_sent';
        lead.updatedAt = new Date().toISOString();
        await db.leads.put(lead);
      }
    });

    saveRecordToFirestore('quotations', id, newQuotation);
    return id;
  },

  async updateQuotation(quotation: Quotation): Promise<void> {
    await db.quotations.put(quotation);
    saveRecordToFirestore('quotations', quotation.id, quotation);
  },

  async markQuotationAsSent(id: string): Promise<void> {
    const quotation = await db.quotations.get(id);
    if (quotation) {
      quotation.sentViaWhatsapp = true;
      quotation.whatsappSentAt = new Date().toISOString();
      await db.quotations.put(quotation);
      saveRecordToFirestore('quotations', id, quotation);
    }
  }
};

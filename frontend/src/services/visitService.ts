import { db } from './db';
import type { FieldVisitReport } from '../types';

export const visitService = {
  async getVisitReports(): Promise<FieldVisitReport[]> {
    return db.fieldVisitReports.orderBy('visitedAt').reverse().toArray();
  },

  async getVisitReportsByEmployee(employeeId: string): Promise<FieldVisitReport[]> {
    return db.fieldVisitReports.where({ employeeId }).reverse().sortBy('visitedAt');
  },

  async getVisitReportsByLead(leadId: string): Promise<FieldVisitReport[]> {
    return db.fieldVisitReports.where({ leadId }).reverse().sortBy('visitedAt');
  },

  async createVisitReport(vData: Omit<FieldVisitReport, 'id' | 'visitedAt'>): Promise<string> {
    const id = 'visit_' + Math.random().toString(36).substring(2, 11);
    const newVisit: FieldVisitReport = {
      ...vData,
      id,
      visitedAt: new Date().toISOString()
    };
    await db.fieldVisitReports.add(newVisit);
    return id;
  }
};

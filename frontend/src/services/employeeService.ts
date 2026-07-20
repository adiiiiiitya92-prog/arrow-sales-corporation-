import { db } from './db';
import type { Profile } from '../types';

export const employeeService = {
  async getEmployees(): Promise<Profile[]> {
    // Only return field employees and admins
    return db.profiles.where('role').anyOf(['admin', 'field_employee']).toArray();
  },

  async getAllProfiles(): Promise<Profile[]> {
    return db.profiles.toArray();
  },

  async createEmployee(pData: Omit<Profile, 'id' | 'createdAt' | 'isActive'>): Promise<string> {
    const id = 'p_' + Math.random().toString(36).substring(2, 11);
    const newProfile: Profile = {
      ...pData,
      id,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    await db.profiles.add(newProfile);
    return id;
  },

  async toggleEmployeeStatus(id: string): Promise<void> {
    const profile = await db.profiles.get(id);
    if (profile) {
      profile.isActive = !profile.isActive;
      await db.profiles.put(profile);
    }
  }
};

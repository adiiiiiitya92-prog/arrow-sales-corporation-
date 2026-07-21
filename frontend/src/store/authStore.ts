import { create } from 'zustand';
import type { Profile } from '../types';
import { db, seedDemoData } from '../services/db';

interface AuthState {
  currentRole: 'super_admin' | 'admin' | 'field_employee';
  currentUser: Profile | null;
  isAuthenticated: boolean;
  originalUser: Profile | null;
  isLoading: boolean;
  login: (emailOrPhone: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setRole: (role: 'super_admin' | 'admin' | 'field_employee') => Promise<void>;
  impersonateUser: (user: Profile) => Promise<void>;
  stopImpersonating: () => Promise<void>;
  initAuth: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentRole: 'super_admin',
  currentUser: null,
  isAuthenticated: false,
  originalUser: null,
  isLoading: true,
  
  login: async (emailOrPhone) => {
    try {
      const input = emailOrPhone.trim().toLowerCase();
      let profileCount = await db.profiles.count();
      if (profileCount === 0) {
        await seedDemoData(true);
      }

      // Fetch fresh profiles from Firestore cloud database to ensure newly added admin/employee emails are synced
      try {
        const { fetchCollectionFromFirestore } = await import('../services/firebase');
        const remoteProfiles = await fetchCollectionFromFirestore<Profile>('profiles');
        if (remoteProfiles && remoteProfiles.length > 0) {
          await db.profiles.bulkPut(remoteProfiles);
        }
      } catch (e) {
        console.warn("Firestore profile sync note:", e);
      }

      // Query profiles strictly by pre-approved email or phone
      const profile = await db.profiles
        .filter(p => (p.email?.toLowerCase() === input || p.phone === input) && p.isActive)
        .first();

      if (profile) {
        localStorage.setItem('asc_user_id', profile.id);
        localStorage.setItem('asc_authenticated', 'true');
        set({
          currentUser: profile,
          currentRole: profile.role,
          isAuthenticated: true,
          originalUser: null
        });
        return true;
      }

      console.warn(`Access Denied: Email/Phone "${input}" has not been pre-approved by Admin or Super Admin.`);
      return false;
    } catch (err) {
      console.error('Error logging in:', err);
      return false;
    }
  },

  logout: async () => {
    localStorage.removeItem('asc_user_id');
    localStorage.removeItem('asc_authenticated');
    set({
      currentUser: null,
      isAuthenticated: false,
      originalUser: null
    });
  },

  setRole: async (role) => {
    const profile = await db.profiles.where({ role }).first();
    if (profile) {
      localStorage.setItem('asc_user_id', profile.id);
      localStorage.setItem('asc_authenticated', 'true');
      set({ currentRole: role, currentUser: profile, isAuthenticated: true, originalUser: null });
    } else {
      set({ currentRole: role, currentUser: null, originalUser: null });
    }
  },

  impersonateUser: async (user) => {
    const original = get().originalUser || get().currentUser;
    set({
      currentRole: user.role,
      currentUser: user,
      originalUser: original
    });
  },

  stopImpersonating: async () => {
    const original = get().originalUser;
    if (original) {
      set({
        currentRole: original.role,
        currentUser: original,
        originalUser: null
      });
    }
  },
  
  initAuth: async () => {
    set({ isLoading: true });
    try {
      await seedDemoData(); // Seeds if empty
      const savedUserId = localStorage.getItem('asc_user_id');
      const savedAuth = localStorage.getItem('asc_authenticated') === 'true';

      if (savedUserId && savedAuth) {
        const profile = await db.profiles.get(savedUserId);
        if (profile && profile.isActive) {
          set({
            currentUser: profile,
            currentRole: profile.role,
            isAuthenticated: true,
            isLoading: false,
            originalUser: null
          });
          return;
        }
      }

      set({
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        originalUser: null
      });
    } catch (err) {
      console.error('Error during auth init:', err);
      set({ isLoading: false, isAuthenticated: false });
    }
  },
  
  resetAllData: async () => {
    set({ isLoading: true });
    try {
      await seedDemoData(true); // force reseed
      const role = get().currentRole;
      const profile = await db.profiles.where({ role }).first();
      if (profile) {
        localStorage.setItem('asc_user_id', profile.id);
        localStorage.setItem('asc_authenticated', 'true');
        set({ currentUser: profile, isAuthenticated: true, isLoading: false, originalUser: null });
      } else {
        set({ currentUser: null, isLoading: false, originalUser: null });
      }
    } catch (err) {
      console.error('Error resetting database:', err);
      set({ isLoading: false });
    }
  }
}));

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { compressImage, compressDataUrl, type ImageCompressionConfig } from './imageCompressionService';

// Firebase Project Configuration (Securely loaded from .env environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Cloud Storage & Firestore Database
export const storage = getStorage(app);
export const firestoreDb = getFirestore(app);

/**
 * Auto-compresses an image File/Blob down to ultra-low KB sizes (<60KB-90KB)
 * and uploads it directly to Firebase Cloud Storage.
 */
export async function uploadImageToFirebase(
  fileOrBlob: File | Blob,
  storagePath: string,
  compressionConfig: ImageCompressionConfig = {}
): Promise<string> {
  try {
    const compressedFile = await compressImage(fileOrBlob, compressionConfig);
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, compressedFile, {
      contentType: compressedFile.type,
      cacheControl: 'public, max-age=31536000'
    });

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`🔥 Firebase Storage Uploaded: ${storagePath} (${(compressedFile.size / 1024).toFixed(1)} KB)`);
    return downloadURL;
  } catch (error) {
    console.warn(`Firebase Storage upload note at ${storagePath}:`, error);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(fileOrBlob);
    });
  }
}

/**
 * Uploads a Data URL (e.g. from Canvas or PDF snapshot) after auto-compression to Firebase Storage.
 */
export async function uploadDataUrlToFirebase(
  dataUrl: string,
  storagePath: string,
  compressionConfig: ImageCompressionConfig = {}
): Promise<string> {
  try {
    const compressedFile = await compressDataUrl(dataUrl, `upload_${Date.now()}.webp`, compressionConfig);
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, compressedFile, {
      contentType: compressedFile.type,
      cacheControl: 'public, max-age=31536000'
    });
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.warn("Firebase DataUrl upload note:", error);
    return dataUrl;
  }
}

/**
 * Deletes a file from Firebase Cloud Storage by its full URL or path.
 */
export async function deleteFileFromFirebase(storagePathOrUrl: string): Promise<boolean> {
  try {
    if (!storagePathOrUrl || !storagePathOrUrl.includes('firebasestorage')) return false;
    const storageRef = ref(storage, storagePathOrUrl);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn("Could not delete Firebase file:", err);
    return false;
  }
}

// ==========================================
// FIRESTORE DATABASE SCALABLE CRUD HELPERS
// ==========================================

/**
 * Helper to strip Blobs or non-serializable objects before sending to Firestore
 */
function sanitizeForFirestore(data: any): any {
  if (data === null || data === undefined) return data;
  if (data instanceof Blob || data instanceof File) return undefined;
  if (Array.isArray(data)) return data.map(sanitizeForFirestore).filter(v => v !== undefined);
  if (typeof data === 'object') {
    const cleanObj: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const val = sanitizeForFirestore(data[key]);
        if (val !== undefined) cleanObj[key] = val;
      }
    }
    return cleanObj;
  }
  return data;
}

/**
 * Saves or updates a document in Firebase Firestore
 */
export async function saveRecordToFirestore(collectionName: string, id: string, data: any): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(data);
    const docRef = doc(firestoreDb, collectionName, id);
    await setDoc(docRef, cleanData, { merge: true });
    console.log(`🔥 Firestore Synced [${collectionName}/${id}]`);
  } catch (err) {
    console.warn(`Firestore save note [${collectionName}/${id}]:`, err);
  }
}

/**
 * Fetches all documents in a collection from Firebase Firestore
 */
export async function fetchCollectionFromFirestore<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(firestoreDb, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }) as unknown as T);
  } catch (err) {
    console.warn(`Firestore fetch note [${collectionName}]:`, err);
    return [];
  }
}

/**
 * Deletes a document from Firebase Firestore
 */
export async function deleteRecordFromFirestore(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(firestoreDb, collectionName, id);
    await deleteDoc(docRef);
    console.log(`🔥 Firestore Deleted [${collectionName}/${id}]`);
  } catch (err) {
    console.warn(`Firestore delete note [${collectionName}/${id}]:`, err);
  }
}

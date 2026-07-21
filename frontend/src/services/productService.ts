import { db } from './db';
import type { Product } from '../types';
import { saveRecordToFirestore, deleteRecordFromFirestore, fetchCollectionFromFirestore } from './firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const productService = {
  async getProducts(): Promise<Product[]> {
    try {
      const remoteProds = await fetchCollectionFromFirestore<Product>('products');
      if (remoteProds && remoteProds.length > 0) {
        await db.products.bulkPut(remoteProds);
      } else {
        // Fallback to Express backend API if Firestore returned empty
        try {
          const res = await fetch(`${BACKEND_URL}/api/products`);
          if (res.ok) {
            const apiProds = await res.json();
            if (Array.isArray(apiProds) && apiProds.length > 0) {
              await db.products.bulkPut(apiProds);
            }
          }
        } catch (e) {
          // Backend API offline fallback
        }
      }
    } catch (err) {
      console.warn("Firestore products sync note:", err);
    }
    return db.products.orderBy('name').toArray();
  },

  async createProduct(pData: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
    const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newProduct: Product = {
      ...pData,
      id,
      createdAt: new Date().toISOString()
    };

    // 1. IndexedDB local storage
    await db.products.put(newProduct);

    // 2. Firebase Firestore Cloud Storage
    await saveRecordToFirestore('products', id, newProduct);

    // 3. Express Backend REST API
    try {
      await fetch(`${BACKEND_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      console.log(`🚀 Product saved to Express Backend API [${id}]`);
    } catch (err) {
      console.warn("Express Backend API product sync note:", err);
    }

    return id;
  },

  async updateProduct(product: Product): Promise<void> {
    await db.products.put(product);
    await saveRecordToFirestore('products', product.id, product);

    try {
      await fetch(`${BACKEND_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
    } catch (err) {
      console.warn("Express Backend API product update note:", err);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    await db.products.delete(id);
    await deleteRecordFromFirestore('products', id);

    try {
      await fetch(`${BACKEND_URL}/api/products/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn("Express Backend API product delete note:", err);
    }
  }
};

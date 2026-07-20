import { db } from './db';
import type { Product } from '../types';
import { saveRecordToFirestore, deleteRecordFromFirestore, fetchCollectionFromFirestore } from './firebase';

export const productService = {
  async getProducts(): Promise<Product[]> {
    try {
      const remoteProds = await fetchCollectionFromFirestore<Product>('products');
      if (remoteProds && remoteProds.length > 0) {
        await db.products.bulkPut(remoteProds);
      }
    } catch (err) {
      console.warn("Firestore products sync note:", err);
    }
    return db.products.orderBy('name').toArray();
  },

  async createProduct(pData: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
    const id = 'prod_' + Math.random().toString(36).substring(2, 11);
    const newProduct: Product = {
      ...pData,
      id,
      createdAt: new Date().toISOString()
    };
    await db.products.add(newProduct);
    saveRecordToFirestore('products', id, newProduct);
    return id;
  },

  async updateProduct(product: Product): Promise<void> {
    await db.products.put(product);
    saveRecordToFirestore('products', product.id, product);
  },

  async deleteProduct(id: string): Promise<void> {
    await db.products.delete(id);
    deleteRecordFromFirestore('products', id);
  }
};

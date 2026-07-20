import { db } from './db';
import type { Product } from '../types';

export const productService = {
  async getProducts(): Promise<Product[]> {
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
    return id;
  },

  async updateProduct(product: Product): Promise<void> {
    await db.products.put(product);
  },

  async deleteProduct(id: string): Promise<void> {
    await db.products.delete(id);
  }
};

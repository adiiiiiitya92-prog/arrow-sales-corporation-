import { db } from './db';
import type { Challan } from '../types';

export const challanService = {
  async getChallans(): Promise<Challan[]> {
    return db.challans.orderBy('createdAt').reverse().toArray();
  },

  async createChallan(cData: Omit<Challan, 'id' | 'createdAt' | 'challanNumber'>): Promise<string> {
    const id = 'ch_' + Math.random().toString(36).substring(2, 11);
    const dateCode = new Date().getFullYear().toString();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const challanNumber = `CH-${dateCode}-${randNum}`;

    const newChallan: Challan = {
      ...cData,
      id,
      challanNumber,
      createdAt: new Date().toISOString()
    };

    // Transaction to ensure atomic stock deduction
    await db.transaction('rw', [db.challans, db.products], async () => {
      // 1. Save challan
      await db.challans.add(newChallan);

      // 2. Subtract stock quantities for each item
      for (const item of cData.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          // Subtract stock quantity
          const updatedStock = Math.max(0, product.stockQuantity - item.qty);
          await db.products.update(item.productId, {
            stockQuantity: updatedStock
          });
        }
      }
    });

    return id;
  },

  async getChallanById(id: string): Promise<Challan | undefined> {
    return db.challans.get(id);
  },

  async updateChallan(id: string, updatedChallan: Challan): Promise<void> {
    const oldChallan = await db.challans.get(id);
    if (!oldChallan) {
      throw new Error("Challan not found");
    }

    await db.transaction('rw', [db.challans, db.products], async () => {
      // 1. Revert old stock deduction
      for (const oldItem of oldChallan.items) {
        const product = await db.products.get(oldItem.productId);
        if (product) {
          await db.products.update(oldItem.productId, {
            stockQuantity: product.stockQuantity + oldItem.qty
          });
        }
      }

      // 2. Apply new stock deduction
      for (const newItem of updatedChallan.items) {
        const product = await db.products.get(newItem.productId);
        if (product) {
          const updatedStock = Math.max(0, product.stockQuantity - newItem.qty);
          await db.products.update(newItem.productId, {
            stockQuantity: updatedStock
          });
        }
      }

      // 3. Save the updated challan record
      await db.challans.put(updatedChallan);
    });
  }
};

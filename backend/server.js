import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Firebase Admin SDK
const projectId = process.env.FIREBASE_PROJECT_ID || 'arrow-sales-corporation';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'arrow-sales-corporation.firebasestorage.app';

if (!getApps().length) {
  initializeApp({
    projectId,
    storageBucket
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Arrow Sales Corporation Solar CRM Backend API', timestamp: new Date().toISOString() });
});

// ===================================
// 1. LEADS API ENDPOINTS
// ===================================
app.get('/api/leads', async (req, res) => {
  try {
    const snapshot = await db.collection('leads').orderBy('createdAt', 'desc').get();
    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leads', details: String(err) });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const id = req.body.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const newLead = { ...req.body, id, createdAt: now, updatedAt: now };
    await db.collection('leads').doc(id).set(newLead, { merge: true });
    res.status(201).json(newLead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create lead', details: String(err) });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedAt = new Date().toISOString();
    const updatedData = { ...req.body, updatedAt };
    await db.collection('leads').doc(id).set(updatedData, { merge: true });
    res.json({ id, ...updatedData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead', details: String(err) });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('leads').doc(id).delete();
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lead', details: String(err) });
  }
});

// ===================================
// 2. QUOTATIONS API ENDPOINTS
// ===================================
app.get('/api/quotations', async (req, res) => {
  try {
    const snapshot = await db.collection('quotations').orderBy('createdAt', 'desc').get();
    const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotations', details: String(err) });
  }
});

app.post('/api/quotations', async (req, res) => {
  try {
    const id = req.body.id || `q_${Date.now()}`;
    const newQuote = { ...req.body, id, createdAt: new Date().toISOString() };
    await db.collection('quotations').doc(id).set(newQuote, { merge: true });
    res.status(201).json(newQuote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save quotation', details: String(err) });
  }
});

// ===================================
// 3. PRODUCTS & INVENTORY API
// ===================================
app.get('/api/products', async (req, res) => {
  try {
    const snapshot = await db.collection('products').orderBy('name').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products', details: String(err) });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const id = req.body.id || `prod_${Date.now()}`;
    const newProd = { ...req.body, id, createdAt: new Date().toISOString() };
    await db.collection('products').doc(id).set(newProd, { merge: true });
    res.status(201).json(newProd);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save product', details: String(err) });
  }
});

// ===================================
// 4. DELIVERY CHALLANS API
// ===================================
app.get('/api/challans', async (req, res) => {
  try {
    const snapshot = await db.collection('challans').orderBy('createdAt', 'desc').get();
    const challans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(challans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challans', details: String(err) });
  }
});

app.post('/api/challans', async (req, res) => {
  try {
    const id = req.body.id || `ch_${Date.now()}`;
    const newChallan = { ...req.body, id, createdAt: new Date().toISOString() };
    await db.collection('challans').doc(id).set(newChallan, { merge: true });
    res.status(201).json(newChallan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save challan', details: String(err) });
  }
});

// ===================================
// 5. FIELD VISITS API
// ===================================
app.get('/api/visits', async (req, res) => {
  try {
    const snapshot = await db.collection('fieldVisitReports').orderBy('visitedAt', 'desc').get();
    const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch visits', details: String(err) });
  }
});

app.post('/api/visits', async (req, res) => {
  try {
    const id = req.body.id || `visit_${Date.now()}`;
    const newVisit = { ...req.body, id, visitedAt: new Date().toISOString() };
    await db.collection('fieldVisitReports').doc(id).set(newVisit, { merge: true });
    res.status(201).json(newVisit);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save visit report', details: String(err) });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Solar CRM Backend Server running on port ${PORT}`);
});

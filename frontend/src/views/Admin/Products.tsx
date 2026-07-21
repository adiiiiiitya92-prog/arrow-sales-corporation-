import React, { useEffect, useState } from 'react';
import type { Product } from '../../types';
import { productService } from '../../services/productService';
import { Plus, Search, Trash2, Tag } from 'lucide-react';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Product['category']>('solar_panel');
  const [rate, setRate] = useState(0);
  const [description, setDescription] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [minStockThreshold, setMinStockThreshold] = useState<number | ''>('');

  const loadProducts = async () => {
    const list = await productService.getProducts();
    setProducts(list);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || rate <= 0) {
      alert('Please fill out Product Name and a valid price Rate.');
      return;
    }

    try {
      await productService.createProduct({
        name,
        category,
        rate: Number(rate),
        description: description || undefined,
        stockQuantity: Number(stockQuantity) || 0,
        minStockThreshold: Number(minStockThreshold) || 0
      });

      alert(`Product "${name}" successfully saved to Catalog & Database!`);

      // Reset Form
      setName('');
      setCategory('solar_panel');
      setRate(0);
      setDescription('');
      setStockQuantity('');
      setMinStockThreshold('');
      setShowAddModal(false);
      await loadProducts();
    } catch (err) {
      console.error("Error creating product:", err);
      alert('Error saving product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Delete this product from catalog? This will not affect existing generated quotations.')) {
      await productService.deleteProduct(id);
      loadProducts();
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = products.filter(p => p.stockQuantity <= p.minStockThreshold);

  const getCategoryLabel = (cat: Product['category']) => {
    const labels: Record<string, string> = {
      solar_panel: 'Solar Panel',
      inverter: 'Inverter',
      battery: 'Battery / Storage',
      structure: 'Mounting Structure',
      other: 'Other/Accessories'
    };
    return labels[cat] || cat;
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Catalog</h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manage standardized inventory pricing and components.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by product name or category (e.g. inverter, solar)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs font-medium text-slate-800 focus:outline-none w-full bg-transparent"
        />
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="text-lg">⚠️</span>
            <div className="text-xs">
              <p className="font-extrabold text-amber-800">Inventory Alert: {lowStockItems.length} items are running low in stock!</p>
              <p className="text-amber-600 font-bold mt-0.5">Some components have fallen to or below their configured minimum alert threshold. Please initiate reorder requests.</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex justify-between items-start gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase tracking-wider">
                  {getCategoryLabel(p.category)}
                </span>
                <button
                  onClick={() => handleDeleteProduct(p.id)}
                  className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Remove from Catalog"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mt-2">{p.name}</h4>
              {p.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
              )}
            </div>

            {/* Stock Level Details */}
            <div className="mt-3 flex items-center justify-between text-[11px] font-bold border-t border-slate-50 pt-2">
              <span className="text-slate-400">Stock Available:</span>
              <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${p.stockQuantity <= p.minStockThreshold ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                {p.stockQuantity} units
              </span>
            </div>

            {/* Warning Alert if Low Stock */}
            {p.stockQuantity <= p.minStockThreshold && (
              <div className="mt-2 text-[9px] bg-red-50 border border-red-100/60 text-red-600 px-2.5 py-1 rounded-xl font-black flex items-center gap-1.5 animate-pulse">
                <span>⚠️ LOW STOCK WARNING (Limit: {p.minStockThreshold})</span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">Standard Price:</span>
              <span className="text-sm font-extrabold text-slate-950">₹{p.rate.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 p-8 text-center rounded-xl">
            <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-bold">No products cataloged. Tap "Add Product" to compile templates.</p>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 m-4 animate-scale-in">
            <h3 className="text-lg font-black text-slate-900 mb-4">Add Product Template</h3>
            <form onSubmit={handleAddProduct} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1">Product/Item Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Growatt 5kW Grid-Tie Inverter"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none cursor-pointer text-slate-700 font-bold"
                  >
                    <option value="solar_panel">Solar Panel</option>
                    <option value="inverter">Inverter</option>
                    <option value="battery">Battery / Storage</option>
                    <option value="structure">Mounting Structure</option>
                    <option value="other">Other/Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Standard Rate (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={rate || ''}
                    onChange={(e) => setRate(Number(e.target.value))}
                    placeholder="e.g. 45000"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Single-phase Wi-Fi enabled inverter unit"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Stock Quantity (In Hand)</label>
                  <input
                    type="number"
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 15"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Minimum Alert Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={minStockThreshold}
                    onChange={(e) => setMinStockThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

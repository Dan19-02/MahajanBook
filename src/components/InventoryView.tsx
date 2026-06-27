import React, { useRef, useState } from 'react';
import { Search, Plus, AlertTriangle, Pencil, Trash2, Upload, FileDown, PackagePlus, Barcode } from 'lucide-react';
import { Product } from '../types';
import BarcodeLabel from './BarcodeLabel';

interface InventoryViewProps {
  products: Product[];
  storeName?: string;
  onAddProduct: (product: Product) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
  onUpdateProduct: (id: string, fields: Partial<Omit<Product, 'id' | 'createdAt'>>) => void;
  onDeleteProduct: (id: string) => void;
  onImportProducts: (items: Omit<Product, 'id' | 'createdAt'>[]) => void;
}

type UnitType = 'Piece' | 'Kg' | 'Liter' | 'Box' | 'Dozen' | 'Meter';

type NewProduct = Omit<Product, 'id' | 'createdAt'>;

const CSV_COLUMNS = ['name', 'sku', 'category', 'unitType', 'costPrice', 'retailPrice', 'wholesalePrice', 'currentStock', 'lowStockThreshold', 'barcode'];

const STARTER_CATALOG: NewProduct[] = [
  { name: 'Tata Salt 1kg', sku: 'GR-SALT-1KG', category: 'Groceries', unitType: 'Piece', costPrice: 24, retailPrice: 28, wholesalePrice: 26, currentStock: 50, lowStockThreshold: 10 },
  { name: 'Aashirvaad Atta 5kg', sku: 'GR-ATTA-5KG', category: 'Groceries', unitType: 'Piece', costPrice: 230, retailPrice: 270, wholesalePrice: 250, currentStock: 30, lowStockThreshold: 5 },
  { name: 'Fortune Sunflower Oil 1L', sku: 'GR-OIL-1L', category: 'Groceries', unitType: 'Liter', costPrice: 130, retailPrice: 155, wholesalePrice: 145, currentStock: 40, lowStockThreshold: 8 },
  { name: 'Parle-G Biscuit', sku: 'FM-PARLEG', category: 'FMCG', unitType: 'Piece', costPrice: 8, retailPrice: 10, wholesalePrice: 9, currentStock: 100, lowStockThreshold: 20 },
  { name: 'Amul Milk 500ml', sku: 'DA-MILK-500', category: 'Dairy', unitType: 'Piece', costPrice: 27, retailPrice: 30, wholesalePrice: 29, currentStock: 60, lowStockThreshold: 15 },
  { name: 'Colgate Toothpaste 100g', sku: 'PC-COLG-100', category: 'Personal Care', unitType: 'Piece', costPrice: 45, retailPrice: 55, wholesalePrice: 50, currentStock: 35, lowStockThreshold: 8 },
  { name: 'Surf Excel 1kg', sku: 'HC-SURF-1KG', category: 'Home Care', unitType: 'Piece', costPrice: 110, retailPrice: 135, wholesalePrice: 125, currentStock: 25, lowStockThreshold: 5 },
  { name: 'Maggi Noodles 70g', sku: 'FM-MAGGI-70', category: 'FMCG', unitType: 'Piece', costPrice: 12, retailPrice: 14, wholesalePrice: 13, currentStock: 80, lowStockThreshold: 20 },
];

/** Minimal CSV parser that handles quoted fields. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((x) => x.trim() !== '')) rows.push(row); }
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
}

export default function InventoryView({ products, storeName, onAddProduct, onUpdateStock, onUpdateProduct, onDeleteProduct, onImportProducts }: InventoryViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);

  // Create / edit product state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('Piece');
  const [costPrice, setCostPrice] = useState(0);
  const [retailPrice, setRetailPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const resetForm = () => {
    setEditingId(null);
    setShowAddForm(false);
    setName(''); setSku(''); setBarcode(''); setCategory(''); setUnitType('Piece');
    setCostPrice(0); setRetailPrice(0); setWholesalePrice(0);
    setCurrentStock(0); setLowStockThreshold(5);
  };

  const openAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name); setSku(p.sku); setBarcode(p.barcode || ''); setCategory(p.category); setUnitType(p.unitType);
    setCostPrice(p.costPrice); setRetailPrice(p.retailPrice); setWholesalePrice(p.wholesalePrice);
    setCurrentStock(p.currentStock); setLowStockThreshold(p.lowStockThreshold);
    setShowAddForm(true);
  };

  const handleDelete = (p: Product) => {
    if (window.confirm(`Delete "${p.name}"? This removes it from inventory.`)) onDeleteProduct(p.id);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !category) return;

    const fields = {
      sku: sku.toUpperCase().trim(),
      barcode: barcode.trim() || undefined,
      name: name.trim(),
      category: category.trim(),
      unitType,
      costPrice,
      retailPrice,
      wholesalePrice,
      currentStock,
      lowStockThreshold,
    };

    if (editingId) {
      onUpdateProduct(editingId, fields);
    } else {
      onAddProduct({ id: `p-${Date.now()}`, createdAt: new Date().toISOString(), ...fields });
    }
    resetForm();
  };

  // ---- Bulk import ----
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const rows = parseCsv(String(reader.result));
        const items: NewProduct[] = rows
          .filter((r) => (r.name || '').trim() && (r.sku || '').trim())
          .map((r) => ({
            name: r.name.trim(),
            sku: r.sku.trim().toUpperCase(),
            barcode: r.barcode?.trim() || undefined,
            category: r.category?.trim() || 'Groceries',
            unitType: ((r.unitType?.trim() || 'Piece') as UnitType),
            costPrice: Number(r.costPrice) || 0,
            retailPrice: Number(r.retailPrice) || 0,
            wholesalePrice: Number(r.wholesalePrice) || 0,
            currentStock: Number(r.currentStock) || 0,
            lowStockThreshold: Number(r.lowStockThreshold) || 5,
          }));
        if (items.length === 0) {
          window.alert('No valid rows found. Each row needs at least a name and SKU.');
        } else if (window.confirm(`Import ${items.length} product(s)?`)) {
          onImportProducts(items);
        }
      };
      reader.readAsText(file);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleStarterCatalog = () => {
    if (window.confirm(`Add ${STARTER_CATALOG.length} common Indian products to your inventory?`)) {
      onImportProducts(STARTER_CATALOG);
    }
  };

  const downloadTemplate = () => {
    const sample = [
      CSV_COLUMNS.join(','),
      'Tata Salt 1kg,GR-SALT-1KG,Groceries,Piece,24,28,26,50,10,8901234567890',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([sample], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mahajanbook-products-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory Directory</h2>
          <p className="text-xs text-gray-500 mt-1">Manage shop SKU rates, cost values, margins, and active stock thresholds.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleStarterCatalog} className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors" title="Add common Indian products">
            <PackagePlus className="w-4 h-4" /> Starter catalog
          </button>
          <button onClick={() => fileRef.current?.click()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors" title="Import products from CSV">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={downloadTemplate} className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold flex items-center cursor-pointer transition-colors" title="Download CSV template">
            <FileDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => (showAddForm ? resetForm() : openAddForm())}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" /> {showAddForm ? 'Close' : 'Add Product'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleCsvFile} className="hidden" />
        </div>
      </div>

      {/* Add Product form */}
      {showAddForm && (
        <form onSubmit={handleProductSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-gray-800">{editingId ? 'Edit Product' : 'New Product'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name *</label>
              <input 
                type="text" required placeholder="e.g. Dolo 650 Tabs" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU Code *</label>
              <input
                type="text" required placeholder="e.g. PH-DOLO-650" value={sku} onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Barcode</label>
              <input
                type="text" placeholder="Scan or type EAN / barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category *</label>
              <input
                type="text" required list="category-options"
                placeholder="e.g. Groceries, Laptops, Bike Parts"
                value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white outline-none focus:border-indigo-500"
              />
              <datalist id="category-options">
                {categories.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="text-[10px] text-gray-400 mt-1">Type your own — past categories are suggested.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit Type</label>
              <select 
                value={unitType} onChange={(e) => setUnitType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white outline-none focus:border-indigo-500"
              >
                <option value="Piece">Piece</option>
                <option value="Kg">Kg</option>
                <option value="Liter">Liter</option>
                <option value="Box">Box</option>
                <option value="Dozen">Dozen</option>
                <option value="Meter">Meter</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cost Price (₹)</label>
              <input 
                type="number" min="0" value={costPrice} onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Retail Price (₹)</label>
              <input 
                type="number" min="0" value={retailPrice} onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wholesale Price (₹)</label>
              <input 
                type="number" min="0" value={wholesalePrice} onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initial Opening Stock</label>
              <input 
                type="number" min="0" value={currentStock} onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Low Stock Warning Threshold</label>
              <input 
                type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button" onClick={resetForm}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
            >
              {editingId ? 'Save Changes' : 'Commit SKU'}
            </button>
          </div>
        </form>
      )}

      {/* SEARCH AND FILTER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-100">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input 
            type="text"
            placeholder="Filter by SKU name, details, or brand codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none"
          >
            {categories.map((cat, i) => (
              <option key={i} value={cat}>{cat} (Category)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100 tracking-wider">
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">SKU / Tags</th>
                <th className="px-6 py-4 text-right">Rates (Cost / Retail / Whole)</th>
                <th className="px-6 py-4 text-center">In-Stock Levels</th>
                <th className="px-6 py-4">Status & Alerts</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {filteredProducts.map(p => {
                const isOverStock = p.currentStock <= p.lowStockThreshold;
                const isOut = p.currentStock === 0;

                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{p.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{p.category} • Per {p.unitType}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-400 font-semibold">{p.sku}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono space-y-0.5">
                        <p className="text-gray-400">Cost: ₹{p.costPrice.toLocaleString('en-IN')}</p>
                        <p className="text-gray-900 font-bold">MRP: ₹{p.retailPrice.toLocaleString('en-IN')}</p>
                        <p className="text-indigo-600 font-bold">Wholesale: ₹{p.wholesalePrice.toLocaleString('en-IN')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-extrabold pr-8">
                      <span className={`text-sm ${isOverStock ? 'text-rose-600 font-extrabold' : 'text-gray-900'}`}>
                        {p.currentStock}
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal ml-1">/{p.unitType}</span>
                    </td>
                    <td className="px-6 py-4">
                      {isOut ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-lg text-[9px] uppercase">
                          Out of Stock
                        </span>
                      ) : isOverStock ? (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 border border-rose-100">
                          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Warning
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-semibold rounded-lg text-[10px] border border-emerald-100">
                          Adequate Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => onUpdateStock(p.id, p.currentStock + 10)}
                          className="bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 rounded px-2 py-1.5 transition-colors cursor-pointer"
                          title="Add 10 to stock"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => onUpdateStock(p.id, p.currentStock + 50)}
                          className="bg-indigo-50 hover:bg-indigo-100 font-bold text-indigo-700 rounded px-2 py-1.5 transition-colors cursor-pointer"
                          title="Add 50 to stock"
                        >
                          +50
                        </button>
                        <button
                          onClick={() => setLabelProduct(p)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-2 py-1.5 transition-colors cursor-pointer"
                          title="Print barcode label"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(p)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-2 py-1.5 transition-colors cursor-pointer"
                          title="Edit product"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 rounded px-2 py-1.5 transition-colors cursor-pointer"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-gray-400 font-medium">
                    No matching products available in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {labelProduct && (
        <BarcodeLabel product={labelProduct} storeName={storeName} onClose={() => setLabelProduct(null)} />
      )}
    </div>
  );
}

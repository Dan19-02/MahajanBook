import React, { useState, useMemo } from 'react';
import { Search, Trash2, Plus, AlertCircle, Sparkles, Check, UserPlus, Loader2, ScanLine } from 'lucide-react';
import { Product, Customer, PaymentStatus } from '../types';
import type { CreateInvoicePayload } from '../services/api';

interface BillingViewProps {
  products: Product[];
  customers: Customer[];
  defaultGstRate: number;
  onAddInvoice: (payload: CreateInvoicePayload) => Promise<boolean>;
  onQuickAddCustomer: (customer: Customer) => Promise<Customer | null>;
}

export default function BillingView({ products, customers, defaultGstRate, onAddInvoice, onQuickAddCustomer }: BillingViewProps) {
  // Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scanCode, setScanCode] = useState<string>('');
  
  // Cart
  // Items format: { productId, quantity }
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  
  // Invoice state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PAID);
  const [ptpDate, setPtpDate] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(defaultGstRate); // shop default GST %, editable per bill

  // Feedbacks
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Customer Inline Quick-Create State
  const [showQuickAddCust, setShowQuickAddCust] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustMobile, setNewCustMobile] = useState<string>('');
  const [newCustBusiness, setNewCustBusiness] = useState<string>('');
  const [newCustGst, setNewCustGst] = useState<string>('');
  const [newCustType, setNewCustType] = useState<'RETAILER' | 'WHOLESALER'>('RETAILER');

  // Customer resolution
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Handle Quick Add Customer
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) {
      setErrorMsg('Name and active WhatsApp mobile number are required!');
      return;
    }

    // Simple mobile digits count validation
    if (newCustMobile.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian WhatsApp mobile number.');
      return;
    }

    const newCust: Customer = {
      id: `c-quick-${Date.now()}`,
      name: newCustName,
      mobile: newCustMobile,
      businessName: newCustBusiness || undefined,
      gstIn: newCustGst || undefined,
      customerType: newCustType,
      balance: 0,
      createdAt: new Date().toISOString()
    };

    // Persist via the backend, then auto-select using the server-assigned id
    // (the client-side id above is only a placeholder for the request body).
    const created = await onQuickAddCustomer(newCust);
    if (!created) return; // backend rejected it; App already surfaced the error

    setSelectedCustomerId(created.id);
    setShowQuickAddCust(false);

    // Clear fields
    setNewCustName('');
    setNewCustMobile('');
    setNewCustBusiness('');
    setNewCustGst('');

    setErrorMsg('');
    setSuccessMsg(`Customer ${created.name} created and auto-selected!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Add Item to cart with stock validation
  const handleAddToCart = (product: Product) => {
    if (!selectedCustomerId) {
      setErrorMsg('Select or quick-create a customer first to load correct wholesale/retail pricing.');
      return;
    }

    const existing = cart.find(ci => ci.productId === product.id);
    const newQty = existing ? existing.quantity + 1 : 1;

    // Strict boundary checks (can never go below zero / can never exceed current stock levels)
    if (newQty > product.currentStock) {
      setErrorMsg(`Insufficient stock! ${product.name} operates on STRICT boundary limit. Current stock is ${product.currentStock}.`);
      return;
    }

    setErrorMsg('');
    if (existing) {
      setCart(cart.map(ci => ci.productId === product.id ? { ...ci, quantity: newQty } : ci));
    } else {
      setCart([...cart, { productId: product.id, quantity: 1 }]);
    }
  };

  // Barcode scan (USB scanner sends the code + Enter, or type it manually)
  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    const lc = code.toLowerCase();
    const found = products.find(p => (p.barcode && p.barcode.toLowerCase() === lc) || p.sku.toLowerCase() === lc);
    if (found) {
      handleAddToCart(found);
    } else {
      setErrorMsg(`No product found for barcode/SKU "${code}".`);
    }
    setScanCode('');
  };

  // Update Cart Quantity
  const handleUpdateQty = (productId: string, qty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    // Strict limit assertion
    if (qty > prod.currentStock) {
      setErrorMsg(`Cannot add ${qty} units. Product stock is limited to ${prod.currentStock}.`);
      return;
    }

    setErrorMsg('');
    setCart(cart.map(ci => ci.productId === productId ? { ...ci, quantity: qty } : ci));
  };

  // Remove Item
  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter(ci => ci.productId !== productId));
  };

  // Calculated Pricing values
  const totals = useMemo(() => {
    let subtotal = 0;
    
    cart.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod && selectedCustomer) {
        // Dynamic Pricing logic
        const price = selectedCustomer.customerType === 'WHOLESALER' 
          ? prod.wholesalePrice 
          : prod.retailPrice;
        subtotal += price * item.quantity;
      }
    });

    const taxAmount = Math.max(0, parseFloat(((subtotal - discount) * (taxRate / 100)).toFixed(2)));
    const grandTotal = Math.max(0, parseFloat((subtotal - discount + taxAmount).toFixed(2)));

    return { subtotal, taxAmount, grandTotal };
  }, [cart, products, selectedCustomer, discount, taxRate]);

  // Handle Checkout — the backend computes pricing, stock, ledger and reminders.
  const handleProceedCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedCustomerId || !selectedCustomer) {
      setErrorMsg('Please select a business customer to checkout.');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Add at least one product selection to the invoice list.');
      return;
    }
    if (paymentStatus === PaymentStatus.CREDIT && !ptpDate) {
      setErrorMsg('Strict Business Constraint: Promise-To-Pay (PTP) Date is mandatory for store CREDIT billing.');
      return;
    }

    const grandTotal = totals.grandTotal;
    setSubmitting(true);
    const ok = await onAddInvoice({
      customerId: selectedCustomer.id,
      paymentStatus,
      ptpDate: paymentStatus === PaymentStatus.CREDIT ? ptpDate : undefined,
      discount,
      taxRate,
      items: cart.map((ci) => ({ productId: ci.productId, quantity: ci.quantity })),
    });
    setSubmitting(false);

    if (ok) {
      setCart([]);
      setSelectedCustomerId('');
      setPtpDate('');
      setDiscount(0);
      setSuccessMsg(`Invoice generated successfully for ₹${grandTotal.toLocaleString('en-IN')}! Ledger balances updated.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Dynamic pricing and state indicators */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Express Billing POS</h2>
        <p className="text-xs text-gray-500 mt-1">Generate complete invoicing ledgers in under 30 seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1 & 2 Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Customer picker / inline creator */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                1. Customer Ledger File
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAddCust(!showQuickAddCust)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Quick Create Customer
              </button>
            </div>

            {/* Quick Create Drawer form */}
            {showQuickAddCust && (
              <form onSubmit={handleQuickCustomerSubmit} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3 animate-fadeIn">
                <legend className="text-xs font-bold text-gray-800">New Client Details</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Customer Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">WhatsApp Mobile *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="10-digit, e.g. 9876543210"
                      value={newCustMobile}
                      onChange={(e) => setNewCustMobile(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Business/Shop Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Patel Kirana Store"
                      value={newCustBusiness}
                      onChange={(e) => setNewCustBusiness(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GST Identification (GSTIN)</label>
                    <input 
                      type="text" 
                      placeholder="15-digit code"
                      value={newCustGst}
                      onChange={(e) => setNewCustGst(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input 
                        type="radio" 
                        name="custType" 
                        checked={newCustType === 'RETAILER'} 
                        onChange={() => setNewCustType('RETAILER')}
                        className="text-indigo-600"
                      />
                      Retailer
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input 
                        type="radio" 
                        name="custType" 
                        checked={newCustType === 'WHOLESALER'} 
                        onChange={() => setNewCustType('WHOLESALER')}
                        className="text-indigo-600"
                      />
                      Wholesaler
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowQuickAddCust(false)}
                      className="px-3 py-1 bg-white border text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-3.5 py-1 bg-gray-950 text-white text-xs font-bold rounded-lg hover:bg-gray-900 transition-colors"
                    >
                      Save Customer
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Selector list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Pick Registered Store Buyer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setCart([]); // Reset Cart values on buyer toggle for dynamic price calculations recalculation
                    setErrorMsg('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gray-950 outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(cust => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.businessName ? `(${cust.businessName})` : ''} - {cust.customerType}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer ? (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800">{selectedCustomer.name}</p>
                    <p className="text-gray-500">GSM: {selectedCustomer.mobile}</p>
                    {selectedCustomer.gstIn && <p className="text-[10px] text-gray-400 font-mono">GST: {selectedCustomer.gstIn}</p>}
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-gray-950 text-white font-extrabold text-[9px] uppercase rounded">
                      {selectedCustomer.customerType}
                    </span>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-0.5 justify-end">
                      <Check className="w-3.5 h-3.5" /> Pricing Resolved
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-dashed border-amber-200 text-xs text-amber-800 flex items-center">
                  Please pick or create a client database file above to unlock pricing modules.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Product Search & Adding */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-1 border-b border-gray-50">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                2. Inventory Items Picker
              </h3>
              {selectedCustomer && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                  Loading {selectedCustomer.customerType} Pricing Matrix
                </span>
              )}
            </div>

            <form onSubmit={handleScan} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3.5 top-3 w-4.5 h-4.5 text-indigo-500" />
                <input
                  type="text"
                  placeholder="Scan barcode (or type code) and press Enter"
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-indigo-50/40 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0">
                Add
              </button>
            </form>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search inventory SKU, tags, product names, or pharma codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-950"
              />
            </div>

            {/* List results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {filteredProducts.map(p => {
                const isOver = p.currentStock <= p.lowStockThreshold;
                const isOutOfStock = p.currentStock === 0;

                // Resolve dynamic price
                const resolvedShowPrice = selectedCustomer?.customerType === 'WHOLESALER' 
                  ? p.wholesalePrice 
                  : p.retailPrice;

                return (
                  <div 
                    key={p.id} 
                    className={`p-3 rounded-xl border transition-all flex justify-between items-center ${
                      isOutOfStock 
                        ? 'opacity-50 bg-gray-50 border-gray-100' 
                        : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="space-y-1 max-w-[65%]">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{p.name}</h4>
                        {isOver && (
                          <span className="px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-100 text-[8px] font-bold rounded">
                            {isOutOfStock ? 'OUT' : 'LOW'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">SKU: {p.sku}</p>
                      
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-extrabold text-indigo-700">
                          ₹{resolvedShowPrice || p.retailPrice}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">Stock: {p.currentStock} {p.unitType}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock || !selectedCustomerId}
                      onClick={() => handleAddToCart(p)}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-950 text-white font-bold hover:bg-gray-900 transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-2 text-center py-8 text-xs text-gray-400 font-medium">
                  No matching inventory records found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Billing Panel Side drawer */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-50">
              3. Checkout Invoice Summary
            </h3>

            {/* Cart Elements */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
                Cart is completely empty.<br />Add products above to compile.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 border-b border-gray-50 pb-3">
                {cart.map(item => {
                  const prod = products.find(p => p.id === item.productId)!;
                  const price = selectedCustomer?.customerType === 'WHOLESALER' 
                    ? prod.wholesalePrice 
                    : prod.retailPrice;

                  return (
                    <div key={item.productId} className="flex justify-between items-start text-xs p-2 rounded-xl border border-dashed border-gray-100 bg-gray-50/20">
                      <div className="space-y-0.5 max-w-[65%]">
                        <h4 className="font-bold text-gray-800 line-clamp-1">{prod.name}</h4>
                        <p className="text-gray-400 text-[10px]">₹{price} × {item.quantity} units</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(item.productId, parseInt(e.target.value) || 0)}
                          className="w-12 text-center border bg-white rounded p-0.5 text-xs font-bold"
                        />
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Invoice billing details */}
            <div className="space-y-2.5 font-medium text-xs text-gray-500">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Shop Discount (₹)</span>
                <input 
                  type="number" 
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 text-right font-semibold border rounded p-1 text-xs"
                />
              </div>
              <div className="flex justify-between items-center animate-fadeIn">
                <span className="flex items-center gap-1.5">
                  GST
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-14 text-right font-semibold border rounded p-1 text-xs"
                    title="GST % for this bill (default from Settings)"
                  />
                  %
                </span>
                <span className="font-semibold text-gray-800">+ ₹{totals.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-gray-50 pt-3.5 flex justify-between items-end">
                <span className="text-sm font-bold text-gray-900">Grand Total Amount</span>
                <span className="text-lg font-black text-indigo-700 font-sans">
                  ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Terms and Checkout */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Payment Status Selection</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-50">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus(PaymentStatus.PAID)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      paymentStatus === PaymentStatus.PAID 
                        ? 'bg-gray-950 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    PAID (Immediate Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus(PaymentStatus.CREDIT)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      paymentStatus === PaymentStatus.CREDIT 
                        ? 'bg-rose-100 text-rose-800 shadow-sm font-black' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    CREDIT (Store Debt)
                  </button>
                </div>
              </div>

              {/* CREDIT workflow constraints validation requirements trigger */}
              {paymentStatus === PaymentStatus.CREDIT && (
                <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2.5 animate-fadeIn">
                  <div className="flex items-start gap-1.5 text-xs text-rose-800">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold">Promise-To-Pay (PTP) is Required</span>
                      <p className="text-[10px] text-rose-600 mt-0.5">
                        Updates client ledger, increases Outstanding balance, and locks automated WhatsApp triggers on schedules.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-rose-700 uppercase mb-1">
                      PTP Date Limit Selection
                    </label>
                    <input 
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={ptpDate}
                      onChange={(e) => setPtpDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-rose-200 rounded-lg text-rose-950 font-bold focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>
              )}

              {/* Notifications */}
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium flex items-center gap-1.5 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-medium border border-emerald-100">
                  {successMsg}
                </div>
              )}

              <button
                type="button"
                disabled={cart.length === 0 || !selectedCustomerId || submitting}
                onClick={handleProceedCheckout}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {paymentStatus === PaymentStatus.CREDIT ? 'Commit Outstanding & Schedule Reminders' : 'Checkout & Print Invoice'}
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

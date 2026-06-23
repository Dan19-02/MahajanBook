import React, { useState, useMemo } from 'react';
import { Search, UserPlus, BookOpen, IndianRupee, Pencil, Trash2 } from 'lucide-react';
import { Customer, Transaction } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  transactions: Transaction[];
  onAddCustomer: (customer: Customer) => void;
  onReceivePayment: (customerId: string, amount: number, note: string) => void;
  onUpdateCustomer: (id: string, fields: Partial<Omit<Customer, 'id' | 'createdAt' | 'balance'>>) => void;
  onDeleteCustomer: (id: string) => void;
}

export default function CustomersView({ customers, transactions, onAddCustomer, onReceivePayment, onUpdateCustomer, onDeleteCustomer }: CustomersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustIdForWallet, setSelectedCustIdForWallet] = useState<string | null>(null);
  
  // Create / edit customer state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstIn, setGstIn] = useState('');
  const [customerType, setCustomerType] = useState<'RETAILER' | 'WHOLESALER'>('RETAILER');

  // Ledger Add Transaction states
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState<string>('');

  const [activeCustomerLogsTab, setActiveCustomerLogsTab] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setName(''); setMobile(''); setBusinessName(''); setGstIn(''); setCustomerType('RETAILER');
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (c: Customer) => {
    setEditingId(c.id);
    setName(c.name); setMobile(c.mobile);
    setBusinessName(c.businessName || ''); setGstIn(c.gstIn || ''); setCustomerType(c.customerType);
    setShowForm(true);
  };

  const handleDelete = (c: Customer) => {
    if (window.confirm(`Delete "${c.name}"? Their invoice history is kept.`)) onDeleteCustomer(c.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) return;

    const fields = {
      name: name.trim(),
      mobile: mobile.trim(),
      businessName: businessName.trim() || undefined,
      gstIn: gstIn.trim().toUpperCase() || undefined,
      customerType,
    };

    if (editingId) {
      onUpdateCustomer(editingId, fields);
    } else {
      onAddCustomer({ id: `c-${Date.now()}`, balance: 0, createdAt: new Date().toISOString(), ...fields });
    }
    resetForm();
  };

  const handlePayDown = (e: React.FormEvent, custId: string) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;

    onReceivePayment(custId, paymentAmount, paymentNote || 'Manual Walk-In Payment Collected');
    setSelectedCustIdForWallet(null);
    setPaymentAmount(0);
    setPaymentNote('');
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      (c.businessName && c.businessName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-fadeIn">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Store Ledgers Directory</h2>
          <p className="text-xs text-gray-500 mt-1">Check individual wholesale or retail client accounts, balance dues, isGST status, and journal logs.</p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : openAddForm())}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <UserPlus className="w-4.5 h-4.5" /> {showForm ? 'Close' : 'Add Customer'}
        </button>
      </div>

      {/* Form add */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-gray-800">{editingId ? 'Edit Customer' : 'New Customer'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer / Contact Name *</label>
              <input 
                type="text" required placeholder="e.g. Anand Kumar" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp Cell Contact *</label>
              <input 
                type="text" required placeholder="10-digit Indian No." value={mobile} onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Slogan / Store Name</label>
              <input 
                type="text" placeholder="e.g. Anand Medicos" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">GST Identification (GSTIN)</label>
              <input 
                type="text" placeholder="Optional 15-digit code" value={gstIn} onChange={(e) => setGstIn(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                <input 
                  type="radio" name="custFormType" checked={customerType === 'RETAILER'} 
                  onChange={() => setCustomerType('RETAILER')} className="text-indigo-600"
                />
                Retailer Base (Locks Retail pricing on bills)
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                <input 
                  type="radio" name="custFormType" checked={customerType === 'WHOLESALER'} 
                  onChange={() => setCustomerType('WHOLESALER')} className="text-indigo-600"
                />
                Wholesaler Base (Loads wholesale discounted price profiles on bills)
              </label>
            </div>
            <div className="flex gap-2.5">
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
                {editingId ? 'Save Changes' : 'Initialize Account'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lookup filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 relative">
        <Search className="absolute left-7 top-6.5 w-4.5 h-4.5 text-gray-400" />
        <input 
          type="text"
          placeholder="Filter accounts by customer names, mobile phone, or store names..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Grid containing ledger customer cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map(cust => {
          const isOwe = cust.balance > 0;
          const isLogsOpen = activeCustomerLogsTab === cust.id;
          const isPayOpen = selectedCustIdForWallet === cust.id;

          const logs = transactions.filter(t => t.customerId === cust.id);

          return (
            <div key={cust.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
              
              {/* Account Card Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-sm">{cust.name}</h4>
                    <span className="px-2 py-0.5 bg-gray-950 font-black text-white text-[8px] uppercase rounded">
                      {cust.customerType}
                    </span>
                  </div>
                  {cust.businessName && <p className="text-xs text-indigo-700 font-bold">{cust.businessName}</p>}
                  <p className="text-[11px] text-gray-500">GSM: <span className="font-semibold">{cust.mobile}</span></p>
                  {cust.gstIn && <p className="text-[10px] text-gray-400 font-mono">GSTIN: {cust.gstIn}</p>}
                </div>

                {/* Outstanding ledger badge */}
                <div className="text-right space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Outstanding Balance</span>
                  <span className={`text-base font-extrabold block ${isOwe ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>
                    ₹{cust.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions actions controls */}
              <div className="flex flex-wrap gap-2 pt-2.5 border-t border-gray-50">
                <button
                  onClick={() => {
                    setActiveCustomerLogsTab(isLogsOpen ? null : cust.id);
                    setSelectedCustIdForWallet(null);
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                    isLogsOpen ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4" /> LEDGER PROFILE ({logs.length})
                </button>
                <button
                  onClick={() => {
                    setSelectedCustIdForWallet(isPayOpen ? null : cust.id);
                    setActiveCustomerLogsTab(null);
                  }}
                  className="text-xs font-bold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <IndianRupee className="w-4 h-4" /> COLLECT CASH
                </button>
                <button
                  onClick={() => handleEdit(cust)}
                  className="text-xs font-bold bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Edit customer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cust)}
                  className="text-xs font-bold bg-rose-50 text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Delete customer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* CASH COLLECTION FORM */}
              {isPayOpen && (
                <form onSubmit={(e) => handlePayDown(e, cust.id)} className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100/50 space-y-3 animate-fadeIn">
                  <h5 className="text-xs font-extrabold text-emerald-800">Log Cash Payment (Reduces Ledger dues)</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Amount (₹)</label>
                      <input 
                        type="number" required min="1" max={cust.balance}
                        value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Description/Ref</label>
                      <input 
                        type="text" placeholder="e.g. Cash, GPay, Ref-91"
                        value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button 
                      type="button" onClick={() => setSelectedCustIdForWallet(null)}
                      className="px-2.5 py-1 text-xs border font-semibold text-gray-500 rounded bg-white hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={paymentAmount <= 0}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs rounded transition-all disabled:opacity-50"
                    >
                      Receive & Post
                    </button>
                  </div>
                </form>
              )}

              {/* LOGS TAB VIEW */}
              {isLogsOpen && (
                <div className="p-3 bg-gray-50/60 rounded-xl border border-gray-100 space-y-2 animate-fadeIn max-h-56 overflow-y-auto">
                  <h5 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pb-1 border-b">Active Transaction Logs Ledger</h5>
                  {logs.length === 0 ? (
                    <p className="text-[11px] text-gray-400 font-medium py-4 text-center">No transactions registered yet. This account is squeaky clean.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {logs.map(log => (
                        <div key={log.id} className="text-[11px] flex justify-between items-center bg-white p-2 border border-gray-100/50 rounded-lg">
                          <div>
                            <span className="font-bold text-gray-800 block line-clamp-1">{log.description}</span>
                            <span className="text-[9px] text-gray-400 font-mono">{log.createdAt.split('T')[0]}</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className={`font-extrabold ${log.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {log.type === 'DEBIT' ? '+' : '-'} ₹{log.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}

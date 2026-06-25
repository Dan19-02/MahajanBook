import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import JsBarcode from 'jsbarcode';
import { Printer, X, Minus, Plus } from 'lucide-react';
import { Product } from '../types';

interface BarcodeLabelProps {
  product: Product;
  storeName?: string;
  onClose: () => void;
}

const inr = (n: number) => n.toLocaleString('en-IN');

/** The value encoded: the product's barcode if set, else its SKU. */
const codeFor = (p: Product): string => (p.barcode && p.barcode.trim()) || p.sku;

/** A single printable shelf label with a Code 128 barcode. */
const OneLabel: React.FC<{ product: Product; storeName?: string }> = ({ product, storeName }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const value = codeFor(product);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.6,
        height: 46,
        displayValue: true,
        margin: 0,
        fontSize: 12,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      /* invalid value — leave the svg empty */
    }
  }, [value]);

  return (
    <div
      style={{
        border: '1px solid #000',
        borderRadius: 6,
        padding: '8px 10px',
        width: '2.4in',
        textAlign: 'center',
        background: '#fff',
        color: '#000',
      }}
    >
      {storeName && (
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{storeName}</div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, margin: '2px 0' }}>{product.name}</div>
      <div style={{ fontSize: 14, fontWeight: 800 }}>₹{inr(product.retailPrice)}</div>
      <svg ref={svgRef} style={{ width: '100%' }} />
      <div style={{ fontSize: 10, fontFamily: 'monospace' }}>SKU: {product.sku}</div>
    </div>
  );
}

/** Modal that previews and prints one or more identical barcode labels. */
export default function BarcodeLabel({ product, storeName, onClose }: BarcodeLabelProps) {
  const [qty, setQty] = useState(1);
  const hasCode = codeFor(product).trim() !== '';

  return createPortal(
    <div className="receipt-overlay fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-md my-4">
        {/* Action bar (not printed) */}
        <div className="flex justify-between items-center mb-3 no-print">
          <h3 className="text-sm font-bold text-white">Barcode label</h3>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-1" title="Copies to print">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-1.5 text-white hover:bg-white/10 rounded cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
              <span className="text-white text-xs font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(60, q + 1))} className="p-1.5 text-white hover:bg-white/10 rounded cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <button onClick={() => window.print()} disabled={!hasCode} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>

        {/* Printable area */}
        <div className="print-area bg-white rounded-xl p-4">
          {!hasCode ? (
            <p className="text-sm text-slate-600 text-center py-6">This product has no barcode or SKU to encode.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {Array.from({ length: qty }).map((_, i) => (
                <OneLabel key={i} product={product} storeName={storeName} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

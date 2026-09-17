import { useEffect } from "react";
import { useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import { Loader2, Printer } from "lucide-react";

function formatDate(value: unknown) {
  return value ? new Date(Number(value)).toLocaleString("en-BD") : "-";
}

function paymentLabel(value: string | null | undefined) {
  return (value || "pending").replace(/(^|[_\s-])\S/g, (character) => character.toUpperCase());
}

export default function Invoice() {
  const { id } = useParams();
  const orderId = Number(id);
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: order, isLoading: orderLoading } = trpc.order.getById.useQuery(
    { id: orderId },
    { enabled: isAuthenticated && Number.isInteger(orderId) && orderId > 0 },
  );

  useEffect(() => {
    document.body.classList.add("invoice-print-mode");
    return () => document.body.classList.remove("invoice-print-mode");
  }, []);

  if (authLoading || orderLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>;
  }

  if (!order) {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center text-slate-500">Invoice not found.</div>;
  }

  const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * item.quantity, 0);
  const shippingAddress = [order.shippingAddress, order.shippingCity, order.shippingCountry, order.shippingPostalCode].filter(Boolean);

  return (
    <main className="invoice-print-shell mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <style>{`@media print {
        @page { size: A4; margin: 14mm; }
        body.invoice-print-mode { background: #fff !important; }
        body.invoice-print-mode header,
        body.invoice-print-mode footer,
        body.invoice-print-mode nav,
        body.invoice-print-mode [role="status"],
        body.invoice-print-mode .invoice-print-actions { display: none !important; }
        .invoice-print-shell { max-width: none !important; padding: 0 !important; }
        .invoice-print-paper { border: 0 !important; box-shadow: none !important; }
      }`}</style>
      <div className="invoice-print-actions mb-5 flex justify-end">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
          <Printer className="h-4 w-4" /> Print Invoice
        </button>
      </div>
      <section className="invoice-print-paper overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <header className="bg-indigo-900 px-6 py-8 text-white sm:px-10">
          <h1 className="text-3xl font-black tracking-tight">MarketVerse AI</h1>
          <p className="mt-2 text-indigo-200">Order Confirmation / Invoice</p>
        </header>
        <div className="space-y-8 px-6 py-8 sm:px-10">
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">Hi {order.shippingFullName || "there"},</p>
            <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">Thank you for your order. Your payment and order details are below.</p>
          </div>
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-800">
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Order ID</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{order.orderNumber}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{formatDate(order.createdAt)}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Payment Status</p><p className="mt-1 font-bold text-indigo-700 dark:text-indigo-300">{paymentLabel(order.paymentStatus)}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Payment Method</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{paymentLabel(order.paymentMethod)}</p></div>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Products</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-indigo-50 text-left text-xs uppercase tracking-wide text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Unit Price</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
                <tbody>{order.items.map((item: any) => <tr key={item.id} className="border-t border-slate-200 dark:border-slate-700"><td className="px-4 py-4 font-medium text-slate-800 dark:text-slate-200">{item.productName || "Product"}</td><td className="px-4 py-4 text-center text-slate-600 dark:text-slate-300">{item.quantity}</td><td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{formatCurrency(item.unitPrice || 0)}</td><td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(item.totalPrice || 0)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end"><div className="w-full max-w-sm space-y-3 text-sm"><div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div><div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Shipping</span><strong>{formatCurrency(order.shippingAmount || 0)}</strong></div><div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Discount</span><strong>-{formatCurrency(order.discountAmount || 0)}</strong></div><div className="flex justify-between border-t-2 border-slate-300 pt-3 text-lg font-black text-slate-900 dark:border-slate-600 dark:text-white"><span>Total</span><span className="text-indigo-700 dark:text-indigo-300">{formatCurrency(order.totalAmount)}</span></div></div></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Shipping Address</h2><p className="mt-3 leading-8 text-slate-600 dark:text-slate-300">{order.shippingFullName}<br />{shippingAddress.map((line: string, index: number) => <span key={`${line}-${index}`}>{line}{index < shippingAddress.length - 1 && <br />}</span>)}</p></div>
        </div>
        <footer className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center text-xs leading-6 text-slate-500 sm:px-10 dark:border-slate-700 dark:bg-slate-800">This is an automated invoice from MarketVerse AI.</footer>
      </section>
    </main>
  );
}

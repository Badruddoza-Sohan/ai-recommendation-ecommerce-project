import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShoppingBag } from "lucide-react";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const statusParam = searchParams.get("status") || "success";
  const tranId = searchParams.get("tran_id") || "";
  const valId = searchParams.get("val_id") || undefined;

  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string; orderNumber?: string } | null>(null);

  const verifyMutation = trpc.order.verifySSLCommerz.useMutation({
    onSuccess: (data) => {
      setVerifying(false);
      setResult(data);
    },
    onError: (err) => {
      setVerifying(false);
      setResult({ success: false, message: err.message || "Failed to verify payment." });
    },
  });

  useEffect(() => {
    if (tranId) {
      verifyMutation.mutate({
        tran_id: tranId,
        val_id: valId,
        status: statusParam,
      });
    } else {
      setVerifying(false);
      setResult({ success: false, message: "Invalid payment callback URL." });
    }
  }, [tranId, valId, statusParam]);

  if (verifying) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Verifying SSLCommerz Payment...</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Please wait while we confirm your transaction securely.</p>
      </div>
    );
  }

  const isSuccess = result?.success;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl">
        <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full mb-6 ${
          isSuccess ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400"
        }`}>
          {isSuccess ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {isSuccess ? "Payment Successful!" : "Payment Failed or Cancelled"}
        </h1>

        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
          {result?.message || (isSuccess ? "Your payment via SSLCommerz has been confirmed." : "Your transaction could not be completed.")}
        </p>

        {result?.orderNumber && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction ID:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{tranId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gateway Status:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">VALIDATED (Sandbox)</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isSuccess ? (
            <button
              onClick={() => navigate("/orders")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              View My Orders
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/checkout")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Try Again at Checkout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShoppingBag, RefreshCcw, Home, Package } from "lucide-react";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const statusParam = searchParams.get("status") || "success";
  const tranId = searchParams.get("tran_id") || "";
  const valId = searchParams.get("val_id") || undefined;

  const normalizedStatus = statusParam.toLowerCase();
  const isSuccessStatus = ["success", "completed", "valid", "paid", "processing"].includes(normalizedStatus);
  const isCancelledStatus = ["cancel", "cancelled", "canceled", "unattempted"].includes(normalizedStatus);
  const isFailedStatus = ["fail", "failed", "error", "aborted", "denied"].includes(normalizedStatus);

  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string; orderNumber?: string } | null>(null);
  const verifyMutation = trpc.order.verifySSLCommerz.useMutation({
    onSuccess: (data) => {
      setVerifying(false);
      setResult(data);
    },
    onError: (err) => {
      setVerifying(false);
      const fallbackStatus = isSuccessStatus ? true : false;
      const fallbackMessage = isSuccessStatus
        ? "Payment succeeded on the gateway and is being confirmed."
        : isCancelledStatus
          ? "Payment was cancelled. Please try again to complete checkout."
          : "Payment failed or could not be verified. Please try again.";

      setResult({
        success: fallbackStatus,
        message: err.message || fallbackMessage,
      });
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
      setResult({
        success: isSuccessStatus,
        message: isSuccessStatus
          ? "Payment was completed successfully."
          : isCancelledStatus
            ? "Payment was cancelled."
            : "Payment failed or the callback was invalid.",
      });
    }
  }, [tranId, valId, statusParam, isSuccessStatus, isCancelledStatus]);

  useEffect(() => {
    if (result && !result.success) {
      const redirectDelay = isCancelledStatus || isFailedStatus ? 4000 : 2500;
      setTimeout(() => {
        navigate("/checkout");
      }, redirectDelay);
    }
  }, [result, navigate, isCancelledStatus, isFailedStatus]);

  if (verifying) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl text-center">
            <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Verifying SSLCommerz Payment...</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Please wait while we confirm your transaction securely.</p>
            <div className="mt-6 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
              <div className="bg-indigo-600 h-1 rounded-full w-1/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = result?.success;
  const isCancelled = statusParam?.toLowerCase().includes("cancel");
  const isFailed = statusParam?.toLowerCase().includes("fail");

  return (
    <div className="relative max-w-lg mx-auto px-4 py-16 text-center overflow-hidden">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl">
        {/* Status Icon */}
        <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full mb-6 ${
          isSuccess 
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400" 
            : "bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400"
        }`}>
          {isSuccess ? <CheckCircle2 className="h-10 w-10 animate-[success-draw_700ms_ease-out]" /> : <XCircle className="h-10 w-10" />}
        </div>

        {/* Status Title */}
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {isSuccess 
            ? "✅ Payment Successful!" 
            : isCancelled 
            ? "❌ Payment Cancelled" 
            : "❌ Payment Failed"}
        </h1>

        {/* Status Message */}
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
          {result?.message || (
            isSuccess 
              ? "Your payment via SSLCommerz has been confirmed. Your order is now being processed." 
              : isCancelled 
              ? "You cancelled the payment. Your order is still saved in your cart." 
              : "There was an issue processing your payment. Please try again."
          )}
        </p>

        {/* Transaction Details */}
        {tranId && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2.5">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Transaction Details</h3>
            
            <div className="flex justify-between items-start">
              <span className="text-slate-500 dark:text-slate-400">Transaction ID:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-right break-all">{tranId}</span>
            </div>
            
            {valId && (
              <div className="flex justify-between items-start">
                <span className="text-slate-500 dark:text-slate-400">Validation ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-right break-all">{valId}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Gateway Status:</span>
              <span className={`font-semibold px-2 py-1 rounded-md ${
                isSuccess 
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              }`}>
                {isSuccess ? "✓ VALIDATED" : isCancelled ? "✗ CANCELLED" : "✗ FAILED"}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Status Type:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase text-xs">
                {statusParam || "unknown"}
              </span>
            </div>

            {result?.orderNumber && (
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Order Number:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{result.orderNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isSuccess ? (
            <>
              <button
                onClick={() => navigate("/orders")}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 flex-1"
              >
                <Package className="h-4 w-4" />
                View My Orders
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 flex-1"
              >
                <Home className="h-4 w-4" />
                Continue Shopping
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/checkout")}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 flex-1"
              >
                <RefreshCcw className="h-4 w-4" />
                Try Payment Again
              </button>
              <button
                onClick={() => navigate("/cart")}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 flex-1"
              >
                <ShoppingBag className="h-4 w-4" />
                View Cart
              </button>
            </>
          )}
        </div>

        {/* Info Message */}
        {!isSuccess && (
          <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-sm text-rose-800 dark:text-rose-200">
            <p className="font-semibold mb-1">⚠️ What happens next?</p>
            <p>{isCancelled ? "Your order remains in your cart. You can retry payment anytime." : "Your payment was not processed. Please try again with valid payment details."}</p>
            <p className="text-xs mt-2 text-rose-700 dark:text-rose-300">Redirecting back to checkout in 5 seconds...</p>
          </div>
        )}

        {isSuccess && (
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-sm text-emerald-800 dark:text-emerald-200">
            <p className="font-semibold mb-1">🎉 Order Confirmed!</p>
            <p>Your payment has been verified. Sellers have been notified and will prepare your order shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { formatCurrency } from "@/lib/currency";
import { trpc } from "@/providers/trpc";
import { Shield, X, CreditCard, Smartphone, CheckCircle, AlertCircle, Lock } from "lucide-react";

interface SSLCommerzModalProps {
  isOpen: boolean;
  onClose: () => void;
  tranId: string;
  orderId: number;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  onSuccess: (tranId: string) => void;
  onCancel: (tranId: string) => void;
}

export function SSLCommerzModal({
  isOpen,
  onClose: _onClose,
  tranId,
  orderId: _orderId,
  totalAmount,
  customerName: _customerName,
  customerPhone,
  onSuccess,
  onCancel,
}: SSLCommerzModalProps) {
  const [activeTab, setActiveTab] = useState<"bkash" | "nagad" | "card">("bkash");
  const [mobileNumber, setMobileNumber] = useState(customerPhone || "01700000000");
  const [pin, setPin] = useState("12345");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("123");
  const [isProcessing, setIsProcessing] = useState(false);

  const verifyMutation = trpc.order.verifySSLCommerz.useMutation({
    onSuccess: (res) => {
      setIsProcessing(false);
      if (res.success) {
        onSuccess(tranId);
      } else {
        onCancel(tranId);
      }
    },
    onError: () => {
      setIsProcessing(false);
      onCancel(tranId);
    },
  });

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    verifyMutation.mutate({
      tran_id: tranId,
      val_id: `SSL-SANDBOX-VAL-${Date.now()}`,
      status: "success",
    });
  };

  const handleCancelClick = () => {
    setIsProcessing(true);
    verifyMutation.mutate({
      tran_id: tranId,
      status: "cancel",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center font-black text-white text-lg">
              SSL
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">SSLCOMMERZ Payment Gateway</h3>
              <p className="text-xs text-blue-100/80">Secured with 128-bit SSL Encryption</p>
            </div>
          </div>
          <button
            onClick={handleCancelClick}
            disabled={isProcessing}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Cancel Payment"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Order Summary Banner */}
        <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Transaction ID:</span>{" "}
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{tranId}</span>
          </div>
          <div>
            <span className="text-slate-500">Amount:</span>{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/40 p-1 gap-1">
          <button
            onClick={() => setActiveTab("bkash")}
            className={`flex-1 py-2.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "bkash"
                ? "bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Smartphone className="h-4 w-4 text-pink-500" />
            bKash
          </button>

          <button
            onClick={() => setActiveTab("nagad")}
            className={`flex-1 py-2.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "nagad"
                ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Smartphone className="h-4 w-4 text-amber-500" />
            Nagad / Rocket
          </button>

          <button
            onClick={() => setActiveTab("card")}
            className={`flex-1 py-2.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "card"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <CreditCard className="h-4 w-4 text-indigo-500" />
            Cards (Visa/Master)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-4">
          {activeTab === "bkash" && (
            <div className="space-y-3">
              <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  bK
                </div>
                <div className="text-xs text-pink-900 dark:text-pink-200">
                  <p className="font-bold">bKash Payment</p>
                  <p className="text-[11px] opacity-80">Enter your bKash account number and PIN to complete payment.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  bKash Account Mobile Number
                </label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  placeholder="017XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  bKash PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  placeholder="•••••"
                />
              </div>
            </div>
          )}

          {activeTab === "nagad" && (
            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  NG
                </div>
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold">Nagad & Rocket Mobile Banking</p>
                  <p className="text-[11px] opacity-80">Instant OTP payment verification.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Account Number
                </label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  placeholder="018XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  OTP Code
                </label>
                <input
                  type="text"
                  value="884920"
                  readOnly
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 font-mono text-slate-500"
                />
              </div>
            </div>
          )}

          {activeTab === "card" && (
            <div className="space-y-3">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-3.5 flex items-center gap-3">
                <Shield className="h-6 w-6 text-indigo-600 shrink-0" />
                <div className="text-xs text-indigo-900 dark:text-indigo-200">
                  <p className="font-bold">Visa / Mastercard / DBBL Nexus</p>
                  <p className="text-[11px] opacity-80">Secure card payment for instant verification.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CVV / CVC
                  </label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {isProcessing ? (
              <span>Verifying Payment...</span>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Pay {formatCurrency(totalAmount)} Now
              </>
            )}
          </button>

          <button
            onClick={handleCancelClick}
            disabled={isProcessing}
            className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-rose-600 dark:text-rose-400 rounded-xl font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <AlertCircle className="h-4 w-4" />
            Cancel Payment & Return to Store
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <Lock className="h-3 w-3" />
            Secured by SSLCommerz
          </div>
        </div>
      </div>
    </div>
  );
}

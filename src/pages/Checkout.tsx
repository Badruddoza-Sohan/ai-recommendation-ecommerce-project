import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import { determineDeliveryZone } from "@/lib/deliveryFees";
import { SSLCommerzModal } from "@/components/SSLCommerzModal";
import { broadcastLiveEvent } from "@/lib/realtimeSync";
import {
  CreditCard,
  Truck,
  Shield,
  Loader2,
  Check,
} from "lucide-react";

export default function Checkout() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: cart } = trpc.cart.get.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const createOrder = trpc.order.create.useMutation({
    onSuccess: (result) => {
      utils.cart.get.invalidate();
      broadcastLiveEvent("ORDER_CREATED", { orderId: result?.orderId });
      setOrderPlaced(true);
      if (result?.trackingNumber) {
        setForm((current) => ({ ...current, paymentMethod: current.paymentMethod }));
      }
    },
  });

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [sslModalData, setSslModalData] = useState<{ isOpen: boolean; tranId: string; orderId: number } | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    address: "",
    district: "",
    country: "Bangladesh",
    postalCode: "",
    paymentMethod: "sslcommerz",
    accountNumber: "",
    transactionId: "",
  });

  const initiateSSLCommerz = trpc.order.initiateSSLCommerz.useMutation({
    onSuccess: (result) => {
      utils.cart.get.invalidate();
      if (result.tranId) {
        setSslModalData({
          isOpen: true,
          tranId: result.tranId,
          orderId: result.orderId,
        });
      }
    },
  });

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Sign in to complete checkout</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Add items to your cart and sign in at the payment step to complete your order.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-6 py-3 border border-slate-300 text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center h-20 w-20 bg-green-100 dark:bg-green-900/50 rounded-full mb-6">
          <Check className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Order Placed Successfully!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Thank you for your purchase. Your order has been received and is being processed.
        </p>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          Order saved successfully. You can view your order status and tracking details in your orders dashboard.
        </div>
        <button
          onClick={() => navigate("/orders")}
          className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          View My Orders
        </button>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-lg text-slate-500">Your cart is empty</p>
        <button
          onClick={() => navigate("/products")}
          className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.paymentMethod === "sslcommerz") {
      initiateSSLCommerz.mutate({
        shippingAddress: form.address,
        shippingCity: form.district,
        shippingCountry: form.country,
        shippingPostalCode: form.postalCode,
        customerName: form.fullName,
        customerEmail: form.email,
        customerPhone: "01700000000",
        origin: window.location.origin,
      });
    } else {
      createOrder.mutate({
        shippingAddress: form.address,
        shippingCity: form.district,
        shippingCountry: form.country,
        shippingPostalCode: form.postalCode,
        paymentMethod: form.paymentMethod === "cod" ? "cod" : "pay_now",
      });
    }
  };

  // Dynamic Courier Delivery Fee computation based on district / destination
  const deliveryZone = determineDeliveryZone(form.district || "Dhaka");
  const rawDeliveryFee = (cart?.items || []).reduce((sum: number, item: any) => {
    const fee = deliveryZone === "inside_dhaka"
      ? (item.deliveryFeeInsideDhaka ?? 60)
      : (item.deliveryFeeOutsideDhaka ?? 120);
    return sum + fee * (item.quantity ?? 1);
  }, 0);
  const shipping = rawDeliveryFee > 0 ? rawDeliveryFee : (deliveryZone === "inside_dhaka" ? 60 : 120);
  const tax = (cart?.total || 0) * 0.05;
  const total = (cart?.total || 0) + shipping + tax;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipping Information */}
            <div className="glass-card rounded-2xl p-6 sm:p-8 animate-slide-left">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                  <Truck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Shipping Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Dhaka"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Post Code *
                  </label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="1205"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="glass-card rounded-2xl p-6 sm:p-8 animate-slide-left" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                  <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Payment Method</h2>
              </div>

              {/* Payment Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: "sslcommerz", label: "SSLCommerz Gateway", icon: "💳", tag: "bKash / Nagad / Cards / Rocket", badge: "Instant Pay" },
                  { value: "cod", label: "Cash on Delivery", icon: "💵", tag: "Pay at Doorstep" },
                ].map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      form.paymentMethod === method.value
                        ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={form.paymentMethod === method.value}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      className="h-4 w-4 text-indigo-600 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between gap-1.5">
                        <span className="truncate"><span>{method.icon}</span> {method.label}</span>
                        {method.badge && (
                          <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0">
                            {method.badge}
                          </span>
                        )}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{method.tag}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={createOrder.isPending || initiateSSLCommerz.isPending}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-indigo-500/40 animate-slide-left group overflow-hidden relative"
              style={{ animationDelay: '200ms' }}
            >
              <div className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />

              {createOrder.isPending || initiateSSLCommerz.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Initiating Gateway...
                </>
              ) : form.paymentMethod === "sslcommerz" ? (
                `Pay with SSLCommerz - ${formatCurrency(total)}`
              ) : (
                `Place Order - ${formatCurrency(total)}`
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-6 sm:p-8 sticky top-24 animate-fade-up">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Order Summary</h2>

            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              {cart.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3">

                  <img src={`${item.imageUrl}`} alt={`${item.name}`} className="w-12 h-12 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatCurrency((item.price ?? 0) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(cart.total)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Courier Delivery Fee</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                    {deliveryZone === "inside_dhaka" ? "Pathao / Steadfast (Inside Dhaka)" : "Steadfast / RedX (Outside Dhaka)"}
                  </span>
                </div>
                <span className="text-slate-900 dark:text-white font-semibold">{formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tax (5% VAT)</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-slate-200 dark:border-slate-700 pt-3">
                <span className="text-slate-900 dark:text-white">Total</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/50 py-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
              <Shield className="h-4 w-4 text-emerald-500" />
              Secure SSL Encrypted Transaction
            </div>
          </div>
        </div>
      </div>

      {sslModalData && (
        <SSLCommerzModal
          isOpen={sslModalData.isOpen}
          onClose={() => setSslModalData(null)}
          tranId={sslModalData.tranId}
          orderId={sslModalData.orderId}
          totalAmount={total}
          customerName={form.fullName || "Customer"}
          customerPhone={form.accountNumber || "01700000000"}
          onSuccess={(tranId) => {
            setSslModalData(null);
            navigate(`/payment-callback?status=success&tran_id=${tranId}`);
          }}
          onCancel={(tranId) => {
            setSslModalData(null);
            navigate(`/payment-callback?status=cancel&tran_id=${tranId}`);
          }}
        />
      )}
    </div>
  );
}

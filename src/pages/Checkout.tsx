import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import { determineDeliveryZone } from "@/lib/deliveryFees";
import { toast } from "@/lib/toast";
import { BANGLADESH_DIVISIONS, BANGLADESH_LOCATIONS, type BangladeshDivision } from "@/lib/bangladeshLocations";

import { broadcastLiveEvent } from "@/lib/realtimeSync";
import {
  CreditCard,
  Truck,
  Shield,
  Loader2,
  CheckCircle2,
  Package,
  ShoppingBag,
} from "lucide-react";

interface BuyNowItem {
  productId: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  quantity: number;
  attributes?: Record<string, string>;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [buyNowItem, setBuyNowItem] = useState<BuyNowItem | null>(() => {
    try {
      const saved = sessionStorage.getItem("buy_now_item");
      return saved ? JSON.parse(saved) as BuyNowItem : null;
    } catch {
      return null;
    }
  });
  const { data: cart } = trpc.cart.get.useQuery(undefined, { enabled: isAuthenticated && !buyNowItem });
  const utils = trpc.useUtils();
  const createOrder = trpc.order.create.useMutation({
    onSuccess: (result) => {
      utils.cart.get.invalidate();
      broadcastLiveEvent("ORDER_CREATED", { orderId: result?.orderId });
      setOrderPlaced({ orderNumber: result?.orderNumber || String(result?.orderId || ""), total: result?.totalAmount || checkoutSubtotal, itemCount: checkoutItems.length });
      sessionStorage.removeItem("buy_now_item");
      setBuyNowItem(null);
      if (result?.trackingNumber) {
        setForm((current) => ({ ...current, paymentMethod: current.paymentMethod }));
      }
    },
    onError: (error) => {
      toast.error(error.message || "Could not place the order. Please try again.");
    },
  });

  const [orderPlaced, setOrderPlaced] = useState<{ orderNumber: string; total: number; itemCount: number } | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    division: "" as BangladeshDivision | "",
    district: "",
    country: "Bangladesh",
    postalCode: "",
    paymentMethod: "sslcommerz",
    accountNumber: "",
    transactionId: "",
  });

  const getDivisionForDistrict = (district: string): BangladeshDivision | "" => {
    const normalizedDistrict = district.split(",")[0].trim().toLowerCase();
    const division = BANGLADESH_DIVISIONS.find((candidate) =>
      BANGLADESH_LOCATIONS[candidate].some((location) => location.toLowerCase() === normalizedDistrict)
    );
    return division || "";
  };

  useEffect(() => {
    if (!user) return;
    const profileCity = user.city || "";
    const [profileDistrict, profileDivision] = profileCity.split(",").map((value) => value.trim());
    const district = profileDistrict || (BANGLADESH_LOCATIONS[getDivisionForDistrict(profileCity)]?.[0] ? profileCity : "");
    const division = (profileDivision as BangladeshDivision) || getDivisionForDistrict(district);
    setForm((current) => ({
      ...current,
      fullName: current.fullName || user.name || "",
      phone: current.phone || user.phone || "",
      email: current.email || user.email || "",
      address: current.address || user.address || "",
      division: current.division || division,
      district: current.district || district,
      country: current.country || user.country || "Bangladesh",
    }));
  }, [user]);

  const checkoutItems = buyNowItem ? [buyNowItem] : (cart?.items || []);
  const checkoutSubtotal = buyNowItem ? buyNowItem.price * buyNowItem.quantity : (cart?.total || 0);

  const initiateSSLCommerz = trpc.order.initiateSSLCommerz.useMutation({
    onSuccess: (result) => {
      utils.cart.get.invalidate();
      if (result.success && result.gatewayUrl) {
        // Redirect to real SSLCommerz payment gateway
        window.location.href = result.gatewayUrl;
      } else {
        toast.error("Failed to initiate payment. Please try again.");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Payment initiation failed");
    },
  });

  useEffect(() => {
    if (orderPlaced) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [orderPlaced]);

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
      <div className="relative min-h-[70vh] max-w-2xl mx-auto px-4 py-16 text-center overflow-hidden">
        <div className="relative rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl dark:border-emerald-900 dark:bg-slate-800">
          <div className="mx-auto mb-6 flex h-24 w-24 animate-[success-pop_600ms_ease-out] items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <CheckCircle2 className="h-14 w-14 animate-[success-draw_700ms_ease-out] text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Order confirmed</p>
          <h1 className="mb-3 text-3xl font-black text-slate-900 dark:text-white">Thank you for your purchase!</h1>
          <p className="mb-6 text-slate-500 dark:text-slate-400">Your order is confirmed and is being prepared for delivery.</p>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-500">Order number</p><p className="mt-1 font-mono font-bold text-slate-900 dark:text-white">{orderPlaced.orderNumber}</p></div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-500">Order total</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{formatCurrency(orderPlaced.total)}</p><p className="text-xs text-slate-500">{orderPlaced.itemCount} item{orderPlaced.itemCount === 1 ? "" : "s"}</p></div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => navigate("/orders")} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"><Package className="h-4 w-4" />View My Orders</button>
            <button onClick={() => navigate("/products")} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"><ShoppingBag className="h-4 w-4" />Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  if (!buyNowItem && (!cart || cart.items.length === 0)) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const shippingData = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      division: form.division.trim(),
      district: form.district.trim(),
      country: form.country.trim() || "Bangladesh",
    };
    const missingField = Object.entries(shippingData).find(([, value]) => !value)?.[0];
    if (missingField) {
      const labels: Record<string, string> = {
        fullName: "Full Name",
        email: "Email",
        phone: "BD Mobile Number",
        address: "Address / Street / Area",
        division: "Division",
        district: "District",
        country: "Country",
      };
      toast.error(`Please enter your ${labels[missingField]}.`);
      return;
    }
    if (!/^(?:\+88)?01[3-9]\d{8}$/.test(shippingData.phone.replace(/[\s-]/g, ""))) {
      toast.error("Please enter a valid Bangladeshi mobile number.");
      return;
    }
    if (form.paymentMethod === "sslcommerz") {
      initiateSSLCommerz.mutate({
        shippingFullName: shippingData.fullName,
        shippingEmail: shippingData.email,
        shippingPhone: shippingData.phone,
        shippingAddress: shippingData.address,
        shippingCity: `${shippingData.district}, ${shippingData.division}`,
        shippingDistrict: shippingData.district,
        shippingCountry: shippingData.country,
        shippingPostalCode: form.postalCode,
        customerName: shippingData.fullName,
        customerEmail: shippingData.email,
        customerPhone: shippingData.phone,
        origin: window.location.origin,
        standaloneItem: buyNowItem ? {
          productId: buyNowItem.productId,
          quantity: buyNowItem.quantity,
          attributes: buyNowItem.attributes,
        } : undefined,
      });
    } else {
      createOrder.mutate({
        shippingFullName: shippingData.fullName,
        shippingEmail: shippingData.email,
        shippingPhone: shippingData.phone,
        shippingAddress: shippingData.address,
        shippingCity: `${shippingData.district}, ${shippingData.division}`,
        shippingDistrict: shippingData.district,
        shippingCountry: shippingData.country,
        shippingPostalCode: form.postalCode,
        paymentMethod: form.paymentMethod === "cod" ? "cod" : "pay_now",
        standaloneItem: buyNowItem ? {
          productId: buyNowItem.productId,
          quantity: buyNowItem.quantity,
          attributes: buyNowItem.attributes,
        } : undefined,
      });
    }
  };

  // Dynamic Courier Delivery Fee computation based on district / destination
  const deliveryZone = determineDeliveryZone(form.district || "Dhaka");
  const rawDeliveryFee = checkoutItems.reduce((sum: number, item: any) => {
    const fee = deliveryZone === "inside_dhaka"
      ? (item.deliveryFeeInsideDhaka ?? 60)
      : (item.deliveryFeeOutsideDhaka ?? 120);
    return sum + fee * (item.quantity ?? 1);
  }, 0);
  const shipping = rawDeliveryFee > 0 ? rawDeliveryFee : (deliveryZone === "inside_dhaka" ? 60 : 120);
  const tax = checkoutSubtotal * 0.05;
  const total = checkoutSubtotal + shipping + tax;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            onInvalid={(event) => {
              event.preventDefault();
              const field = event.target as HTMLInputElement | HTMLSelectElement;
              const labels: Record<string, string> = {
                fullName: "Full Name",
                email: "Email",
                phone: "BD Mobile Number",
                address: "Address / Street / Area",
                division: "Division",
                district: "District",
              };
              toast.error(`Please enter a valid ${labels[field.name] || "shipping field"}.`);
            }}
            className="space-y-6"
          >
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
                    name="fullName"
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
                    BD Mobile Number *
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    pattern={String.raw`(?:\+88)?01[3-9]\d{8}`}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="017XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    name="email"
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
                    name="address"
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
                    Division *
                  </label>
                  <select
                    name="division"
                    value={form.division}
                    onChange={(e) => setForm({ ...form, division: e.target.value as BangladeshDivision, district: "" })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select division</option>
                    {BANGLADESH_DIVISIONS.map((division) => <option key={division} value={division}>{division} Division</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    District *
                  </label>
                  <select
                    name="district"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    required
                    disabled={!form.division}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{form.division ? "Select district" : "Select division first"}</option>
                    {(form.division ? BANGLADESH_LOCATIONS[form.division] : []).map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
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
                  { value: "sslcommerz", label: "Pay Online", tag: "bKash / Nagad / Cards / Rocket", badge: "Verified by" },
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
                        <span className="truncate">{method.label}</span>
                        {method.badge && (
                          method.value === "sslcommerz" ? (
                            <span className="flex shrink-0 flex-col items-end leading-none">
                              <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{method.badge}</span>
                              <span className="mt-0.5 rounded bg-[#173f8a] px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white">SSLCOMMERZ</span>
                            </span>
                          ) : (
                            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0">
                              {method.badge}
                            </span>
                          )
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
                "Order Now"
              ) : (
                "Order Now"
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-6 sm:p-8 sticky top-24 animate-fade-up">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Order Summary</h2>

            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              {checkoutItems.map((item: any) => (
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
                <span className="text-slate-900 dark:text-white">{formatCurrency(checkoutSubtotal)}</span>
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


    </div>
  );
}

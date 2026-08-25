import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  Mic,
  Phone,
  CheckCircle2,
  ShoppingBag,
  ArrowLeft,
  Loader2,
  Volume2,
  ShieldCheck,
  XCircle,
  Truck,
  Package,
  Radio
} from "lucide-react";
import { toast } from "sonner";
import { broadcastLiveEvent } from "@/lib/realtimeSync";

interface VoiceSelectedProduct {
  id?: number;
  name: string;
  price: number | string;
  slug?: string;
  image?: string;
  category?: string;
  storeName?: string;
}

function parseNumericPrice(val: number | string | undefined | null): number {
  if (typeof val === "number") return isNaN(val) ? 850 : val;
  if (!val) return 850;
  const clean = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) || num <= 0 ? 850 : num;
}

const defaultVoiceProduct: VoiceSelectedProduct = {
  id: 100,
  name: "Pearl Drop Earrings",
  price: 850,
  slug: "pearl-drop-earrings",
  image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500",
  category: "Jewelry",
  storeName: "Elegance Boutique",
};

export default function VoiceCheckout() {
  const navigate = useNavigate();
  const [product, setProduct] = useState<VoiceSelectedProduct>(defaultVoiceProduct);
  const [phone, setPhone] = useState("");
  const [customerName] = useState("Voice Customer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // Load product & stored phone from sessionStorage / localStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("voice_checkout_product") || localStorage.getItem("voice_checkout_product");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.name) {
          setProduct(parsed);
        }
      }
      const storedPhone = sessionStorage.getItem("voice_checkout_phone") || localStorage.getItem("voice_checkout_phone");
      if (storedPhone && storedPhone.length >= 10) {
        setPhone(storedPhone);
      }
    } catch (e) {
      console.error("Failed to load voice product:", e);
    }
  }, []);

  // Announce page description on mount via VoiceAssistant global TTS engine
  useEffect(() => {
    if (product.name) {
      const numericPrice = parseNumericPrice(product.price);
      const storedPhone = sessionStorage.getItem("voice_checkout_phone");
      const message =
        storedPhone && storedPhone.length >= 10
          ? `Voice Checkout. You selected ${product.name} for ${numericPrice.toLocaleString()} Taka. Phone number ${storedPhone
              .split("")
              .join(
                " "
              )} is set. Say 'confirm order' to place your order, or say 'cancel' to return to products.`
          : `Voice Checkout. You selected ${product.name} for ${numericPrice.toLocaleString()} Taka. Please speak your 11 digit mobile number to place your order, or say 'cancel' to return to products.`;

      const timer = setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("voice-assistant-announce", { detail: message })
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [product]);

  const handleCancelCheckout = useCallback(() => {
    sessionStorage.removeItem("voice_checkout_product");
    toast.info("Voice checkout cancelled.");
    navigate("/products");
  }, [navigate]);

  const createOrderMutation = trpc.order.voiceCreate.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setOrderPlaced(true);
      const orderId =
        (data as any)?.id ||
        (data as any)?.orderNumber ||
        `VOICE-${Date.now().toString().slice(-6)}`;
      setPlacedOrderId(String(orderId));
      toast.success("Voice Order Placed Successfully!");
      broadcastLiveEvent("ORDER_CREATED", { orderId });

      const confirmMsg = `Order confirmed! Your order for ${product.name} has been placed with cash on delivery. Order ID ${orderId}. Say 'shop more' to browse more items, or say 'view orders' to check your order page!`;
      window.dispatchEvent(
        new CustomEvent("voice-assistant-announce", { detail: confirmMsg })
      );
    },
    onError: (err) => {
      setIsSubmitting(false);
      toast.error(err.message || "Failed to place order. Please try again.");
      window.dispatchEvent(
        new CustomEvent("voice-assistant-announce", {
          detail: "Failed to place order. Please try again.",
        })
      );
    },
  });

  const handlePlaceOrderWithPhone = useCallback(
    (phoneNum: string) => {
      const cleanPhone = phoneNum.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        toast.error("Please enter a valid 11-digit BD mobile number.");
        return;
      }

      setIsSubmitting(true);
      const numericPrice = parseNumericPrice(product.price);
      createOrderMutation.mutate({
        productId: product.id || 100,
        quantity: 1,
        price: numericPrice,
        phone: cleanPhone,
        customerName: customerName || "Voice Customer",
        shippingAddress: "Voice Order - Delivery Contact Phone",
        shippingCity: "Dhaka",
      });
    },
    [product, customerName, createOrderMutation]
  );

  // Listen for spoken phone number, submit & cancel events from VoiceAssistant
  useEffect(() => {
    const handlePhoneInput = (event: CustomEvent<string>) => {
      const phoneDigits = event.detail;
      if (phoneDigits) {
        setPhone(phoneDigits);
        if (phoneDigits.length >= 10) {
          handlePlaceOrderWithPhone(phoneDigits);
        }
      }
    };

    const handleSubmitOrder = () => {
      if (phone && phone.length >= 10) {
        handlePlaceOrderWithPhone(phone);
      } else {
        const storedPhone = sessionStorage.getItem("voice_checkout_phone");
        if (storedPhone && storedPhone.length >= 10) {
          handlePlaceOrderWithPhone(storedPhone);
        } else {
          window.dispatchEvent(
            new CustomEvent("voice-assistant-announce", {
              detail:
                "Please speak your 11 digit mobile number first, or say cancel to return to products.",
            })
          );
        }
      }
    };

    window.addEventListener(
      "voice-checkout-phone-input",
      handlePhoneInput as EventListener
    );
    window.addEventListener(
      "voice-checkout-submit-order",
      handleSubmitOrder as EventListener
    );
    window.addEventListener(
      "voice-checkout-cancel",
      handleCancelCheckout as EventListener
    );

    return () => {
      window.removeEventListener(
        "voice-checkout-phone-input",
        handlePhoneInput as EventListener
      );
      window.removeEventListener(
        "voice-checkout-submit-order",
        handleSubmitOrder as EventListener
      );
      window.removeEventListener(
        "voice-checkout-cancel",
        handleCancelCheckout as EventListener
      );
    };
  }, [handleCancelCheckout, handlePlaceOrderWithPhone, phone]);

  const handlePlaceOrder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handlePlaceOrderWithPhone(phone);
  };

  const numericPrice = parseNumericPrice(product.price);
  const formattedPrice = numericPrice.toLocaleString();

  // BD Mobile Operator detection badge
  const getCarrierBadge = (num: string) => {
    if (!num || num.length < 3) return null;
    const prefix = num.substring(0, 3);
    if (["017", "013"].includes(prefix))
      return { name: "Grameenphone", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
    if (["018", "016"].includes(prefix))
      return { name: "Robi / Airtel", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" };
    if (["019", "014"].includes(prefix))
      return { name: "Banglalink", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800" };
    if (["015"].includes(prefix))
      return { name: "Teletalk", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
    return null;
  };

  const carrier = getCarrierBadge(phone);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm dark:shadow-2xl">
          <button
            onClick={handleCancelCheckout}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 rounded-2xl transition-all cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel & Back to Products</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>Dev Voice Assistant Active</span>
            </span>
          </div>
        </div>

        {orderPlaced ? (
          /* Order Confirmation View */
          <div className="max-w-2xl mx-auto p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/40 shadow-xl dark:shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                Order Confirmed
              </span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                Voice Order Placed Successfully!
              </h2>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-left space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Order ID:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{placedOrderId}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Item:</span>
                <span className="font-bold text-slate-900 dark:text-white">{product.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Contact Phone:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{phone}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Payment:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Cash on Delivery (৳ {formattedPrice} BDT)</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              We have dispatched your order details to the vendor. You will receive a direct phone confirmation call shortly!
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setOrderPlaced(false);
                  setPhone("");
                }}
                className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-sm transition-all cursor-pointer"
              >
                Place Another Voice Order
              </button>
              <Link
                to="/orders"
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all inline-block"
              >
                View My Orders
              </Link>
            </div>
          </div>
        ) : (
          /* Main 2-Column Split Checkout Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (7 cols): Spoken Phone Input & Action Buttons */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Voice Interaction & Phone Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md dark:shadow-2xl space-y-6">
                
                {/* Section Title */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      1. Speak or Enter Contact Phone
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 pl-10">
                    Your 11-digit mobile number is required for Cash on Delivery confirmation.
                  </p>
                </div>

                {/* Spoken Phone Input Form */}
                <form onSubmit={handlePlaceOrder} className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        BD Mobile Number (11 Digits)
                      </label>
                      {carrier && (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${carrier.color}`}>
                          {carrier.name}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-600 dark:text-indigo-400">
                        <Phone className="w-5 h-5" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={11}
                        placeholder="017XXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/70 text-slate-900 dark:text-white text-xl font-mono font-bold tracking-widest focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/10 outline-hidden transition-all"
                      />
                    </div>

                    {/* Live Voice Prompt Banner */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping shrink-0" />
                      <p className="text-xs text-indigo-900 dark:text-indigo-200">
                        Speak your phone number clearly (e.g. <em>"0 1 7..."</em>) or say <strong>"Confirm Order"</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelCheckout}
                      className="w-full sm:w-1/3 py-4 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-slate-500" />
                      <span>Cancel</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || phone.length < 10}
                      className="w-full sm:w-2/3 py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-extrabold tracking-wide shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ShoppingBag className="w-5 h-5" />
                          <span>CONFIRM & PLACE ORDER</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Trust Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Cash on Delivery (No Card Needed)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Fast Nationwide Doorstep Delivery</span>
                  </div>
                </div>
              </div>

              {/* Voice Command Quick Help Card */}
              <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Spoken Voice Shortcuts on this page</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
                    🗣️ Say: <strong className="text-indigo-600 dark:text-indigo-400">"01712345678"</strong> to set phone
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
                    🗣️ Say: <strong className="text-emerald-600 dark:text-emerald-400">"Confirm Order"</strong> to submit
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
                    🗣️ Say: <strong className="text-rose-600 dark:text-rose-400">"Cancel"</strong> to go back
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
                    🗣️ Say: <strong className="text-indigo-600 dark:text-indigo-400">"Stop"</strong> to silence Dev
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Selected Product & Order Summary */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Product Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md dark:shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Selected Product
                  </span>
                  {product.category && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {product.category}
                    </span>
                  )}
                </div>

                <div className="flex gap-4 items-center">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}

                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {product.name}
                    </h3>
                    {product.storeName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Seller: {product.storeName}
                      </p>
                    )}
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ৳ {formattedPrice} BDT
                    </p>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Item Subtotal (1 item)</span>
                    <span className="font-semibold">৳ {formattedPrice}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Delivery Fee</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE (Voice Promo)</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Payment Mode</span>
                    <span className="font-semibold">Cash on Delivery</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                    <span>Total Amount</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">৳ {formattedPrice} BDT</span>
                  </div>
                </div>
              </div>

              {/* Progress Flow Steps */}
              <div className="p-5 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  How Voice Order Works
                </h4>
                <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                      ✓
                    </span>
                    <span>Product chosen via voice or catalog</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                      2
                    </span>
                    <span>Speak or type your 11-digit mobile number</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-[10px]">
                      3
                    </span>
                    <span>Vendor calls your phone & delivers to your door</span>
                  </li>
                </ol>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

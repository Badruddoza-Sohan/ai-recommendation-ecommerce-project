import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/currency";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  Loader2,
  Package,
  ChevronLeft,
} from "lucide-react";
import {
  getGuestCartItems,
  getGuestCartTotal,
  getGuestCartCount,
  updateGuestCartItem,
  removeGuestCartItem,
  clearGuestCart,
  type GuestCartItem,
} from "@/lib/guestCart";

export default function Cart() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    data: cart,
    isLoading,
    error: cartError,
  } = trpc.cart.get.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([]);

  const updateQuantityMutation = trpc.cart.updateQuantity.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const removeItemMutation = trpc.cart.remove.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const clearCartMutation = trpc.cart.clear.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setGuestItems(getGuestCartItems());
    }
  }, [isAuthenticated]);

  const items = isAuthenticated ? cart?.items || [] : guestItems;
  const total = isAuthenticated ? cart?.total ?? 0 : getGuestCartTotal();
  const itemCount = isAuthenticated ? cart?.itemCount ?? 0 : getGuestCartCount();

  const updateQuantity = (itemId: number, quantity: number) => {
    if (isAuthenticated) {
      updateQuantityMutation.mutate({ cartItemId: itemId, quantity });
      return;
    }
    setGuestItems(updateGuestCartItem(itemId, quantity));
    window.dispatchEvent(new Event("guest-cart-updated"));
  };

  const removeItem = (itemId: number) => {
    if (isAuthenticated) {
      removeItemMutation.mutate({ cartItemId: itemId });
      return;
    }

    setGuestItems(removeGuestCartItem(itemId));
    window.dispatchEvent(new Event("guest-cart-updated"));
  };

  const clearItems = () => {
    if (isAuthenticated) {
      clearCartMutation.mutate();
      return;
    }

    clearGuestCart();
    setGuestItems([]);
    window.dispatchEvent(new Event("guest-cart-updated"));
  };

  const handleBack = () => {
    if (window.history.length > 2 && document.referrer && !document.referrer.includes("/cart") && !document.referrer.includes("/checkout")) {
      navigate(-1);
    } else {
      navigate("/products");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center animate-fade-up">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 mb-6 text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Continue Shopping
        </button>
        <div className="inline-flex items-center justify-center h-20 w-20 bg-rose-50 dark:bg-rose-900/30 rounded-full mb-6">
          <ShoppingCart className="h-10 w-10 text-rose-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Unable to load cart</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
          {cartError.message || "An unexpected error occurred while loading your cart. Please try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-fade-up">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 mb-8 text-sm font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Continue Shopping
        </button>

        <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-6 animate-pulse-glow">
            <ShoppingCart className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Your Cart is Empty</h2>
          <p className="text-base text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            Looks like you haven't added anything to your cart yet. Start exploring to find products you'll love!
          </p>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-105 hover:shadow-xl transition-all group"
          >
            Explore Products
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 mb-4 text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Continue Shopping
          </button>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Shopping Cart <span className="text-indigo-600 dark:text-indigo-400">({itemCount})</span>
          </h1>
        </div>
        <button
          onClick={clearItems}
          className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex sm:hidden items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{items.length} products</span>
            <button
              onClick={clearItems}
              className="flex items-center gap-1.5 text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          </div>

          {items.map((item: any, index: number) => (
            <div
              key={item.id}
              className={`flex flex-col sm:flex-row gap-5 p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all animate-scale-in stagger-${(index % 6) + 1}`}
            >
              <Link to={`/product/${item.slug}`} className="shrink-0 group overflow-hidden rounded-xl">
                <img
                  src={`${item.imageUrl}`}
                  alt={`${item.name}`}
                  className="w-full sm:w-28 h-48 sm:h-28 object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                />
              </Link>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <Link to={`/product/${item.slug}`}>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors leading-tight">
                        {item.name}
                      </h3>
                    </Link>
                    <span className="font-black text-lg text-slate-900 dark:text-white shrink-0">
                      {formatCurrency((item.price ?? 0) * item.quantity)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {formatCurrency(item.price ?? 0)} <span className="text-slate-400 font-normal">each</span>
                    </p>
                    {item.stock !== null && item.stock !== undefined && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <p className={`text-xs font-bold ${item.stock < 5 ? "text-amber-500" : "text-emerald-500"}`}>
                          {item.stock} in stock
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-slate-100 dark:border-slate-700 sm:border-0">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => {
                        if (item.quantity > 1) {
                          updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-4 py-1 text-sm font-bold text-slate-900 dark:text-white min-w-[2.5rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer shadow-sm"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1 animate-slide-left">
          <div className="glass-card rounded-2xl p-6 sm:p-8 sticky top-24">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Order Summary</h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-600 dark:text-slate-300 font-bold">Delivery Fee</span>
                  <span className="text-[11px] text-slate-400">
                    Est. (Pathao / Steadfast)
                  </span>
                </div>
                <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(60)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500 dark:text-slate-400">Tax (5% VAT)</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(total * 0.05)}</span>
              </div>
              
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />
              
              <div className="flex justify-between items-end">
                <span className="text-base font-bold text-slate-900 dark:text-white">Total</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block leading-none">
                    {formatCurrency(total + 60 + total * 0.05)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/50 py-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
              <Package className="h-4 w-4 text-emerald-500" />
              Free shipping on orders over BDT 5,000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import {
  Heart,
  ShoppingCart,
  Trash2,
  Loader2,
  Star,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";

export default function Wishlist() {
  const navigate = useNavigate();
  const { data: items, isLoading } = trpc.wishlist.list.useQuery();
  const utils = trpc.useUtils();
  const removeItem = trpc.wishlist.remove.useMutation({
    onSuccess: () => utils.wishlist.list.invalidate(),
  });
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });

  const handleBack = () => {
    if (window.history.length > 2 && document.referrer && !document.referrer.includes("/wishlist") && !document.referrer.includes("/checkout")) {
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

  if (!items || items.length === 0) {
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
        
        <div className="py-12 text-center bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/30">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-rose-100 dark:bg-rose-900/40 mb-6 animate-pulse-glow shadow-inner">
            <Heart className="w-12 h-12 text-rose-500 dark:text-rose-400 fill-rose-500/20" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Your Wishlist is Empty</h2>
          <p className="text-base text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            Save items you love to your wishlist and revisit them anytime. Start exploring to find your favorites!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:shadow-rose-500/30 transition-all hover:scale-105 group"
          >
            Explore Products
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 mb-6 text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
      >
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Continue Shopping
      </button>
      
      <div className="flex items-end justify-between mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          My Wishlist <span className="text-rose-500 dark:text-rose-400">({items.length})</span>
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
        {items.map((item: any, index: number) => (
          <div
            key={item.id}
            className={`group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-slate-100 dark:border-slate-700 animate-scale-in stagger-${(index % 6) + 1} flex flex-col`}
          >
            <Link to={`/product/${item.slug}`} className="block relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-900 shrink-0">
              <img
                src={`${item.imageUrl}`}
                alt={`${item.name}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </Link>
            <div className="p-4 flex flex-col flex-1">
              <p className="text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold mb-1 truncate">{item.categoryName}</p>
              <Link to={`/product/${item.slug}`}>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                  {item.name}
                </h3>
              </Link>
              <p className="text-xs text-slate-500 mb-2 truncate">{item.sellerName}</p>

              {item.rating ? (
                <div className="flex items-center gap-1 mb-3 bg-amber-50 dark:bg-amber-900/20 w-fit px-2 py-0.5 rounded-md">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 group-hover:animate-pulse" />
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{item.rating}</span>
                  <span className="text-[11px] text-amber-600/60 dark:text-amber-500/60">({item.reviewCount || 0})</span>
                </div>
              ) : (
                <div className="h-6 mb-3" />
              )}

              <div className="mt-auto">
                <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight block mb-3">{formatCurrency(Number(item.price ?? 0))}</span>
                <div className="flex gap-2 relative">
                  <button
                    onClick={() => removeItem.mutate({ wishlistId: item.id })}
                    className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => addToCart.mutate({ productId: item.productId! })}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-xs shadow-md hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    aria-label="Add to cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>To Cart</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

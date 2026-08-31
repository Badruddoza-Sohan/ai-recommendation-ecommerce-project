import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import {
  Star,
  ShoppingCart,
  Heart,
  Loader2,
  Store,
  TrendingUp,
  Package,
  ArrowRight,
} from "lucide-react";

export default function SellerStore() {
  const { id } = useParams<{ id: string }>();
  const { data: seller, isLoading } = trpc.seller.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const addToWishlist = trpc.wishlist.add.useMutation({
    onSuccess: () => utils.wishlist.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-lg text-slate-500">Seller not found</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Seller Banner */}
      <div className="relative h-48 sm:h-64 overflow-hidden">
        <img
          src={seller.banner || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200"}
          alt={seller.businessName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        {/* Seller Info Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 mb-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="h-20 w-20 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-2xl font-bold text-indigo-600 shrink-0">
              {seller.logo ? (
                <img src={seller.logo} alt={seller.businessName} className="h-full w-full object-cover rounded-xl" />
              ) : (
                seller.businessName?.charAt(0) || "S"
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{seller.businessName}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{seller.description}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{seller.rating}</span>
                </div>
                <span className="text-sm text-slate-500">{seller.stats.totalProducts} products</span>
                <span className="text-sm text-slate-500">{seller.stats.totalSold} sold</span>
                <span className="text-sm text-slate-500">{seller.stats.totalOrders} orders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-10 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="glass-card rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform cursor-default">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl inline-block mb-3">
              <Package className="h-6 w-6" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{seller.stats.totalProducts}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Products</p>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform cursor-default">
            <div className="p-3 bg-green-500/10 text-green-600 rounded-xl inline-block mb-3">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{seller.stats.totalSold}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Items Sold</p>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform cursor-default">
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl inline-block mb-3">
              <Store className="h-6 w-6" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(seller.stats.totalRevenue)}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Revenue</p>
          </div>
        </div>

        {/* Products */}
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 animate-fade-up" style={{ animationDelay: '300ms' }}>
          Products from {seller.businessName}
        </h2>

        {seller.products.length === 0 ? (
          <div className="py-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Products Listed</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This seller hasn't added any products to their store yet. 
                </p>
              </div>
            </div>
            <Link
              to="/sellers"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold rounded-lg shadow-sm transition-all group"
            >
              Explore Other Sellers
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 pb-12 animate-fade-up" style={{ animationDelay: '400ms' }}>
            {seller.products.map((product: any) => (
              <div
                key={product.id}
                className="group glass-card rounded-2xl transition-all overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10"
              >
                <Link to={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700/50">
                  <img
                    src={product.imageUrl || ""}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </Link>
                <div className="p-4">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">{product.categoryName}</p>
                  <Link to={`/product/${product.slug}`}>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  {product.rating ? (
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs">{product.rating}</span>
                      <span className="text-xs text-slate-400">({product.reviewCount || 0})</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(product.price)}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => addToWishlist.mutate({ productId: product.id })}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        aria-label="Add to wishlist"
                      >
                        <Heart className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => addToCart.mutate({ productId: product.id })}
                        className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-500/25"
                        aria-label="Add to cart"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import {
  Star,
  ShoppingCart,
  Heart,
  Loader2,
  ChevronRight,
  Package,
  ArrowRight,
} from "lucide-react";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { data: category, isLoading: catLoading } = trpc.category.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );
  const { data: productsData, isLoading: prodLoading } = trpc.category.getProducts.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const addToWishlist = trpc.wishlist.add.useMutation({
    onSuccess: () => utils.wishlist.list.invalidate(),
  });

  if (catLoading || prodLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center animate-fade-up">
        <p className="text-lg text-slate-500">Category not found</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/categories" className="hover:text-indigo-600 transition-colors">Categories</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 dark:text-white">{category.name}</span>
      </nav>

      {/* Category Header */}
      <div className="relative rounded-3xl overflow-hidden mb-12 shadow-xl group">
        <div className="absolute inset-0 bg-indigo-900">
          <img
            src={category.image || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80"}
            alt={category.name}
            className="w-full h-full object-cover opacity-50 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="relative z-10 px-8 py-16 sm:py-20 animate-slide-left">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            {category.name}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mb-4 leading-relaxed">
            {category.description}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-sm font-semibold">
            <Package className="h-4 w-4" />
            {category.productCount} Products
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {productsData?.items.length === 0 ? (
        <div className="py-16 my-8 text-center animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-6 animate-pulse-glow">
            <Package className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Products Here Yet</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            We are working on bringing you amazing products in this category. Check back soon!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-1 group"
          >
            Browse All Products
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {productsData?.items.map((product: any, index: number) => (
            <div
              key={product.id}
              className={`group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-slate-100 dark:border-slate-700 animate-scale-in stagger-${(index % 6) + 1}`}
            >
              <Link to={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-900">
                <img
                  src={product.imageUrl || ""}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </Link>
              <div className="p-4">
                <Link to={`/product/${product.slug}`}>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1.5 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {product.name}
                  </h3>
                </Link>
                {product.rating ? (
                  <div className="flex items-center gap-1.5 mb-3 bg-amber-50 dark:bg-amber-900/20 w-fit px-2 py-0.5 rounded-md">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 group-hover:animate-pulse" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{product.rating}</span>
                    <span className="text-xs text-amber-600/60 dark:text-amber-500/60">({product.reviewCount || 0})</span>
                  </div>
                ) : (
                  <div className="h-6 mb-3" />
                )}
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight">{formatCurrency(product.price)}</span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <button
                      onClick={(e) => { e.preventDefault(); addToWishlist.mutate({ productId: product.id }); }}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
                      aria-label="Add to wishlist"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); addToCart.mutate({ productId: product.id }); }}
                      className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-110 active:scale-95"
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
  );
}

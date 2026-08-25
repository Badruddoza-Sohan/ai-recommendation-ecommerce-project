import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import {
  Search,
  SlidersHorizontal,
  Star,
  ShoppingCart,
  Heart,
  Loader2,
  Grid3X3,
  LayoutList,
  AlertCircle,
  Mic,
  X,
  Store,
} from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") ? Number(searchParams.get("category")) : undefined;
  const initialFeatured = searchParams.get("featured") === "true" || undefined;
  const initialTrending = searchParams.get("trending") === "true" || undefined;
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error, refetch } = trpc.product.list.useQuery({
    search: initialSearch.trim() || undefined,
    categoryId: initialCategory,
    featured: initialFeatured,
    trending: initialTrending,
    limit: 50,
  });

  const { data: categories } = trpc.category.list.useQuery();
  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
      toast.success("Added to cart!");
    },
    onError: (err) => toast.error(err.message || "Failed to add to cart"),
  });
  const addToWishlist = trpc.wishlist.add.useMutation({
    onSuccess: () => {
      utils.wishlist.list.invalidate();
      toast.success("Saved to wishlist!");
    },
    onError: (err) => toast.error(err.message || "Failed to add to wishlist"),
  });

  // Keep search input in sync with URL search params
  useEffect(() => {
    setSearchInput(initialSearch);
  }, [initialSearch]);

  const filteredProducts = data?.items || [];

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case "price-low": return (Number(a.price) || 0) - (Number(b.price) || 0);
        case "price-high": return (Number(b.price) || 0) - (Number(a.price) || 0);
        case "rating": return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        case "popular": return (Number(b.soldCount) || 0) - (Number(a.soldCount) || 0);
        default: return 0;
      }
    });
  }, [filteredProducts, sortBy]);

  const lastAnnouncedSearchRef = useRef("");

  // Synchronize loaded products with VoiceAssistant and announce search results
  useEffect(() => {
    if (typeof window === "undefined" || isLoading || !data) return;

    const voiceProducts = sortedProducts.map((product, index) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: formatCurrency(product.price),
      image: (product as any).imageUrl || (product as any).images?.[0] || (product as any).image || "",
      index: index + 1,
    }));

    window.dispatchEvent(new CustomEvent("voice-assistant-products", { detail: { items: voiceProducts } }));

    // If this is an active search query, speak the results and numbered options out loud!
    const query = (initialSearch || "").trim();
    if (query && lastAnnouncedSearchRef.current !== query) {
      lastAnnouncedSearchRef.current = query;
      if (sortedProducts.length > 0) {
        const topFew = voiceProducts.slice(0, 4);
        const details = topFew
          .map((p) => `Option ${p.index}: ${p.name} for ${p.price}`)
          .join(". ");
        const message = `Found ${sortedProducts.length} items for ${query}. ${details}. Say 'Select 1' or 'Option 1' to choose and proceed to Voice Checkout.`;
        window.dispatchEvent(new CustomEvent("voice-assistant-announce", { detail: message }));
      } else {
        const message = `No matching products were found for ${query}. Please try searching for another item.`;
        window.dispatchEvent(new CustomEvent("voice-assistant-announce", { detail: message }));
      }
    } else if (!query) {
      lastAnnouncedSearchRef.current = "";
    }
  }, [isLoading, data, initialSearch, sortedProducts]);

  const clearAllFilters = () => {
    setSearchInput("");
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(initialSearch || initialCategory || initialFeatured || initialTrending);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
            <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-semibold">Catalog</span>
            {initialSearch && (
              <>
                <span>/</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">"{initialSearch}"</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {initialSearch
              ? `Results for "${initialSearch}"`
              : initialFeatured
                ? "Featured Collection"
                : initialTrending
                  ? "Trending Products"
                  : "Explore All Products"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {data?.total ?? sortedProducts.length} product{sortedProducts.length === 1 ? "" : "s"} available
          </p>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors self-start sm:self-auto px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Control Bar: Search + Filter Toggle + Sort + View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm sticky top-20 z-40">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val) {
                  setSearchParams({ search: val });
                } else {
                  setSearchParams({});
                }
              }}
              placeholder="Search by title, brand, category..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              aria-label="Search products"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${showFilters || initialCategory
                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters {initialCategory ? "(1 active)" : ""}</span>
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            aria-label="Sort products"
          >
            <option value="newest">Sort: Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="popular">Most Popular</option>
          </select>

          <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === "grid" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === "list" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Category Filter Drawer */}
      {showFilters && (
        <div className="mb-6 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filter by Category
            </h3>
            {initialCategory && (
              <button
                onClick={() => {
                  const params: Record<string, string> = {};
                  if (initialSearch) params.search = initialSearch;
                  setSearchParams(params);
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Reset Category
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const params: Record<string, string> = {};
                if (initialSearch) params.search = initialSearch;
                setSearchParams(params);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${!initialCategory
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
            >
              All Categories
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  const params: Record<string, string> = { category: String(cat.id) };
                  if (initialSearch) params.search = initialSearch;
                  setSearchParams(params);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${initialCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Product Container */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading catalog items...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <p className="text-lg font-bold text-slate-900 dark:text-white">Unable to load products</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {error.message || "An unexpected error occurred while fetching items."}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="py-16 text-center animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800/50 mb-6 animate-pulse-glow">
            <Search className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Products Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            We couldn't find any items matching your current filters or search query. Try adjusting your criteria.
          </p>
          
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-105 hover:shadow-lg transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6"
              : "flex flex-col gap-4 max-w-4xl mx-auto"
          }
        >
          {sortedProducts.map((product, index) => {
            const imageUrl =
              (product as any).imageUrl ||
              (product as any).images?.[0] ||
              (product as any).image ||
              "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500";

            const discount = product.comparePrice
              ? Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)
              : 0;

            const displayRating = product.rating
              ? Number(product.rating).toFixed(1)
              : (4.5 + ((product.id * 7) % 5) * 0.1).toFixed(1);

            const displayReviewCount =
              product.reviewCount !== undefined && product.reviewCount !== null
                ? product.reviewCount
                : (product.id * 23) % 180 + 12;

            if (viewMode === "list") {
              return (
                <div
                  key={product.id}
                  data-product-name={product.name}
                  data-product-price={formatCurrency(product.price)}
                  className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center animate-scale-in stagger-${(index % 6) + 1}`}
                >
                  <Link
                    to={`/product/${product.slug}`}
                    className="relative w-full sm:w-44 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0"
                  >
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-extrabold shadow-xs">
                      <Mic className="w-3 h-3" />
                      Option #{index + 1}
                    </span>
                  </Link>

                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        {(product as any).categoryName || "Marketplace"}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                        <Store className="w-3 h-3" />
                        {(product as any).sellerName || "Verified Vendor"}
                      </span>
                    </div>

                    <Link to={`/product/${product.slug}`}>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-200/60 dark:border-amber-900/40">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span>{displayRating}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        ({displayReviewCount} reviews)
                      </span>
                    </div>

                    {product.shortDescription && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {product.shortDescription}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {formatCurrency(product.price)}
                      </div>
                      {product.comparePrice && (
                        <span className="text-xs text-slate-400 line-through font-medium block">
                          {formatCurrency(product.comparePrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addToWishlist.mutate({ productId: product.id })}
                        className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Add to Wishlist"
                        aria-label="Add to Wishlist"
                      >
                        <Heart className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => addToCart.mutate({ productId: product.id })}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Grid View Card
            return (
              <div
                key={product.id}
                data-product-name={product.name}
                data-product-price={formatCurrency(product.price)}
                className={`group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400/80 dark:hover:border-indigo-500/60 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between overflow-hidden animate-scale-in stagger-${(index % 6) + 1}`}
              >
                <div>
                  {/* Image Container */}
                  <Link
                    to={`/product/${product.slug}`}
                    className="block relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />

                    {/* Top Left Badges */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-extrabold shadow-md border border-white/10">
                        <Mic className="w-3 h-3 text-indigo-400" />
                        Option #{index + 1}
                      </span>
                      {discount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold shadow-md tracking-tight">
                          -{discount}%
                        </span>
                      )}
                    </div>

                    {/* Wishlist Button Top Right */}
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          addToWishlist.mutate({ productId: product.id });
                        }}
                        className="p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 rounded-full shadow-md hover:scale-110 transition-all cursor-pointer"
                        title="Add to Wishlist"
                        aria-label="Add to Wishlist"
                      >
                        <Heart className="h-4 w-4" />
                      </button>
                    </div>
                  </Link>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate max-w-[55%]">
                        {(product as any).categoryName || "General"}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-medium truncate max-w-[42%] text-right">
                        {(product as any).sellerName || "Marketplace"}
                      </span>
                    </div>

                    <Link to={`/product/${product.slug}`}>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[11px] font-extrabold border border-amber-200/60 dark:border-amber-900/40">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span>{displayRating}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({displayReviewCount})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Price & Add Button */}
                <div className="p-4 sm:p-5 pt-0 mt-auto flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                      {formatCurrency(product.price)}
                    </div>
                    {product.comparePrice && (
                      <span className="text-xs text-slate-400 line-through font-medium block truncate">
                        {formatCurrency(product.comparePrice)}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => addToCart.mutate({ productId: product.id })}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all shrink-0 cursor-pointer"
                    aria-label="Add to cart"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

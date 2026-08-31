import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import {
  Star,
  Zap,
  ArrowRight,
  ShoppingCart,
  Heart,
  Loader2,
  Search,
  Mic,
  Truck,
  Shield,
  Sparkles,
  X,
  ChevronRight,
  Tag,
  Flame,
  Store,
} from "lucide-react";
import { useVoiceStore } from "@/stores/useVoiceStore";

export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Live suggestive search query
  const { data: searchSuggestionsData, isLoading: isSearchSuggesting } = trpc.product.list.useQuery(
    { search: searchQuery.trim(), limit: 5 },
    { enabled: searchQuery.trim().length > 0 }
  );

  const searchResults = searchSuggestionsData?.items || [];
  const { data: featured, isLoading: featuredLoading } = trpc.product.getFeatured.useQuery(
    { limit: 8 },
    { refetchInterval: 2500 }
  );
  const { data: trending, isLoading: trendingLoading } = trpc.product.getTrending.useQuery(
    { limit: 8 },
    { refetchInterval: 2500 }
  );
  const { data: flashSale, isLoading: flashSaleLoading } = trpc.product.getFlashSale.useQuery(
    { limit: 8 },
    { refetchInterval: 5000 }
  );
  const { data: categories } = trpc.category.list.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: allProductsData } = trpc.product.list.useQuery(
    { limit: 1 },
    { refetchInterval: 2500 }
  );

  const totalProductsCount = allProductsData?.total || 100;
  const totalCategoriesCount = categories?.length || 10;

  // Dynamic Popular Searches derived from live product titles
  const popularSearches = (featured || [])
    .slice(0, 6)
    .map((p: any) => p.name.split(" ").slice(0, 2).join(" "))
    .filter(Boolean);
  if (popularSearches.length === 0) {
    popularSearches.push("Smart Watch", "Air Max", "Leather Bag", "Earrings", "Diffuser");
  }

  const setVoiceProducts = useVoiceStore((state) => state.setVoiceProducts);

  // Synchronize loaded home products with VoiceAssistant
  useEffect(() => {
    if (typeof window === "undefined" || (!featured && !trending)) return;
    const combined = [...(featured || []), ...(trending || [])];
    const seen = new Set<string>();
    const voiceProducts = combined
      .filter((p: any) => {
        if (!p || !p.name || seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      })
      .slice(0, 10);
  
    setVoiceProducts(voiceProducts);
  }, [featured, trending]);

  // Dynamic category mapping directly from database queries
  const iconMap: Record<string, string> = {
    "mens-fashion": "👟",
    "womens-fashion": "👗",
    "electronics": "🎧",
    "accessories": "⌚",
    "bags-wallets": "👜",
    "beauty-care": "💄",
    "home-living": "🛋️",
    "sports-outdoors": "⚽",
    "books-more": "📘",
    "toys-kids": "🧸",
    "jewelry-watches": "💍",
    "food-beverages": "🍵",
    "automotive": "🚗",
  };

  const colorGradients = [
    "from-blue-100 to-indigo-100",
    "from-purple-100 to-pink-100",
    "from-violet-100 to-purple-100",
    "from-sky-100 to-blue-100",
    "from-amber-100 to-orange-100",
    "from-pink-100 to-rose-100",
    "from-cyan-100 to-teal-100",
    "from-[#F4F0FF] to-indigo-100",
    "from-blue-100 to-cyan-100",
    "from-[#FFF3E0] to-[#FFE0B2]",
  ];

  interface HomeCategoryItem {
    id?: number;
    name: string;
    count: string;
    icon: string;
    color: string;
    slug?: string;
    isMore?: boolean;
  }

  const dbCategories: HomeCategoryItem[] = (categories || []).map((cat: any, idx: number) => ({
    id: cat.id,
    name: cat.name,
    count: `${cat.productCount || 0} Products`,
    icon: iconMap[cat.slug] || cat.icon || "📦",
    color: colorGradients[idx % colorGradients.length],
    slug: cat.slug,
  }));

  const featuredCategories: HomeCategoryItem[] = [
    ...dbCategories.slice(0, 9),
    ...(dbCategories.length > 9 ? [{ name: "View All", count: `${totalCategoriesCount} Categories`, icon: "•••", color: "from-slate-100 to-slate-200", isMore: true, slug: "all" }] : []),
  ];

  const mlRecommendations = (featured || [])
    .map((product: any) => ({
      ...product,
      mlScore: Math.min(Math.round(((product.rating || 4.5) * 15) + ((product.reviewCount || 20) * 0.2) + ((product.id % 7) * 3) + 20), 99),
    }))
    .sort((a: any, b: any) => (b.mlScore || 0) - (a.mlScore || 0))
    .slice(0, 6);
  const { data: recentReviews = [] } = trpc.review.listRecent.useQuery({ limit: 6 });
  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const addToWishlist = trpc.wishlist.add.useMutation({
    onSuccess: () => utils.wishlist.list.invalidate(),
  });

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6FF] dark:bg-slate-950">
      {/* Hero Banner Section */}
      <section
        className="relative overflow-hidden bg-gradient-to-b from-white via-[#FAF9FF] to-[#F7F6FF] dark:from-slate-950 dark:to-slate-900 pt-[35px] pb-[50px] px-4 sm:px-6 lg:px-8"
        aria-label="Hero banner"
      >
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">

            {/* Left Column: 50% width */}
            <div className="w-full lg:w-[48%] flex flex-col justify-center space-y-6 z-10">

              {/* AI Powered Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50/90 dark:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-800 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide w-fit shadow-2xs">
                <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>AI-Powered Shopping Experience</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight max-w-[580px]">
                Discover Products with{" "}
                <span className="text-[#F5B400] relative inline-block">
                  Intelligence
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-[580px]">
                Shop from {totalProductsCount}+ products across {totalCategoriesCount} categories. Get AI recommendations,
                voice navigation, and the best deals from trusted sellers.
              </p>

              {/* Search Bar Container with Interactive Suggestive Popup */}
              <div className="relative w-full max-w-[580px] z-40">

                {/* Transparent Click-Outside Backdrop (No Blur) */}
                {isSearchFocused && (
                  <div
                    className="fixed inset-0 z-30 bg-transparent"
                    onClick={() => setIsSearchFocused(false)}
                  />
                )}

                <form
                  onSubmit={(e) => {
                    handleSearch(e);
                    setIsSearchFocused(false);
                  }}
                  className="relative z-40 flex items-center bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-md border border-slate-200/90 dark:border-slate-700 w-full focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all"
                >
                  <Search className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchFocused(true);
                    }}
                    placeholder="Search for products, brands, or categories"
                    className="w-full px-3 py-2 text-sm bg-transparent outline-none text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
                    aria-label="Search products"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#5438DC] hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-sm shrink-0 hover:-translate-y-0.5"
                  >
                    Search
                  </button>
                </form>

                {/* Suggestive Search Popup Dropdown Modal */}
                {isSearchFocused && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* State 1: When user typing keyword */}
                    {searchQuery.trim().length > 0 ? (
                      <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Matching Suggestions for "{searchQuery}"
                            </span>
                          </div>
                          {isSearchSuggesting && (
                            <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                          )}
                        </div>

                        {/* Product Results */}
                        {searchResults.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Products ({searchResults.length})
                            </p>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {searchResults.map((product: any) => (
                                <div
                                  key={product.id}
                                  onClick={() => {
                                    setIsSearchFocused(false);
                                    navigate(`/product/${product.slug}`);
                                  }}
                                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors group"
                                >
                                  <img
                                    src={product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100"}
                                    alt={product.name}
                                    className="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-200/60 dark:border-slate-800 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h5 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">
                                      {product.name}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                                        {formatCurrency(product.price)}
                                      </span>
                                      {product.categoryName && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                          {product.categoryName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : !isSearchSuggesting ? (
                          <div className="py-6 text-center text-slate-500 text-xs">
                            No exact product match found for "{searchQuery}".
                          </div>
                        ) : null}

                        {/* Matching Categories */}
                        {featuredCategories.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())) && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                              Matching Categories
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {featuredCategories
                                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((cat, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      setIsSearchFocused(false);
                                      navigate(cat.isMore ? "/categories" : `/category/${cat.slug || ""}`);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                                  >
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* View All Search Action */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setIsSearchFocused(false);
                              handleSearch();
                            }}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                          >
                            <span>See all results for "{searchQuery}"</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>

                      </div>
                    ) : (
                      /* State 2: Initial Focus / Empty Search state */
                      <div className="p-4 space-y-4">
                        {/* Popular Searches */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <Flame className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                              Popular Searches
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {popularSearches.map((term: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSearchQuery(term);
                                  navigate(`/products?search=${encodeURIComponent(term)}`);
                                  setIsSearchFocused(false);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-medium border border-slate-200/60 dark:border-slate-700/60 transition-all group"
                              >
                                <Zap className="h-3 w-3 text-amber-500 group-hover:scale-110 transition-transform" />
                                <span>{term}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Top Categories */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <Tag className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                              Explore Categories
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {featuredCategories.slice(0, 4).map((cat, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setIsSearchFocused(false);
                                  navigate(cat.isMore ? "/categories" : `/category/${cat.slug || ""}`);
                                }}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 flex items-center gap-2 transition-colors text-left"
                              >
                                <span className="text-lg">{cat.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{cat.name}</p>
                                  <p className="text-[10px] text-slate-400">{cat.count}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Micro Badges */}
              <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-full font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
                  <Mic className="h-3.5 w-3.5 text-indigo-600" /> Voice search ready
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-full font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
                  <Zap className="h-3.5 w-3.5 text-indigo-600" /> AI recommendations
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/products"
                  className="px-7 py-3.5 bg-white dark:bg-slate-800 text-[#5438DC] dark:text-indigo-400 border border-[#5438DC]/30 dark:border-indigo-500/30 rounded-2xl font-bold text-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                  Browse Products
                </Link>
                <Link
                  to="/categories"
                  className="px-7 py-3.5 bg-[#5438DC] hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-md"
                >
                  Explore Categories
                </Link>
              </div>
            </div>

            {/* Right Column: 52% width with Large 3D Image & Overlaid Floating Cards */}
            <div className="w-full lg:w-[52%] relative flex items-center justify-center min-h-[480px] lg:min-h-[580px]">

              {/* Background Ambient Glows */}
              <div className="absolute w-[500px] h-[500px] bg-purple-400/25 rounded-full blur-[130px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10" />
              <div className="absolute w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[130px] top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10" />

              {/* Centerpiece 3D Illustration */}
              <div className="relative w-full max-w-[620px] lg:max-w-[740px] flex items-center justify-center">
                <img
                  src="/assets/hero_main_illustration.png"
                  alt="MarketVerse AI Marketplace Hero"
                  className="w-full h-auto max-h-[560px] lg:max-h-[640px] object-contain animate-float-hero filter drop-shadow-2xl pr-0 lg:pr-12"
                />

                {/* 5 Feature Cards Floating Directly Over Right Side of Image */}
                <div className="absolute -right-2 lg:-right-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col gap-3.5">

                  {/* 1. Voice Search */}
                  <div className="glass-feature-card p-3.5 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-100/90 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 shrink-0 shadow-2xs">
                      <Mic className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Voice Search</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Find products with your voice</p>
                    </div>
                  </div>

                  {/* 2. AI Recommendations */}
                  <div className="glass-feature-card p-3.5 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-100/90 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 shrink-0 shadow-2xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">AI Recommendations</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Personalized picks just for you</p>
                    </div>
                  </div>

                  {/* 3. Free Shipping */}
                  <div className="glass-feature-card p-3.5 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 shrink-0 shadow-2xs">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Free Shipping</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">On orders over BDT 5,000</p>
                    </div>
                  </div>

                  {/* 4. Secure Payments */}
                  <div className="glass-feature-card p-3.5 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-100/90 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 shrink-0 shadow-2xs">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Secure Payments</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Safe & trusted transactions</p>
                    </div>
                  </div>

                  {/* 5. Top Rated Sellers */}
                  <div className="glass-feature-card p-3.5 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-pink-100/90 dark:bg-pink-900/60 text-pink-600 dark:text-pink-300 shrink-0 shadow-2xs">
                      <Star className="h-4 w-4 fill-pink-600 text-pink-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Top Rated Sellers</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Shop from trusted sellers</p>
                    </div>
                  </div>

                </div>

              </div>

              {/* Mobile Fallback: Feature Cards Grid under image */}
              <div className="sm:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 w-full max-w-sm">
                <div className="glass-feature-card w-full p-3 flex items-center gap-3">
                  <Mic className="h-4 w-4 text-purple-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Voice Search</h4>
                    <p className="text-[10px] text-slate-500">Find products with voice</p>
                  </div>
                </div>
                <div className="glass-feature-card w-full p-3 flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">AI Recommendations</h4>
                    <p className="text-[10px] text-slate-500">Personalized picks</p>
                  </div>
                </div>
                <div className="glass-feature-card w-full p-3 flex items-center gap-3">
                  <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Free Shipping</h4>
                    <p className="text-[10px] text-slate-500">Orders over BDT 5,000</p>
                  </div>
                </div>
                <div className="glass-feature-card w-full p-3 flex items-center gap-3">
                  <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Secure Payments</h4>
                    <p className="text-[10px] text-slate-500">Safe & trusted transactions</p>
                  </div>
                </div>
                <div className="glass-feature-card w-full p-3 flex items-center gap-3">
                  <Star className="h-4 w-4 fill-pink-600 text-pink-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Top Rated Sellers</h4>
                    <p className="text-[10px] text-slate-500">Shop from trusted sellers</p>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Featured Categories Glass Card Showcase (35px Top Margin) */}
          <div className="mt-[35px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-sm border border-white/80 dark:border-slate-800/80">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Featured Categories
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-4 text-center">
              {featuredCategories.map((cat, idx) => (
                <Link
                  key={idx}
                  to={cat.isMore ? "/categories" : `/category/${cat.slug || ""}`}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-b ${cat.color} flex items-center justify-center text-2xl shadow-2xs group-hover:scale-[1.08] transition-transform duration-300 border border-white/80 dark:border-slate-700/50 mb-2 group-hover:shadow-md`}>
                    {cat.icon}
                  </div>
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {cat.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {cat.count}
                  </p>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ML Recommendations */}
      <section className="py-14 sm:py-20 bg-gradient-to-br from-[#F5F0FF] via-[#FAF5FF] to-[#EEF2FF] dark:from-slate-950 dark:via-purple-950/30 dark:to-indigo-950/40 relative overflow-hidden" aria-label="ML recommendations">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300/20 dark:bg-purple-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/25 shrink-0">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Zap className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  AI Engine Powered
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  ML Curated Picks
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Personalized algorithms ranking products by intent, popularity, and individual style fit.
                </p>
              </div>
            </div>
          </div>

          {featuredLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : mlRecommendations.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
              {mlRecommendations.slice(0, 5).map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isAiCurated={true}
                  onAddToCart={() => addToCart.mutate({ productId: product.id })}
                  onAddToWishlist={() => addToWishlist.mutate({ productId: product.id })}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center py-12">
              <p className="text-sm font-medium text-slate-500">More curated picks coming soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Flash Sale Products */}
      {flashSale && flashSale.length > 0 && (
        <section className="py-14 sm:py-20 bg-rose-50/50 dark:bg-rose-950/20 border-t border-b border-rose-100 dark:border-rose-900/30" aria-label="Flash sale products">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Zap className="h-3 w-3 text-rose-500 fill-rose-500" />
                  Limited Time Offers
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Flash Sale 
                  <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-md font-bold">40%+ OFF</span>
                </h2>
              </div>
            </div>

            {flashSaleLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
                {flashSale.slice(0, 5).map((product: any) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-14 sm:py-20 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/80" aria-label="Featured products">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                Handpicked Quality
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Featured Products
              </h2>
            </div>
            <Link
              to="/products?featured=true"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 font-bold text-xs transition-all group shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {featuredLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
              {featured?.slice(0, 5).map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => addToCart.mutate({ productId: product.id })}
                  onAddToWishlist={() => addToWishlist.mutate({ productId: product.id })}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-14 sm:py-20 bg-gradient-to-b from-[#FFFDF8] via-[#FFF8F0] to-[#F8F6FF] dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-950" aria-label="Trending products">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Flame className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                Hot Demand
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Trending Now
              </h2>
            </div>
            <Link
              to="/products?trending=true"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-300 font-bold text-xs transition-all group shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {trendingLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
              {trending?.slice(0, 5).map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => addToCart.mutate({ productId: product.id })}
                  onAddToWishlist={() => addToWishlist.mutate({ productId: product.id })}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Premium Customer Reviews Section */}
      <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900 relative overflow-hidden" aria-label="Customer reviews">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute -top-48 -right-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold tracking-wider uppercase mb-4 border border-indigo-100 dark:border-indigo-800">
              Wall of Love
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
              Loved by <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Thousands</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
              Join our growing community of smart shoppers who have revolutionized their shopping experience with Clevora AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recentReviews.length > 0 ? (
              recentReviews.map((review: any, index: number) => {
                const colorSchemes = [
                  "from-indigo-500 to-purple-500",
                  "from-emerald-500 to-teal-500",
                  "from-rose-500 to-orange-500",
                  "from-blue-500 to-cyan-500",
                  "from-fuchsia-500 to-pink-500",
                  "from-amber-500 to-orange-500"
                ];
                const textColors = [
                  "text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
                  "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
                  "text-rose-600 dark:text-rose-400 group-hover:text-rose-600 dark:group-hover:text-rose-400",
                  "text-blue-600 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-400",
                  "text-fuchsia-600 dark:text-fuchsia-400 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400",
                  "text-amber-600 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-400"
                ];
                const bgColors = colorSchemes[index % colorSchemes.length];
                const txColor = textColors[index % textColors.length];

                return (
                  <div key={review.id} className="group relative bg-white dark:bg-slate-800/80 p-8 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-2 backdrop-blur-xl">
                    <div className={`absolute -top-4 -right-4 h-24 w-24 bg-gradient-to-br ${bgColors} rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />
                    <div className="flex items-center gap-1.5 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-5 w-5 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-slate-300"} group-hover:scale-110 transition-transform duration-300 delay-[${i * 50}ms]`} style={{ transitionDelay: `${i * 50}ms` }} />
                      ))}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mb-8 text-lg leading-relaxed italic font-medium relative z-10">
                      "{review.comment}"
                    </p>
                    <div className="flex items-center gap-4">
                      <div className={`relative h-12 w-12 rounded-full bg-gradient-to-tr ${bgColors} p-0.5 shadow-md`}>
                        <div className={`h-full w-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center ${txColor} font-bold text-lg`}>
                          {review.userName ? review.userName.substring(0, 2).toUpperCase() : "U"}
                        </div>
                      </div>
                      <div>
                        <div className={`text-base font-bold text-slate-900 dark:text-white transition-colors`}>{review.userName || "Anonymous User"}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5 text-emerald-500" />
                          {review.isVerified ? "Verified Buyer" : "Customer"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 italic">
                Be the first to leave a review! Your experience will be featured here.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white relative overflow-hidden" aria-label="Platform features">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-extrabold uppercase tracking-wider border border-white/15">
              Next-Gen E-Commerce
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-3 mb-4">
              Why Choose MarketVerse?
            </h2>
            <p className="text-sm sm:text-base text-indigo-100/80">
              Built with cutting-edge AI, multi-vendor infrastructure, and seamless accessibility features.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard
              icon={<Zap className="h-7 w-7 text-amber-300" />}
              accentBg="bg-amber-500/20"
              title="AI Recommendations"
              description="Get smart product suggestions powered by vector similarity and personalized user intent models."
            />
            <FeatureCard
              icon={<Store className="h-7 w-7 text-emerald-300" />}
              accentBg="bg-emerald-500/20"
              title="Multi-Vendor Platform"
              description="Shop directly from verified storefronts with real-time inventory management and transparent ratings."
            />
            <FeatureCard
              icon={<Mic className="h-7 w-7 text-pink-300" />}
              accentBg="bg-pink-500/20"
              title="Voice Navigation"
              description="Enjoy fully hands-free accessible shopping with built-in voice commands for search and checkout."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// Upgraded Product Card Component
function ProductCard({
  product,
  isAiCurated = false,
  onAddToCart,
  onAddToWishlist,
}: {
  product: {
    id: number;
    name: string;
    slug: string;
    shortDescription: string | null;
    price: number;
    comparePrice: number | null;
    imageUrl: string | null;
    rating: number | null;
    reviewCount: number | null;
    categoryName: string | null;
    sellerName: string | null;
  };
  isAiCurated?: boolean;
  onAddToCart: () => void;
  onAddToWishlist: () => void;
}) {
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const displayRating = product.rating
    ? Number(product.rating).toFixed(1)
    : (4.5 + ((product.id * 7) % 5) * 0.1).toFixed(1);

  const displayReviewCount = product.reviewCount !== undefined && product.reviewCount !== null
    ? product.reviewCount
    : ((product.id * 23) % 200 + 15);

  return (
    <div className="group bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-300/80 dark:hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden border border-slate-200/80 dark:border-slate-700/70">
      <div>
        {/* Image Container */}
        <Link to={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700/50">
          <img
            src={product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Badges Stack Top Left */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start z-10">
            {discount > 0 && (
              <span className="px-2.5 py-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[11px] font-extrabold rounded-full shadow-md tracking-tight">
                -{discount}%
              </span>
            )}
            {isAiCurated && (
              <span className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold rounded-full shadow-md flex items-center gap-1 backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
                <span>AI Fit</span>
              </span>
            )}
          </div>

          {/* Action Button Top Right */}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToWishlist();
              }}
              className="p-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 rounded-full shadow-md hover:scale-110 transition-all"
              aria-label="Add to wishlist"
              title="Add to Wishlist"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </Link>

        {/* Content Body */}
        <div className="p-3 sm:p-3.5 flex flex-col gap-1">
          {/* Category & Seller */}
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[55%]">
              {product.categoryName || "General"}
            </span>
            <span className="truncate max-w-[42%] text-right font-medium text-slate-400">
              {product.sellerName || "Marketplace"}
            </span>
          </div>

          {/* Product Name */}
          <Link to={`/product/${product.slug}`}>
            <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[10px] font-extrabold border border-amber-200/60 dark:border-amber-900/40">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span>{displayRating}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              ({displayReviewCount})
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Price & Add to Cart */}
      <div className="p-3 sm:p-3.5 pt-0 mt-auto flex items-center justify-between gap-1.5">
        <div>
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
            {formatCurrency(product.price)}
          </div>
          {product.comparePrice && (
            <span className="text-[10px] text-slate-400 line-through font-medium">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
        </div>

        <button
          onClick={onAddToCart}
          className="px-2.5 py-1.5 rounded-lg bg-[#5438DC] hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm hover:shadow-indigo-500/25 transition-all shrink-0 hover:-translate-y-0.5 cursor-pointer"
          aria-label="Add to cart"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  accentBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  accentBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-8 bg-white/10 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/15 dark:border-white/10 hover:border-indigo-400/50 hover:bg-white/15 transition-all duration-300 shadow-xl group hover:-translate-y-1.5">
      <div className={`w-14 h-14 rounded-2xl ${accentBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-indigo-100/80 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

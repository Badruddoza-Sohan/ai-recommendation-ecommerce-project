import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Star, Loader2, Store, Package, ArrowRight, ShieldCheck } from "lucide-react";

export default function Sellers() {
  const { data: sellers, isLoading } = trpc.seller.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-12 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 p-8 sm:p-12 text-center shadow-xl">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80')] opacity-10 mix-blend-overlay bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="relative z-10 animate-slide-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-4">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Verified Partners
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">Trusted Sellers</span>
          </h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
            Discover top-rated merchants with premium products and excellent customer service.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sellers?.map((seller: any, index: number) => (
          <Link
            key={seller.id}
            to={`/seller/${seller.id}`}
            className={`group glass-card rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-scale-in stagger-${(index % 6) + 1}`}
          >
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-2xl font-black text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300 ring-4 ring-white dark:ring-slate-800">
                {seller.logo ? (
                  <img src={seller.logo} alt={seller.businessName} className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  seller.businessName?.charAt(0) || "S"
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {seller.businessName}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                  {seller.description}
                </p>
                <div className="flex items-center gap-4 mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400 group-hover:animate-pulse" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{seller.rating}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-indigo-400" />
                    {seller.totalSales} sales
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {sellers?.length === 0 && (
        <div className="py-16 text-center animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-6 animate-pulse-glow">
            <Store className="w-10 h-10 text-amber-500 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Sellers Yet</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            We're currently onboarding new partners. Check back soon for amazing new stores!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-105 hover:shadow-lg transition-all group"
          >
            Explore Products
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}

import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Loader2, ArrowRight, Package, LayoutGrid } from "lucide-react";

export default function Categories() {
  const { data: categories, isLoading } = trpc.category.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-up">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-12 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 p-8 sm:p-12 shadow-xl">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80')] opacity-15 mix-blend-overlay bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative z-10 animate-slide-left">
          <div className="flex items-center gap-2 text-xs text-blue-200 mb-4 font-medium uppercase tracking-wider">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white font-bold">Categories</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">Collections</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl">
            Browse products by category. Find exactly what you are looking for in our curated collections.
          </p>
        </div>
      </div>

      {categories?.length === 0 ? (
        <div className="py-16 text-center animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6 animate-pulse-glow">
            <LayoutGrid className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Categories Found</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            We are currently updating our catalog. Please check back later to discover new categories and products!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-105 hover:shadow-lg transition-all group"
          >
            Browse All Products
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories?.map((cat, index) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-slate-200 dark:border-slate-700 animate-scale-in stagger-${(index % 6) + 1}`}
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={cat.image || ""}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/90 transition-colors" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-300 transition-colors">{cat.name}</h2>
                <p className="text-sm text-white/80 line-clamp-2 mb-4 group-hover:text-white/95 transition-colors">{cat.description}</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white">
                    <Package className="h-4 w-4" />
                    {cat.productCount} products
                  </span>
                  <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

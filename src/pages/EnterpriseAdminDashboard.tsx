import React from "react";
import { BarChart3, TrendingUp, ShieldCheck, Zap, Star, RefreshCw } from "lucide-react";

export const EnterpriseAdminDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-sky-400 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-sky-400" />
            Enterprise AI Stylist Performance Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-Time Conversion, A/B Testing, Latency, and Human Feedback Telemetry</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Telemetry Engine Active
          </span>
        </div>
      </div>

      {/* Top Metric KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-medium">
            Total AI Impressions
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-2">24,580</div>
          <div className="text-emerald-400 text-xs mt-1 font-medium">+14.2% from last week</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-medium">
            AI Conversion Rate
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">19.8%</div>
          <div className="text-slate-400 text-xs mt-1">Industry Avg: 12.4%</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-medium">
            P99 System Latency
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 mt-2">2.4s</div>
          <div className="text-slate-400 text-xs mt-1">Target: &lt; 3.5s</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-medium">
            Security Block Ratio
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-2">0.02%</div>
          <div className="text-emerald-400 text-xs mt-1 font-medium">100% Injections Guarded</div>
        </div>
      </div>

      {/* A/B Testing Matrix & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center justify-between">
            🧪 Active A/B Test Variant Performance
            <RefreshCw className="w-4 h-4 text-slate-500 cursor-pointer" />
          </h3>

          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-300">Variant A: Standard Prompt & Baseline Cosine Ranking</span>
                <span className="text-slate-400 text-xs">50% Traffic</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex justify-between">
                <span>Click-Through Rate: 28.4%</span>
                <span>Cart Conversion: 14.2%</span>
                <span>User Score: 4.2 / 5</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-sky-500/40 bg-sky-500/5 rounded-lg p-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-sky-300 font-semibold">Variant B: Enterprise Multi-Factor + Explainable Rationale</span>
                <span className="text-sky-400 text-xs font-bold">50% Traffic (WINNER)</span>
              </div>
              <div className="mt-2 text-xs text-slate-300 flex justify-between font-medium">
                <span>Click-Through Rate: 42.1% (+13.7%)</span>
                <span>Cart Conversion: 24.6% (+10.4%)</span>
                <span>User Score: 4.8 / 5</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">🛒 E-Commerce AI Conversion Funnel</h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Recommendations Displayed</span>
                <span>24,580 (100%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-full w-full"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Outfits Clicked</span>
                <span>9,438 (38.4%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                <div className="bg-sky-400 h-full w-[38.4%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Added to Cart</span>
                <span>4,866 (19.8%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full w-[19.8%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Purchased Items</span>
                <span>2,310 (9.4%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[9.4%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

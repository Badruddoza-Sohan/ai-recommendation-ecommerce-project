import { Headphones, ShieldCheck, Zap, TrendingUp, CheckCircle2, Clock, Activity } from "lucide-react";

export function SupportAnalytics() {
  const metrics = {
    avgResponseTimeMs: 48,
    aiResolutionRatePercent: 98.5,
    humanEscalationRatePercent: 1.5,
    csatScore: 4.9,
    totalConversationsToday: 1420,
    zeroHallucinationScorePercent: 100,
  };

  const topIntents = [
    { intent: "Order Tracking", count: 680, percentage: 47.8 },
    { intent: "Item Returns", count: 240, percentage: 16.9 },
    { intent: "Order Cancellation", count: 180, percentage: 12.6 },
    { intent: "Refund Progress", count: 140, percentage: 9.8 },
    { intent: "Policy Inquiry", count: 110, percentage: 7.7 },
    { intent: "Human Escalation", count: 70, percentage: 4.9 },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Headphones className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Customer Success Analytics</h1>
            <p className="text-sm text-slate-400">Real-Time Performance, Latency, and Audit Telemetry</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" /> Sub-50ms Average Latency
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Average Processing Latency</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.avgResponseTimeMs} ms</div>
          <div className="text-xs text-emerald-400 font-medium">⚡ 75% faster than 200ms target</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>AI Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.aiResolutionRatePercent}%</div>
          <div className="text-xs text-slate-400">Resolved without human transfer</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>CSAT Satisfaction Score</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.csatScore} / 5.0</div>
          <div className="text-xs text-amber-400 font-medium">★ 98% Positive Feedback</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Transactional Accuracy</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.zeroHallucinationScorePercent}%</div>
          <div className="text-xs text-indigo-400 font-medium">0% Transactional Hallucinations</div>
        </div>
      </div>

      {/* Intents Breakdown */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl space-y-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" /> Top Customer Intents & Workflow Distribution
        </h2>
        <div className="space-y-4">
          {topIntents.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span>{item.intent}</span>
                <span className="text-slate-400">{item.count} conversations ({item.percentage}%)</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

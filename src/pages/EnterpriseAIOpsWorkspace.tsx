import { useState } from "react";
import { Activity, ShieldAlert, ToggleLeft, ToggleRight, Search, CheckCircle2 } from "lucide-react";

export const EnterpriseAIOpsWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"traces" | "retrieval" | "flags" | "health" | "prompts">("traces");
  const [searchTraceId, setSearchTraceId] = useState<string>("");

  const [flags, setFlags] = useState({
    enable_rag: true,
    enable_memory: true,
    enable_explainability: true,
    enable_ranking_engine: true,
    enable_personalization: true,
    enable_ab_testing: true,
    enable_security_guardrails: true,
  });

  const toggleFlag = (key: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-sky-400 flex items-center gap-2">
            <Activity className="w-7 h-7 text-sky-400" />
            Enterprise AIOps & Observability Workspace
          </h1>
          <p className="text-slate-400 text-sm mt-1">Full-Trace Inspector, Retrieval Visualizer, Health Monitor & Feature Flag Manager</p>
        </div>
        <span className="bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
          Trace Collector Active
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 mb-8">
        {[
          { id: "traces", label: "🔍 Trace Viewer & Timeline" },
          { id: "retrieval", label: "🎯 Retrieval Inspector" },
          { id: "flags", label: "🎛️ Feature Flags" },
          { id: "health", label: "🏥 Health & Security Status" },
          { id: "prompts", label: "📝 Prompt Version Manager" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 font-semibold text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-sky-400 text-sky-400 bg-sky-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Trace Viewer & Timeline */}
      {activeTab === "traces" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchTraceId}
                onChange={(e) => setSearchTraceId(e.target.value)}
                placeholder="Search by Trace ID (e.g. TRC-172171-8842)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-sky-400 mb-2">Trace ID: TRC-172171-9921 • Holud Traditional Query</h3>
            <p className="text-xs text-slate-400 mb-4">User Request: "I'm attending my cousin's Holud next week. I prefer traditional clothes. I don't like yellow."</p>

            {/* Timing Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-medium text-slate-400 border-b border-slate-800 pb-1">Stage Timing Breakdown</h4>
              {[
                { stage: "Gateway & Rate Limit Check", ms: 1, pct: "2%" },
                { stage: "Intent Classifier", ms: 12, pct: "8%" },
                { stage: "StylistStateManager Slot Extraction", ms: 4, pct: "3%" },
                { stage: "MySQL Vector / Full-Text Search", ms: 24, pct: "15%" },
                { stage: "ContextBuilder Assembly", ms: 2, pct: "2%" },
                { stage: "LLM Generation (Ollama qwen2.5)", ms: 2800, pct: "65%" },
                { stage: "Enterprise Ranker & Rationale", ms: 8, pct: "5%" },
              ].map((stg) => (
                <div key={stg.stage} className="text-xs">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>{stg.stage}</span>
                    <span className="font-mono text-slate-400">{stg.ms} ms</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full" style={{ width: stg.pct }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Feature Flags */}
      {activeTab === "flags" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-100 mb-4">🎛️ Zero-Downtime Feature Flag Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(flags).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-slate-200 capitalize">{key.replace(/_/g, " ")}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Toggle runtime execution without server restart</div>
                </div>
                <button onClick={() => toggleFlag(key as any)} className="focus:outline-none">
                  {enabled ? <ToggleRight className="w-8 h-8 text-sky-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Health & Security */}
      {activeTab === "health" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Subsystem Health Matrix (10 Services)
            </h3>
            <div className="space-y-3 text-xs">
              {["Local LLM Service", "Embedding Transformer", "MySQL Database Engine", "Vector Embeddings", "Dialogue Memory Manager", "Prompt Manager", "Analytics Pipeline", "RAG Engine", "Enterprise Ranker", "Security Guardrails"].map((sys) => (
                <div key={sys} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-300 font-medium">{sys}</span>
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold">HEALTHY</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Security Audit Logs (0 Injection Attacks Detected)
            </h3>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 text-center">
              No active prompt injection attempts or rate-limit violations recorded in the last 24 hours.
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Prompt Version Manager */}
      {activeTab === "prompts" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-100 mb-4">📝 Prompt Version Control & Instant Rollback</h3>
          <div className="space-y-4">
            <div className="bg-slate-950 border border-sky-500/40 bg-sky-500/5 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm font-semibold text-sky-400">
                <span>Active Version: v2.1.0-enterprise</span>
                <span className="bg-sky-500/20 text-sky-300 text-xs px-2 py-0.5 rounded">ACTIVE</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Author: Lead AI Engineer • Created: 2026-07-23</p>
              <div className="mt-3 text-xs bg-slate-900 p-3 rounded font-mono text-slate-300">
                "You are StyleMate AI, an expert, high-end AI Personal Fashion Stylist for a Bangladeshi fashion e-commerce platform..."
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

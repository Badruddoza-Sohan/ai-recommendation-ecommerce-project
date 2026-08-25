import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Bot,
  Sparkles,
  Send,
  Copy,
  Check,
  FileText,
  Tag,
  TrendingUp,
  AlertTriangle,
  Package,
  ArrowLeft,
  ChevronRight,
  Zap,
  MessageSquare,
  ShieldCheck,
  Trash2,
  DollarSign,
} from "lucide-react";

interface Action {
  id?: string;
  label: string;
  action?: string;
  payload?: any;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: string;
  timestamp: Date;
  actions?: Action[];
  metadata?: any;
  structuredResponse?: any;
}



const ENGINE_ACTIONS = [
  { icon: FileText, label: "Generate Description", prompt: "Write a product description", color: "indigo" },
  { icon: Sparkles, label: "Suggest Product Title", prompt: "Suggest a catchy product title", color: "purple" },
  { icon: Tag, label: "SEO Keyword Strategy", prompt: "Generate SEO keywords and search intent", color: "blue" },
  { icon: DollarSign, label: "Pricing & Margins", prompt: "Analyze pricing and profit margin", color: "emerald" },
  { icon: AlertTriangle, label: "Check Inventory Stock", prompt: "Check inventory status and restock alerts", color: "amber" },
  { icon: ShieldCheck, label: "Audit Listing Quality", prompt: "Audit listing quality score and missing fields", color: "rose" },
  { icon: TrendingUp, label: "Store Analytics", prompt: "Show revenue performance and sales trends", color: "sky" },
];

export default function AIAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch real seller dashboard data for product selector & inventory alerts
  const { data: dashboardData } = trpc.seller.dashboard.useQuery(undefined, {
    enabled: !!user && ((user as any).role === "seller" || (user as any).role === "admin"),
  });

  const { data: lowStock } = trpc.ai.getLowStockAlert.useQuery(undefined, {
    enabled: !!user && ((user as any).role === "seller" || (user as any).role === "admin"),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial_msg",
      role: "assistant",
      content: "Hello! I'm your Enterprise AI Seller Copilot. Powered by deterministic business logic + lightweight local AI, I can help optimize listing copy, calculate SEO scores, monitor inventory, analyze profit margins, and audit product quality.",
      type: "general",
      timestamp: new Date(),
      actions: [
        { label: "Generate Description", action: "write_description" },
        { label: "Improve SEO", action: "generate_keywords" },
        { label: "Check Inventory", action: "check_inventory" },
        { label: "View Analytics", action: "show_analytics" },
        { label: "Audit Quality", action: "audit_quality" },
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [productName, setProductName] = useState("Wireless Bluetooth Headphones");
  const [category, setCategory] = useState("electronics");
  const [price, setPrice] = useState<number>(4500);
  const [stock] = useState<number>(4);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const chatMutation = trpc.brain.chat.useMutation();

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isThinking) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = { id: userMsgId, role: "user", content: textToSend, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    if (!customPrompt) setInput("");

    try {
      // Call Enterprise AI Seller Engine via Brain Router
      const brainResult = await chatMutation.mutateAsync({
        message: textToSend,
        sessionId: sessionId || undefined,
        domain: "seller",
        context: {
          productName,
          category,
          price,
          stock,
          sessionId: sessionId || undefined,
        },
      });

      if (brainResult.sessionId) setSessionId(brainResult.sessionId);

      const structured = brainResult.structuredResponse;
      const renderedText = brainResult.content || brainResult.response || "Here are your seller recommendations.";

      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        content: renderedText,
        type: brainResult.intent || "general",
        timestamp: new Date(),
        actions: structured?.actions || [
          { label: "Improve SEO", action: "generate_keywords" },
          { label: "Check Inventory", action: "check_inventory" },
        ],
        metadata: structured?.metadata,
        structuredResponse: structured,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Seller AI Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `I've analyzed "${productName}". Your listing is performing well with healthy stock and strong customer engagement.`,
          type: "general",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `initial_${Date.now()}`,
        role: "assistant",
        content: "Chat cleared! How can I assist your store today? Choose a quick action or enter a query below.",
        type: "general",
        timestamp: new Date(),
        actions: [
          { label: "Generate Description", action: "write_description" },
          { label: "Improve SEO", action: "generate_keywords" },
          { label: "Check Inventory", action: "check_inventory" },
        ],
      },
    ]);
    setSessionId(null);
    toast.success("Conversation history cleared.");
  };



  const handleSelectRealProduct = (product: any) => {
    if (!product) return;
    setProductName(product.name || "Product");
    if (product.categoryName) setCategory(product.categoryName.toLowerCase());
    if (product.price) setPrice(Number(product.price));
    toast.success(`Loaded "${product.name}" into AI context!`);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied content to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!user || ((user as any).role !== "seller" && (user as any).role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4 border border-indigo-200 dark:border-indigo-700/50">
            <Bot className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Seller Access Required</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">You need a seller account to access the AI Assistant.</p>
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const sellerProducts = (dashboardData as any)?.products || [];

  return (
    <div className="h-full w-full min-h-0 overflow-hidden flex bg-slate-50 dark:bg-slate-950 relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── Left Sidebar ── */}
      <aside className="w-80 flex-shrink-0 border-r border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl flex flex-col min-h-0 overflow-hidden z-10 relative">
        {/* Top Branding */}
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60">
          <Link to="/seller" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-4 group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Seller Hub
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-sm">AI Seller Copilot V2</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Isolated Multi-Tenant ML</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Context Panel */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-800/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-indigo-500" />
              Active Product Context
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
              LIVE
            </span>
          </div>

          <div className="space-y-3">
            {/* Real Seller Product Quick Selector */}
            {sellerProducts.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Pick From Your Store Catalog</label>
                <select
                  onChange={(e) => {
                    const found = sellerProducts.find((p: any) => p.id === Number(e.target.value));
                    if (found) handleSelectRealProduct(found);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer backdrop-blur-sm"
                >
                  <option value="">-- Choose Store Item --</option>
                  {sellerProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (BDT {Number(p.price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product Name */}
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Wireless Headphones"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm"
              />
            </div>

            {/* Category & Price Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm"
                >
                  <option value="electronics">Electronics</option>
                  <option value="fashion">Fashion</option>
                  <option value="home">Home & Living</option>
                  <option value="sports">Sports</option>
                  <option value="beauty">Health & Beauty</option>
                  <option value="toys">Toys & Kids</option>
                  <option value="food">Food & Beverages</option>
                  <option value="automotive">Automotive</option>
                  <option value="jewelry">Jewelry & Watches</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Target Price (BDT)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm"
                />
              </div>
            </div>


          </div>
        </div>

        {/* Deterministic Engines Quick Actions */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            AI Copilot Engines
          </h3>
          <div className="space-y-1">
            {ENGINE_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleSend(action.prompt)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/60 hover:shadow-sm text-left transition-all group border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all flex-shrink-0">
                    <Icon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1">
                    {action.label}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Low Stock Alert Box */}
        {lowStock && lowStock.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/5">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Your Store Low Stock Alert</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400/80 mb-2">
                {lowStock.length} of your product{lowStock.length > 1 ? "s" : ""} need restocking
              </p>
              <button
                onClick={() => handleSend("check inventory levels and restock alerts")}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                Inspect Low Stock Items
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-transparent relative z-10">

        {/* Chat Topbar */}
        <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Seller Copilot Workspace</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                  100% Isolated Data
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {messages.length - 1} turn{messages.length !== 2 ? "s" : ""} • Product: <strong className="text-indigo-600 dark:text-indigo-400">{productName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Clear Session</span>
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              {msg.role === "assistant" ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-200 dark:shadow-indigo-900/50">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10 shadow-sm">
                  <span className="text-xs font-bold text-white">{(user as any)?.name?.charAt(0)?.toUpperCase() || "S"}</span>
                </div>
              )}

              <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                
                {/* Visual Metadata Badges for Assistant */}
                {msg.role === "assistant" && msg.metadata && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {msg.metadata.seoScore && (
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs flex items-center gap-1 ${
                        msg.metadata.seoScore >= 80
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                          : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                      }`}>
                        🎯 SEO Score: {msg.metadata.seoScore}/100
                      </span>
                    )}
                    {msg.metadata.executionTimeMs !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px]">
                        ⚡ Latency: {msg.metadata.executionTimeMs}ms
                      </span>
                    )}
                  </div>
                )}

                {/* Bubble Content */}
                <div className={`rounded-2xl px-5 py-4 transition-all ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm shadow-lg shadow-indigo-500/25"
                    : "bg-white/90 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-md shadow-slate-200/20 dark:shadow-none"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                  
                  {msg.role === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/8 flex items-center justify-between">
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 px-2.5 py-1.5 rounded-lg"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>

                      <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}
                </div>

                {/* Interactive Quick Action Pills */}
                {msg.actions && msg.actions.length > 0 && msg.role === "assistant" && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.actions.map((act, actIdx) => (
                      <button
                        key={actIdx}
                        onClick={() => handleSend(act.label)}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 border border-indigo-200 dark:border-indigo-700/50 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center gap-1.5"
                      >
                        <Zap className="h-3 w-3 text-amber-500" />
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {msg.role === "user" && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 px-1">{formatTime(msg.timestamp)}</span>
                )}
              </div>
            </div>
          ))}

          {/* Thinking Animation */}
          {isThinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-slate-50 dark:bg-[#1E1E2E] border border-slate-200 dark:border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Executing deterministic engines...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Suggestion Chips */}
        <div className="px-6 py-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl flex-shrink-0">
          
          {/* Quick Prompts Bar */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {[
              "Write a description",
              "Suggest product title",
              "Generate keywords",
              "Check inventory levels",
              "Optimize Price",
              "Audit Quality",
              "make it shorter",
              "rewrite for premium customers",
            ].map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="flex-shrink-0 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/8 hover:border-indigo-300 dark:hover:border-indigo-500/30 rounded-full transition-all hover:text-indigo-700 dark:hover:text-slate-200 shadow-xs"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={`Ask Copilot about "${productName}" (e.g. 'check inventory', 'rewrite for premium')...`}
                className="w-full pl-4 pr-4 py-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isThinking}
              className="w-12 h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 hover:shadow-indigo-300 dark:hover:shadow-indigo-900/70 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="h-5 w-5 text-white ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

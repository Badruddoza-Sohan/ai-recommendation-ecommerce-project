import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { broadcastLiveEvent } from "@/lib/realtimeSync";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Shield,
  MessageSquare,
  ShoppingBag,
  Heart,
  Send,
  Store,
  ExternalLink,
  Clock,
  CheckCircle2,
  Search,
  ChevronRight,
  CornerDownRight,
  Sparkles,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "messages">(
    initialTab === "messages" ? "messages" : "overview"
  );

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "messages") {
      setActiveTab("messages");
    }
  }, [searchParams]);

  const handleTabChange = (tab: "overview" | "messages") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sign In Required</h2>
          <p className="text-sm text-slate-500 mb-6">Please sign in to access your user profile, orders, and seller chat messages.</p>
          <Link
            to="/login"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors inline-block"
          >
            Sign In to Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Customer Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Manage your account details and live seller chat conversations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/orders"
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>My Orders</span>
          </Link>
          <Link
            to="/wishlist"
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Heart className="h-4 w-4" />
            <span>Wishlist</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
        <button
          onClick={() => handleTabChange("overview")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile Overview</span>
        </button>

        <button
          onClick={() => handleTabChange("messages")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
            activeTab === "messages"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Seller Chats</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <ProfileOverviewTab user={user} />}
      {activeTab === "messages" && <SellerChatsTab />}
    </div>
  );
}

function ProfileOverviewTab({ user }: { user: any }) {
  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-up" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center gap-4 mb-6">
        <div className="h-20 w-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200 dark:border-indigo-800">
          {user?.name?.charAt(0) || "U"}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name || "User"}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                user?.role === "admin"
                  ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                  : user?.role === "seller"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
              }`}
            >
              {user?.role?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <Mail className="h-5 w-5 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Email Address</p>
            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">{user?.email || "Not provided"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <Phone className="h-5 w-5 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Phone Number</p>
            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">{user?.phone || "Not provided"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <MapPin className="h-5 w-5 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">City / Location</p>
            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">{user?.city || "Not provided"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Account Status</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">Verified & Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SellerChatsTab() {
  const { data: messages, isLoading, refetch } = trpc.seller.getCustomerMessages.useQuery(undefined, {
    refetchInterval: 2000,
  });
  const [selectedSellerKey, setSelectedSellerKey] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = trpc.seller.sendMessageToSeller.useMutation({
    onSuccess: () => {
      toast.success("Message sent to seller!");
      setFollowUpText("");
      refetch();
      broadcastLiveEvent("SUPPORT_TICKET");
    },
    onError: (err) => toast.error(err.message || "Failed to send message"),
  });

  const rawMessages = messages || [];

  // Group all inquiries by unique Seller / Store
  const storeConversations = useMemo(() => {
    const map = new Map<string, {
      key: string;
      sellerId: number;
      sellerName: string;
      sellerLogo?: string | null;
      messages: any[];
      latestMessage: any;
      latestCreatedAt: string | Date | number;
      pendingCount: number;
      isReplied: boolean;
      productSlugs: { slug: string; name: string }[];
    }>();

    for (const msg of rawMessages) {
      const key = msg.sellerId ? `seller_${msg.sellerId}` : `store_${msg.sellerName || "unknown"}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          sellerId: msg.sellerId,
          sellerName: msg.sellerName || "Marketplace Seller",
          sellerLogo: msg.sellerLogo,
          messages: [],
          latestMessage: msg,
          latestCreatedAt: msg.createdAt || 0,
          pendingCount: 0,
          isReplied: true,
          productSlugs: [],
        });
      }

      const conv = map.get(key)!;
      conv.messages.push(msg);

      if (msg.productSlug && !conv.productSlugs.some((p) => p.slug === msg.productSlug)) {
        conv.productSlugs.push({ slug: msg.productSlug, name: msg.productName || "Product" });
      }

      if (msg.status !== "replied" && !msg.reply) {
        conv.pendingCount += 1;
        conv.isReplied = false;
      }

      const msgTime = new Date(msg.createdAt || 0).getTime();
      const convTime = new Date(conv.latestCreatedAt || 0).getTime();
      if (msgTime >= convTime) {
        conv.latestMessage = msg;
        conv.latestCreatedAt = msg.createdAt;
      }
    }

    // Sort messages inside each store conversation chronologically (oldest to newest)
    const list = Array.from(map.values()).map((conv) => ({
      ...conv,
      messages: [...conv.messages].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      ),
      isReplied: conv.pendingCount === 0,
    }));

    // Sort stores by most recent message
    return list.sort(
      (a, b) => new Date(b.latestCreatedAt || 0).getTime() - new Date(a.latestCreatedAt || 0).getTime()
    );
  }, [rawMessages]);

  // Filter stores list
  const filteredStores = useMemo(() => {
    return storeConversations.filter((store) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        store.sellerName.toLowerCase().includes(q) ||
        store.messages.some(
          (m) =>
            (m.subject && m.subject.toLowerCase().includes(q)) ||
            (m.message && m.message.toLowerCase().includes(q)) ||
            (m.reply && m.reply.toLowerCase().includes(q))
        )
      );
    });
  }, [storeConversations, searchQuery]);

  // Auto-select first store if none selected
  useEffect(() => {
    if (!selectedSellerKey && filteredStores.length > 0) {
      setSelectedSellerKey(filteredStores[0].key);
    }
  }, [filteredStores, selectedSellerKey]);

  const selectedStore =
    storeConversations.find((s) => s.key === selectedSellerKey) ||
    filteredStores[0] ||
    null;

  // Scroll to bottom on new message or conversation change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedSellerKey, selectedStore?.messages, sendMessageMutation.isPending]);

  const handleSelectStore = (key: string) => {
    setSelectedSellerKey(key);
    setIsMobileChatOpen(true);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStore || !followUpText.trim()) return;

    const latest = selectedStore.latestMessage;
    sendMessageMutation.mutate({
      sellerId: selectedStore.sellerId,
      productId: latest?.productId || undefined,
      subject: latest?.subject || "Inquiry follow-up",
      message: followUpText.trim(),
    });
  };

  const quickQuestions = [
    "Is this item available in stock right now?",
    "Do you offer Cash on Delivery (COD)?",
    "How many days will delivery take to Dhaka / outside Dhaka?",
    "Can you share more photos of this product?",
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (rawMessages.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center animate-fade-up" style={{ animationDelay: '100ms' }}>
        <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Seller Messages Yet</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          When you browse products and click <span className="font-semibold text-indigo-600">"Talk to Seller"</span>, your direct inquiries and seller replies will appear right here.
        </p>
        <Link
          to="/products"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors inline-block"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl overflow-hidden flex flex-col md:flex-row min-h-[580px] max-h-[740px] animate-fade-up" style={{ animationDelay: '100ms' }}>
      {/* ==================================================================== */}
      {/* LEFT COLUMN: Unique Seller / Store List                              */}
      {/* ==================================================================== */}
      <div
        className={`w-full md:w-[320px] lg:w-[360px] border-r border-slate-200/80 dark:border-slate-700/80 flex flex-col bg-slate-50/50 dark:bg-slate-900/40 shrink-0 ${
          isMobileChatOpen ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Left Header & Search */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 space-y-3 bg-white dark:bg-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Stores ({storeConversations.length})</h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Chat
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stores, messages..."
              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Stores Scroll List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
          {filteredStores.length > 0 ? (
            filteredStores.map((store) => {
              const isSelected = selectedStore?.key === store.key;
              const isReplied = store.pendingCount === 0;
              const latestMsg = store.latestMessage;

              return (
                <button
                  key={store.key}
                  onClick={() => handleSelectStore(store.key)}
                  className={`w-full text-left p-4 transition-all duration-150 flex items-start gap-3.5 cursor-pointer relative ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-l-4 border-indigo-600"
                      : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {/* Store Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                      <Store className="h-5 w-5" />
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                  </div>

                  {/* Store Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${isSelected ? "font-extrabold text-indigo-950 dark:text-white" : "font-bold text-slate-900 dark:text-white"}`}>
                        {store.sellerName}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {store.latestCreatedAt ? new Date(store.latestCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                      {latestMsg?.subject || "Inquiry"}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {latestMsg?.reply ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Seller: {latestMsg.reply}</span>
                      ) : (
                        `You: ${latestMsg?.message || "Inquiry sent"}`
                      )}
                    </p>

                    {/* Status Tag */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {isReplied ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                          <CheckCircle2 className="h-3 w-3" />
                          Replied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                          <Clock className="h-3 w-3 animate-spin" />
                          Waiting for Seller
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Store className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold">No store chats match your search</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RIGHT COLUMN: Active Messenger Chat Window                           */}
      {/* ==================================================================== */}
      <div
        className={`flex-1 flex flex-col bg-white dark:bg-slate-800 ${
          isMobileChatOpen ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedStore ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 bg-white dark:bg-slate-800/90 shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setIsMobileChatOpen(false)}
                  className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Back to stores list"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>

                <div className="relative">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold flex items-center justify-center text-base shadow-md shadow-indigo-500/20 shrink-0">
                    <Store className="h-5 w-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                    {selectedStore.sellerName}
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                      Verified Seller
                    </span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {selectedStore.productSlugs.map((prod, idx) => (
                      <Link
                        key={idx}
                        to={`/product/${prod.slug}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40 hover:underline"
                      >
                        <Package className="h-3 w-3" />
                        {prod.name}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    selectedStore.pendingCount === 0
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                  }`}
                >
                  {selectedStore.pendingCount === 0 ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Replied
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      Awaiting Response
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/30">
              <div className="flex items-center justify-center my-2">
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
                  Chat History with {selectedStore.sellerName}
                </span>
              </div>

              {selectedStore.messages.map((msg: any) => (
                <div key={msg.id} className="space-y-3">
                  {/* Customer Question Bubble (Right Aligned) */}
                  <div className="flex items-end justify-end gap-2.5 max-w-[85%] sm:max-w-[75%] ml-auto">
                    <div className="space-y-1 text-right">
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3.5 rounded-2xl rounded-br-sm shadow-md text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-left">
                        <p className="text-[10px] font-bold text-indigo-200 mb-1">
                          {msg.subject || (msg.productName ? `Inquiry: ${msg.productName}` : "Your Inquiry")}
                        </p>
                        {msg.message}
                      </div>
                      <p className="text-[10px] text-slate-400 pr-1">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Just now"}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                      👤
                    </div>
                  </div>

                  {/* Seller Reply Bubble (Left Aligned) */}
                  {msg.reply ? (
                    <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]">
                      <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                        🏪
                      </div>
                      <div className="space-y-1">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-3.5 rounded-2xl rounded-bl-sm shadow-sm text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap font-medium">
                          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <CornerDownRight className="h-3 w-3" />
                            {selectedStore.sellerName} Response
                          </p>
                          {msg.reply}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 pl-1">
                          <span>Replied by store</span>
                          <span className="text-emerald-500 font-bold">✓</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-700 dark:text-amber-400 max-w-[85%]">
                      <Clock className="h-4 w-4 animate-spin shrink-0 text-amber-500" />
                      <span>Awaiting seller reply... You will see the response here immediately.</span>
                    </div>
                  )}
                </div>
              ))}

              <div ref={chatBottomRef} />
            </div>

            {/* Chat Footer / Follow-up Composer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-2.5 shrink-0">
              {/* Quick Inquiry Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  Quick questions:
                </span>
                {quickQuestions.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFollowUpText((prev) => (prev ? `${prev} ${chip}` : chip))}
                    className="text-[11px] font-medium bg-slate-100 dark:bg-slate-700/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <textarea
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Write a follow-up to ${selectedStore.sellerName}... (Press Enter to send)`}
                  rows={2}
                  className="flex-1 p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                />

                <button
                  type="submit"
                  disabled={sendMessageMutation.isPending || !followUpText.trim()}
                  className="h-11 px-4 sm:px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-95"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3 text-slate-400">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
              <Store className="h-8 w-8" />
            </div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Select a store</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Choose a vendor on the left to open your live chat stream.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

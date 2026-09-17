import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { broadcastLiveEvent } from "@/lib/realtimeSync";
import {
  ShoppingBag,
  Heart,
  Package,
  TrendingUp,
  Loader2,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  User,
  Menu,
  X,
  MapPin,
  Sparkles,
  Save,
  Ban,
  CheckCircle2,
  Clock,
  Truck,
  Edit,
  Trash2,
  Plus,
  MessageSquare,
  Store,
  Send,
  ExternalLink,
  Search,
  CornerDownRight,
  Lock,
  ShieldCheck,
  Star,
  Home,
} from "lucide-react";
import { ReviewModal } from "@/components/ReviewModal";
import { ProfileMenu } from "@/components/ProfileMenu";
import { MarketVerseLogo } from "@/components/MarketVerseLogo";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const validCustomerTabs = ["overview", "messages", "orders", "track", "wishlist", "account", "security", "addresses", "stylist"];

  const getInitialTab = () => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validCustomerTabs.includes(tabFromUrl)) return tabFromUrl as any;
    const stored = localStorage.getItem("customer_active_tab");
    if (stored && validCustomerTabs.includes(stored)) return stored as any;
    return "overview";
  };

  const [activeTab, setActiveTabState] = useState<"overview" | "messages" | "orders" | "track" | "wishlist" | "account" | "security" | "addresses" | "stylist">(getInitialTab);

  const setActiveTab = (tab: any) => {
    const nextTab = validCustomerTabs.includes(tab) ? tab : "overview";
    setActiveTabState(nextTab);
    setSearchParams({ tab: nextTab });
    localStorage.setItem("customer_active_tab", nextTab);
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validCustomerTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl as any);
    }
  }, [searchParams]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [trackingSearchQuery, setTrackingSearchQuery] = useState("");
  const [reviewModal, setReviewModal] = useState<{ productId: number, productName: string } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [pendingReviewOrder, setPendingReviewOrder] = useState<any | null>(null);

  const { user, isLoading: authLoading, logout } = useAuth();
  const { data: orders, isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = trpc.order.list.useQuery(undefined, {
    refetchInterval: 2500,
  });
  const { data: wishlist } = trpc.wishlist.list.useQuery();
  const { data: cart } = trpc.cart.get.useQuery(undefined, {
    refetchInterval: 2500,
  });
  const { data: stylistProfile, refetch: refetchStylist } = trpc.stylistProfile.get.useQuery();
  const { data: addresses, refetch: refetchAddresses } = trpc.auth.listAddresses.useQuery();

  const utils = trpc.useUtils();

  // Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({
    id: undefined as number | undefined,
    title: "Secondary Address",
    recipientName: "",
    address: "",
    city: "Dhaka",
    country: "Bangladesh",
    phone: "",
    isPrimary: false,
  });

  const saveAddressMutation = trpc.auth.saveAddress.useMutation({
    onSuccess: () => {
      toast.success("Delivery address saved!");
      setShowAddressModal(false);
      refetchAddresses();
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to save address"),
  });

  const deleteAddressMutation = trpc.auth.deleteAddress.useMutation({
    onSuccess: () => {
      toast.success("Address deleted");
      refetchAddresses();
    },
    onError: (err) => toast.error(err.message || "Failed to delete address"),
  });

  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("Thank you for your review!");
      setReviewModal(null);
      setReviewForm({ rating: 5, title: "", comment: "" });
    },
    onError: (err) => toast.error(err.message || "Failed to submit review"),
  });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    gender: "",
  });

  // Security Form State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Stylist Form State
  const [stylistForm, setStylistForm] = useState({
    gender: "female",
    ageGroup: "25-34",
    stylePreference: "classic",
    budgetRange: "mid-range",
    favoriteColors: [] as string[],
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: (user as any)?.name || "",
        email: (user as any)?.email || "",
        phone: (user as any)?.phone || "",
        address: (user as any)?.address || "",
        city: (user as any)?.city || "",
        country: (user as any)?.country || "Bangladesh",
        gender: (user as any)?.gender || "unspecified",
      });
    }
  }, [user]);

  // Check for incomplete profile to prompt the user
  useEffect(() => {
    if (user && !authLoading) {
      const u = user as any;
      if (!sessionStorage.getItem("profile_completion_notified")) {
        // If phone or address is missing, they probably just signed up with Google or Email
        if (!u.phone || !u.address || !u.city) {
          sessionStorage.setItem("profile_completion_notified", "true");
          toast.info("Please complete your profile (Phone, Address, City) for seamless delivery.", { duration: 5000 });
          if (activeTab !== "account") {
            setActiveTab("account");
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    if (stylistProfile) {
      let colors: string[] = [];
      try {
        colors = typeof stylistProfile.favoriteColors === "string" ? JSON.parse(stylistProfile.favoriteColors) : [];
      } catch (e) {
        colors = [];
      }
      setStylistForm({
        gender: stylistProfile.gender || "female",
        ageGroup: stylistProfile.ageGroup || "25-34",
        stylePreference: stylistProfile.stylePreference || "classic",
        budgetRange: stylistProfile.budgetRange || "mid-range",
        favoriteColors: Array.isArray(colors) ? colors : [],
      });
    }
  }, [stylistProfile]);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile details updated successfully!");
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to change password");
    },
  });

  const saveStylist = trpc.stylistProfile.save.useMutation({
    onSuccess: () => {
      toast.success("Clevora AI preferences updated!");
      refetchStylist();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save Clevora AI preferences");
    },
  });

  const cancelOrder = trpc.order.cancel.useMutation({
    onSuccess: (data: any) => {
      if (data?.isPrepaid) {
        toast.success(`Order cancelled & full refund issued! (Ref: ${data?.refundRef})`);
      } else {
        toast.success("Order cancelled successfully");
      }
      setSelectedOrder(null);
      refetchOrders();
      broadcastLiveEvent("ORDER_STATUS_CHANGED");
    },
    onError: (err) => {
      toast.error(err.message || "Could not cancel order");
    },
  });

  const confirmReceived = trpc.order.confirmReceived.useMutation({
    onSuccess: () => {
      toast.success("Receipt confirmed! Thank you for your purchase.");
      refetchOrders();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to confirm order receipt");
    },
  });

  useEffect(() => {
    if (orders) {
      const deliveredUnreviewed = orders.find((o: any) => 
        o.status === "delivered" && 
        o.items?.some((i: any) => !i.isReviewed)
      );
      if (deliveredUnreviewed && !pendingReviewOrder) {
        setPendingReviewOrder(deliveredUnreviewed);
      }
    }
  }, [orders]);

  if (authLoading || ordersLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#F4F6FC] px-4 dark:bg-slate-950/50">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Loading your dashboard</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Preparing your latest shopping activity.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-lg text-slate-500">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((sum, o) => sum + o.totalAmount, 0) || 0;
  const wishlistCount = wishlist?.length || 0;
  const cartCount = cart?.itemCount || 0;
  const orderStatusSummary = [
    { key: "processing", label: "Processing", count: orders?.filter((order) => order.status === "processing").length || 0, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300" },
    { key: "shipped", label: "Shipped", count: orders?.filter((order) => order.status === "shipped").length || 0, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-300" },
    { key: "delivered", label: "Delivered", count: orders?.filter((order) => order.status === "delivered").length || 0, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300" },
    { key: "cancelled", label: "Cancelled", count: orders?.filter((order) => order.status === "cancelled").length || 0, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300" },
  ];

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "messages" as const, label: "Seller Chats", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "orders" as const, label: "Orders", icon: <ShoppingBag className="h-4 w-4" /> },
    { key: "track" as const, label: "Track & Confirm Delivery", icon: <Truck className="h-4 w-4" /> },
    { key: "wishlist" as const, label: "Wishlist", icon: <Heart className="h-4 w-4" /> },
    { key: "account" as const, label: "Account Profile", icon: <User className="h-4 w-4" /> },
    { key: "security" as const, label: "Security", icon: <Lock className="h-4 w-4" /> },
    { key: "addresses" as const, label: "Saved Addresses", icon: <MapPin className="h-4 w-4" /> },
    { key: "stylist" as const, label: "Clevora AI Preferences", icon: <Sparkles className="h-4 w-4" /> },
  ];

  return (
    <div className="dashboard-shell flex min-h-screen min-w-0 bg-[#F4F6FC] dark:bg-slate-950/50 animate-fade-in">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col lg:static lg:min-h-screen lg:translate-x-0 ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <Link to="/" aria-label="Go to MarketVerse home" className="block rounded-xl p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <MarketVerseLogo compact className="h-10 w-full text-slate-900 dark:text-white" />
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Customer Portal</h2>
          <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white">
            <Home className="h-4 w-4 text-slate-400" />
            Home
          </Link>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#E0E7FF] dark:bg-indigo-900/30 text-[#5B6DF8] dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className={activeTab === tab.key ? "text-[#5B6DF8] dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}>
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {pendingReviewOrder && (
        <ReviewModal 
          order={pendingReviewOrder} 
          onClose={() => setPendingReviewOrder(null)} 
          onSuccess={() => {
            refetchOrders();
          }} 
        />
      )}

      {/* Main Content */}
      <main data-scroll-root className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl min-w-0 p-4 sm:p-6 lg:p-8">
          {/* Header Mobile & Desktop */}
          <div className="mb-8 flex items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:pb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open customer dashboard navigation"
                className="-ml-2 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Customer dashboard</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {activeTab === "overview" ? "Overview" : tabs.find((tab) => tab.key === activeTab)?.label || "Dashboard"}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {activeTab === "overview" ? `A clear view of your MarketVerse activity${(user as any)?.name ? `, ${(user as any).name.split(" ")[0]}` : ""}.` : "Manage your orders, delivery addresses, and personal preferences."}
                </p>
              </div>
            </div>
            <ProfileMenu user={user as any} />
            {activeTab === "overview" && (
              <Link to="/products" className="hidden shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:inline-flex">
                <ShoppingBag className="h-4 w-4" />
                Browse products
              </Link>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === "messages" && <SellerChatsTab />}

          {activeTab === "overview" && (
            <div className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <DashboardCard
                  icon={<ShoppingBag className="h-5 w-5" />}
                  label="Total Orders"
                  value={totalOrders}
                  onClick={() => setActiveTab("orders")}
                  color="blue"
                />
                <DashboardCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Total Spent"
                  value={formatCurrency(totalSpent)}
                  color="yellow"
                />
                <DashboardCard
                  icon={<Heart className="h-5 w-5" />}
                  label="Wishlist Items"
                  value={wishlistCount}
                  onClick={() => setActiveTab("wishlist")}
                  color="red"
                />
                <DashboardCard
                  icon={<Package className="h-5 w-5" />}
                  label="Cart Items"
                  value={cartCount}
                  link="/cart"
                  color="emerald"
                />
              </div>

              <section aria-labelledby="activity-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-6">
                <div className="mb-5 flex items-end justify-between gap-3">
                  <div>
                    <h2 id="activity-heading" className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">Order activity</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your current order history at a glance.</p>
                  </div>
                  <button onClick={() => setActiveTab("orders")} className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-indigo-400 sm:inline-flex">
                    View orders <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {orderStatusSummary.map((status) => (
                    <button key={status.key} onClick={() => setActiveTab("orders")} className={`rounded-2xl p-3 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:p-4 ${status.color}`}>
                      <p className="text-2xl font-black tracking-tight">{status.count}</p>
                      <p className="mt-1 text-xs font-bold sm:text-sm">{status.label}</p>
                    </button>
                  ))}
                </div>
              </section>

              <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                {/* Recent Orders */}
                <section aria-labelledby="recent-orders-heading" className="glass-card min-w-0 rounded-3xl p-5 shadow-sm sm:p-8">
                  <div className="mb-6 flex min-w-0 items-center justify-between gap-3">
                    <h2 id="recent-orders-heading" className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-white">Recent orders</h2>
                    <button onClick={() => setActiveTab("orders")} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-indigo-400">
                      View All <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  {ordersError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
                      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Orders could not be loaded.</p>
                      <button onClick={() => refetchOrders()} className="mt-2 text-sm font-bold text-rose-700 underline dark:text-rose-300">Try again</button>
                    </div>
                  ) : orders && orders.length > 0 ? (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedOrder(order); }}
                          role="button"
                          tabIndex={0}
                          className="flex min-w-0 items-center justify-between gap-3 rounded-lg border-b border-slate-100 px-2 py-3 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{order.orderNumber}</p>
                            <p className="text-xs text-slate-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              order.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                              order.status === "shipped" ? "bg-indigo-100 text-indigo-700" :
                              order.status === "cancelled" ? "bg-rose-100 text-rose-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {order.status}
                            </span>
                            <span className="hidden text-sm font-bold sm:inline">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-slate-700">
                      <Package className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-700 dark:text-slate-200">No orders yet</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your completed purchases will appear here.</p>
                      <Link to="/products" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                        Browse catalog <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </section>

                {/* Wishlist Preview */}
                <section aria-labelledby="wishlist-heading" className="glass-card min-w-0 rounded-3xl p-5 shadow-sm sm:p-8">
                  <div className="mb-6 flex min-w-0 items-center justify-between gap-3">
                    <h2 id="wishlist-heading" className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-white">Wishlist highlights</h2>
                    <button onClick={() => setActiveTab("wishlist")} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-indigo-400">
                      View All <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  {wishlist && wishlist.length > 0 ? (
                    <div className="space-y-3">
                      {wishlist.slice(0, 5).map((item: any) => (
                        <Link
                          key={item.id}
                          to={`/product/${item.slug}`}
                          className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg px-2 -mx-2 transition-colors"
                        >
                          <img src={`${item.imageUrl}`} alt={`${item.name}`} className="w-12 h-12 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.sellerName || "Verified Vendor"}</p>
                          </div>
                          <span className="text-sm font-bold text-indigo-600">{formatCurrency(item.price || 0)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-slate-700">
                      <Heart className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-700 dark:text-slate-200">Your wishlist is empty</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Save products you want to revisit later.</p>
                      <Link to="/products" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                        Explore products <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Orders</h2>
                <p className="text-sm text-slate-500">Click any order to view status timeline or request cancellation.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase">Order Ref</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase">Fulfillment</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase">Payment</th>
                      <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {orders && orders.length > 0 ? orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{o.orderNumber}</p>
                          {o.trackingNumber && (
                            <p className="text-xs text-slate-400">Track: {o.trackingNumber}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(o.totalAmount)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            o.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                            o.status === "shipped" ? "bg-indigo-100 text-indigo-700" :
                            o.status === "cancelled" ? "bg-rose-100 text-rose-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            o.paymentStatus === "refunded" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" :
                            o.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" :
                            o.paymentStatus === "pending" ? "bg-amber-100 text-amber-700" :
                            "bg-rose-100 text-rose-700"
                          }`}>
                            {o.paymentStatus === "refunded" ? "💰 Refunded" : o.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            Details & Actions
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500">No orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "wishlist" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Your Saved Items</h2>
              {wishlist && wishlist.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {wishlist.map((item: any) => (
                    <Link key={item.id} to={`/product/${item.slug}`} className="group block rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all">
                      <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                        <img src={item.imageUrl || ""} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.sellerName || "Verified Merchant"}</p>
                        <p className="text-sm font-bold text-indigo-600 mt-2">{formatCurrency(item.price || 0)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Your wishlist is empty</p>
                </div>
              )}
            </div>
          )}

          {/* Account Profile Tab */}
          {activeTab === "account" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editable Account Profile</h2>
                <p className="text-sm text-slate-500">Update your personal credentials and login security.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfile.mutate(profileForm);
                }}
                className="max-w-2xl space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-indigo-500 outline-hidden"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                      placeholder="you@example.com"
                      title="Email cannot be changed currently"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone Number (BD)</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-indigo-500 outline-hidden ${!profileForm.phone ? 'border-amber-400/60 dark:border-amber-500/50 bg-amber-50/30' : 'border-slate-300 dark:border-slate-600'}`}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-indigo-500 outline-hidden"
                    >
                      <option value="unspecified">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">City</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                      placeholder="Dhaka, Chittagong, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Country</label>
                    <input
                      type="text"
                      value={profileForm.country}
                      onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Street Address</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    placeholder="House, Road, Area details"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all"
                  >
                    {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Password</h2>
                <p className="text-sm text-slate-500">Update your password to keep your account secure.</p>
              </div>

              {(user as any)?.unionId?.startsWith("google:") && !(user as any)?.hasLocalPassword ? (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                  <p className="flex items-center gap-2 font-medium mb-1">
                    <ShieldCheck className="h-5 w-5" />
                    Google Authentication
                  </p>
                  <p className="text-sm opacity-90">
                    You signed in using your Google account, so you don't have a separate password set here. 
                    If you wish to set a local password, please log out and use the <strong>Forgot Password</strong> option on the login screen.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (securityForm.newPassword !== securityForm.confirmPassword) {
                      toast.error("New passwords do not match.");
                      return;
                    }
                    changePassword.mutate({
                      currentPassword: securityForm.currentPassword,
                      newPassword: securityForm.newPassword,
                    });
                  }}
                  className="max-w-md space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={securityForm.currentPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-indigo-500 outline-hidden"
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-indigo-500 outline-hidden mb-4"
                      placeholder="At least 6 characters"
                    />
                    
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-indigo-500 outline-hidden"
                      placeholder="Confirm your new password"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={changePassword.isPending}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all"
                    >
                      {changePassword.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Change Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Track & Confirm Delivery Tab */}
          {activeTab === "track" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Truck className="w-6 h-6 text-indigo-600" />
                      Track Packages & Confirm Delivery
                    </h2>
                    <p className="text-sm text-slate-500">Monitor active shipments in real-time and confirm receipt once your package arrives.</p>
                  </div>
                </div>

                {/* Instant Search Bar */}
                <div className="pt-2">
                  <input
                    type="text"
                    value={trackingSearchQuery}
                    onChange={(e) => setTrackingSearchQuery(e.target.value)}
                    placeholder="Search by Order # (e.g. ORD-2024-0006) or Tracking Code (e.g. TRK-264862)..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Active Orders List with Stepper & Confirm Receipt Button */}
              {orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders
                    .filter((o: any) => {
                      if (!trackingSearchQuery.trim()) return true;
                      const q = trackingSearchQuery.toLowerCase();
                      return (
                        o.orderNumber?.toLowerCase().includes(q) ||
                        o.trackingNumber?.toLowerCase().includes(q) ||
                        o.courierName?.toLowerCase().includes(q)
                      );
                    })
                    .map((order: any) => (
                      <div
                        key={order.id}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5 shadow-sm hover:border-slate-300 transition-all"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">{order.orderNumber}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                order.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                                order.status === "shipped" ? "bg-indigo-100 text-indigo-700" :
                                order.status === "processing" ? "bg-blue-100 text-blue-700" :
                                order.status === "cancelled" ? "bg-rose-100 text-rose-700" :
                                "bg-amber-100 text-amber-700 animate-pulse"
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Shipping to: <strong>{order.shippingAddress}, {order.shippingCity}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Confirm Received Button */}
                            {order.status !== "delivered" && order.status !== "cancelled" ? (
                              <button
                                onClick={() => confirmReceived.mutate({ orderId: order.id })}
                                disabled={confirmReceived.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                              >
                                {confirmReceived.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                I Have Received This Package
                              </button>
                            ) : order.status === "delivered" ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  Received & Verified
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Dynamic Animated 4-Step Stepper */}
                        {(() => {
                          const isDelivered = order.status === "delivered";
                          const isShipped = order.status === "shipped" || order.sellerStatus === "handed_over";
                          const isSellerDone = order.sellerStatus === "accepted" || isShipped || isDelivered;
                          const isDenied = order.sellerStatus === "denied";

                          let progressPercent = 12;
                          if (isDelivered) progressPercent = 100;
                          else if (isShipped) progressPercent = 66;
                          else if (isSellerDone) progressPercent = 38;

                          return (
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl space-y-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative overflow-hidden">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                  </span>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Live Package Status</p>
                                </div>
                                {order.estimatedDeliveryDays && (
                                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/80 px-3.5 py-1 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs flex items-center gap-1.5 animate-pulse">
                                    ⏱️ ETA: {order.estimatedDeliveryDays} Days ({order.shippingCity})
                                  </span>
                                )}
                              </div>

                              <div className="relative pt-4 pb-2 px-2">
                                {/* Background Track Line */}
                                <div className="absolute top-8 left-8 right-8 h-1.5 bg-slate-200 dark:bg-slate-700/80 rounded-full z-0" />

                                {/* Animated Filled Progress Bar */}
                                <div
                                  className="absolute top-8 left-8 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-1000 ease-out z-0 shadow-sm"
                                  style={{ width: `calc(${progressPercent}% - 16px)` }}
                                >
                                  {/* Animated Glowing Tip */}
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md shadow-purple-500/50 animate-ping" />
                                </div>

                                {/* Moving Delivery Truck Icon on Progress Bar */}
                                {!isDelivered && (
                                  <div
                                    className="absolute top-1.5 transition-all duration-1000 ease-out z-20 -translate-x-1/2"
                                    style={{ left: `calc(${progressPercent}% + 8px)` }}
                                  >
                                    <div className="p-1 bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-500/40 animate-bounce">
                                      <Truck className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                )}

                                {/* Stepper Nodes */}
                                <div className="relative flex items-center justify-between text-xs font-semibold">
                                  {/* Step 1: Placed */}
                                  <div className="flex flex-col items-center gap-2 z-10 group">
                                    <div className="relative">
                                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 className="w-5 h-5" />
                                      </div>
                                      <span className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-pulse" />
                                    </div>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Placed</span>
                                  </div>

                                  {/* Step 2: Seller Review */}
                                  <div className="flex flex-col items-center gap-2 z-10 group">
                                    <div className="relative">
                                      <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                                          isSellerDone
                                            ? "bg-emerald-600 text-white shadow-emerald-500/20"
                                            : isDenied
                                            ? "bg-rose-600 text-white shadow-rose-500/20"
                                            : "bg-amber-500 text-white ring-4 ring-amber-400/30 animate-pulse shadow-amber-500/30"
                                        }`}
                                      >
                                        {isSellerDone ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                      </div>
                                      {!isSellerDone && !isDenied && (
                                        <span className="absolute -inset-1.5 rounded-full bg-amber-400/30 animate-ping" />
                                      )}
                                    </div>
                                    <span
                                      className={
                                        isDenied
                                          ? "text-rose-600 font-bold"
                                          : isSellerDone
                                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                          : "text-amber-600 dark:text-amber-400 font-bold animate-pulse"
                                      }
                                    >
                                      {order.sellerStatus === "accepted"
                                        ? "Accepted"
                                        : isDenied
                                        ? "Denied"
                                        : isSellerDone
                                        ? "Accepted"
                                        : "Seller Review"}
                                    </span>
                                  </div>

                                  {/* Step 3: Courier */}
                                  <div className="flex flex-col items-center gap-2 z-10 group">
                                    <div className="relative">
                                      <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                                          isShipped || isDelivered
                                            ? "bg-indigo-600 text-white ring-4 ring-indigo-500/30 shadow-indigo-500/30"
                                            : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                                        }`}
                                      >
                                        <Truck className={`w-5 h-5 ${isShipped && !isDelivered ? "animate-bounce" : ""}`} />
                                      </div>
                                      {isShipped && !isDelivered && (
                                        <span className="absolute -inset-1.5 rounded-full bg-indigo-400/30 animate-ping" />
                                      )}
                                    </div>
                                    <span
                                      className={
                                        isShipped || isDelivered
                                          ? "text-indigo-600 dark:text-indigo-400 font-bold"
                                          : "text-slate-500 dark:text-slate-400"
                                      }
                                    >
                                      Courier
                                    </span>
                                  </div>

                                  {/* Step 4: Delivered */}
                                  <div className="flex flex-col items-center gap-2 z-10 group">
                                    <div className="relative">
                                      <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                                          isDelivered
                                            ? "bg-emerald-600 text-white ring-4 ring-emerald-500/30 shadow-emerald-500/30"
                                            : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                                        }`}
                                      >
                                        <CheckCircle2 className="w-5 h-5" />
                                      </div>
                                      {isDelivered && (
                                        <span className="absolute -inset-1.5 rounded-full bg-emerald-400/30 animate-ping" />
                                      )}
                                    </div>
                                    <span
                                      className={
                                        isDelivered
                                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                          : "text-slate-500 dark:text-slate-400"
                                      }
                                    >
                                      Delivered
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Shipment Info Summary */}
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div>
                            <span className="text-slate-500">Courier Partner: </span>
                            <strong className="text-slate-900 dark:text-white">{order.courierName || "Assigning Courier..."}</strong>
                            {order.trackingNumber && (
                              <span className="ml-4 text-slate-500">
                                Tracking Code: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{order.trackingNumber}</strong>
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            Total: {formatCurrency(order.totalAmount)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-500 space-y-3">
                  <Truck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No active shipments found</p>
                  <p className="text-xs">Once you place an order, live package tracking and receipt confirmation will appear here.</p>
                </div>
              )}
            </div>
          )}
          {activeTab === "addresses" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Delivery Addresses</h2>
                  <p className="text-sm text-slate-500">Manage your primary shipping address and secondary delivery locations.</p>
                </div>
                <button
                  onClick={() => {
                    setAddressForm({
                      id: undefined,
                      title: "Office Address",
                      recipientName: (user as any)?.name || "",
                      address: "",
                      city: "Dhaka",
                      country: "Bangladesh",
                      phone: (user as any)?.phone || "",
                      isPrimary: false,
                    });
                    setShowAddressModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add New Address
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses && addresses.length > 0 ? (
                  addresses.map((addr: any) => (
                    <div
                      key={addr.id}
                      className={`p-5 rounded-xl space-y-2 relative transition-all shadow-sm ${
                        addr.isPrimary
                          ? "border-2 border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20"
                          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
                      }`}
                    >
                      {addr.isPrimary ? (
                        <span className="absolute top-4 right-4 text-[11px] font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full">
                          Primary
                        </span>
                      ) : null}

                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                        <MapPin className="w-5 h-5" />
                        {addr.title || `${addr.city} Address`}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{addr.recipientName}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{addr.address}</p>
                      <p className="text-xs text-slate-500">{addr.city}, {addr.country}</p>
                      {addr.phone && <p className="text-xs text-slate-500 font-mono">Phone: {addr.phone}</p>}

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                        {!addr.isPrimary && (
                          <button
                            onClick={() => saveAddressMutation.mutate({ ...addr, isPrimary: true })}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mr-auto"
                          >
                            Set as Primary
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setAddressForm({
                              id: addr.id,
                              title: addr.title,
                              recipientName: addr.recipientName,
                              address: addr.address,
                              city: addr.city,
                              country: addr.country,
                              phone: addr.phone || "",
                              isPrimary: Boolean(addr.isPrimary),
                            });
                            setShowAddressModal(true);
                          }}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-500" />
                          Edit
                        </button>
                        {!addr.isPrimary && (
                          <button
                            onClick={() => deleteAddressMutation.mutate({ id: addr.id })}
                            disabled={deleteAddressMutation.isPending}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : null}

                {/* Add Secondary Address Button Card */}
                <div
                  onClick={() => {
                    setAddressForm({
                      id: undefined,
                      title: "Secondary Address",
                      recipientName: (user as any)?.name || "",
                      address: "",
                      city: "Dhaka",
                      country: "Bangladesh",
                      phone: (user as any)?.phone || "",
                      isPrimary: false,
                    });
                    setShowAddressModal(true);
                  }}
                  className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center py-10 hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-500 flex items-center justify-center transition-all mb-2">
                    <Plus className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">Add Secondary Address</p>
                  <p className="text-xs text-slate-500 mt-1">Add office or alternative family address</p>
                </div>
              </div>
            </div>
          )}

          {/* Clevora AI Preference Tab */}
          {activeTab === "stylist" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  Clevora AI Preferences
                </h2>
                <p className="text-sm text-slate-500">Configure your personal style preferences used by our AI recommendations engine.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveStylist.mutate(stylistForm);
                }}
                className="max-w-2xl space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gender Preference</label>
                    <select
                      value={stylistForm.gender}
                      onChange={(e) => setStylistForm({ ...stylistForm, gender: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="male">Menswear</option>
                      <option value="female">Womenswear</option>
                      <option value="unisex">Unisex / All</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Age Group</label>
                    <select
                      value={stylistForm.ageGroup}
                      onChange={(e) => setStylistForm({ ...stylistForm, ageGroup: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="18-24">18-24 years</option>
                      <option value="25-34">25-34 years</option>
                      <option value="35-44">35-44 years</option>
                      <option value="45+">45+ years</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Style Aesthetic</label>
                    <select
                      value={stylistForm.stylePreference}
                      onChange={(e) => setStylistForm({ ...stylistForm, stylePreference: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="classic">Classic Traditional</option>
                      <option value="minimalist">Modern Minimalist</option>
                      <option value="streetwear">Streetwear Casual</option>
                      <option value="formal">Formal Luxury</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Budget Tier</label>
                    <select
                      value={stylistForm.budgetRange}
                      onChange={(e) => setStylistForm({ ...stylistForm, budgetRange: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="budget">Budget Friendly (&lt; 5,000 BDT)</option>
                      <option value="mid-range">Mid-Range (5,000 - 15,000 BDT)</option>
                      <option value="premium">Premium Luxury (&gt; 15,000 BDT)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveStylist.isPending}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all"
                  >
                    {saveStylist.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Preferences
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Details</h3>
                <p className="text-xs text-indigo-600 font-mono font-bold">{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 5-Step Visual Order Progress Tracker */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl space-y-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Order Progress</p>
                {selectedOrder.estimatedDeliveryDays && (
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                    ⏱️ ETA: {selectedOrder.estimatedDeliveryDays} Days
                  </span>
                )}
              </div>

              {/* Progress Stepper Bar */}
              <div className="relative flex items-center justify-between text-[11px] font-semibold pt-2">
                <div className="flex flex-col items-center gap-1 z-10">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-emerald-600 font-bold">Placed</span>
                </div>

                <div className="flex flex-col items-center gap-1 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                    selectedOrder.sellerStatus === "accepted" || selectedOrder.sellerStatus === "handed_over" || selectedOrder.status === "shipped" || selectedOrder.status === "delivered"
                      ? "bg-emerald-600 text-white"
                      : selectedOrder.sellerStatus === "denied"
                      ? "bg-rose-600 text-white"
                      : "bg-amber-500 text-white animate-pulse"
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className={selectedOrder.sellerStatus === "denied" ? "text-rose-600 font-bold" : "text-slate-700 dark:text-slate-300"}>
                    {selectedOrder.sellerStatus === "accepted" ? "Accepted" : selectedOrder.sellerStatus === "denied" ? "Denied" : "Review"}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                    selectedOrder.sellerStatus === "handed_over" || selectedOrder.status === "shipped" || selectedOrder.status === "delivered"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                  }`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">Courier</span>
                </div>

                <div className="flex flex-col items-center gap-1 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                    selectedOrder.status === "delivered" ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">Delivered</span>
                </div>
              </div>

              {/* Delivery Partner Info Banner */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Courier Partner:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.courierName || "Assigning Courier..."}</span>
                </div>
                {selectedOrder.trackingNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tracking Code:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedOrder.trackingNumber}</span>
                  </div>
                )}
                {selectedOrder.estimatedDeliveryDate && (
                  <div className="flex justify-between items-center text-indigo-700 dark:text-indigo-300 font-semibold pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span>Expected Arrival Date:</span>
                    <span>{new Date(selectedOrder.estimatedDeliveryDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedOrder.paymentStatus === "refunded" && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">💰</span>
                  <div>
                    <p className="font-bold">100% Refund Processed ({formatCurrency(selectedOrder.totalAmount)})</p>
                    <p className="opacity-90">Payment has been credited back to your account.</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px]">REFUNDED</span>
              </div>
            )}

            {/* Order Items */}
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <img src={item.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"} alt={item.productName} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{item.productName}</p>
                          <p className="text-xs text-slate-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.totalPrice)}</span>
                        {selectedOrder.status === "delivered" && (
                          <button 
                            onClick={() => setReviewModal({ productId: item.productId, productName: item.productName })}
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-md hover:bg-indigo-100 transition-colors shadow-2xs"
                          >
                            Leave Review
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(selectedOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500">Payment Status</span>
                <span className={`font-semibold uppercase ${selectedOrder.paymentStatus === "refunded" ? "text-purple-600 dark:text-purple-400" : "text-emerald-600"}`}>
                  {selectedOrder.paymentStatus}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {selectedOrder.status !== "shipped" && selectedOrder.status !== "delivered" && selectedOrder.status !== "cancelled" && (
                <button
                  onClick={() => cancelOrder.mutate({ orderId: selectedOrder.id })}
                  disabled={cancelOrder.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all"
                >
                  {cancelOrder.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Cancel Order
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Edit / Add Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {addressForm.id ? "Edit Delivery Address" : "Add New Delivery Address"}
              </h3>
              <button onClick={() => setShowAddressModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveAddressMutation.mutate(addressForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-500 font-semibold uppercase mb-1">Address Label / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Address, Office, Parents House"
                  value={addressForm.title}
                  onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase mb-1">Recipient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={addressForm.recipientName}
                  onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase mb-1">Street Address</label>
                <textarea
                  required
                  rows={2}
                  placeholder="House #, Road #, Apartment / Flat, Area"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase mb-1">City / Region</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dhaka, Chittagong"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimaryCheck"
                  checked={addressForm.isPrimary}
                  onChange={(e) => setAddressForm({ ...addressForm, isPrimary: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="isPrimaryCheck" className="text-slate-700 dark:text-slate-300 font-medium">Set as Primary Shipping Address</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setShowAddressModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400">Cancel</button>
                <button
                  type="submit"
                  disabled={saveAddressMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  {saveAddressMutation.isPending ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Leave a Review</h3>
              <button onClick={() => setReviewModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
              Reviewing: <strong className="text-slate-900 dark:text-white">{reviewModal.productName}</strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createReviewMutation.mutate({
                  productId: reviewModal.productId,
                  rating: reviewForm.rating,
                  title: reviewForm.title,
                  comment: reviewForm.comment,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${star <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600 fill-transparent"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Review Title</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  placeholder="Summarize your experience..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Review Details</label>
                <textarea
                  required
                  rows={4}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="What did you like or dislike about this product?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none custom-scrollbar"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="px-5 py-2 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReviewMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-sm"
                >
                  {createReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardCard({
  icon,
  label,
  value,
  link,
  onClick,
  color = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  link?: string;
  onClick?: () => void;
  color?: "blue" | "yellow" | "red" | "emerald";
}) {
  const colorMap: Record<string, string> = {
    blue: "border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-100",
    yellow: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
    red: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
  };

  const content = (
    <div 
      onClick={onClick}
      className={`${colorMap[color]} flex min-h-[132px] flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 ${link || onClick ? "cursor-pointer" : ""}`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight leading-tight">{value}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-white/70 p-2.5 shadow-sm dark:bg-slate-900/50">
          {icon}
        </div>
      </div>
      {(link || onClick) && (
        <div className="relative z-10 mt-3 flex items-center gap-1 text-xs font-bold opacity-70">
          View details <ChevronRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center shadow-sm">
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
    <div className="bg-white dark:bg-slate-800/95 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[580px]">
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
        <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-700/50">
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
            <div className="flex-1 p-4 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-900/30">
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

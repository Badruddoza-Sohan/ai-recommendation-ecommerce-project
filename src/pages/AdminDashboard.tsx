import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { broadcastLiveEvent } from "@/lib/realtimeSync";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  Loader2,
  LogOut,
  BadgeCheck,
  Clock3,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  FolderTree,
  LifeBuoy,
  Plus,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Headphones,
  Search,
  Filter,
  Trash2,
  Send,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const validAdminTabs = ["overview", "users", "sellers", "products", "orders", "categories", "tickets"];

  const getInitialTab = () => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validAdminTabs.includes(tabFromUrl)) return tabFromUrl as any;
    const stored = localStorage.getItem("admin_active_tab");
    if (stored && validAdminTabs.includes(stored)) return stored as any;
    return "overview";
  };

  const [activeTab, setActiveTabState] = useState<"overview" | "users" | "sellers" | "products" | "orders" | "categories" | "tickets">(getInitialTab);

  const setActiveTab = (tab: any) => {
    const nextTab = validAdminTabs.includes(tab) ? tab : "overview";
    setActiveTabState(nextTab);
    setSearchParams({ tab: nextTab });
    localStorage.setItem("admin_active_tab", nextTab);
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validAdminTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl as any);
    }
  }, [searchParams]);
  const [sellerSubTab, setSellerSubTab] = useState<"pending" | "all">("pending");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", address: "", city: "", country: "" });
  const [expandedSellerId, setExpandedSellerId] = useState<number | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [resolvingTicketId, setResolvingTicketId] = useState<number | null>(null);
  const [resolutionInput, setResolutionInput] = useState("");
  const [activeChatTicket, setActiveChatTicket] = useState<any | null>(null);
  const [adminChatInput, setAdminChatInput] = useState("");

  const { data: chatMessages, refetch: refetchChatMessages } = trpc.admin.listTicketMessages.useQuery(
    { ticketId: activeChatTicket?.id || 0 },
    { enabled: !!activeChatTicket, refetchInterval: 1000 }
  );

  const sendAdminMessageMutation = trpc.admin.sendTicketMessage.useMutation({
    onSuccess: () => {
      setAdminChatInput("");
      refetchChatMessages();
    },
    onError: (err) => toast.error(err.message || "Failed to send message"),
  });



  const { data: dashboard, isLoading } = trpc.admin.dashboard.useQuery(undefined, {
    enabled: !!user && (user as any).role === "admin",
    refetchInterval: 2500,
  });
  const { data: allUsers } = trpc.admin.users.useQuery(undefined, {
    enabled: activeTab === "users" && !!user && (user as any).role === "admin",
    refetchInterval: 2500,
  });
  const { data: allSellers } = trpc.admin.sellers.useQuery(undefined, {
    enabled: (activeTab === "sellers" || activeTab === "overview") && !!user && (user as any).role === "admin",
    refetchInterval: 2000,
  });
  const { data: allProducts } = trpc.admin.products.useQuery(undefined, {
    enabled: activeTab === "products" && !!user && (user as any).role === "admin",
    refetchInterval: 2500,
  });
  const { data: allOrders } = trpc.admin.orders.useQuery(undefined, {
    enabled: activeTab === "orders" && !!user && (user as any).role === "admin",
    refetchInterval: 2500,
  });
  const { data: allCategories, refetch: refetchCategories } = trpc.category.list.useQuery(undefined, {
    refetchInterval: 4000,
  });
  const { data: allTickets, refetch: refetchTickets } = trpc.admin.listTickets.useQuery(undefined, {
    enabled: activeTab === "tickets" && !!user && (user as any).role === "admin",
    refetchInterval: 2000,
  });

  const clearAllTicketsMutation = trpc.admin.clearAllTickets.useMutation({
    onSuccess: () => {
      toast.success("All support escalation tickets cleared!");
      refetchTickets();
    },
    onError: (err) => toast.error(err.message || "Failed to clear tickets"),
  });

  const deleteProductMutation = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => toast.success("Product deleted successfully"),
    onError: (err) => toast.error(err.message || "Failed to delete product"),
  });

  const updateOrderShippingDetails = trpc.admin.updateOrderShippingDetails.useMutation({
    onSuccess: () => {
      toast.success("Order delivery details updated successfully.");
      setEditingOrderId(null);
      setOrderEditDraft({ orderId: 0, fullName: "", address: "", district: "", postalCode: "", landmark: "" });
      setIsOrderEditSubmitting(false);
      utils.admin.orders.invalidate();
    },
    onError: (err) => {
      setIsOrderEditSubmitting(false);
      toast.error(err.message || "Failed to update order shipping details");
    },
  });

  const saveOrderShippingEdit = () => {
    if (!orderEditDraft.orderId || !orderEditDraft.fullName || !orderEditDraft.address || !orderEditDraft.district) {
      toast.error("Full name, address, and district are required.");
      return;
    }

    setIsOrderEditSubmitting(true);
    updateOrderShippingDetails.mutate({
      orderId: orderEditDraft.orderId,
      fullName: orderEditDraft.fullName,
      address: orderEditDraft.address,
      district: orderEditDraft.district,
      postalCode: orderEditDraft.postalCode,
      landmark: orderEditDraft.landmark,
      editedBy: user?.name || "Admin",
    });
  };

  const deleteCategoryMutation = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted successfully");
      refetchCategories();
    },
    onError: (err) => toast.error(err.message || "Failed to delete category"),
  });

  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", icon: "Package", image: "" });
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [ticketSectionTab, setTicketSectionTab] = useState<"waiting" | "solved">("waiting");
  const [orderEditDraft, setOrderEditDraft] = useState({ orderId: 0, fullName: "", address: "", district: "", postalCode: "", landmark: "" });
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isOrderEditSubmitting, setIsOrderEditSubmitting] = useState(false);
  const bangladeshDistricts = ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Jamalpur", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Mymensingh", "Narayanganj", "Narsingdi", "Netrokona", "Rajbari", "Shariatpur", "Sherpur", "Tangail", "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Rajshahi", "Sirajganj", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon", "Bagerhat", "Chuadanga", "Jessore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur", "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati", "Habiganj", "Maulvibazar", "Sunamganj", "Sylhet", "Narshingdi", "Barguna"];

  // Admin Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const [sellerSearchQuery, setSellerSearchQuery] = useState("");
  const [sellerStatusFilter, setSellerStatusFilter] = useState("all");

  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");

  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  const filteredUsers = (allUsers || []).filter((u: any) => {
    const matchesSearch = !userSearchQuery ||
      (u.name && u.name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(userSearchQuery));
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredSellers = (allSellers || []).filter((s: any) => {
    const matchesSearch = !sellerSearchQuery ||
      (s.storeName && s.storeName.toLowerCase().includes(sellerSearchQuery.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(sellerSearchQuery.toLowerCase())) ||
      (s.phone && s.phone.includes(sellerSearchQuery));
    const matchesStatus = sellerStatusFilter === "all" || s.approvalStatus === sellerStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = (allProducts || []).filter((p: any) => {
    const matchesSearch = !productSearchQuery ||
      (p.name && p.name.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
      (p.sellerName && p.sellerName.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(productSearchQuery.toLowerCase()));
    const matchesCategory = productCategoryFilter === "all" || String(p.categoryId) === productCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredOrders = (allOrders || []).filter((o: any) => {
    const matchesSearch = !orderSearchQuery ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase())) ||
      (o.recipientName && o.recipientName.toLowerCase().includes(orderSearchQuery.toLowerCase())) ||
      (o.recipientPhone && o.recipientPhone.includes(orderSearchQuery)) ||
      (String(o.id).includes(orderSearchQuery));
    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCategories = (allCategories || []).filter((c: any) => {
    return !categorySearchQuery ||
      (c.name && c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())) ||
      (c.slug && c.slug.toLowerCase().includes(categorySearchQuery.toLowerCase()));
  });

  const createCategory = trpc.category.createCategory.useMutation({
    onSuccess: () => {
      toast.success("New category created successfully!");
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "", icon: "Package", image: "" });
      refetchCategories();
      broadcastLiveEvent("CATEGORY_UPDATED");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create category");
    },
  });

  const updateCategory = trpc.category.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated successfully!");
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "", icon: "Package", image: "" });
      refetchCategories();
      broadcastLiveEvent("CATEGORY_UPDATED");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update category");
    },
  });

  const updateTicketStatus = trpc.admin.updateTicketStatus.useMutation({
    onSuccess: () => {
      toast.success("Ticket status updated successfully!");
      setResolvingTicketId(null);
      setResolutionInput("");
      refetchTickets();
    },
    onError: (err) => toast.error(err.message || "Failed to update ticket"),
  });

  const utils = trpc.useUtils();
  const updateSellerStatus = trpc.admin.updateSellerStatus.useMutation({
    onSuccess: () => {
      toast.success("Seller status updated!");
      setExpandedSellerId(null);
      utils.admin.dashboard.invalidate();
      utils.admin.sellers.invalidate();
      broadcastLiveEvent("SELLER_STATUS_CHANGED");
    },
    onError: (err) => toast.error(err.message || "Failed to update seller status"),
  });
  const updateUserProfile = trpc.admin.updateUserProfile.useMutation({
    onSuccess: () => {
      toast.success("User profile saved successfully!");
      setEditingUserId(null);
      setExpandedUserId(null);
      utils.admin.dashboard.invalidate();
      utils.admin.users.invalidate();
      broadcastLiveEvent("USER_UPDATED");
    },
    onError: (err) => toast.error(err.message || "Failed to save user profile"),
  });
  const updateProductStatus = trpc.admin.updateProductStatus.useMutation({
    onSuccess: () => {
      toast.success("Product status updated!");
      setExpandedProductId(null);
      utils.admin.dashboard.invalidate();
      utils.admin.products.invalidate();
      broadcastLiveEvent("PRODUCT_UPDATED");
    },
    onError: (err) => toast.error(err.message || "Failed to update product status"),
  });
  const updateOrderStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: async () => {
      toast.success("Order status updated!");
      setExpandedOrderId(null);
      utils.admin.dashboard.invalidate();
      await utils.admin.orders.invalidate();
      broadcastLiveEvent("ORDER_STATUS_CHANGED");
    },
    onError: (err) => toast.error(err.message || "Failed to update order status"),
  });

  const handleOrderStatusChange = async (orderId: number, status: string) => {
    try {
      await updateOrderStatus.mutateAsync({ orderId, status });
    } catch {
      // The mutation callback displays the server error.
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user || (user as any).role !== "admin") {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Admin Access Required</h2>
        <p className="text-slate-500 mb-4">You need admin privileges to access this panel.</p>
        <button onClick={() => navigate("/")} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold">
          Go Home
        </button>
      </div>
    );
  }

  const stats = dashboard?.stats || {
    totalUsers: 0,
    totalSellers: 0,
    approvedSellers: 0,
    pendingSellersCount: 0,
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    paidOrders: 0,
    totalRevenue: 0,
  };

  const sellerApprovalRate = stats.totalSellers > 0 ? Math.round((stats.approvedSellers / stats.totalSellers) * 100) : 0;
  const paidOrderRate = stats.totalOrders > 0 ? Math.round((stats.paidOrders / stats.totalOrders) * 100) : 0;

  const startUserEdit = (userRecord: { id: number; name?: string | null; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; country?: string | null }) => {
    setEditingUserId(userRecord.id);
    setExpandedUserId(userRecord.id);
    setUserForm({
      name: userRecord.name || "",
      email: userRecord.email || "",
      phone: userRecord.phone || "",
      address: userRecord.address || "",
      city: userRecord.city || "",
      country: userRecord.country || "",
    });
  };

  const saveUserEdit = () => {
    if (!editingUserId) return;
    updateUserProfile.mutate({ userId: editingUserId, ...userForm });
  };

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "users" as const, label: "Users", icon: <Users className="h-4 w-4" /> },
    { key: "sellers" as const, label: "Sellers", icon: <Store className="h-4 w-4" /> },
    { key: "products" as const, label: "Products", icon: <Package className="h-4 w-4" /> },
    { key: "orders" as const, label: "Orders", icon: <ShoppingCart className="h-4 w-4" /> },
    { key: "categories" as const, label: "Categories", icon: <FolderTree className="h-4 w-4" /> },
    { key: "tickets" as const, label: "Support Escalations", icon: <LifeBuoy className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-full overflow-hidden bg-[#F4F6FC] dark:bg-slate-950/50">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#5B6DF8] dark:text-indigo-400">Admin Panel</h2>
          <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header Mobile & Desktop */}
          <div className="flex items-center justify-between mb-8 pb-4 lg:pb-0 border-b lg:border-b-0 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">Admin Command Center</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage your marketplace operations.</p>
              </div>
            </div>
          </div>

          {/* Stats Cards (Overview only) */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              <AdminStatCard 
                icon={<DollarSign className="h-5 w-5" />} 
                label="Total Revenue" 
                value={formatCurrency(stats.totalRevenue || 0)} 
                color="yellow" 
                trendData={[{v:100},{v:150},{v:130},{v:200},{v:250},{v:220},{v:350}]} 
              />
              <AdminStatCard 
                icon={<ShoppingCart className="h-5 w-5" />} 
                label="Total Orders" 
                value={stats.totalOrders} 
                color="indigo" 
                trendData={[{v:2},{v:5},{v:3},{v:8},{v:6},{v:12},{v:15}]} 
              />
              <AdminStatCard 
                icon={<Package className="h-5 w-5" />} 
                label="Total Products" 
                value={stats.totalProducts} 
                color="purple" 
                trendData={[{v:5},{v:8},{v:12},{v:10},{v:18},{v:24},{v:28}]} 
              />
              <AdminStatCard 
                icon={<Users className="h-5 w-5" />} 
                label="Total Users" 
                value={stats.totalUsers} 
                color="green" 
                trendData={[{v:10},{v:15},{v:13},{v:20},{v:25},{v:22},{v:30}]} 
              />
              <AdminStatCard 
                icon={<Store className="h-5 w-5" />} 
                label="Total Sellers" 
                value={stats.totalSellers} 
                color="blue" 
                trendData={[{v:1},{v:2},{v:2},{v:4},{v:5},{v:5},{v:8}]} 
              />
              <AdminStatCard 
                icon={<Clock3 className="h-5 w-5" />} 
                label="Pending Sellers" 
                value={stats.pendingSellersCount} 
                color="red" 
                trendData={[{v:3},{v:5},{v:2},{v:1},{v:4},{v:2},{v:1}]} 
              />
            </div>
          )}

          {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-100">
                <Sparkles className="h-4 w-4" />
                Executive snapshot
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Your marketplace is performing well</h2>
              <p className="mt-2 max-w-xl text-sm text-indigo-100/90">
                You have {stats.totalOrders} orders, {stats.activeProducts} active products, and {stats.pendingSellersCount} seller applications awaiting review.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <div className="rounded-full bg-white/15 px-3 py-1.5">{sellerApprovalRate}% seller approval rate</div>
                <div className="rounded-full bg-white/15 px-3 py-1.5">{paidOrderRate}% paid orders</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 row-span-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Revenue Overview</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Jan', revenue: 4000 },
                    { name: 'Feb', revenue: 3000 },
                    { name: 'Mar', revenue: 5000 },
                    { name: 'Apr', revenue: 4500 },
                    { name: 'May', revenue: 6000 },
                    { name: 'Jun', revenue: 5500 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} tickFormatter={(value) => `${value} BDT`} />
                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent orders</h2>
                <button className="flex items-center gap-1 text-sm font-medium text-indigo-600">
                  View all <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {dashboard?.recentOrders && dashboard.recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{order.orderNumber}</p>
                        <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-slate-500">No recent orders yet</p>
              )}
            </div>

            <div className="space-y-6">
              {dashboard?.pendingSellers && dashboard.pendingSellers.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pending seller applications</h2>
                    <Clock3 className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="space-y-3">
                    {dashboard.pendingSellers.slice(0, 3).map((seller: any) => (
                      <div key={seller.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{seller.businessName}</p>
                            <p className="text-sm text-slate-500">{seller.businessEmail}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateSellerStatus.mutate({ sellerId: seller.id, status: "approved" })}
                              className="rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateSellerStatus.mutate({ sellerId: seller.id, status: "rejected" })}
                              className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent signups</h2>
                {dashboard?.recentUsers && dashboard.recentUsers.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {dashboard.recentUsers.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{user.name || "Unnamed user"}</p>
                          <p className="text-sm text-slate-500">{user.email || "No email"}</p>
                        </div>
                        <span className="text-xs uppercase tracking-wide text-slate-500">{user.role}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-slate-500">No recent users yet</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top categories</h2>
                {dashboard?.topCategories && dashboard.topCategories.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {dashboard.topCategories.map((category: any, index: number) => (
                      <div key={category.name || index} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{category.name}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{category.productCount} products</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-slate-500">No category data yet</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Monthly revenue</h2>
                {dashboard?.monthlyRevenue && dashboard.monthlyRevenue.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {dashboard.monthlyRevenue.map((m: any) => (
                      <div key={m.month} className="flex items-center justify-between">
                        <span className="w-20 text-sm text-slate-600 dark:text-slate-400">{m.month}</span>
                        <div className="mx-4 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
                          <div
                            className="flex h-8 items-center justify-end rounded-lg bg-indigo-500 px-2"
                            style={{
                              width: `${Math.min(100, ((m.revenue || 0) / Math.max(...dashboard.monthlyRevenue.map((x: any) => x.revenue || 0))) * 100)}%`,
                            }}
                          >
                            <span className="text-xs font-medium text-white">{formatCurrency(m.revenue || 0)}</span>
                          </div>
                        </div>
                        <span className="w-12 text-right text-xs text-slate-500">{m.orders} ord</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-slate-500">No revenue data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search users by name, email, phone..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              {userSearchQuery && (
                <button onClick={() => setUserSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Roles</option>
                <option value="customer">Customer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
              <span className="text-xs text-slate-500 whitespace-nowrap font-medium">({filteredUsers.length} users)</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Address</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u: any) => (
                    <>
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{u.name || "N/A"}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{u.email || "N/A"}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{u.phone || "N/A"}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {u.address ? `${u.address}${u.city ? `, ${u.city}` : ""}` : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === "admin" ? "bg-red-100 text-red-700" :
                            u.role === "seller" ? "bg-blue-100 text-blue-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200">View</button>
                            <button onClick={() => startUserEdit(u)} className="rounded-lg border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300">Edit</button>
                          </div>
                        </td>
                      </tr>
                      {(expandedUserId === u.id || editingUserId === u.id) && (
                        <tr key={`${u.id}-details`}>
                          <td colSpan={7} className="bg-slate-50 px-4 py-4 dark:bg-slate-700/40">
                            {editingUserId === u.id ? (
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Full name" />
                                <input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Email" />
                                <input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Phone" />
                                <input value={userForm.address} onChange={(e) => setUserForm({ ...userForm, address: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Address" />
                                <input value={userForm.city} onChange={(e) => setUserForm({ ...userForm, city: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="City" />
                                <input value={userForm.country} onChange={(e) => setUserForm({ ...userForm, country: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Country" />
                                <div className="md:col-span-2 xl:col-span-3 flex gap-2">
                                  <button onClick={saveUserEdit} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save changes</button>
                                  <button onClick={() => { setEditingUserId(null); setExpandedUserId(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                                <div><p className="text-slate-500">Phone</p><p className="font-medium text-slate-900 dark:text-white">{u.phone || "Not provided"}</p></div>
                                <div><p className="text-slate-500">Address</p><p className="font-medium text-slate-900 dark:text-white">{u.address || "Not provided"}</p></div>
                                <div><p className="text-slate-500">City</p><p className="font-medium text-slate-900 dark:text-white">{u.city || "Not provided"}</p></div>
                                <div><p className="text-slate-500">Country</p><p className="font-medium text-slate-900 dark:text-white">{u.country || "Not provided"}</p></div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No users match your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "sellers" && (
        <div className="space-y-6">
          {/* Sub Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Seller Verification & Approval Hub
              </h2>
              <p className="text-xs text-slate-500">Newly registered sellers must be verified and approved before they can perform store actions or list products live.</p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <button
                onClick={() => setSellerSubTab("pending")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sellerSubTab === "pending"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Clock3 className="h-3.5 w-3.5" />
                Pending Approvals
                {stats.pendingSellersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-white text-amber-700 rounded-full font-bold">
                    {stats.pendingSellersCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSellerSubTab("all")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sellerSubTab === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                All Sellers ({allSellers?.length || 0})
              </button>
            </div>
          </div>

          {/* Pending Approvals Sub-Tab */}
          {sellerSubTab === "pending" && (
            <div className="space-y-4">
              {dashboard?.pendingSellers && dashboard.pendingSellers.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {dashboard.pendingSellers.map((s: any) => (
                    <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/50 p-5 shadow-sm space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                        Verification Required
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.businessName || "Registered Seller"}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{s.businessEmail}</p>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                        <div><span className="font-semibold text-slate-500">Business Phone:</span> {s.businessPhone || "Not provided"}</div>
                        <div><span className="font-semibold text-slate-500">Description:</span> {s.description || "No store description provided"}</div>
                        <div><span className="font-semibold text-slate-500">Application Date:</span> {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "Recently"}</div>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => updateSellerStatus.mutate({ sellerId: s.id, status: "approved" })}
                          disabled={updateSellerStatus.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve & Activate Seller
                        </button>
                        <button
                          onClick={() => updateSellerStatus.mutate({ sellerId: s.id, status: "rejected" })}
                          disabled={updateSellerStatus.isPending}
                          className="bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                  <BadgeCheck className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">All Seller Applications Verified!</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">There are currently no new seller registration requests pending verification. All sellers are actively operating.</p>
                </div>
              )}
            </div>
          )}          {/* All Sellers Sub-Tab */}
          {sellerSubTab === "all" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={sellerSearchQuery}
                    onChange={(e) => setSellerSearchQuery(e.target.value)}
                    placeholder="Search sellers by store name, email, phone..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  {sellerSearchQuery && (
                    <button onClick={() => setSellerSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                  <select
                    value={sellerStatusFilter}
                    onChange={(e) => setSellerStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Approval Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <span className="text-xs text-slate-500 whitespace-nowrap font-medium">({filteredSellers.length} sellers)</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Business</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Rating</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredSellers.length > 0 ? (
                      filteredSellers.map((s: any) => (
                        <>
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{s.businessName}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{s.businessEmail}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                s.status === "approved" ? "bg-green-100 text-green-700" :
                                s.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                s.status === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">{s.rating}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => setExpandedSellerId(expandedSellerId === s.id ? null : s.id)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">View</button>
                                {s.status !== "approved" && <button onClick={() => updateSellerStatus.mutate({ sellerId: s.id, status: "approved" })} className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-200">Approve</button>}
                                {s.status !== "rejected" && <button onClick={() => updateSellerStatus.mutate({ sellerId: s.id, status: "rejected" })} className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Reject</button>}
                                {s.status !== "suspended" && <button onClick={() => updateSellerStatus.mutate({ sellerId: s.id, status: "suspended" })} className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200">Suspend</button>}
                              </div>
                            </td>
                          </tr>
                          {expandedSellerId === s.id && (
                            <tr key={`${s.id}-details`}>
                              <td colSpan={5} className="bg-slate-50 px-4 py-4 dark:bg-slate-700/40">
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                                  <div><p className="text-slate-500">Business email</p><p className="font-medium text-slate-900 dark:text-white">{s.businessEmail}</p></div>
                                  <div><p className="text-slate-500">Phone</p><p className="font-medium text-slate-900 dark:text-white">{s.businessPhone || "Not provided"}</p></div>
                                  <div><p className="text-slate-500">Description</p><p className="font-medium text-slate-900 dark:text-white">{s.description || "No description provided"}</p></div>
                                  <div><p className="text-slate-500">Sales</p><p className="font-medium text-slate-900 dark:text-white">{s.totalSales || 0}</p></div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                          No sellers match your filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Search products by title, SKU, seller..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              {productSearchQuery && (
                <button onClick={() => setProductSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Categories</option>
                {(allCategories || []).map((cat: any) => (
                  <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                ))}
              </select>
              <span className="text-xs text-slate-500 whitespace-nowrap font-medium">({filteredProducts.length} products)</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p: any) => (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{p.categoryName}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{formatCurrency(p.price)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.status === "active" ? "bg-green-100 text-green-700" :
                            p.status === "draft" ? "bg-yellow-100 text-yellow-700" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setExpandedProductId(expandedProductId === p.id ? null : p.id)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">View</button>
                            <button onClick={() => updateProductStatus.mutate({ productId: p.id, status: "active" })} className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-200">Activate</button>
                            <button onClick={() => updateProductStatus.mutate({ productId: p.id, status: "draft" })} className="rounded-lg bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-200">Draft</button>
                            <button onClick={() => updateProductStatus.mutate({ productId: p.id, status: "archived" })} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">Archive</button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200 cursor-pointer">
                                  Delete
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action will soft-delete the product from the storefront. Past orders and analytics will remain intact.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteProductMutation.mutate({ id: p.id })} className="bg-red-600 text-white hover:bg-red-700">
                                    Delete Product
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                      {expandedProductId === p.id && (
                        <tr key={`${p.id}-details`}>
                          <td colSpan={5} className="bg-slate-50 px-4 py-4 dark:bg-slate-700/40">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                              <div><p className="text-slate-500">Seller</p><p className="font-medium text-slate-900 dark:text-white">{p.sellerName || "Unknown seller"}</p></div>
                              <div><p className="text-slate-500">SKU</p><p className="font-medium text-slate-900 dark:text-white">{p.sku || "N/A"}</p></div>
                              <div><p className="text-slate-500">Rating</p><p className="font-medium text-slate-900 dark:text-white">{p.rating || 0}</p></div>
                              <div><p className="text-slate-500">Sold</p><p className="font-medium text-slate-900 dark:text-white">{p.soldCount || 0}</p></div>
                              <div className="md:col-span-2 xl:col-span-4"><p className="text-slate-500">Description</p><p className="font-medium text-slate-900 dark:text-white">{p.description || "No description provided"}</p></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                      No products match your search or filter criteria.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    )}

      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search orders by Order #, recipient name, phone..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              {orderSearchQuery && (
                <button onClick={() => setOrderSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Order Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span className="text-xs text-slate-500 whitespace-nowrap font-medium">({filteredOrders.length} orders)</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-[#EEF2FF] dark:bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800 dark:text-white uppercase">User / Email</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800 dark:text-white uppercase">Package / Items</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800 dark:text-white uppercase">Booking Status</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800 dark:text-white uppercase">Payment Status</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800 dark:text-white uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800 dark:text-white uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800 dark:text-white uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((o: any) => (
                    <React.Fragment key={o.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm font-medium text-slate-700 dark:text-white">{o.recipientName}</p>
                          <p className="text-xs text-slate-500">{o.recipientEmail || o.recipientPhone || "N/A"}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-slate-700 dark:text-white line-clamp-2 max-w-[200px]">
                            {o.items?.[0]?.productName || "Various Items"}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm ${
                            o.status === "delivered" ? "bg-[#22C55E]" :
                            o.status === "cancelled" ? "bg-[#EF4444]" :
                            "bg-[#EAB308]"
                          }`}>
                            {o.status || "pending"}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm ${
                            o.paymentStatus === "paid" ? "bg-[#22C55E]" :
                            "bg-[#EF4444]"
                          }`}>
                            {o.paymentStatus || "unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-sm font-medium text-slate-700 dark:text-white">
                          {formatCurrency(o.totalAmount)}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-300">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <button disabled={updateOrderStatus.isPending} onClick={() => void handleOrderStatusChange(o.id, "processing")} className="rounded bg-[#22C55E] px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600 disabled:cursor-wait disabled:opacity-60 flex items-center gap-1 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5"/> Confirm</button>
                            <button disabled={updateOrderStatus.isPending} onClick={() => void handleOrderStatusChange(o.id, "cancelled")} className="rounded bg-[#EF4444] px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:cursor-wait disabled:opacity-60 flex items-center gap-1 shadow-sm"><XCircle className="w-3.5 h-3.5"/> Cancel</button>
                            <button onClick={() => { setEditingOrderId(o.id); setOrderEditDraft({ orderId: o.id, fullName: o.shippingFullName || "", address: o.shippingAddress || "", district: o.shippingDistrict || o.shippingCity || "", postalCode: o.shippingPostalCode || "", landmark: o.shippingLandmark || "" }); }} className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Edit Order</button>
                          </div>
                        </td>
                      </tr>
                      {(o.lastEditedBy || o.lastEditedAt) && (
                        <tr>
                          <td colSpan={7} className="px-4 pb-3 text-[11px] text-slate-500 dark:text-slate-400">
                            Last edited by {o.lastEditedBy || "system"} on {o.lastEditedAt ? new Date(o.lastEditedAt).toLocaleString() : "recently"}
                          </td>
                        </tr>
                      )}
                      {expandedOrderId === o.id && (
                        <tr key={`${o.id}-details`}>
                          <td colSpan={6} className="bg-slate-50 px-4 py-4 dark:bg-slate-700/40">
                            <div className="space-y-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                <span>Courier Partner: <strong>{o.courierName || "Unassigned"}</strong></span>
                                <span>Tracking #: <strong className="font-mono">{o.trackingNumber || "Pending"}</strong></span>
                                <span>Estimated Delivery: <strong>{o.estimatedDeliveryDays ? `${o.estimatedDeliveryDays} Days` : "Calculating..."}</strong></span>
                              </div>
                              <p className="font-medium text-slate-900 dark:text-white text-xs uppercase tracking-wider">Order Items</p>
                              {o.items && o.items.length > 0 ? o.items.map((item: any) => (
                                <div key={`${o.id}-${item.productName}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-600">
                                  <span className="text-slate-700 dark:text-slate-200">{item.productName || "Product"}</span>
                                  <span className="text-slate-500">{item.quantity} × {formatCurrency(item.totalPrice)}</span>
                                </div>
                              )) : <p className="text-slate-500">No items listed</p>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                      No orders match your search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingOrderId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Order Delivery Details</h3>
                <p className="text-xs text-slate-500">Update the customer shipping information for this order.</p>
              </div>
              <button onClick={() => setEditingOrderId(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <input value={orderEditDraft.fullName} onChange={(e) => setOrderEditDraft({ ...orderEditDraft, fullName: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm" placeholder="Customer full name" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">Full Address</label>
                <textarea value={orderEditDraft.address} onChange={(e) => setOrderEditDraft({ ...orderEditDraft, address: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm min-h-[88px]" placeholder="House number, road, area, block, etc." />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">District</label>
                <select value={orderEditDraft.district} onChange={(e) => setOrderEditDraft({ ...orderEditDraft, district: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm">
                  <option value="">Select district</option>
                  {bangladeshDistricts.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">Post Code</label>
                <input value={orderEditDraft.postalCode} onChange={(e) => setOrderEditDraft({ ...orderEditDraft, postalCode: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm" placeholder="e.g. 1207" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">Landmark / Area Note (Optional)</label>
                <input value={orderEditDraft.landmark} onChange={(e) => setOrderEditDraft({ ...orderEditDraft, landmark: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm" placeholder="Near Metro Rail, beside school, etc." />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingOrderId(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200">Cancel</button>
              <button type="button" onClick={saveOrderShippingEdit} disabled={isOrderEditSubmitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-70">
                {isOrderEditSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 w-full">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Category Hierarchy Manager</h2>
              <p className="text-sm text-slate-500">Add, edit category names & banner images across the platform.</p>
              
              <div className="relative mt-3 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Search categories by name or slug..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                {categorySearchQuery && (
                  <button onClick={() => setCategorySearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: "", description: "", icon: "Package", image: "" });
                setShowCategoryModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add New Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories && filteredCategories.length > 0 ? (
              filteredCategories.map((cat: any) => (
                <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                  <div>
                    {/* Category Banner Preview Header */}
                    <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden border-b border-slate-100 dark:border-slate-700">
                      <img
                        src={cat.image || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80"}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                        <div className="flex items-center justify-between w-full">
                          <h3 className="font-bold text-white text-base truncate">{cat.name}</h3>
                          <span className="text-[10px] font-mono bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-full shrink-0">
                            {cat.slug}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {cat.description || "No description provided."}
                      </p>
                      <div className="pt-2 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Total Products</span>
                        <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          {cat.productCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700/60 mt-2">
                    <Link
                      to={`/category/${cat.slug}`}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      View Live Banner ↗
                    </Link>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            name: cat.name || "",
                            description: cat.description || "",
                            icon: cat.icon || "Package",
                            image: cat.image || "",
                          });
                          setShowCategoryModal(true);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        ✏️ Edit
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold transition-all cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 inline-block -mt-0.5 mr-1" />
                            Delete
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the "{cat.name}" category? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCategoryMutation.mutate({ id: cat.id })} className="bg-red-600 text-white hover:bg-red-700">
                              Delete Category
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 py-8 text-center col-span-3">No categories found.</p>
            )}
          </div>

          {showCategoryModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Category"}
                    </h3>
                    <p className="text-xs text-slate-500">Update category details and banner image.</p>
                  </div>
                  <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Category Name</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Automotive / Car Accessories"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Banner Image URL</label>
                  <input
                    type="text"
                    value={categoryForm.image}
                    onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://images.unsplash.com/photo-..."
                  />

                  {/* Preset Banners Quick Selector */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400">Preset Banners:</span>
                    <button
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80" })}
                      className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
                    >
                      🏎️ Automotive
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80" })}
                      className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded text-[11px] font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-100 cursor-pointer"
                    >
                      👕 Fashion
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, image: "https://images.unsplash.com/photo-1498049860654-af1a5c566876?w=1600&q=80" })}
                      className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[11px] font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                    >
                      📱 Electronics
                    </button>
                  </div>
                </div>

                {/* Banner Live Preview */}
                {categoryForm.image && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-28 relative">
                    <img src={categoryForm.image} alt="Banner Preview" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Live Banner Preview
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    rows={3}
                    placeholder="Provide category description..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                  <button
                    onClick={() => {
                      if (editingCategory) {
                        updateCategory.mutate({
                          id: editingCategory.id,
                          name: categoryForm.name,
                          description: categoryForm.description,
                          image: categoryForm.image,
                        });
                      } else {
                        createCategory.mutate({
                          name: categoryForm.name,
                          description: categoryForm.description,
                          image: categoryForm.image,
                        });
                      }
                    }}
                    disabled={createCategory.isPending || updateCategory.isPending || !categoryForm.name.trim()}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md cursor-pointer"
                  >
                    {createCategory.isPending || updateCategory.isPending
                      ? "Saving..."
                      : editingCategory
                      ? "Update Category"
                      : "Save Category"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "tickets" && (
        <div className="space-y-6">
          {/* Admin Workflow Guidance Card */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-lg border border-indigo-800">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-600/30 rounded-xl border border-indigo-500/30 shrink-0">
                <LifeBuoy className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Admin Support Protocol: Handling AI Escalation Tickets</h2>
                <p className="text-xs text-indigo-200 leading-relaxed max-w-3xl">
                  When the 24/7 AI Support Assistant encounters high customer frustration, complex order disputes, or refund requests exceeding standard policy thresholds, it logs an automated escalation ticket here for human intervention.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                    <span className="font-bold text-indigo-300">1. Take Ownership</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">Click <strong>Assign to Me</strong> to mark the ticket as <em>In Progress</em>.</p>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                    <span className="font-bold text-indigo-300">2. Inspect Context</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">Review the customer message, AI response, and escalation reason.</p>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                    <span className="font-bold text-indigo-300">3. Provide Resolution</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">Record a resolution note and update the status to <em>Resolved</em>.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Escalation Tickets</h3>
                <p className="text-xs text-slate-500">Live human handoff queue requiring admin action</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* 2 Main Sections: Waiting to be Solved vs Solved */}
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <button
                    onClick={() => setTicketSectionTab("waiting")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      ticketSectionTab === "waiting"
                        ? "bg-amber-500 text-white shadow-sm font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>⏳ Waiting to be Solved</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      ticketSectionTab === "waiting" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}>
                      {allTickets?.filter((t: any) => t.status !== "resolved" && t.status !== "closed").length || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setTicketSectionTab("solved")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      ticketSectionTab === "solved"
                        ? "bg-emerald-600 text-white shadow-sm font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>✅ Solved</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      ticketSectionTab === "solved" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    }`}>
                      {allTickets?.filter((t: any) => t.status === "resolved" || t.status === "closed").length || 0}
                    </span>
                  </button>
                </div>
                {allTickets && allTickets.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all support escalation tickets and history?")) {
                        clearAllTicketsMutation.mutate();
                      }
                    }}
                    disabled={clearAllTicketsMutation.isPending}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Tickets
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {(() => {
                const filteredTickets = (allTickets || []).filter((t: any) =>
                  ticketSectionTab === "solved"
                    ? t.status === "resolved" || t.status === "closed"
                    : t.status !== "resolved" && t.status !== "closed"
                );

                if (filteredTickets.length === 0) {
                  return (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      <LifeBuoy className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-600 dark:text-slate-400 font-semibold">
                        {ticketSectionTab === "solved"
                          ? "No solved support tickets yet."
                          : "No pending support tickets waiting to be solved! 🎉"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {ticketSectionTab === "solved"
                          ? "Resolved tickets will appear here for audit & history."
                          : "New customer escalations requiring human handoff will appear here."}
                      </p>
                    </div>
                  );
                }

                return filteredTickets.map((ticket: any) => (
                  <div key={ticket.id} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4 shadow-sm hover:border-slate-300 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">#{ticket.ticketNumber}</span>
                          {ticket.sentimentScore && ticket.sentimentScore < -0.5 && (
                            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-md">Negative Sentiment ({ticket.sentimentScore})</span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1">{ticket.userMessage}</h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          ticket.priority === "urgent" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                          ticket.priority === "high" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {ticket.priority} priority
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          ticket.status === "resolved" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                          ticket.status === "in_progress" ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
                          "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}>
                          {ticket.status === "resolved" ? "✅ Solved" : ticket.status === "in_progress" ? "💬 In Progress" : "⏳ Waiting"}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700 space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Escalation Trigger:</span>
                        <p className="text-slate-600 dark:text-slate-400">{ticket.escalationReason}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700 space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">AI Initial Response:</span>
                        <p className="text-slate-600 dark:text-slate-400 italic">"{ticket.aiResponse || "No AI response recorded"}"</p>
                      </div>
                    </div>

                    {ticket.resolution && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-xs">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">Admin Resolution Note:</span>
                        <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">{ticket.resolution}</p>
                      </div>
                    )}

                    {/* Interactive Resolution Drawer */}
                    {resolvingTicketId === ticket.id && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                        <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase">
                          Enter Admin Resolution Note
                        </label>
                        <textarea
                          rows={2}
                          value={resolutionInput}
                          onChange={(e) => setResolutionInput(e.target.value)}
                          placeholder="e.g. Verified damage proof, issued replacement order #ORD-99201."
                          className="w-full text-xs p-2.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setResolvingTicketId(null)}
                            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => updateTicketStatus.mutate({ ticketId: ticket.id, status: "resolved", resolution: resolutionInput })}
                            disabled={updateTicketStatus.isPending || !resolutionInput.trim()}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                          >
                            Save & Mark Resolved
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400">
                        Logged: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Recently"}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveChatTicket(ticket);
                            updateTicketStatus.mutate({ ticketId: ticket.id, status: "in_progress" });
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Headphones className="w-3.5 h-3.5" />
                          Open Live Chat
                        </button>
                        {ticket.status !== "in_progress" && ticket.status !== "resolved" && (
                          <button
                            onClick={() => updateTicketStatus.mutate({ ticketId: ticket.id, status: "in_progress" })}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors"
                          >
                            Assign to Me
                          </button>
                        )}
                        {ticket.status !== "resolved" && (
                          <button
                            onClick={() => {
                              setResolvingTicketId(ticket.id);
                              setResolutionInput(ticket.resolution || "");
                            }}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            Provide Resolution & Resolve
                          </button>
                        )}
                        {ticket.status === "resolved" && (
                          <button
                            onClick={() => updateTicketStatus.mutate({ ticketId: ticket.id, status: "open", resolution: "" })}
                            className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100"
                          >
                            Re-Open Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Admin Live Real-Time Chat Console Modal */}
          {activeChatTicket && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full h-[600px] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Console Header */}
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between border-b border-indigo-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600/40 rounded-lg border border-indigo-400/30">
                      <Headphones className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-300">#{activeChatTicket.ticketNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {activeChatTicket.priority} Priority
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white">{activeChatTicket.userMessage}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        updateTicketStatus.mutate({ ticketId: activeChatTicket.id, status: "resolved", resolution: "Resolved via Live Admin Chat Session" });
                        setActiveChatTicket(null);
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      Resolve & Close Chat
                    </button>
                    <button
                      onClick={() => setActiveChatTicket(null)}
                      className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                  {/* System Escalation Reason Card */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 shadow-sm">
                    <span className="font-bold">System Handoff Reason:</span> {activeChatTicket.escalationReason}
                  </div>

                  {/* Prior AI Chat Conversation History */}
                  {chatMessages?.historyMessages && chatMessages.historyMessages.length > 0 && (
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 rounded-xl p-3 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200 border-b border-indigo-200/60 dark:border-indigo-800/60 pb-2 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Prior Conversation History with AI Assistant ({chatMessages.historyMessages.length} messages)
                        </span>
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
                          AI Session
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {chatMessages.historyMessages.map((hm: any) => (
                          <div
                            key={`hm_${hm.id}`}
                            className={`p-2.5 rounded-lg text-xs ${
                              hm.role === "user"
                                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                : "bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-950 dark:text-indigo-100 border border-indigo-200/50 dark:border-indigo-800/50"
                            }`}
                          >
                            <span className="font-bold block text-[10px] opacity-75 uppercase tracking-wider mb-0.5">
                              {hm.role === "user" ? "Customer" : "AI Assistant"}
                            </span>
                            <p className="whitespace-pre-wrap leading-relaxed">{hm.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div>
                    <span className="flex-shrink mx-3 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      Live Admin Handoff Session
                    </span>
                    <div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div>
                  </div>

                  {/* Live Real-time Chat Messages */}
                  {chatMessages?.liveMessages && chatMessages.liveMessages.length > 0 ? (
                    chatMessages.liveMessages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-xs space-y-1 ${
                            msg.senderType === "admin"
                              ? "bg-indigo-600 text-white rounded-tr-none shadow-sm"
                              : msg.senderType === "system"
                              ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 mx-auto text-center font-mono text-[11px]"
                              : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 font-semibold text-[10px] opacity-80 border-b border-black/10 dark:border-white/10 pb-1">
                            <span>{msg.senderName || msg.senderType}</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No live admin chat messages sent yet. Send a message below to start chatting directly with the customer.
                    </div>
                  )}
                </div>

                {/* Console Input Bar */}
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={adminChatInput}
                    onChange={(e) => setAdminChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && adminChatInput.trim() && !sendAdminMessageMutation.isPending) {
                        sendAdminMessageMutation.mutate({
                          ticketId: activeChatTicket.id,
                          message: adminChatInput.trim(),
                        });
                      }
                    }}
                    placeholder="Type your response to customer..."
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (adminChatInput.trim() && !sendAdminMessageMutation.isPending) {
                        sendAdminMessageMutation.mutate({
                          ticketId: activeChatTicket.id,
                          message: adminChatInput.trim(),
                        });
                      }
                    }}
                    disabled={!adminChatInput.trim() || sendAdminMessageMutation.isPending}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      </main>
    </div>
  );
}

function AdminStatCard({
  icon,
  label,
  value,
  color,
  trendData,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  trendData?: {v: number}[];
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-[#6366F1] text-white", // Purple-blue for Total Packages
    emerald: "bg-[#10B981] text-white",
    green: "bg-[#22C55E] text-white", // Green for Users
    yellow: "bg-[#EAB308] text-white", // Yellow for Revenue
    orange: "bg-[#EAB308] text-white", // Fallback to Yellow
    red: "bg-[#EF4444] text-white", // Red for Bookings Today
    indigo: "bg-[#EAB308] text-white", // Map revenue indigo to yellow
    purple: "bg-[#6366F1] text-white",
  };

  return (
    <div className={`${colorMap[color] || colorMap.blue} rounded-xl shadow-md p-5 flex flex-col justify-between h-[120px] relative overflow-hidden group`}>
      <div className="flex items-center justify-between z-10 relative">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-white/90 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white tracking-tight leading-tight">{value}</p>
        </div>
        <div className="p-2 bg-white/20 rounded-full shrink-0">
          {icon}
        </div>
      </div>
      
      {trendData && trendData.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[50px] opacity-40 group-hover:opacity-60 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <Line type="monotone" dataKey="v" stroke="#ffffff" strokeWidth={3} dot={false} isAnimationActive={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

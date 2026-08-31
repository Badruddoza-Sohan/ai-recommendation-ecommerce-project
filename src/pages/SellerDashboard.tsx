import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/currency";
import { getInventoryStatus } from "@/lib/inventory";
import { toast } from "@/lib/toast";
import { broadcastLiveEvent } from "@/lib/realtimeSync";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Loader2,
  Bot,
  AlertTriangle,
  ArrowUpRight,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Boxes,
  Home,
  BarChart3,
  DollarSign as DollarSignIcon,
  Star,
  Users,
  MessageSquare,
  Settings,
  User,
  Menu,
  X,
  ChevronRight,
  Eye,
  Download,
  ThumbsUp,
  Search,
  Filter,
  Sparkles,
  RotateCcw,
  Send,
  Clock,
  CheckCircle2,
  CornerDownRight,
  Mail,
  Inbox,
  Truck,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function SellerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const demoSellerLogin = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Signed in as Demo Seller!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to sign in as seller");
    },
  });

  if (authLoading || demoSellerLogin.isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Loading Seller Hub...</p>
      </div>
    );
  }

  if (!user || ((user as any).role !== "seller" && (user as any).role !== "admin")) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Package className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Seller Hub Access</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
          Sign in with your seller account or use 1-click demo access to manage your products, inventory, orders, and sales.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => demoSellerLogin.mutate({ identifier: "01700000001", password: "seller123" })}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>1-Click Demo Seller Login</span>
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Sign In with Password
          </button>
        </div>
      </div>
    );
  }

  return <SellerDashboardContent />;
}

// Seller Dashboard Content Component - Only rendered if user is a seller
function SellerDashboardContent() {
  const { logout, user: authUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const validSellerTabs = ["overview", "products", "inventory", "orders", "analytics", "payouts", "reviews", "customers", "messages", "settings", "profile"];

  const getInitialTab = () => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validSellerTabs.includes(tabFromUrl)) return tabFromUrl as any;
    const stored = localStorage.getItem("seller_active_tab");
    if (stored && validSellerTabs.includes(stored)) return stored as any;
    return "overview";
  };

  const [activeMenu, setActiveMenuState] = useState<"overview" | "products" | "inventory" | "orders" | "analytics" | "payouts" | "reviews" | "customers" | "messages" | "settings" | "profile">(getInitialTab);

  const setActiveMenu = (menu: any) => {
    const nextMenu = validSellerTabs.includes(menu) ? menu : "overview";
    setActiveMenuState(nextMenu);
    setSearchParams({ tab: nextMenu });
    localStorage.setItem("seller_active_tab", nextMenu);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validSellerTabs.includes(tabFromUrl) && tabFromUrl !== activeMenu) {
      setActiveMenuState(tabFromUrl as any);
    }
  }, [searchParams]);

  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", shortDescription: "", price: "", comparePrice: "", deliveryFeeInsideDhaka: "", deliveryFeeOutsideDhaka: "", categoryId: "", status: "draft" as "active" | "draft" | "archived", sku: "", quantity: "0", lowStockThreshold: "5", warehouseLocation: "", imageUrl: "", images: [""] as string[], keywords: "", sizeType: "", variants: [] as { size: string, color: string, quantity: number }[] });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({ productId: "", delta: "1", threshold: "5", warehouseLocation: "" });
  const [settingsForm, setSettingsForm] = useState({ businessName: "", businessEmail: "", businessPhone: "", description: "", logo: "", banner: "" });

  const { data: dashboard, isLoading } = trpc.seller.dashboard.useQuery(undefined, {
    enabled: true,
    refetchInterval: 2500,
  });
  const { data: lowStock } = trpc.ai.getLowStockAlert.useQuery(undefined, {
    enabled: true,
    refetchInterval: 5000,
  });
  const { data: sellerOrders } = trpc.seller.getOrders.useQuery(undefined, {
    enabled: true,
    refetchInterval: 2500,
  });
  const { data: sellerProducts } = trpc.seller.listProducts.useQuery(undefined, {
    enabled: true,
    refetchInterval: 3000,
  });
  const { data: categories } = trpc.category.list.useQuery(undefined, {
    enabled: true,
    refetchInterval: 5000,
  });

  const utils = trpc.useUtils();
  const createProduct = trpc.seller.createProduct.useMutation({
    onSuccess: async () => {
      toast.success("Product created successfully!");
      setShowForm(false);
      setImageFile(null);
      setIsUploading(false);
      setForm({ name: "", description: "", shortDescription: "", price: "", comparePrice: "", deliveryFeeInsideDhaka: "", deliveryFeeOutsideDhaka: "", categoryId: "", status: "draft", sku: "", quantity: "0", lowStockThreshold: "5", warehouseLocation: "", imageUrl: "", images: [""], keywords: "", sizeType: "", variants: [] });
      await utils.seller.listProducts.invalidate();
      await utils.seller.dashboard.invalidate();
      broadcastLiveEvent("PRODUCT_UPDATED");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create product");
      setIsUploading(false);
    },
  });
  const updateProduct = trpc.seller.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully!");
      setEditingProductId(null);
      setShowForm(false);
      setImageFile(null);
      setIsUploading(false);
      setForm({ name: "", description: "", shortDescription: "", price: "", comparePrice: "", deliveryFeeInsideDhaka: "", deliveryFeeOutsideDhaka: "", categoryId: "", status: "draft", sku: "", quantity: "0", lowStockThreshold: "5", warehouseLocation: "", imageUrl: "", images: [""], keywords: "", sizeType: "", variants: [] });
      utils.seller.listProducts.invalidate();
      utils.seller.dashboard.invalidate();
      broadcastLiveEvent("PRODUCT_UPDATED");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update product");
      setIsUploading(false);
    },
  });
  const deleteProduct = trpc.seller.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully!");
      utils.seller.listProducts.invalidate();
      utils.seller.dashboard.invalidate();
      broadcastLiveEvent("PRODUCT_UPDATED");
    },
    onError: (err) => toast.error(err.message || "Failed to delete product"),
  });
  const adjustInventory = trpc.seller.adjustInventory.useMutation({
    onSuccess: () => {
      toast.success("Inventory adjusted successfully!");
      setInventoryForm({ productId: "", delta: "1", threshold: "5", warehouseLocation: "" });
      utils.seller.listProducts.invalidate();
      utils.seller.dashboard.invalidate();
      broadcastLiveEvent("PRODUCT_UPDATED");
    },
    onError: (err) => toast.error(err.message || "Failed to adjust inventory"),
  });
  const updateProfile = trpc.seller.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Seller profile saved successfully!");
      utils.seller.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to save profile"),
  });

  useEffect(() => {
    if (dashboard?.seller) {
      setSettingsForm({
        businessName: dashboard.seller.businessName || "",
        businessEmail: dashboard.seller.businessEmail || "",
        businessPhone: dashboard.seller.businessPhone || "",
        description: dashboard.seller.description || "",
        logo: dashboard.seller.logo || "",
        banner: dashboard.seller.banner || "",
      });
    }
  }, [dashboard?.seller]);

  const inventoryValue = useMemo(() => (sellerProducts || []).reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0), [sellerProducts]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const resetForm = () => {
    setShowForm(true);
    setImageFile(null);
    setForm({
      name: "",
      description: "",
      shortDescription: "",
      price: "",
      comparePrice: "",
      deliveryFeeInsideDhaka: "",
      deliveryFeeOutsideDhaka: "",
      categoryId: "",
      status: "draft",
      sku: "",
      quantity: "0",
      lowStockThreshold: "5",
      warehouseLocation: "",
      imageUrl: "",
      images: [""],
      keywords: "",
      sizeType: "",
      variants: [],
    });
  };

  const handleEditProduct = (product: any) => {
    setEditingProductId(product.id);
    setShowForm(true);
    setImageFile(null);

    const existingImages = (product.images && product.images.length > 0)
      ? product.images.map((img: any) => typeof img === "string" ? img : img.imageUrl).filter(Boolean)
      : (product.imageUrl ? [product.imageUrl] : [""]);

    let parsedSizeType = "";
    try {
      if (product.attributes) {
        const attr = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes;
        if (attr.sizeType) {
          parsedSizeType = String(attr.sizeType);
        }
      }
    } catch(e) {}

    setForm({
      name: product.name,
      description: product.description || "",
      shortDescription: product.shortDescription || "",
      price: String(product.price || ""),
      comparePrice: product.comparePrice ? String(product.comparePrice) : "",
      deliveryFeeInsideDhaka: product.deliveryFeeInsideDhaka ? String(product.deliveryFeeInsideDhaka) : "",
      deliveryFeeOutsideDhaka: product.deliveryFeeOutsideDhaka ? String(product.deliveryFeeOutsideDhaka) : "",
      categoryId: product.categoryId ? String(product.categoryId) : "",
      status: (product.status as "active" | "draft" | "archived") || "draft",
      sku: product.sku || "",
      quantity: product.quantity ? String(product.quantity) : "0",
      lowStockThreshold: product.lowStockThreshold ? String(product.lowStockThreshold) : "5",
      warehouseLocation: product.warehouseLocation || "",
      imageUrl: product.imageUrl || "",
      images: existingImages.slice(0, 4).length > 0 ? existingImages.slice(0, 4) : [""],
      keywords: product.keywords || "",
      sizeType: parsedSizeType,
      variants: Array.isArray(product.variants) ? product.variants.map((v: any) => ({ size: v.size, color: v.color || "", quantity: v.quantity })) : [],
    });
  };

  const submitProduct = async () => {
    if (!authUser || (authUser as any).role !== "seller") {
      toast.error("Please sign in as a seller before creating products.");
      navigate("/login");
      return;
    }

    if (!form.name || !form.price || !form.categoryId) {
      toast.error("Please fill in all mandatory fields (Name, Price, Category)");
      return;
    }
    
    setIsUploading(true);
    let uploadedUrl = "";
    
    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          uploadedUrl = data.url;
        } else {
          toast.error(data.error || "Failed to upload image");
          setIsUploading(false);
          return;
        }
      }
    } catch (err) {
      toast.error("Error uploading image");
      setIsUploading(false);
      return;
    }

    const currentImages = Array.isArray(form.images) ? form.images.map((img: string) => img.trim()).filter(Boolean) : [];
    if (uploadedUrl) {
      currentImages.unshift(uploadedUrl);
    } else if (form.imageUrl?.trim() && !currentImages.includes(form.imageUrl.trim())) {
      currentImages.unshift(form.imageUrl.trim());
    }

    const finalImages = currentImages.slice(0, 4);

    if (finalImages.length === 0) {
      toast.error("⚠️ Product must have at least 1 photo (Minimum 1 mandatory, Max 4 allowed)");
      setIsUploading(false);
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      shortDescription: form.shortDescription,
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
      deliveryFeeInsideDhaka: form.deliveryFeeInsideDhaka ? Number(form.deliveryFeeInsideDhaka) : 0,
      deliveryFeeOutsideDhaka: form.deliveryFeeOutsideDhaka ? Number(form.deliveryFeeOutsideDhaka) : 0,
      categoryId: Number(form.categoryId),
      status: form.status,
      sku: form.sku || undefined,
      quantity: Number(form.quantity || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 5),
      warehouseLocation: form.warehouseLocation || undefined,
      images: finalImages,
      imageUrl: finalImages[0],
      keywords: form.keywords || undefined,
      sizeType: form.sizeType || undefined,
      variants: form.variants.length > 0 ? form.variants : undefined,
    };

    try {
      if (editingProductId) {
        await updateProduct.mutateAsync({ productId: editingProductId, ...payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
    } catch {
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(settingsForm);
  };

  const handleInventoryAdjust = (productIdOverride?: number, deltaOverride?: number, thresholdOverride?: number, warehouseLocationOverride?: string) => {
    if (!productIdOverride && !inventoryForm.productId) return;

    adjustInventory.mutate({
      productId: productIdOverride ?? Number(inventoryForm.productId),
      delta: deltaOverride ?? Number(inventoryForm.delta || 0),
      threshold: thresholdOverride ?? Number(inventoryForm.threshold || 5),
      warehouseLocation: warehouseLocationOverride ?? (inventoryForm.warehouseLocation || undefined),
    });
  };

  return (
    <div className="flex h-full bg-[#F4F6FC] dark:bg-slate-950/50 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 overflow-y-auto flex flex-col ${sidebarOpen ? "w-64" : "w-20"} ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E0E7FF] dark:bg-indigo-900/30 flex items-center justify-center text-[#5B6DF8] dark:text-indigo-400">
              <Package className="h-6 w-6" />
            </div>
            {sidebarOpen && (
              <div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">Seller Hub</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{dashboard?.seller?.businessName || "Seller Store"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {/* Main Section */}
          {sidebarOpen && <p className="px-3 py-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Dashboard</p>}
          
          <SidebarLink
            icon={<Home className="h-5 w-5" />}
            label="Overview"
            active={activeMenu === "overview"}
            onClick={() => setActiveMenu("overview")}
            sidebarOpen={sidebarOpen}
          />
          
          {/* Products & Inventory Section */}
          {sidebarOpen && <p className="px-3 py-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-6">Products</p>}
          
          <SidebarLink
            icon={<Package className="h-5 w-5" />}
            label="Products"
            active={activeMenu === "products"}
            onClick={() => setActiveMenu("products")}
            sidebarOpen={sidebarOpen}
          />
          
          <SidebarLink
            icon={<Boxes className="h-5 w-5" />}
            label="Inventory"
            active={activeMenu === "inventory"}
            onClick={() => setActiveMenu("inventory")}
            sidebarOpen={sidebarOpen}
          />
          
          {/* Orders & Sales Section */}
          {sidebarOpen && <p className="px-3 py-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-6">Sales</p>}
          
          <SidebarLink
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Orders"
            active={activeMenu === "orders"}
            onClick={() => setActiveMenu("orders")}
            sidebarOpen={sidebarOpen}
            badge={sellerOrders?.filter(o => o.status === "pending").length}
          />
          
          <SidebarLink
            icon={<BarChart3 className="h-5 w-5" />}
            label="Analytics"
            active={activeMenu === "analytics"}
            onClick={() => setActiveMenu("analytics")}
            sidebarOpen={sidebarOpen}
          />
          
          <SidebarLink
            icon={<DollarSignIcon className="h-5 w-5" />}
            label="Payouts"
            active={activeMenu === "payouts"}
            onClick={() => setActiveMenu("payouts")}
            sidebarOpen={sidebarOpen}
          />
          
          {/* Customer Section */}
          {sidebarOpen && <p className="px-3 py-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-6">Customers</p>}
          
          <SidebarLink
            icon={<Star className="h-5 w-5" />}
            label="Reviews"
            active={activeMenu === "reviews"}
            onClick={() => setActiveMenu("reviews")}
            sidebarOpen={sidebarOpen}
          />
          
          <SidebarLink
            icon={<Users className="h-5 w-5" />}
            label="Customers"
            active={activeMenu === "customers"}
            onClick={() => setActiveMenu("customers")}
            sidebarOpen={sidebarOpen}
          />
          
          <SidebarLink
            icon={<MessageSquare className="h-5 w-5" />}
            label="Messages"
            active={activeMenu === "messages"}
            onClick={() => setActiveMenu("messages")}
            sidebarOpen={sidebarOpen}
          />
          
          {/* Settings Section */}
          {sidebarOpen && <p className="px-3 py-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-6">Account</p>}
          
          <SidebarLink
            icon={<User className="h-5 w-5" />}
            label="Profile"
            active={activeMenu === "profile"}
            onClick={() => setActiveMenu("profile")}
            sidebarOpen={sidebarOpen}
          />
          
          <SidebarLink
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            active={activeMenu === "settings"}
            onClick={() => setActiveMenu("settings")}
            sidebarOpen={sidebarOpen}
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-sm font-medium"
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {sidebarOpen && "Collapse"}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all duration-200 text-sm font-medium mt-2"
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && "Log out"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header with AI Assistant */}
          <div className="flex items-center justify-between mb-8 pb-4 lg:pb-0 border-b lg:border-b-0 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white capitalize">{activeMenu}</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage your {activeMenu} effectively</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/seller/assistant"
                className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                <Bot className="h-5 w-5" />
                <span className="hidden sm:inline">AI Assistant</span>
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>

          {/* Account Pending Verification Notice */}
          {dashboard?.seller?.status === "pending" && (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">Account Pending Admin Approval</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Your seller account application is currently under review by our Admin verification team. Once your store details are verified and approved by the Admin, your products and store actions will be published live.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {activeMenu === "overview" && <OverviewSection dashboard={dashboard} lowStock={lowStock} stats={dashboard?.stats} sellerProducts={sellerProducts} inventoryValue={inventoryValue} sellerOrders={sellerOrders} setActiveMenu={setActiveMenu} setShowForm={setShowForm} />}

          {/* Products Tab */}
          {activeMenu === "products" && <ProductsSection sellerProducts={sellerProducts} editingProductId={editingProductId} setEditingProductId={setEditingProductId} showForm={showForm} setShowForm={setShowForm} form={form} setForm={setForm} categories={categories} resetForm={resetForm} submitProduct={submitProduct} startEdit={handleEditProduct} deleteProduct={deleteProduct} imageFile={imageFile} setImageFile={setImageFile} isUploading={isUploading} />}

          {/* Inventory Tab */}
          {activeMenu === "inventory" && <InventorySection sellerProducts={sellerProducts} lowStock={lowStock} inventoryValue={inventoryValue} inventoryForm={inventoryForm} setInventoryForm={setInventoryForm} onAdjustInventory={handleInventoryAdjust} isAdjusting={adjustInventory.isPending} />}

          {/* Orders Tab */}
          {activeMenu === "orders" && <OrdersSection sellerOrders={sellerOrders} />}

          {/* Analytics Tab */}
          {activeMenu === "analytics" && <AnalyticsSection dashboard={dashboard} />}

          {/* Payouts Tab */}
          {activeMenu === "payouts" && <PayoutsSection dashboard={dashboard} />}

          {/* Reviews Tab */}
          {activeMenu === "reviews" && <ReviewsSection reviews={dashboard?.reviews} />}

          {/* Customers Tab */}
          {activeMenu === "customers" && <CustomersSection sellerOrders={sellerOrders} customers={dashboard?.customers} />}

          {/* Messages Tab */}
          {activeMenu === "messages" && <MessagesSection messages={dashboard?.messages} />}

          {/* Settings Tab */}
          {activeMenu === "settings" && <SettingsSection dashboard={dashboard} settingsForm={settingsForm} setSettingsForm={setSettingsForm} onSave={handleSaveProfile} isSaving={updateProfile.isPending} />}

          {/* Profile Tab */}
          {activeMenu === "profile" && <ProfileSection dashboard={dashboard} />}
        </div>
      </main>
    </div>
  );
}

// Sidebar Link Component
function SidebarLink({
  icon,
  label,
  active,
  onClick,
  sidebarOpen,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  sidebarOpen: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${
        active
          ? "bg-[#E0E7FF] dark:bg-indigo-900/30 text-[#5B6DF8] dark:text-indigo-400"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
      }`}
      title={!sidebarOpen ? label : undefined}
    >
      <div className={active ? "text-[#5B6DF8] dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}>
        {icon}
      </div>
      {sidebarOpen && (
        <>
          <span className="flex-1 text-left text-sm font-medium">{label}</span>
          {badge && badge > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </>
      )}
      {!sidebarOpen && badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

// Overview Section Component
function OverviewSection({
  dashboard,
  lowStock,
  stats,
  sellerProducts,
  inventoryValue,
  sellerOrders,
  setActiveMenu,
  setShowForm,
}: any) {
  const monthlySales = dashboard?.monthlySales || [];
  const latestMonth = Number(monthlySales[0]?.total || 0);
  const previousMonth = Number(monthlySales[1]?.total || 0);
  const salesGrowth = previousMonth > 0 ? ((latestMonth - previousMonth) / previousMonth) * 100 : latestMonth > 0 ? 100 : 0;
  const revenueTrend = `${salesGrowth >= 0 ? "+" : ""}${salesGrowth.toFixed(0)}%`;
  
  // Format monthly sales for chart (reverse to chronological)
  const monthlySalesChartData = [...monthlySales].reverse().map(s => {
    // Extract short month name (e.g., "2024-05" -> "May")
    const date = new Date(s.month + "-01");
    const name = date.toLocaleString('default', { month: 'short' });
    return { name, revenue: Number(s.total) || 0 };
  });

  return (
    <div className="space-y-8">
      {/* Executive Snapshot & Revenue Overview Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-100">
            <Sparkles className="h-4 w-4" />
            Store snapshot
          </div>
          <h2 className="mt-3 text-2xl font-semibold">Your store is performing well</h2>
          <p className="mt-2 max-w-xl text-sm text-indigo-100/90">
            You have {stats?.totalSales || 0} lifetime sales, {stats?.totalProducts || 0} active products, and {stats?.pendingOrders || 0} pending orders awaiting fulfillment.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <div className="rounded-full bg-white/15 px-3 py-1.5">{revenueTrend} Monthly Revenue Growth</div>
            <div className="rounded-full bg-white/15 px-3 py-1.5">{dashboard?.reviews?.length || 0} Total Reviews</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 row-span-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Revenue Overview</h3>
          {monthlySalesChartData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySalesChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} tickFormatter={(value) => `${value} ৳`} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] w-full flex items-center justify-center text-slate-400">
              No sales data yet
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          trend={revenueTrend}
          trendData={monthlySalesChartData.length > 1 ? monthlySalesChartData.map(d => ({ v: d.revenue })) : [{v:0},{v:0},{v:0}]}
          color="yellow"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Sales"
          value={stats?.totalSales || 0}
          trend={revenueTrend}
          trendData={[{v:10},{v:15},{v:13},{v:20},{v:25},{v:22},{v:30}]}
          color="purple"
        />
        <StatCard
          icon={<ShoppingBag className="h-5 w-5" />}
          label="Pending Orders"
          value={stats?.pendingOrders || 0}
          alert={stats?.pendingOrders > 0}
          trendData={[{v:5},{v:2},{v:3},{v:1},{v:4},{v:2},{v:1}]}
          color="amber"
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Total Products"
          value={stats?.totalProducts || 0}
          trend={sellerProducts?.length ? "Live" : "No products"}
          trendData={[{v:5},{v:8},{v:12},{v:10},{v:18},{v:24},{v:28}]}
          color="indigo"
        />
        <StatCard
          icon={<Boxes className="h-5 w-5" />}
          label="Inventory Value"
          value={formatCurrency(inventoryValue)}
          trend="Live"
          trendData={[{v:5000},{v:5200},{v:5100},{v:5300},{v:5300},{v:5400},{v:5500}]}
          color="cyan"
        />
      </div>

      {/* Low Stock Alerts */}
      {lowStock && lowStock.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Low Stock Alerts</h3>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 5).map((item: any) => (
              <div
                key={item.productId}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.productName}</span>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  item.status === "out_of_stock"
                    ? "bg-red-100 text-red-700"
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {item.currentStock} left
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveMenu("inventory")}
            className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View Inventory
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Orders</h2>
            <button
              onClick={() => setActiveMenu("orders")}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View All <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {sellerOrders && sellerOrders.length > 0 ? (
            <div className="space-y-3">
              {sellerOrders.slice(0, 5).map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-slate-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    order.status === "processing" ? "bg-blue-100 text-blue-700" :
                    order.status === "shipped" ? "bg-indigo-100 text-indigo-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {order.status}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No orders yet</p>
            </div>
          )}
        </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionButton
            icon={<Plus className="h-5 w-5" />}
            label="Add Product"
            onClick={() => {
              setActiveMenu("products");
              setShowForm(true);
            }}
          />
          <QuickActionButton
            icon={<TrendingUp className="h-5 w-5" />}
            label="View Analytics"
            onClick={() => setActiveMenu("analytics")}
          />
          <QuickActionButton
            icon={<DollarSign className="h-5 w-5" />}
            label="Check Payouts"
            onClick={() => setActiveMenu("payouts")}
          />
        </div>
      </div>
    </div>
    </div>
  );
}

// Products Section
function ProductsSection({
  sellerProducts,
  editingProductId,
  setEditingProductId: _setEditingProductId,
  showForm,
  setShowForm,
  form,
  setForm,
  categories,
  resetForm,
  submitProduct,
  startEdit,
  deleteProduct,
  imageFile: _imageFile,
  setImageFile,
  isUploading,
}: any) {
  const [previousFormState, setPreviousFormState] = useState<any>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const suggestDetailsMutation = trpc.seller.suggestProductDetails.useMutation();

  const handleAiAutoFill = async (selectedCategoryId?: string) => {
    // Save current form snapshot for instant undo capability
    setPreviousFormState({ ...form });

    const categoryId = selectedCategoryId || form.categoryId;
    const selectedCategoryObj = (categories || []).find((c: any) => String(c.id) === String(categoryId));
    const categoryName = selectedCategoryObj?.name || "General Product";

    setIsGeneratingAi(true);
    try {
      const result = await suggestDetailsMutation.mutateAsync({
        productName: form.name?.trim() || undefined,
        categoryName,
        price: form.price ? Number(form.price) : undefined,
      });

      setForm((prevForm: any) => ({
        ...prevForm,
        categoryId: categoryId,
        shortDescription: result.shortDescription || prevForm.shortDescription,
        description: result.description || prevForm.description,
        keywords: result.keywords || prevForm.keywords,
        sku: result.sku || prevForm.sku,
        deliveryFeeInsideDhaka: prevForm.deliveryFeeInsideDhaka || "60",
        deliveryFeeOutsideDhaka: prevForm.deliveryFeeOutsideDhaka || "120",
      }));

      toast.success(
        result.source === "openai"
          ? `✨ AI generated description & SEO tags using OpenAI!`
          : `✨ AI generated description & keyword suggestions!`,
        {
          action: {
            label: "Undo",
            onClick: () => handleUndoAi(),
          },
        }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI suggestions");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleUndoAi = () => {
    if (previousFormState) {
      setForm(previousFormState);
      setPreviousFormState(null);
      toast.info("↩️ AI suggestions reverted to your original draft!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Products</h2>
          <p className="text-sm text-slate-500">{sellerProducts?.length || 0} items • Manage your complete catalog</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setPreviousFormState(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Add/Edit Product Form */}
      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitProduct();
          }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-800 animate-in fade-in duration-200"
        >
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingProductId ? "Edit Product" : "Create New Product"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Fill in your product details below. Important fields remain blank for your input.</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

            {/* 1. Category Selection */}
            <div className="flex flex-col space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Select Category <span className="text-red-500">*</span>
                </label>
                {form.categoryId && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => handleAiAutoFill(form.categoryId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800 disabled:opacity-60"
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating with AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Auto-Suggest Descriptions & Tags with AI</span>
                        </>
                      )}
                    </button>

                    {previousFormState && (
                      <button
                        type="button"
                        onClick={handleUndoAi}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-colors border border-amber-200 dark:border-amber-800 animate-in fade-in"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Undo AI Suggestions</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <select
                value={form.categoryId}
                onChange={(e) => {
                  setForm({ ...form, categoryId: e.target.value });
                }}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              >
                <option value="">Select category *</option>
                {(categories || []).map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">Select product category. Use the AI button above if you want suggested descriptions & tags.</p>
            </div>

            {/* 2. Product Name */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="Product name *"
              />
              <p className="text-[11px] text-slate-500">Enter a clear, descriptive title customers will search for.</p>
            </div>

            {/* 3. Selling Price */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Selling Price (BDT) <span className="text-red-500">*</span>
              </label>
              <input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="Price *"
                type="number"
              />
              <p className="text-[11px] text-slate-500">Actual selling price shown to buyers.</p>
            </div>

            {/* 4. Compare Price */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Compare Price / Original Price (BDT)
              </label>
              <input
                value={form.comparePrice}
                onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="Compare price"
                type="number"
              />
              <p className="text-[11px] text-slate-500">Original price before discount (shows strikethrough sale badge).</p>
            </div>

            {/* 5. Delivery Fee Inside Dhaka */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Delivery Fee Inside Dhaka (BDT)
              </label>
              <input
                value={form.deliveryFeeInsideDhaka}
                onChange={(e) => setForm({ ...form, deliveryFeeInsideDhaka: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="Delivery fee inside Dhaka"
                type="number"
              />
              <p className="text-[11px] text-slate-500">Shipping charge for deliveries inside Dhaka city.</p>
            </div>

            {/* 6. Delivery Fee Outside Dhaka */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Delivery Fee Outside Dhaka (BDT)
              </label>
              <input
                value={form.deliveryFeeOutsideDhaka}
                onChange={(e) => setForm({ ...form, deliveryFeeOutsideDhaka: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="Delivery fee outside Dhaka"
                type="number"
              />
              <p className="text-[11px] text-slate-500">Shipping charge for deliveries outside Dhaka district.</p>
            </div>

            {/* 7. SKU */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Product SKU Code
              </label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="SKU"
              />
              <p className="text-[11px] text-slate-500">Unique inventory tracking code for this product.</p>
            </div>

            {/* 8. Stock Quantity */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Initial Stock Quantity
              </label>
              <input
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="Quantity"
                type="number"
              />
              <p className="text-[11px] text-slate-500">Total units available in stock.</p>
            </div>

            {/* 9. Low Stock Alert Threshold */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Low Stock Threshold
              </label>
              <input
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="Low stock threshold"
                type="number"
              />
              <p className="text-[11px] text-slate-500">Triggers alert when inventory drops below this number.</p>
            </div>

            {/* 10. Warehouse Location */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Warehouse Location
              </label>
              <input
                value={form.warehouseLocation}
                onChange={(e) => setForm({ ...form, warehouseLocation: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                placeholder="Warehouse location"
              />
              <p className="text-[11px] text-slate-500">Physical storage location for courier pick-up.</p>
            </div>

            {/* 11. Multi-Image Product Gallery (Minimum 1, Maximum 4 Photos) */}
            <div className="flex flex-col space-y-2 md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span>Product Photos</span>
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold rounded-full">
                      Min 1 • Max 4 Photos
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Minimum 1 photo is mandatory for listing. Photo #1 serves as the primary cover photo.
                  </p>
                </div>

                {((form.images || []).length < 4) && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(form.images || [""]), ""];
                      if (updated.length <= 4) {
                        setForm({ ...form, images: updated });
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Add Photo</span>
                  </button>
                )}
              </div>

              {/* Photo Upload & URL Inputs (1 to 4 slots) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {(form.images && form.images.length > 0 ? form.images : [""]).map((url: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 relative shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>Photo #{idx + 1}</span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-extrabold rounded">
                            Primary Cover
                          </span>
                        )}
                      </span>
                      {form.images && form.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = form.images.filter((_: any, i: number) => i !== idx);
                            setForm({ ...form, images: updated.length > 0 ? updated : [""] });
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Remove photo"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                          const updated = [...(form.images || [""])];
                          updated[idx] = e.target.value;
                          setForm({ ...form, images: updated, imageUrl: updated[0] || "" });
                        }}
                        placeholder={`Paste image URL #${idx + 1} (https://...)`}
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    {idx === 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500 shrink-0">Or local file:</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setImageFile(e.target.files[0]);
                            }
                          }}
                          className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                        />
                      </div>
                    )}

                    {url.trim() && (
                      <div className="h-20 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700 mt-1">
                        <img src={url} alt={`Preview ${idx + 1}`} className="h-full object-contain" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 12. Status */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Product Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <p className="text-[11px] text-slate-500">Control visibility in public store.</p>
            </div>

            {/* 13. Full Description */}
            <div className="flex flex-col space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Full Description & Features
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Generated
                </span>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-sans"
                placeholder="Full description"
                rows={4}
              />
              <p className="text-[11px] text-slate-500">Comprehensive product details, feature bullet points, and material specifications.</p>
            </div>

            {/* 14. Short Description */}
            <div className="flex flex-col space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Short Description
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Generated
                </span>
              </div>
              <textarea
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-sans"
                placeholder="Short description"
                rows={2}
              />
              <p className="text-[11px] text-slate-500">Brief summary tagline shown on product cards.</p>
            </div>

            {/* 15. Keywords */}
            <div className="flex flex-col space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Keywords (Comma-Separated)
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Generated
                </span>
              </div>
              <input
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-sans"
                placeholder="Keywords (comma-separated)"
              />
              <p className="text-[11px] text-slate-500">Keywords used by AI search to help customers find your product.</p>
            </div>

            {/* 16. Size Types & Variants */}
            <div className="flex flex-col space-y-4 md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Size Type
                </label>
                <select
                  value={form.sizeType}
                  onChange={(e) => {
                    setForm({ ...form, sizeType: e.target.value, variants: [] });
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                >
                  <option value="">No Sizes (Default)</option>
                  <option value="clothing">Clothing Size (XS - XXXL)</option>
                  <option value="waist">Waist Size (28 - 40)</option>
                  <option value="shoe">Shoe Size (39 - 45)</option>
                  <option value="kids">Kids Size (2Y - 12Y)</option>
                  <option value="universal">Universal (One Size / Free Size)</option>
                </select>
                <p className="text-[11px] text-slate-500">Select a standard size category for this product.</p>
              </div>

              {form.sizeType && (
                <div className="flex flex-col space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Product Variants
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newVariants = [...form.variants, { size: "", color: "", quantity: 0 }];
                        setForm({ ...form, variants: newVariants });
                      }}
                      className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all"
                    >
                      + Add Variant
                    </button>
                  </div>
                  
                  {form.variants.length === 0 ? (
                    <div className="text-center py-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm">
                      No variants added. Add a variant to specify stock per size/color.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {form.variants.map((variant: any, idx: number) => {
                        let sizeOptions = [];
                        if (form.sizeType === "clothing") sizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
                        else if (form.sizeType === "waist") sizeOptions = ["28", "30", "32", "34", "36", "38", "40"];
                        else if (form.sizeType === "shoe") sizeOptions = ["39", "40", "41", "42", "43", "44", "45"];
                        else if (form.sizeType === "kids") sizeOptions = ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-12Y"];
                        else if (form.sizeType === "universal") sizeOptions = ["One Size", "Free Size"];
                        else sizeOptions = [];

                        return (
                          <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <select
                              value={variant.size}
                              onChange={(e) => {
                                const newVariants = [...form.variants];
                                newVariants[idx].size = e.target.value;
                                setForm({ ...form, variants: newVariants });
                              }}
                              className="flex-1 min-w-[100px] rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm dark:bg-slate-700 dark:text-white"
                            >
                              <option value="">Select Size *</option>
                              {sizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            
                            <input
                              placeholder="Color (Optional)"
                              value={variant.color}
                              onChange={(e) => {
                                const newVariants = [...form.variants];
                                newVariants[idx].color = e.target.value;
                                setForm({ ...form, variants: newVariants });
                              }}
                              className="flex-1 min-w-[100px] rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm dark:bg-slate-700 dark:text-white"
                            />
                            
                            <input
                              type="number"
                              min="0"
                              placeholder="Qty"
                              value={variant.quantity === 0 && !variant.size ? "" : variant.quantity}
                              onChange={(e) => {
                                const newVariants = [...form.variants];
                                newVariants[idx].quantity = Number(e.target.value);
                                setForm({ ...form, variants: newVariants });
                              }}
                              className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm dark:bg-slate-700 dark:text-white"
                            />
                            
                            <button
                              type="button"
                              onClick={() => {
                                const newVariants = form.variants.filter((_: any, i: number) => i !== idx);
                                setForm({ ...form, variants: newVariants });
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-2">
                    Total stock quantity will be automatically calculated based on your variants if provided.
                  </p>
                </div>
              )}
            </div>

          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setImageFile(null);
              }}
              className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                editingProductId ? "Save Changes" : "Create Product"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Products List */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">All Products</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Search products by title, SKU..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              {productSearchQuery && (
                <button onClick={() => setProductSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {(() => {
          const filtered = (sellerProducts || []).filter((p: any) => {
            const matchesSearch = !productSearchQuery ||
              (p.name && p.name.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
              (p.sku && p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
              (p.categoryName && p.categoryName.toLowerCase().includes(productSearchQuery.toLowerCase()));
            const matchesStatus = productStatusFilter === "all" || p.status === productStatusFilter;
            return matchesSearch && matchesStatus;
          });

          if (filtered.length > 0) {
            return (
              <div className="space-y-3">
                {filtered.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-700 dark:bg-slate-700/50"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">{product.name}</p>
                      <p className="text-sm text-slate-500">
                        {product.categoryName} • Stock: {product.quantity ?? 0} • SKU: {product.sku || "N/A"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        product.status === "active"
                          ? "bg-green-100 text-green-700"
                          : product.status === "draft"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {product.status}
                      </span>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        {formatCurrency(product.price || 0)}
                      </span>
                      <button
                        onClick={() => startEdit(product)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProduct.mutate({ productId: product.id })}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No products match your search or status filter criteria.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// Inventory Section
function InventorySection({ sellerProducts, lowStock, inventoryValue, inventoryForm, setInventoryForm, onAdjustInventory, isAdjusting }: any) {
  const totalItems = sellerProducts?.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 0;
  const outOfStockCount = (sellerProducts || []).filter((p: any) => (p.quantity || 0) <= 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Boxes className="h-5 w-5" />}
          label="Total Items"
          value={totalItems}
          color="indigo"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Low Stock Items"
          value={lowStock?.length || 0}
          alert={lowStock && lowStock.length > 0}
          color="amber"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Value"
          value={formatCurrency(inventoryValue)}
          color="green"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Inventory Actions</h2>
            <p className="text-sm text-slate-500">Adjust stock in real time, set replenishment thresholds, and track warehouse locations.</p>
          </div>
          <div className="text-sm text-slate-500">{outOfStockCount} out of stock</div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.7fr_0.8fr_1.2fr_auto]">
          <select
            value={inventoryForm.productId}
            onChange={(e) => setInventoryForm({ ...inventoryForm, productId: e.target.value })}
            className="rounded-lg border border-slate-200 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            <option value="">Select product</option>
            {(sellerProducts || []).map((product: any) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={inventoryForm.delta}
            onChange={(e) => setInventoryForm({ ...inventoryForm, delta: e.target.value })}
            className="rounded-lg border border-slate-200 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            placeholder="Delta"
          />
          <input
            type="number"
            min="0"
            value={inventoryForm.threshold}
            onChange={(e) => setInventoryForm({ ...inventoryForm, threshold: e.target.value })}
            className="rounded-lg border border-slate-200 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            placeholder="Threshold"
          />
          <input
            value={inventoryForm.warehouseLocation}
            onChange={(e) => setInventoryForm({ ...inventoryForm, warehouseLocation: e.target.value })}
            className="rounded-lg border border-slate-200 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            placeholder="Warehouse location"
          />
          <button
            onClick={() => onAdjustInventory()}
            disabled={!inventoryForm.productId || isAdjusting}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isAdjusting ? "Saving..." : "Apply"}
          </button>
        </div>
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-orange-800 dark:text-orange-200">Low Stock Alert</h3>
          </div>
          <div className="space-y-2">
            {lowStock.map((item: any) => (
              <div
                key={item.productId}
                className="flex items-center justify-between py-2 border-b border-orange-100 dark:border-orange-800/50 last:border-0"
              >
                <span className="text-sm text-orange-700 dark:text-orange-300">{item.productName}</span>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  item.status === "out_of_stock"
                    ? "bg-red-100 text-red-700"
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {item.currentStock} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Inventory Details</h2>
        {sellerProducts && sellerProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 font-semibold text-slate-600 dark:text-slate-400">Product</th>
                  <th className="text-left py-3 font-semibold text-slate-600 dark:text-slate-400">SKU</th>
                  <th className="text-right py-3 font-semibold text-slate-600 dark:text-slate-400">Stock</th>
                  <th className="text-right py-3 font-semibold text-slate-600 dark:text-slate-400">Threshold</th>
                  <th className="text-left py-3 font-semibold text-slate-600 dark:text-slate-400">Location</th>
                  <th className="text-center py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-right py-3 font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {sellerProducts.map((product: any) => {
                  const stockStatus = getInventoryStatus(product.quantity, product.lowStockThreshold ?? 5);
                  return (
                    <tr key={product.id}>
                      <td className="py-3 text-slate-900 dark:text-white font-medium">{product.name}</td>
                      <td className="py-3 text-slate-500">{product.sku || "-"}</td>
                      <td className="py-3 text-right text-slate-900 dark:text-white font-medium">{product.quantity || 0}</td>
                      <td className="py-3 text-right text-slate-500">{product.lowStockThreshold ?? 5}</td>
                      <td className="py-3 text-slate-500">{product.warehouseLocation || "Unassigned"}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          stockStatus.tone === "green"
                            ? "bg-green-100 text-green-700"
                            : stockStatus.tone === "amber"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setInventoryForm({
                              productId: String(product.id),
                              delta: "1",
                              threshold: String(product.lowStockThreshold ?? 5),
                              warehouseLocation: product.warehouseLocation || "",
                            })}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
                          >
                            Quick edit
                          </button>
                          <button
                            onClick={() => onAdjustInventory(product.id, 10, product.lowStockThreshold ?? 5, product.warehouseLocation || "")}
                            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                          >
                            Restock +10
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">No inventory data</p>
        )}
      </div>
    </div>
  );
}

// Orders Section
function OrdersSection({ sellerOrders }: any) {
  const [handoverOrderId, setHandoverOrderId] = useState<number | null>(null);
  const [courierNameInput, setCourierNameInput] = useState("Pathao Express");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderEditDraft, setOrderEditDraft] = useState({ orderId: 0, fullName: "", address: "", district: "", postalCode: "", landmark: "" });
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isOrderEditSubmitting, setIsOrderEditSubmitting] = useState(false);
  const bangladeshDistricts = ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Jamalpur", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Mymensingh", "Narayanganj", "Narsingdi", "Netrokona", "Rajbari", "Shariatpur", "Sherpur", "Tangail", "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Rajshahi", "Sirajganj", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon", "Bagerhat", "Chuadanga", "Jessore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur", "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati", "Habiganj", "Maulvibazar", "Sunamganj", "Sylhet", "Narshingdi", "Barguna"];
  const utils = trpc.useUtils();

  const updateOrderShippingDetails = trpc.seller.updateOrderShippingDetails.useMutation({
    onSuccess: () => {
      toast.success("Order delivery details updated successfully.");
      setEditingOrderId(null);
      setOrderEditDraft({ orderId: 0, fullName: "", address: "", district: "", postalCode: "", landmark: "" });
      setIsOrderEditSubmitting(false);
      utils.seller.getOrders.invalidate();
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
      editedBy: "Seller",
    });
  };

  const acceptOrderMutation = trpc.seller.acceptOrder.useMutation({
    onSuccess: () => {
      toast.success("Order accepted successfully!");
      utils.seller.invalidate();
      broadcastLiveEvent("ORDER_STATUS_CHANGED");
      broadcastLiveEvent("NOTIFICATION_CREATED");
    },
    onError: (err) => toast.error(err.message || "Failed to accept order"),
  });

  const denyOrderMutation = trpc.seller.denyOrder.useMutation({
    onSuccess: (data: any) => {
      if (data?.isPrepaid) {
        toast.success(`Order cancelled & full refund issued to customer! (Ref: ${data?.refundRef})`);
      } else {
        toast.success("Order denied & customer notified");
      }
      utils.seller.invalidate();
      broadcastLiveEvent("ORDER_STATUS_CHANGED");
      broadcastLiveEvent("NOTIFICATION_CREATED");
    },
    onError: (err) => toast.error(err.message || "Failed to deny order"),
  });

  const handoverOrderMutation = trpc.seller.handoverOrder.useMutation({
    onSuccess: () => {
      toast.success("Package handed over to courier for delivery!");
      setHandoverOrderId(null);
      setTrackingNumberInput("");
      utils.seller.invalidate();
      broadcastLiveEvent("ORDER_STATUS_CHANGED");
      broadcastLiveEvent("NOTIFICATION_CREATED");
    },
    onError: (err) => toast.error(err.message || "Failed to submit handover"),
  });

  const targetHandoverOrder = sellerOrders?.find((o: any) => o.id === handoverOrderId);

  const stats = {
    pending: sellerOrders?.filter((o: any) => o.sellerStatus === "pending" || o.status === "pending").length || 0,
    accepted: sellerOrders?.filter((o: any) => o.sellerStatus === "accepted" || o.status === "processing").length || 0,
    shipped: sellerOrders?.filter((o: any) => o.sellerStatus === "handed_over" || o.status === "shipped").length || 0,
    delivered: sellerOrders?.filter((o: any) => o.status === "delivered").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Order Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Pending Accept" value={stats.pending} color="amber" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Accepted Orders" value={stats.accepted} color="blue" />
        <StatCard icon={<Package className="h-5 w-5" />} label="Handed to Courier" value={stats.shipped} color="indigo" />
        <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Delivered" value={stats.delivered} color="green" />
      </div>

      {/* Orders List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Customer Orders & Fulfillment Queue</h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search orders by Order #, recipient, city..."
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
                <option value="all">All Statuses</option>
                <option value="pending">Pending Accept</option>
                <option value="accepted">Accepted / Processing</option>
                <option value="handed_over">Handed to Courier</option>
                <option value="delivered">Delivered</option>
                <option value="denied">Denied / Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {(() => {
          const filtered = (sellerOrders || []).filter((order: any) => {
            const matchesSearch = !orderSearchQuery ||
              (order.orderNumber && order.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase())) ||
              (order.shippingCity && order.shippingCity.toLowerCase().includes(orderSearchQuery.toLowerCase())) ||
              (order.shippingAddress && order.shippingAddress.toLowerCase().includes(orderSearchQuery.toLowerCase())) ||
              (String(order.id).includes(orderSearchQuery));
            const matchesStatus = orderStatusFilter === "all" ||
              order.sellerStatus === orderStatusFilter ||
              order.status === orderStatusFilter ||
              (orderStatusFilter === "accepted" && (order.sellerStatus === "accepted" || order.status === "processing")) ||
              (orderStatusFilter === "denied" && (order.sellerStatus === "denied" || order.status === "cancelled"));
            return matchesSearch && matchesStatus;
          });

          if (filtered.length > 0) {
            return (
              <div className="space-y-4">
                {filtered.map((order: any) => {
                  const isPending = order.sellerStatus === "pending" && order.status !== "cancelled" && order.status !== "processing";
                  const isAccepted = (order.sellerStatus === "accepted" || order.status === "processing") && order.sellerStatus !== "handed_over" && order.sellerStatus !== "denied" && order.status !== "cancelled";
                  const isHandedOver = order.sellerStatus === "handed_over" || order.status === "shipped";
                  const isDelivered = order.status === "delivered";
                  const isCancelled = order.sellerStatus === "denied" || order.status === "cancelled";
                  const canHandover = (order.sellerStatus === "accepted" || order.status === "processing") && !isHandedOver && !isCancelled && !isDelivered;

                  return (
                    <div
                      key={order.id}
                      className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 space-y-4 shadow-sm hover:border-slate-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">{order.orderNumber}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              isDelivered ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                              isHandedOver ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" :
                              isAccepted ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" :
                              isCancelled ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" :
                              "bg-amber-100 text-amber-700 animate-pulse dark:bg-amber-950/40 dark:text-amber-300"
                            }`}>
                              Seller: {order.sellerStatus || "pending"}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.status === "delivered" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                              order.status === "shipped" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" :
                              order.status === "processing" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" :
                              order.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" :
                              "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}>
                              Order: {order.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              order.paymentStatus === "refunded" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" :
                              order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                              "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}>
                              {order.paymentStatus === "refunded" ? "💰 Refunded" : order.paymentStatus || "pending"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Shipping to: <strong className="text-slate-700 dark:text-slate-300">{order.shippingAddress}, {order.shippingCity}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => acceptOrderMutation.mutate({ orderId: order.id })}
                                disabled={acceptOrderMutation.isPending}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                              >
                                {acceptOrderMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                Accept Order
                              </button>
                              <button
                                onClick={() => denyOrderMutation.mutate({ orderId: order.id, reason: "Out of stock" })}
                                disabled={denyOrderMutation.isPending}
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Deny
                              </button>
                            </div>
                          )}

                          {(isAccepted || canHandover) && (
                            <button
                              onClick={() => {
                                setHandoverOrderId(order.id);
                                setCourierNameInput(order.courierName || "Pathao Express");
                                setTrackingNumberInput(order.trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`);
                              }}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                              <Package className="w-3.5 h-3.5" />
                              Handover for Delivery
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingOrderId(order.id);
                              setOrderEditDraft({
                                orderId: order.id,
                                fullName: order.shippingFullName || "",
                                address: order.shippingAddress || "",
                                district: order.shippingDistrict || order.shippingCity || "",
                                postalCode: order.shippingPostalCode || "",
                                landmark: order.shippingLandmark || "",
                              });
                            }}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold"
                          >
                            Edit Order
                          </button>

                          {isHandedOver && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                              <Truck className="w-3.5 h-3.5" />
                              Dispatched ({order.courierName || "Pathao Express"})
                            </span>
                          )}

                          {isDelivered && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Delivered to Customer
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <img src={item.imageUrl || ""} alt={item.productName} className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{item.productName}</p>
                              <p className="text-xs text-slate-500">Qty: {item.quantity} x {formatCurrency(item.unitPrice)}</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(item.totalPrice)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <div>
                          {order.trackingNumber && (
                            <span>Tracking: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{order.trackingNumber}</strong></span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          Total: {formatCurrency(order.totalAmount)}
                        </p>
                      </div>

                      {(order.lastEditedBy || order.lastEditedAt) && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                          Last edited by {order.lastEditedBy || "system"} on {order.lastEditedAt ? new Date(order.lastEditedAt).toLocaleString() : "recently"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <p className="text-sm text-slate-500 text-center py-8">No orders match your search or status filter criteria.</p>
          );
        })()}
      </div>

      {editingOrderId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Order Delivery Details</h3>
                <p className="text-xs text-slate-500">Fill in the missing full address for this order.</p>
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

      {/* Handover for Delivery Modal */}
      {handoverOrderId !== null && targetHandoverOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Handover Order for Delivery</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">{targetHandoverOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setHandoverOrderId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-right">{targetHandoverOrder.shippingAddress}, {targetHandoverOrder.shippingCity}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Items:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{targetHandoverOrder.items?.length || 1} product(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Value:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(targetHandoverOrder.totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Courier Partner Service
                </label>
                <select
                  value={courierNameInput}
                  onChange={(e) => setCourierNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Pathao Express">Pathao Express (Recommended - Same/Next Day)</option>
                  <option value="Steadfast Courier">Steadfast Courier (Nationwide Coverage)</option>
                  <option value="RedX Delivery">RedX Delivery (Reliable Hub-to-Hub)</option>
                  <option value="Paperfly">Paperfly Doorstep Logistics</option>
                  <option value="eCourier">eCourier Intelligent Logistics</option>
                  <option value="Sundarban Courier">Sundarban Courier Service</option>
                  <option value="SA Paribahan">SA Paribahan Parcel</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                    Tracking / Consignment Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setTrackingNumberInput(`TRK-${Math.floor(100000 + Math.random() * 900000)}`)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Regenerate Code
                  </button>
                </div>
                <input
                  type="text"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  placeholder="e.g. TRK-849201"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This tracking code is sent directly to the customer dashboard & SMS/notification for package tracking.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setHandoverOrderId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={handoverOrderMutation.isPending || !trackingNumberInput.trim()}
                onClick={() => {
                  handoverOrderMutation.mutate({
                    orderId: handoverOrderId,
                    courierName: courierNameInput,
                    trackingNumber: trackingNumberInput.trim(),
                  });
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {handoverOrderMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                Confirm & Dispatch to Courier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Analytics Section
function AnalyticsSection({ dashboard }: any) {
  const chartData = dashboard?.monthlySales?.map((m: any) => ({
    name: m.month,
    sales: m.total || 0,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/20 dark:border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 z-0" />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sales Analytics</h2>
              <p className="text-slate-500 text-sm mt-1">Detailed breakdown of your monthly revenue</p>
            </div>
            
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 font-bold text-sm transition-all active:scale-95"
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>

          {chartData.length > 0 ? (
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Monthly Revenue Overview
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.2} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900/90 text-white backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-xl">
                              <p className="text-slate-400 text-xs font-bold uppercase mb-1">{payload[0].payload.name}</p>
                              <p className="text-xl font-black">{formatCurrency(payload[0].value)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="sales" 
                      fill="url(#colorSales)" 
                      radius={[6, 6, 6, 6]}
                      barSize={40}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No analytics data available yet</p>
              <p className="text-slate-400 text-sm mt-1">Check back later once you start receiving orders.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Payouts Section
function PayoutsSection({ dashboard }: any) {
  const { data: payouts, refetch } = trpc.seller.listPayouts.useQuery();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: "1000", paymentMethod: "bkash" as "bank" | "bkash" | "nagad", accountDetails: "" });

  const requestPayout = trpc.seller.requestPayout.useMutation({
    onSuccess: () => {
      toast.success("Payout request submitted successfully!");
      setShowRequestModal(false);
      setPayoutForm({ amount: "1000", paymentMethod: "bkash", accountDetails: "" });
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit payout request");
    },
  });

  const payoutList = payouts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Earnings & Withdrawals</h2>
        <button
          onClick={() => setShowRequestModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm"
        >
          <DollarSign className="h-4 w-4" />
          Request Payout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Revenue"
          value={formatCurrency(dashboard?.stats?.totalRevenue || 0)}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Payout Requests"
          value={payoutList.length}
          color="amber"
        />
        <StatCard
          icon={<ShoppingBag className="h-5 w-5" />}
          label="Approved Payouts"
          value={formatCurrency(payoutList.filter((p: any) => p.status === "approved").reduce((sum: number, p: any) => sum + Number(p.amount), 0))}
          color="indigo"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Payout Request History</h3>
        <div className="space-y-3">
          {payoutList.length > 0 ? payoutList.map((payout: any) => (
            <div key={payout.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white uppercase">{payout.paymentMethod} Transfer</p>
                <p className="text-xs text-slate-500">{payout.accountDetails}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  payout.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                  payout.status === "rejected" ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {payout.status}
                </span>
                <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(payout.amount)}</p>
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-500 py-4 text-center">No payout requests submitted yet.</p>
          )}
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Revenue Withdrawal</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Withdrawal Amount (BDT)</label>
              <input
                type="number"
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                placeholder="Min 100 BDT"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
              <select
                value={payoutForm.paymentMethod}
                onChange={(e) => setPayoutForm({ ...payoutForm, paymentMethod: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              >
                <option value="bkash">bKash Merchant</option>
                <option value="nagad">Nagad Personal/Agent</option>
                <option value="bank">Direct Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Account Number / Bank IBAN</label>
              <input
                type="text"
                value={payoutForm.accountDetails}
                onChange={(e) => setPayoutForm({ ...payoutForm, accountDetails: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                placeholder="017XXXXXXXX or Account # & Bank Name"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button
                onClick={() => requestPayout.mutate({ amount: Number(payoutForm.amount), paymentMethod: payoutForm.paymentMethod, accountDetails: payoutForm.accountDetails })}
                disabled={requestPayout.isPending || !payoutForm.accountDetails}
                className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {requestPayout.isPending ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reviews Section
function ReviewsSection({ reviews }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  const reviewList = reviews || [];
  const averageRating = reviewList.length
    ? reviewList.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / reviewList.length
    : 0;
  const positive = reviewList.filter((review: any) => (review.rating || 0) >= 4).length;
  const neutral = reviewList.filter((review: any) => (review.rating || 0) === 3).length;
  const negative = reviewList.filter((review: any) => (review.rating || 0) <= 2).length;

  const filtered = reviewList.filter((review: any) => {
    const matchesSearch = !searchQuery ||
      (review.customerName && review.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (review.productName && review.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (review.comment && review.comment.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRating = ratingFilter === "all" || String(review.rating) === ratingFilter;
    return matchesSearch && matchesRating;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Star className="h-5 w-5" />} label="Avg Rating" value={averageRating.toFixed(1)} color="amber" />
        <StatCard icon={<ThumbsUp className="h-5 w-5" />} label="Positive" value={positive} color="green" />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Neutral" value={neutral} color="slate" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Negative" value={negative} color="red" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Reviews</h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews by customer, product..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.length > 0 ? filtered.map((review: any) => (
            <div key={review.id} className="py-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{review.customerName || "Customer"}</p>
                  <p className="text-xs text-slate-500">{review.productName || "Product"}</p>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < (review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{review.comment || review.title || "No comment provided"}</p>
            </div>
          )) : (
            <p className="text-sm text-slate-500 py-4 text-center">No reviews match your search or rating filter criteria.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Customers Section
function CustomersSection({ sellerOrders, customers }: any) {
  const customerList = customers || [];
  const uniqueCustomers = customerList.length;
  const repeatCustomers = customerList.filter((customer: any) => customer.totalOrders > 1).length;
  const totalRevenue = customerList.reduce((sum: number, customer: any) => sum + Number(customer.totalSpent || 0), 0);
  const avgOrderValue = uniqueCustomers > 0 ? totalRevenue / Math.max(sellerOrders?.length || 1, 1) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Customers" value={uniqueCustomers} color="indigo" />
        <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Repeat Customers" value={repeatCustomers} color="purple" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Avg Order Value" value={formatCurrency(avgOrderValue)} color="green" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Customer Insights</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Orders</span>
            <span className="font-bold text-slate-900 dark:text-white">{sellerOrders?.length || 0}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-600 dark:text-slate-400">Avg Customer LTV</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Messages Section — Messenger-style 2-Column Split Chat Face (Grouped by Customer)
function MessagesSection({ messages: _initialMessages }: any) {
  const { data: messages, refetch } = trpc.seller.listMessages.useQuery(undefined, {
    refetchInterval: 2000,
  });
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "replied">("all");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const replyMutation = trpc.seller.replyMessage.useMutation({
    onSuccess: () => {
      toast.success("Reply sent to customer!");
      setReplyText("");
      refetch();
      broadcastLiveEvent("SUPPORT_TICKET");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send reply");
    },
  });

  const allMsgs = messages || [];

  // Group all raw messages by unique customer/person
  const conversations = useMemo(() => {
    const map = new Map<string, {
      key: string;
      customerId?: number | null;
      customerName: string;
      customerEmail: string;
      messages: any[];
      latestMessage: any;
      latestCreatedAt: string | Date | number;
      unreadCount: number;
      isReplied: boolean;
      productSubjects: string[];
    }>();

    for (const msg of allMsgs) {
      const key = msg.customerId
        ? `cust_${msg.customerId}`
        : msg.customerEmail
        ? `email_${msg.customerEmail.toLowerCase().trim()}`
        : msg.customerName
        ? `name_${msg.customerName.toLowerCase().trim()}`
        : `msg_${msg.id}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          customerId: msg.customerId,
          customerName: msg.customerName || "Customer",
          customerEmail: msg.customerEmail || "Direct Buyer",
          messages: [],
          latestMessage: msg,
          latestCreatedAt: msg.createdAt || 0,
          unreadCount: 0,
          isReplied: true,
          productSubjects: [],
        });
      }

      const conv = map.get(key)!;
      conv.messages.push(msg);

      const subjectLabel = msg.subject || msg.productName;
      if (subjectLabel && !conv.productSubjects.includes(subjectLabel)) {
        conv.productSubjects.push(subjectLabel);
      }

      if (msg.status === "unread" || !msg.reply) {
        conv.unreadCount += 1;
        conv.isReplied = false;
      }

      const msgTime = new Date(msg.createdAt || 0).getTime();
      const convTime = new Date(conv.latestCreatedAt || 0).getTime();
      if (msgTime >= convTime) {
        conv.latestMessage = msg;
        conv.latestCreatedAt = msg.createdAt;
      }
    }

    // Sort messages in each conversation chronologically (oldest to newest for chat timeline)
    const list = Array.from(map.values()).map((conv) => ({
      ...conv,
      messages: [...conv.messages].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      ),
      isReplied: conv.unreadCount === 0,
    }));

    // Sort people by most recent message on top
    return list.sort(
      (a, b) => new Date(b.latestCreatedAt || 0).getTime() - new Date(a.latestCreatedAt || 0).getTime()
    );
  }, [allMsgs]);

  const totalConversationsCount = conversations.length;
  const awaitingReplyCount = conversations.filter((c) => c.unreadCount > 0).length;
  const repliedConversationsCount = conversations.filter((c) => c.unreadCount === 0).length;

  // Filter conversations list by search & status
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        conv.customerName.toLowerCase().includes(q) ||
        conv.customerEmail.toLowerCase().includes(q) ||
        conv.productSubjects.some((s) => s.toLowerCase().includes(q)) ||
        conv.messages.some(
          (m) =>
            (m.subject && m.subject.toLowerCase().includes(q)) ||
            (m.message && m.message.toLowerCase().includes(q)) ||
            (m.reply && m.reply.toLowerCase().includes(q))
        );

      if (statusFilter === "unread") {
        return matchesSearch && conv.unreadCount > 0;
      }
      if (statusFilter === "replied") {
        return matchesSearch && conv.unreadCount === 0;
      }
      return matchesSearch;
    });
  }, [conversations, searchQuery, statusFilter]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedUserKey && filteredConversations.length > 0) {
      const firstUnread = filteredConversations.find((c) => c.unreadCount > 0);
      setSelectedUserKey(firstUnread ? firstUnread.key : filteredConversations[0].key);
    }
  }, [filteredConversations, selectedUserKey]);

  // Selected conversation data
  const selectedConversation =
    conversations.find((c) => c.key === selectedUserKey) ||
    filteredConversations[0] ||
    null;

  // Scroll to bottom of chat on new message or user select
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedUserKey, selectedConversation?.messages, replyMutation.isPending]);

  const handleSelectUser = (key: string) => {
    setSelectedUserKey(key);
    setIsMobileChatOpen(true);
  };

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConversation || !replyText.trim()) return;

    // Pick the most recent message that hasn't been replied to, or the latest message
    const pendingMsg =
      selectedConversation.messages.filter((m) => !m.reply).slice(-1)[0] ||
      selectedConversation.latestMessage;

    if (!pendingMsg) return;

    replyMutation.mutate({
      messageId: pendingMsg.id,
      reply: replyText.trim(),
    });
  };

  const quickReplies = [
    "Yes, this item is available in stock and ready to ship!",
    "We deliver nationwide across Bangladesh within 24-48 hours.",
    "Cash on delivery is available for this product.",
    "Please check the product description for size specifications.",
    "Thank you for reaching out! Let us know if you need anything else.",
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Customers</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalConversationsCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Awaiting Response</p>
              {awaitingReplyCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
            </div>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{awaitingReplyCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Replied & Solved</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{repliedConversationsCount}</p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Messenger Chat App Container */}
      <div className="bg-white dark:bg-slate-800/95 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[620px] max-h-[780px]">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: Unique People & Conversations List                      */}
        {/* ==================================================================== */}
        <div
          className={`w-full md:w-[340px] lg:w-[380px] border-r border-slate-200/80 dark:border-slate-700/80 flex flex-col bg-slate-50/50 dark:bg-slate-900/40 shrink-0 ${
            isMobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Left Header & Search */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 space-y-3 bg-white dark:bg-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Chats</h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people, messages..."
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

            {/* Filter Pills */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex-1 py-1 text-center font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setStatusFilter("unread")}
                className={`flex-1 py-1 text-center font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  statusFilter === "unread"
                    ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {awaitingReplyCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                Unread ({awaitingReplyCount})
              </button>
              <button
                onClick={() => setStatusFilter("replied")}
                className={`flex-1 py-1 text-center font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === "replied"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Replied ({repliedConversationsCount})
              </button>
            </div>
          </div>

          {/* Unique People Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.key === conv.key;
                const isReplied = conv.unreadCount === 0;
                const initial = (conv.customerName || "C").charAt(0).toUpperCase();
                const latestMsg = conv.latestMessage;

                return (
                  <button
                    key={conv.key}
                    onClick={() => handleSelectUser(conv.key)}
                    className={`w-full text-left p-4 transition-all duration-150 flex items-start gap-3.5 cursor-pointer relative ${
                      isSelected
                        ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-l-4 border-indigo-600"
                        : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {/* User Avatar with Online Dot */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                        {initial}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                    </div>

                    {/* Person Summary */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${isSelected ? "font-extrabold text-indigo-950 dark:text-white" : "font-bold text-slate-900 dark:text-white"}`}>
                          {conv.customerName}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {conv.latestCreatedAt ? new Date(conv.latestCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                        {conv.productSubjects[0] || latestMsg?.subject || "Product Inquiry"}
                        {conv.productSubjects.length > 1 && (
                          <span className="text-slate-400 font-normal ml-1">+{conv.productSubjects.length - 1} more</span>
                        )}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {latestMsg?.reply ? (
                          <span className="text-slate-600 dark:text-slate-300 font-medium">You: {latestMsg.reply}</span>
                        ) : (
                          latestMsg?.message || "Customer inquiry"
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
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                            {conv.unreadCount > 1 ? `${conv.unreadCount} New Questions` : "Awaiting Reply"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Inbox className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold">No chats match your filter</p>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: Messenger-Style Active Chat Face                      */}
        {/* ==================================================================== */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-slate-800 ${
            isMobileChatOpen ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConversation ? (
            <>
              {/* Chat Face Header */}
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 bg-white dark:bg-slate-800/90 shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    title="Back to conversation list"
                  >
                    <ChevronRight className="h-5 w-5 rotate-180" />
                  </button>

                  <div className="relative">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold flex items-center justify-center text-base shadow-md shadow-indigo-500/20 shrink-0">
                      {(selectedConversation.customerName || "C").charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                        {selectedConversation.customerName}
                      </h4>
                      <span className="hidden sm:inline-flex text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedConversation.customerEmail}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {selectedConversation.productSubjects.map((sub, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40"
                        >
                          <Package className="h-3 w-3" />
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      selectedConversation.unreadCount === 0
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                        : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                    }`}
                  >
                    {selectedConversation.unreadCount === 0 ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Replied
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                        {selectedConversation.unreadCount > 1
                          ? `${selectedConversation.unreadCount} Pending`
                          : "Awaiting Reply"}
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/30">
                {/* Date separator */}
                <div className="flex items-center justify-center my-2">
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
                    Conversation History ({selectedConversation.messages.length} messages)
                  </span>
                </div>

                {/* Conversation message bubbles */}
                {selectedConversation.messages.map((msg: any) => (
                  <div key={msg.id} className="space-y-3">
                    {/* Customer Message (Left) */}
                    <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                        {(selectedConversation.customerName || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-3.5 rounded-2xl rounded-bl-sm shadow-sm text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                            {msg.subject || (msg.productName ? `Inquiry: ${msg.productName}` : "Customer Inquiry")}
                          </p>
                          {msg.message}
                        </div>
                        <p className="text-[10px] text-slate-400 pl-1">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "Just now"}
                        </p>
                      </div>
                    </div>

                    {/* Seller Response (Right) */}
                    {msg.reply && (
                      <div className="flex items-end justify-end gap-2.5 max-w-[85%] sm:max-w-[75%] ml-auto">
                        <div className="space-y-1 text-right">
                          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3.5 rounded-2xl rounded-br-sm shadow-md text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-left font-medium">
                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <CornerDownRight className="h-3 w-3" />
                              Store Response
                            </p>
                            {msg.reply}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400 pr-1">
                            <span>Sent</span>
                            <span className="text-indigo-500 font-bold">✓✓</span>
                          </div>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          🏪
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Footer / Live Reply Composer */}
              <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-2.5 shrink-0">
                {/* Quick Reply Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    Quick replies:
                  </span>
                  {quickReplies.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText((prev) => (prev ? `${prev} ${chip}` : chip))}
                      className="text-[11px] font-medium bg-slate-100 dark:bg-slate-700/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input & Send Form */}
                <form onSubmit={handleSendReply} className="flex items-end gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={`Type your message to ${selectedConversation.customerName}... (Press Enter to send)`}
                    rows={2}
                    className="flex-1 p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                  />

                  <button
                    type="submit"
                    disabled={replyMutation.isPending || !replyText.trim()}
                    className="h-11 px-4 sm:px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-95"
                  >
                    {replyMutation.isPending ? (
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
                <MessageSquare className="h-8 w-8" />
              </div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Select a conversation</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose a customer on the left to open their live Messenger chat face and view message history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Settings Section
function SettingsSection({ dashboard: _dashboard, settingsForm, setSettingsForm, onSave, isSaving }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Store Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Store Name</label>
            <input
              type="text"
              value={settingsForm.businessName}
              onChange={(e) => setSettingsForm({ ...settingsForm, businessName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Email</label>
            <input
              type="email"
              value={settingsForm.businessEmail}
              onChange={(e) => setSettingsForm({ ...settingsForm, businessEmail: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Phone</label>
            <input
              type="tel"
              value={settingsForm.businessPhone}
              onChange={(e) => setSettingsForm({ ...settingsForm, businessPhone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Description</label>
            <textarea
              value={settingsForm.description}
              onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              rows={4}
            />
          </div>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Profile Section
function ProfileSection({ dashboard }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Store Profile</h2>
            <p className="text-sm text-slate-500">Your public seller information</p>
          </div>
          <button className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 font-medium text-sm">
            <Pencil className="h-4 w-4 inline mr-2" />
            Edit Profile
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Store Name</p>
              <p className="text-slate-900 dark:text-white font-medium">{dashboard?.seller.businessName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Email</p>
              <p className="text-slate-900 dark:text-white font-medium">{dashboard?.seller.businessEmail}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Phone</p>
              <p className="text-slate-900 dark:text-white font-medium">{dashboard?.seller.businessPhone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Status</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                dashboard?.seller.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {dashboard?.seller.status}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Store Description</p>
            <p className="text-slate-600 dark:text-slate-300">{dashboard?.seller.description || "No description provided"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  trend,
  trendData,
  alert,
  color = "indigo",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendData?: {v: number}[];
  alert?: boolean;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-[#6366F1] text-white",
    amber: "bg-[#EAB308] text-white",
    green: "bg-[#22C55E] text-white",
    purple: "bg-[#8B5CF6] text-white",
    cyan: "bg-[#06B6D4] text-white",
    red: "bg-[#EF4444] text-white",
    blue: "bg-[#3B82F6] text-white",
    slate: "bg-[#64748B] text-white",
    yellow: "bg-[#EAB308] text-white",
    emerald: "bg-[#10B981] text-white",
  };

  const bgClass = alert ? "bg-[#EF4444] text-white" : colorMap[color] || colorMap.indigo;

  return (
    <div className={`${bgClass} rounded-xl shadow-md p-5 flex flex-col justify-between h-[120px] relative overflow-hidden group`}>
      <div className="flex items-center justify-between z-10 relative">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-white/90 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white tracking-tight leading-tight">{value}</p>
            {trend && (
              <span className="text-xs font-medium text-white/80 bg-white/20 px-1.5 py-0.5 rounded-md">
                {trend}
              </span>
            )}
          </div>
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

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">{label}</span>
    </button>
  );
}

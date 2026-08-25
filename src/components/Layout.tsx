import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeContext";
import { trpc } from "@/providers/trpc";
import { getGuestCartCount } from "@/lib/guestCart";
import { formatCurrency } from "@/lib/currency";
import { VoiceAssistant } from "./VoiceAssistant";
import {
  ShoppingCart,
  Search,
  User,
  Menu,
  X,
  Heart,
  Mic,
  Store,
  Bell,
  Sun,
  Moon,
  Headphones,
  LogOut,
  ChevronDown,
  Shield,
  Loader2,
  MessageSquare,
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  // Full-screen dashboard routes — no header/footer
  const isDashboardRoute = location.pathname === "/seller" ||
    location.pathname === "/admin" ||
    location.pathname.startsWith("/seller/") ||
    location.pathname.startsWith("/admin/");
    
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup";

  const { data: cartData } = trpc.cart.get.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 2500,
  });
  const [guestCartCount, setGuestCartCount] = useState(0);
  const cartCount = isAuthenticated ? cartData?.itemCount ?? 0 : guestCartCount;
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const { data: searchResultData, isLoading: isSearchLoading } = trpc.product.list.useQuery(
    { search: searchQuery, limit: 6 },
    { enabled: searchOpen && searchQuery.trim().length > 0 }
  );

  const { data: unreadCount, refetch: refetchUnreadCount } = trpc.notification.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 2000,
  });

  const { data: notificationsList, refetch: refetchNotifications } = trpc.notification.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 2000,
  });

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    },
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    },
  });

  useEffect(() => {
    const updateGuestCart = () => setGuestCartCount(getGuestCartCount());
    updateGuestCart();
    window.addEventListener("guest-cart-updated", updateGuestCart);
    return () => window.removeEventListener("guest-cart-updated", updateGuestCart);
  }, [isAuthenticated]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const searchModalRef = useRef<HTMLDivElement>(null);

  // Close search on Escape key or clicking outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchModalRef.current && !searchModalRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };

    if (searchOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchOpen]);

  // Close search bar, mobile menu, and notification dropdown automatically on page navigation
  useEffect(() => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setNotifDropdownOpen(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Categories", path: "/categories" },
    { label: "Products", path: "/products" },
    { label: "Sellers", path: "/sellers" },
    { label: "Clevora AI", path: "/fashion-stylist" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    setSearchOpen(false);
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={isDashboardRoute ? "h-screen flex flex-col overflow-hidden" : "min-h-screen flex flex-col"}>
      {/* Top Announcement Bar */}
      {!isAuthRoute && (
        <div className="bg-[#5438DC] text-white text-center text-xs py-2.5 px-4 font-medium tracking-wide">
          <span>
            Free shipping on orders over BDT 5,000 | AI-Powered Recommendations | Voice Navigation Available
          </span>
        </div>
      )}

      {/* Header */}
      {!isAuthRoute && (
        <header
          className={`sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 transition-all ${
            scrolled ? "shadow-md" : ""
          }`}
        >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              onClick={() => handleNavClick("/")}
              className="flex items-center gap-2.5 shrink-0"
              aria-label="MarketVerse Home"
            >
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
                <Store className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">
                MarketVerse
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Main navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    isActive(link.path)
                      ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  aria-current={isActive(link.path) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Search Toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle search"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Notifications Dropdown for All User Roles */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount ? (
                      <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    ) : null}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          {unreadCount ? (
                            <button
                              onClick={() => markAllReadMutation.mutate()}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              Mark all read
                            </button>
                          ) : null}
                          <button
                            onClick={() => {
                              setNotifDropdownOpen(false);
                              navigate("/notifications");
                            }}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            View All
                          </button>
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
                        {(!notificationsList || notificationsList.length === 0) ? (
                          <p className="text-xs text-center text-slate-400 py-6">No notifications yet.</p>
                        ) : (
                          notificationsList.map((notif: any) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (!notif.isRead) markReadMutation.mutate({ id: notif.id });
                                setNotifDropdownOpen(false);
                                if (notif.link) {
                                  navigate(notif.link);
                                }
                              }}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                                !notif.isRead
                                  ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60"
                                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-800"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="text-base leading-none">
                                  {notif.type === "order" ? "🛒" : notif.type === "seller" ? "🏪" : notif.type === "user" ? "👤" : notif.type === "ticket" ? "🚨" : "🔔"}
                                </span>
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">{notif.title}</p>
                                  {notif.message && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                                  )}
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                    {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Wishlist */}
              <button
                onClick={() => navigate("/wishlist")}
                className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </button>

              {/* Cart */}
              <button
                onClick={() => navigate("/cart")}
                className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5438DC] text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
                aria-label={`Shopping cart, ${cartCount} items`}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Cart</span>
                <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow">
                  {cartCount}
                </span>
              </button>

              {/* User Profile / Dashboard dropdown */}
              {isAuthenticated && user ? (
                <div className="relative group">
                  <button
                    onClick={() => {
                      const target = (user as any)?.role === "seller"
                        ? "/seller"
                        : (user as any)?.role === "admin"
                        ? "/admin"
                        : "/dashboard";
                      navigate(target);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 dark:bg-slate-800 text-white text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {(user as any)?.role === "seller"
                        ? "Seller Dashboard"
                        : (user as any)?.role === "admin"
                        ? "Admin Panel"
                        : "Dashboard"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>

                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-slate-100 dark:border-slate-700 flex flex-col py-2">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{(user as any).name}</p>
                      <p className="text-xs text-slate-500 truncate">{(user as any).email}</p>
                    </div>

                    <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <User className="h-4 w-4" />
                      User Dashboard
                    </Link>

                    <Link to="/dashboard?tab=messages" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <MessageSquare className="h-4 w-4 text-indigo-500" />
                      Seller Chats
                    </Link>

                    {((user as any).role === "seller" || (user as any).role === "admin") && (
                      <Link to="/seller" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Store className="h-4 w-4" />
                        Seller Dashboard
                      </Link>
                    )}

                    {(user as any).role === "admin" && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    )}

                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2" />

                    <button onClick={logout} className="flex items-center gap-2 w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors">
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-[#5438DC] text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
                >
                  Sign In
                </Link>
              )}

              {/* AI Support Chat Link */}
              <Link
                to="/support"
                className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="AI Customer Support Assistant"
                title="AI Support Assistant"
              >
                <div className="relative">
                  <Headphones className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    24/7
                  </span>
                </div>
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>


        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
                    isActive(link.path)
                      ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                  onClick={() => {
                    handleNavClick(link.path);
                    setMobileMenuOpen(false);
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      )}

      {/* Floating Search Modal Overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-[120px] sm:pt-[140px] px-4 animate-in fade-in duration-200"
          onClick={() => setSearchOpen(false)}
        >
          <div
            ref={searchModalRef}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Top Search Bar */}
            <form onSubmit={handleSearch} className="p-4 sm:p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-base sm:text-lg font-medium focus:outline-none"
                aria-label="Search products"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </form>

            {/* Live Search Results / Quick Category Chips */}
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
              {searchQuery.trim() ? (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
                    <span>Matching Products</span>
                    <span>{searchResultData?.items?.length || 0} found</span>
                  </div>

                  {isSearchLoading ? (
                    <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      <span>Searching MarketVerse...</span>
                    </div>
                  ) : searchResultData?.items && searchResultData.items.length > 0 ? (
                    <div className="space-y-2">
                      {searchResultData.items.map((prod: any) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                            navigate(`/product/${prod.slug}`);
                          }}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={prod.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"}
                              alt={prod.name}
                              className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {prod.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {prod.categoryName || "Marketplace Item"}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 shrink-0 ml-3">
                            {formatCurrency(prod.price)}
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={handleSearch}
                        className="w-full py-2.5 mt-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      >
                        View All Results for "{searchQuery}" ➔
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No products matched "{searchQuery}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Popular Searches</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Headphones",
                        "Smartwatch",
                        "Running Shoes",
                        "Automotive",
                        "Panjabi",
                        "Sunglasses",
                        "Keyboard",
                        "Yoga Mat",
                      ].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSearchQuery(tag);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-semibold border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          🔍 {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isDashboardRoute ? (
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </main>
      ) : (
        <main className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col">
          {children}
        </main>
      )}

      {/* Footer — hidden on dashboard routes, auth routes, and support */}
      {!isDashboardRoute && !isAuthRoute && location.pathname !== '/support' && (
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Store className="h-6 w-6 text-indigo-600" />
                <span className="text-lg font-bold text-slate-900 dark:text-white">MarketVerse</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                AI-powered multi-vendor marketplace connecting buyers and sellers worldwide.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li><Link to="/" onClick={() => handleNavClick("/")} className="hover:text-indigo-600">Home</Link></li>
                <li><Link to="/products" onClick={() => handleNavClick("/products")} className="hover:text-indigo-600">All Products</Link></li>
                <li><Link to="/categories" onClick={() => handleNavClick("/categories")} className="hover:text-indigo-600">Categories</Link></li>
                <li><Link to="/sellers" onClick={() => handleNavClick("/sellers")} className="hover:text-indigo-600">Sellers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Customer Service</h3>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li><Link to="/orders" className="hover:text-indigo-600">My Orders</Link></li>
                <li><Link to="/cart" className="hover:text-indigo-600">Shopping Cart</Link></li>
                <li><Link to="/wishlist" className="hover:text-indigo-600">Wishlist</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li className="flex items-center gap-2"><Mic className="h-3.5 w-3.5" /> Voice Navigation</li>
                <li className="flex items-center gap-2"><span className="text-lg leading-none">🤖</span> AI Recommendations</li>
                <li className="flex items-center gap-2"><span className="text-lg leading-none">✨</span> AI Seller Assistant</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} MarketVerse. All rights reserved. Final Year Project Demo.
          </div>
        </div>
      </footer>
      )}

      {/* Voice Assistant Navigation Floating Widget */}
      <VoiceAssistant />
    </div>
  );
}

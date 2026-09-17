import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeContext";
import { trpc } from "@/providers/trpc";
import { getGuestCartCount } from "@/lib/guestCart";
import { formatCurrency } from "@/lib/currency";
import { VoiceAssistant } from "./VoiceAssistant";
import { MarketVerseLogo } from "./MarketVerseLogo";
import { ProfileMenu } from "./ProfileMenu";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  Heart,
  Store,
  Bell,
  Sun,
  Moon,
  Headphones,
  Loader2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Banknote,
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const isDashboardRoute = location.pathname === "/dashboard" ||
    location.pathname === "/seller" ||
    location.pathname === "/admin" ||
    location.pathname.startsWith("/seller/dashboard") ||
    location.pathname.startsWith("/seller/assistant") ||
    location.pathname.startsWith("/admin/");

  const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup";
  const isClevoraRoute = location.pathname === "/fashion-stylist";

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

  const isNotificationUnread = (value: unknown) => Number(value ?? 0) === 0;

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
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Top Announcement Bar */}
      {!isAuthRoute && !isDashboardRoute && (
        <div className="bg-[#5438DC] text-white text-center text-xs py-2.5 px-4 font-medium tracking-wide">
          <span>
            Free shipping on orders over BDT 500 | AI-Powered Recommendations | Voice Navigation Available
          </span>
        </div>
      )}

      {/* Header */}
      {!isAuthRoute && !isDashboardRoute && (
        <header
          className={`sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 transition-all ${scrolled ? "shadow-md" : ""
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
                <MarketVerseLogo
                  compact
                  className="h-11 w-[196px] text-slate-900 dark:text-white"
                />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1.5" aria-label="Main navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${isActive(link.path)
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
                            notificationsList.map((notif: any) => {
                              const unread = isNotificationUnread(notif.isRead);
                              return (
                                <div
                                  key={notif.id}
                                  onClick={() => {
                                    if (unread) markReadMutation.mutate({ id: notif.id });
                                    setNotifDropdownOpen(false);
                                    if (notif.link) {
                                      navigate(notif.link);
                                    }
                                  }}
                                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${unread
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
                              );
                            })
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

                {/* Minimal profile menu */}
                {isAuthenticated && user ? (
                  <ProfileMenu user={user as any} />
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
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium ${isActive(link.path)
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
      {isDashboardRoute || isClevoraRoute ? (
        <main className="flex min-w-0 flex-1 flex-col">
          {children}
        </main>
      ) : (
        <main className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col">
          {children}
        </main>
      )}

      {/* Footer — hidden on dashboard routes and auth routes */}
      {!isDashboardRoute && !isClevoraRoute && !isAuthRoute && (
        <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 pb-32 pt-12 sm:px-6 sm:pb-36 lg:pt-16">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1.25fr]">
              <section className="max-w-sm">
                <MarketVerseLogo className="h-16 w-[270px] text-slate-900 dark:text-white" />
                <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400">A multi-vendor marketplace where customers discover products and independent sellers grow their stores.</p>
                <div className="mt-5 flex flex-wrap gap-2" aria-label="Social media channels">
                  {[['f', 'Facebook'], ['◎', 'Instagram'], ['in', 'LinkedIn'], ['▶', 'YouTube']].map(([mark, label]) => <span key={label} title={`${label} link coming soon`} aria-label={`${label} link coming soon`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">{mark}</span>)}
                </div>
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm"><Link to="/about" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">About Us</Link><Link to="/contact" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Contact Us</Link></div>
              </section>

              <FooterLinkGroup title="Customer" links={[["Help Center", "/support"], ["My Account", "/profile"], ["My Orders", "/orders"], ["Shopping Cart", "/cart"], ["Wishlist", "/wishlist"], ["Order Tracking", "/orders"], ["Shipping Information", "/shipping"], ["Return & Refund Policy", "/returns"]]} />

              <section>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Seller</h3>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-400"><li><Link to="/signup?accountType=seller" className="hover:text-indigo-600">Become a Seller</Link></li><li><Link to="/login" className="hover:text-indigo-600">Seller Login</Link></li><li><Link to="/seller" className="hover:text-indigo-600">Seller Dashboard</Link></li><li><Link to="/seller?tab=orders" className="hover:text-indigo-600">Seller Orders</Link></li><li><Link to="/seller?tab=products" className="hover:text-indigo-600">Seller Products</Link></li><li><Link to="/seller/assistant" className="hover:text-indigo-600">Seller Support</Link></li></ul>
                <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200"><Store className="mb-2 h-4 w-4" /><p className="font-semibold">Build your store on MarketVerse</p><p className="mt-1 opacity-80">Seller approval is required before store features become available.</p></div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contact / Payment & Security</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400"><a href="tel:01711654706" className="flex gap-3 hover:text-indigo-600"><Phone className="h-4 w-4 text-indigo-600" />01711654706</a><a href="mailto:support@marketverse.com.bd" className="flex gap-3 break-all hover:text-indigo-600"><Mail className="h-4 w-4 text-indigo-600" />support@marketverse.com.bd</a><div className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-indigo-600" /><span>200/2/A, West Kafrul, Taltola, Agragaon, Dhaka-1207</span></div></div>
                <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">SSLCommerz</span><span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><Banknote className="h-4 w-4" />Cash on Delivery</span></div>
                <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 text-indigo-600" />Online payments are handled through SSLCommerz.</div>
              </section>
            </div>

            <div className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>&copy; 2026 MarketVerse. All rights reserved.</p><div className="flex flex-wrap gap-x-5 gap-y-2"><Link to="/about" className="hover:text-indigo-600">About Us</Link><Link to="/contact" className="hover:text-indigo-600">Contact Us</Link><Link to="/privacy" className="hover:text-indigo-600">Privacy Policy</Link><Link to="/terms" className="hover:text-indigo-600">Terms & Conditions</Link><Link to="/returns" className="hover:text-indigo-600">Return & Refund Policy</Link><Link to="/shipping" className="hover:text-indigo-600">Shipping Information</Link></div></div>
          </div>
        </footer>
      )}

      {/* Keep floating voice controls off dashboard canvases so full-page capture stays stable. */}
      {!isDashboardRoute && <VoiceAssistant />}
    </div>
  );
}

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<[label: string, path: string]>;
}) {
  return (
    <section aria-labelledby={`footer-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <h3 id={`footer-${title.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
        {links.map(([label, path]) => (
          <li key={`${label}-${path}`}>
            <Link to={path} className="inline-flex min-h-6 items-center transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

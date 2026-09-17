import { Navigate, Routes, Route, useLocation } from "react-router";
import { useLayoutEffect } from "react";
import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Categories from "./pages/Categories";
import Category from "./pages/Category";
import Sellers from "./pages/Sellers";
import SellerStore from "./pages/SellerStore";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AIAssistant from "./pages/AIAssistant";
import Notifications from "./pages/Notifications";
import FashionStylist from "./pages/FashionStylist";
import Support from "./pages/Support";
import VoiceCheckout from "./pages/VoiceCheckout";
import PaymentCallback from "./pages/PaymentCallback";
import Invoice from "./pages/Invoice";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import PolicyPage from "./pages/PolicyPage";
import { getRoleHome } from "./components/UserAvatar";

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    document.querySelectorAll<HTMLElement>("[data-scroll-root]").forEach((scrollRoot) => {
      scrollRoot.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [pathname, search, hash]);

  return null;
}

function RoleRoute({ role, children }: { role: "admin" | "seller" | "customer"; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Checking access...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if ((user as any).role !== role) return <Navigate to={getRoleHome((user as any).role)} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/sellers" element={<Sellers />} />
          <Route path="/seller/:id" element={<SellerStore />} />

          {/* Customer Routes */}
          <Route path="/dashboard" element={<RoleRoute role="customer"><Dashboard /></RoleRoute>} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/voice-checkout" element={<VoiceCheckout />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
          <Route path="/invoice/:id" element={<Invoice />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/fashion-stylist" element={<FashionStylist />} />
          <Route path="/support" element={<Support />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/privacy" element={<PolicyPage kind="privacy" />} />
          <Route path="/terms" element={<PolicyPage kind="terms" />} />
          <Route path="/returns" element={<PolicyPage kind="returns" />} />
          <Route path="/shipping" element={<PolicyPage kind="shipping" />} />

          {/* Seller Routes */}
          <Route path="/seller" element={<RoleRoute role="seller"><SellerDashboard /></RoleRoute>} />
          <Route path="/seller/assistant" element={<RoleRoute role="seller"><AIAssistant /></RoleRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

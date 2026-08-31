import { Routes, Route, useLocation } from "react-router";
import { useEffect } from "react";
import "./App.css";
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

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/voice-checkout" element={<VoiceCheckout />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/fashion-stylist" element={<FashionStylist />} />
          <Route path="/support" element={<Support />} />

          {/* Seller Routes */}
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/seller/assistant" element={<AIAssistant />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

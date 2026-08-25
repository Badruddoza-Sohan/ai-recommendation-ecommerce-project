import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Eye, EyeOff, Sparkles, User, Mail, Smartphone, Lock, MapPin, Building, Globe, Store, ArrowRight, ArrowLeft, ShieldCheck, ShoppingBag, Zap } from "lucide-react";
import { toast } from "sonner";

import { broadcastLiveEvent } from "@/lib/realtimeSync";

const initialForm = {
  accountType: "customer" as "customer" | "seller",
  name: "",
  email: "",
  phone: "",
  password: "",
  address: "",
  city: "",
  country: "Bangladesh",
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessDescription: "",
};

export default function Signup() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => {
    if (isAuthenticated && user) {
      if ((user as any).role === "seller") {
        navigate("/seller");
      } else if ((user as any).role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, user, navigate]);

  const signup = trpc.auth.signup.useMutation({
    onSuccess: (data) => {
      utils.auth.me.invalidate();
      if (data.role === "seller") {
        broadcastLiveEvent("SELLER_APPLICATION", { name: form.businessName || form.name });
      } else {
        broadcastLiveEvent("USER_UPDATED", { name: form.name });
      }
      toast.success("Account created successfully!");
      if (data.role === "seller") {
        navigate("/seller");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (err) => {
      try {
        const parsed = JSON.parse(err.message);
        if (Array.isArray(parsed) && parsed[0]?.message) {
          setError(parsed.map((p) => p.message).join(", "));
          return;
        }
      } catch (e) {
        // Not a JSON error string
      }
      setError(err.message || "Failed to create account. Please try again.");
    },
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const phoneRegex = /^(?:\+88)?01[3-9]\d{8}$/;
    if (!phoneRegex.test(form.phone.replace(/[\s-]/g, ""))) {
      setError("Please enter a valid Bangladeshi mobile number (e.g., 017XXXXXXXX)");
      return;
    }

    signup.mutate(form);
  };

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");

  const googleAuthMutation = trpc.auth.googleAuth.useMutation({
    onSuccess: (data) => {
      utils.auth.me.invalidate();
      toast.success(`Account created! Welcome, ${data.name}.`);
      setShowGoogleModal(false);
      if (data.role === "seller") {
        navigate("/seller");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (err) => {
      setError(err.message || "Google sign-up failed.");
    },
  });

  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      toast.error("Please enter your Google email address");
      return;
    }
    const name = googleName.trim() || googleEmail.split("@")[0];
    googleAuthMutation.mutate({
      email: googleEmail.trim().toLowerCase(),
      name,
      googleId: `google_${googleEmail.trim().replace(/[^a-zA-Z0-9]/g, "_")}`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden transition-colors">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Glow Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/15 dark:bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Google Sign-in Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 mb-3 shadow-inner">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sign up with Google</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter your real Google email address to create your MarketVerse account.</p>
            </div>
            <form onSubmit={handleGoogleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Google Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 outline-hidden transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shourov Rahman"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 outline-hidden transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="flex-1 px-4 py-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={googleAuthMutation.isPending}
                  className="flex-1 px-4 py-3 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {googleAuthMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Split Grid Card */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 backdrop-blur-2xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Left Column: Brand Hero & Benefits */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div>
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                MarketVerse AI
              </span>
            </div>

            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Join Bangladesh's Premier E-Commerce Hub</span>
              </span>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Create your account in less than a minute.
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Whether you want to shop for top BD products or open your vendor store to reach thousands of local customers, get started for free today.
              </p>
            </div>
          </div>

          {/* Perks list */}
          <div className="mt-8 space-y-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">✨ Why MarketVerse?</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">10,000+ Products</p>
                  <p className="text-[11px] text-slate-300">Electronics, Fashion, Jewelry & Home Essentials</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">AI Stylist & Assistant</p>
                  <p className="text-[11px] text-slate-300">Instant AI fashion matching & voice shopping</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Verified BD Vendors</p>
                  <p className="text-[11px] text-slate-300">Direct chat with sellers & nationwide delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Signup Form */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-white dark:bg-slate-900/90">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create Your Account</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Choose your account type and fill in your details below.
            </p>
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            disabled={googleAuthMutation.isPending}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-300 dark:border-slate-700/80 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 mb-6 group"
          >
            {googleAuthMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <svg className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative my-4 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 dark:text-slate-400 font-medium">Or fill out form</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Account Type Selector */}
            <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex gap-1 mb-4">
              <button
                type="button"
                onClick={() => handleChange("accountType", "customer")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  form.accountType === "customer"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-900"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Customer Account</span>
              </button>
              <button
                type="button"
                onClick={() => handleChange("accountType", "seller")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  form.accountType === "seller"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-900"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Vendor / Seller</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Shourov Rahman"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">BD Mobile Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Street / Area"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">City *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Dhaka"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Country *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Vendor Fields */}
            {form.accountType === "seller" && (
              <div className="space-y-4 rounded-2xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 p-4 mt-2">
                <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-4 h-4" />
                  <span>Vendor Store Details</span>
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. BD Tech Hub"
                      value={form.businessName}
                      onChange={(e) => handleChange("businessName", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-purple-500 outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Email *</label>
                    <input
                      type="email"
                      placeholder="support@bdtech.com"
                      value={form.businessEmail}
                      onChange={(e) => handleChange("businessEmail", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-purple-500 outline-hidden"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Phone *</label>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={form.businessPhone}
                    onChange={(e) => handleChange("businessPhone", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-purple-500 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Description *</label>
                  <textarea
                    rows={2}
                    placeholder="Describe products you sell..."
                    value={form.businessDescription}
                    onChange={(e) => handleChange("businessDescription", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-purple-500 outline-hidden resize-none"
                    required
                  />
                </div>
              </div>
            )}

            {error ? (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={Boolean((signup as any).isPending || (signup as any).isLoading)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {Boolean((signup as any).isPending || (signup as any).isLoading) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}

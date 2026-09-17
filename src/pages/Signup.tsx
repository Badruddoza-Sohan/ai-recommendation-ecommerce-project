import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Eye, EyeOff, Sparkles, User, Mail, Smartphone, Lock, ArrowRight, ArrowLeft, ShieldCheck, ShoppingBag, Zap } from "lucide-react";
import { toast } from "@/lib/toast";
import { AUTH_ERROR_CLASS, AUTH_ICON_INPUT_CLASS, AUTH_INPUT_CLASS, AUTH_PRIMARY_BUTTON_CLASS } from "@/lib/authStyles";

import { broadcastLiveEvent } from "@/lib/realtimeSync";
const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

const initialSellerForm = {
  businessName: "",
  shopName: "",
  businessType: "Individual Seller",
  nidNumber: "",
  tradeLicenseNumber: "",
  businessAddress: "",
  district: "Dhaka",
};

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [accountType, setAccountType] = useState<"customer" | "seller">(
    searchParams.get("accountType") === "seller" ? "seller" : "customer"
  );
  const [form, setForm] = useState(initialForm);
  const [sellerForm, setSellerForm] = useState(initialSellerForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  const signup = trpc.auth.signup.useMutation({
    onSuccess: (data) => {
      utils.auth.me.invalidate();
      broadcastLiveEvent("USER_UPDATED", { name: form.name });
      if (data.role === "seller") {
        toast.success("Seller application submitted. Admin approval is required before seller features are available.");
      } else {
        toast.success("Account created successfully!");
      }
      navigate("/");
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

  const handleSellerChange = (field: keyof typeof sellerForm, value: string) => {
    setSellerForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const phoneRegex = /^(?:\+88)?01[3-9]\d{8}$/;
    if (!phoneRegex.test(form.phone.replace(/[\s-]/g, ""))) {
      setError("Please enter a valid Bangladeshi mobile number (e.g., 017XXXXXXXX)");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (accountType === "seller") {
      const requiredSellerFields: Array<[keyof typeof sellerForm, string]> = [
        ["businessName", "Business name is required."],
        ["shopName", "Shop name is required."],
        ["nidNumber", "NID number is required."],
        ["businessAddress", "Business address is required."],
        ["district", "District is required."],
      ];
      for (const [field, message] of requiredSellerFields) {
        if (!sellerForm[field].trim()) {
          setError(message);
          return;
        }
      }
      signup.mutate({
        accountType,
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        address: sellerForm.businessAddress,
        city: sellerForm.district,
        country: "Bangladesh",
        businessName: sellerForm.businessName,
        shopName: sellerForm.shopName,
        businessType: sellerForm.businessType as "Individual Seller" | "Small Business" | "Retail Store" | "Wholesaler" | "Manufacturer",
        nidNumber: sellerForm.nidNumber,
        tradeLicenseNumber: sellerForm.tradeLicenseNumber,
        businessAddress: sellerForm.businessAddress,
        district: sellerForm.district,
        businessEmail: form.email,
        businessPhone: form.phone,
      });
      return;
    }

    signup.mutate({
      accountType: "customer",
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      address: "",
      city: "",
      country: "Bangladesh",
    });
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
                  placeholder="e.g. Amirul Islam"
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
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
              {(["customer", "seller"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccountType(type)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${accountType === type ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300"}`}
                >
                  {type === "customer" ? "Customer" : "Seller / Vendor"}
                </button>
              ))}
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
              {accountType === "customer" ? "Create Your Customer Account" : "Register as a Seller / Vendor"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {accountType === "customer" ? "Create your customer account to start shopping." : "Submit your Bangladesh business profile for admin approval."}
            </p>
          </div>


          <form className="space-y-4" onSubmit={handleSubmit}>
            {accountType === "seller" && (
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Information</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your personal details and seller account credentials.</p>
              </div>
            )}

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
                    placeholder="Amirul Islam"
                    className={AUTH_ICON_INPUT_CLASS}
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
                    className={AUTH_ICON_INPUT_CLASS}
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
                    className={AUTH_ICON_INPUT_CLASS}
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
                    className={`${AUTH_ICON_INPUT_CLASS} pr-10`}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    placeholder="Re-enter your password"
                    className={`${AUTH_ICON_INPUT_CLASS} pr-10`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {accountType === "seller" && (
              <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Business Information</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">No payment information is required. MarketVerse admins review seller applications.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input aria-label="Business Name" placeholder="Business Name *" value={sellerForm.businessName} onChange={(e) => handleSellerChange("businessName", e.target.value)} className={AUTH_INPUT_CLASS} required />
                  <input aria-label="Shop Name" placeholder="Shop Name *" value={sellerForm.shopName} onChange={(e) => handleSellerChange("shopName", e.target.value)} className={AUTH_INPUT_CLASS} required />
                  <select aria-label="Business Type" value={sellerForm.businessType} onChange={(e) => handleSellerChange("businessType", e.target.value)} className={AUTH_INPUT_CLASS}>
                    <option>Individual Seller</option>
                    <option>Small Business</option>
                    <option>Retail Store</option>
                    <option>Wholesaler</option>
                    <option>Manufacturer</option>
                  </select>
                  <input aria-label="NID Number" placeholder="NID Number *" value={sellerForm.nidNumber} onChange={(e) => handleSellerChange("nidNumber", e.target.value)} className={AUTH_INPUT_CLASS} required />
                  <input aria-label="Trade License Number" placeholder="Trade License Number (Optional)" value={sellerForm.tradeLicenseNumber} onChange={(e) => handleSellerChange("tradeLicenseNumber", e.target.value)} className={AUTH_INPUT_CLASS} />
                  <input aria-label="District" placeholder="District *" value={sellerForm.district} onChange={(e) => handleSellerChange("district", e.target.value)} className={AUTH_INPUT_CLASS} required />
                </div>
                <textarea aria-label="Business Address" placeholder="Business Address *" value={sellerForm.businessAddress} onChange={(e) => handleSellerChange("businessAddress", e.target.value)} className={`${AUTH_INPUT_CLASS} h-24 resize-none py-3`} required />
              </div>
            )}

            {error ? (
              <div className={AUTH_ERROR_CLASS}>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={Boolean((signup as any).isPending || (signup as any).isLoading)}
              className={`${AUTH_PRIMARY_BUTTON_CLASS} flex items-center justify-center gap-2`}
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

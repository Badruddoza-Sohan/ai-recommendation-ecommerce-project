import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { addGuestCartItem } from "@/lib/guestCart";
import { formatCurrency } from "@/lib/currency";
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Check,
  Truck,
  Shield,
  RotateCcw,
  Loader2,
  ChevronRight,
  Sparkles,
  MessageSquare,
} from "lucide-react";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = trpc.product.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );
  const { data: recommendations } = trpc.product.recommendations.useQuery(
    { productId: product?.id || 0 },
    { enabled: !!product }
  );
  const { data: completeTheLook } = (trpc.ai as any).completeTheLook?.useQuery(
    { productId: product?.id || 0 },
    { enabled: !!product }
  );
  const { data: reviews } = trpc.review.listByProduct.useQuery(
    { productId: product?.id || 0 },
    { enabled: !!product }
  );
  const { data: reviewStats } = trpc.review.statsByProduct.useQuery(
    { productId: product?.id || 0 },
    { enabled: !!product }
  );

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [showReviewForm, setShowReviewForm] = useState(false);

  const [showTalkToSeller, setShowTalkToSeller] = useState(false);
  const [sellerMessageText, setSellerMessageText] = useState("");
  const sendMessageToSeller = trpc.seller.sendMessageToSeller.useMutation({
    onSuccess: () => {
      setShowTalkToSeller(false);
      navigate("/dashboard?tab=messages");
    },
  });

  const handleOpenTalkToSeller = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setSellerMessageText(`Hello ${product?.sellerName || "Seller"}, I am interested in ${product?.name}. Could you please share more details?`);
    setShowTalkToSeller(true);
  };

  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: async () => {
      await utils.cart.get.invalidate();
      setAddedToCart(true);
      navigate("/cart");
    },
  });
  const addToWishlist = trpc.wishlist.add.useMutation({
    onSuccess: () => utils.wishlist.list.invalidate(),
  });
  const removeFromWishlist = trpc.wishlist.remove.useMutation({
    onSuccess: () => utils.wishlist.list.invalidate(),
  });
  
  const { data: wishlist } = trpc.wishlist.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const wishlistItem = wishlist?.find((item: any) => item.productId === product?.id);
  const isInWishlist = !!wishlistItem;
  const submitReview = trpc.review.create.useMutation({
    onSuccess: () => {
      utils.review.listByProduct.invalidate({ productId: product?.id || 0 });
      utils.review.statsByProduct.invalidate({ productId: product?.id || 0 });
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: "", comment: "" });
    },
  });

  useEffect(() => {
    const handleAddToCart = () => {
      if (!product) return;
      if (!isAuthenticated) {
        addGuestCartItem({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          imageUrl: product.images?.[0]?.imageUrl || "",
          quantity,
        });
        window.dispatchEvent(new Event("guest-cart-updated"));
        setAddedToCart(true);
        navigate("/cart");
        return;
      }
      addToCart.mutate({ productId: product.id, quantity });
    };

    window.addEventListener("voice-assistant-add-to-cart", handleAddToCart);
    return () => {
      window.removeEventListener("voice-assistant-add-to-cart", handleAddToCart);
    };
  }, [addToCart, addGuestCartItem, isAuthenticated, navigate, product, quantity]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-lg text-slate-500">Product not found</p>
        <Link to="/products" className="text-indigo-600 hover:underline mt-2 inline-block">
          Browse all products
        </Link>
      </div>
    );
  }

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const allImages = product.images?.length ? product.images : [{ imageUrl: product.images?.[0]?.imageUrl || "" }];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-indigo-600">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/products" className="hover:text-indigo-600">Products</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/category/${product.categorySlug}`} className="hover:text-indigo-600">
          {product.categoryName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 dark:text-white font-medium truncate">{product.name}</span>
      </nav>

      {/* Product Main */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 mb-10 items-start">
        {/* Images */}
        <div className="md:col-span-5 flex flex-col items-center animate-slide-left">
          <div className="w-full max-w-sm h-[260px] sm:h-[310px] rounded-3xl overflow-hidden glass-card flex items-center justify-center p-3 mb-4 transition-all hover:shadow-xl group relative">
            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={allImages[selectedImage]?.imageUrl || ""}
              alt={product.name}
              className="max-h-[240px] sm:max-h-[280px] w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto max-w-sm w-full justify-center py-1">
              {allImages.map((img: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all p-0.5 bg-white dark:bg-slate-800 ${
                    selectedImage === i
                      ? "border-indigo-600 shadow-sm ring-2 ring-indigo-600/20 scale-105"
                      : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.imageUrl} alt={`${product.name} ${i + 1}`} className="w-full h-full object-contain rounded" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="md:col-span-7 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">{product.categoryName}</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(product.rating || 0)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-slate-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {product.rating?.toFixed(1) || "0"}
            </span>
            <span className="text-xs text-slate-400">({product.reviewCount || 0} reviews)</span>
            <span className="text-xs text-slate-400">• {product.soldCount || 0} sold</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2.5 mb-4">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(product.price)}</span>
            {product.comparePrice ? (
              <>
                <span className="text-sm font-medium text-slate-400 line-through">{formatCurrency(product.comparePrice)}</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[11px] font-bold rounded-md">
                  {discount}% OFF
                </span>
              </>
            ) : null}
          </div>

          {/* Short Description */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{product.shortDescription}</p>

          {/* Seller Info */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 border border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  {product.sellerName?.charAt(0) || "S"}
                </span>
              </div>
              <div className="min-w-0">
                <Link to={`/seller/${product.sellerId}`} className="font-semibold text-xs text-slate-900 dark:text-white hover:text-indigo-600 truncate block">
                  {product.sellerName}
                </Link>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <span>{product.sellerRating} rating</span>
                  <span>•</span>
                  <span>{product.sellerTotalSales} sales</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenTalkToSeller}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-200/60 dark:border-indigo-700/50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Talk to Seller</span>
            </button>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity:</span>
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="px-3 py-1 text-xs font-bold text-slate-900 dark:text-white min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(99, quantity + 1))}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {product.inventory && (
              <span className={`text-xs font-semibold ${product.inventory.quantity > 10 ? "text-green-600 dark:text-green-400" : "text-orange-600"}`}>
                {product.inventory.quantity > 0 ? `${product.inventory.quantity} in stock` : "Out of stock"}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2.5 mb-4">
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  addGuestCartItem({
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    imageUrl: product.images?.[0]?.imageUrl || "",
                    quantity,
                  });
                  window.dispatchEvent(new Event("guest-cart-updated"));
                  setAddedToCart(true);
                  navigate("/checkout");
                  return;
                }
                addToCart.mutate({ productId: product.id, quantity });
                navigate("/checkout");
              }}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 cursor-pointer"
            >
              <Check className="h-5 w-5" />
              Order Now
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  addGuestCartItem({
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    imageUrl: product.images?.[0]?.imageUrl || "",
                    quantity,
                  });
                  window.dispatchEvent(new Event("guest-cart-updated"));
                  setAddedToCart(true);
                  navigate("/cart");
                  return;
                }
                addToCart.mutate({ productId: product.id, quantity });
              }}
              disabled={addedToCart}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-[0.98] cursor-pointer group ${
                addedToCart
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40"
              }`}
            >
              {addedToCart ? (
                <>
                  <Check className="h-5 w-5" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 group-hover:animate-bounce" />
                  Add to Cart
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (isInWishlist) {
                  removeFromWishlist.mutate({ wishlistId: wishlistItem.id });
                } else {
                  addToWishlist.mutate({ productId: product.id });
                }
              }}
              className={`p-2.5 border rounded-xl transition-colors cursor-pointer ${
                isInWishlist 
                  ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20" 
                  : "border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:border-red-200"
              }`}
              aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart 
                className={`h-4 w-4 transition-colors ${
                  isInWishlist 
                    ? "text-red-500 fill-red-500" 
                    : "text-slate-400 hover:text-red-500"
                }`} 
              />
            </button>
            <button
              className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Share product"
            >
              <Share2 className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4">
            <TrustBadge icon={<Truck className="h-5 w-5" />} text="Free Shipping" />
            <TrustBadge icon={<Shield className="h-5 w-5" />} text="Secure Payment" />
            <TrustBadge icon={<RotateCcw className="h-5 w-5" />} text="Easy Returns" />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 mb-10 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Product Details</h2>
        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 whitespace-pre-line text-sm sm:text-base leading-relaxed">
          {product.description}
        </div>

        {/* Attributes */}
        {product.attributes && (
          <div className="mt-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(JSON.parse(product.attributes)).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-500 capitalize">{key}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Complete the Look */}
      {completeTheLook && completeTheLook.length > 0 && (
        <div className="mb-12 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg animate-pulse-glow">
              <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Complete the Look</h2>
            <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full">AI Powered</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {completeTheLook.map((item: any) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all"
              >
                <div className="p-3">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">{item.reason}</p>
                  <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h4>
                  <p className="font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 lg:gap-5">
            {recommendations.map((item: any) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={item.imageUrl || ""}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-slate-900 dark:text-white text-xs line-clamp-2 group-hover:text-indigo-600">
                    {item.name}
                  </h4>
                  <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">{formatCurrency(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 mb-10 animate-fade-up" style={{ animationDelay: '500ms' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Customer Reviews <span className="text-indigo-600 dark:text-indigo-400">({reviewStats?.totalReviews || 0})</span>
          </h2>
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Write a Review
          </button>
        </div>

        {/* Review Stats */}
        {reviewStats && reviewStats.totalReviews > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-900 dark:text-white">
                  {Number(reviewStats.avgRating || 0).toFixed(1)}
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= Math.round(reviewStats.avgRating || 0)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-slate-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">{reviewStats.totalReviews} reviews</p>
              </div>
            </div>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count =
                  star === 5
                    ? reviewStats.fiveStar
                    : star === 4
                    ? reviewStats.fourStar
                    : star === 3
                    ? reviewStats.threeStar
                    : star === 2
                    ? reviewStats.twoStar
                    : reviewStats.oneStar;
                const pct = reviewStats.totalReviews ? (count / reviewStats.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-8">{star} star</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitReview.mutate({
                productId: product.id,
                ...reviewForm,
              });
            }}
            className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
          >
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        s <= reviewForm.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Title</label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Summarize your experience"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Review</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                placeholder="Share your thoughts about this product"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitReview.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitReview.isPending ? "Submitting..." : "Submit Review"}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews?.length === 0 && (
            <p className="text-center text-slate-500 py-8">No reviews yet. Be the first to review!</p>
          )}
          {reviews?.map((review: any) => (
            <div
              key={review.id}
              className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                      {review.userName?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{review.userName || "Anonymous"}</p>
                    {review.isVerified && (
                      <span className="text-xs text-green-600">Verified Purchase</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${
                      s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"
                    }`}
                  />
                ))}
              </div>
              <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">{review.title}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {showTalkToSeller && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <span>Talk to Seller: {product?.sellerName}</span>
              </h3>
              <button
                onClick={() => setShowTalkToSeller(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Send a direct message regarding <span className="font-semibold text-slate-700 dark:text-slate-300">{product?.name}</span>. The seller will be notified instantly.
            </p>

            <textarea
              rows={4}
              value={sellerMessageText}
              onChange={(e) => setSellerMessageText(e.target.value)}
              placeholder="Type your message to the seller..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-sm dark:bg-slate-800 dark:text-white mb-4 focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowTalkToSeller(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!sellerMessageText.trim() || sendMessageToSeller.isPending}
                onClick={() => {
                  if (!product) return;
                  sendMessageToSeller.mutate({
                    sellerId: product.sellerId,
                    productId: product.id,
                    subject: `Inquiry about ${product.name}`,
                    message: sellerMessageText.trim(),
                  });
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                {sendMessageToSeller.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                <span>Send Message</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="text-indigo-600">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

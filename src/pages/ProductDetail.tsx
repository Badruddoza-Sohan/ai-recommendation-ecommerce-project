import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { addGuestCartItem } from "@/lib/guestCart";
import { formatCurrency } from "@/lib/currency";
import {
  Star,
  Heart,
  Truck,
  RotateCcw,
  Loader2,
  Sparkles,
  MessageSquare,
  Eye,
  ChevronRight,
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

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

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
  }, [addToCart, isAuthenticated, navigate, product, quantity]);

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

  const allImages = product.images?.length ? product.images : [{ imageUrl: product.images?.[0]?.imageUrl || "" }];

  let parsedAttributes: any = {};
  try {
    if (product.attributes) {
      parsedAttributes = JSON.parse(product.attributes);
    }
  } catch (e) {
    // ignore parse error
  }

  // Derive sizes and colors from variants
  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  
  let productSizes: string[] = [];
  let productColours: string[] = [];

  if (hasVariants) {
    productSizes = Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))) as string[];
    productColours = Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean))) as string[];
  } else {
    // Fallback to legacy attributes if no variants exist
    if (parsedAttributes.sizes) {
      productSizes = Array.isArray(parsedAttributes.sizes) ? parsedAttributes.sizes : parsedAttributes.sizes.split(",").map((s: string) => s.trim());
    } else if (parsedAttributes.size) {
      productSizes = Array.isArray(parsedAttributes.size) ? parsedAttributes.size : parsedAttributes.size.split(",").map((s: string) => s.trim());
    }
    if (parsedAttributes.colors) {
      productColours = Array.isArray(parsedAttributes.colors) ? parsedAttributes.colors : parsedAttributes.colors.split(",").map((s: string) => s.trim());
    } else if (parsedAttributes.color) {
      productColours = Array.isArray(parsedAttributes.color) ? parsedAttributes.color : parsedAttributes.color.split(",").map((s: string) => s.trim());
    }
  }

  const hasSizes = productSizes.length > 0;
  const hasColours = productColours.length > 0;

  // Use product ID to sync defaults on first load if we don't have one selected
  if (hasColours && selectedColor === "" && productColours[0]) {
    setSelectedColor(productColours[0]);
  }
  if (hasSizes && selectedSize === "" && productSizes[0]) {
    setSelectedSize(productSizes[0]);
  }

  // Find the selected variant to check stock
  const selectedVariant = hasVariants ? variants.find((v: any) => 
    (!hasSizes || v.size === selectedSize) && 
    (!hasColours || v.color === selectedColor)
  ) : null;

  const availableStock = hasVariants ? (selectedVariant ? selectedVariant.quantity : 0) : (product.inventory?.quantity || 0);
  const isOutOfStock = availableStock <= 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in duration-700">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 animate-in slide-in-from-top-4 fade-in duration-500" aria-label="Breadcrumb">
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
          <div className="md:col-span-7 flex flex-col-reverse sm:flex-row gap-4 items-start animate-in fade-in slide-in-from-left-8 duration-700 ease-out">
            {allImages.length > 1 && (
              <div className="flex flex-row sm:flex-col gap-3 overflow-auto max-w-full sm:max-w-[80px] custom-scrollbar">
                {allImages.map((img: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 sm:w-[80px] h-16 sm:h-[80px] rounded flex items-center justify-center shrink-0 border-2 transition-all p-1.5 bg-[#F5F5F5] dark:bg-slate-800 hover:scale-105 active:scale-95 ${
                      selectedImage === i
                        ? "border-slate-400 shadow-sm"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={img.imageUrl} alt={`${product.name} ${i + 1}`} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  </button>
                ))}
            </div>
          )}
            <div className="w-full flex-1 bg-[#F5F5F5] dark:bg-slate-800 rounded flex items-center justify-center p-8 min-h-[300px] sm:min-h-[600px] animate-in zoom-in-95 duration-500">
              <img
                src={allImages[selectedImage]?.imageUrl || ""}
                alt={product.name}
                className="max-h-[260px] sm:max-h-[440px] w-auto h-auto object-contain transition-all duration-700 hover:scale-110 mix-blend-multiply dark:mix-blend-normal"
              />
          </div>
        </div>

          {/* Info */}
          <div className="md:col-span-5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both pl-0 sm:pl-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-wide">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(product.rating || 0)
                      ? "text-[#FFAD33] fill-[#FFAD33]"
                      : "text-slate-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-slate-400 font-medium">({product.reviewCount || 0} Reviews)</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className={`text-sm font-medium ${isOutOfStock ? "text-red-500" : "text-[#00FF66]"}`}>
              {isOutOfStock ? "Out of Stock" : `In Stock (${availableStock})`}
            </span>
          </div>

          {/* Price */}
          <div className="text-2xl font-medium text-slate-900 dark:text-white mb-6">
            {formatCurrency(product.price)}
          </div>

          {/* Short Description */}
          <p className="text-sm text-slate-900 dark:text-slate-300 mb-6 leading-relaxed border-b border-slate-300 dark:border-slate-700 pb-6">
            {product.shortDescription || "PlayStation 5 Controller Skin High quality vinyl with air channel adhesive for easy bubble free install & mess free removal Pressure sensitive."}
          </p>

          {/* Seller Info */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-6 border border-slate-100 dark:border-slate-700/60">
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
                  <Star className="h-3 w-3 text-[#FFAD33] fill-[#FFAD33]" />
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

          {/* Dynamic Colours */}
          {hasColours && (
            <div className="flex items-center gap-6 mb-6">
              <span className="text-xl text-slate-900 dark:text-white tracking-wide">Colours:</span>
              <div className="flex gap-2">
                {productColours.map((color, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border-2 transition-all outline-hidden ${selectedColor === color ? 'border-slate-900 dark:border-white shadow-md scale-110' : 'border-transparent'}`}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Size */}
          {hasSizes && (
            <div className="flex items-center gap-6 mb-10">
              <span className="text-xl text-slate-900 dark:text-white tracking-wide">Size:</span>
              <div className="flex flex-wrap gap-3">
                {productSizes.map(s => (
                  <button 
                    key={s} 
                    onClick={() => setSelectedSize(s)}
                    className={`min-w-[32px] h-8 px-2 rounded border flex items-center justify-center text-sm font-medium transition-colors outline-hidden ${selectedSize === s ? 'bg-[#DB4444] text-white border-[#DB4444]' : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="flex flex-wrap items-center gap-4 mb-6 sm:mb-10 mt-6 sm:mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
              <div className="flex items-center h-[44px] border border-slate-300 dark:border-slate-600 rounded shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-full flex items-center justify-center hover:bg-[#DB4444] hover:text-white text-slate-900 dark:text-white text-xl transition-colors border-r border-slate-300 dark:border-slate-600 hover:border-transparent outline-hidden"
                >
                  -
                </button>
                <span className="w-16 h-full flex items-center justify-center text-slate-900 dark:text-white font-medium text-lg border-y-0">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(availableStock || 99, quantity + 1))}
                  className="w-10 h-full flex items-center justify-center hover:bg-[#DB4444] hover:text-white text-slate-900 dark:text-white text-xl transition-colors border-l border-slate-300 dark:border-slate-600 hover:border-transparent outline-hidden"
                >
                  +
                </button>
              </div>
              
              <button
                disabled={isOutOfStock}
                onClick={() => {
                  const attributes: Record<string, string> = {
                    color: selectedColor || undefined,
                    size: selectedSize || undefined,
                  };
                  if (!isAuthenticated) {
                    addGuestCartItem({
                      productId: product.id,
                      name: product.name,
                      slug: product.slug,
                      price: product.price,
                      imageUrl: product.images?.[0]?.imageUrl || "",
                      quantity,
                      attributes,
                    });
                    window.dispatchEvent(new Event("guest-cart-updated"));
                    setAddedToCart(true);
                  } else {
                    addToCart.mutate({ productId: product.id, quantity, attributes }, {
                      onSuccess: () => {
                        setAddedToCart(true);
                      }
                    });
                  }
                }}
                className={`h-[44px] px-6 rounded font-medium transition-all duration-300 outline-hidden hover:scale-105 active:scale-95 whitespace-nowrap flex-1 sm:flex-none ${isOutOfStock ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "border-2 border-[#DB4444] text-[#DB4444] hover:bg-red-50 dark:hover:bg-[#DB4444]/10"}`}
              >
                {isOutOfStock ? "Out of Stock" : (addedToCart ? "Added" : "Add to Cart")}
              </button>

              <button
                disabled={isOutOfStock}
                onClick={() => {
                  const attributes: Record<string, string> = {
                    color: selectedColor || undefined,
                    size: selectedSize || undefined,
                  };
                  if (!isAuthenticated) {
                    addGuestCartItem({
                      productId: product.id,
                      name: product.name,
                      slug: product.slug,
                      price: product.price,
                      imageUrl: product.images?.[0]?.imageUrl || "",
                      quantity,
                      attributes,
                    });
                    window.dispatchEvent(new Event("guest-cart-updated"));
                    setAddedToCart(true);
                    navigate("/checkout");
                    return;
                  }
                  addToCart.mutate({ productId: product.id, quantity, attributes }, {
                    onSuccess: () => {
                      navigate("/checkout");
                    }
                  });
                }}
                className={`h-[44px] px-8 rounded font-medium transition-all duration-300 outline-hidden hover:scale-105 active:scale-95 whitespace-nowrap flex-1 sm:flex-none ${isOutOfStock ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-[#DB4444] hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30 text-white"}`}
              >
                {isOutOfStock ? "Out of Stock" : "Buy Now"}
              </button>

              <button
                onClick={() => {
                  if (isInWishlist) {
                    removeFromWishlist.mutate({ wishlistId: wishlistItem.id });
                  } else {
                    addToWishlist.mutate({ productId: product.id });
                  }
                }}
                className="h-[44px] w-[44px] flex items-center justify-center border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 hover:scale-110 active:scale-95 shrink-0 outline-hidden group"
              >
                <Heart className={`w-5 h-5 transition-colors group-hover:animate-pulse ${isInWishlist ? "fill-red-500 text-red-500" : "text-slate-900 dark:text-white"}`} />
              </button>
          </div>

          {/* Delivery Info */}
          <div className="border border-slate-300 dark:border-slate-600 rounded divide-y divide-slate-300 dark:divide-slate-600">
            <div className="p-4 flex gap-4 items-center">
              <Truck className="h-8 w-8 text-slate-900 dark:text-white shrink-0" />
              <div>
                <p className="text-base font-medium text-slate-900 dark:text-white">Free Delivery</p>
                <p className="text-xs font-medium text-slate-900 dark:text-white underline mt-1 cursor-pointer hover:text-slate-600">Enter your postal code for Delivery Availability</p>
              </div>
            </div>
            <div className="p-4 flex gap-4 items-center">
              <RotateCcw className="h-8 w-8 text-slate-900 dark:text-white shrink-0" />
              <div>
                <p className="text-base font-medium text-slate-900 dark:text-white">Return Delivery</p>
                <p className="text-xs font-medium text-slate-900 dark:text-white mt-1">Free 30 Days Delivery Returns. <span className="underline cursor-pointer hover:text-slate-600">Details</span></p>
              </div>
            </div>
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
        <div className="mb-12 mt-16 animate-fade-up">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-5 h-10 bg-[#DB4444] rounded-sm"></div>
            <h2 className="text-xl font-bold text-[#DB4444]">Related Item</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {recommendations.slice(0,4).map((item: any) => {
              const itemDiscount = item.comparePrice ? Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100) : 0;
              return (
              <div
                key={item.id}
                className="group relative flex flex-col bg-transparent"
              >
                <div className="relative bg-[#F5F5F5] dark:bg-slate-800 rounded-sm aspect-[4/3] overflow-hidden mb-4 flex items-center justify-center p-6 cursor-pointer">
                  {item.comparePrice && (
                    <div className="absolute top-3 left-3 bg-[#DB4444] text-white text-xs font-medium px-3 py-1 rounded shadow-sm z-10">
                      -{itemDiscount}%
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-10 translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} 
                      className="w-8 h-8 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-100 transition-colors"
                    >
                      <Heart className="w-4 h-4 text-slate-900 dark:text-white" />
                    </button>
                    <Link to={`/product/${item.slug}`} className="w-8 h-8 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-100 transition-colors">
                      <Eye className="w-4 h-4 text-slate-900 dark:text-white" />
                    </Link>
                  </div>
                  <Link to={`/product/${item.slug}`} className="w-full h-full block relative z-0">
                    <img
                      src={item.imageUrl || ""}
                      alt={item.name}
                      className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  </Link>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      if (!isAuthenticated) {
                        addGuestCartItem({
                          productId: item.id,
                          name: item.name,
                          slug: item.slug,
                          price: item.price,
                          imageUrl: item.imageUrl || "",
                          quantity: 1,
                        });
                        window.dispatchEvent(new Event("guest-cart-updated"));
                        navigate("/cart");
                        return;
                      }
                      addToCart.mutate({ productId: item.id, quantity: 1 });
                    }}
                    className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform bg-black hover:bg-slate-900 text-white text-center py-2.5 text-sm font-medium z-10"
                  >
                    Add To Cart
                  </button>
                </div>
                <Link to={`/product/${item.slug}`}>
                  <h4 className="font-medium text-slate-900 dark:text-white text-base mb-2 hover:text-[#DB4444] transition-colors truncate">
                    {item.name}
                  </h4>
                </Link>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-[#DB4444]">{formatCurrency(item.price)}</span>
                  {item.comparePrice && (
                    <span className="text-slate-400 line-through font-medium">{formatCurrency(item.comparePrice)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= Math.round(item.rating || 0)
                            ? "text-[#FFAD33] fill-[#FFAD33]"
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-400 font-semibold">({item.reviewCount || 0})</span>
                </div>
              </div>
            )})}
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

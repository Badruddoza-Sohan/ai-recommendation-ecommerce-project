import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/currency";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Package,
  Send,
  ShoppingBag,
  Star,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";

type RecordValue = Record<string, unknown>;

const TAB_CLASSES = {
  sales:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  inventory:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  reviews:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
  ask: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60",
  orders:
    "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/60",
} as const;

const ORDER_STEPS = ["pending", "processing", "shipped", "delivered"] as const;

const ORDER_ROW_ACCENTS = {
  pending: "border-amber-200 hover:border-amber-400 dark:border-amber-900/60",
  processing: "border-cyan-200 hover:border-cyan-400 dark:border-cyan-900/60",
  shipped: "border-blue-200 hover:border-blue-400 dark:border-blue-900/60",
  delivered:
    "border-emerald-200 hover:border-emerald-400 dark:border-emerald-900/60",
} as const;

const ORDER_STEP_STYLES = {
  pending: {
    dot: "border-amber-500 bg-amber-500",
    current: "border-amber-500 bg-white",
    text: "text-amber-700 dark:text-amber-300",
    line: "bg-amber-400",
  },
  processing: {
    dot: "border-cyan-500 bg-cyan-500",
    current: "border-cyan-500 bg-white",
    text: "text-cyan-700 dark:text-cyan-300",
    line: "bg-cyan-400",
  },
  shipped: {
    dot: "border-blue-500 bg-blue-500",
    current: "border-blue-500 bg-white",
    text: "text-blue-700 dark:text-blue-300",
    line: "bg-blue-400",
  },
  delivered: {
    dot: "border-emerald-500 bg-emerald-500",
    current: "border-emerald-500 bg-white",
    text: "text-emerald-700 dark:text-emerald-300",
    line: "bg-emerald-400",
  },
} as const;

const STOP_WORDS = new Set([
  "this",
  "that",
  "with",
  "have",
  "very",
  "from",
  "your",
  "product",
  "the",
  "and",
  "for",
  "was",
  "are",
  "but",
  "not",
  "they",
  "you",
]);

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateLabel(value: unknown) {
  if (!value) return "Date unavailable";
  const date = new Date(numberValue(value));
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString();
}

function orderItems(value: unknown) {
  return Array.isArray(value) ? (value as RecordValue[]) : [];
}

function reviewThemes(reviews: RecordValue[]) {
  const counts = new Map<string, number>();
  reviews.forEach(review => {
    const words =
      `${review.title || ""} ${review.comment || ""}`
        .toLowerCase()
        .match(/[a-z]{3,}/g) || [];
    words
      .filter((word: string) => !STOP_WORDS.has(word))
      .forEach((word: string) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

function answerFromData(
  question: string,
  products: RecordValue[],
  orders: RecordValue[],
  reviews: RecordValue[],
  dashboard: RecordValue | undefined
) {
  const query = question.toLowerCase();
  const revenue = orders.reduce(
    (sum, order) => sum + numberValue(order.totalAmount),
    0
  );
  const inventoryMatches = products.filter(
    product =>
      numberValue(product.quantity) <=
      numberValue(product.lowStockThreshold ?? 5)
  );
  const bestSeller = [...products].sort(
    (a, b) => numberValue(b.soldCount) - numberValue(a.soldCount)
  )[0];
  const positive = reviews.filter(review => numberValue(review.rating) >= 4);
  const negative = reviews.filter(review => numberValue(review.rating) <= 2);
  const monthlySales = (dashboard?.monthlySales || []) as RecordValue[];
  const customers = (dashboard?.customers || []) as RecordValue[];
  const promotions = (dashboard?.promotions || []) as RecordValue[];
  const messages = (dashboard?.messages || []) as RecordValue[];
  const priceMatch = query.match(
    /(?:above|over|more than|greater than|>=)\s*(?:bdt|৳)?\s*([\d,]+)/i
  );
  if (priceMatch) {
    const threshold = Number(priceMatch[1].replace(/,/g, ""));
    const matchingProducts = products.filter(
      product => numberValue(product.price) > threshold
    );
    return matchingProducts.length
      ? `Products above ${formatCurrency(threshold)}: ${matchingProducts.map(product => `${product.name} (${formatCurrency(numberValue(product.price))})`).join(", ")}.`
      : `No seller products are priced above ${formatCurrency(threshold)}.`;
  }
  const matchingProduct = products.find(product =>
    query.includes(String(product.name || "").toLowerCase())
  );
  const matchingOrder = orders.find(order =>
    query.includes(String(order.orderNumber || order.id || "").toLowerCase())
  );

  if (matchingProduct) {
    return `${matchingProduct.name}: price ${formatCurrency(numberValue(matchingProduct.price))}, ${numberValue(matchingProduct.quantity)} in stock, ${numberValue(matchingProduct.soldCount)} sold, rating ${numberValue(matchingProduct.rating).toFixed(1)}.`;
  }
  if (matchingOrder) {
    return `Order #${matchingOrder.orderNumber || matchingOrder.id}: ${matchingOrder.status || "status unavailable"}, ${formatCurrency(numberValue(matchingOrder.totalAmount))}, placed ${dateLabel(matchingOrder.createdAt)}. It has ${Array.isArray(matchingOrder.items) ? matchingOrder.items.length : 0} item records.`;
  }

  if (/(stock|inventory|restock|quantity)/.test(query)) {
    return inventoryMatches.length
      ? `${inventoryMatches.length} product${inventoryMatches.length === 1 ? "" : "s"} need attention: ${inventoryMatches.map(item => `${item.name} (${numberValue(item.quantity)} left)`).join(", ")}.`
      : products.length
        ? "No products are currently at or below their recorded low-stock threshold."
        : "Inventory data is unavailable.";
  }
  if (/(review|feedback|customer think|rating)/.test(query)) {
    if (!reviews.length) return "Review data is unavailable.";
    return `I found ${reviews.length} recent review${reviews.length === 1 ? "" : "s"}: ${positive.length} positive and ${negative.length} negative. Common positive terms: ${reviewThemes(positive).join(", ") || "not enough repeated terms"}. Common negative terms: ${reviewThemes(negative).join(", ") || "not enough repeated terms"}.`;
  }
  if (/(best sell|top product|popular|sold)/.test(query)) {
    return bestSeller
      ? `${bestSeller.name} is the best-selling product in the catalog, with ${numberValue(bestSeller.soldCount)} recorded sale${numberValue(bestSeller.soldCount) === 1 ? "" : "s"}.`
      : "Sales product data is unavailable.";
  }
  if (/(sale|sales|revenue|order|earning)/.test(query)) {
    return orders.length
      ? `The loaded seller order data contains ${orders.length} order${orders.length === 1 ? "" : "s"}, totaling ${formatCurrency(revenue)}.`
      : "Order and sales data is unavailable.";
  }
  if (/(month|monthly|trend|performance)/.test(query)) {
    return monthlySales.length
      ? `The latest recorded sales period is ${monthlySales[0].month || "unavailable"}, with ${numberValue(monthlySales[0].count)} sales totaling ${formatCurrency(numberValue(monthlySales[0].total))}.`
      : "Monthly sales data is unavailable.";
  }
  if (/(customer|buyer|client)/.test(query)) {
    return customers.length
      ? `Your seller dashboard has ${customers.length} recorded customer${customers.length === 1 ? "" : "s"}.`
      : "Customer data is unavailable.";
  }
  if (/(promotion|promotions|discount|offer)/.test(query)) {
    return promotions.length
      ? `${promotions.length} active promotion${promotions.length === 1 ? "" : "s"} are recorded: ${promotions
          .map(item => item.name)
          .filter(Boolean)
          .join(", ")}.`
      : "Promotion data is unavailable.";
  }
  if (/(message|notification|alert)/.test(query)) {
    return messages.length
      ? `There are ${messages.length} seller dashboard notification${messages.length === 1 ? "" : "s"} loaded. Latest: ${messages[0].title || messages[0].message || "Notification text unavailable"}.`
      : "Notification data is unavailable.";
  }
  if (/(price|catalog|product)/.test(query)) {
    return products.length
      ? `The catalog contains ${products.length} seller products. Ask about a product name for its price, stock, sold count, and rating.`
      : "Product data is unavailable.";
  }
  return "I can answer questions about your recorded sales, orders, inventory, products, and reviews. That information is unavailable for this question unless it appears in the seller data loaded here.";
}

export default function AIAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sellerEnabled =
    !!user &&
    ["seller", "admin"].includes((user as { role?: string }).role || "");
  const { data: dashboard, isLoading: dashboardLoading } =
    trpc.seller.dashboard.useQuery(undefined, { enabled: sellerEnabled });
  const { data: products, isLoading: productsLoading } =
    trpc.seller.listProducts.useQuery(undefined, { enabled: sellerEnabled });
  const { data: orders, isLoading: ordersLoading } =
    trpc.seller.getOrders.useQuery(undefined, { enabled: sellerEnabled });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<
    "sales" | "inventory" | "reviews" | "ask" | "orders"
  >("sales");
  const [selectedOrder, setSelectedOrder] = useState<RecordValue | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<RecordValue | null>(
    null
  );
  const [selectedReview, setSelectedReview] = useState<RecordValue | null>(
    null
  );
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "positive" | "negative" | "neutral"
  >("all");

  const productRows = useMemo(
    () => (products || []) as RecordValue[],
    [products]
  );
  const orderRows = useMemo(() => (orders || []) as RecordValue[], [orders]);
  const reviewRows = useMemo(
    () =>
      ((dashboard as RecordValue | undefined)?.reviews || []) as RecordValue[],
    [dashboard]
  );
  const stats = (dashboard as RecordValue | undefined)?.stats as
    | RecordValue
    | undefined;
  const lowStock = useMemo(
    () =>
      productRows.filter(
        product =>
          numberValue(product.quantity) <=
          numberValue(product.lowStockThreshold ?? 5)
      ),
    [productRows]
  );
  const bestSellers = useMemo(
    () =>
      [...productRows]
        .sort((a, b) => numberValue(b.soldCount) - numberValue(a.soldCount))
        .slice(0, 5),
    [productRows]
  );
  const positiveReviews = reviewRows.filter(
    review => numberValue(review.rating) >= 4
  );
  const negativeReviews = reviewRows.filter(
    review => numberValue(review.rating) <= 2
  );
  const neutralReviews = reviewRows.filter(
    review => numberValue(review.rating) === 3
  );
  const visibleReviews =
    reviewFilter === "positive"
      ? positiveReviews
      : reviewFilter === "negative"
        ? negativeReviews
        : reviewFilter === "neutral"
          ? neutralReviews
          : reviewRows;
  const loading = dashboardLoading || productsLoading || ordersLoading;

  const submitQuestion = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setAnswer(
      answerFromData(
        question,
        productRows,
        orderRows,
        reviewRows,
        dashboard as RecordValue | undefined
      )
    );
    setQuestion("");
  };

  if (!user || !sellerEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Seller Access Required
          </h2>
          <p className="mt-2 text-slate-500">
            You need a seller account to access this assistant.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-full bg-[#f6f7fb] px-4 py-7 dark:bg-[#0b1220] sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1360px] space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200/80 pb-6 dark:border-slate-800">
          <div>
            <Link
              to="/seller"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Seller Hub
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-900">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
                  Seller workspace
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  Seller AI Assistant
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              A focused view of your store performance, stock health, and
              customer voice.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <span
              className={`h-2 w-2 rounded-full ${loading ? "bg-amber-500" : "bg-emerald-500"}`}
            />
            {loading ? "Loading seller data" : "Live seller data"}
          </span>
        </header>

        <nav
          className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/75 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/75"
          aria-label="Seller assistant sections"
        >
          {(
            [
              ["sales", "Sales Insight"],
              ["inventory", "Inventory Alert"],
              ["reviews", "Review Summary"],
              ["ask", "Ask AI"],
              ["orders", "Recent Orders"],
            ] as const
          ).map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                setActiveView(view);
                setSelectedOrder(null);
                setSelectedProduct(null);
                setSelectedReview(null);
              }}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition-all hover:-translate-y-0.5 ${TAB_CLASSES[view]} ${activeView === view ? "ring-2 ring-offset-1 dark:ring-offset-slate-900" : "opacity-75 hover:opacity-100"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="grid gap-5 lg:grid-cols-12">
          <article
            className={`${activeView === "sales" ? "" : "hidden"} rounded-[1.35rem] border border-blue-200/80 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/70 p-6 shadow-[0_12px_35px_rgba(37,99,235,0.10)] dark:border-blue-900/60 dark:from-slate-900 dark:via-blue-950/20 dark:to-indigo-950/30 lg:col-span-7`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Sales Insight
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  Recent sales and best sellers
                </h2>
              </div>
              <TrendingUp className="h-6 w-6 text-indigo-500" />
            </div>
            {stats || orderRows.length ? (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
                    <p className="text-xs text-slate-500">Recorded sales</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {numberValue(
                        stats?.totalSales || orderRows.length
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-teal-50 p-4 dark:bg-teal-950/30">
                    <p className="text-xs text-slate-500">Revenue</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(numberValue(stats?.totalRevenue))}
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {bestSellers.length ? (
                    bestSellers.map(product => (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() =>
                          navigate(
                            `/seller?tab=products&productId=${product.id}`
                          )
                        }
                        className="flex w-full items-center justify-between border-b border-slate-100 py-3 text-left text-sm transition hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                          <ShoppingBag className="h-4 w-4 text-blue-500" />
                          {product.name}
                        </span>
                        <span className="flex items-center gap-2 font-semibold text-slate-500">
                          {numberValue(product.soldCount)} sold{" "}
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Best-selling product data is unavailable.
                    </p>
                  )}
                </div>
                {selectedProduct && (
                  <ProductDetails
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                  />
                )}
              </>
            ) : (
              <Unavailable text="Sales data is unavailable." />
            )}
          </article>

          <article
            className={`${activeView === "inventory" ? "" : "hidden"} rounded-[1.35rem] border border-amber-200/80 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/70 p-6 shadow-[0_12px_35px_rgba(245,158,11,0.10)] dark:border-amber-900/60 dark:from-slate-900 dark:via-amber-950/20 dark:to-orange-950/30 lg:col-span-5`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Inventory Alert
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  Products with low stock
                </h2>
              </div>
              <Boxes className="h-6 w-6 text-amber-500" />
            </div>
            {productRows.length ? (
              lowStock.length ? (
                <div className="mt-5 space-y-3">
                  {lowStock.map(product => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-400 dark:border-amber-900/50 dark:bg-amber-950/20"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Threshold:{" "}
                            {numberValue(product.lowStockThreshold ?? 5)}
                          </p>
                        </div>
                      </div>
                      <span className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                        {numberValue(product.quantity)} left{" "}
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                  {selectedProduct && (
                    <ProductDetails
                      product={selectedProduct}
                      onClose={() => setSelectedProduct(null)}
                    />
                  )}
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> No products are below
                  their recorded threshold.
                </div>
              )
            ) : (
              <Unavailable text="Inventory data is unavailable." />
            )}
          </article>

          <article
            className={`${activeView === "reviews" ? "" : "hidden"} rounded-[1.35rem] border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/40 to-pink-50/70 p-6 shadow-[0_12px_35px_rgba(244,63,94,0.10)] dark:border-rose-900/60 dark:from-slate-900 dark:via-rose-950/20 dark:to-pink-950/30 lg:col-span-5`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  Review Summary
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  What customers are saying
                </h2>
              </div>
              <Star className="h-6 w-6 text-rose-500" />
            </div>
            {reviewRows.length ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewFilter("positive")}
                    className={`rounded-xl p-4 text-left transition ${reviewFilter === "positive" ? "bg-emerald-100 ring-2 ring-emerald-400 dark:bg-emerald-950/50" : "bg-emerald-50 dark:bg-emerald-950/30"}`}
                  >
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <CheckCircle2 className="h-3 w-3" /> Positive
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {positiveReviews.length}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter("negative")}
                    className={`rounded-xl p-4 text-left transition ${reviewFilter === "negative" ? "bg-rose-100 ring-2 ring-rose-400 dark:bg-rose-950/50" : "bg-rose-50 dark:bg-rose-950/30"}`}
                  >
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <XCircle className="h-3 w-3" /> Negative
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {negativeReviews.length}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter("neutral")}
                    className={`rounded-xl bg-amber-50 p-4 text-left transition dark:bg-amber-950/30 ${reviewFilter === "neutral" ? "ring-2 ring-amber-400" : ""}`}
                  >
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Star className="h-3 w-3" /> Neutral
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {neutralReviews.length}
                    </p>
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <strong>Total:</strong> {reviewRows.length}{" "}
                    <span className="text-slate-400">·</span>{" "}
                    <strong>Positive:</strong>{" "}
                    {reviewThemes(positiveReviews).join(", ") ||
                      "No repeated terms"}
                    . <strong>Negative:</strong>{" "}
                    {reviewThemes(negativeReviews).join(", ") ||
                      "No repeated terms"}
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => setReviewFilter("all")}
                    className="shrink-0 text-xs font-bold text-rose-600 hover:text-rose-800"
                  >
                    All reviews
                  </button>
                </div>
                <div className="mt-5 space-y-2">
                  {visibleReviews.length ? (
                    visibleReviews.map(review => (
                      <button
                        type="button"
                        key={review.id}
                        onClick={() => setSelectedReview(review)}
                        className="flex w-full items-start justify-between gap-4 rounded-xl border border-slate-100 p-4 text-left transition hover:border-rose-300 hover:bg-rose-50/40 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <User className="h-4 w-4 text-rose-500" />
                            {review.customerName || "Customer unavailable"}
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {review.productName || "Product unavailable"}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-bold text-amber-500">
                          ★ {numberValue(review.rating).toFixed(1)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <Unavailable
                      text={`No ${reviewFilter === "all" ? "" : `${reviewFilter} `}reviews are available.`}
                    />
                  )}
                </div>
                {selectedReview && (
                  <ReviewDetails
                    review={selectedReview}
                    onClose={() => setSelectedReview(null)}
                  />
                )}
              </>
            ) : (
              <Unavailable text="Review data is unavailable." />
            )}
          </article>

          <article
            className={`${activeView === "ask" ? "" : "hidden"} rounded-[1.35rem] border border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50/40 to-sky-50/70 p-6 shadow-[0_12px_35px_rgba(8,145,178,0.10)] dark:border-cyan-900/60 dark:from-slate-900 dark:via-cyan-950/20 dark:to-sky-950/30 lg:col-span-7`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600">
                  Ask AI
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  Ask about your store
                </h2>
              </div>
              <MessageSquare className="h-6 w-6 text-sky-500" />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Ask AI can search all seller dashboard data loaded here: products,
              prices, orders, sales, stock, customers, reviews, promotions, and
              messages.
            </p>
            <form onSubmit={submitQuestion} className="mt-5 flex gap-2">
              <input
                value={question}
                onChange={event => setQuestion(event.target.value)}
                placeholder="e.g. Which products need restocking?"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="submit"
                aria-label="Ask AI"
                className="rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-500"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            {answer && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm leading-6 text-slate-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-slate-200">
                <Bot className="mr-2 inline h-4 w-4 text-indigo-600" />
                {answer}
              </div>
            )}
          </article>
        </section>

        <section
          className={`${activeView === "orders" ? "" : "hidden"} rounded-[1.35rem] border border-teal-200/80 bg-gradient-to-br from-white via-teal-50/40 to-emerald-50/70 p-6 shadow-[0_12px_35px_rgba(13,148,136,0.10)] dark:border-teal-900/60 dark:from-slate-900 dark:via-teal-950/20 dark:to-emerald-950/30`}
        >
          <div className="flex max-w-2xl items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
              <Package className="h-5 w-5 text-teal-600" /> Recent orders
            </h2>
            <span className="text-xs font-medium text-slate-400">
              Select an order for details
            </span>
          </div>
          {orderRows.length ? (
            <div className="mt-4 w-full max-w-2xl space-y-1.5">
              {orderRows.slice(0, 8).map((order, index) => {
                const status = String(order.status || "pending").toLowerCase();
                const accent =
                  ORDER_ROW_ACCENTS[status as keyof typeof ORDER_ROW_ACCENTS] ||
                  ORDER_ROW_ACCENTS.pending;
                return (
                  <div key={order.id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className={`group flex w-full items-center gap-2.5 rounded-lg border bg-white/75 px-2.5 py-1.5 text-left transition hover:bg-white dark:bg-slate-950/50 dark:hover:bg-slate-900 ${accent}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-100 text-[10px] font-extrabold text-teal-700 dark:bg-teal-950/70 dark:text-teal-300">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        #{order.orderNumber || order.id}
                      </p>
                      <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-teal-600" />
                    </button>
                    {selectedOrder?.id === order.id && (
                      <SellerOrderTracking
                        order={order}
                        sellerName={String(
                          ((dashboard as RecordValue | undefined)?.seller &&
                            ((dashboard as RecordValue).seller as RecordValue)
                              .businessName) ||
                            "Marketplace Seller"
                        )}
                        onClose={() => setSelectedOrder(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Unavailable text="Recent order data is unavailable." />
          )}
        </section>
      </div>
    </main>
  );
}

function SellerOrderTracking({
  order,
  sellerName,
  onClose,
}: {
  order: RecordValue;
  sellerName: string;
  onClose: () => void;
}) {
  const status = String(order.status || "pending");
  const statusKey = ORDER_STEPS.includes(status as (typeof ORDER_STEPS)[number])
    ? (status as (typeof ORDER_STEPS)[number])
    : "pending";
  const currentIndex = ORDER_STEPS.indexOf(statusKey);
  const statusStyle = ORDER_STEP_STYLES[statusKey];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900/95">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            {statusKey}
          </p>
          <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
            #{order.orderNumber || order.id}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <CalendarDays className="h-3 w-3" />
            {dateLabel(order.createdAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          Close
        </button>
      </div>
      <p className="mt-3 border-b border-slate-200 pb-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <span className="font-bold">Seller:</span> {sellerName}
      </p>
      <div className="mt-3 space-y-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        {orderItems(order.items).length ? (
          orderItems(order.items).map(item => (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {item.imageUrl ? (
                  <img
                    src={String(item.imageUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                {item.productName || "Product"} ×{numberValue(item.quantity)}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(numberValue(item.totalPrice))}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">Product details unavailable.</p>
        )}
      </div>
      <div className="mt-3 space-y-1 border-b border-slate-200 pb-3 text-xs dark:border-slate-700">
        <div className="flex justify-between">
          <span className="font-bold text-slate-600 dark:text-slate-300">
            Payment
          </span>
          <span>{order.paymentStatus || "Pending"}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold text-slate-600 dark:text-slate-300">
            Delivery
          </span>
          <span>{order.shippingStatus || status}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="font-bold text-slate-600 dark:text-slate-300">
            Total
          </span>
          <span className="font-extrabold text-slate-900 dark:text-white">
            {formatCurrency(numberValue(order.totalAmount))}
          </span>
        </div>
      </div>
      <div className="relative mt-4 flex items-start justify-between px-[12.5%] pt-1">
        <span className="absolute left-[12.5%] right-[12.5%] top-[7px] h-px bg-slate-300 dark:bg-slate-700" />
        {currentIndex > 0 && (
          <span
            className={`absolute left-[12.5%] top-[7px] h-px ${statusStyle.line}`}
            style={{
              width: `${(currentIndex / (ORDER_STEPS.length - 1)) * 75}%`,
            }}
          />
        )}
        {ORDER_STEPS.map((step, index) => (
          <div
            key={step}
            className="relative z-10 flex min-w-0 flex-col items-center gap-1 text-center"
          >
            <span
              className={`z-10 h-3 w-3 rounded-full border-2 ${statusKey === step ? `${statusStyle.current} ring-2 ring-offset-1` : currentIndex > index ? ORDER_STEP_STYLES[step].dot : "border-slate-300 bg-slate-300 dark:border-slate-700 dark:bg-slate-700"}`}
            />
            <span
              className={`truncate text-[9px] capitalize ${statusKey === step ? `font-extrabold ${statusStyle.text}` : "text-slate-500"}`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        Estimated delivery:{" "}
        {order.estimatedDeliveryDate
          ? dateLabel(order.estimatedDeliveryDate)
          : order.estimatedDeliveryDays
            ? `${order.estimatedDeliveryDays} days`
            : "Not available"}
      </p>
    </div>
  );
}

function ProductDetails({
  product,
  onClose,
}: {
  product: RecordValue;
  onClose: () => void;
}) {
  return (
    <div className="mt-5 max-h-[62vh] overflow-y-auto rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Product details
          </p>
          <h3 className="mt-1 font-bold text-slate-900 dark:text-white">
            {product.name || "Product unavailable"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          Close
        </button>
      </div>
      <div className="mt-4 flex gap-4 rounded-xl bg-white/70 p-3 dark:bg-slate-900/50">
        {product.imageUrl ? (
          <img
            src={String(product.imageUrl)}
            alt=""
            className="h-20 w-20 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <ShoppingBag className="h-7 w-7" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {product.categoryName || "Category unavailable"}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700 dark:text-slate-200">
            {product.shortDescription ||
              product.description ||
              "Product description unavailable."}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Price</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {formatCurrency(numberValue(product.price))}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Stock</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {numberValue(product.quantity)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Sold</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {numberValue(product.soldCount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Rating</p>
          <p className="mt-1 font-semibold text-amber-600">
            ★ {numberValue(product.rating).toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {product.status || "Unavailable"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">SKU</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {product.sku || "Unavailable"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Low-stock threshold</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {numberValue(product.lowStockThreshold)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Warehouse</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {product.warehouseLocation || "Unavailable"}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 border-t border-blue-200/70 pt-4 text-sm dark:border-blue-900/60 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Compare price</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {product.comparePrice
              ? formatCurrency(numberValue(product.comparePrice))
              : "Unavailable"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Variants</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {Array.isArray(product.variants)
              ? `${product.variants.length} recorded`
              : "Unavailable"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewDetails({
  review,
  onClose,
}: {
  review: RecordValue;
  onClose: () => void;
}) {
  const isPositive = numberValue(review.rating) >= 4;
  return (
    <div
      className={`mt-5 rounded-xl border p-4 ${isPositive ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-wider ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
          >
            {isPositive ? "Positive review" : "Negative review"}
          </p>
          <h3 className="mt-1 font-bold text-slate-900 dark:text-white">
            {review.customerName || "Customer unavailable"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          Close
        </button>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="flex gap-2">
          <User className="h-4 w-4 text-rose-500" />
          <div>
            <p className="text-xs text-slate-500">Reviewer</p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
              {review.customerName || "Unavailable"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ShoppingBag className="h-4 w-4 text-rose-500" />
          <div>
            <p className="text-xs text-slate-500">Product</p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
              {review.productName || "Unavailable"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <CalendarDays className="h-4 w-4 text-rose-500" />
          <div>
            <p className="text-xs text-slate-500">Date and rating</p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
              {dateLabel(review.createdAt)} · ★{" "}
              {numberValue(review.rating).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-white/70 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
        <p className="font-semibold">{review.title || "Customer review"}</p>
        <p className="mt-1">
          {review.comment || "Review comment unavailable."}
        </p>
      </div>
    </div>
  );
}

function Unavailable({ text }: { text: string }) {
  return (
    <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
      <XCircle className="h-4 w-4" />
      {text}
    </div>
  );
}

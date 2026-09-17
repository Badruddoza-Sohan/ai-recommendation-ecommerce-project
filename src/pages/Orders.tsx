import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { formatCurrency } from "@/lib/currency";
import {
  Package,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20", icon: <Clock className="h-4 w-4" /> },
  processing: { label: "Processing", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20", icon: <RefreshCw className="h-4 w-4" /> },
  shipped: { label: "Shipped", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20", icon: <Truck className="h-4 w-4" /> },
  delivered: { label: "Delivered", color: "text-green-600 bg-green-50 dark:bg-green-900/20", icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50 dark:bg-red-900/20", icon: <XCircle className="h-4 w-4" /> },
  refunded: { label: "Refunded", color: "text-slate-600 bg-slate-50 dark:bg-slate-900/20", icon: <RefreshCw className="h-4 w-4" /> },
};

export default function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: orders, isLoading } = trpc.order.list.useQuery(undefined, {
    refetchInterval: 2500,
  });
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = (orders || []).filter((order) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || order.orderNumber.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedOrderId = params.get("orderId")?.trim();

    if (!requestedOrderId || !orders?.length) {
      return;
    }

    const normalizedRequested = requestedOrderId.toLowerCase();
    const matchedOrder = orders.find((order) => {
      const orderNumber = order.orderNumber?.toLowerCase() ?? "";
      return orderNumber.includes(normalizedRequested) || order.id.toString() === requestedOrderId;
    });

    if (matchedOrder) {
      setExpandedOrder(matchedOrder.id);
    }
  }, [location.search, orders]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 mb-8 text-sm font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
        
        <div className="py-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Orders Yet</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You haven't placed any orders yet. Start shopping and fill your history with amazing products!
              </p>
            </div>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all group"
          >
            Start Shopping
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 mb-6 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">Shopping history</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">My Orders</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{filteredOrders.length} of {orders.length} orders</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <span className="sr-only">Search orders</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by order number" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900" />
        </label>
        <label className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="sr-only">Filter orders by status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 min-w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <Package className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No matching orders</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try a different order number or status.</p>
        </div>
      ) : (
        <div className="space-y-4">
        {filteredOrders.map((order) => {
          const status = statusConfig[order.status] || statusConfig.pending;
          const isExpanded = expandedOrder === order.id;

          return (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Order Header */}
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 dark:text-white">{order.orderNumber}</p>
                    <p className="text-sm text-slate-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white hidden sm:block">
                    {formatCurrency(order.totalAmount)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Order Details */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 space-y-4">
                  {order.paymentStatus === "refunded" && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💰</span>
                        <div>
                          <p className="font-bold">100% Refund Processed ({formatCurrency(order.totalAmount)})</p>
                          <p className="opacity-90">Money was sent back to your original payment method.</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px]">REFUNDED</span>
                    </div>
                  )}

                  <div className="space-y-3 mb-4">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <img
                          src={item.imageUrl || ""}
                          alt={item.productName || ""}
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Qty: {item.quantity} x {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Shipping Address</p>
                        <p className="text-sm text-slate-500">{order.shippingAddress}</p>
                        <p className="text-sm text-slate-500">{order.shippingCity}</p>
                        <p className="text-sm text-slate-500 mt-2">Payment method: <strong className="uppercase text-slate-700 dark:text-slate-300">{order.paymentMethod || "COD"}</strong></p>
                        <p className="text-sm text-slate-500">Payment status: <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{order.paymentStatus || "pending"}</span></p>
                        <p className="text-sm text-slate-500">Tracking: {order.trackingNumber || "Pending"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">
                          Subtotal: <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(order.totalAmount - (order.taxAmount || order.totalAmount * 0.05) - (order.shippingAmount || 60))}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          Tax (5% VAT): <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(order.taxAmount || order.totalAmount * 0.05)}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          Courier Delivery ({order.courierName || "Steadfast / Pathao"}): <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(order.shippingAmount || 60)}</span>
                        </p>
                        <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          Total: {formatCurrency(order.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}

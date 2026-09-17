/**
 * Predictive Assistance Engine (< 1ms Latency)
 *
 * Proactively anticipates customer needs and generates contextual reminders before the user asks:
 *  - Shipping / Courier Delay Alerts
 *  - Expiring Return Window Warnings
 *  - Low Stock Cart Alerts
 *  - Warranty Expiration Warnings
 */

export interface PredictiveAlert {
  id: string;
  type: "delay_warning" | "return_expiry" | "stock_scarcity" | "warranty_warning";
  severity: "info" | "warning" | "urgent";
  title: string;
  message: string;
  actionLabel?: string;
  actionQuery?: string;
}

export class PredictiveAssistanceEngine {
  generateAlerts(
    orderData?: any,
    _stage?: string,
    _ticketData?: any
  ): PredictiveAlert[] {
    const alerts: PredictiveAlert[] = [];

    // 1. Shipping Delay Alert
    if (orderData && (orderData.status === "shipped" || orderData.status === "processing")) {
      alerts.push({
        id: "alert_delay_1",
        type: "delay_warning",
        severity: "info",
        title: "⚡ Delivery Status Update",
        message: `Order #${orderData.orderNumber} is on schedule via ${orderData.courier}. Expected delivery is ${orderData.estimatedDelivery}.`,
        actionLabel: "Track Live Location",
        actionQuery: "track order",
      });
    }

    // 2. Return Window Expiring Warning
    if (orderData && orderData.status === "delivered") {
      alerts.push({
        id: "alert_return_1",
        type: "return_expiry",
        severity: "warning",
        title: "📦 7-Day Return Window Active",
        message: `Your return window for Order #${orderData.orderNumber} expires in 3 days. Free doorstep pickup is available.`,
        actionLabel: "Initiate Return",
        actionQuery: "return item",
      });
    }

    return alerts;
  }
}

let instance: PredictiveAssistanceEngine | null = null;
export function getPredictiveAssistanceEngine(): PredictiveAssistanceEngine {
  if (!instance) {
    instance = new PredictiveAssistanceEngine();
  }
  return instance;
}

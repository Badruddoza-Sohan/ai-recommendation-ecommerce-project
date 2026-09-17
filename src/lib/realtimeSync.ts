/**
 * Real-Time Multi-Tab & Multi-Client Synchronization Engine
 * Uses browser BroadcastChannel API with window Event fallbacks to ensure
 * all tabs, admin consoles, seller hubs, and customer screens update live
 * without requiring any manual browser refreshes.
 */

export type RealtimeEventType =
  | "SELLER_APPLICATION"
  | "SELLER_STATUS_CHANGED"
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "PRODUCT_UPDATED"
  | "NOTIFICATION_CREATED"
  | "CART_UPDATED"
  | "SUPPORT_TICKET"
  | "USER_UPDATED"
  | "CATEGORY_UPDATED"
  | "GLOBAL_REFRESH"
  | "LOCAL_NOTIFICATION";

export interface RealtimeMessage {
  type: RealtimeEventType;
  payload?: any;
  timestamp: number;
  senderId: string;
}

const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel("marketverse_live_sync");
  }
} catch {
  // BroadcastChannel might be blocked in some restricted environments
}

/**
 * Broadcasts a live synchronization event across all browser tabs and components.
 */
export function broadcastLiveEvent(type: RealtimeEventType, payload?: any) {
  const message: RealtimeMessage = {
    type,
    payload,
    timestamp: Date.now(),
    senderId: TAB_ID,
  };

  // 1. Dispatch locally to current tab window
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("marketverse-live-event", { detail: message })
    );
  }

  // 2. Broadcast to all other open tabs/windows
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(message);
    }
  } catch (err) {
    console.debug("[RealtimeSync] BroadcastChannel postMessage failed:", err);
  }
}

/**
 * Subscribes to live synchronization events from all tabs.
 * Returns an unsubscribe callback.
 */
export function subscribeToLiveEvents(
  handler: (message: RealtimeMessage) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleLocalEvent = (e: Event) => {
    const customEvent = e as CustomEvent<RealtimeMessage>;
    if (customEvent.detail) {
      handler(customEvent.detail);
    }
  };

  const handleChannelMessage = (e: MessageEvent<RealtimeMessage>) => {
    if (e.data && e.data.senderId !== TAB_ID) {
      handler(e.data);
    }
  };

  window.addEventListener("marketverse-live-event", handleLocalEvent);
  if (broadcastChannel) {
    broadcastChannel.addEventListener("message", handleChannelMessage);
  }

  return () => {
    window.removeEventListener("marketverse-live-event", handleLocalEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener("message", handleChannelMessage);
    }
  };
}

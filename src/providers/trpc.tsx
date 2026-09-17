import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, createTRPCProxyClient } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import { useEffect, type ReactNode } from "react";
import { subscribeToLiveEvents, type RealtimeMessage } from "../lib/realtimeSync";

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1500, // Fresh within 1.5s, auto-refreshes seamlessly
      refetchOnWindowFocus: true, // Seamlessly update when tab is clicked/focused
      refetchOnReconnect: true, // Refresh instantly when internet re-establishes
      retry: 1,
    },
  },
});

// The provider client (untyped, used for Provider)
const providerClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// The vanilla proxy client (used outside of hooks)
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  // Listen for real-time cross-tab events and invalidate relevant queries immediately
  useEffect(() => {
    const unsubscribe = subscribeToLiveEvents((message: RealtimeMessage) => {
      console.log(`[TRPCProvider] Real-time event received: ${message.type}`, message.payload);

      switch (message.type) {
        case "SELLER_APPLICATION":
        case "SELLER_STATUS_CHANGED":
          queryClient.invalidateQueries({ queryKey: [["admin", "sellers"]] });
          queryClient.invalidateQueries({ queryKey: [["admin", "dashboard"]] });
          queryClient.invalidateQueries({ queryKey: [["notification", "list"]] });
          queryClient.invalidateQueries({ queryKey: [["notification", "unreadCount"]] });
          queryClient.invalidateQueries({ queryKey: [["seller", "dashboard"]] });
          break;

        case "ORDER_CREATED":
        case "ORDER_STATUS_CHANGED":
          queryClient.invalidateQueries({ queryKey: [["order", "list"]] });
          queryClient.invalidateQueries({ queryKey: [["admin", "orders"]] });
          queryClient.invalidateQueries({ queryKey: [["admin", "dashboard"]] });
          queryClient.invalidateQueries({ queryKey: [["seller", "getOrders"]] });
          queryClient.invalidateQueries({ queryKey: [["seller", "dashboard"]] });
          queryClient.invalidateQueries({ queryKey: [["notification", "list"]] });
          queryClient.invalidateQueries({ queryKey: [["notification", "unreadCount"]] });
          queryClient.invalidateQueries({ queryKey: [["cart", "get"]] });
          break;

        case "PRODUCT_UPDATED":
          queryClient.invalidateQueries({ queryKey: [["product", "list"]] });
          queryClient.invalidateQueries({ queryKey: [["product", "getBySlug"]] });
          queryClient.invalidateQueries({ queryKey: [["admin", "products"]] });
          queryClient.invalidateQueries({ queryKey: [["seller", "listProducts"]] });
          break;

        case "NOTIFICATION_CREATED":
          queryClient.invalidateQueries({ queryKey: [["notification", "list"]] });
          queryClient.invalidateQueries({ queryKey: [["notification", "unreadCount"]] });
          break;

        case "LOCAL_NOTIFICATION":
          queryClient.setQueryData([["notification", "list"]], (oldData: any) => {
            if (!Array.isArray(oldData)) return [message.payload];
            return [message.payload, ...oldData];
          });
          queryClient.setQueryData([["notification", "unreadCount"]], (oldData: any) => {
            return (typeof oldData === 'number' ? oldData : 0) + 1;
          });
          break;

        case "CART_UPDATED":
          queryClient.invalidateQueries({ queryKey: [["cart", "get"]] });
          break;

        case "SUPPORT_TICKET":
          queryClient.invalidateQueries({ queryKey: [["admin", "listTickets"]] });
          queryClient.invalidateQueries({ queryKey: [["admin", "listTicketMessages"]] });
          break;

        case "USER_UPDATED":
          queryClient.invalidateQueries({ queryKey: [["auth", "me"]] });
          queryClient.invalidateQueries({ queryKey: [["admin", "users"]] });
          break;

        default:
          queryClient.invalidateQueries();
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <trpc.Provider client={providerClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

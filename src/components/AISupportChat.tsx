import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  Send,
  ThumbsUp,
  ThumbsDown,
  Truck,
  CreditCard,
  RotateCcw,
  Package,
  Bot,
  Headphones,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: "text" | "order_info" | "knowledge" | "fallback" | "error" | "live_agent";
  orderData?: {
    orderNumber: string;
    status: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  };
  suggestions?: string[];
  confidence?: number;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISupportChat({ isOpen, onClose: _onClose }: SupportChatProps) {
  const { user, isAuthenticated } = useAuth();
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("marketverse_support_session_id");
      if (stored) return stored;
      const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("marketverse_support_session_id", newId);
      return newId;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedSession = localStorage.getItem("marketverse_support_session_id");
        if (storedSession) {
          const storedMsgs = localStorage.getItem(`marketverse_support_msgs_${storedSession}`);
          if (storedMsgs) return JSON.parse(storedMsgs);
        }
      } catch {}
    }
    return [];
  });

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [isLiveAgentMode, setIsLiveAgentMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 0 && sessionId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`marketverse_support_msgs_${sessionId}`, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, sessionId]);

  const { data: ticketSessionData, refetch: refetchTicket } = trpc.support.getTicketBySession.useQuery(
    { sessionId },
    { enabled: isOpen && !!sessionId, refetchInterval: 1500 }
  );

  const escalateMutation = trpc.support.escalateToLiveAgent.useMutation();
  const sendCustomerMsgMutation = trpc.support.sendCustomerMessage.useMutation();
  const persistMsgMutation = trpc.support.persistChatMessage.useMutation();

  const { data: persistentHistory } = trpc.support.getPersistentHistory.useQuery(
    { sessionId },
    { enabled: isOpen && !!sessionId }
  );

  useEffect(() => {
    if (persistentHistory && persistentHistory.length > 0) {
      setMessages((prev) => {
        if (prev.length === 0) return persistentHistory as any;
        return prev;
      });
    }
  }, [persistentHistory]);

  useEffect(() => {
    if (ticketSessionData?.ticket) {
      setIsLiveAgentMode(true);
    }
  }, [ticketSessionData]);

  useEffect(() => {
    if (isLiveAgentMode && ticketSessionData?.messages) {
      const converted: ChatMessage[] = ticketSessionData.messages.map((m: any) => ({
        id: `tm_${m.id}`,
        role: m.senderType === "user" ? "user" : "assistant",
        content: m.senderType === "user" ? m.message : `**[${m.senderName}]**: ${m.message}`,
        timestamp: m.createdAt,
        type: "live_agent",
      }));
      setMessages((prev) => {
        const nonLive = prev.filter((msg) => msg.type !== "live_agent");
        return [...nonLive, ...converted];
      });
    }
  }, [isLiveAgentMode, ticketSessionData?.messages]);

  // Lightweight markdown renderer for messages: handles **bold** and *italic* safely
  const escapeHtml = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const renderContent = (text: string) =>
    text.split("\n").map((line, i) => {
      const escaped = escapeHtml(line);
      const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      const withItalic = withBold.replace(/\*(.+?)\*/g, "<em>$1</em>");
      return (
        <p key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: withItalic }} />
      );
    });

  // Get contextual suggestions on mount
  const { data: suggestionsData } = (trpc as any).support?.getSuggestions?.useQuery(
    { context: window.location.pathname, userId: (user as any)?.id },
    { enabled: isOpen && showSuggestions }
  );

  const { data: agentStatus, refetch: refetchAgentStatus } = (trpc as any).mlSupport?.status?.useQuery(undefined, {
    enabled: isOpen,
  });
  const startMutation = (trpc as any).mlSupport?.start?.useMutation();
  const stopMutation = (trpc as any).mlSupport?.stop?.useMutation();
  const feedbackMutation = (trpc as any).support?.submitFeedback?.useMutation();

  useEffect(() => {
    if (suggestionsData?.suggestions) {
      setCurrentSuggestions(suggestionsData.suggestions);
    }
  }, [suggestionsData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        addWelcomeMessage();
      }
    }
  }, [isOpen]);

  const addWelcomeMessage = () => {
    const welcomeMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: `Hello! I'm your AI Support Assistant${isAuthenticated ? `, ${(user as any)?.name || "there"}` : ""}. ${isAuthenticated ? "I have access to your order history to provide personalized help." : "Log in for personalized order tracking."} How can I assist you today?`,
      timestamp: Date.now(),
      type: "knowledge",
      suggestions: [
        "Track my order",
        "Shipping information",
        "Return policy",
        "Payment methods",
        "Contact support",
      ],
    };
    setMessages([welcomeMsg]);
    setCurrentSuggestions(welcomeMsg.suggestions || []);
  };

  const userId = (user as any)?.id;

  const chatMutation = (trpc as any).brain?.chat?.useMutation();

  const handleConnectToLiveAdmin = async () => {
    try {
      setIsLoading(true);
      await escalateMutation.mutateAsync({
        sessionId,
        userMessage: inputValue.trim() || "Customer requested live human admin support chat",
      });
      setIsLiveAgentMode(true);
      await refetchTicket();
    } catch (err) {
      console.error("Escalation to live agent failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async (customText?: string | React.MouseEvent) => {
    const textToSend = typeof customText === "string" ? customText : inputValue;
    if (!textToSend.trim() || isLoading) return;

    const currentInput = textToSend.trim();

    if (isLiveAgentMode && ticketSessionData?.ticket?.id) {
      setInputValue("");
      setIsLoading(true);
      try {
        await sendCustomerMsgMutation.mutateAsync({
          ticketId: ticketSessionData.ticket.id,
          message: currentInput,
          senderName: (user as any)?.name || "Customer",
        });
        await refetchTicket();
      } catch (err) {
        console.error("Failed to send customer ticket message:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: currentInput,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      persistMsgMutation.mutate({ sessionId, role: "user", message: currentInput });

      let responseText = "";
      let orderData: any = undefined;

      if (chatMutation) {
        const res = await chatMutation.mutateAsync({
          message: currentInput,
          sessionId,
          domain: "support",
        });
        responseText = res.content || res.response || "How can I assist you with your order today?";
      } else {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: currentInput,
            sessionId,
            userId,
            domain: "support",
          }),
        });
        const data = await res.json();
        responseText = data.data?.content || data.content || "Thank you for reaching out! How can I assist you with your order today?";
      }

      persistMsgMutation.mutate({ sessionId, role: "assistant", message: responseText });

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          content: responseText,
          timestamp: Date.now(),
          orderData,
        },
      ]);
    } catch (err) {
      console.error("Support chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          content: "I checked your request. How else can I help with your orders or shipping today?",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, chatMutation, sessionId, userId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleFeedback = async (messageId: string, feedback: "helpful" | "not_helpful") => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    try {
      await feedbackMutation.mutateAsync({
        question: message.content,
        answer: message.content,
        feedback,
        category: message.type,
      });
      // Show toast or visual feedback
    } catch (error) {
      console.error("Feedback submission failed:", error);
    }
  };

  const handleQuickAction = async (action: string) => {
    const actionQueries: Record<string, string> = {
      "track_latest": "Track my latest order",
      "view_orders": "Show my order history",
      "shipping": "Shipping information",
      "returns": "Return policy",
      "payments": "Payment methods",
      "contact": "Contact human support",
    };
    sendMessage(actionQueries[action] || action);
  };



  const handleAgentToggle = async () => {
    try {
      if (agentStatus?.isRunning) {
        await stopMutation.mutateAsync();
      } else {
        await startMutation.mutateAsync();
      }
      await refetchAgentStatus();
    } catch (error) {
      console.error("ML support agent toggle failed:", error);
    }
  };

  // Get recent orders for quick access
  const { data: recentOrders } = (trpc as any).support?.getRecentOrders?.useQuery(
    { limit: 3 },
    { enabled: isAuthenticated && isOpen }
  );

  if (!isOpen) return null;

  return (
    <div
      className="w-full h-[calc(100vh-64px)] bg-slate-50/50 dark:bg-slate-950/80 p-3 sm:p-4 overflow-hidden flex flex-col"
      role="main"
      aria-label="AI Customer Support"
    >
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-stretch">
        {/* Left Sidebar Dashboard */}
        <div className="lg:col-span-4 flex flex-col gap-3.5 overflow-y-auto max-h-full pr-1">
          {/* Support Hub Header & Escalation Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">Support Hub</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                    24/7 AI
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Instant order & store help</p>
              </div>
            </div>

            {/* Status & Escalation */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${agentStatus?.isRunning ? "bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" : "bg-amber-400"}`}></span>
                  {agentStatus?.isRunning ? "ML Agent Active" : "ML Agent Standby"}
                </span>
                <button
                  onClick={handleAgentToggle}
                  className="text-[11px] font-bold px-3 py-1 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-2xs hover:bg-slate-100 transition-all active:scale-95"
                >
                  {agentStatus?.isRunning ? "Pause" : "Start"}
                </button>
              </div>

              {isLiveAgentMode ? (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Admin Connected
                  </span>
                  <button
                    onClick={() => setIsLiveAgentMode(false)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline"
                  >
                    Switch to AI
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectToLiveAdmin}
                  disabled={escalateMutation.isPending}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  {escalateMutation.isPending ? "Connecting..." : "Talk to Live Human Admin →"}
                </button>
              )}
            </div>
          </div>

          {/* Quick Track Orders Card */}
          {isAuthenticated && recentOrders && recentOrders.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Package className="w-4 h-4 text-indigo-500" />
                Quick Track Orders
              </div>
              <div className="space-y-2">
                {recentOrders.map((order: any) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setInputValue(`Track order ${order.orderNumber}`);
                      sendMessage();
                    }}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-left transition-all group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        BDT {order.totalAmount?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      order.status === "delivered" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                      order.status === "shipped" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
                      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}>
                      {order.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instant Help Topics */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Popular Help Topics</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => handleQuickAction("track_latest")} className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group">
                <Truck className="w-5 h-5 text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">Track Order</p>
              </button>
              <button onClick={() => handleQuickAction("returns")} className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group">
                <RotateCcw className="w-5 h-5 text-purple-500 mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">Returns</p>
              </button>
              <button onClick={() => handleQuickAction("payments")} className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group">
                <CreditCard className="w-5 h-5 text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">Payments</p>
              </button>
              <button onClick={() => handleQuickAction("contact")} className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group">
                <Bot className="w-5 h-5 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">Order Help</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Main Chat Panel */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden h-full max-h-full relative">
          {/* Messages Area */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto bg-slate-50/40 dark:bg-slate-950/50 p-4 sm:p-6 space-y-4 scroll-smooth"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-xs transition-all ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/70 dark:border-slate-700/70 rounded-tl-sm"
                  }`}
                >
                  <div className="prose dark:prose-invert max-w-none text-sm space-y-2">
                    {renderContent(message.content)}
                  </div>

                  {/* Order Info Display */}
                  {message.orderData && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Order {message.orderData.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            message.orderData.status === "delivered"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : message.orderData.status === "shipped"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : message.orderData.status === "processing"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : message.orderData.status === "cancelled"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {message.orderData.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1 mb-2">
                        {message.orderData.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                              {item.name} x{item.quantity}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              BDT {item.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-600 pt-2">
                        <span>Total</span>
                        <span>BDT {message.orderData.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Feedback buttons */}
                  {message.role === "assistant" && message.type !== "error" && message.type !== "live_agent" && (
                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Was this helpful?</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleFeedback(message.id, "helpful")}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                          aria-label="Helpful"
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, "not_helpful")}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          aria-label="Not helpful"
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 text-right">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="shrink-0 h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                    {(user as any)?.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl rounded-tl-sm border border-slate-200/70 dark:border-slate-700/70 p-4 shadow-xs flex items-center gap-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">AI is processing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips Bar */}
          {(!isLiveAgentMode && !isLoading && (showSuggestions || currentSuggestions.length > 0)) && (
            <div className="px-4 py-2 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                {showSuggestions && currentSuggestions.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="shrink-0 px-3 py-1.5 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-full font-medium border border-indigo-200/50 dark:border-indigo-800/50 transition-colors shadow-2xs"
                  >
                    ✨ {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Container */}
          <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI Support (e.g. 'Track order #1002' or 'Return policy')..."
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md active:scale-95 shrink-0"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
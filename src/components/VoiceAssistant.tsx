import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { Mic, MicOff, Volume2, Radio, Settings2, AlertTriangle } from "lucide-react";
import {
  cleanTranscript,
  extractPhoneFromSpeech,
  resolveVoiceProductSelection,
  isExplicitVoiceProductSelectionCommand,
  type VoiceProductItem,
  normalizeVoiceActionDecision,
} from "./voiceAssistantHelpers";
import { deriveLocalAction } from "../lib/localNlp";
import { useVoiceAssistantEngine } from "../hooks/useVoiceAssistantEngine";
import { VoiceDiagnosticsModal } from "./VoiceDiagnosticsModal";
import { toast } from "@/lib/toast";
import { useVoiceStore } from "@/stores/useVoiceStore";
import { trpc } from "@/providers/trpc";

// ── Page Descriptions with Contextual Action Hints ───────────────────────────

function getPageDescription(pathname: string): string {
  switch (pathname) {
    case "/":
      return "You are on the MarketVerse home page. You can say 'search' followed by a product name, say 'open cart', 'see my orders', 'fashion stylist', or 'help' for more options.";
    case "/products":
      return "You are on the products catalog page. I can read the product list for you. Say 'read products', or say 'search shoes' to find something specific. Say 'select 1' to buy a product.";
    case "/cart":
      return "You are on your shopping cart page. Review your items or say 'checkout' to proceed. Say 'go back' to return to the previous page.";
    case "/orders":
      return "You are on your orders page. Here you can review past orders and tracking statuses. Say 'go back' to return, or 'search' to find more products.";
    case "/voice-checkout":
      return "You are on the voice checkout page. Please speak your 11-digit mobile number to complete your cash-on-delivery order.";
    case "/profile":
      return "You are on your profile page. You can view your account details. Say 'go back' or 'open cart' to navigate.";
    case "/support":
      return "You are on the Customer Support page. You can ask for help with orders, shipping, or returns.";
    case "/fashion-stylist":
      return "You are on the Clevora AI page. You can ask for outfit recommendations, tech advice, and general shopping help.";
    case "/ai-assistant":
      return "You are on the AI Assistant page. You can chat with the assistant for personalized shopping help.";
    default:
      if (pathname.startsWith("/products/")) {
        return "You are viewing a product detail page. Say 'add to cart' to add this item, or 'go back' to return to the products list.";
      }
      return "You are on MarketVerse. You can search products, open your cart, or view your orders using voice commands. Say 'help' for options.";
  }
}

function getPageGreeting(pathname: string): string {
  switch (pathname) {
    case "/":
      return "Hello! I am Dev, your voice assistant. What would you like to search or buy today?";
    case "/products":
      return "Hello! I'm Dev. Tell me what product you're looking for, or say 'read products' to hear what's available.";
    case "/cart":
      return "Hello! You are in your shopping cart. Say 'checkout' to place an order or 'search' to find more items.";
    case "/orders":
      return "Hello! You are on your orders page. Say 'track order' or 'search' to shop for new items.";
    case "/voice-checkout":
      return "Hello! You are on Voice Checkout. Please speak your 11-digit mobile number to complete your cash on delivery order.";
    case "/support":
      return "Hello! I'm Dev. How can I help you with your order, delivery, or returns today?";
    case "/fashion-stylist":
      return "Hello! Welcome to Clevora AI. Tell me what product or occasion you want advice on.";
    case "/profile":
      return "Hello! You are on your profile. Say 'see my orders' or 'open cart' to navigate.";
    default:
      if (pathname.startsWith("/products/")) {
        return "Hello! You are viewing a product. Say 'add to cart' or 'buy now' to purchase.";
      }
      return "Hello! I am Dev, your voice shopping assistant. What can I do for you today?";
  }
}

function resolveTargetPage(text: string): { path: string; name: string } | null {
  const lower = text.toLowerCase();
  if (/\b(home|main page|homepage|mukhya pata|start|home screen)\b/i.test(lower)) {
    return { path: "/", name: "Home" };
  }
  if (/\b(products|catalog|catalogue|shop|store|browse items|all products|items)\b/i.test(lower)) {
    return { path: "/products", name: "Products Catalogue" };
  }
  if (/\b(cart|shopping cart|shopping bag|my cart|basket|bag)\b/i.test(lower)) {
    return { path: "/cart", name: "Shopping Cart" };
  }
  if (/\b(checkout|voice checkout|pay now|checkout page)\b/i.test(lower)) {
    return { path: "/voice-checkout", name: "Voice Checkout" };
  }
  if (/\b(orders|my orders|order history|past orders|track orders?)\b/i.test(lower)) {
    return { path: "/orders", name: "My Orders" };
  }
  if (/\b(profile|my profile|account|my account|settings|user profile)\b/i.test(lower)) {
    return { path: "/profile", name: "Your Profile" };
  }
  if (/\b(support|customer support|help center|helpdesk|customer service|contact support|contact us)\b/i.test(lower)) {
    return { path: "/support", name: "Customer Support" };
  }
  if (/\b(fashion stylist|ai stylist|stylist|fashion advice|dress advice)\b/i.test(lower)) {
    return { path: "/fashion-stylist", name: "Clevora AI" };
  }
  if (/\b(ai assistant|assistant|seller ai|chat assistant)\b/i.test(lower)) {
    return { path: "/ai-assistant", name: "AI Assistant" };
  }
  return null;
}

function scrapeDomProducts(): VoiceProductItem[] {
  if (typeof document === "undefined") return [];
  const cards = document.querySelectorAll("[data-product-name], a[href*='/products/']");
  const items: VoiceProductItem[] = [];
  const seenNames = new Set<string>();

  cards.forEach((card, idx) => {
    const name =
      card.getAttribute("data-product-name") ||
      card.querySelector("h3, h4, .product-title, [class*='font-semibold']")?.textContent?.trim() ||
      "";
    const priceText =
      card.getAttribute("data-product-price") ||
      card.querySelector("[class*='text-indigo'], [class*='font-bold'], [class*='price']")?.textContent?.trim() ||
      "BDT 1,000";
    const link = card.getAttribute("href") || card.querySelector("a[href*='/products/']")?.getAttribute("href") || "";
    const slug = link.replace("/products/", "").split("?")[0] || `item-${idx + 1}`;

    if (name && name.length > 2 && !seenNames.has(name) && items.length < 12) {
      seenNames.add(name);
      items.push({
        id: idx + 1,
        name,
        slug,
        price: priceText,
        index: items.length + 1,
      });
    }
  });
  return items;
}

export function VoiceAssistant() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const productItems = useVoiceStore((state) => state.currentProducts);
  const [lastReadProductIndex, setLastReadProductIndex] = useState(-1);
  const lastReadProductIndexRef = useRef(-1);
  const productListSignatureRef = useRef("");

  useEffect(() => {
    // Reset pagination only when the effective product list actually changes.
    const nextSignature = productItems.map((item) => `${item.id}:${item.slug}`).join("|");
    if (productListSignatureRef.current !== nextSignature) {
      productListSignatureRef.current = nextSignature;
      lastReadProductIndexRef.current = -1;
      setLastReadProductIndex(-1);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("voice_announced_count");
      }
    }
  }, [productItems]);

  useEffect(() => {
    lastReadProductIndexRef.current = lastReadProductIndex;
  }, [lastReadProductIndex]);

  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
    }
  });

  const processVoiceCommandRef = useRef<(text: string) => void>(() => {});
  const lastSpokenResponseRef = useRef("");
  const aiCommandRequestRef = useRef<AbortController | null>(null);

  // ── Master Engine Hook ────────────────────────────────────────────────────
  const {
    state,
    isActive,
    isAwakenerLive,
    transcript,
    interimTranscript,
    response,
    pendingConfirmation,
    lastError: _lastError,
    sttServiceStatus,
    networkRetryCount,
    activateAssistant,
    deactivateAssistant,
    speak,
    transitionTo: _transitionTo,
    setPendingConfirmation,
    getDiagnosticsData,
    playAudioCue,
  } = useVoiceAssistantEngine({
    onFinalSpeech: (spokenText) => {
      processVoiceCommandRef.current(spokenText);
    },
    onInterimSpeech: (_interimText) => {
      // Stream interim for screen readers and live HUD
    },
    onWakeWord: (_wakeWord, commandAfter) => {
      if (commandAfter && commandAfter.trim()) {
        processVoiceCommandRef.current(commandAfter.trim());
      } else {
        speak("Hi! I'm awake and listening. How can I help you?", { nextState: "LISTENING" });
      }
    },
    onBargeIn: () => {
      toast.info("Speech paused.");
    },
    language: "en-US",
    inactivityTimeoutMs: 120000, // 2 minutes
    devDebug: true, // enable verbose STT/wake-word debug logging (dev-only)
    keepSttAlwaysOn: true, // keep STT active for entire app lifetime (only respond after wake-word)
  });

  const speakProductBatch = useCallback(() => {
    if (productItems.length === 0) {
      speak("No products found on this page. Say 'search' followed by a product name to find items.", {
        nextState: "LISTENING",
      });
      return;
    }

    let effectiveLastReadIndex = lastReadProductIndexRef.current;
    if (effectiveLastReadIndex < 0 && typeof sessionStorage !== "undefined") {
      const persistedAnnounced = Number(sessionStorage.getItem("voice_announced_count") || "0");
      if (Number.isFinite(persistedAnnounced) && persistedAnnounced > 0) {
        effectiveLastReadIndex = Math.min(persistedAnnounced, productItems.length) - 1;
        lastReadProductIndexRef.current = effectiveLastReadIndex;
        setLastReadProductIndex(effectiveLastReadIndex);
      }
    }

    const startIndex = effectiveLastReadIndex + 1;
    if (startIndex >= productItems.length) {
      speak("You have reached the end of the product list. Say 'select' followed by an option number, or search for another product.", {
        nextState: "LISTENING",
      });
      return;
    }

    const batch = productItems.slice(startIndex, startIndex + 4);
    const batchText = batch
      .map((item, offset) => `Option ${startIndex + offset + 1}: ${item.name} for ${item.price} Taka`)
      .join(". ");
    const hasMore = startIndex + batch.length < productItems.length;
    const nextLastIndex = startIndex + batch.length - 1;
    lastReadProductIndexRef.current = nextLastIndex;
    setLastReadProductIndex(nextLastIndex);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("voice_announced_count", String(nextLastIndex + 1));
    }
    const continuationPrefix = startIndex > 0 ? `Continuing from option ${startIndex + 1}. ` : "";
    const nextOptionStart = nextLastIndex + 2;
    const nextOptionEnd = Math.min(nextOptionStart + 3, productItems.length);
    speak(
      `${continuationPrefix}${batchText}. ${hasMore ? `Say continue to hear option ${nextOptionStart}${nextOptionEnd > nextOptionStart ? ` to ${nextOptionEnd}` : ""}, or say select followed by an option number.` : "That is the end of the product list. Say select followed by an option number."}`,
      { nextState: "LISTENING" }
    );
  }, [productItems, speak]);

  const diagnostics = getDiagnosticsData();

  // ── Core NLP Command Processor ───────────────────────────────────────────
  const processVoiceCommand = useCallback(
    async (rawTranscriptText: string) => {
      const cleaned = cleanTranscript(rawTranscriptText);
      if (!cleaned) return;

      console.log("[VoiceAssistant] Processing command:", cleaned);

      if (/\b(continue|next|next four|more products|go on|keep going|resume|proceed)\b/i.test(cleaned)) {
        speakProductBatch();
        return;
      }

      // Prioritize deterministic local option selection before AI to avoid stale AI list-size assumptions.
      const looksLikeOptionSelection = isExplicitVoiceProductSelectionCommand(cleaned);

      if (location.pathname !== "/voice-checkout" && looksLikeOptionSelection) {
        const effectiveItems = productItems.length > 0 ? productItems : scrapeDomProducts();
        const selected = resolveVoiceProductSelection(cleaned, effectiveItems);
        if (selected && selected.selectedProduct) {
          sessionStorage.setItem("voice_checkout_product", JSON.stringify(selected.selectedProduct));
          playAudioCue("SUCCESS");
          speak(`Selected ${selected.selectedProduct.name}. Opening Voice Checkout.`, {
            onEnd: () => navigate("/voice-checkout"),
          });
          return;
        }

        if (effectiveItems.length > 0) {
          speak(
            `Sorry, I didn't find that option. We have ${effectiveItems.length} products. Please choose a number from 1 to ${effectiveItems.length}.`,
            { nextState: "LISTENING" }
          );
          return;
        }
      }

      // 1. Handle Active Confirmations (Yes / No)
      if (pendingConfirmation) {
        const lower = cleaned.toLowerCase();
        if (/\b(yes|yeah|sure|confirm|accept|ha|thik ache|proceed|ok|okay)\b/i.test(lower)) {
          playAudioCue("SUCCESS");
          pendingConfirmation.onConfirm();
          setPendingConfirmation(null);
          return;
        } else if (/\b(no|cancel|stop|nah|na|bad dao|exit|close)\b/i.test(lower)) {
          playAudioCue("CHIME");
          pendingConfirmation.onCancel();
          setPendingConfirmation(null);
          speak("Cancelled.", { nextState: "LISTENING" });
          return;
        }
      }

      // 2. Handle Voice Checkout Context
      if (location.pathname === "/voice-checkout") {
        const phoneDigits = extractPhoneFromSpeech(cleaned);
        if (phoneDigits && phoneDigits.length >= 10) {
          window.dispatchEvent(
            new CustomEvent("voice-checkout-phone-input", { detail: phoneDigits })
          );
          speak(`Got your number ${phoneDigits.split("").join(" ")}. Placing your cash on delivery order now.`, {
            nextState: "LISTENING",
          });
          return;
        }

        if (/\b(confirm|place order|submit|order place koro|pay|buy)\b/i.test(cleaned)) {
          window.dispatchEvent(new CustomEvent("voice-checkout-submit-order"));
          return;
        }

        if (/\b(cancel|back|return|exit|abort)\b/i.test(cleaned)) {
          window.dispatchEvent(new CustomEvent("voice-checkout-cancel"));
          speak("Cancelled voice checkout. Returning to products.", { nextState: "LISTENING" });
          return;
        }
      }

      const runAiIntentRouting = async () => {
        if (aiCommandRequestRef.current) aiCommandRequestRef.current.abort();
        const controller = new AbortController();
        aiCommandRequestRef.current = controller;

        // Explicit timeout for AI routing to prevent hanging
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
          const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              message: cleaned,
              sessionId: `voice-${Date.now()}`,
              domain: "support",
              context: {
                page: location.pathname,
                pageDescription: getPageDescription(location.pathname),
                productList: productItems.slice(0, 50),
                routeHints: {
                  productPath: "/products",
                  cartPath: "/cart",
                  ordersPath: "/orders",
                  supportPath: "/support",
                  stylistPath: "/fashion-stylist",
                },
                userIntent: "voice-assistant-command",
                currentTranscript: cleaned,
              },
            }),
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`AI voice routing failed (${response.status})`);
          }

          const data = await response.json();
          const decision = normalizeVoiceActionDecision(data?.data?.structuredResponse || data?.structuredResponse || data?.data?.action || data?.action || null);

          if (decision.intent && decision.intent !== "help") {
            const normalized = decision.intent.toLowerCase();
            const effectiveQuery = decision.searchQuery || cleaned.replace(/^(search for|search|find|look for|khujo|dekhao)\s*/i, "").trim();

            if (normalized === "navigate" && decision.targetPage) {
              const target = decision.targetPage.startsWith("/") ? decision.targetPage : `/${decision.targetPage.replace(/^\//, "")}`;
              playAudioCue("SUCCESS");
              speak(decision.responseText || `Opening ${decision.targetPage}.`, {
                onEnd: () => navigate(target),
              });
              return true;
            }

            if (normalized === "search") {
              const query = decision.searchQuery || effectiveQuery;
              if (query) {
                playAudioCue("SUCCESS");
                speak(decision.responseText || `Searching for ${query}.`, {
                  onEnd: () => navigate(`/products?search=${encodeURIComponent(query)}`),
                });
                return true;
              }
            }

            if (normalized === "select_option" && decision.selectedProduct) {
              sessionStorage.setItem("voice_checkout_product", JSON.stringify(decision.selectedProduct));
              playAudioCue("SUCCESS");
              speak(decision.responseText || `Selected ${decision.selectedProduct.name}. Opening Voice Checkout.`, {
                onEnd: () => navigate("/voice-checkout"),
              });
              return true;
            }

            if (normalized === "checkout") {
              playAudioCue("SUCCESS");
              speak(decision.responseText || "Opening Voice Checkout.", {
                onEnd: () => navigate("/voice-checkout"),
              });
              return true;
            }

            if (normalized === "read_products") {
              speakProductBatch();
              return true;
            }

            if (normalized === "conversational" || normalized === "greeting" || normalized === "capabilities" || normalized === "shopping_advice") {
              speak(decision.responseText || `I heard: "${cleaned}". I can help you shop, search products, and navigate MarketVerse.`, {
                nextState: "LISTENING",
              });
              return true;
            }
          }

          throw new Error("No supported AI action decision returned");
        } catch (error) {
          if ((error as Error)?.name === "AbortError") return;
          console.warn("[VoiceAssistant] AI routing fallback triggered:", error);
          return false;
        }
      };

      const aiHandled = await runAiIntentRouting();
      if (aiHandled) return;

      // Keep the local fallback as a safety net if AI does not return a recognized action.
      const localAction = deriveLocalAction(cleaned, "voice");
      if (localAction.intent === "unknown" && !/\b(search|open|cart|order|help|products|home|checkout|stop|repeat|page|select)\b/i.test(cleaned)) {
        speak(`I heard: "${cleaned}". You can say 'search shoes', 'open cart', 'see my orders', or 'help' for options.`, {
          nextState: "LISTENING",
        });
        return;
      }


      // Action routing via Local NLP
      switch (localAction.intent) {
        case "stop":
          playAudioCue("CHIME");
          deactivateAssistant("Dev paused.");
          break;

        case "repeat":
          if (lastSpokenResponseRef.current) {
            speak(`I said: ${lastSpokenResponseRef.current}`, { nextState: "LISTENING" });
          } else {
            speak(getPageDescription(location.pathname), { nextState: "LISTENING" });
          }
          break;

        case "page_description":
          speak(getPageDescription(location.pathname), { nextState: "LISTENING" });
          break;

        case "read_products":
          speakProductBatch();
          break;

        case "resume":
          speakProductBatch();
          break;

        case "select_option": {
          const effectiveItems = productItems.length > 0 ? productItems : scrapeDomProducts();
          const selected = resolveVoiceProductSelection(cleaned, effectiveItems);
          if (selected && selected.selectedProduct) {
            sessionStorage.setItem("voice_checkout_product", JSON.stringify(selected.selectedProduct));
            playAudioCue("SUCCESS");
            speak(`Selected ${selected.selectedProduct.name}. Opening Voice Checkout.`, {
              onEnd: () => navigate("/voice-checkout"),
            });
          } else {
            speak("Please tell me which option number you'd like to select, like 'select 1' or 'option 2'.", {
              nextState: "LISTENING",
            });
          }
          break;
        }

        case "navigate": {
          const target = resolveTargetPage(cleaned);
          if (target) {
            playAudioCue("SUCCESS");
            speak(`Opening ${target.name}.`, {
              onEnd: () => navigate(target.path),
            });
          } else {
            speak("Which page would you like to open? You can say home, products, cart, orders, or support.", {
              nextState: "LISTENING",
            });
          }
          break;
        }

        case "search": {
          const query = localAction.searchQuery || cleaned.replace(/^(search for|search|find|look for|khujo)\s*/i, "").trim();
          if (query) {
            playAudioCue("SUCCESS");
            speak(`Searching for ${query}.`, {
              onEnd: () => navigate(`/products?search=${encodeURIComponent(query)}`),
            });
          } else {
            speak("What would you like to search for?", { nextState: "LISTENING" });
          }
          break;
        }

        case "checkout":
          playAudioCue("SUCCESS");
          speak("Opening Voice Checkout.", {
            onEnd: () => navigate("/voice-checkout"),
          });
          break;

        case "help":
          speak("You can say: search shoes, read products, open cart, see my orders, or voice checkout. Say stop anytime to pause.", {
            nextState: "LISTENING",
          });
          break;

        case "conversational":
          if (/\b(who are you|what is your name|tumi ke)\b/i.test(cleaned)) {
            speak("I am Dev, your AI shopping assistant on MarketVerse. I help you search, browse, and place voice orders easily!", {
              nextState: "LISTENING",
            });
          } else if (/\b(how are you|kemon acho)\b/i.test(cleaned)) {
            speak("I'm doing great and ready to help you shop! What are you looking for today?", {
              nextState: "LISTENING",
            });
          } else if (/\b(thank you|thanks|dhonnobad)\b/i.test(cleaned)) {
            speak("You're very welcome! Let me know if you need anything else.", {
              nextState: "LISTENING",
            });
          } else {
            speak("I'm here to help you shop! Tell me what products you're looking for.", {
              nextState: "LISTENING",
            });
          }
          break;

        default:
          speak(`I heard: "${cleaned}". You can say 'search ${cleaned}' or 'help' for options.`, {
            nextState: "LISTENING",
          });
          break;
      }
    },
    [
      addToCart,
      deactivateAssistant,
      lastReadProductIndex,
      location.pathname,
      navigate,
      pendingConfirmation,
      playAudioCue,
      productItems,
      setPendingConfirmation,
      speak,
      speakProductBatch,
    ]
  );

  useEffect(() => {
    processVoiceCommandRef.current = processVoiceCommand;
  }, [processVoiceCommand]);

  useEffect(() => {
    lastSpokenResponseRef.current = response;
  }, [response]);

  // Global Announcement Listener
  useEffect(() => {
    const handleAnnouncement = (
      event: CustomEvent<string | { message: string; spokenProductCount?: number }>
    ) => {
      const detail = event.detail;
      const message = typeof detail === "string" ? detail : detail?.message;
      const spokenProductCount =
        typeof detail === "object" && detail !== null ? detail.spokenProductCount : undefined;

      if (typeof spokenProductCount === "number" && spokenProductCount > 0 && productItems.length > 0) {
        const announcedLastIndex = Math.min(spokenProductCount, productItems.length) - 1;
        lastReadProductIndexRef.current = Math.max(lastReadProductIndexRef.current, announcedLastIndex);
        setLastReadProductIndex((prev) => Math.max(prev, announcedLastIndex));
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("voice_announced_count", String(announcedLastIndex + 1));
        }
      }

      if (message) {
        toast.info(message, { duration: 5000 });
        speak(message);
      }
    };

    window.addEventListener("voice-assistant-announce", handleAnnouncement as EventListener);
    return () => {
      window.removeEventListener("voice-assistant-announce", handleAnnouncement as EventListener);
    };
  }, [productItems.length, speak]);

  // Global Keyboard Shortcuts (Alt + V = Toggle Voice, Alt + Shift + D = Diagnostics)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setShowDiagnosticsModal((prev) => !prev);
      } else if (e.altKey && (e.key === "V" || e.key === "v")) {
        e.preventDefault();
        if (isActive) {
          deactivateAssistant("Dev paused.");
        } else {
          activateAssistant(getPageGreeting(location.pathname));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activateAssistant, deactivateAssistant, isActive, location.pathname]);

  const handleToggleAssistant = () => {
    if (isActive) {
      deactivateAssistant("Dev paused.");
      return;
    }

    if (!diagnostics.speechRecognitionSupported || diagnostics.micPermission === "denied" || diagnostics.micPermission === "unsupported" || diagnostics.isSecureContext === false) {
      const fallbackCommand = window.prompt(
        "Voice assistant is unavailable in this browser or microphone access is blocked. Type a command instead, for example: 'search shoes' or 'open cart'.",
        "search shoes"
      );

      if (fallbackCommand && fallbackCommand.trim()) {
        processVoiceCommand(fallbackCommand.trim());
      }
      return;
    }

    activateAssistant(getPageGreeting(location.pathname));
  };

  const isSupportPage = location.pathname === "/support";
  const currentLiveTranscript = interimTranscript || transcript;

  return (
    <>
      {/* Screen Reader ARIA Live Region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {response || (isActive ? "Voice assistant is listening." : "Voice assistant is idle.")}
      </div>

      {/* Developer Diagnostics Modal */}
      <VoiceDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        diagnostics={diagnostics}
        onSimulateCommand={(cmd) => processVoiceCommand(cmd)}
        onResetEngine={() => deactivateAssistant()}
      />

      {/* Network STT Retry Banner */}
      {sttServiceStatus === "retrying" && (
        <div
          className={`fixed ${isSupportPage ? "bottom-40 right-4" : "bottom-20 right-4"} z-[130] bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>
            Voice service reconnecting... (Attempt {networkRetryCount}/5)
          </span>
        </div>
      )}

      {/* Real-Time Live Transcript HUD Bar */}
      {isActive && (
        <div
          className={`fixed ${isSupportPage ? "bottom-24 right-20" : "bottom-4 right-20"} z-[140] flex items-center gap-2.5 bg-slate-900/95 border ${
            state === "SPEAKING" ? "border-purple-500/80" : "border-red-500/80"
          } px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-white max-w-xs sm:max-w-sm animate-in fade-in`}
        >
          <Radio
            className={`w-4 h-4 ${
              state === "SPEAKING" ? "text-purple-400 animate-bounce" : "text-red-500 animate-pulse"
            } shrink-0`}
          />
          <span className="truncate flex-1 font-medium">
            {state === "SPEAKING" ? (
              <span className="text-purple-300 font-semibold">{response}</span>
            ) : currentLiveTranscript ? (
              <span className="font-bold text-red-300">"{currentLiveTranscript}"</span>
            ) : (
              <span className="text-slate-400 italic">Listening for voice command...</span>
            )}
          </span>
        </div>
      )}

      {/* Awakener Mode Indicator Pill */}
      {isAwakenerLive && (
        <div
          className={`fixed ${isSupportPage ? "bottom-24 right-20" : "bottom-4 right-20"} z-[140] flex items-center gap-2.5 bg-slate-900/90 dark:bg-slate-900/95 border border-teal-500/60 dark:border-teal-500/50 px-3.5 py-2 rounded-2xl shadow-xl shadow-teal-500/10 backdrop-blur-md text-xs text-white animate-in fade-in`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping shrink-0" />
          <span className="text-teal-200 text-[11px] font-semibold tracking-wide">
            🎙️ Awakener Live • Say <strong className="text-white underline decoration-teal-400 font-bold">"Hey Dev"</strong>
          </span>
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className={`fixed ${isSupportPage ? "bottom-24 right-4" : "bottom-4 right-4"} z-[140] flex items-center gap-2`}>
        <button
          onClick={() => setShowDiagnosticsModal((prev) => !prev)}
          className="h-9 w-9 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center shadow-lg transition-all cursor-pointer opacity-70 hover:opacity-100"
          title="Open Voice Diagnostics (Alt + Shift + D)"
          aria-label="Open Voice Diagnostics"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleToggleAssistant}
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-white shadow-2xl transition-all duration-300 cursor-pointer ${
            state === "SPEAKING"
              ? "bg-purple-600 ring-4 ring-purple-500/50 shadow-purple-500/60 text-white animate-pulse scale-105"
              : state === "LISTENING" || state === "PROCESSING"
              ? "bg-red-600 ring-4 ring-red-500/50 shadow-red-500/60 text-white animate-pulse scale-110"
              : state === "AWAKENER"
              ? "bg-gradient-to-tr from-teal-600 via-emerald-600 to-indigo-600 ring-4 ring-teal-400/40 shadow-xl shadow-teal-500/30 text-white hover:scale-105"
              : state === "ERROR"
              ? "bg-rose-700 text-white ring-2 ring-rose-500/40"
              : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
          aria-label={
            isActive
              ? "Voice assistant active - Click to pause"
              : isAwakenerLive
              ? "Awakener live in background - Say 'Hey Dev' or click to speak"
              : "Voice assistant Dev - Click to activate"
          }
          title={
            isActive
              ? "Voice Assistant Active (Red) - Click to pause"
              : isAwakenerLive
              ? "Awakener Live (Teal) - Say 'Hey Dev' or click to speak"
              : "Activate Voice Assistant Dev (Alt + V)"
          }
        >
          {isActive ? (
            <MicOff className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Floating Spoken Response Card */}
      {isActive && response && state !== "SPEAKING" && (
        <div
          className={`fixed ${isSupportPage ? "bottom-40 right-4" : "bottom-20 right-4"} z-[130] max-w-xs bg-slate-900/95 border border-indigo-500/50 text-white text-xs p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-2.5 animate-in fade-in zoom-in-95`}
          role="status"
        >
          <Volume2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-indigo-400">Dev Voice Assistant</p>
            <p className="text-slate-200 mt-0.5 leading-relaxed">{response}</p>
          </div>
        </div>
      )}
    </>
  );
}

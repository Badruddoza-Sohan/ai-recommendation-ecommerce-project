import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { trpcClient } from "@/providers/trpc";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { AISupportChat } from "@/components/AISupportChat";
import { resolveFashionPrompt } from "@/lib/fashionStylistUtils";
import { generateFashionResponse } from "@/lib/fashionResponses";
import { BDT_PRICE_RANGES, getClevoraWelcome, getCatalogAttributeOptions, getColorMatch, getComplementaryColors, productIsInStock, productIsInStockForCategory, productMatchesColor, resolveClevoraLocally, type CatalogProduct, type ClevoraConversationContext } from "@/lib/clevoraLocalEngine";
import type { StylistProfileContext } from "@/lib/fashionResponses";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Paperclip,
  TrendingUp,
  Palette,
  Calendar,
  Star,
  Gem,
  X,
} from "lucide-react";

export type AssistantDomain = "fashion" | "gadgets" | "general" | null;
export type GuidedStep = 
  | "welcome"
  | "fashion_start"
  | "fashion_has_shirt"
  | "fashion_shirt_need"
  | "fashion_pant_color"
  | "fashion_pant_size"
  | "fashion_has_pant"
  | "fashion_shoes"
  | "gadget_start"
  | "gadget_laptop_usecase"
  | "gadget_laptop_budget"
  | "chat";


interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  type?: "outfit" | "color" | "seasonal" | "occasion" | "trends" | "style" | "general";
  data?: any;
  products?: any[];
  quickActions?: string[];
  category?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), timeoutMs)),
  ]);
}

export interface OutfitItem {
  id: number;
  name: string;
  price: number;
  category: string;
  matchScore?: number;
  imageUrl?: string;
  slug?: string;
  isAvailable?: boolean;
  inventoryQty?: number;
  relatedProducts?: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    imageUrl?: string;
  }>;
}



export default function FashionStylist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: catalogProducts } = trpc.product.list.useQuery({ limit: 500 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("marketverse_stylist_session_id");
      if (stored) return stored;
      const newId = `session_stylist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("marketverse_stylist_session_id", newId);
      return newId;
    }
    return `session_stylist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId && typeof window !== "undefined") {
      localStorage.setItem("marketverse_stylist_session_id", sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Profile & Domain State
  const [profile, setProfile] = useState<StylistProfileContext | null>(null);
  const [domain, setDomain] = useState<AssistantDomain>(null);
  const [guidedStep, setGuidedStep] = useState<GuidedStep>("welcome");
  const [guidedContext, setGuidedContext] = useState<any>({});
  const [supportMode, setSupportMode] = useState(false);
  const catalogItems = (catalogProducts?.items || []) as CatalogProduct[];
  const storedShirtColors = getCatalogAttributeOptions(catalogItems, "shirt", "color");
  const storedPantColors = getCatalogAttributeOptions(catalogItems, "pant", "color");
  const storedPantSizes = getCatalogAttributeOptions(catalogItems, "pant", "size", guidedContext?.targetColor);
  const guidedPantColors = guidedContext?.color ? getColorMatch(guidedContext.color).pants : storedPantColors;

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editGender, setEditGender] = useState("Male");
  const [editStyle, setEditStyle] = useState("Classic");
  const [editBudget, setEditBudget] = useState("Mid-range");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const updated = await trpcClient.stylistProfile.save.mutate({
        gender: editGender,
        stylePreference: editStyle,
        budgetRange: editBudget,
      });

      const newProfile: StylistProfileContext = {
        name: (user as any)?.name,
        gender: updated?.gender || editGender,
        stylePreference: updated?.stylePreference || editStyle,
        budgetRange: updated?.budgetRange || editBudget,
      };

      setProfile(newProfile);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Failed to save profile to database", err);
      // Fallback update for active session state
      setProfile({
        name: (user as any)?.name,
        gender: editGender,
        stylePreference: editStyle,
        budgetRange: editBudget,
      });
      setIsEditModalOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch profile
        let userProfile = null;
        try {
          const profileResult = await trpcClient.stylistProfile.get.query();
          if (profileResult) {
            userProfile = {
              name: (user as any)?.name,
              gender: profileResult.gender,
              ageGroup: profileResult.ageGroup,
              stylePreference: profileResult.stylePreference,
              budgetRange: profileResult.budgetRange,
            };
            setProfile(userProfile);
          } else {
            // Set default domain if they don't have one
            setDomain(null);
            setGuidedStep("welcome");
            return;
          }
        } catch (e) {
          console.error("Failed to load profile", e);
        }

        // Start a fresh visible assistant session; prior conversations remain out of the initial view.
        setMessages([{ role: "assistant", content: getClevoraWelcome().content, type: "general", quickActions: getClevoraWelcome().quickActions }]);
      } catch (err) {
        console.error("Failed to load chat session", err);
        setMessages([
          { role: "assistant", content: getClevoraWelcome().content, type: "general", quickActions: getClevoraWelcome().quickActions },
        ]);
      }
    }
    if (user) {
      loadData();
    }
  }, [user]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addToCart = trpc.cart.add.useMutation();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setFileError("Please choose a JPG, JPEG, or PNG image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Image size must be 10 MB or less.");
      return;
    }
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFileError(null);
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  const removeSelectedFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileError(null);
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });



  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;
    const prompt = input.trim();
    let imageData: string | undefined;
    if (selectedFile) {
      try {
        imageData = await readFileAsDataUrl(selectedFile);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Could not read the selected image.");
        return;
      }
    }
    setInput("");
    removeSelectedFile();
    if (!imageData && domain === "fashion" && guidedStep === "fashion_has_shirt") {
      handleGuidedStep(guidedStep, prompt, "shirtColor");
      return;
    }
    if (!imageData && domain === "fashion" && guidedStep === "fashion_shirt_need") {
      handleGuidedStep(guidedStep, prompt);
      return;
    }
    if (!imageData && domain === "fashion" && guidedStep === "fashion_pant_color") {
      handleGuidedStep(guidedStep, prompt);
      return;
    }
    if (!imageData && domain === "fashion" && guidedStep === "fashion_pant_size") {
      handleGuidedStep(guidedStep, prompt);
      return;
    }
    await handleSendWithPrompt(prompt || "Please analyze this image and recommend suitable products or styling.", undefined, imageData);
  };

  const quickAction = (prompt: string) => {
    console.debug("[Clevora] quick action clicked:", prompt);
    setInput("");
    void handleSendWithPrompt(resolveFashionPrompt(prompt));
  };

  const handleSendWithPrompt = async (prompt: string, contextOverride?: ClevoraConversationContext, imageData?: string) => {
    if (!prompt.trim() || isLoading) return;

    if (!domain) {
      setDomain("general");
      setGuidedStep("chat");
    }

    const activeSessionId = sessionId || (typeof window !== "undefined" ? localStorage.getItem("marketverse_stylist_session_id") : null) || `session_stylist_${(user as any)?.id || Date.now()}`;
    if (!sessionId) setSessionId(activeSessionId);
    if (typeof window !== "undefined") localStorage.setItem("marketverse_stylist_session_id", activeSessionId);

    const userMsg: ChatMessage = { role: "user", content: prompt.trim() };
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "", type: "outfit" }]);
    setIsLoading(true);
    setInput("");

    try {
      const localResult = imageData ? null : resolveClevoraLocally(prompt, contextOverride || guidedContext as ClevoraConversationContext, catalogItems);
      if (localResult) {
        const searchTerm = localResult.search;
        let products = localResult.productQuery
          ? (await withTimeout(trpcClient.product.list.query({
              limit: 8,
              sort: localResult.productQuery.sort,
              minReviewCount: localResult.productQuery.minReviewCount,
            }))).items.filter((product: any) => localResult.category && ["laptop", "smartphone", "tablet", "headphones", "earbuds", "smartwatch", "camera", "speaker", "monitor", "pc"].includes(localResult.category)
              ? productIsInStockForCategory(product, localResult.category)
              : Number(product.quantity ?? 0) > 0)
          : searchTerm
          ? (catalogProducts?.items || []).filter((product: any) => {
              const haystack = `${product.name || ""} ${product.tags || ""} ${product.categoryName || ""}`.toLowerCase();
              const matchesText = searchTerm.toLowerCase().split(/\s+/).some((term) => haystack.includes(term));
              if (!matchesText) return false;
              if (!localResult.category) return true;
              const categoryText = `${product.categoryName || ""} ${product.name || ""} ${product.tags || ""}`.toLowerCase();
              const categoryAliases: Record<string, string[]> = {
                watch: ["watch", "smartwatch", "smart watch"],
                shoes: ["shoe", "sneaker", "loafer", "footwear", "sandal", "boot"],
                laptop: ["laptop", "notebook"],
                smartphone: ["smartphone", "phone", "mobile"],
                tablet: ["tablet"],
                headphones: ["headphone", "earbud", "earphone"],
                earbuds: ["earbud", "earphone"],
                smartwatch: ["smartwatch", "smart watch"],
                camera: ["camera", "dslr", "mirrorless"],
                speaker: ["speaker", "soundbar"],
                monitor: ["monitor", "display"],
                shirt: ["shirt", "t-shirt", "top"],
                pant: ["pant", "trouser", "jean", "chino"],
                pc: ["pc", "computer", "desktop"],
              };
              const productText = `${product.name || ""} ${product.tags || ""}`.toLowerCase();
              if (localResult.category === "watch") {
                const isWatchProduct = /\bsmart\s*watch\b|\bwatch\b/.test(productText);
                const isUnrelatedJewelry = /earring|necklace|bracelet|ring|jewelry/.test(productText);
                if (!isWatchProduct || isUnrelatedJewelry) return false;
              } else if (!(categoryAliases[localResult.category] || [localResult.category]).some((alias) => categoryText.includes(alias))) return false;
              const selectedSize = localResult.context?.size;
              const productPrice = Number(product.price ?? 0);
              if (localResult.context?.priceMin !== undefined && productPrice < localResult.context.priceMin) return false;
              if (localResult.context?.priceMax !== undefined && productPrice > localResult.context.priceMax) return false;
              if (localResult.context?.priceMin !== undefined && localResult.category && ["laptop", "smartphone", "tablet", "headphones", "earbuds", "smartwatch", "camera", "speaker", "monitor", "pc"].includes(localResult.category) && !productIsInStockForCategory(product, localResult.category)) return false;
              if (selectedSize) {
                try {
                  const attributes = typeof product.attributes === "string" ? JSON.parse(product.attributes) : product.attributes;
                  const sizes = Array.isArray(attributes?.sizes) ? attributes.sizes : Array.isArray(attributes?.size) ? attributes.size : attributes?.size ? [attributes.size] : [];
                  if (sizes.length > 0 && !sizes.some((size: unknown) => String(size).toUpperCase() === String(selectedSize).toUpperCase())) return false;
                } catch { /* Keep products searchable when legacy attributes are malformed. */ }
              }
              if (localResult.searchColors?.length && !productMatchesColor(product, localResult.searchColors)) return false;
              if (localResult.searchColors?.length && (localResult.category === "shirt" || localResult.category === "pant") && !productIsInStock(product, localResult.category, localResult.searchColors[0])) return false;
              return true;
            }).sort((first: any, second: any) => {
              const targetColor = String(localResult.context?.targetColor || localResult.context?.color || "").toLowerCase();
              const score = (product: any) => {
                const text = `${product.name || ""} ${product.tags || ""}`.toLowerCase();
                return (targetColor && text.includes(targetColor) ? 100 : 0) + Number(product.rating ?? 0) * 5 + Math.min(Number(product.soldCount ?? 0), 100) * 0.1;
              };
              return score(second) - score(first);
            }).slice(0, 8)
          : [];
        setMessages((prev) => [...prev.slice(0, -1), {
          role: "assistant",
          content: localResult.content,
          type: "general",
          products,
          quickActions: localResult.quickActions,
          category: localResult.category,
        }]);
        if (localResult.context) setGuidedContext((previous: ClevoraConversationContext) => ({ ...previous, ...localResult.context }));
        setIsLoading(false);
        return;
      }
      const fallbackResult = await withTimeout(trpcClient.brain.chat.mutate({
        message: prompt.trim(),
        sessionId: activeSessionId,
        domain: domain === "gadgets" ? "gadgets" : domain === "fashion" ? "fashion" : "general",
        imageData,
      }));
      setMessages((prev) => [...prev.slice(0, -1), {
        role: "assistant",
        content: fallbackResult.content || "I’m ready to help with your shopping request. Could you share a little more detail?",
        type: "general",
      }]);
      setIsLoading(false);
    } catch (error) {
      console.error("FashionStylist chat error:", error);
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = {
          role: "assistant",
          content: error instanceof Error && error.message === "Request timed out"
            ? "The assistant took too long to respond. Please try again or choose one of the available options."
            : "Sorry, I encountered an error. Please try again or use the quick action buttons below.",
          type: "general",
        };
        return newMsgs;
      });
      setIsLoading(false);
    }
  };

  const handleDomainSelect = (selectedDomain: AssistantDomain) => {
    setDomain(selectedDomain);
    if (typeof window !== "undefined") {
      if (selectedDomain) {
        localStorage.setItem("clevora_active_domain", selectedDomain);
      } else {
        localStorage.removeItem("clevora_active_domain");
      }
    }
    setGuidedStep(selectedDomain === "fashion" ? "fashion_start" : selectedDomain === "gadgets" ? "gadget_start" : "chat");
    setMessages([
      {
        role: "assistant",
        content: `Great! Let's focus on ${selectedDomain === "fashion" ? "Fashion & Styling" : selectedDomain === "gadgets" ? "Gadgets & Tech" : "General Shopping"}. How can I help you today?`,
        type: "general",
      }
    ]);
  };

  const handleAssistantAction = (action: string) => {
    console.debug("[Clevora] assistant action:", action);
    if (action === "Support") {
      setSupportMode(true);
      return;
    }
    if (domain === "fashion" && guidedStep === "fashion_start") {
      setGuidedStep("chat");
      quickAction(action);
      return;
    }
    if (domain === "fashion" && guidedStep === "fashion_shirt_need") {
      handleGuidedStep(guidedStep, action);
      return;
    }
    if (domain === "fashion" && guidedStep === "fashion_pant_color") {
      handleGuidedStep(guidedStep, action);
      return;
    }
    if (domain === "fashion" && guidedStep === "fashion_pant_size") {
      handleGuidedStep(guidedStep, action);
      return;
    }
    const topLevelActions: Record<string, { message: string; quickActions: string[] }> = {
      Fashion: { message: "Let’s style an outfit. What would you like help with?", quickActions: ["I have a shirt, find matching pant", "I have a pant, find matching shirt", "Build a complete outfit", "Suggest matching shoes", "Suggest matching watch"] },
      Gadgets: { message: "Let’s find the right gadget for you.", quickActions: ["Suggest Laptop", "Suggest Smartphone", "Suggest Tablet", "Suggest Smart Watch", "Suggest Headphones"] },
      Shopping: { message: "What would you like to discover?", quickActions: ["Trending Products", "Best Deals", "New Arrivals", "Top Rated Products"] },
      Support: { message: "How can I help with your shopping experience?", quickActions: ["Track Order", "My Orders", "Returns", "Payment Help"] },
      "Ask Anything": { message: "Ask me anything about fashion, gadgets, products, or shopping.", quickActions: [] },
    };
    const category = topLevelActions[action];
    if (category) {
      setDomain(action === "Fashion" ? "fashion" : action === "Gadgets" ? "gadgets" : "general");
      setGuidedStep(action === "Fashion" ? "fashion_start" : "chat");
      setMessages((previous) => [...previous, { role: "user", content: action }, { role: "assistant", content: category.message, type: "general", quickActions: category.quickActions }]);
      return;
    }
    quickAction(action);
  };

  const handleGuidedStep = (step: GuidedStep, answer: string, contextKey?: string) => {
    const newContext = { ...guidedContext };
    if (contextKey) {
      newContext[contextKey] = answer;
      setGuidedContext(newContext);
    }

    setMessages(prev => [...prev, { role: "user", content: answer }]);

    // Define next steps
    let nextStep = step;
    let assistantReply = "";

    switch(step) {
      case "fashion_has_shirt":
        newContext.itemType = "shirt";
        newContext.sourceItemType = "shirt";
        newContext.targetCategory = "pant";
        newContext.color = answer.toLowerCase().replace(/\s+blue$/, "").replace(/\s+grey$/, " gray").trim();
        newContext.sourceColor = newContext.color;
        setGuidedContext(newContext);
        assistantReply = `Excellent choice. ${answer} is a versatile color. What are you looking for?`;
        nextStep = "fashion_shirt_need";
        break;
      case "fashion_shirt_need":
        if (answer.toLowerCase().includes("pant")) {
          newContext.need = "pant";
          newContext.occasion = "general";
          setGuidedContext(newContext);
          const pantMatches = getColorMatch(newContext.color).pants;
          assistantReply = `For a ${newContext.color} shirt, these pant colors are strong matches:\n\n${pantMatches.map((color) => `• ${color}`).join("\n")}\n\nWhich color would you prefer?`;
          nextStep = "fashion_pant_color";
        } else {
          assistantReply = `I can help with ${answer.toLowerCase()} for your ${newContext.color} shirt. Tell me what you would like to match next.`;
          nextStep = "chat";
        }
        break;
      case "fashion_pant_color":
        newContext.targetColor = answer.toLowerCase().replace("/khaki", "").trim();
        setGuidedContext(newContext);
        assistantReply = `Great choice. ${answer} pants will work beautifully with your ${newContext.color} shirt. What size do you need?`;
        nextStep = "fashion_pant_size";
        break;
      case "fashion_pant_size":
        nextStep = "chat";
        setGuidedStep("chat");
        handleSendWithPrompt(answer, newContext);
        return;
      case "fashion_has_pant":
        newContext.itemType = "pant";
        newContext.sourceItemType = "pant";
        newContext.targetCategory = "shirt";
        newContext.color = answer.toLowerCase().replace("/khaki", "").trim();
        newContext.sourceColor = newContext.color;
        newContext.targetColors = getComplementaryColors("pant", newContext.sourceColor);
        setGuidedContext(newContext);
        setGuidedStep("chat");
        handleSendWithPrompt("find matching shirt", newContext);
        return;
      case "fashion_shoes":
        nextStep = "chat";
        setGuidedStep("chat");
        handleSendWithPrompt(`Suggest matching shoes and accessories for this outfit.`);
        return;
      case "gadget_laptop_usecase":
        assistantReply = `Got it, you need a laptop for ${answer}. What is your target budget range?`;
        nextStep = "gadget_laptop_budget";
        break;
      case "gadget_laptop_budget":
        nextStep = "chat";
        setGuidedStep("chat");
        handleSendWithPrompt(`Suggest a laptop for ${newContext.usecase || "general use"} with budget ${answer}. Include recommended specs and key considerations.`);
        return;
      default:
        nextStep = "chat";
        setGuidedStep("chat");
        handleSendWithPrompt(answer);
        return;
    }

    const quickActions = nextStep === "fashion_pant_color"
      ? guidedPantColors.filter(Boolean)
      : nextStep === "fashion_pant_size"
        ? storedPantSizes.filter(Boolean)
        : undefined;
    setMessages(prev => [...prev, { role: "assistant", content: assistantReply, type: "general", quickActions }]);
    setGuidedStep(nextStep);
  };

  if (supportMode) {
    return <AISupportChat isOpen={true} onClose={() => setSupportMode(false)} />;
  }

  if (!user) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Please Log In</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4">Sign in to access Clevora AI</p>
        <button onClick={() => navigate("/login")} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col space-y-3 px-4 py-3 animate-fade-up sm:px-6">
      {/* Hero Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-3.5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  Clevora AI
                </h1>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Intelligent Assistant
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Your guide to Fashion, Gadgets, and more.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {profile && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Gem className="h-3.5 w-3.5 text-amber-500" />
                <span>{profile.gender} • {profile.stylePreference || "Classic"} • {profile.budgetRange || "Mid-range"}</span>
                <button
                  onClick={() => {
                    setEditGender(profile.gender || "Male");
                    setEditStyle(profile.stylePreference || "Classic");
                    setEditBudget(profile.budgetRange || "Mid-range");
                    setIsEditModalOpen(true);
                  }}
                    className="ml-1 cursor-pointer rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 underline transition-all hover:bg-indigo-50 dark:bg-slate-700 dark:text-indigo-300 dark:hover:bg-slate-600"
                >
                  Edit
                </button>
              </div>
            )}
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              🌐 English
            </span>
          </div>
        </div>
      </div>

      {/* Main Glass Chat Window (Fits Viewport Perfectly) */}
      <div className="min-h-0 w-full flex-1">
        <div className="glass-card flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm animate-fade-up dark:border-slate-800" style={{ animationDelay: '100ms' }}>
          
          {/* Top Status Bar */}
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Clevora Active
              </span>
            </div>
            {domain && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {domain}
                </span>
                <button
                  onClick={() => {
                    setDomain(null);
                    setGuidedStep("welcome");
                    if (typeof window !== "undefined") {
                      localStorage.removeItem("clevora_active_domain");
                    }
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline cursor-pointer transition-colors"
                >
                  ← Change Category
                </button>
              </div>
            )}
          </div>

          {/* Messages Viewport */}
          <div ref={chatContainerRef} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scroll-smooth custom-scrollbar">
            
            {!domain && guidedStep === "welcome" ? (
              <div className="flex min-h-full flex-col justify-center space-y-5 py-1 animate-in fade-in zoom-in duration-300">
                <div className="mx-auto w-full max-w-3xl rounded-3xl border border-indigo-200/70 bg-white p-6 text-left shadow-sm dark:border-indigo-800/60 dark:bg-slate-800">
                  <div className="mb-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white"><Bot className="h-6 w-6" /></div><div><h2 className="text-xl font-black text-slate-900 dark:text-white">Clevora AI</h2><p className="text-xs text-indigo-600 dark:text-indigo-300">Shopping, styling and product discovery assistant</p></div></div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-200">{getClevoraWelcome().content}</p>
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {getClevoraWelcome().quickActions?.map((action) => <button key={action} onClick={() => handleAssistantAction(action)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-left text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">{action}</button>)}
                  </div>
                </div>
              </div>
            ) : (
              <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="shrink-0 h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <Bot className="h-5 w-5" />
                  </div>
                )}
                <div
                  className={`max-w-[94%] sm:max-w-[92%] rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-xs shadow-md"
                      : "bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs"
                  }`}
                >
                  {msg.type === "outfit" && msg.data ? (
                    <>
                      {getIntroText(msg.content) && (
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                          {getIntroText(msg.content)}
                        </p>
                      )}
                      <OutfitDisplay data={msg.data} onCopy={copyToClipboard} copiedText={copiedText} onQuickAction={(p) => quickAction(p)} />
                    </>
                  ) : msg.type === "color" && msg.data ? (
                    <>
                      {getIntroText(msg.content) && (
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                          {getIntroText(msg.content)}
                        </p>
                      )}
                      <ColorDisplay data={msg.data} onCopy={copyToClipboard} copiedText={copiedText} />
                    </>
                  ) : msg.type === "seasonal" && msg.data ? (
                    <>
                      {getIntroText(msg.content) && (
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                          {getIntroText(msg.content)}
                        </p>
                      )}
                      <SeasonalDisplay data={msg.data} />
                    </>
                  ) : msg.type === "occasion" && msg.data ? (
                    <>
                      {getIntroText(msg.content) && (
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                          {getIntroText(msg.content)}
                        </p>
                      )}
                      <OccasionDisplay data={msg.data} />
                    </>
                  ) : msg.type === "trends" && msg.data ? (
                    <>
                      {getIntroText(msg.content) && (
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                          {getIntroText(msg.content)}
                        </p>
                      )}
                      <TrendsDisplay data={msg.data} />
                    </>
                  ) : msg.type === "style" && msg.data ? (
                    <>
                      {getIntroText(msg.content) && (
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                          {getIntroText(msg.content)}
                        </p>
                      )}
                      <StyleDisplay data={msg.data} />
                    </>
                  ) : (
                    <>
                      <RichLookCard
                        content={msg.content}
                        catalogProducts={catalogProducts?.items || []}
                        index={i}
                        onFeedback={(key) => setCopiedText(key)}
                        feedbackState={copiedText}
                        showFooter={msg.role === "assistant"}
                      />
                      {msg.products && msg.products.length > 0 && (
                        <ProductRecommendations products={msg.products} onAddToCart={(product) => addToCart.mutate({ productId: product.id })} onBuyNow={(product) => {
                          sessionStorage.setItem("buy_now_item", JSON.stringify({ productId: product.id, name: product.name, slug: product.slug, price: product.price, imageUrl: product.imageUrl || "", quantity: 1 }));
                          navigate("/checkout");
                        }} />
                      )}
                      {msg.quickActions && msg.quickActions.length > 0 && msg.role === "assistant" && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                          {msg.quickActions.map((action) => <button key={action} onClick={() => handleAssistantAction(action)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">{action}</button>)}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0 h-9 w-9 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shadow-md">
                    <span className="text-xs font-bold">
                      {(user as any)?.name?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 p-3 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 w-fit">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">Clevora AI is thinking...</span>
              </div>
            )}
            </>
            )}
          </div>

          {/* Input and guided follow-up controls */}
          <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-slate-900 space-y-3">
            {domain === "fashion" && guidedStep === "fashion_has_shirt" && (
              <div className="flex flex-col gap-2 pt-2 pb-1">
                <p className="text-xs text-center font-medium text-slate-500">What color is your shirt?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {storedShirtColors.map(c => (
                    <button key={c} onClick={() => handleGuidedStep("fashion_has_shirt", c, "shirtColor")} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{c}</button>
                  ))}
                </div>
              </div>
            )}

            {domain === "fashion" && guidedStep === "fashion_shirt_need" && (
              <div className="flex flex-col gap-2 pt-2 pb-1">
                <p className="text-xs text-center font-medium text-slate-500">What are you looking for?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Matching Pant", "Matching Shoes", "Matching Watch", "Accessories", "Complete Outfit"].map((option) => (
                    <button key={option} onClick={() => handleGuidedStep("fashion_shirt_need", option)} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{option}</button>
                  ))}
                </div>
              </div>
            )}

            {domain === "fashion" && guidedStep === "fashion_pant_color" && (
              <div className="flex flex-col gap-2 pt-2 pb-1">
                <p className="text-xs text-center font-medium text-slate-500">Which color would you prefer?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {guidedPantColors.map((color) => (
                    <button key={color} onClick={() => handleGuidedStep("fashion_pant_color", color)} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{color}</button>
                  ))}
                </div>
              </div>
            )}

            {domain === "fashion" && guidedStep === "fashion_pant_size" && (
              <div className="flex flex-col gap-2 pt-2 pb-1">
                <p className="text-xs text-center font-medium text-slate-500">What size do you need?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {storedPantSizes.map((size) => (
                    <button key={size} onClick={() => handleGuidedStep("fashion_pant_size", size)} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{size}</button>
                  ))}
                </div>
              </div>
            )}

            {domain === "fashion" && guidedStep === "fashion_has_pant" && (
              <div className="flex flex-col gap-2 pt-2 pb-1">
                <p className="text-xs text-center font-medium text-slate-500">What color is your pant?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Black", "Navy", "Grey", "Beige/Khaki", "White", "Olive"].map(c => (
                    <button key={c} onClick={() => handleGuidedStep("fashion_has_pant", c, "pantColor")} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{c}</button>
                  ))}
                </div>
              </div>
            )}

            {domain === "gadgets" && guidedStep === "gadget_start" && (
              <div className="flex flex-wrap gap-2 justify-center py-2 animate-in fade-in slide-in-from-bottom-2">
                <button onClick={() => setGuidedStep("gadget_laptop_usecase")} className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">Laptop for Programming</button>
                <button onClick={() => setGuidedStep("gadget_laptop_usecase")} className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">Laptop for Video Editing</button>
                <button onClick={() => quickAction("I want to build a gaming PC")} className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">Gaming PC Build</button>
              </div>
            )}

            {domain === "gadgets" && guidedStep === "gadget_laptop_usecase" && (
              <div className="flex flex-col gap-2 pt-2 pb-1">
                <p className="text-xs text-center font-medium text-slate-500">Select Primary Use Case</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["General/Study", "Programming", "Graphic Design", "HD Video Editing", "Gaming"].map(u => (
                    <button key={u} onClick={() => handleGuidedStep("gadget_laptop_usecase", u, "usecase")} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{u}</button>
                  ))}
                </div>
              </div>
            )}

            {domain === "gadgets" && guidedStep === "gadget_laptop_budget" && (
              <div className="flex flex-col gap-2 pt-2 pb-1">
                <p className="text-xs text-center font-medium text-slate-500">What is your budget?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {BDT_PRICE_RANGES.map((range) => (
                    <button key={range.label} onClick={() => handleGuidedStep("gadget_laptop_budget", range.label, "budget")} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{range.label}</button>
                  ))}
                </div>
              </div>
            )}

            {domain && guidedStep === "chat" && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs mb-2">
                {domain === "fashion" ? [
                  "Gym Workout Outfit",
                  "Eid Panjabi Look",
                  "Office Business Casual",
                  "What pairs with Navy Blue?",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => quickAction(chip)}
                    className="shrink-0 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/60 transition-all shadow-2xs"
                  >
                    ✨ {chip}
                  </button>
                )) : domain === "gadgets" ? [
                  "Best laptop for students",
                  "Gaming PC build 100k BDT",
                  "MacBook vs Windows",
                  "Video editing laptop specs",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => quickAction(chip)}
                    className="shrink-0 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/60 transition-all shadow-2xs cursor-pointer"
                  >
                    💻 {chip}
                  </button>
                )) : domain === "general" ? [
                  "Wireless earbuds under 3000 BDT",
                  "Trending gadgets & accessories",
                  "Gift ideas under 5000 BDT",
                  "Compare best sellers",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => quickAction(chip)}
                    className="shrink-0 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold border border-amber-200/60 dark:border-amber-800/60 transition-all shadow-2xs cursor-pointer"
                  >
                    🛍️ {chip}
                  </button>
                )) : null}
              </div>
            )}

            {filePreviewUrl && (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-800 dark:bg-indigo-950/40">
                <img src={filePreviewUrl} alt="Selected for Clevora analysis" className="h-10 w-10 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-indigo-700 dark:text-indigo-300">{selectedFile?.name}</span>
                <button type="button" onClick={removeSelectedFile} className="rounded-lg p-1 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900" aria-label="Remove selected image">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {fileError && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{fileError}</p>}
            <div className="flex gap-2.5 items-center">
                <div className="relative min-w-0 flex-1">
                  <label className="absolute left-1.5 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-indigo-600 transition-colors hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/60" title="Add JPG, JPEG, or PNG up to 10 MB">
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Add file</span>
                    <input type="file" accept="image/jpeg,image/png" onChange={handleFileSelect} className="sr-only" />
                  </label>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask Clevora AI..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedFile) || isLoading}
                  className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl transition-all disabled:opacity-50 shadow-md shrink-0 hover:scale-105"
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">Edit Stylist Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Gender Preference */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gender Identity</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Male", "Female", "Unisex"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditGender(g)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        editGender === g
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Preference */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Style Vibe</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Modern", "Classic", "Minimalist", "Streetwear", "Traditional", "Old Money"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditStyle(s)}
                      className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        editStyle === s
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Budget Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Budget", val: "Budget (< 5,000 BDT)" },
                    { label: "Mid-range", val: "Mid-range (5,000 - 15,000 BDT)" },
                    { label: "Luxury", val: "Luxury (> 15,000 BDT)" },
                  ].map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => setEditBudget(b.label)}
                      className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        editBudget === b.label
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingProfile}
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to get clean intro text before structured lists to prevent double printing
function getIntroText(content?: string): string {
  if (!content) return "";
  const parts = content.split(/\n\n|\n(?=Outfit|Look|\*|\d+\.|\•|#|Base Color|Season:|Color matches)/);
  const first = parts[0].trim();
  if (
    first.startsWith("Outfit") ||
    first.startsWith("Look") ||
    first.startsWith("Base Color:") ||
    first.startsWith("Season:") ||
    first.startsWith("•") ||
    first.startsWith("*") ||
    first.startsWith("1.")
  ) {
    return "";
  }
  return first;
}

// Display Components
function getItemCategoryEmoji(item: any): string {
  const cat = (item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();

  if (cat.includes("jacket") || cat.includes("blazer") || cat.includes("coat") || cat.includes("suit") || name.includes("jacket") || name.includes("blazer") || name.includes("coat") || name.includes("suit")) {
    return "🧥";
  }
  if (cat.includes("shirt") || cat.includes("top") || cat.includes("polo") || cat.includes("t-shirt") || cat.includes("kurti") || cat.includes("panjabi") || cat.includes("dress") || name.includes("shirt") || name.includes("polo") || name.includes("t-shirt") || name.includes("panjabi") || name.includes("dress")) {
    return "👕";
  }
  if (cat.includes("pant") || cat.includes("trouser") || cat.includes("jeans") || cat.includes("chino") || name.includes("pant") || name.includes("trouser") || name.includes("jeans") || name.includes("chino") || name.includes("pajama")) {
    return "👖";
  }
  if (cat.includes("shoe") || cat.includes("footwear") || cat.includes("sneaker") || cat.includes("loafer") || cat.includes("sandal") || cat.includes("boot") || name.includes("shoe") || name.includes("footwear") || name.includes("sneaker") || name.includes("loafer") || name.includes("sandal") || name.includes("boot") || name.includes("nagra")) {
    return "👟";
  }
  if (cat.includes("watch") || cat.includes("belt") || cat.includes("glass") || cat.includes("accessory") || name.includes("watch") || name.includes("belt") || name.includes("sunglass") || name.includes("attar") || name.includes("wallet") || name.includes("clutch") || name.includes("jewelry")) {
    return "⌚";
  }
  if (cat.includes("bag") || name.includes("bag")) {
    return "🎒";
  }
  return "✨";
}

function ProductRecommendations({ products, onAddToCart, onBuyNow }: { products: any[]; onAddToCart: (product: any) => void; onBuyNow: (product: any) => void }) {
  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900 dark:text-white">Marketplace matches</h3><span className="text-[11px] font-semibold text-slate-500">Inventory-first recommendations</span></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {products.map((product: any) => {
          const price = Number(product.price ?? 0);
          const comparePrice = Number(product.comparePrice ?? 0);
          const available = product.quantity == null || Number(product.quantity) > 0;
          let availableOptions = "Product options unavailable";
          try {
            const attributes = typeof product.attributes === "string" ? JSON.parse(product.attributes) : product.attributes;
            const attributeOptions = Object.entries(attributes || {})
              .filter(([, value]) => value != null && value !== "")
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
            const variantOptions = Array.from(new Set((product.variants || []).map((variant: any) => [variant.size, variant.color].filter(Boolean).join(" / ")).filter(Boolean)));
            const options = [...attributeOptions, ...(variantOptions.length > 0 ? [`variants: ${variantOptions.join(", ")}`] : [])];
            if (options.length > 0) availableOptions = options.join(" · ");
          } catch { /* Preserve the product card when legacy attributes are malformed. */ }
          return <div key={product.id} className="flex min-w-0 items-start gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <img src={product.imageUrl || "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=640"} alt={product.name || "Product"} className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
            <div className="min-w-0 flex-1 space-y-1"><p className="truncate text-xs font-bold text-slate-900 dark:text-white">{product.name || "Product"}</p><p className="truncate text-[10px] text-slate-500">{product.sellerName || "Marketplace seller"} · {product.categoryName || "Product"}</p><p className="truncate text-[10px] text-slate-500">★ {Number(product.rating ?? 0).toFixed(1)} · {Number(product.reviewCount ?? 0)} reviews · {availableOptions}</p><div className="flex flex-wrap items-center gap-x-2"><span className="text-sm font-black text-indigo-600 dark:text-indigo-300">BDT {price.toLocaleString()}</span>{comparePrice > price && <span className="text-[10px] text-slate-400 line-through">BDT {comparePrice.toLocaleString()}</span>}</div><p className={`text-[10px] font-bold ${available ? "text-emerald-600" : "text-rose-600"}`}>{available ? (product.quantity == null ? "Check seller availability" : `${product.quantity} in stock`) : "Out of stock"}</p><div className="flex flex-wrap gap-1 pt-0.5"><a href={`/product/${product.slug}`} className="inline-flex min-h-8 w-fit items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-extrabold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Details</a><button onClick={() => onAddToCart(product)} disabled={!available} className="inline-flex min-h-8 w-fit items-center justify-center rounded-lg bg-indigo-600 px-2 text-[10px] font-extrabold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Add cart</button><button onClick={() => onBuyNow(product)} disabled={!available} className="inline-flex min-h-8 w-fit items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Buy now</button></div></div>
          </div>;
        })}
      </div>
    </div>
  );
}

function OutfitDisplay({
  data,
  onCopy,
  copiedText,
  onQuickAction,
}: {
  data: any;
  onCopy: (text: string) => void;
  copiedText: string | null;
  onQuickAction?: (prompt: string) => void;
}) {
  const [savedOutfits, setSavedOutfits] = useState<Record<number, boolean>>({});

  const toggleSave = (idx: number) => {
    setSavedOutfits((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const contentSummary =
    data.outfits
      ?.map(
        (outfit: any, idx: number) =>
          `Outfit ${idx + 1}\n${outfit.styleNotes}\n` +
          outfit.items.map((item: any) => `  • ${item.name} (${item.category})`).join("\n")
      )
      .join("\n\n") || "No outfits found";

  if (!data || !data.outfits || data.outfits.length === 0) {
    return <p className="text-sm text-slate-500">No outfit generated.</p>;
  }

  return (
    <div className="space-y-4 my-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        <span>✨ Occasion: {data.occasion || "Bangladeshi Event"}</span>
        <span>Season: {data.season || "Current"}</span>
      </div>

      {data.outfits.map((outfit: any, idx: number) => (
        <div
          key={idx}
          className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950/40 rounded-xl border border-indigo-200/70 dark:border-indigo-800/60 p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Look #{idx + 1} Recommendation
            </h4>
            {outfit.totalPrice ? (
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-1 rounded-full font-mono">
                Total: ৳{outfit.totalPrice.toLocaleString("en-BD")}
              </span>
            ) : null}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
            💡 {outfit.styleNotes}
          </p>

          <div className="space-y-1.5">
            {outfit.items?.map((item: any, iIdx: number) => (
              <div
                key={iIdx}
                className="flex items-center justify-between text-xs bg-white dark:bg-slate-700/80 p-2 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base shrink-0">
                    {getItemCategoryEmoji(item)}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.name}
                  </span>
                </div>
                <span className="text-slate-600 dark:text-slate-300 font-mono font-semibold shrink-0 ml-2">
                  {item.price ? `৳${item.price.toLocaleString("en-BD")}` : item.category}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap gap-2">

            {onQuickAction && (
              <>
                <button
                  onClick={() => onQuickAction(`Show similar looks for ${data.occasion || "this occasion"}`)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  🔄 Similar
                </button>
                <button
                  onClick={() => onQuickAction(`Show another color option for ${data.occasion || "this look"}`)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  🎨 Color
                </button>
              </>
            )}

            <button
              onClick={() => toggleSave(idx)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                savedOutfits[idx]
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            >
              {savedOutfits[idx] ? "❤️ Saved" : "🤍 Save"}
            </button>

            <button
              onClick={() => onCopy(contentSummary)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs transition-colors"
              title="Copy Outfit Details"
            >
              {copiedText === contentSummary ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ColorDisplay({ data, onCopy, copiedText }: { data: any; onCopy: (text: string) => void; copiedText: string | null }) {
  const content = `Base Color: ${data.baseColor}\nPerfect Matches: ${data.perfectMatches?.join(", ")}\nSeasonal Matches: ${data.seasonalMatches?.join(", ")}\nOccasion Matches: ${data.occasionMatches?.join(", ")}\nAvoid: ${data.avoidColors?.join(", ")}\n\n${data.colorTheory}`;

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3 my-2">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Color Palette: <span className="capitalize text-indigo-600 dark:text-indigo-400 font-mono">{data.baseColor}</span>
        </h4>
        <button onClick={() => onCopy(content)} className="text-xs text-slate-400 hover:text-slate-600">
          {copiedText === content ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {data.perfectMatches?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">✨ Perfect Complementary Matches</p>
          <div className="flex flex-wrap gap-1.5">
            {data.perfectMatches.map((c: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-200/60 dark:border-indigo-800 shadow-2xs capitalize">
                🎨 {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.seasonalMatches?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">🌸 Seasonal Matches</p>
          <div className="flex flex-wrap gap-1.5">
            {data.seasonalMatches.map((c: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium border border-amber-200/60 dark:border-amber-800 capitalize">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.avoidColors?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-rose-500 mb-1 uppercase tracking-wide">❌ Colors to Avoid</p>
          <div className="flex flex-wrap gap-1.5">
            {data.avoidColors.map((c: string, idx: number) => (
              <span key={idx} className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-medium border border-rose-200/60 dark:border-rose-800 capitalize">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.colorTheory && (
        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
            💡 {data.colorTheory}
          </p>
        </div>
      )}
    </div>
  );
}

function SeasonalDisplay({ data }: { data: any }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3 my-2">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Season Guide: <span className="capitalize text-indigo-600 dark:text-indigo-400 font-mono">{data.season}</span>
        </h4>
      </div>

      {data.trends?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">🔥 Key Trends</p>
          <div className="flex flex-wrap gap-1.5">
            {data.trends.map((t: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-200/60 dark:border-indigo-800 shadow-2xs">
                ✨ {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.colors?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">🎨 Seasonal Palette</p>
          <div className="flex flex-wrap gap-1.5">
            {data.colors.map((c: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium border border-purple-200/60 dark:border-purple-800 capitalize">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.keyItems?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">👕 Closet Essentials</p>
          <div className="flex flex-wrap gap-1.5">
            {data.keyItems.map((k: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-medium border border-emerald-200/60 dark:border-emerald-800">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.stylingTips?.length > 0 && (
        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Styling Advice:</p>
          <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
            {data.stylingTips.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-indigo-500 font-bold">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OccasionDisplay({ data }: { data: any }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3 my-2">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Occasion Styling: <span className="capitalize text-indigo-600 dark:text-indigo-400 font-mono">{data.occasion}</span>
        </h4>
        {data.formalityLevel && (
          <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full">
            Formality: {data.formalityLevel}/10
          </span>
        )}
      </div>

      {data.colorPalette?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">🎨 Recommended Palette</p>
          <div className="flex flex-wrap gap-1.5">
            {data.colorPalette.map((c: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-200/60 dark:border-indigo-800 capitalize">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.avoid?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-rose-500 mb-1 uppercase tracking-wide">❌ What Not to Wear</p>
          <div className="flex flex-wrap gap-1.5">
            {data.avoid.map((a: string, idx: number) => (
              <span key={idx} className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-medium border border-rose-200/60 dark:border-rose-800">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.stylingTips?.length > 0 && (
        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Styling Rules:</p>
          <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
            {data.stylingTips.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-indigo-500 font-bold">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TrendsDisplay({ data }: { data: any }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3 my-2">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Fashion Trend Report
        </h4>
        <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full capitalize">
          {data.season || "Current"}
        </span>
      </div>

      {data.trends?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">🔥 Top Trends</p>
          <div className="flex flex-wrap gap-1.5">
            {data.trends.map((t: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-200/60 dark:border-indigo-800">
                ✨ {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.keyItems?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Must-Have Pieces</p>
          <div className="flex flex-wrap gap-1.5">
            {data.keyItems.map((k: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium border border-purple-200/60 dark:border-purple-800">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.trendReport && (
        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
            📝 {data.trendReport}
          </p>
        </div>
      )}
    </div>
  );
}

interface StyleData {
  styleType: string;
  description: string;
  tips?: string[];
  avoid?: string[];
  capsuleWardrobe?: string[];
  recommendedProducts?: Array<{ name: string; price: number; styleScore: number }>;
}

function StyleDisplay({ data }: { data: StyleData }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3 my-2">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Gem className="h-4 w-4 text-purple-500" />
          Style Aesthetic: <span className="capitalize text-indigo-600 dark:text-indigo-400 font-mono">{data.styleType}</span>
        </h4>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
        ✨ {data.description}
      </p>

      {data.capsuleWardrobe && data.capsuleWardrobe.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Capsule Wardrobe Staples</p>
          <div className="flex flex-wrap gap-1.5">
            {data.capsuleWardrobe.map((item: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-medium border border-emerald-200/60 dark:border-emerald-800">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.tips && data.tips.length > 0 && (
        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Style Tips:</p>
          <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
            {data.tips.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-indigo-500 font-bold">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.avoid && data.avoid.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-rose-500 mb-1 uppercase tracking-wide">❌ Style Mistakes to Avoid</p>
          <div className="flex flex-wrap gap-1.5">
            {data.avoid.map((a: string, idx: number) => (
              <span key={idx} className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-medium border border-rose-200/60 dark:border-rose-800">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RichLookCard({
  content,
  catalogProducts,
  index,
  onFeedback,
  feedbackState,
  showFooter = true,
}: {
  content: string;
  catalogProducts: Array<{ id: number; name: string; slug: string; price: number; imageUrl?: string | null }>;
  index: number;
  onFeedback: (key: string) => void;
  feedbackState: string | null;
  showFooter?: boolean;
}) {
  return (
    <div className="text-sm prose prose-sm dark:prose-invert max-w-none space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const slug = href?.match(/\/product\/([^/?#]+)/)?.[1];
            const product = slug ? catalogProducts.find((item) => item.slug === slug) : undefined;
            if (!product) {
              return <a href={href}>{children}</a>;
            }

            return (
              <div className="my-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <img
                  src={product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160"}
                  alt={product.name}
                  className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 object-cover dark:bg-slate-800"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{product.name}</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">{product.price.toLocaleString()} BDT</p>
                </div>
                <a href={href} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700">
                  View Product
                </a>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      
      {/* Interactive Footer Actions */}
      {showFooter && (
      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-semibold">Helpful?</span>
          <button
            onClick={() => onFeedback(`liked_${index}`)}
            className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${feedbackState === 'liked_' + index ? "text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950" : ""}`}
            title="Like"
          >
            👍
          </button>
          <button
            onClick={() => onFeedback(`disliked_${index}`)}
            className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${feedbackState === 'disliked_' + index ? "text-rose-600 font-bold bg-rose-50 dark:bg-rose-950" : ""}`}
            title="Dislike"
          >
            👎
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

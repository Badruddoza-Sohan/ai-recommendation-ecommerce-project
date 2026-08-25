import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { trpcClient } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { resolveFashionPrompt } from "@/lib/fashionStylistUtils";
import { generateFashionResponse } from "@/lib/fashionResponses";
import type { StylistProfileContext } from "@/lib/fashionResponses";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
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
  const [domain, setDomain] = useState<AssistantDomain>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("clevora_active_domain") as AssistantDomain;
      if (stored && ["fashion", "gadgets", "general"].includes(stored)) return stored;
    }
    return null;
  });
  const [guidedStep, setGuidedStep] = useState<GuidedStep>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("clevora_active_domain") as AssistantDomain;
      if (stored === "fashion") return "fashion_start";
      if (stored === "gadgets") return "gadget_start";
      if (stored === "general") return "chat";
    }
    return "welcome";
  });
  const [guidedContext, setGuidedContext] = useState<any>({});

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

        // 2. Fetch session
        const result = await trpcClient.brain.getSession.mutate({ sessionType: "stylist" });
        if (result.ok && result.sessionId) {
          setSessionId(result.sessionId);
          if (result.messages && result.messages.length > 0) {
            setMessages(result.messages);
          } else {
            const greeting = generateFashionResponse({ intent: "greeting", confidence: 1, originalText: "" }, userProfile);
            setMessages([
              {
                role: "assistant",
                content: greeting + " I can help you with outfit recommendations, color matching, seasonal trends, occasion-based styling, and personal style guidance. What would you like help with today?",
                type: "general",
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to load chat session", err);
        setMessages([
          {
            role: "assistant",
            content: "Hello! I'm Clevora AI, your intelligent shopping assistant.",
            type: "general",
          },
        ]);
      }
    }
    if (user) {
      loadData();
    }
  }, [user]);
  const [input, setInput] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };



  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    await handleSendWithPrompt(input);
  };

  const quickAction = (prompt: string) => {
    setInput(prompt);
    requestAnimationFrame(() => {
      const resolvedPrompt = resolveFashionPrompt(prompt);
      setInput(resolvedPrompt);
      void handleSendWithPrompt(resolvedPrompt);
    });
  };

  const handleSendWithPrompt = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    const activeSessionId = sessionId || (typeof window !== "undefined" ? localStorage.getItem("marketverse_stylist_session_id") : null) || `session_stylist_${(user as any)?.id || Date.now()}`;
    if (!sessionId) setSessionId(activeSessionId);
    if (typeof window !== "undefined") localStorage.setItem("marketverse_stylist_session_id", activeSessionId);

    const userMsg: ChatMessage = { role: "user", content: prompt.trim() };
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "", type: "outfit" }]);
    setIsLoading(true);
    setInput("");

    try {
      const res = await fetch('/api/ai/stream-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          sessionId: activeSessionId,
          userId: (user as any)?.id,
          domain: domain || "general",
          context: { currentPage: "clevora-ai", sessionId: activeSessionId, guidedContext }
        })
      });

      if (!res.ok) throw new Error("Stream failed");
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let streamedContent = "";
      
      setIsLoading(false); // Stop loading spinner as soon as stream starts

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        streamedContent += chunk;
        
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = streamedContent;
          return newMsgs;
        });
      }
    } catch (error) {
      console.error("FashionStylist chat error:", error);
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again or use the quick action buttons below.",
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
        assistantReply = `Your ${answer} shirt is a great choice! What's your waist size (e.g. 30, 32, 34) so I can match pants in your fit?`;
        nextStep = "fashion_pant_size";
        break;
      case "fashion_pant_size":
        nextStep = "chat";
        setGuidedStep("chat");
        handleSendWithPrompt(`I have a ${newContext.shirtColor || "classic"} shirt. Suggest matching pants, shoes, and watch in waist size ${answer}.`);
        return;
      case "fashion_has_pant":
        nextStep = "chat";
        setGuidedStep("chat");
        handleSendWithPrompt(`I have ${answer} pants. What matching shirts, shoes, and accessories should I pair with them?`);
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

    setMessages(prev => [...prev, { role: "assistant", content: assistantReply, type: "general" }]);
    setGuidedStep(nextStep);
  };

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 space-y-3 animate-fade-up">
      {/* Hero Header */}
      <div className="overflow-hidden bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl text-white p-3.5 sm:p-4 rounded-2xl shadow-lg border border-indigo-500/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-md shadow-indigo-500/30 shrink-0">
              <Bot className="h-6 w-6 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Clevora AI
                </h1>
                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-400 to-indigo-500 text-slate-950 font-black text-[9px] rounded-full uppercase tracking-wider shadow-xs">
                  Intelligent Assistant
                </span>
              </div>
              <p className="text-indigo-200/90 text-xs font-medium">
                Your guide to Fashion, Gadgets, and more.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {profile && (
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/15 text-indigo-100 text-xs font-semibold flex items-center gap-2 shadow-inner">
                <Gem className="h-3.5 w-3.5 text-amber-300" />
                <span>{profile.gender} • {profile.stylePreference || "Classic"} • {profile.budgetRange || "Mid-range"}</span>
                <button
                  onClick={() => {
                    setEditGender(profile.gender || "Male");
                    setEditStyle(profile.stylePreference || "Classic");
                    setEditBudget(profile.budgetRange || "Mid-range");
                    setIsEditModalOpen(true);
                  }}
                  className="ml-1 text-[10px] font-bold text-amber-300 hover:text-white underline cursor-pointer px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-all"
                >
                  Edit
                </button>
              </div>
            )}
            <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/15 text-indigo-100 text-xs font-medium flex items-center gap-1.5">
              🌐 English
            </span>
          </div>
        </div>
      </div>

      {/* Main Glass Chat Window (Fits Viewport Perfectly) */}
      <div className="w-full">
        <div className="glass-card rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-215px)] min-h-[480px] max-h-[620px] animate-fade-up" style={{ animationDelay: '100ms' }}>
          
          {/* Top Status Bar */}
          <div className="px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-between">
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
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scroll-smooth custom-scrollbar">
            
            {!domain && guidedStep === "welcome" ? (
              <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl flex items-center justify-center mb-4 transform rotate-12 hover:rotate-0 transition-transform">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Hi! I'm Clevora</h2>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Your intelligent shopping assistant. I'll help you discover, compare, and choose products that match your needs.
                  </p>
                </div>
                <div className="pt-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">What are you shopping for today?</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => handleDomainSelect("fashion")} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-md rounded-2xl font-semibold text-slate-700 dark:text-slate-200 transition-all">
                      <span className="text-xl">👕</span> Fashion
                    </button>
                    <button onClick={() => handleDomainSelect("gadgets")} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-md rounded-2xl font-semibold text-slate-700 dark:text-slate-200 transition-all">
                      <span className="text-xl">📱</span> Gadgets
                    </button>
                    <button onClick={() => handleDomainSelect("general")} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-md rounded-2xl font-semibold text-slate-700 dark:text-slate-200 transition-all">
                      <span className="text-xl">🛍️</span> General
                    </button>
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
                    <RichLookCard
                      content={msg.content}
                      index={i}
                      onQuickAction={(p) => quickAction(p)}
                      onFeedback={(key) => setCopiedText(key)}
                      feedbackState={copiedText}
                    />
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

          {/* Input & Quick Chips */}
          <div className="border-t border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-slate-900 space-y-3">
            {domain === "fashion" && guidedStep === "fashion_start" && (
              <div className="flex flex-wrap gap-2 justify-center py-2 animate-in fade-in slide-in-from-bottom-2">
                <button onClick={() => setGuidedStep("fashion_has_shirt")} className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">I have a shirt → find pant</button>
                <button onClick={() => setGuidedStep("fashion_has_pant")} className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">I have pant → find shirt</button>
                <button onClick={() => quickAction("I have shirt and pant, suggest matching shoes")} className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">Suggest shoes</button>
                <button onClick={() => quickAction("I have shirt and pant, suggest matching watch")} className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">Suggest watch</button>
              </div>
            )}

            {domain === "fashion" && guidedStep === "fashion_has_shirt" && (
              <div className="flex flex-col gap-2 pt-2 pb-1">
                <p className="text-xs text-center font-medium text-slate-500">What color is your shirt?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["White", "Light Blue", "Navy", "Black", "Grey", "Beige", "Olive", "Maroon"].map(c => (
                    <button key={c} onClick={() => handleGuidedStep("fashion_has_shirt", c, "shirtColor")} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{c}</button>
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
                  {["Under 50,000 BDT", "50k - 80k BDT", "80k - 120k BDT", "No limit"].map(b => (
                    <button key={b} onClick={() => handleGuidedStep("gadget_laptop_budget", b, "budget")} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-500 transition-colors">{b}</button>
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

            {domain && (guidedStep === "chat" || guidedStep === "fashion_start" || guidedStep === "gadget_start" || guidedStep === "fashion_pant_size") && (
              <div className="flex gap-2.5 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={`Ask Clevora AI...`}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl transition-all disabled:opacity-50 shadow-md shrink-0 hover:scale-105"
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            )}
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

function parseOutfitContent(content: string) {
  if (!content) return null;
  if (!content.includes("👕") && !content.includes("👖") && !content.includes("👞")) return null;

  const lines = content.split("\n");
  let occasion = "Style Recommendation";
  let score = "85/100";
  let tip: string | null = null;
  let avoid: string | null = null;

  let top: { name: string; desc: string } | null = null;
  let bottom: { name: string; desc: string } | null = null;
  let footwear: { name: string; desc: string } | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (line.includes("Here's your look for") || line.includes("Here is your look for")) {
      occasion = line.replace("✨", "").replace("Here's your look for", "").replace("Here is your look for", "").replace(".", "").trim();
    }
    if (line.includes("👕")) {
      const name = line.replace("👕", "").replace(/\*\*/g, "").trim();
      const desc = lines[idx + 1] ? lines[idx + 1].trim() : "";
      top = { name, desc };
    }
    if (line.includes("👖")) {
      const name = line.replace("👖", "").replace(/\*\*/g, "").trim();
      const desc = lines[idx + 1] ? lines[idx + 1].trim() : "";
      bottom = { name, desc };
    }
    if (line.includes("👞")) {
      const name = line.replace("👞", "").replace(/\*\*/g, "").trim();
      const desc = lines[idx + 1] ? lines[idx + 1].trim() : "";
      footwear = { name, desc };
    }
    if (line.includes("Match Score:")) {
      score = line.replace("⭐", "").replace("Match Score:", "").replace(/\*\*/g, "").trim();
    }
    if (line.includes("Styling Tip:")) {
      tip = line.replace("💡", "").replace("Styling Tip:", "").replace(/\*\*/g, "").trim();
    }
    if (line.includes("Avoid:")) {
      avoid = line.replace("✖", "").replace("Avoid:", "").replace(/\*\*/g, "").trim();
    }
  }

  if (!top && !bottom) return null;

  return { occasion, top, bottom, footwear, score, tip, avoid };
}

function RichLookCard({
  content,
  index,
  onQuickAction,
  onFeedback,
  feedbackState,
}: {
  content: string;
  index: number;
  onQuickAction: (action: string) => void;
  onFeedback: (key: string) => void;
  feedbackState: string | null;
}) {
  const parsed = parseOutfitContent(content);

  if (!parsed) {
    return (
      <div className="text-sm prose prose-sm dark:prose-invert max-w-none space-y-3">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-4 my-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-indigo-200/50 dark:border-indigo-800/50">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4 w-4 animate-pulse text-amber-400" />
          </span>
          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight capitalize">
            {parsed.occasion}
          </h4>
        </div>
        <div className="px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-full font-black text-xs shadow-sm flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
          <span>Match Score: {parsed.score}</span>
        </div>
      </div>

      {/* Item Cards Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {parsed.top && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-sm hover:border-indigo-400 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                <span className="text-base group-hover:scale-110 transition-transform">👕</span> Top Wear
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                {parsed.top.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {parsed.top.desc}
              </p>
            </div>
          </div>
        )}

        {parsed.bottom && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60 shadow-sm hover:border-purple-400 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-xs font-extrabold text-purple-600 dark:text-purple-400">
                <span className="text-base group-hover:scale-110 transition-transform">👖</span> Bottom Wear
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                {parsed.bottom.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {parsed.bottom.desc}
              </p>
            </div>
          </div>
        )}

        {parsed.footwear && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/60 shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                <span className="text-base group-hover:scale-110 transition-transform">👞</span> Footwear
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                {parsed.footwear.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {parsed.footwear.desc}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tips & Warnings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {parsed.tip && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <span className="text-amber-500 shrink-0 text-sm">💡</span>
            <div>
              <span className="font-extrabold">Styling Tip: </span>
              <span>{parsed.tip}</span>
            </div>
          </div>
        )}
        {parsed.avoid && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 flex items-start gap-2">
            <span className="text-rose-500 shrink-0 text-sm">✖</span>
            <div>
              <span className="font-extrabold">Avoid: </span>
              <span>{parsed.avoid}</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Footer Actions */}
      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-semibold">Helpful?</span>
          <button
            onClick={() => onFeedback(`liked_${index}`)}
            className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${feedbackState === `liked_${index}` ? "text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950" : ""}`}
            title="Like"
          >
            👍
          </button>
          <button
            onClick={() => onFeedback(`disliked_${index}`)}
            className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${feedbackState === `disliked_${index}` ? "text-rose-600 font-bold bg-rose-50 dark:bg-rose-950" : ""}`}
            title="Dislike"
          >
            👎
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onQuickAction("Try different colour")}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/80 dark:to-indigo-900/80 hover:from-indigo-100 hover:to-indigo-200 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            🎨 Colour
          </button>
          <button
            onClick={() => onQuickAction("Change only shoes")}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/80 dark:to-indigo-900/80 hover:from-indigo-100 hover:to-indigo-200 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            👞 Shoes
          </button>
          <button
            onClick={() => onQuickAction("Make it more premium")}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/80 dark:to-amber-900/80 hover:from-amber-100 hover:to-amber-200 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            💎 Make Premium
          </button>
          <button
            onClick={() => onQuickAction("Try another combination")}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/80 dark:to-purple-900/80 hover:from-purple-100 hover:to-purple-200 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            🔄 Another Style
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { BrowserSttProvider, type SttResult, type SttError } from "../lib/sttProvider";
import { extractWakeWord, getWakeMatchScores, type WakeWordResult } from "../lib/localNlp";

export type VoiceState =
  | "OFF"
  | "AWAKENER"
  | "STARTING"
  | "LISTENING"
  | "PROCESSING"
  | "SPEAKING"
  | "STOPPING"
  | "ERROR";

export type SttServiceStatus = "connected" | "retrying" | "network_error" | "unavailable" | "unknown";

export interface VoiceDiagnosticsData {
  browser: string;
  isSecureContext: boolean;
  protocol: string;
  host: string;
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  mediaDevicesSupported: boolean;
  micPermission: "granted" | "denied" | "prompt" | "unsupported" | "unknown";
  state: VoiceState;
  sttServiceStatus: SttServiceStatus;
  networkRetryCount: number;
  maxRetries: number;
  isListening: boolean;
  isSpeaking: boolean;
  isOnline: boolean;
  language: string;
  interimTranscript: string;
  finalTranscript: string;
  lastIntent: string;
  lastEntities: Record<string, unknown>;
  lastReason: string;
  lastError: { code: string; message: string; timestamp: number } | null;
  loadedVoicesCount: number;
  sessionId: number;
}

export interface PendingConfirmation {
  actionDescription: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface SpeakOptions {
  onEnd?: () => void;
  nextState?: VoiceState;
}

export interface UseVoiceAssistantEngineOptions {
  onFinalSpeech?: (spokenText: string) => void;
  onInterimSpeech?: (interimText: string) => void;
  onWakeWord?: (wakeWord: string, commandAfterWakeWord?: string) => void;
  onBargeIn?: () => void;
  language?: string;
  inactivityTimeoutMs?: number;
  enableWakeWord?: boolean;
  devDebug?: boolean;
  keepSttAlwaysOn?: boolean;
}

const MAX_NETWORK_RETRIES = 5;

/** Exponential backoff: 500ms, 1s, 2s, 4s, 8s (capped at 10s) */
function getExponentialBackoff(attempt: number): number {
  return Math.min(500 * Math.pow(2, attempt), 10000);
}

function detectBrowser(): string {
  const userAgent = navigator.userAgent;
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return "Google Chrome";
  if (/Firefox\//i.test(userAgent)) return "Mozilla Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Apple Safari";
  return "Unknown Browser";
}

function playAudioCue(type: "WAKE" | "SLEEP" | "SUCCESS" | "ERROR" | "CHIME") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;

    switch (type) {
      case "WAKE":
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1320, t + 0.15);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.18);
        break;
      case "SLEEP":
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(330, t + 0.15);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.18);
        break;
      case "SUCCESS":
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, t);
        osc.frequency.exponentialRampToValueAtTime(659.25, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.18);
        break;
      case "ERROR":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.25);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.start(t);
        osc.stop(t + 0.28);
        break;
      default:
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
  } catch {}
}

export function useVoiceAssistantEngine({
  onFinalSpeech,
  onInterimSpeech,
  onWakeWord,
  onBargeIn,
  language = "en-US",
  inactivityTimeoutMs = 25000,
  enableWakeWord = true,
  devDebug = false,
  keepSttAlwaysOn = false,
}: UseVoiceAssistantEngineOptions = {}) {
  // Single Authority State
  const [state, setState] = useState<VoiceState>(enableWakeWord ? "AWAKENER" : "OFF");
  const stateRef = useRef<VoiceState>(enableWakeWord ? "AWAKENER" : "OFF");

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [lastError, setLastError] = useState<{ code: string; message: string; timestamp: number } | null>(null);
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "unsupported" | "unknown">("unknown");
  const [sttServiceStatus, setSttServiceStatus] = useState<SttServiceStatus>("unknown");
  const [networkRetryCount, setNetworkRetryCount] = useState(0);

  // Synchronous State Transition
  const transitionTo = useCallback((nextState: VoiceState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  // Single Authority STT Provider Ref
  const sttProviderRef = useRef<BrowserSttProvider | null>(null);
  const isSpeakingRef = useRef(false);
  const ttsSessionIdRef = useRef(0);
  const ttsWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkRetryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Function Pointers to Break Circular References
  const startSttListeningRef = useRef<() => void>(() => {});
  const speakRef = useRef<(text: string, options?: SpeakOptions) => void>(() => {});
  const resetInactivityTimerRef = useRef<() => void>(() => {});

  // Platform Feature Detections
  const isSpeechRecognitionSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const isSpeechSynthesisSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const isMediaDevicesSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const isSecureContext =
    typeof window !== "undefined" ? window.isSecureContext : true;

  const isHttpIp =
    typeof window !== "undefined" &&
    !isSecureContext &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1";

  // Pre-load SpeechSynthesis Voices
  useEffect(() => {
    if (!isSpeechSynthesisSupported) return;

    const loadVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          voicesRef.current = available;
        }
      } catch {}
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSpeechSynthesisSupported]);

  // Query microphone permission state
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        setMicPermission(status.state as "granted" | "denied" | "prompt");
        status.onchange = () => {
          setMicPermission(status.state as "granted" | "denied" | "prompt");
        };
      })
      .catch(() => {
        setMicPermission("unknown");
      });
  }, []);

  // ── Inactivity Timer: ACTIVE -> AWAKENER (25s) ───────────────────────────

  const resetInactivityTimer = useCallback(() => {
    if (keepSttAlwaysOn) return; // keep STT active indefinitely in this mode
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    inactivityTimerRef.current = setTimeout(() => {
      if (stateRef.current === "LISTENING" || stateRef.current === "PROCESSING" || stateRef.current === "SPEAKING") {
        console.log("[VoiceEngine] Inactivity timeout reached. Transitioning to AWAKENER mode.");
        playAudioCue("SLEEP");
        setPendingConfirmation(null);
        setInterimTranscript("");
        transitionTo("AWAKENER");
        // Ensure STT is active for wake word
        if (!sttProviderRef.current?.isActive() && !isSpeakingRef.current) {
          startSttListeningRef.current();
        }
      }
    }, inactivityTimeoutMs);
  }, [inactivityTimeoutMs, transitionTo, keepSttAlwaysOn]);

  useEffect(() => {
    resetInactivityTimerRef.current = resetInactivityTimer;
  }, [resetInactivityTimer]);

  // ── Text-To-Speech (TTS) Engine with Crash/Overlap Prevention ───────────────

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!isSpeechSynthesisSupported || !text || !text.trim()) {
        if (options.onEnd) options.onEnd();
        if (options.nextState) transitionTo(options.nextState);
        return;
      }

      // Stop STT temporarily to prevent Dev from hearing its own voice
      if (sttProviderRef.current?.isActive()) {
        sttProviderRef.current.abort();
      }

      if (ttsWatchdogRef.current) {
        clearTimeout(ttsWatchdogRef.current);
        ttsWatchdogRef.current = null;
      }

      try {
        window.speechSynthesis.cancel();
      } catch {}

      const currentTtsSession = ++ttsSessionIdRef.current;
      isSpeakingRef.current = true;
      transitionTo("SPEAKING");
      setResponse(text);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select natural voice
      const voices = voicesRef.current;
      if (voices.length > 0) {
        const isBengali = /[\u0980-\u09FF]/.test(text) || language.startsWith("bn");
        if (isBengali) {
          const bnVoice = voices.find((v) => v.lang.startsWith("bn") || v.name.toLowerCase().includes("bengali") || v.name.toLowerCase().includes("bangla"));
          if (bnVoice) utterance.voice = bnVoice;
        } else {
          const enVoice = voices.find((v) => (v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Jenny")))) || voices.find((v) => v.lang.startsWith("en"));
          if (enVoice) utterance.voice = enVoice;
        }
      }

      const handleSpeechDone = () => {
        if (ttsSessionIdRef.current !== currentTtsSession) return;
        if (ttsWatchdogRef.current) {
          clearTimeout(ttsWatchdogRef.current);
          ttsWatchdogRef.current = null;
        }

        isSpeakingRef.current = false;
        const next = options.nextState || "LISTENING";
        transitionTo(next);

        if (options.onEnd) options.onEnd();

        // Safely re-arm microphone after 200ms acoustic decay
        setTimeout(() => {
          if (stateRef.current !== "OFF" && stateRef.current !== "SPEAKING" && stateRef.current !== "STOPPING" && stateRef.current !== "ERROR") {
            startSttListeningRef.current();
          }
        }, 200);
      };

      utterance.onend = handleSpeechDone;
      utterance.onerror = (e) => {
        console.warn("[VoiceEngine] TTS error event:", e.error);
        handleSpeechDone();
      };

      // Chrome SpeechSynthesis Watchdog & Keep-Alive Pulse
      const calculatedDuration = Math.min(60000, Math.max(8000, text.length * 110 + 5000));
      ttsWatchdogRef.current = setTimeout(() => {
        console.warn("[VoiceEngine] TTS watchdog triggered after timeout");
        try {
          window.speechSynthesis.cancel();
        } catch {}
        handleSpeechDone();
      }, calculatedDuration);

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("[VoiceEngine] speak() failed:", err);
        handleSpeechDone();
      }
    },
    [isSpeechSynthesisSupported, language, transitionTo]
  );

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // ── Single Master STT Provider Listener ────────────────────────────────────

  const startSttListening = useCallback(() => {
    if (!isSpeechRecognitionSupported || isHttpIp || !isMediaDevicesSupported) {
      transitionTo("ERROR");
      setLastError({
        code: "unsupported",
        message: "Voice input is unavailable in this browser or context. Use text input or a Chrome/Edge browser with microphone permission enabled.",
        timestamp: Date.now(),
      });
      return;
    }

    if (isSpeakingRef.current || stateRef.current === "OFF" || stateRef.current === "SPEAKING" || stateRef.current === "STOPPING") {
      return;
    }

    // Instantiate master STT provider if not present
    if (!sttProviderRef.current) {
      sttProviderRef.current = new BrowserSttProvider({
        language,
        continuous: true,
        interimResults: true,
      });
    }

    const provider = sttProviderRef.current;
    if (provider.isActive() || provider.isStarting) {
      return;
    }

    // Wire single-authority callbacks
    provider.onStart = () => {
      setMicPermission("granted");
      setSttServiceStatus("connected");
      networkRetryCountRef.current = 0;
      setNetworkRetryCount(0);
      if (stateRef.current === "STARTING") {
        transitionTo("AWAKENER");
      }
    };

    provider.onResult = (result: SttResult) => {
      if (devDebug) {
        try {
          console.log("[VoiceEngine][DEBUG] STT result:", result);
          const scores = getWakeMatchScores(result.transcript || "");
          console.log("[VoiceEngine][DEBUG] wake-match scores (transcript):", scores);
          if (result.alternatives && result.alternatives.length > 0) {
            for (const alt of result.alternatives) {
              const altScores = getWakeMatchScores(alt);
              console.log("[VoiceEngine][DEBUG] wake-match scores (alt):", alt, altScores);
            }
          }
        } catch (e) {
          console.warn("[VoiceEngine][DEBUG] failed to compute wake-match scores", e);
        }
      }
      setSttServiceStatus("connected");
      networkRetryCountRef.current = 0;
      setNetworkRetryCount(0);

      const spokenText = result.transcript;
      if (!spokenText) return;

      // ── High Priority Barge-In Stop Check ─────────────────────────────────
      const isStopWord = /\b(stop|quiet|be quiet|shut up|silence|pause|cancel|thamo|thamun|bondho koro|chup)\b/i.test(spokenText);
      if (isSpeakingRef.current && isStopWord) {
        console.log("[VoiceEngine] 🛑 Barge-in Stop Detected:", spokenText);
        try {
          window.speechSynthesis.cancel();
        } catch {}
        if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
        isSpeakingRef.current = false;
        playAudioCue("CHIME");
        transitionTo("LISTENING");
        if (onBargeIn) onBargeIn();
        return;
      }

      if (isSpeakingRef.current) {
        // Discard any sound heard while Dev is speaking
        return;
      }

      // ── AWAKENER MODE: Silent Wake Detection ──────────────────────────────
      if (stateRef.current === "AWAKENER") {
        const candidates = [spokenText, ...(result.alternatives || [])];
        let matchedWake: WakeWordResult | null = null;

        for (const cand of candidates) {
          const w = extractWakeWord(cand);
          if (w.hasWakeWord) {
            matchedWake = w;
            break;
          }
        }

        if (matchedWake && matchedWake.hasWakeWord) {
          // If there is a trailing command and result is not final yet, show interim
          if (!result.isFinal && matchedWake.commandAfterWakeWord && matchedWake.commandAfterWakeWord.trim()) {
            setInterimTranscript(matchedWake.commandAfterWakeWord);
            if (onInterimSpeech) onInterimSpeech(matchedWake.commandAfterWakeWord);
            return;
          }

          console.log("[VoiceEngine] ⚡ Wake Triggered in AWAKENER Mode:", matchedWake);
          playAudioCue("WAKE");
          resetInactivityTimer();

          if (matchedWake.commandAfterWakeWord && matchedWake.commandAfterWakeWord.trim()) {
            setTranscript(matchedWake.commandAfterWakeWord);
            setInterimTranscript("");
            transitionTo("PROCESSING");
            if (onFinalSpeech) onFinalSpeech(matchedWake.commandAfterWakeWord);
          } else {
            setTranscript("");
            setInterimTranscript("");
            transitionTo("LISTENING");
            if (onWakeWord) {
              onWakeWord(matchedWake.wakeWord || "Dev", "");
            } else {
              speak("Hi! I'm awake and listening. How can I help you?", { nextState: "LISTENING" });
            }
          }
        }
        return;
      }

      // ── ACTIVE / LISTENING MODE: Standard Command Processing ─────────────
      resetInactivityTimer();
      setInterimTranscript(spokenText);
      if (onInterimSpeech) onInterimSpeech(spokenText);

      if (result.isFinal) {
        setTranscript(spokenText);
        setInterimTranscript("");
        transitionTo("PROCESSING");
        if (onFinalSpeech) onFinalSpeech(spokenText);
      }
    };

    provider.onError = (error: SttError) => {
      console.warn("[VoiceEngine] STT error:", error.code, error.message);

      switch (error.code) {
        case "not-allowed":
        case "service-not-allowed":
          setMicPermission("denied");
          setSttServiceStatus("unavailable");
          transitionTo("ERROR");
          setLastError({
            code: error.code,
            message: "Microphone access is blocked. Please allow microphone access in Chrome site settings.",
            timestamp: Date.now(),
          });
          break;

        case "audio-capture":
          setMicPermission("denied");
          setSttServiceStatus("unavailable");
          transitionTo("ERROR");
          setLastError({
            code: "audio-capture",
            message: "I can't access your microphone. Please check that your microphone is connected.",
            timestamp: Date.now(),
          });
          break;

        case "network":
          // Exponential backoff for network speech service blips
          if (networkRetryCountRef.current < MAX_NETWORK_RETRIES) {
            const attempt = networkRetryCountRef.current;
            networkRetryCountRef.current++;
            setNetworkRetryCount(networkRetryCountRef.current);
            setSttServiceStatus("retrying");

            const delay = getExponentialBackoff(attempt);
            console.log(`[VoiceEngine] Retrying network STT (Attempt ${networkRetryCountRef.current}/${MAX_NETWORK_RETRIES}) in ${delay}ms`);

            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
              if (stateRef.current !== "OFF" && stateRef.current !== "SPEAKING") {
                startSttListening();
              }
            }, delay);
          } else {
            setSttServiceStatus("network_error");
            setLastError({
              code: "network",
              message: "Voice service temporarily unavailable. Retrying in background...",
              timestamp: Date.now(),
            });
            // Re-attempt after 10s
            setTimeout(() => {
              networkRetryCountRef.current = 0;
              setNetworkRetryCount(0);
              if (stateRef.current !== "OFF") startSttListening();
            }, 10000);
          }
          break;

        case "no-speech":
          // Normal silence timeout in Chrome — auto-restart silently after 300ms
          if (stateRef.current !== "OFF" && stateRef.current !== "SPEAKING" && stateRef.current !== "ERROR") {
            setTimeout(() => {
              if (stateRef.current !== "OFF" && !sttProviderRef.current?.isActive() && !isSpeakingRef.current) {
                startSttListening();
              }
            }, 300);
          }
          break;

        default:
          break;
      }
    };

    provider.onEnd = () => {
      // Chrome normal onend event — cleanly restart session if in AWAKENER or LISTENING mode
      if (stateRef.current === "AWAKENER" || stateRef.current === "LISTENING") {
        setTimeout(() => {
          if (
            (stateRef.current === "AWAKENER" || stateRef.current === "LISTENING") &&
            !sttProviderRef.current?.isActive() &&
            !isSpeakingRef.current
          ) {
            startSttListening();
          }
        }, 250);
      }
    };

    provider.start();
  }, [
    isSpeechRecognitionSupported,
    language,
    onBargeIn,
    onFinalSpeech,
    onInterimSpeech,
    onWakeWord,
    resetInactivityTimer,
    speak,
    transitionTo,
  ]);

  useEffect(() => {
    startSttListeningRef.current = startSttListening;
  }, [startSttListening]);

  // ── Auto-Start Master Awakener on First User Interaction ───────────────────

  useEffect(() => {
    if (!isSpeechRecognitionSupported || isHttpIp) return;

    const handleFirstGesture = async () => {
      if (isMediaDevicesSupported && micPermission !== "granted") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          setMicPermission("granted");
        } catch {}
      }

      if (stateRef.current === "AWAKENER" && !sttProviderRef.current?.isActive()) {
        startSttListening();
      }
    };

    window.addEventListener("click", handleFirstGesture, { once: true });
    window.addEventListener("keydown", handleFirstGesture, { once: true });
    window.addEventListener("touchstart", handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
      window.removeEventListener("touchstart", handleFirstGesture);
    };
  }, [isHttpIp, isMediaDevicesSupported, isSpeechRecognitionSupported, micPermission, startSttListening]);

  // Start on mount if permission was already granted
  useEffect(() => {
    if (enableWakeWord && isSpeechRecognitionSupported && !isHttpIp && micPermission === "granted") {
      startSttListening();
    }
  }, [enableWakeWord, isHttpIp, isSpeechRecognitionSupported, micPermission, startSttListening]);

  // ── User Activation (Clicking Mic / Key Shortcut) ───────────────────────────

  const activateAssistant = useCallback(
    async (greetingText?: string) => {
      if (isHttpIp || !isSpeechRecognitionSupported || !isMediaDevicesSupported) {
        setMicPermission("unsupported");
        transitionTo("ERROR");
        setLastError({
          code: "unsupported",
          message: "Voice assistant is unavailable in this browser. Use text commands or open the app in Chrome/Edge with microphone permission enabled.",
          timestamp: Date.now(),
        });
        return;
      }

      if (micPermission !== "granted" && isMediaDevicesSupported) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          setMicPermission("granted");
        } catch {
          setMicPermission("denied");
          transitionTo("ERROR");
          setLastError({
            code: "not-allowed",
            message: "Microphone access is blocked. Please allow microphone access in Chrome/Edge site settings or type a command instead.",
            timestamp: Date.now(),
          });
          speak("Microphone access is blocked. Please allow microphone access in Chrome site settings or type a command instead.", { nextState: "ERROR" });
          return;
        }
      }

      playAudioCue("WAKE");
      setTranscript("");
      setInterimTranscript("");
      setPendingConfirmation(null);
      resetInactivityTimer();

      if (greetingText && greetingText.trim()) {
        speak(greetingText, { nextState: "LISTENING" });
      } else {
        transitionTo("LISTENING");
        startSttListening();
      }
    },
    [isHttpIp, isMediaDevicesSupported, isSpeechRecognitionSupported, micPermission, resetInactivityTimer, speak, startSttListening, transitionTo]
  );

  // ── Deactivate Assistant (Transition to AWAKENER / OFF) ─────────────────────

  const deactivateAssistant = useCallback(
    (reason = "Dev paused.") => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);

      try {
        window.speechSynthesis.cancel();
      } catch {}
      isSpeakingRef.current = false;

      playAudioCue("SLEEP");
      setResponse("");
      setPendingConfirmation(null);

      // Transition smoothly to AWAKENER (listening in silent wake mode)
      transitionTo("AWAKENER");
      speak(reason, { nextState: "AWAKENER" });
    },
    [speak, transitionTo]
  );

  // ── Diagnostics Payload Builder ───────────────────────────────────────────

  const getDiagnosticsData = useCallback((): VoiceDiagnosticsData => {
    return {
      browser: detectBrowser(),
      isSecureContext,
      protocol: typeof location !== "undefined" ? location.protocol : "http:",
      host: typeof location !== "undefined" ? location.host : "localhost",
      speechRecognitionSupported: isSpeechRecognitionSupported,
      speechSynthesisSupported: isSpeechSynthesisSupported,
      mediaDevicesSupported: isMediaDevicesSupported,
      micPermission,
      state,
      sttServiceStatus,
      networkRetryCount,
      maxRetries: MAX_NETWORK_RETRIES,
      isListening: !!sttProviderRef.current?.isActive(),
      isSpeaking: isSpeakingRef.current,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      language,
      interimTranscript,
      finalTranscript: transcript,
      lastIntent: "",
      lastEntities: {},
      lastReason: "",
      lastError,
      loadedVoicesCount: voicesRef.current.length,
      sessionId: sttProviderRef.current?.sessionId || 0,
    };
  }, [
    isHttpIp,
    isMediaDevicesSupported,
    isSecureContext,
    isSpeechRecognitionSupported,
    isSpeechSynthesisSupported,
    language,
    lastError,
    micPermission,
    networkRetryCount,
    state,
    sttServiceStatus,
    transcript,
    interimTranscript,
  ]);

  return {
    state,
    isActive: state === "LISTENING" || state === "PROCESSING" || state === "SPEAKING",
    isAwakenerLive: state === "AWAKENER",
    transcript,
    interimTranscript,
    response,
    pendingConfirmation,
    lastError,
    micPermission,
    sttServiceStatus,
    networkRetryCount,
    isSpeechRecognitionSupported,
    isSpeechSynthesisSupported,
    activateAssistant,
    deactivateAssistant,
    speak,
    transitionTo,
    setPendingConfirmation,
    setTranscript,
    setResponse,
    resetInactivityTimer,
    getDiagnosticsData,
    playAudioCue,
  };
}

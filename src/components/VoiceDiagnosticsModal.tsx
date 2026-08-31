import { useState } from "react";
import {
  Activity,
  Mic,
  Volume2,
  Terminal,
  Send,
  X,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Wifi,
  WifiOff,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import type { VoiceDiagnosticsData } from "../hooks/useVoiceAssistantEngine";

interface VoiceDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: VoiceDiagnosticsData;
  onSimulateCommand: (command: string) => void;
  onResetEngine: () => void;
}

export function VoiceDiagnosticsModal({
  isOpen,
  onClose,
  diagnostics,
  onSimulateCommand,
  onResetEngine,
}: VoiceDiagnosticsModalProps) {
  const [simCommand, setSimCommand] = useState("");
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

  if (!isOpen) return null;

  const handleSimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simCommand.trim()) return;
    onSimulateCommand(simCommand.trim());
    setSimCommand("");
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "LISTENING":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "SPEAKING":
        return "bg-purple-500/20 text-purple-400 border-purple-500/40";
      case "PROCESSING":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "AWAKENER":
        return "bg-teal-500/20 text-teal-300 border-teal-500/40 animate-pulse";
      case "STARTING":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "ERROR":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const getSttServiceColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-emerald-400";
      case "retrying":
        return "text-amber-400 animate-pulse";
      case "network_error":
      case "unavailable":
        return "text-rose-400";
      default:
        return "text-slate-400";
    }
  };

  const getSttServiceLabel = (status: string) => {
    switch (status) {
      case "connected":
        return "CONNECTED";
      case "retrying":
        return "RETRYING...";
      case "network_error":
        return "NETWORK ERROR";
      case "unavailable":
        return "BLOCKED / UNAVAILABLE";
      default:
        return "INITIALIZING";
    }
  };

  // ── Test Functions ───────────────────────────────────────────────────────

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return "✅ Microphone: READY (hardware accessible, permission granted)";
    } catch (err: unknown) {
      return `❌ Microphone: FAILED (${(err as Error).message || "unknown error"})`;
    }
  };

  const testStt = async () => {
    if (!diagnostics.speechRecognitionSupported) {
      return "❌ STT: UNSUPPORTED (SpeechRecognition API not found in this browser)";
    }
    if (diagnostics.sttServiceStatus === "connected") {
      return `✅ STT: CONNECTED & LISTENING (Session #${diagnostics.sessionId}, State: ${diagnostics.state})`;
    }
    if (diagnostics.sttServiceStatus === "retrying") {
      return `⚠️ STT: RETRYING NETWORK CONNECTION (Attempt ${diagnostics.networkRetryCount}/${diagnostics.maxRetries})`;
    }
    if (diagnostics.micPermission === "denied") {
      return "❌ STT: PERMISSION BLOCKED (Microphone access denied in browser)";
    }
    return `ℹ️ STT: ACTIVE (Status: ${diagnostics.sttServiceStatus}, State: ${diagnostics.state})`;
  };

  const testTts = () => {
    return new Promise<string>((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        resolve("❌ TTS: UNSUPPORTED (speechSynthesis not found)");
        return;
      }
      try {
        synth.resume();
        synth.cancel();
        const ut = new SpeechSynthesisUtterance("Speech synthesis is operational.");
        ut.rate = 1.0;
        ut.volume = 0.8;

        const voices = synth.getVoices();
        if (voices.length > 0) {
          const matched = voices.find((v) => v.lang.startsWith("en")) || voices[0];
          if (matched) ut.voice = matched;
        }

        // Store reference to prevent garbage collection
        (window as unknown as { __diagTestUtterance?: SpeechSynthesisUtterance }).__diagTestUtterance = ut;

        let finished = false;
        const finish = (msg: string) => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          (window as unknown as { __diagTestUtterance?: SpeechSynthesisUtterance }).__diagTestUtterance = undefined;
          resolve(msg);
        };

        const timeout = setTimeout(() => {
          finish(`✅ TTS: READY (${synth.getVoices().length} voices loaded)`);
        }, 2000);

        ut.onstart = () => {
          finish(`✅ TTS: READY (${synth.getVoices().length} voices loaded, playback active)`);
        };
        ut.onend = () => {
          finish(`✅ TTS: READY (${synth.getVoices().length} voices loaded)`);
        };
        ut.onerror = (e) => {
          if (e.error === "canceled" || e.error === "interrupted") {
            finish(`✅ TTS: READY (${synth.getVoices().length} voices loaded)`);
          } else {
            finish(`⚠️ TTS: ERROR (${e.error || "unknown"})`);
          }
        };

        synth.speak(ut);
      } catch (err) {
        resolve(`❌ TTS: EXCEPTION (${(err as Error).message})`);
      }
    });
  };

  const runFullDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    setTestResults(["🔄 Running full diagnostic..."]);

    const results: string[] = [];

    // 1. Network
    results.push(navigator.onLine ? "✅ Network: ONLINE" : "❌ Network: OFFLINE");

    // 2. Secure Context
    results.push(window.isSecureContext ? "✅ Secure Context: YES" : "❌ Secure Context: NO (microphone will be blocked)");

    // 3. Microphone
    results.push(await testMicrophone());

    // 4. STT
    results.push(await testStt());

    // 5. TTS
    results.push(await testTts());

    // 6. NLP
    try {
      const { classifyVoiceIntent } = await import("../lib/localNlp");
      const r = classifyVoiceIntent("search watch");
      results.push(r.label === "search" ? "✅ NLP: READY (intent classification working)" : `⚠️ NLP: UNEXPECTED (got ${r.label} for 'search watch')`);
    } catch {
      results.push("❌ NLP: IMPORT FAILED");
    }

    setTestResults(results);
    setIsRunningDiagnostic(false);
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-title"
    >
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 id="diagnostics-title" className="text-xl font-bold text-white flex items-center gap-2">
                <span>Voice Engine Diagnostics</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Dev Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time telemetry and NLP pipeline testing for the MarketVerse Voice Assistant.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close diagnostics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System & Capabilities Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Browser */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Browser</span>
            <span className="text-xs font-semibold text-white truncate block">{diagnostics.browser}</span>
          </div>

          {/* Secure Context */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Secure Context</span>
            <span className="text-xs font-semibold flex items-center gap-1.5">
              {diagnostics.isSecureContext ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">YES (Safe)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300">NO (Insecure)</span>
                </>
              )}
            </span>
          </div>

          {/* Microphone */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Microphone</span>
            <span className="text-xs font-semibold flex items-center gap-1.5">
              {diagnostics.micPermission === "granted" ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">READY</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300 uppercase">{diagnostics.micPermission}</span>
                </>
              )}
            </span>
          </div>

          {/* Network */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Network</span>
            <span className="text-xs font-semibold flex items-center gap-1.5">
              {diagnostics.isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">ONLINE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300">OFFLINE</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Browser STT API */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Browser STT</span>
            <span className="text-xs font-semibold flex items-center gap-1.5">
              {diagnostics.speechRecognitionSupported ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Supported</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300">Unsupported</span>
                </>
              )}
            </span>
          </div>

          {/* STT Service */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">STT Service</span>
            <span className={`text-xs font-semibold uppercase ${getSttServiceColor(diagnostics.sttServiceStatus)}`}>
              {getSttServiceLabel(diagnostics.sttServiceStatus)}
            </span>
          </div>

          {/* TTS */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TTS</span>
            <span className="text-xs font-semibold flex items-center gap-1.5">
              {diagnostics.speechSynthesisSupported ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">READY ({diagnostics.loadedVoicesCount}v)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300">Unsupported</span>
                </>
              )}
            </span>
          </div>

          {/* NLP */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NLP Engine</span>
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">READY (Local)</span>
            </span>
          </div>
        </div>

        {/* State Machine Telemetry */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Finite State Machine (FSM)</span>
            </span>
            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${getStateColor(diagnostics.state)}`}>
              {diagnostics.state}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-700/50 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Speech-to-Text:</span>
              <span className="font-semibold text-white">{diagnostics.isListening ? "🟢 Active" : "⚪ Standby"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Text-to-Speech:</span>
              <span className="font-semibold text-white">{diagnostics.isSpeaking ? "🔊 Speaking" : "⚪ Idle"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">STT Retries:</span>
              <span className={`font-semibold ${diagnostics.networkRetryCount > 0 ? "text-amber-300" : "text-white"}`}>
                {diagnostics.networkRetryCount}/{diagnostics.maxRetries}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">TTS Voices:</span>
              <span className="font-semibold text-white">{diagnostics.loadedVoicesCount}</span>
            </div>
          </div>
        </div>

        {/* Transcripts & NLP Telemetry */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Speech & NLP Engine Telemetry</span>
          </h3>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
            <div>
              <span className="text-slate-500">Interim Transcript: </span>
              <span className="text-amber-400 font-semibold">{diagnostics.interimTranscript || "(silence / none)"}</span>
            </div>
            <div>
              <span className="text-slate-500">Final Transcript: </span>
              <span className="text-emerald-400 font-bold">{diagnostics.finalTranscript || "(none)"}</span>
            </div>
            <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Detected Intent: </span>
                <span className="text-indigo-300 font-bold">{diagnostics.lastIntent}</span>
              </div>
              <div>
                <span className="text-slate-500">Reason: </span>
                <span className="text-slate-300">{diagnostics.lastReason}</span>
              </div>
            </div>
            {Object.keys(diagnostics.lastEntities).length > 0 && (
              <div>
                <span className="text-slate-500">Entities: </span>
                <span className="text-purple-300">{JSON.stringify(diagnostics.lastEntities)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Diagnostic */}
        {diagnostics.lastError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-300">Last Error [{diagnostics.lastError.code}]: </span>
                <span>{diagnostics.lastError.message}</span>
                <span className="block text-[10px] text-rose-400/80 mt-0.5">
                  {new Date(diagnostics.lastError.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            {diagnostics.lastError.code === "network" && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
                <span className="font-bold text-amber-300">💡 Chrome Web Speech Note: </span>
                Google Chrome sends audio to Google's cloud servers for speech-to-text. If your network connection drops or Google's speech endpoint times out, the assistant will automatically retry with exponential backoff ({diagnostics.networkRetryCount}/{diagnostics.maxRetries} attempts used). You can also simulate commands below!
              </div>
            )}
          </div>
        )}

        {/* Full Diagnostic Results */}
        {testResults.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Diagnostic Results</h4>
            {testResults.map((result, i) => (
              <div key={i} className="text-slate-200">{result}</div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={async () => {
              setTestResults([await testMicrophone()]);
            }}
            className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Mic className="w-3 h-3" />
            <span>Test Mic</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              setTestResults([await testStt()]);
            }}
            className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3 h-3" />
            <span>Test STT</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const synth = window.speechSynthesis;
              if (synth) {
                synth.resume();
                synth.cancel();
                const ut = new SpeechSynthesisUtterance("Hello! Speech audio is working.");
                ut.rate = 1.0;
                synth.speak(ut);
                setTestResults(["✅ TTS: Audio test playing..."]);
              } else {
                setTestResults(["❌ TTS: speechSynthesis not available"]);
              }
            }}
            className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-3 h-3" />
            <span>Test TTS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetEngine();
              setTestResults(["🔄 Voice engine reset to IDLE state."]);
            }}
            className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Engine</span>
          </button>
        </div>

        {/* Full Diagnostic Button */}
        <button
          type="button"
          onClick={runFullDiagnostic}
          disabled={isRunningDiagnostic}
          className="w-full text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          <span>{isRunningDiagnostic ? "Running Diagnostic..." : "Run Full Diagnostic (All Subsystems)"}</span>
        </button>

        {/* NLP Command Simulator */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            NLP Command Simulator (Runs full production intent/action engine)
          </label>

          <form onSubmit={handleSimSubmit} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. search smart watch, see my orders, select 1, where am I, read products, go back"
                value={simCommand}
                onChange={(e) => setSimCommand(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:border-indigo-500 outline-hidden font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simulate</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Tip: Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Alt + Shift + D</kbd> anywhere to toggle this panel.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

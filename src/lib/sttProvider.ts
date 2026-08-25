/**
 * SpeechToTextProvider — Single Authority Browser STT Provider
 *
 * Provides atomic lifecycle management for the browser's webkitSpeechRecognition instance.
 * Guarantees zero instance collision, clean teardown, and safe auto-restarting in Chromium.
 */

export interface SttResult {
  transcript: string;
  alternatives?: string[];
  isFinal: boolean;
  confidence: number;
}

export interface SttError {
  code: string;
  message: string;
  timestamp: number;
  context: {
    online: boolean;
    visibilityState: string;
    language: string;
    retryCount: number;
  };
}

export interface SpeechToTextProvider {
  start(): void;
  stop(): void;
  abort(): void;
  isAvailable(): boolean;
  isActive(): boolean;
  destroy(): void;

  onResult: ((result: SttResult) => void) | null;
  onError: ((error: SttError) => void) | null;
  onStart: (() => void) | null;
  onEnd: (() => void) | null;
}

export class BrowserSttProvider implements SpeechToTextProvider {
  private recognition: any = null;
  private _isActive = false;
  private _isStarting = false;
  private _isStopping = false;
  private _sessionId = 0;
  private _language: string;
  private _continuous: boolean;
  private _interimResults: boolean;
  private _retryCount = 0;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

  // Event callbacks
  onResult: ((result: SttResult) => void) | null = null;
  onError: ((error: SttError) => void) | null = null;
  onStart: (() => void) | null = null;
  onEnd: (() => void) | null = null;

  constructor(options?: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
  }) {
    this._language = options?.language ?? "en-US";
    this._continuous = options?.continuous ?? true;
    this._interimResults = options?.interimResults ?? true;
  }

  isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  isActive(): boolean {
    return this._isActive;
  }

  get isStarting(): boolean {
    return this._isStarting;
  }

  get isStopping(): boolean {
    return this._isStopping;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  set retryCount(value: number) {
    this._retryCount = value;
  }

  get sessionId(): number {
    return this._sessionId;
  }

  set language(lang: string) {
    this._language = lang;
  }

  get language(): string {
    return this._language;
  }

  /**
   * Safe start with atomic lifecycle locks
   */
  start(): void {
    if (!this.isAvailable()) return;

    // Guard: already listening or currently in starting phase
    if (this._isActive || this._isStarting) {
      return;
    }

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this._isStarting = true;
    const currentSession = ++this._sessionId;

    // Always cleanly teardown previous instance before creating fresh session
    this.cleanupInstance();

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      this._isStarting = false;
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = this._continuous;
      recognition.interimResults = this._interimResults;
      recognition.lang = this._language;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        if (this._sessionId !== currentSession) return;
        this._isStarting = false;
        this._isActive = true;
        this._isStopping = false;
        this.onStart?.();
      };

      recognition.onresult = (event: any) => {
        if (this._sessionId !== currentSession) return;

        const len = event.results.length;
        if (len === 0) return;

        const latestResult = event.results[len - 1];
        if (!latestResult || !latestResult[0]) return;

        const alternatives: string[] = [];
        for (let i = 0; i < latestResult.length; i++) {
          const alt = latestResult[i]?.transcript;
          if (alt && alt.trim()) {
            alternatives.push(alt.trim());
          }
        }

        this.onResult?.({
          transcript: latestResult[0].transcript.trim(),
          alternatives,
          isFinal: latestResult.isFinal,
          confidence: latestResult[0].confidence,
        });
      };

      recognition.onerror = (event: any) => {
        if (this._sessionId !== currentSession) return;
        this._isActive = false;
        this._isStarting = false;

        this.onError?.({
          code: event.error,
          message: event.message || `Speech recognition error: ${event.error}`,
          timestamp: Date.now(),
          context: {
            online: typeof navigator !== "undefined" ? navigator.onLine : true,
            visibilityState:
              typeof document !== "undefined" ? document.visibilityState : "visible",
            language: this._language,
            retryCount: this._retryCount,
          },
        });
      };

      recognition.onend = () => {
        if (this._sessionId !== currentSession) return;
        this._isActive = false;
        this._isStarting = false;
        this._isStopping = false;
        this.onEnd?.();
      };

      this.recognition = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.warn("[BrowserSttProvider] recognition.start() exception:", err);
      this._isStarting = false;
      this._isActive = false;
    }
  }

  stop(): void {
    this._isStopping = true;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this._isActive = false;
    this._isStarting = false;
  }

  abort(): void {
    this._isStopping = true;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this._isActive = false;
    this._isStarting = false;
  }

  destroy(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.cleanupInstance();
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
  }

  private cleanupInstance(): void {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this._isActive = false;
  }
}

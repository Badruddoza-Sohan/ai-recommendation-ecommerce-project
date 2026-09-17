export interface StageTiming {
  stage: string;
  duration_ms: number;
}

export interface AITrace {
  trace_id: string;
  session_id: string;
  user_id?: string;
  timestamp: string;
  language: string;
  request_text: string;
  detected_intent?: string;
  extracted_entities?: Record<string, any>;
  stylist_memory_state?: Record<string, any>;
  retrieved_rag_chunks?: any[];
  retrieved_products?: any[];
  ranking_scores?: any[];
  prompt_version: string;
  model_name: string;
  generated_response: string;
  timings: StageTiming[];
  total_duration_ms: number;
}

export class ObservabilityEngine {
  private traces = new Map<string, AITrace>();

  public createTrace(sessionId: string, requestText: string, lang = "English"): AITrace {
    const traceId = `TRC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const trace: AITrace = {
      trace_id: traceId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      language: lang,
      request_text: requestText,
      prompt_version: "v2.1.0-enterprise",
      model_name: "qwen2.5:7b-instruct",
      generated_response: "",
      timings: [],
      total_duration_ms: 0,
    };
    this.traces.set(traceId, trace);
    return trace;
  }

  public recordStageTiming(traceId: string, stageName: string, durationMs: number): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.timings.push({ stage: stageName, duration_ms: durationMs });
      trace.total_duration_ms += durationMs;
    }
  }

  public finalizeTrace(traceId: string, responseText: string, metadata?: Partial<AITrace>): AITrace | null {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    trace.generated_response = responseText;
    if (metadata) {
      Object.assign(trace, metadata);
    }
    return trace;
  }

  public getTrace(traceId: string): AITrace | undefined {
    return this.traces.get(traceId);
  }

  public getAllTraces(): AITrace[] {
    return Array.from(this.traces.values()).reverse();
  }
}

let instance: ObservabilityEngine | null = null;
export function getObservabilityEngine(): ObservabilityEngine {
  if (!instance) instance = new ObservabilityEngine();
  return instance;
}

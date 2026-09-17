export interface TokenUsageRecord {
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  timestamp: string;
}

export class CostTracker {
  private records: TokenUsageRecord[] = [];
  // Standard pricing estimation per 1k tokens (Ollama local cost = $0.00)
  private costPer1kInput = 0.00015;
  private costPer1kOutput = 0.0006;

  public trackUsage(modelName: string, inputTokens: number, outputTokens: number): TokenUsageRecord {
    const cost = (inputTokens / 1000) * this.costPer1kInput + (outputTokens / 1000) * this.costPer1kOutput;
    const record: TokenUsageRecord = {
      model_name: modelName,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: Number(cost.toFixed(6)),
      timestamp: new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }

  public getSummary() {
    let totalIn = 0;
    let totalOut = 0;
    let totalCost = 0;

    for (const r of this.records) {
      totalIn += r.input_tokens;
      totalOut += r.output_tokens;
      totalCost += r.estimated_cost_usd;
    }

    return {
      total_requests: this.records.length,
      total_input_tokens: totalIn,
      total_output_tokens: totalOut,
      total_estimated_cost_usd: Number(totalCost.toFixed(4)),
      avg_tokens_per_request: this.records.length > 0 ? Math.round((totalIn + totalOut) / this.records.length) : 0,
    };
  }
}

let instance: CostTracker | null = null;
export function getCostTracker(): CostTracker {
  if (!instance) instance = new CostTracker();
  return instance;
}

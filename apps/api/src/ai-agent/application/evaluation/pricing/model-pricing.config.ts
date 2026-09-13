export interface ModelPricing {
  model: string;
  inputPricePerMillionTokens: number;
  outputPricePerMillionTokens: number;
  cachedInputPricePerMillionTokens?: number;
  effectiveFrom?: string;
}

export const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  'gpt-4o': {
    model: 'gpt-4o',
    inputPricePerMillionTokens: 2.5,
    outputPricePerMillionTokens: 10.0,
    cachedInputPricePerMillionTokens: 1.25,
    effectiveFrom: '2024-05-13',
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    inputPricePerMillionTokens: 0.15,
    outputPricePerMillionTokens: 0.6,
    cachedInputPricePerMillionTokens: 0.075,
    effectiveFrom: '2024-07-18',
  },
  'gpt-5.5': {
    model: 'gpt-5.5',
    inputPricePerMillionTokens: 2.5,
    outputPricePerMillionTokens: 10.0,
    cachedInputPricePerMillionTokens: 1.25,
    effectiveFrom: '2026-01-01',
  },
};

export interface CalculatedCost {
  estimatedInputCost?: number;
  estimatedOutputCost?: number;
  estimatedTotalCost?: number;
  pricingAvailable: boolean;
}

export function calculateModelCost(
  modelName: string,
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cachedInputTokens?: number;
    reasoningTokens?: number;
  },
): CalculatedCost {
  if (!usage || !modelName) {
    return { pricingAvailable: false };
  }

  const pricing = MODEL_PRICING_TABLE[modelName];
  if (!pricing) {
    return { pricingAvailable: false };
  }

  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cachedInputTokens = usage.cachedInputTokens ?? 0;

  const regularInputTokens = Math.max(0, inputTokens - cachedInputTokens);

  const regularInputCost =
    (regularInputTokens / 1_000_000) * pricing.inputPricePerMillionTokens;
  const cachedInputCost = pricing.cachedInputPricePerMillionTokens
    ? (cachedInputTokens / 1_000_000) * pricing.cachedInputPricePerMillionTokens
    : 0;

  const estimatedInputCost = parseFloat(
    (regularInputCost + cachedInputCost).toFixed(6),
  );
  const estimatedOutputCost = parseFloat(
    ((outputTokens / 1_000_000) * pricing.outputPricePerMillionTokens).toFixed(
      6,
    ),
  );
  const estimatedTotalCost = parseFloat(
    (estimatedInputCost + estimatedOutputCost).toFixed(6),
  );

  return {
    estimatedInputCost,
    estimatedOutputCost,
    estimatedTotalCost,
    pricingAvailable: true,
  };
}

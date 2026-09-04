export const AI_PROVIDERS = ["openai", "gemini", "openrouter"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiProviderOption = {
  id: AiProvider;
  label: string;
  baseUrl: string;
  defaultModel: string;
  exampleModel: string;
  keyPlaceholder: string;
};

/** Official OpenAI-compatible chat base URLs (appended with /chat/completions). */
export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    exampleModel: "gpt-4o",
    keyPlaceholder: "sk-…",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    exampleModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza…",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o",
    exampleModel: "openai/gpt-4o",
    keyPlaceholder: "sk-or-…",
  },
];

export const DEFAULT_AI_PROVIDER: AiProvider = "openai";

export function isAiProvider(value: string | null | undefined): value is AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider);
}

export function getAiProvider(id: string | null | undefined): AiProviderOption {
  return (
    AI_PROVIDER_OPTIONS.find((option) => option.id === id) ??
    AI_PROVIDER_OPTIONS[0]
  );
}

export function inferAiProvider(
  provider: string | null | undefined,
  baseUrl?: string | null,
): AiProvider {
  if (isAiProvider(provider)) return provider;
  const url = (baseUrl ?? "").toLowerCase();
  if (url.includes("generativelanguage.googleapis.com") || url.includes("googleapis.com")) {
    return "gemini";
  }
  if (url.includes("openrouter.ai")) return "openrouter";
  return DEFAULT_AI_PROVIDER;
}

export function resolveAiModel(
  providerId: string | null | undefined,
  model: string | null | undefined,
): string {
  const trimmed = model?.trim() ?? "";
  if (trimmed) return trimmed;
  return getAiProvider(providerId).defaultModel;
}

export function resolveAiConnection(options: {
  provider?: string | null;
  baseUrl?: string | null;
  model?: string | null;
}): { provider: AiProvider; baseUrl: string; model: string } {
  const provider = inferAiProvider(options.provider, options.baseUrl);
  const spec = getAiProvider(provider);
  return {
    provider,
    baseUrl: spec.baseUrl,
    model: resolveAiModel(provider, options.model),
  };
}

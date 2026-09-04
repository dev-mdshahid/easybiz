import { describe, expect, it } from "vitest";

import {
  inferAiProvider,
  resolveAiConnection,
  resolveAiModel,
} from "@/lib/ai-providers";

describe("ai providers", () => {
  it("infers Gemini and OpenRouter from a saved base URL", () => {
    expect(
      inferAiProvider(
        null,
        "https://generativelanguage.googleapis.com/v1beta/openai",
      ),
    ).toBe("gemini");
    expect(inferAiProvider(null, "https://openrouter.ai/api/v1")).toBe(
      "openrouter",
    );
    expect(inferAiProvider("openai", "https://openrouter.ai/api/v1")).toBe(
      "openai",
    );
  });

  it("keeps a pasted model code and only defaults when blank", () => {
    expect(resolveAiModel("gemini", "gemini-3-flash")).toBe("gemini-3-flash");
    expect(resolveAiModel("openai", "  gpt-4.1  ")).toBe("gpt-4.1");
    expect(resolveAiModel("openai", "   ")).toBe("gpt-4o");
  });

  it("uses the current official provider base URLs", () => {
    expect(resolveAiConnection({ provider: "openai" }).baseUrl).toBe(
      "https://api.openai.com/v1",
    );
    expect(resolveAiConnection({ provider: "gemini" }).baseUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai",
    );
    expect(resolveAiConnection({ provider: "openrouter" }).baseUrl).toBe(
      "https://openrouter.ai/api/v1",
    );
  });
});

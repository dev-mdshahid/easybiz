import { describe, expect, it } from "vitest";

import {
  isAnonymousClaims,
  isRecoveryClaims,
  safeNextPath,
} from "@/lib/auth-session";

describe("safeNextPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/orders")).toBe("/orders");
    expect(safeNextPath("/orders?tab=open")).toBe("/orders?tab=open");
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
});

describe("session claim helpers", () => {
  it("detects recovery AMR entries", () => {
    expect(isRecoveryClaims({ amr: ["pwd"] })).toBe(false);
    expect(isRecoveryClaims({ amr: ["recovery"] })).toBe(true);
    expect(isRecoveryClaims({ amr: [{ method: "recovery" }] })).toBe(true);
  });

  it("rejects anonymous JWTs", () => {
    expect(isAnonymousClaims({ is_anonymous: true })).toBe(true);
    expect(isAnonymousClaims({ is_anonymous: false })).toBe(false);
  });
});

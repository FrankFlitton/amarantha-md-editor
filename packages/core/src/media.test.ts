import { describe, expect, it } from "vitest";
import { arrayBufferToBase64, isRemoteOrDataUrl, sanitizeAssetFileName } from "./media";

describe("isRemoteOrDataUrl", () => {
  it("recognizes http(s) urls", () => {
    expect(isRemoteOrDataUrl("https://example.com/a.png")).toBe(true);
    expect(isRemoteOrDataUrl("http://example.com/a.png")).toBe(true);
  });

  it("recognizes data urls", () => {
    expect(isRemoteOrDataUrl("data:image/png;base64,AAAA")).toBe(true);
  });

  it("recognizes asset urls", () => {
    expect(isRemoteOrDataUrl("asset://localhost/a.png")).toBe(true);
  });

  it("treats relative paths as local", () => {
    expect(isRemoteOrDataUrl("assets/a.png")).toBe(false);
    expect(isRemoteOrDataUrl("./assets/a.png")).toBe(false);
  });

  it("treats absolute posix paths as local", () => {
    expect(isRemoteOrDataUrl("/Users/frank/a.png")).toBe(false);
  });
});

describe("sanitizeAssetFileName", () => {
  it("keeps safe characters", () => {
    expect(sanitizeAssetFileName("photo-1.png")).toBe("photo-1.png");
  });

  it("replaces unsafe characters", () => {
    expect(sanitizeAssetFileName("my photo (1).png")).toBe("my_photo__1_.png");
  });

  it("falls back for empty input", () => {
    expect(sanitizeAssetFileName("   ")).toBe("image");
  });
});

describe("arrayBufferToBase64", () => {
  it("encodes bytes to base64", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    expect(arrayBufferToBase64(bytes.buffer)).toBe(btoa("Hello"));
  });
});

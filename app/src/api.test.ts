import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

afterEach(() => { vi.unstubAllGlobals(); });
describe("abortable picker requests", () => {
  it("passes cancellation separately from recommendation params and keeps the backend UUID", async () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost" } });
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ picks: [] }) }); vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    await api.recommend({ budget: 30000, request_id: "request-A" }, controller.signal);
    const [url, options] = fetch.mock.calls[0];
    expect(new URL(url).searchParams.get("request_id")).toBe("request-A");
    expect(new URL(url).searchParams.has("signal")).toBe(false); expect(options.signal).toBe(controller.signal);
  });
  it("encodes each phone identity segment and passes its abort signal", async () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost" } });
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "Samsung/X Y" }) }); vi.stubGlobal("fetch", fetch);
    const controller = new AbortController(); await api.phone("Samsung/X Y", controller.signal);
    expect(fetch.mock.calls[0][0]).toBe("http://localhost/api/phones/Samsung/X%20Y");
    expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
  });
});

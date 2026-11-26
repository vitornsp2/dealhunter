import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, normalizeSerpApiItem, type ProductSearchProvider } from "./app.js";

const body = {
  productId: "mac-mini-32-512",
  query: "Mac mini 32 GB 512 GB",
  limit: 2,
  providerMode: "mock"
};

describe("API", () => {
  it("reports health and configured provider", async () => {
    const response = await request(createApp({ SEARCH_PROVIDER: "mock" })).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      provider: "mock",
      country: "BR",
      currency: "BRL"
    });
  });

  it("validates requests", async () => {
    const response = await request(createApp({ SEARCH_PROVIDER: "mock" }))
      .post("/api/search")
      .send({ query: "" });
    expect(response.status).toBe(400);
  });

  it("returns labeled candidates and serves a cache hit", async () => {
    const app = createApp({ SEARCH_PROVIDER: "mock" });
    const first = await request(app).post("/api/search").send(body);
    const second = await request(app).post("/api/search").send(body);
    expect(first.body).toMatchObject({ provider: "mock", modeLabel: "Simulado", cached: false });
    expect(first.body.offers).toHaveLength(2);
    expect(second.body.cached).toBe(true);
  });

  it("keeps requested mock/live mode separate", async () => {
    const response = await request(createApp({ SEARCH_PROVIDER: "mock" }))
      .post("/api/search")
      .send({ ...body, providerMode: "serpapi" });
    expect(response.status).toBe(409);
  });

  it("rate limits requests with a meaningful 429", async () => {
    const app = createApp({ SEARCH_PROVIDER: "mock", RATE_LIMIT_PER_MINUTE: "1" });
    await request(app).get("/health");
    const response = await request(app).get("/health");
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBeDefined();
  });

  it("maps provider network errors to 503", async () => {
    const provider: ProductSearchProvider = {
      name: "mock",
      async search() {
        const { ProviderError } = await import("./app.js");
        throw new ProviderError("sem rede", "network");
      }
    };
    const response = await request(createApp({ SEARCH_PROVIDER: "mock" }, provider))
      .post("/api/search")
      .send(body);
    expect(response.status).toBe(503);
  });

  it("normalizes documented product_link and BRL prices", () => {
    const offer = normalizeSerpApiItem(
      {
        product_id: "p1",
        title: "Produto",
        source: "Loja",
        extracted_price: 123.45,
        product_link: "https://example.com/product"
      },
      "product-1"
    );
    expect(offer).toMatchObject({
      productId: "product-1",
      advertisedPriceBrl: 123.45,
      url: "https://example.com/product"
    });
  });

  it("does not silently fall back when live configuration is missing", () => {
    expect(() => createApp({ SEARCH_PROVIDER: "serpapi" })).toThrow("SERPAPI_API_KEY");
  });
});

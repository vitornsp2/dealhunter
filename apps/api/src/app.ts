import cors from "cors";
import express from "express";
import {
  fictionalOffers,
  offerSchema,
  searchRequestSchema,
  type Offer,
  type SearchRequest,
  type SearchResponse
} from "@dealhunter/shared";

type ProviderName = "mock" | "serpapi";
export interface ProductSearchProvider {
  name: ProviderName;
  search(params: SearchRequest, signal: AbortSignal): Promise<Offer[]>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: "rate_limit" | "network" | "upstream" = "upstream"
  ) {
    super(message);
  }
}

export const mockProvider: ProductSearchProvider = {
  name: "mock",
  async search(params) {
    const productOffers = fictionalOffers.filter((item) => item.productId === params.productId);
    return productOffers.slice(0, params.limit);
  }
};

export function normalizeSerpApiItem(item: Record<string, unknown>, productId: string): Offer {
  const productLink = item.product_link;
  return offerSchema.parse({
    id: String(item.product_id ?? item.position ?? crypto.randomUUID()),
    productId,
    title: item.title,
    imageUrl: item.thumbnail,
    retailer: item.source,
    advertisedPriceBrl: Number(item.extracted_price),
    originalPriceBrl:
      item.extracted_old_price === undefined ? undefined : Number(item.extracted_old_price),
    shippingBrl:
      item.extracted_delivery === undefined ? undefined : Number(item.extracted_delivery),
    url: productLink,
    availability: "unknown",
    condition: String(item.title).toLowerCase().includes("recondicionado") ? "refurbished" : "new",
    retrievedAt: new Date().toISOString()
  });
}

export function createSerpApiProvider(apiKey: string): ProductSearchProvider {
  return {
    name: "serpapi",
    async search(params, signal) {
      const url = new URL("https://serpapi.com/search.json");
      url.search = new URLSearchParams({
        engine: "google_shopping",
        q: params.query,
        api_key: apiKey,
        google_domain: "google.com.br",
        gl: "br",
        hl: "pt-BR",
        num: String(params.limit)
      }).toString();
      let response: Response;
      try {
        response = await fetch(url, { signal });
      } catch (error) {
        if (signal.aborted) throw error;
        throw new ProviderError("Não foi possível conectar ao SerpApi", "network");
      }
      if (response.status === 429)
        throw new ProviderError("Limite do SerpApi atingido", "rate_limit");
      if (!response.ok)
        throw new ProviderError(`SerpApi respondeu com HTTP ${response.status}`, "upstream");
      const body = (await response.json()) as {
        error?: string;
        shopping_results?: Array<Record<string, unknown>>;
      };
      if (body.error) throw new ProviderError(body.error, "upstream");
      return (body.shopping_results ?? [])
        .slice(0, params.limit)
        .map((item) => normalizeSerpApiItem(item, params.productId));
    }
  };
}

export function createApp(
  env: NodeJS.ProcessEnv = process.env,
  providerOverride?: ProductSearchProvider
) {
  const app = express();
  const allowedOrigins = (env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || allowedOrigins.includes(origin));
      }
    })
  );
  app.use(express.json({ limit: "16kb" }));

  const providerName = (env.SEARCH_PROVIDER ?? "mock") as ProviderName;
  if (!["mock", "serpapi"].includes(providerName)) {
    throw new Error("SEARCH_PROVIDER must be mock or serpapi");
  }
  if (providerName === "serpapi" && !env.SERPAPI_API_KEY) {
    throw new Error("SERPAPI_API_KEY is required when SEARCH_PROVIDER=serpapi");
  }
  const provider =
    providerOverride ??
    (providerName === "mock" ? mockProvider : createSerpApiProvider(env.SERPAPI_API_KEY!));
  const cache = new Map<string, { expires: number; value: SearchResponse }>();
  const timeoutMs = Math.max(100, Number(env.SEARCH_TIMEOUT_MS ?? 8000));
  const rateLimit = Math.max(1, Number(env.RATE_LIMIT_PER_MINUTE ?? 30));
  const requests = new Map<string, { count: number; resetAt: number }>();

  app.use((request, response, next) => {
    const key = request.ip ?? "local";
    const now = Date.now();
    const entry = requests.get(key);
    if (!entry || entry.resetAt <= now) {
      requests.set(key, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > rateLimit) {
      response.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      response.status(429).json({ error: "Muitas requisições; tente novamente em instantes" });
      return;
    }
    next();
  });

  app.get("/health", (_request, response) => {
    response.json({ ok: true, provider: provider.name, country: "BR", currency: "BRL" });
  });

  app.post("/api/search", async (request, response) => {
    const parsed = searchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid search request", details: parsed.error.issues });
      return;
    }
    if (parsed.data.providerMode !== provider.name) {
      response.status(409).json({
        error: `Modo solicitado (${parsed.data.providerMode}) difere do servidor (${provider.name})`
      });
      return;
    }
    const { query, limit, refresh, productId } = parsed.data;
    const key = `${productId}:${query.toLowerCase()}:${limit}`;
    const cached = cache.get(key);
    if (!refresh && cached && cached.expires > Date.now()) {
      response.json({ ...cached.value, cached: true });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const offers = await provider.search(parsed.data, controller.signal);
      const value: SearchResponse = {
        provider: provider.name,
        modeLabel: provider.name === "mock" ? "Simulado" : "Ao vivo",
        query,
        offers,
        cached: false,
        fetchedAt: new Date().toISOString()
      };
      cache.set(key, { value, expires: Date.now() + 60_000 });
      response.json(value);
    } catch (error) {
      if (controller.signal.aborted) {
        response.status(504).json({ error: "Tempo limite do provedor excedido" });
      } else {
        const status =
          error instanceof ProviderError && error.code === "rate_limit"
            ? 429
            : error instanceof ProviderError && error.code === "network"
              ? 503
              : 502;
        response
          .status(status)
          .json({ error: error instanceof Error ? error.message : "Falha no provedor de busca" });
      }
    } finally {
      clearTimeout(timer);
    }
  });

  return app;
}

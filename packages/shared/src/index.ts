import { z } from "zod";

export const conditionSchema = z.enum(["new", "refurbished", "used", "any"]);
export const productStatusSchema = z.enum(["active", "paused", "archived"]);
export const providerModeSchema = z.enum(["mock", "serpapi"]);

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(100),
  requiredSpecs: z.record(z.string().trim().min(1), z.string().trim().min(1)),
  preferredCondition: conditionSchema,
  targetPriceBrl: z.number().positive().max(10_000_000),
  imageUrl: z.string().url().optional(),
  status: productStatusSchema,
  tracking: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastCheckedAt: z.string().datetime().optional()
});

export const offerSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  title: z.string().trim().min(1),
  imageUrl: z.string().url().optional(),
  retailer: z.string().trim().min(1),
  advertisedPriceBrl: z.number().nonnegative(),
  originalPriceBrl: z.number().nonnegative().optional(),
  shippingBrl: z.number().nonnegative().optional(),
  url: z.string().url(),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]),
  condition: conditionSchema.exclude(["any"]),
  retrievedAt: z.string().datetime()
});

export const searchRequestSchema = z.object({
  productId: z.string().min(1),
  query: z.string().trim().min(2).max(160),
  limit: z.number().int().min(1).max(20).default(10),
  refresh: z.boolean().default(false),
  providerMode: providerModeSchema
});

export const searchResponseSchema = z.object({
  provider: providerModeSchema,
  modeLabel: z.enum(["Simulado", "Ao vivo"]),
  query: z.string(),
  offers: z.array(offerSchema),
  cached: z.boolean(),
  fetchedAt: z.string().datetime()
});

export const preferencesSchema = z.object({
  theme: z.enum(["dark", "light", "system"]),
  country: z.literal("BR"),
  currency: z.literal("BRL"),
  providerMode: providerModeSchema,
  apiBaseUrl: z.string().url()
});

export const cachedSearchSchema = z.object({
  productId: z.string(),
  response: searchResponseSchema,
  cachedAt: z.string().datetime()
});

export const appStateSchema = z.object({
  version: z.literal(2),
  products: z.array(productSchema),
  cachedSearches: z.record(z.string(), cachedSearchSchema),
  lastSuccessfulCheckAt: z.string().datetime().optional(),
  preferences: preferencesSchema
});

export type Product = z.infer<typeof productSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type AppState = z.infer<typeof appStateSchema>;

const createdAt = "2026-01-15T12:00:00.000Z";
export const fictionalProducts: Product[] = [
  {
    id: "mac-mini-32-512",
    name: "Mac mini 32 GB / 512 GB",
    brand: "Apple",
    model: "Mac mini",
    requiredSpecs: { memória: "32 GB", armazenamento: "512 GB" },
    preferredCondition: "new",
    targetPriceBrl: 9000,
    status: "active",
    tracking: true,
    createdAt,
    updatedAt: createdAt
  },
  {
    id: "corsair-void-v2",
    name: "Corsair Void Wireless V2",
    brand: "Corsair",
    model: "Void Wireless V2",
    requiredSpecs: { conexão: "Sem fio" },
    preferredCondition: "new",
    targetPriceBrl: 550,
    status: "active",
    tracking: true,
    createdAt,
    updatedAt: createdAt
  },
  {
    id: "tcl-p7l-50",
    name: "TCL P7L 50 QLED 4K",
    brand: "TCL",
    model: "P7L 50",
    requiredSpecs: { painel: "QLED", resolução: "4K", tamanho: "50 polegadas" },
    preferredCondition: "new",
    targetPriceBrl: 2000,
    status: "active",
    tracking: true,
    createdAt,
    updatedAt: createdAt
  }
];

const offer = (
  id: string,
  productId: string,
  title: string,
  retailer: string,
  price: number,
  condition: "new" | "refurbished" | "used",
  shipping?: number
): Offer => ({
  id,
  productId,
  title,
  retailer,
  advertisedPriceBrl: price,
  shippingBrl: shipping,
  url: `https://example.com/simulado/${id}`,
  availability: "in_stock",
  condition,
  retrievedAt: "2026-01-20T14:30:00.000Z"
});

// Dados estritamente fictícios/simulados; não representam preços ou varejistas reais.
export const fictionalOffers: Offer[] = [
  offer(
    "mac-32-novo",
    "mac-mini-32-512",
    "Mac mini 32 GB 512 GB — novo",
    "Loja Aurora (fictícia)",
    8799,
    "new",
    49.9
  ),
  offer(
    "mac-32-recond",
    "mac-mini-32-512",
    "Mac mini 32 GB 512 GB — recondicionado",
    "Mercado Órbita (fictício)",
    7499,
    "refurbished",
    0
  ),
  offer(
    "mac-16-novo",
    "mac-mini-32-512",
    "Mac mini 16 GB 512 GB — variante não compatível",
    "Byte Sul (fictícia)",
    6499,
    "new",
    35
  ),
  offer(
    "mac-16-recond",
    "mac-mini-32-512",
    "Mac mini 16 GB 512 GB — recondicionado",
    "Reuso Tech (fictícia)",
    5599,
    "refurbished",
    65
  ),
  offer(
    "corsair-novo",
    "corsair-void-v2",
    "Corsair Void Wireless V2 — novo",
    "Som & Pixel (fictícia)",
    529.9,
    "new",
    19.9
  ),
  offer(
    "tcl-nova",
    "tcl-p7l-50",
    "TCL P7L 50 QLED 4K — nova",
    "Casa Tela (fictícia)",
    1949,
    "new",
    89
  )
];

export const defaultAppState: AppState = {
  version: 2,
  products: fictionalProducts,
  cachedSearches: {},
  preferences: {
    theme: "dark",
    country: "BR",
    currency: "BRL",
    providerMode: "mock",
    apiBaseUrl: "http://localhost:8787"
  }
};

export function upsertProduct(products: Product[], product: Product): Product[] {
  const exists = products.some((item) => item.id === product.id);
  return exists
    ? products.map((item) => (item.id === product.id ? product : item))
    : [product, ...products];
}

export function deleteProduct(products: Product[], id: string): Product[] {
  return products.filter((item) => item.id !== id);
}

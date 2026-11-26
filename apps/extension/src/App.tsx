import { ExternalLink, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  defaultAppState,
  searchResponseSchema,
  type AppState,
  type Offer,
  type Product
} from "@dealhunter/shared";
import { getStore } from "./storage";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const store = getStore();
type Page = "overview" | "products" | "search" | "settings";

function offersFrom(state: AppState) {
  return Object.values(state.cachedSearches).flatMap((entry) => entry.response.offers);
}

async function runSearch(state: AppState, product: Product, refresh: boolean) {
  const response = await fetch(`${state.preferences.apiBaseUrl}/api/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId: product.id,
      query: `${product.brand} ${product.model} ${Object.values(product.requiredSpecs).join(" ")}`,
      limit: 20,
      refresh,
      providerMode: state.preferences.providerMode
    })
  });
  const body: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body === "object" && body && "error" in body ? String(body.error) : "Falha na busca"
    );
  return searchResponseSchema.parse(body);
}

export default function App() {
  const popup = location.pathname.endsWith("popup.html");
  const [state, setState] = useState<AppState>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => void store.load().then(setState), []);
  useEffect(() => {
    if (!state) return;
    const preference = state.preferences.theme;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.classList.toggle(
        "dark",
        preference === "dark" || (preference === "system" && Boolean(media?.matches))
      );
    };
    applyTheme();
    if (preference === "system") media?.addEventListener("change", applyTheme);
    void store.save(state);
    return () => media?.removeEventListener("change", applyTheme);
  }, [state]);

  async function refresh(product: Product) {
    if (!state) return;
    setBusy(true);
    setError("");
    try {
      const response = await runSearch(state, product, true);
      setState({
        ...state,
        cachedSearches: {
          ...state.cachedSearches,
          [product.id]: { productId: product.id, response, cachedAt: new Date().toISOString() }
        },
        products: state.products.map((item) =>
          item.id === product.id ? { ...item, lastCheckedAt: response.fetchedAt } : item
        ),
        lastSuccessfulCheckAt: response.fetchedAt
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha na busca");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <div className="p-5 text-muted">Carregando…</div>;
  return popup ? (
    <Popup state={state} busy={busy} error={error} refresh={refresh} />
  ) : (
    <Dashboard state={state} setState={setState} busy={busy} error={error} refresh={refresh} />
  );
}

function Popup({
  state,
  busy,
  error,
  refresh
}: {
  state: AppState;
  busy: boolean;
  error: string;
  refresh: (product: Product) => Promise<void>;
}) {
  const tracked = state.products.filter((item) => item.tracking && item.status === "active");
  return (
    <main className="w-[380px] p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">DealHunter Brasil</h1>
          <p className="text-xs text-muted">Preços em BRL · atualização manual</p>
        </div>
        <button
          className="button-secondary"
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") })}
        >
          Abrir painel
        </button>
      </header>
      {error && <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
      <div className="space-y-2">
        {tracked.map((product) => {
          const offers = state.cachedSearches[product.id]?.response.offers ?? [];
          const lowest = offers.length
            ? Math.min(...offers.map((offer) => offer.advertisedPriceBrl))
            : null;
          return (
            <article className="card !p-3" key={product.id}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <strong className="text-sm">{product.name}</strong>
                  <p className="text-xs text-muted">
                    {lowest === null
                      ? "Sem preço consultado"
                      : `Menor anunciado: ${brl.format(lowest)}`}
                  </p>
                </div>
                <button
                  className="button-secondary !size-9 !p-0"
                  disabled={busy}
                  aria-label={`Atualizar ${product.name}`}
                  onClick={() => void refresh(product)}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <button
        className="button mt-3 w-full"
        onClick={() =>
          chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html#products") })
        }
      >
        <Plus size={16} /> Adicionar produto
      </button>
      <p className="mt-3 text-[11px] leading-4 text-muted">
        Ofertas são candidatas brutas. Frete pode estar ausente; confirme preço total,
        disponibilidade e condição no varejista.
      </p>
    </main>
  );
}

function Dashboard({
  state,
  setState,
  busy,
  error,
  refresh
}: {
  state: AppState;
  setState: (state: AppState) => void;
  busy: boolean;
  error: string;
  refresh: (product: Product) => Promise<void>;
}) {
  const [page, setPage] = useState<Page>(location.hash === "#products" ? "products" : "overview");
  const offers = offersFrom(state);
  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-black/10 p-5 dark:border-white/10">
        <h1 className="text-xl font-bold">DealHunter Brasil</h1>
        <p className="text-xs text-muted">
          Pesquisa comparativa manual ·{" "}
          {state.preferences.providerMode === "mock" ? "Simulado" : "Ao vivo"}
        </p>
      </header>
      <div className="grid md:grid-cols-[190px_1fr]">
        <nav className="flex gap-1 overflow-auto p-3 md:min-h-[680px] md:flex-col md:border-r">
          {(["overview", "products", "search", "settings"] as Page[]).map((id) => (
            <button
              className={`rounded-xl px-3 py-2 text-left text-sm ${page === id ? "bg-brand text-white dark:text-black" : "text-muted"}`}
              key={id}
              onClick={() => setPage(id)}
            >
              {
                {
                  overview: "Visão geral",
                  products: "Produtos",
                  search: "Ofertas",
                  settings: "Configurações"
                }[id]
              }
            </button>
          ))}
        </nav>
        <main className="p-4 md:p-6">
          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-3 text-red-500">
              {error}
            </p>
          )}
          {busy && (
            <div aria-label="Carregando" className="mb-4 h-20 animate-pulse rounded-2xl bg-panel" />
          )}
          {page === "overview" && <Overview state={state} offers={offers} />}
          {page === "products" && (
            <Products state={state} setState={setState} refresh={refresh} busy={busy} />
          )}
          {page === "search" && <Offers offers={offers} />}
          {page === "settings" && <Settings state={state} setState={setState} />}
        </main>
      </div>
    </div>
  );
}

function Overview({ state, offers }: { state: AppState; offers: Offer[] }) {
  const tracked = state.products.filter((product) => product.tracking).length;
  const withOffers = new Set(offers.map((offer) => offer.productId)).size;
  return (
    <section>
      <h2 className="text-2xl font-bold">Visão geral</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Produtos acompanhados", tracked],
          ["Total de ofertas", offers.length],
          ["Produtos com ofertas", withOffers],
          [
            "Última consulta",
            state.lastSuccessfulCheckAt
              ? new Date(state.lastSuccessfulCheckAt).toLocaleString("pt-BR")
              : "Nunca"
          ]
        ].map(([label, value]) => (
          <article className="card" key={label}>
            <p className="text-xs text-muted">{label}</p>
            <strong className="mt-2 block text-xl">{value}</strong>
          </article>
        ))}
      </div>
      <h3 className="mb-2 mt-6 font-semibold">Ofertas recentes</h3>
      <OfferCards offers={offers.slice(0, 4)} />
    </section>
  );
}

function Products({
  state,
  setState,
  refresh,
  busy
}: {
  state: AppState;
  setState: (state: AppState) => void;
  refresh: (product: Product) => Promise<void>;
  busy: boolean;
}) {
  const [editing, setEditing] = useState<Product>();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const specs = Object.fromEntries(
      String(data.get("specs"))
        .split(",")
        .map((pair) => pair.split("=").map((part) => part.trim()))
        .filter((pair) => pair.length === 2 && pair[0] && pair[1]) as [string, string][]
    );
    const product: Product = {
      id: editing?.id ?? crypto.randomUUID(),
      name: String(data.get("name")),
      brand: String(data.get("brand")),
      model: String(data.get("model")),
      requiredSpecs: specs,
      preferredCondition: String(data.get("condition")) as Product["preferredCondition"],
      targetPriceBrl: Number(data.get("target")),
      imageUrl: String(data.get("image")) || undefined,
      status: String(data.get("status")) as Product["status"],
      tracking: data.get("tracking") === "on",
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
      lastCheckedAt: editing?.lastCheckedAt
    };
    setState({
      ...state,
      products: editing
        ? state.products.map((item) => (item.id === editing.id ? product : item))
        : [product, ...state.products]
    });
    setEditing(undefined);
    event.currentTarget.reset();
  }
  return (
    <section>
      <h2 className="text-2xl font-bold">Produtos</h2>
      <form className="card mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        {(["name", "brand", "model"] as const).map((field) => (
          <label key={`${field}-${editing?.id}`}>
            <span className="label">
              {{ name: "Nome", brand: "Marca", model: "Modelo" }[field]}
            </span>
            <input className="input" name={field} required defaultValue={editing?.[field]} />
          </label>
        ))}
        <label>
          <span className="label">Especificações obrigatórias (chave=valor, ...)</span>
          <input
            className="input"
            name="specs"
            required
            defaultValue={
              editing
                ? Object.entries(editing.requiredSpecs)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ")
                : ""
            }
          />
        </label>
        <label>
          <span className="label">Preço-alvo (BRL)</span>
          <input
            className="input"
            name="target"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={editing?.targetPriceBrl}
          />
        </label>
        <label>
          <span className="label">Imagem opcional</span>
          <input className="input" name="image" type="url" defaultValue={editing?.imageUrl} />
        </label>
        <label>
          <span className="label">Condição preferida</span>
          <select
            className="input"
            name="condition"
            defaultValue={editing?.preferredCondition ?? "new"}
          >
            <option value="new">Novo</option>
            <option value="refurbished">Recondicionado</option>
            <option value="used">Usado</option>
            <option value="any">Qualquer</option>
          </select>
        </label>
        <label>
          <span className="label">Status</span>
          <select className="input" name="status" defaultValue={editing?.status ?? "active"}>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="tracking" type="checkbox" defaultChecked={editing?.tracking ?? true} />{" "}
          Acompanhar
        </label>
        <button className="button">{editing ? "Salvar edição" : "Adicionar produto"}</button>
      </form>
      <div className="mt-4 space-y-3">
        {state.products.map((product) => (
          <article
            className="card flex flex-wrap items-center justify-between gap-3"
            key={product.id}
          >
            <div>
              <strong>{product.name}</strong>
              <p className="text-xs text-muted">
                {product.brand} · {product.model} · alvo {brl.format(product.targetPriceBrl)} ·{" "}
                {product.status}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="button-secondary" onClick={() => setEditing(product)}>
                Editar
              </button>
              <button
                className="button-secondary"
                disabled={busy}
                onClick={() => void refresh(product)}
              >
                <Search size={15} /> Buscar
              </button>
              <button
                aria-label={`Excluir ${product.name}`}
                className="button-secondary !px-3"
                onClick={() =>
                  setState({
                    ...state,
                    products: state.products.filter((item) => item.id !== product.id)
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Offers({ offers }: { offers: Offer[] }) {
  const [retailer, setRetailer] = useState("");
  const [sort, setSort] = useState("price-asc");
  const retailers = [...new Set(offers.map((offer) => offer.retailer))];
  const shown = (retailer ? offers.filter((offer) => offer.retailer === retailer) : offers)
    .slice()
    .sort((a, b) =>
      sort === "recent"
        ? b.retrievedAt.localeCompare(a.retrievedAt)
        : a.advertisedPriceBrl - b.advertisedPriceBrl
    );
  return (
    <section>
      <h2 className="text-2xl font-bold">Ofertas candidatas</h2>
      <p className="mt-1 text-sm text-muted">
        Resultados brutos, sem validação de compatibilidade. Preço total só é confiável quando o
        frete está informado; confirme tudo no varejista.
      </p>
      <div className="mt-4 flex max-w-xl gap-3">
        <label className="block flex-1">
          <span className="label">Filtrar varejista</span>
          <select
            className="input"
            value={retailer}
            onChange={(event) => setRetailer(event.target.value)}
          >
            <option value="">Todos</option>
            {retailers.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block flex-1">
          <span className="label">Ordenar</span>
          <select className="input" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="price-asc">Menor preço anunciado</option>
            <option value="recent">Mais recentes</option>
          </select>
        </label>
      </div>
      <div className="mt-4">
        <OfferCards offers={shown} />
      </div>
    </section>
  );
}

function OfferCards({ offers }: { offers: Offer[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {offers.length === 0 && (
        <p className="card text-sm text-muted">Nenhuma oferta em cache. Faça uma busca manual.</p>
      )}
      {offers.map((offer) => (
        <article className="card" key={offer.id}>
          <p className="text-xs text-brand">
            {offer.retailer} · {offer.condition}
          </p>
          <strong>{offer.title}</strong>
          <p className="mt-2 text-lg font-bold">{brl.format(offer.advertisedPriceBrl)}</p>
          <p className="text-xs text-muted">
            {offer.shippingBrl === undefined
              ? "Frete não informado; total indisponível"
              : `Frete ${brl.format(offer.shippingBrl)} · Total ${brl.format(offer.advertisedPriceBrl + offer.shippingBrl)}`}
          </p>
          <a className="button-secondary mt-3" href={offer.url} target="_blank" rel="noreferrer">
            Abrir oferta <ExternalLink size={14} />
          </a>
        </article>
      ))}
    </div>
  );
}

function Settings({ state, setState }: { state: AppState; setState: (state: AppState) => void }) {
  const [status, setStatus] = useState("");
  const preferences = state.preferences;
  async function testConnection() {
    try {
      const response = await fetch(`${preferences.apiBaseUrl}/health`);
      setStatus(response.ok ? "Conexão bem-sucedida." : `Falha HTTP ${response.status}.`);
    } catch {
      setStatus("API local indisponível.");
    }
  }
  return (
    <section>
      <h2 className="text-2xl font-bold">Configurações</h2>
      <div className="card mt-4 grid max-w-xl gap-4">
        <label>
          <span className="label">Tema</span>
          <select
            className="input"
            value={preferences.theme}
            onChange={(e) =>
              setState({
                ...state,
                preferences: { ...preferences, theme: e.target.value as typeof preferences.theme }
              })
            }
          >
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="system">Sistema</option>
          </select>
        </label>
        <label>
          <span className="label">País</span>
          <input className="input" value="Brasil (BR)" disabled />
        </label>
        <label>
          <span className="label">Moeda</span>
          <input className="input" value="Real brasileiro (BRL)" disabled />
        </label>
        <label>
          <span className="label">Modo do provedor</span>
          <select
            className="input"
            value={preferences.providerMode}
            onChange={(e) =>
              setState({
                ...state,
                preferences: {
                  ...preferences,
                  providerMode: e.target.value as typeof preferences.providerMode
                }
              })
            }
          >
            <option value="mock">Simulado</option>
            <option value="serpapi">Ao vivo (SerpApi no servidor)</option>
          </select>
        </label>
        <label>
          <span className="label">URL da API local</span>
          <input
            className="input"
            type="url"
            value={preferences.apiBaseUrl}
            onChange={(e) =>
              setState({ ...state, preferences: { ...preferences, apiBaseUrl: e.target.value } })
            }
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="button-secondary" onClick={() => void testConnection()}>
            Testar conexão
          </button>
          <button
            className="button-secondary"
            onClick={() => setState({ ...state, cachedSearches: {} })}
          >
            Limpar cache
          </button>
          <button
            className="button-secondary"
            onClick={() =>
              confirm("Restaurar todos os dados e preferências?") &&
              setState(structuredClone(defaultAppState))
            }
          >
            Restaurar dados
          </button>
        </div>
        {status && (
          <p role="status" className="text-sm text-muted">
            {status}
          </p>
        )}
        <p className="text-xs text-muted">
          Chaves são configuradas somente no servidor. Nenhuma chave é solicitada ou armazenada
          aqui.
        </p>
      </div>
    </section>
  );
}

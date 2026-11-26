// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "./storage";

describe("local storage adapter", () => {
  beforeEach(() => localStorage.clear());

  it("returns defaults when empty", async () => {
    expect(await createLocalStore(localStorage).load()).toMatchObject({
      version: 2,
      preferences: { theme: "dark", country: "BR", currency: "BRL", providerMode: "mock" }
    });
  });

  it("recovers from invalid persisted data", async () => {
    localStorage.setItem("dealhunterState", '{"version":99}');
    const state = await createLocalStore(localStorage).load();
    expect(state.version).toBe(2);
    expect(localStorage.getItem("dealhunterState")).toBeNull();
  });

  it("round trips valid data", async () => {
    const store = createLocalStore(localStorage);
    const state = await store.load();
    state.preferences.theme = "light";
    await store.save(state);
    expect((await store.load()).preferences.theme).toBe("light");
  });
});

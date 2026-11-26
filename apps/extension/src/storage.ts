import { appStateSchema, defaultAppState, type AppState } from "@dealhunter/shared";

const KEY = "dealhunterState";

function cloneDefault(): AppState {
  return structuredClone(defaultAppState);
}

export interface StateStore {
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
}

export function createLocalStore(storage: Storage): StateStore {
  return {
    async load() {
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return cloneDefault();
        const parsed = appStateSchema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
      } catch {
        // Invalid data is recovered below and replaced on the next save.
      }
      storage.removeItem(KEY);
      return cloneDefault();
    },
    async save(state) {
      storage.setItem(KEY, JSON.stringify(appStateSchema.parse(state)));
    }
  };
}

export function createChromeStore(area: chrome.storage.StorageArea): StateStore {
  return {
    async load() {
      try {
        const result = await area.get(KEY);
        const parsed = appStateSchema.safeParse(result[KEY]);
        if (parsed.success) return parsed.data;
      } catch {
        // Recover using the safe default.
      }
      await area.remove(KEY);
      return cloneDefault();
    },
    async save(state) {
      await area.set({ [KEY]: appStateSchema.parse(state) });
    }
  };
}

export function getStore(): StateStore {
  return typeof chrome !== "undefined" && chrome.storage
    ? createChromeStore(chrome.storage.local)
    : createLocalStore(window.localStorage);
}

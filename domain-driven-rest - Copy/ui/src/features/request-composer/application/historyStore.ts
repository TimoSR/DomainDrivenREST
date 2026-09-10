import { create } from "zustand";

export interface HistoryEntry {
  id: string;
  operationId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  at: number;
  body?: string;
}

import { HISTORY_MAX_ENTRIES, STORAGE_KEYS } from "../../../shared/_critical/uiDefaults";

const HISTORY_KEY = STORAGE_KEYS.history;
const MAX_ENTRIES = HISTORY_MAX_ENTRIES;

function read(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is HistoryEntry => entry && typeof entry.id === "string" && typeof entry.operationId === "string" && typeof entry.method === "string" && typeof entry.path === "string" && Number.isFinite(entry.status) && Number.isFinite(entry.durationMs) && Number.isFinite(entry.at)).slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // History is a convenience; losing it is not worth surfacing.
  }
}

interface HistoryState {
  entries: HistoryEntry[];
  add: (entry: Omit<HistoryEntry, "id" | "at">) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: read(),

  add: (entry) => {
    const next = [{ ...entry, id: crypto.randomUUID(), at: Date.now() }, ...get().entries].slice(0, MAX_ENTRIES);
    persist(next);
    set({ entries: next });
  },

  clear: () => {
    persist([]);
    set({ entries: [] });
  },
}));

export function relativeTime(at: number): string {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

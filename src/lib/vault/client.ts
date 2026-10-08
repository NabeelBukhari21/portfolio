"use client";

import { useSyncExternalStore } from "react";

/** Client-side view of the open vault session, shared between the Vault and other sections. */
export type VaultDoc = { id: string; name: string; type: string; ext: string; size: number; added: string; category: string };
export type VaultSession = { docs: VaultDoc[]; contact: { phone: string | null; address: string | null; note: string | null }; expires: number };

let state: VaultSession | null = null;
const listeners = new Set<() => void>();

export const vaultStore = {
  get: () => state,
  set(s: VaultSession | null) {
    state = s;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useVaultSession = () => useSyncExternalStore(vaultStore.subscribe, vaultStore.get, () => null);

/** files in this category aren't listed as vault documents — they unlock in place elsewhere on the site */
export const INLINE_CATEGORIES = new Set(["gym", "arcs"]);
export const fileUrl = (id: string) => `/api/vault/file/${id}`;

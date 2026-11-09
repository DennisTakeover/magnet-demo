import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActivationKey, ActivityItem, Conversation, PersonaId, State } from './types';
import { createSeed, clientActor } from './seed';
import { detectLocale } from './i18n/locale';
import { PERSONAS, type PersonaConfig } from './personas';

const STORAGE_KEY = 'magnet-demo-state';

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === createSeed().version) return parsed;
    }
  } catch {
    /* storage unavailable: fall back to seed */
  }
  // First visit: start from the visitor's detected language and currency
  const fresh = createSeed();
  fresh.locale = detectLocale();
  return fresh;
}

let idCounter = 0;
export function uid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter}`;
}

export function clockTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function logActivity(draft: State, item: Omit<ActivityItem, 'id' | 'time'> & { time?: number }) {
  draft.activity.unshift({ id: uid('act'), time: Date.now(), ...item });
  const client = draft.clients.find((c) => c.id === item.clientId);
  if (client) client.lastActivity = Date.now();
}

const FIRST_VALUE: ActivationKey[] = ['campaign_started', 'ai_reply', 'flow_activated', 'comment_approved', 'post_scheduled'];

/** Record a confirmed activation step once; the first useful action sets time-to-first-value. */
export function markActivation(draft: State, key: ActivationKey) {
  const a = draft.activation;
  if (a.done[key]) return;
  a.done[key] = Date.now();
  if (!a.firstValueAt && FIRST_VALUE.includes(key)) {
    a.firstValueAt = Date.now();
    logActivity(draft, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'setting', action: `First value reached (${key.replace('_', ' ')})`, result: 'success' });
  }
}

export function clientLog(draft: State, type: ActivityItem['type'], action: string, result: ActivityItem['result'] = 'success') {
  logActivity(draft, { actor: clientActor(draft), actorRole: 'client', clientId: 'c1', type, action, result });
}

export interface Toast {
  id: string;
  text: string;
  tone: 'success' | 'info' | 'warning' | 'error';
  action?: { label: string; href: string };
}

interface Ctx {
  state: State;
  update: (fn: (draft: State) => void) => void;
  /** Reset to the starting data, optionally for another business type */
  reset: (persona?: PersonaId) => void;
  toast: (text: string, tone?: Toast['tone'], action?: Toast['action']) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  /** Conversations with an AI auto-reply waiting to be sent */
  queued: Record<string, true>;
  queueAutoReply: (convId: string) => void;
  cancelQueued: (convId: string) => boolean;
  /** Simulates the contact sending their next scripted message */
  simulateContactMessage: (convId: string, delay?: number) => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [queued, setQueued] = useState<Record<string, true>>({});
  const timers = useRef<Record<string, number>>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  // Runs synchronously so callers can read results (e.g. new ids) right after
  const update = useCallback((fn: (draft: State) => void) => {
    const draft = structuredClone(stateRef.current);
    fn(draft);
    stateRef.current = draft;
    setState(draft);
  }, []);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'success', action?: Toast['action']) => {
    const id = uid('toast');
    setToasts((t) => [...t.slice(-3), { id, text, tone, action }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const cancelQueued = useCallback((convId: string) => {
    const t = timers.current[convId];
    if (t) {
      window.clearTimeout(t);
      delete timers.current[convId];
      setQueued((q) => {
        const n = { ...q };
        delete n[convId];
        return n;
      });
      return true;
    }
    return false;
  }, []);

  const queueAutoReply = useCallback(
    (convId: string) => {
      cancelQueued(convId);
      setQueued((q) => ({ ...q, [convId]: true }));
      timers.current[convId] = window.setTimeout(() => {
        delete timers.current[convId];
        setQueued((q) => {
          const n = { ...q };
          delete n[convId];
          return n;
        });
        update((d) => {
          const c = d.conversations.find((x) => x.id === convId);
          if (!c || c.takenOver || d.aiMode !== 'auto' || c.needsYou) return;
          const text = c.replyScript.shift();
          if (!text) return;
          c.messages.push({ id: uid('m'), from: 'ai', text, time: clockTime(), note: 'Sent automatically by AI (Auto mode, demo)' });
          c.lastAt = Date.now();
          clientLog(d, 'inbox', `AI auto-replied to ${c.name} (demo)`);
        });
        toast('Demo reply added by AI (Auto mode)', 'info');
      }, 2500);
    },
    [cancelQueued, update, toast],
  );

  const simulateContactMessage = useCallback(
    (convId: string, delay = 900) => {
      window.setTimeout(() => {
        const current = stateRef.current;
        const conv = current.conversations.find((c) => c.id === convId);
        if (!conv || conv.contactScript.length === 0) return;
        update((d) => {
          const c = d.conversations.find((x) => x.id === convId) as Conversation;
          const next = c.contactScript.shift();
          if (!next) return;
          c.messages.push({ id: uid('m'), from: 'contact', text: next.text, time: clockTime() });
          c.unread = true;
          c.awaitingReply = false;
          c.lastAt = Date.now();
          if (next.leadSignal) c.leadSuggestion = { ...next.leadSignal, quote: next.text };
        });
        if (current.aiMode === 'auto' && !conv.takenOver && !conv.needsYou && conv.replyScript.length > 0) {
          queueAutoReply(convId);
        }
      }, delay);
    },
    [update, queueAutoReply],
  );

  const reset = useCallback(
    (persona?: PersonaId) => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
      timers.current = {};
      setQueued({});
      const switching = persona && persona !== stateRef.current.persona;
      const fresh = createSeed(persona ?? stateRef.current.persona);
      stateRef.current = fresh;
      setState(fresh);
      toast(switching ? `Demo switched to ${fresh.business.name}` : 'Demo reset to its starting point', 'info');
    },
    [toast],
  );

  const value = useMemo(
    () => ({ state, update, reset, toast, toasts, dismissToast, queued, queueAutoReply, cancelQueued, simulateContactMessage }),
    [state, update, reset, toast, toasts, dismissToast, queued, queueAutoReply, cancelQueued, simulateContactMessage],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Labels, metrics and demo contacts for the active business type. */
export function usePersona(): PersonaConfig {
  return PERSONAS[useStore().state.persona];
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}

/* ---------- Hash router ---------- */

function currentPath() {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const on = () => {
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function routeQuery(): URLSearchParams {
  const q = window.location.hash.split('?')[1];
  return new URLSearchParams(q ?? '');
}

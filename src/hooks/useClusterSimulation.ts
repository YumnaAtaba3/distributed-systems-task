import { useEffect, useState } from "react";

export type Server = {
  id: string;
  name: string;
  load: number; // 0-100 CPU
  connections: number; // active connections (for Least Connections)
  requests: number; // total handled
  healthy: boolean;
};

const initial: Server[] = [
  { id: "A", name: "Server A", load: 20, connections: 0, requests: 0, healthy: true },
  { id: "B", name: "Server B", load: 55, connections: 0, requests: 0, healthy: true },
  { id: "C", name: "Server C", load: 35, connections: 0, requests: 0, healthy: true },
];

// Module-level state so the simulation survives tab switches.
let servers: Server[] = initial.map((s) => ({ ...s }));
const subs = new Set<(s: Server[]) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit() {
  subs.forEach((s) => s(servers));
}

function ensureTimer() {
  if (timer) return;
  // Drift CPU loads randomly every 2s — simulates real cluster jitter.
  timer = setInterval(() => {
    servers = servers.map((s) => {
      const drift = (Math.random() - 0.5) * 25;
      const next = Math.max(5, Math.min(98, s.load + drift));
      return { ...s, load: Math.round(next) };
    });
    emit();
  }, 2000);
}

export function updateServers(updater: (s: Server[]) => Server[]) {
  servers = updater(servers);
  emit();
}

export function getServers() {
  return servers;
}

export function useClusterSimulation() {
  const [state, setState] = useState<Server[]>(servers);
  useEffect(() => {
    ensureTimer();
    subs.add(setState);
    setState(servers);
    return () => {
      subs.delete(setState);
      // Keep timer alive across tab switches; cleanup only when no listeners.
      if (subs.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return state;
}

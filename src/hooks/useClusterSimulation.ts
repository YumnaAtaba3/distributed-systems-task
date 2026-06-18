import { useEffect, useState } from "react";

export type Server = {
  id: string;
  name: string;
  baseLoad: number; // base CPU before active connections load (static)
  load: number; // current CPU load (base + connection load + minor jitter)
  connections: number; // active connections (for Least Connections)
  requests: number; // total handled
  healthy: boolean;
};

const initial: Server[] = [
  { id: "A", name: "Server A", baseLoad: 15, load: 15, connections: 0, requests: 0, healthy: true },
  { id: "B", name: "Server B", baseLoad: 45, load: 45, connections: 0, requests: 0, healthy: true },
  { id: "C", name: "Server C", baseLoad: 25, load: 25, connections: 0, requests: 0, healthy: true },
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
  // Simulates minor background CPU jitter (±1) without changing baseLoad itself.
  timer = setInterval(() => {
    servers = servers.map((s) => {
      const jitter = (Math.random() - 0.5) * 2; // tiny jitter between -1 and +1
      const nextLoad = Math.max(5, Math.min(99, s.baseLoad + s.connections * 12 + jitter));
      return { ...s, load: Math.round(nextLoad) };
    });
    emit();
  }, 1000);
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

// Tiny pub/sub log bus shared across tabs. Survives tab switches.
export type LogEntry = {
  id: number;
  ts: string;
  message: string;
  kind: "info" | "lb" | "repl" | "shard" | "warn" | "ok";
};

type Listener = (logs: LogEntry[]) => void;

let nextId = 1;
let logs: LogEntry[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(logs));
}

export function log(message: string, kind: LogEntry["kind"] = "info") {
  const entry: LogEntry = {
    id: nextId++,
    ts: new Date().toLocaleTimeString("en-US", { hour12: false }),
    message,
    kind,
  };
  // Keep at most 200 entries
  logs = [entry, ...logs].slice(0, 200);
  emit();
}

export function clearLogs() {
  logs = [];
  emit();
}

export function getLogs() {
  return logs;
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  fn(logs);
  return () => listeners.delete(fn);
}

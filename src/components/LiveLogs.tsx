import { useEffect, useState } from "react";
import { clearLogs, subscribe, type LogEntry } from "@/utils/logger";

const kindStyles: Record<LogEntry["kind"], string> = {
  info: "text-muted-foreground",
  lb: "text-[oklch(0.78_0.17_230)]",
  repl: "text-[oklch(0.78_0.17_290)]",
  shard: "text-[oklch(0.82_0.17_150)]",
  warn: "text-[oklch(0.82_0.17_80)]",
  ok: "text-[oklch(0.78_0.17_150)]",
};

export function LiveLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    const unsub = subscribe(setLogs);
    return () => {
      unsub();
    };
  }, []);

  return (
    <div className="border-t border-border bg-card/60 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success heartbeat" />
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            Live Activity Log
          </h3>
          <span className="text-xs text-muted-foreground">({logs.length})</span>
        </div>
        <button
          onClick={() => clearLogs()}
          className="text-xs px-3 py-1 rounded-md bg-secondary hover:bg-muted transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="h-48 overflow-y-auto font-mono text-xs px-4 py-2 space-y-1">
        {logs.length === 0 && (
          <div className="text-muted-foreground italic">Waiting for events…</div>
        )}
        {logs.map((l) => (
          <div key={l.id} className="log-enter flex gap-3">
            <span className="text-muted-foreground shrink-0">{l.ts}</span>
            <span className={kindStyles[l.kind]}>{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

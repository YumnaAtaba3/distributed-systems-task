import { useState } from "react";
import { log } from "@/utils/logger";

type Mode = "active" | "passive";

export function ReplicationTab() {
  const [mode, setMode] = useState<Mode>("active");
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [txn, setTxn] = useState(1);

  const execute = () => {
    const id = txn;
    setTxn((t) => t + 1);
    // === REPLICATION happens here ===
    if (mode === "active") {
      // Active: all replicas execute the same operation simultaneously.
      setFlash(new Set(["R1", "R2", "R3"]));
      log(`🔄 Active Replication · Txn #${id}: R1, R2, R3 execute transfer $100 (X→Y) in sync`, "repl");
    } else {
      // Passive: leader executes and ships WAL to followers.
      setFlash(new Set(["LEADER"]));
      log(`📜 Passive · Txn #${id}: Leader commits transfer $100 (X→Y), shipping WAL…`, "repl");
      setTimeout(() => {
        setFlash(new Set(["LEADER", "F1", "F2"]));
        log(`✅ Passive · Txn #${id}: Followers F1, F2 applied WAL`, "ok");
      }, 600);
    }
    setTimeout(() => setFlash(new Set()), 1400);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-1">
          {(["active", "passive"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                log(`⚙️  Replication mode → ${m.toUpperCase()}`, "info");
              }}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "active" ? "Active" : "Passive"}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Operation: <code className="text-foreground">TRANSFER $100 FROM X TO Y</code>
        </div>
        <button
          onClick={execute}
          className="ml-auto px-4 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
        >
          Execute Transaction
        </button>
      </div>

      {mode === "active" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["R1", "R2", "R3"].map((id) => (
            <div
              key={id}
              className={`rounded-xl border border-border bg-card p-6 text-center ${
                flash.has(id) ? "replica-flash" : ""
              }`}
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Replica</div>
              <div className="mt-2 text-2xl font-bold font-mono">{id}</div>
              <div className="mt-3 text-xs text-muted-foreground">balance(Y) sync</div>
              <div className="mt-1 font-mono text-success">+$100</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div
            className={`rounded-xl border-2 border-primary bg-card p-6 text-center ${
              flash.has("LEADER") ? "replica-flash" : ""
            }`}
          >
            <div className="text-xs uppercase tracking-wider text-primary">👑 Leader</div>
            <div className="mt-2 text-2xl font-bold font-mono">L0</div>
            <div className="mt-3 text-xs text-muted-foreground">commits & ships WAL →</div>
          </div>
          {["F1", "F2"].map((id) => (
            <div
              key={id}
              className={`rounded-xl border border-border bg-card p-6 text-center ${
                flash.has(id) ? "replica-flash" : ""
              }`}
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Follower</div>
              <div className="mt-2 text-2xl font-bold font-mono">{id}</div>
              <div className="mt-3 text-xs text-muted-foreground">applies WAL</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground">
        {mode === "active" ? (
          <>⚡ <b className="text-foreground">Active replication</b>: every replica executes the request independently. Higher cost, instant failover.</>
        ) : (
          <>📜 <b className="text-foreground">Passive replication</b>: a single leader executes, then ships its Write-Ahead-Log to followers. Cheaper, slight failover lag.</>
        )}
      </div>
    </div>
  );
}

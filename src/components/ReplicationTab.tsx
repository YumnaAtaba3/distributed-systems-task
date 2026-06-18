import { useState, useRef, useEffect } from "react";
import { log } from "@/utils/logger";

type Mode = "active" | "passive";

const nodes = ["R1", "R2", "R3"];

export function ReplicationTab() {
  const [mode, setMode] = useState<Mode>("active");
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [txn, setTxn] = useState(1);
  const [leaderId, setLeaderId] = useState("R1");
  const [isElecting, setIsElecting] = useState(false);

  // Timeout cleanup tracking
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scheduleTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      fn();
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const execute = () => {
    if (isElecting) {
      log("🚫 Transaction blocked: No leader elected yet. Leader election in progress...", "warn");
      return;
    }

    const id = txn;
    setTxn((t) => t + 1);
    
    // === REPLICATION happens here ===
    if (mode === "active") {
      // Active: all replicas execute the same operation simultaneously.
      setFlash(new Set(["R1", "R2", "R3"]));
      log(`🔄 Active Replication · Txn #${id}: R1, R2, R3 execute transfer $100 (X→Y) in sync`, "repl");
    } else {
      // Passive: leader executes and ships WAL to followers.
      setFlash(new Set([leaderId]));
      log(`📜 Passive · Txn #${id}: Leader ${leaderId} commits transfer $100 (X→Y), shipping WAL…`, "repl");
      
      const followers = nodes.filter((n) => n !== leaderId);
      scheduleTimeout(() => {
        setFlash(new Set([leaderId, ...followers]));
        log(`✅ Passive · Txn #${id}: Followers ${followers.join(", ")} applied WAL`, "ok");
      }, 600);
    }
    scheduleTimeout(() => setFlash(new Set()), 1400);
  };

  const killLeader = () => {
    if (isElecting) return;
    
    const currentLeader = leaderId;
    log(`⚠️ Leader ${currentLeader} failed. Starting election...`, "warn");
    setIsElecting(true);
    
    // Pick a random follower to be the new leader
    const followers = nodes.filter((n) => n !== currentLeader);
    const newLeader = followers[Math.floor(Math.random() * followers.length)];
    
    scheduleTimeout(() => {
      setLeaderId(newLeader);
      setIsElecting(false);
      log(`👑 Node ${newLeader} elected as the new Leader!`, "ok");
    }, 1200);
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
          disabled={isElecting}
          className="ml-auto px-4 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isElecting ? "Electing Leader..." : "Execute Transaction"}
        </button>
      </div>

      {mode === "active" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nodes.map((id) => (
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
          {nodes.map((id) => {
            const isLeader = id === leaderId;
            return (
              <div
                key={id}
                className={`relative rounded-xl border-2 bg-card p-6 text-center transition-all ${
                  isLeader ? "border-primary glow-primary" : "border-border"
                } ${flash.has(id) ? "replica-flash" : ""} ${isElecting ? "animate-pulse animate-duration-1000" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs uppercase tracking-wider ${
                      isLeader ? "text-primary font-bold text-left" : "text-muted-foreground"
                    }`}
                  >
                    {isLeader ? "👑 Leader" : "Follower"}
                  </span>
                  {isLeader && !isElecting && (
                    <button
                      onClick={killLeader}
                      className="px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive/20 transition-colors font-semibold"
                    >
                      Kill Leader
                    </button>
                  )}
                </div>
                <div className="mt-2 text-2xl font-bold font-mono">{id}</div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {isLeader ? "commits & ships WAL →" : "applies WAL"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground">
        {mode === "active" ? (
          <>⚡ <b className="text-foreground">Active replication</b>: every replica executes the request independently. Higher cost, instant failover.</>
        ) : (
          <>
            📜 <b className="text-foreground">Passive replication</b>: a single leader executes, then ships its Write-Ahead-Log to followers. Cheaper, slight failover lag.
            {isElecting && <span className="block mt-1 text-warning font-semibold">⚠️ Raft Leader Election in progress...</span>}
          </>
        )}
      </div>
    </div>
  );
}

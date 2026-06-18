import { useMemo, useState } from "react";
import { log } from "@/utils/logger";

type Strategy = "range" | "hash";
const SHARDS = 3;

// Stable string hash (FNV-1a style, good enough for demo).
function hash(n: number): number {
  let h = 2166136261;
  const s = String(n);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function shardOf(id: number, strategy: Strategy): number {
  if (strategy === "range") {
    if (id <= 3) return 0;
    if (id <= 6) return 1;
    return 2;
  }
  return hash(id) % SHARDS;
}

export function ShardingTab() {
  const [users, setUsers] = useState<number[]>(Array.from({ length: 10 }, (_, i) => i + 1));
  const [strategy, setStrategy] = useState<Strategy>("range");
  const [highlight, setHighlight] = useState<number | null>(null);

  // === SHARDING happens here ===
  const shards = useMemo(() => {
    const buckets: number[][] = Array.from({ length: SHARDS }, () => []);
    users.forEach((u) => buckets[shardOf(u, strategy)].push(u));
    return buckets;
  }, [users, strategy]);

  const addUser = () => {
    const next = (users[users.length - 1] ?? 0) + 1;
    setUsers((u) => [...u, next]);
    const target = shardOf(next, strategy);
    setHighlight(next);
    setTimeout(() => setHighlight(null), 1500);
    log(`➕ user #${next} → Shard ${target + 1} (${strategy === "range" ? "Range" : "Hash"})`, "shard");
  };

  const changeStrategy = (s: Strategy) => {
    setStrategy(s);
    log(`🔀 Resharding all users using ${s === "range" ? "Range-Based" : "Hash-Based"} strategy`, "warn");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Strategy:</label>
        <select
          value={strategy}
          onChange={(e) => changeStrategy(e.target.value as Strategy)}
          className="bg-input border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="range">Range-Based</option>
          <option value="hash">Hash-Based</option>
        </select>
        <span className="text-xs text-muted-foreground">
          {users.length} users · {SHARDS} shards
        </span>
        <button
          onClick={addUser}
          className="ml-auto px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 glow-primary"
        >
          + Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shards.map((bucket, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 min-h-[220px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Shard {i + 1}</h3>
              <span className="text-xs font-mono text-muted-foreground">
                {bucket.length} keys
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {bucket.map((u) => (
                <span
                  key={u}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${
                    highlight === u
                      ? "bg-accent text-accent-foreground border-accent glow-accent"
                      : "bg-secondary/60 border-border"
                  }`}
                >
                  user-{u}
                </span>
              ))}
              {bucket.length === 0 && (
                <span className="text-xs text-muted-foreground italic">empty shard</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

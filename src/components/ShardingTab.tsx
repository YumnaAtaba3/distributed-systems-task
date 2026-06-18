import { useMemo, useState, useRef, useEffect } from "react";
import { log } from "@/utils/logger";
import { ConsistentHashRing, getRangeShard, getRangeInfo, hashToRing } from "@/utils/sharding";

type Strategy = "range" | "hash";
const SHARDS = 3;

export function ShardingTab() {
  const [users, setUsers] = useState<{ id: number }[]>(
    Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
  );
  const [strategy, setStrategy] = useState<Strategy>("range");
  const [highlight, setHighlight] = useState<number | null>(null);
  
  // ============================================================
  // Consistent Hash Ring - مع إعادة البناء عند تغيير الإستراتيجية
  // ============================================================
  const [hashRing, setHashRing] = useState(() => new ConsistentHashRing(SHARDS, 50));

  // إعادة بناء الحلقة عند التبديل إلى Hash
  useEffect(() => {
    if (strategy === "hash") {
      const newRing = new ConsistentHashRing(SHARDS, 50);
      setHashRing(newRing);
      log("🔄 Consistent Hash Ring rebuilt with 50 virtual nodes per shard", "info");
    }
  }, [strategy]);

  // ============================================================
  // دالة التوزيع (تُحسب كل مرة يتغير فيها المستخدمون أو الإستراتيجية)
  // ============================================================
  const shardOf = useMemo(() => {
    return (id: number, strat: Strategy) => {
      if (strat === "range") {
        return getRangeShard(id);
      }
      return hashRing.getShard(id);
    };
  }, [hashRing]);

  // ============================================================
  // تنقية المؤقتات (ممتازة كما هي)
  // ============================================================
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

  // ============================================================
  // التوزيع الفعلي (Sharding)
  // ============================================================
  const shards = useMemo(() => {
    const buckets: { id: number }[][] = Array.from({ length: SHARDS }, () => []);
    users.forEach((u) => {
      const targetShard = shardOf(u.id, strategy);
      buckets[targetShard].push(u);
    });
    return buckets;
  }, [users, strategy, shardOf]);

  // ============================================================
  // إضافة مستخدم جديد
  // ============================================================
  const addUser = () => {
    const nextId = (users[users.length - 1]?.id ?? 0) + 1;
    const nextUsers = [...users, { id: nextId }];

    setUsers(nextUsers);
    const target = shardOf(nextId, strategy);
    setHighlight(nextId);
    scheduleTimeout(() => setHighlight(null), 1500);

    // سجلات تفصيلية
    const strategyName = strategy === "range" ? "Range" : "Hash";
    const shardLabel = target + 1;
    log(`➕ user #${nextId} → Shard ${shardLabel} (${strategyName})`, "shard");
    
    if (strategy === "hash") {
      // عرض إحصائيات التوزيع
      const counts = shards.map((s) => s.length);
      const newCounts = [...counts];
      newCounts[target]++;
      log(`🔑 Shard assignment for user-${nextId} -> Shard ${shardLabel} (Hash: ${hashToRing('user-'+nextId).toFixed(4)})`, "shard");
      log(`📊 Distribution: [${newCounts.join(", ")}] (${users.length + 1} users total)`, "info");
    } else {
      // في Range، نعرض النطاق الحالي
      const rangeInfo = getRangeInfo(target);
      log(`📐 Range for Shard ${shardLabel}: ${rangeInfo}`, "info");
    }
  };

  // ============================================================
  // تبديل الإستراتيجية
  // ============================================================
  const changeStrategy = (s: Strategy) => {
    setStrategy(s);
    const strategyName = s === "range" ? "Range-Based" : "Hash-Based (Consistent Hashing)";
    log(`🔀 Switched to ${strategyName} strategy`, "warn");
    
    if (s === "hash") {
      const stats = hashRing.getStats();
      log(`🔄 Hash Ring has ${stats.reduce((acc, s) => acc + s.count, 0)} nodes (${stats.map(s => `${s.count} for Shard ${s.shardId+1}`).join(", ")})`, "info");
    }
  };

  // ============================================================
  // عرض الواجهة
  // ============================================================
  return (
    <div className="space-y-6">
      {/* شريط التحكم */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Strategy:</label>
        <select
          value={strategy}
          onChange={(e) => changeStrategy(e.target.value as Strategy)}
          className="bg-input border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="range">Range-Based (Static Ranges)</option>
          <option value="hash">Hash-Based (Consistent Hashing)</option>
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

      {/* عرض النطاقات عند اختيار Range */}
      {strategy === "range" && (
        <div className="flex flex-wrap gap-4 p-3 bg-secondary/30 rounded-lg border border-border">
          <span className="text-xs font-medium text-muted-foreground">📐 Static Ranges:</span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="text-xs font-mono bg-card px-3 py-1 rounded-full border border-border">
              Shard {i+1}: {getRangeInfo(i)}
            </span>
          ))}
        </div>
      )}

      {/* عرض الخوادم */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shards.map((bucket, i) => (
          <div key={`shard-bucket-${i}`} className="rounded-xl border border-border bg-card p-4 min-h-[220px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Shard {i + 1}</h3>
              <span className="text-xs font-mono text-muted-foreground">
                {bucket.length} keys
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {bucket.map((u) => (
                <span
                  key={u.id}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${
                    highlight === u.id
                      ? "bg-accent text-accent-foreground border-accent glow-accent"
                      : "bg-secondary/60 border-border"
                  }`}
                >
                  user-{u.id}
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

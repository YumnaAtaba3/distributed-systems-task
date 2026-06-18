import { useRef, useState, useEffect } from "react";
import { useClusterSimulation, updateServers, getServers, type Server } from "@/hooks/useClusterSimulation";
import { log } from "@/utils/logger";
import { pickServer, type Algo } from "@/utils/loadBalancer";
import { useFaultTolerantRequest } from "@/hooks/useFaultTolerantRequest";

const algoLabels: Record<Algo, string> = {
  "round-robin": "Round-Robin",
  "least-conn": "Least Connections",
  p2c: "Power of Two Choices",
};

const calculateLoad = (baseLoad: number, connections: number) => {
  return Math.max(5, Math.min(99, baseLoad + connections * 12));
};

export function LoadBalancerTab() {
  const servers = useClusterSimulation();
  const [algo, setAlgo] = useState<Algo>("round-robin");
  const rrRef = useRef(0);
  const reqRef = useRef(1);
  const [packets, setPackets] = useState<{ id: number; targetIdx: number }[]>([]);

  const { circuitState, isViewingFallback, executeRequest } = useFaultTolerantRequest<Server | null>();

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

  const requestPromise = () =>
    new Promise<Server>((resolve, reject) => {
      const { server: targetServer, nextRr } = pickServer(getServers(), algo, rrRef.current);
      rrRef.current = nextRr;

      if (!targetServer) {
        reject(new Error("Routing failed: No healthy servers available"));
        return;
      }

      // Animate packet from client → server
      const packetId = Date.now() + Math.random();
      const targetIdx = getServers().findIndex((s) => s.id === targetServer.id);
      setPackets((p) => [...p, { id: packetId, targetIdx }]);
      scheduleTimeout(() => setPackets((p) => p.filter((x) => x.id !== packetId)), 250);

      // Update server connections & load proportionally before request processing
      updateServers((srv) =>
        srv.map((s) =>
          s.id === targetServer.id
            ? {
                ...s,
                connections: s.connections + 1,
                requests: s.requests + 1,
                load: calculateLoad(s.baseLoad, s.connections + 1),
              }
            : s
        )
      );

      // Connection completes after simulated delay (150ms)
      scheduleTimeout(() => {
        updateServers((srv) =>
          srv.map((s) =>
            s.id === targetServer.id
              ? {
                  ...s,
                  connections: Math.max(0, s.connections - 1),
                  load: calculateLoad(s.baseLoad, Math.max(0, s.connections - 1)),
                }
              : s
          )
        );
        resolve(targetServer);
      }, 150);
    });

  const sendRequest = async () => {
    const reqId = reqRef.current++;
    log(`📨 Request #${reqId} dispatched via ${algoLabels[algo]}`, "lb");

    const result = await executeRequest(requestPromise, {
      retries: 3,
      fallbackData: null,
    });

    if (result) {
      log(`✅ Request #${reqId} successfully processed by ${result.name}`, "ok");
    } else {
      log(`🚨 Request #${reqId} failed after all retries. Fallback data returned.`, "warn");
    }
  };

  const burst = () => {
    for (let i = 0; i < 10; i++) scheduleTimeout(sendRequest, i * 120);
  };

  const toggleServerHealth = (id: string) => {
    updateServers((srv) =>
      srv.map((s) => (s.id === id ? { ...s, healthy: !s.healthy } : s))
    );
    const updated = getServers().find((s) => s.id === id);
    if (updated) {
      log(`🔌 Node ${id} set to ${updated.healthy ? "HEALTHY" : "DOWN"}`, "warn");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Algorithm:</label>
        <select
          value={algo}
          onChange={(e) => {
            setAlgo(e.target.value as Algo);
            log(`⚙️  Algorithm switched to ${algoLabels[e.target.value as Algo]}`, "info");
          }}
          className="bg-input border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="round-robin">Round-Robin</option>
          <option value="least-conn">Least Connections</option>
          <option value="p2c">Power of Two Choices</option>
        </select>

        {isViewingFallback && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold animate-pulse">
            <span>⚠️</span> Fallback Mode Active (Serving Cached Data)
          </div>
        )}
        {circuitState !== "CLOSED" && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warning/10 text-warning border border-warning/20 text-xs font-semibold">
            <span>🔌</span> Circuit Breaker: <span className="font-bold">{circuitState}</span>
          </div>
        )}

        <button
          onClick={sendRequest}
          className="ml-auto px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 glow-primary"
        >
          Send Request
        </button>
        <button
          onClick={burst}
          className="px-4 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
        >
          Burst ×10
        </button>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
        {/* Client node */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card border border-border text-xs font-mono">
          ⌁ client
        </div>

        {servers.map((s, idx) => {
          const loadColor =
            s.load > 80 ? "bg-destructive" : s.load > 60 ? "bg-warning" : "bg-success";
          const flying = packets.some((p) => p.targetIdx === idx);
          return (
            <div
              key={s.id}
              className={`relative rounded-xl border border-border bg-card p-4 transition-shadow ${
                flying ? "glow-accent" : ""
              } ${!s.healthy ? "opacity-60" : ""}`}
            >
              {flying && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-accent packet"
                  style={{ ["--fly-x" as string]: "0px" }}
                />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${s.healthy ? "bg-success heartbeat" : "bg-destructive"}`} />
                  <h3 className="font-semibold">{s.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleServerHealth(s.id)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors font-medium ${
                      s.healthy
                        ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                        : "bg-success/10 text-success border-success/20 hover:bg-success/20"
                    }`}
                  >
                    {s.healthy ? "Kill" : "Restore"}
                  </button>
                  <span className="text-xs font-mono text-muted-foreground">node-{s.id.toLowerCase()}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">CPU Load</span>
                  <span className="font-mono">{s.healthy ? `${s.load}%` : "OFFLINE"}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${s.healthy ? loadColor : "bg-muted-foreground"} transition-all duration-500`}
                    style={{ width: `${s.healthy ? s.load : 0}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-secondary/60 py-2">
                  <div className="text-xl font-bold font-mono">{s.requests}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                </div>
                <div className="rounded-md bg-secondary/60 py-2">
                  <div className="text-xl font-bold font-mono">{s.healthy ? s.connections : 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

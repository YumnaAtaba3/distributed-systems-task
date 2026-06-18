import { useRef, useState } from "react";
import { useClusterSimulation, updateServers, type Server } from "@/hooks/useClusterSimulation";
import { log } from "@/utils/logger";

type Algo = "round-robin" | "least-conn" | "p2c";

// === LOAD BALANCING happens here ===
// Pick a target server based on the selected algorithm.
function pickServer(servers: Server[], algo: Algo, rrIndex: number): { server: Server; nextRr: number } {
  const healthy = servers.filter((s) => s.healthy);
  if (algo === "round-robin") {
    const idx = rrIndex % healthy.length;
    return { server: healthy[idx], nextRr: rrIndex + 1 };
  }
  if (algo === "least-conn") {
    const sorted = [...healthy].sort((a, b) => a.connections - b.connections);
    return { server: sorted[0], nextRr: rrIndex };
  }
  // Power of Two Choices: pick two random, take the lighter one (by load).
  const a = healthy[Math.floor(Math.random() * healthy.length)];
  let b = healthy[Math.floor(Math.random() * healthy.length)];
  if (b.id === a.id) b = healthy[(healthy.indexOf(a) + 1) % healthy.length];
  return { server: a.load <= b.load ? a : b, nextRr: rrIndex };
}

const algoLabels: Record<Algo, string> = {
  "round-robin": "Round-Robin",
  "least-conn": "Least Connections",
  p2c: "Power of Two Choices",
};

export function LoadBalancerTab() {
  const servers = useClusterSimulation();
  const [algo, setAlgo] = useState<Algo>("round-robin");
  const rrRef = useRef(0);
  const reqRef = useRef(1);
  const [packets, setPackets] = useState<{ id: number; targetIdx: number }[]>([]);

  const sendRequest = () => {
    const { server, nextRr } = pickServer(servers, algo, rrRef.current);
    rrRef.current = nextRr;
    const reqId = reqRef.current++;
    const targetIdx = servers.findIndex((s) => s.id === server.id);

    // Animate packet from client → server
    const packetId = Date.now() + Math.random();
    setPackets((p) => [...p, { id: packetId, targetIdx }]);
    setTimeout(() => setPackets((p) => p.filter((x) => x.id !== packetId)), 900);

    // Update server counters
    updateServers((srv) =>
      srv.map((s) =>
        s.id === server.id
          ? { ...s, connections: s.connections + 1, requests: s.requests + 1, load: Math.min(99, s.load + 6) }
          : s
      )
    );
    // Connection completes after a short delay
    setTimeout(() => {
      updateServers((srv) =>
        srv.map((s) =>
          s.id === server.id ? { ...s, connections: Math.max(0, s.connections - 1) } : s
        )
      );
    }, 1500);

    log(`📨 Request #${reqId} routed to ${server.name} via ${algoLabels[algo]}`, "lb");
  };

  const burst = () => {
    for (let i = 0; i < 10; i++) setTimeout(sendRequest, i * 120);
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
              }`}
            >
              {flying && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-accent packet"
                  style={{ ["--fly-x" as string]: "0px" }}
                />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success heartbeat" />
                  <h3 className="font-semibold">{s.name}</h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">node-{s.id.toLowerCase()}</span>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">CPU Load</span>
                  <span className="font-mono">{s.load}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${loadColor} transition-all duration-500`}
                    style={{ width: `${s.load}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-secondary/60 py-2">
                  <div className="text-xl font-bold font-mono">{s.requests}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                </div>
                <div className="rounded-md bg-secondary/60 py-2">
                  <div className="text-xl font-bold font-mono">{s.connections}</div>
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

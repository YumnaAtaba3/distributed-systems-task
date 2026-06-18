import { useEffect, useState } from "react";
import { useClusterSimulation } from "@/hooks/useClusterSimulation";

export function Heartbeat() {
  const servers = useClusterSimulation();
  const [isAlive, setIsAlive] = useState(true);

  useEffect(() => {
    // Simulate a health check ping every 5 seconds
    const interval = setInterval(() => {
      // 90% success rate to simulate real network jitter / health check failures
      const pingSuccess = Math.random() < 0.9;
      setIsAlive(pingSuccess);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const active = servers.filter((s) => s.healthy).length;
  // Cluster is healthy if all servers are healthy AND the last ping succeeded
  const ok = active === servers.length && isAlive;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur">
      <span
        className={`h-2.5 w-2.5 rounded-full heartbeat ${
          ok ? "bg-success" : "bg-destructive"
        }`}
      />
      <span className="text-xs font-medium">
        Cluster {ok ? "Healthy" : "Degraded"}
      </span>
      <span className="text-xs text-muted-foreground">
        · {active}/{servers.length} nodes
      </span>
    </div>
  );
}

import { useClusterSimulation } from "@/hooks/useClusterSimulation";

export function Heartbeat() {
  const servers = useClusterSimulation();
  const active = servers.filter((s) => s.healthy).length;
  const ok = active === servers.length;
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

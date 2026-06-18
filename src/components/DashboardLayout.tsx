import { useState } from "react";
import { LoadBalancerTab } from "./LoadBalancerTab";
import { ReplicationTab } from "./ReplicationTab";
import { ShardingTab } from "./ShardingTab";
import { LiveLogs } from "./LiveLogs";
import { Heartbeat } from "./Heartbeat";

type Tab = "lb" | "repl" | "shard";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "lb", label: "Load Balancer", icon: "⚖️" },
  { id: "repl", label: "Replication", icon: "🔁" },
  { id: "shard", label: "Sharding", icon: "🗂️" },
];

export function DashboardLayout() {
  const [tab, setTab] = useState<Tab>("lb");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center font-bold">
              ◈
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Distributed Systems Playground</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                infra · observability · sim
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Heartbeat />
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-primary to-accent" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {tab === "lb" && <LoadBalancerTab />}
        {tab === "repl" && <ReplicationTab />}
        {tab === "shard" && <ShardingTab />}
      </main>

      {/* Sticky logs */}
      <div className="sticky bottom-0">
        <LiveLogs />
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Distributed Systems Playground" },
      {
        name: "description",
        content:
          "Interactive simulator for distributed systems concepts: load balancing, replication, and sharding.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <DashboardLayout />;
}

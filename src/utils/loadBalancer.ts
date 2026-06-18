import { type Server } from "@/hooks/useClusterSimulation";

export type Algo = "round-robin" | "least-conn" | "p2c";

export function pickServer(
  servers: Server[],
  algo: Algo,
  rrIndex: number
): { server: Server | null; nextRr: number } {
  const healthy = servers.filter((s) => s.healthy);
  
  // Guard against complete cluster failure (0 healthy nodes)
  if (healthy.length === 0) {
    return { server: null, nextRr: rrIndex };
  }

  // 1. Round-Robin
  if (algo === "round-robin") {
    const idx = rrIndex % healthy.length;
    return { server: healthy[idx], nextRr: rrIndex + 1 };
  }

  // 2. Least Connections (O(N) linear scan instead of O(N log N) sorting)
  if (algo === "least-conn") {
    let selected = healthy[0];
    for (let i = 1; i < healthy.length; i++) {
      const node = healthy[i];
      // Compare active connections. Tie-breaker: CPU Load.
      if (
        node.connections < selected.connections ||
        (node.connections === selected.connections && node.load < selected.load)
      ) {
        selected = node;
      }
    }
    return { server: selected, nextRr: rrIndex };
  }

  // 3. Power of Two Choices (P2C) - Compares active connections only
  const len = healthy.length;
  const idxA = Math.floor(Math.random() * len);
  let idxB = idxA;
  
  // Select a distinct second node if possible
  if (len > 1) {
    while (idxB === idxA) {
      idxB = Math.floor(Math.random() * len);
    }
  }

  const nodeA = healthy[idxA];
  const nodeB = healthy[idxB];

  // Compare connections first, tie-break randomly
  const chosen =
    nodeA.connections < nodeB.connections
      ? nodeA
      : nodeB.connections < nodeA.connections
      ? nodeB
      : Math.random() < 0.5
      ? nodeA
      : nodeB;

  return { server: chosen, nextRr: rrIndex };
}

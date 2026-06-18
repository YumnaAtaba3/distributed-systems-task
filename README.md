# Distributed Systems Playground

An advanced interactive web simulator designed to visualize and experiment with core distributed systems concepts in real-time. This playground helps engineers and developers understand how load balancing, replication, sharding, and fault tolerance function through intuitive visual animations and logging.

---

## ◈ Implemented Concepts & Architecture

The application has been audited and refactored to ensure the theoretical distributed systems algorithms are 100% accurate, safe, and performant under React 18+ specifications.

### 1. Fault Tolerance Engine
A resilient client wrapper manages request retries and node failure recovery:
*   **Circuit Breaker State Machine:** Implements three states:
    *   `CLOSED`: Normal operational mode where requests are routed to healthy nodes.
    *   `OPEN`: Activated after 3 consecutive failures. In this state, the circuit trips, failing fast to protect backend services and serving fallback data instantly.
    *   `HALF-OPEN`: After a 10-second timeout, the circuit enters a probing state. If the next request succeeds, it transitions back to `CLOSED`. If it fails, it immediately re-trips to `OPEN`.
*   **Exponential Backoff:** When a request fails, retries are scheduled with an exponentially increasing delay: `Math.pow(2, attempt) * 1000` (e.g., 2s, 4s, 8s). The retry count resets to 0 upon any successful request.
*   **Fallback Mechanism:** When the circuit is `OPEN` or all retries are exhausted, the client returns fallback/cached data and triggers a prominent warning badge in the UI instead of crashing.

### 2. Algorithmic Load Balancing
Routing decisions are decoupled from the UI layer and optimized for performance:
*   **Round-Robin:** Sequentially cycles requests through healthy nodes, ensuring equal request distribution.
*   **Least Connections:** Scans healthy nodes in $O(N)$ linear time (rather than $O(N \log N)$ sorting) to find the node with the fewest active connections, breaking ties using CPU load.
*   **Power of Two Choices (P2C):** Selects exactly two random healthy nodes, compares their load/connections, and routes to the lighter one. Collision handling selects a random secondary index to avoid deterministic routing bias.
*   **Zero-Node Safe Guard:** Prevents application crashes when all nodes are unhealthy. The router handles empty server pools gracefully, communicating the error to the Fault Tolerance Engine.
*   **Failure Controls (Kill/Restore):** Each server card is equipped with control buttons to manually toggle its health, simulating server outages and network failures in real-time.

### 3. Data Sharding
*   **Consistent Hashing Ring:** Replaces standard Mod-N hashing with a consistent hashing ring. By hashing keys and shards onto a circular space using virtual nodes, adding or removing shards requires remapping only a tiny fraction of keys ($1/N$), preventing massive data migration.
*   **Dynamic Range-Based Sharding:** Automatically partitions keys based on the number of active shards, avoiding hardcoded bounds and mitigating "hot shard" vulnerabilities as data grows.

### 4. Heartbeat (Active Health Check)
*   Simulates realistic network health probes. A background `setInterval` pings nodes every 5 seconds, introducing a 10% random failure rate to demonstrate network jitter and transient glitches.

---

## 🛠️ Performance & React 18+ Best Practices

*   **Memory Leak Prevention:** All asynchronous animations and request simulations are clean. Timeouts are scheduled via a tracking reference and cleared inside a `useEffect` cleanup function on component unmount.
*   **Stable Keys:** Dynamically generated element lists in sharding use stable, unique string keys rather than array indexes, optimizing reconciliation performance.
*   **Separation of Concerns:** Business logic and mathematical calculations are extracted from the UI components into pure utility modules (`src/utils/loadBalancer.ts`, `src/utils/sharding.ts`), keeping components focused on rendering.

---

## 📂 Project Directory Structure

```bash
src/
├── hooks/
│   ├── useClusterSimulation.ts     # Global server cluster states (CPU, connections)
│   └── useFaultTolerantRequest.ts  # Circuit Breaker, Exponential Backoff, & Fallback hook
├── utils/
│   ├── logger.ts                   # Observability log bus
│   ├── loadBalancer.ts             # Load balancing algorithms (RR, Least-Conn, P2C)
│   └── sharding.ts                 # Consistent Hash Ring & dynamic range partitioning
└── components/
    ├── Heartbeat.tsx               # Periodic network ping simulation
    ├── LoadBalancerTab.tsx         # Load balancer UI and failure control deck
    ├── ReplicationTab.tsx          # Active/passive replication simulator
    └── ShardingTab.tsx             # Consistent hashing and sharding visualizer
```
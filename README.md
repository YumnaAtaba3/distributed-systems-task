# 🌐 Distributed Systems Playground

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **An interactive, real-time web simulator for visualizing and experimenting with core distributed systems concepts.**  
> Built for engineers, developers, and students to understand load balancing, replication, sharding, and fault tolerance through intuitive visualizations, live logging, and hands-on controls.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Implemented Concepts](#-implemented-concepts)
- [Architecture & Design](#-architecture--design)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
- [Technical Stack](#-technical-stack)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

The **Distributed Systems Playground** is a comprehensive educational tool that brings complex distributed systems theory to life. It simulates production-grade distributed system behaviors in your browser, allowing you to:

- ✅ **Visualize** load balancing algorithms in real-time
- ✅ **Experiment** with active/passive replication strategies
- ✅ **Understand** data sharding with consistent hashing
- ✅ **Observe** fault tolerance mechanisms (Circuit Breakers, Retries, Fallbacks)
- ✅ **Test** failure scenarios with Kill/Restore controls
- ✅ **Monitor** system health with heartbeat simulations

---

## ✨ Key Features

| Feature | Description |
|:---|:---|
| **🎮 Interactive Controls** | Real-time buttons for sending requests, bursting traffic, and toggling server health |
| **📊 Live Visualizations** | Animated server cards with CPU load bars, active connection counters, and packet animations |
| **📝 Activity Logging** | Comprehensive event bus with timestamps and color-coded log levels (info, warn, error, ok) |
| **🔄 Tab Persistence** | Server states survive tab switches via module-level state management |
| **🎨 Premium UI** | Glassmorphism design, pulse animations, glow effects, and dark/light mode support |
| **⚡ Real-time Jitter** | Simulated network jitter (±1% CPU drift) for realistic cluster behavior |

---

## 🧠 Implemented Concepts

### 1. ⚖️ Load Balancing Algorithms

| Algorithm | Description | Best For |
|:---|:---|:---|
| **Round-Robin** | Cycles requests sequentially through healthy nodes (A → B → C → A) | Uniform workloads, simple distribution |
| **Least Connections** | Routes to the node with the fewest active connections; breaks ties with CPU load | Uneven request durations, dynamic workloads |
| **Power of Two Choices (P2C)** | Randomly selects two nodes and routes to the lighter one; proven near-optimal | Large-scale systems, high throughput |

**Implementation Highlights:**
- ✅ $O(N)$ linear scan for Least Connections (no expensive sorting)
- ✅ Unbiased P2C with true random selection (no deterministic bias)
- ✅ Zero-node safe guard (graceful handling when all nodes are down)
- ✅ Kill/Restore controls for manual failure simulation

---

### 2. 🔄 Replication Strategies

| Strategy | Description | Use Case |
|:---|:---|:---|
| **Active Replication** | All replicas execute every request in sync (State Machine Replication) | Zero-downtime, safety-critical systems |
| **Passive Replication** | Leader executes requests and ships WAL to followers; automatic leader election on failure | Cost-efficient, general-purpose systems |

**Implementation Highlights:**
- ✅ Active: All 3 replicas execute transactions simultaneously
- ✅ Passive: Leader commits → ships WAL → followers apply
- ✅ Leader Election: Automatic Raft-like election when leader fails
- ✅ Failover: New leader resumes processing immediately (sub-second)

---

### 3. 🗂️ Data Sharding Strategies

| Strategy | Description | Key Mechanism |
|:---|:---|:---|
| **Range-Based Sharding** | Static ranges (1-100 → Shard 1, 101-200 → Shard 2, 201-∞ → Shard 3) | Simple, predictable, but prone to hot shards |
| **Hash-Based Sharding** | Consistent Hashing Ring with 50 virtual nodes per shard | Uniform distribution, minimal remapping on node changes |

**Implementation Highlights:**
- ✅ Consistent Hashing Ring with 150 total virtual nodes (50 per shard)
- ✅ Salt-based node distribution to prevent clustering
- ✅ Dynamic range partitioning to avoid hardcoded bounds
- ✅ Visual distribution display with key counts per shard

---

### 4. 🔌 Fault Tolerance Engine

| Component | Description | Behavior |
|:---|:---|:---|
| **Circuit Breaker** | Three-state machine (CLOSED → OPEN → HALF-OPEN) | Trips after 3 failures, recovers after 10s |
| **Exponential Backoff** | `Math.pow(2, attempt) * 1000` ms delays | 1s → 2s → 4s retry intervals |
| **Fallback Mechanism** | Serves cached/default data when circuit is OPEN | Prevents UI crashes, shows warning badge |

**Implementation Highlights:**
- ✅ Automatic state transitions with timer-based recovery
- ✅ Fail-fast behavior when circuit is OPEN (prevents cascading failures)
- ✅ Clear visual indicators for circuit state and fallback mode
- ✅ Request success resets retry counter to zero

---

### 5. 🫀 Health Monitoring

| Component | Description |
|:---|:---|
| **Heartbeat** | Simulated network ping every 5 seconds |
| **Jitter Simulation** | ±1% random CPU drift (realistic network variance) |
| **Visual Indicator** | Animated pulse dot (green = healthy, red = down) |

**Implementation Highlights:**
- ✅ Independent health checks (not tied to request routing)
- ✅ 10% random failure rate for realistic network jitter
- ✅ Proper `setInterval` cleanup on component unmount

---

## 🏗️ Architecture & Design

### React 18+ Best Practices

| Practice | Implementation |
|:---|:---|
| **Memory Leak Prevention** | All `setTimeout`/`setInterval` tracked via `useRef` and cleared in `useEffect` cleanup |
| **Stable Keys** | Dynamic lists use stable string keys (not array indexes) |
| **Separation of Concerns** | Business logic extracted to `utils/`, components focus on rendering |
| **Type Safety** | Full TypeScript coverage with strict typing |
| **State Persistence** | Module-level state survives tab switches |

### Design Patterns

| Pattern | Location | Purpose |
|:---|:---|:---|
| **Custom Hooks** | `hooks/useClusterSimulation.ts`, `hooks/useFaultTolerantRequest.ts` | Reusable, isolated logic |
| **Singleton State** | Module-level `servers` variable | Global state across components |
| **Observer Pattern** | `subs` Set + `emit()` function | Reactivity without context providers |
| **Factory Pattern** | `ConsistentHashRing` class | Encapsulates ring logic and virtual nodes |

---

## 📂 Project Structure

```bash
distributed-systems-playground/
├── src/
│   ├── components/
│   │   ├── DashboardLayout.tsx    # Main layout with tabs
│   │   ├── Heartbeat.tsx          # Health monitoring widget
│   │   ├── LiveLogs.tsx           # Activity feed
│   │   ├── LoadBalancerTab.tsx    # LB UI with kill/restore
│   │   ├── ReplicationTab.tsx     # Active/Passive UI
│   │   └── ShardingTab.tsx        # Range/Hash visualizer
│   ├── hooks/
│   │   ├── useClusterSimulation.ts # Server state management
│   │   └── useFaultTolerantRequest.ts # Circuit Breaker + Retry
│   ├── utils/
│   │   ├── loadBalancer.ts        # RR, Least-Conn, P2C algorithms
│   │   ├── logger.ts              # Centralized logging bus
│   │   └── sharding.ts            # Consistent Hashing + Range
│   ├── routes/
│   │   ├── __root.tsx             # TanStack Router root
│   │   └── index.tsx              # Home route
│   └── styles.css                 # Global styles + animations
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
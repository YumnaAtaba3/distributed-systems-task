import { r as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C3Ns5d3g.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var servers = [
	{
		id: "A",
		name: "Server A",
		baseLoad: 15,
		load: 15,
		connections: 0,
		requests: 0,
		healthy: true
	},
	{
		id: "B",
		name: "Server B",
		baseLoad: 45,
		load: 45,
		connections: 0,
		requests: 0,
		healthy: true
	},
	{
		id: "C",
		name: "Server C",
		baseLoad: 25,
		load: 25,
		connections: 0,
		requests: 0,
		healthy: true
	}
].map((s) => ({ ...s }));
var subs = /* @__PURE__ */ new Set();
var timer = null;
function emit$1() {
	subs.forEach((s) => s(servers));
}
function ensureTimer() {
	if (timer) return;
	timer = setInterval(() => {
		servers = servers.map((s) => {
			const jitter = (Math.random() - .5) * 2;
			const nextLoad = Math.max(5, Math.min(99, s.baseLoad + s.connections * 12 + jitter));
			return {
				...s,
				load: Math.round(nextLoad)
			};
		});
		emit$1();
	}, 1e3);
}
function updateServers(updater) {
	servers = updater(servers);
	emit$1();
}
function getServers() {
	return servers;
}
function useClusterSimulation() {
	const [state, setState] = (0, import_react.useState)(servers);
	(0, import_react.useEffect)(() => {
		ensureTimer();
		subs.add(setState);
		setState(servers);
		return () => {
			subs.delete(setState);
			if (subs.size === 0 && timer) {
				clearInterval(timer);
				timer = null;
			}
		};
	}, []);
	return state;
}
var nextId = 1;
var logs = [];
var listeners = /* @__PURE__ */ new Set();
function emit() {
	listeners.forEach((l) => l(logs));
}
function log(message, kind = "info") {
	logs = [{
		id: nextId++,
		ts: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: false }),
		message,
		kind
	}, ...logs].slice(0, 200);
	emit();
}
function clearLogs() {
	logs = [];
	emit();
}
function subscribe(fn) {
	listeners.add(fn);
	fn(logs);
	return () => listeners.delete(fn);
}
function pickServer(servers, algo, rrIndex) {
	const healthy = servers.filter((s) => s.healthy);
	if (healthy.length === 0) return {
		server: null,
		nextRr: rrIndex
	};
	if (algo === "round-robin") return {
		server: healthy[rrIndex % healthy.length],
		nextRr: rrIndex + 1
	};
	if (algo === "least-conn") {
		let selected = healthy[0];
		for (let i = 1; i < healthy.length; i++) {
			const node = healthy[i];
			if (node.connections < selected.connections || node.connections === selected.connections && node.load < selected.load) selected = node;
		}
		return {
			server: selected,
			nextRr: rrIndex
		};
	}
	const len = healthy.length;
	const idxA = Math.floor(Math.random() * len);
	let idxB = idxA;
	if (len > 1) while (idxB === idxA) idxB = Math.floor(Math.random() * len);
	const nodeA = healthy[idxA];
	const nodeB = healthy[idxB];
	return {
		server: nodeA.connections < nodeB.connections ? nodeA : nodeB.connections < nodeA.connections ? nodeB : Math.random() < .5 ? nodeA : nodeB,
		nextRr: rrIndex
	};
}
function useFaultTolerantRequest() {
	const [circuitState, setCircuitState] = (0, import_react.useState)("CLOSED");
	const [failures, setFailures] = (0, import_react.useState)(0);
	const [isViewingFallback, setIsViewingFallback] = (0, import_react.useState)(false);
	const stateRef = (0, import_react.useRef)("CLOSED");
	const failuresRef = (0, import_react.useRef)(0);
	const halfOpenTimer = (0, import_react.useRef)(null);
	const transitionTo = (0, import_react.useCallback)((nextState) => {
		stateRef.current = nextState;
		setCircuitState(nextState);
		log(`🔌 Circuit Breaker transitioned to ${nextState}`, nextState === "OPEN" ? "warn" : "info");
		if (nextState === "OPEN") {
			if (halfOpenTimer.current) clearTimeout(halfOpenTimer.current);
			halfOpenTimer.current = setTimeout(() => {
				transitionTo("HALF-OPEN");
			}, 1e4);
		}
	}, []);
	const executeRequest = (0, import_react.useCallback)(async (requestFn, options) => {
		const { retries = 3, fallbackData, failureRate = 0 } = options;
		if (stateRef.current === "OPEN") {
			log(`🚫 Circuit is OPEN. Request blocked (Fail-Fast). Serving fallback data.`, "warn");
			setIsViewingFallback(true);
			return fallbackData;
		}
		let attempt = 0;
		while (attempt <= retries) try {
			if (failureRate > 0 && Math.random() < failureRate) throw new Error("Simulated Server Connection Timeout (504)");
			const result = await requestFn();
			failuresRef.current = 0;
			setFailures(0);
			setIsViewingFallback(false);
			if (stateRef.current === "HALF-OPEN") transitionTo("CLOSED");
			return result;
		} catch (err) {
			attempt++;
			const backoffDelay = Math.pow(2, attempt) * 1e3;
			log(`❌ Attempt ${attempt} failed: ${err.message}`, "warn");
			if (attempt <= retries) {
				log(`⏳ Retrying in ${backoffDelay}ms (Exponential Backoff)...`, "info");
				await new Promise((resolve) => setTimeout(resolve, backoffDelay));
			} else {
				failuresRef.current += 1;
				setFailures(failuresRef.current);
				log(`🚨 Request failed after ${retries + 1} attempts.`, "warn");
				if (failuresRef.current >= 3 && stateRef.current !== "OPEN") transitionTo("OPEN");
				else if (stateRef.current === "HALF-OPEN") transitionTo("OPEN");
				setIsViewingFallback(true);
				return fallbackData;
			}
		}
		setIsViewingFallback(true);
		return fallbackData;
	}, [transitionTo]);
	(0, import_react.useEffect)(() => {
		return () => {
			if (halfOpenTimer.current) clearTimeout(halfOpenTimer.current);
		};
	}, []);
	return {
		circuitState,
		failures,
		isViewingFallback,
		executeRequest
	};
}
var algoLabels = {
	"round-robin": "Round-Robin",
	"least-conn": "Least Connections",
	p2c: "Power of Two Choices"
};
var calculateLoad = (baseLoad, connections) => {
	return Math.max(5, Math.min(99, baseLoad + connections * 12));
};
function LoadBalancerTab() {
	const servers = useClusterSimulation();
	const [algo, setAlgo] = (0, import_react.useState)("round-robin");
	const rrRef = (0, import_react.useRef)(0);
	const reqRef = (0, import_react.useRef)(1);
	const [packets, setPackets] = (0, import_react.useState)([]);
	const { circuitState, isViewingFallback, executeRequest } = useFaultTolerantRequest();
	const timeoutsRef = (0, import_react.useRef)([]);
	const scheduleTimeout = (fn, delay) => {
		const id = setTimeout(() => {
			fn();
			timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
		}, delay);
		timeoutsRef.current.push(id);
		return id;
	};
	(0, import_react.useEffect)(() => {
		return () => {
			timeoutsRef.current.forEach(clearTimeout);
		};
	}, []);
	const requestPromise = () => new Promise((resolve, reject) => {
		const { server: targetServer, nextRr } = pickServer(getServers(), algo, rrRef.current);
		rrRef.current = nextRr;
		if (!targetServer) {
			reject(/* @__PURE__ */ new Error("Routing failed: No healthy servers available"));
			return;
		}
		const packetId = Date.now() + Math.random();
		const targetIdx = getServers().findIndex((s) => s.id === targetServer.id);
		setPackets((p) => [...p, {
			id: packetId,
			targetIdx
		}]);
		scheduleTimeout(() => setPackets((p) => p.filter((x) => x.id !== packetId)), 250);
		updateServers((srv) => srv.map((s) => s.id === targetServer.id ? {
			...s,
			connections: s.connections + 1,
			requests: s.requests + 1,
			load: calculateLoad(s.baseLoad, s.connections + 1)
		} : s));
		scheduleTimeout(() => {
			updateServers((srv) => srv.map((s) => s.id === targetServer.id ? {
				...s,
				connections: Math.max(0, s.connections - 1),
				load: calculateLoad(s.baseLoad, Math.max(0, s.connections - 1))
			} : s));
			resolve(targetServer);
		}, 150);
	});
	const sendRequest = async () => {
		const reqId = reqRef.current++;
		log(`📨 Request #${reqId} dispatched via ${algoLabels[algo]}`, "lb");
		const result = await executeRequest(requestPromise, {
			retries: 3,
			fallbackData: null
		});
		if (result) log(`✅ Request #${reqId} successfully processed by ${result.name}`, "ok");
		else log(`🚨 Request #${reqId} failed after all retries. Fallback data returned.`, "warn");
	};
	const burst = () => {
		for (let i = 0; i < 10; i++) scheduleTimeout(sendRequest, i * 120);
	};
	const toggleServerHealth = (id) => {
		updateServers((srv) => srv.map((s) => s.id === id ? {
			...s,
			healthy: !s.healthy
		} : s));
		const updated = getServers().find((s) => s.id === id);
		if (updated) log(`🔌 Node ${id} set to ${updated.healthy ? "HEALTHY" : "DOWN"}`, "warn");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "text-sm text-muted-foreground",
					children: "Algorithm:"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: algo,
					onChange: (e) => {
						setAlgo(e.target.value);
						log(`⚙️  Algorithm switched to ${algoLabels[e.target.value]}`, "info");
					},
					className: "bg-input border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "round-robin",
							children: "Round-Robin"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "least-conn",
							children: "Least Connections"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "p2c",
							children: "Power of Two Choices"
						})
					]
				}),
				isViewingFallback && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold animate-pulse",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "⚠️" }), " Fallback Mode Active (Serving Cached Data)"]
				}),
				circuitState !== "CLOSED" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warning/10 text-warning border border-warning/20 text-xs font-semibold",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🔌" }),
						" Circuit Breaker: ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-bold",
							children: circuitState
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: sendRequest,
					className: "ml-auto px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 glow-primary",
					children: "Send Request"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: burst,
					className: "px-4 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90",
					children: "Burst ×10"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative grid grid-cols-1 md:grid-cols-3 gap-4 pt-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card border border-border text-xs font-mono",
				children: "⌁ client"
			}), servers.map((s, idx) => {
				const loadColor = s.load > 80 ? "bg-destructive" : s.load > 60 ? "bg-warning" : "bg-success";
				const flying = packets.some((p) => p.targetIdx === idx);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `relative rounded-xl border border-border bg-card p-4 transition-shadow ${flying ? "glow-accent" : ""} ${!s.healthy ? "opacity-60" : ""}`,
					children: [
						flying && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-accent packet",
							style: { ["--fly-x"]: "0px" }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2.5 w-2.5 rounded-full ${s.healthy ? "bg-success heartbeat" : "bg-destructive"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "font-semibold",
									children: s.name
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => toggleServerHealth(s.id),
									className: `text-[10px] px-2 py-0.5 rounded border transition-colors font-medium ${s.healthy ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" : "bg-success/10 text-success border-success/20 hover:bg-success/20"}`,
									children: s.healthy ? "Kill" : "Restore"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs font-mono text-muted-foreground",
									children: ["node-", s.id.toLowerCase()]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between text-xs mb-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: "CPU Load"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono",
									children: s.healthy ? `${s.load}%` : "OFFLINE"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-2 rounded-full bg-muted overflow-hidden",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `h-full ${s.healthy ? loadColor : "bg-muted-foreground"} transition-all duration-500`,
									style: { width: `${s.healthy ? s.load : 0}%` }
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-2 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-md bg-secondary/60 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xl font-bold font-mono",
									children: s.requests
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] uppercase tracking-wider text-muted-foreground",
									children: "Total"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-md bg-secondary/60 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xl font-bold font-mono",
									children: s.healthy ? s.connections : 0
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] uppercase tracking-wider text-muted-foreground",
									children: "Active"
								})]
							})]
						})
					]
				}, s.id);
			})]
		})]
	});
}
var nodes = [
	"R1",
	"R2",
	"R3"
];
function ReplicationTab() {
	const [mode, setMode] = (0, import_react.useState)("active");
	const [flash, setFlash] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [txn, setTxn] = (0, import_react.useState)(1);
	const [leaderId, setLeaderId] = (0, import_react.useState)("R1");
	const [isElecting, setIsElecting] = (0, import_react.useState)(false);
	const timeoutsRef = (0, import_react.useRef)([]);
	const scheduleTimeout = (fn, delay) => {
		const id = setTimeout(() => {
			fn();
			timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
		}, delay);
		timeoutsRef.current.push(id);
		return id;
	};
	(0, import_react.useEffect)(() => {
		return () => {
			timeoutsRef.current.forEach(clearTimeout);
		};
	}, []);
	const execute = () => {
		if (isElecting) {
			log("🚫 Transaction blocked: No leader elected yet. Leader election in progress...", "warn");
			return;
		}
		const id = txn;
		setTxn((t) => t + 1);
		if (mode === "active") {
			setFlash(new Set([
				"R1",
				"R2",
				"R3"
			]));
			log(`🔄 Active Replication · Txn #${id}: R1, R2, R3 execute transfer $100 (X→Y) in sync`, "repl");
		} else {
			setFlash(new Set([leaderId]));
			log(`📜 Passive · Txn #${id}: Leader ${leaderId} commits transfer $100 (X→Y), shipping WAL…`, "repl");
			const followers = nodes.filter((n) => n !== leaderId);
			scheduleTimeout(() => {
				setFlash(new Set([leaderId, ...followers]));
				log(`✅ Passive · Txn #${id}: Followers ${followers.join(", ")} applied WAL`, "ok");
			}, 600);
		}
		scheduleTimeout(() => setFlash(/* @__PURE__ */ new Set()), 1400);
	};
	const killLeader = () => {
		if (isElecting) return;
		const currentLeader = leaderId;
		log(`⚠️ Leader ${currentLeader} failed. Starting election...`, "warn");
		setIsElecting(true);
		const followers = nodes.filter((n) => n !== currentLeader);
		const newLeader = followers[Math.floor(Math.random() * followers.length)];
		scheduleTimeout(() => {
			setLeaderId(newLeader);
			setIsElecting(false);
			log(`👑 Node ${newLeader} elected as the new Leader!`, "ok");
		}, 1200);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-3 rounded-lg border border-border bg-card p-1",
						children: ["active", "passive"].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setMode(m);
								log(`⚙️  Replication mode → ${m.toUpperCase()}`, "info");
							},
							className: `px-4 py-1.5 text-sm rounded-md transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
							children: m === "active" ? "Active" : "Passive"
						}, m))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-sm text-muted-foreground",
						children: ["Operation: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-foreground",
							children: "TRANSFER $100 FROM X TO Y"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: execute,
						disabled: isElecting,
						className: "ml-auto px-4 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
						children: isElecting ? "Electing Leader..." : "Execute Transaction"
					})
				]
			}),
			mode === "active" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-3 gap-4",
				children: nodes.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `rounded-xl border border-border bg-card p-6 text-center ${flash.has(id) ? "replica-flash" : ""}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase tracking-wider text-muted-foreground",
							children: "Replica"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 text-2xl font-bold font-mono",
							children: id
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 text-xs text-muted-foreground",
							children: "balance(Y) sync"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 font-mono text-success",
							children: "+$100"
						})
					]
				}, id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch",
				children: nodes.map((id) => {
					const isLeader = id === leaderId;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `relative rounded-xl border-2 bg-card p-6 text-center transition-all ${isLeader ? "border-primary glow-primary" : "border-border"} ${flash.has(id) ? "replica-flash" : ""} ${isElecting ? "animate-pulse animate-duration-1000" : ""}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `text-xs uppercase tracking-wider ${isLeader ? "text-primary font-bold text-left" : "text-muted-foreground"}`,
									children: isLeader ? "👑 Leader" : "Follower"
								}), isLeader && !isElecting && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: killLeader,
									className: "px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive/20 transition-colors font-semibold",
									children: "Kill Leader"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 text-2xl font-bold font-mono",
								children: id
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 text-xs text-muted-foreground",
								children: isLeader ? "commits & ships WAL →" : "applies WAL"
							})
						]
					}, id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground",
				children: mode === "active" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					"⚡ ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "text-foreground",
						children: "Active replication"
					}),
					": every replica executes the request independently. Higher cost, instant failover."
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					"📜 ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "text-foreground",
						children: "Passive replication"
					}),
					": a single leader executes, then ships its Write-Ahead-Log to followers. Cheaper, slight failover lag.",
					isElecting && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block mt-1 text-warning font-semibold",
						children: "⚠️ Raft Leader Election in progress..."
					})
				] })
			})
		]
	});
}
function hashToRing(key) {
	const str = String(key);
	let h1 = 3735928559;
	let h2 = 1103547991;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2246822507);
		h2 = Math.imul(h2 ^ ch, 3266489909);
	}
	h1 ^= h2 >>> 16;
	h2 ^= h1 >>> 16;
	return (h1 >>> 0) / 4294967295;
}
var SHARD_RANGES = [
	{
		min: 1,
		max: 10,
		shard: 0
	},
	{
		min: 11,
		max: 20,
		shard: 1
	},
	{
		min: 21,
		max: Infinity,
		shard: 2
	}
];
function getRangeShard(id) {
	for (const range of SHARD_RANGES) if (id >= range.min && id <= range.max) return range.shard;
	return 0;
}
function getRangeInfo(shardId) {
	const range = SHARD_RANGES.find((r) => r.shard === shardId);
	if (!range) return "N/A";
	const maxStr = range.max === Infinity ? "∞" : range.max.toString();
	return `${range.min}–${maxStr}`;
}
var ConsistentHashRing = class {
	ring = [];
	shardCount;
	virtualNodes;
	constructor(shardCount, virtualNodes = 50) {
		this.shardCount = shardCount;
		this.virtualNodes = virtualNodes;
		this.rebuildRing();
	}
	rebuildRing() {
		this.ring = [];
		for (let s = 0; s < this.shardCount; s++) for (let v = 0; v < this.virtualNodes; v++) {
			const salt = v * 1e3 + s * 500;
			const nodeHash = hashToRing(`shard-${s}-vnode-${v}-salt-${salt}`);
			this.ring.push({
				hash: nodeHash,
				shardId: s
			});
		}
		this.ring.sort((a, b) => a.hash - b.hash);
	}
	getShard(key) {
		if (this.ring.length === 0) return 0;
		const keyHash = hashToRing(key);
		let low = 0;
		let high = this.ring.length - 1;
		let foundIndex = 0;
		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			if (this.ring[mid].hash >= keyHash) {
				foundIndex = mid;
				high = mid - 1;
			} else low = mid + 1;
		}
		if (keyHash > this.ring[this.ring.length - 1].hash) {
			for (const node of this.ring) if (node.hash >= keyHash) return node.shardId;
			return this.ring[0].shardId;
		}
		return this.ring[foundIndex].shardId;
	}
	updateShardCount(newCount) {
		if (newCount !== this.shardCount) {
			this.shardCount = newCount;
			this.rebuildRing();
		}
	}
	getStats() {
		const stats = [];
		for (let i = 0; i < this.shardCount; i++) stats.push({
			shardId: i,
			count: 0,
			hashes: []
		});
		for (const node of this.ring) {
			stats[node.shardId].count++;
			stats[node.shardId].hashes.push(node.hash);
		}
		return stats;
	}
};
var SHARDS = 3;
function ShardingTab() {
	const [users, setUsers] = (0, import_react.useState)(Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })));
	const [strategy, setStrategy] = (0, import_react.useState)("range");
	const [highlight, setHighlight] = (0, import_react.useState)(null);
	const [hashRing, setHashRing] = (0, import_react.useState)(() => new ConsistentHashRing(SHARDS, 50));
	(0, import_react.useEffect)(() => {
		if (strategy === "hash") {
			setHashRing(new ConsistentHashRing(SHARDS, 50));
			log("🔄 Consistent Hash Ring rebuilt with 50 virtual nodes per shard", "info");
		}
	}, [strategy]);
	const shardOf = (0, import_react.useMemo)(() => {
		return (id, strat) => {
			if (strat === "range") return getRangeShard(id);
			return hashRing.getShard(id);
		};
	}, [hashRing]);
	const timeoutsRef = (0, import_react.useRef)([]);
	const scheduleTimeout = (fn, delay) => {
		const id = setTimeout(() => {
			fn();
			timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
		}, delay);
		timeoutsRef.current.push(id);
		return id;
	};
	(0, import_react.useEffect)(() => {
		return () => {
			timeoutsRef.current.forEach(clearTimeout);
		};
	}, []);
	const shards = (0, import_react.useMemo)(() => {
		const buckets = Array.from({ length: SHARDS }, () => []);
		users.forEach((u) => {
			buckets[shardOf(u.id, strategy)].push(u);
		});
		return buckets;
	}, [
		users,
		strategy,
		shardOf
	]);
	const addUser = () => {
		const nextId = (users[users.length - 1]?.id ?? 0) + 1;
		setUsers([...users, { id: nextId }]);
		const target = shardOf(nextId, strategy);
		setHighlight(nextId);
		scheduleTimeout(() => setHighlight(null), 1500);
		const strategyName = strategy === "range" ? "Range" : "Hash";
		const shardLabel = target + 1;
		log(`➕ user #${nextId} → Shard ${shardLabel} (${strategyName})`, "shard");
		if (strategy === "hash") {
			const newCounts = [...shards.map((s) => s.length)];
			newCounts[target]++;
			log(`🔑 Shard assignment for user-${nextId} -> Shard ${shardLabel} (Hash: ${hashToRing("user-" + nextId).toFixed(4)})`, "shard");
			log(`📊 Distribution: [${newCounts.join(", ")}] (${users.length + 1} users total)`, "info");
		} else log(`📐 Range for Shard ${shardLabel}: ${getRangeInfo(target)}`, "info");
	};
	const changeStrategy = (s) => {
		setStrategy(s);
		log(`🔀 Switched to ${s === "range" ? "Range-Based" : "Hash-Based (Consistent Hashing)"} strategy`, "warn");
		if (s === "hash") {
			const stats = hashRing.getStats();
			log(`🔄 Hash Ring has ${stats.reduce((acc, s) => acc + s.count, 0)} nodes (${stats.map((s) => `${s.count} for Shard ${s.shardId + 1}`).join(", ")})`, "info");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm text-muted-foreground",
						children: "Strategy:"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: strategy,
						onChange: (e) => changeStrategy(e.target.value),
						className: "bg-input border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "range",
							children: "Range-Based (Static Ranges)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "hash",
							children: "Hash-Based (Consistent Hashing)"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs text-muted-foreground",
						children: [
							users.length,
							" users · ",
							SHARDS,
							" shards"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: addUser,
						className: "ml-auto px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 glow-primary",
						children: "+ Add User"
					})
				]
			}),
			strategy === "range" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-4 p-3 bg-secondary/30 rounded-lg border border-border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium text-muted-foreground",
					children: "📐 Static Ranges:"
				}), [
					0,
					1,
					2
				].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-xs font-mono bg-card px-3 py-1 rounded-full border border-border",
					children: [
						"Shard ",
						i + 1,
						": ",
						getRangeInfo(i)
					]
				}, i))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-3 gap-4",
				children: shards.map((bucket, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-card p-4 min-h-[220px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between mb-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "font-semibold",
							children: ["Shard ", i + 1]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs font-mono text-muted-foreground",
							children: [bucket.length, " keys"]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [bucket.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${highlight === u.id ? "bg-accent text-accent-foreground border-accent glow-accent" : "bg-secondary/60 border-border"}`,
							children: ["user-", u.id]
						}, u.id)), bucket.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground italic",
							children: "empty shard"
						})]
					})]
				}, `shard-bucket-${i}`))
			})
		]
	});
}
var kindStyles = {
	info: "text-muted-foreground",
	lb: "text-[oklch(0.78_0.17_230)]",
	repl: "text-[oklch(0.78_0.17_290)]",
	shard: "text-[oklch(0.82_0.17_150)]",
	warn: "text-[oklch(0.82_0.17_80)]",
	ok: "text-[oklch(0.78_0.17_150)]"
};
function LiveLogs() {
	const [logs, setLogs] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		const unsub = subscribe(setLogs);
		return () => {
			unsub();
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-border bg-card/60 backdrop-blur-xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between px-4 py-2 border-b border-border",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2 w-2 rounded-full bg-success heartbeat" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold tracking-wide uppercase",
						children: "Live Activity Log"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs text-muted-foreground",
						children: [
							"(",
							logs.length,
							")"
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => clearLogs(),
				className: "text-xs px-3 py-1 rounded-md bg-secondary hover:bg-muted transition-colors",
				children: "Clear"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "h-48 overflow-y-auto font-mono text-xs px-4 py-2 space-y-1",
			children: [logs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-muted-foreground italic",
				children: "Waiting for events…"
			}), logs.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "log-enter flex gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground shrink-0",
					children: l.ts
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: kindStyles[l.kind],
					children: l.message
				})]
			}, l.id))]
		})]
	});
}
function Heartbeat() {
	const servers = useClusterSimulation();
	const [isAlive, setIsAlive] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const interval = setInterval(() => {
			setIsAlive(Math.random() < .9);
		}, 5e3);
		return () => {
			clearInterval(interval);
		};
	}, []);
	const active = servers.filter((s) => s.healthy).length;
	const ok = active === servers.length && isAlive;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2.5 w-2.5 rounded-full heartbeat ${ok ? "bg-success" : "bg-destructive"}` }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-xs font-medium",
				children: ["Cluster ", ok ? "Healthy" : "Degraded"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-xs text-muted-foreground",
				children: [
					"· ",
					active,
					"/",
					servers.length,
					" nodes"
				]
			})
		]
	});
}
var tabs = [
	{
		id: "lb",
		label: "Load Balancer",
		icon: "⚖️"
	},
	{
		id: "repl",
		label: "Replication",
		icon: "🔁"
	},
	{
		id: "shard",
		label: "Sharding",
		icon: "🗂️"
	}
];
function DashboardLayout() {
	const [tab, setTab] = (0, import_react.useState)("lb");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "border-b border-border bg-card/40 backdrop-blur-xl sticky top-0 z-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-7xl mx-auto px-6 py-3 flex items-center gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center font-bold",
							children: "◈"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-sm font-bold tracking-tight",
							children: "Distributed Systems Playground"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[10px] text-muted-foreground uppercase tracking-wider",
							children: "infra · observability · sim"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ml-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heartbeat, {})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-7xl mx-auto px-6 flex gap-1",
					children: tabs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setTab(t.id),
						className: `relative px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mr-1.5",
								children: t.icon
							}),
							t.label,
							tab === t.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-primary to-accent" })
						]
					}, t.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "flex-1 max-w-7xl w-full mx-auto px-6 py-8",
				children: [
					tab === "lb" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadBalancerTab, {}),
					tab === "repl" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReplicationTab, {}),
					tab === "shard" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShardingTab, {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sticky bottom-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveLogs, {})
			})
		]
	});
}
function Index() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardLayout, {});
}
//#endregion
export { Index as component };

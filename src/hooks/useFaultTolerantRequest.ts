import { useState, useCallback, useRef, useEffect } from "react";
import { log } from "@/utils/logger";

export type CircuitState = "CLOSED" | "OPEN" | "HALF-OPEN";

interface RequestOptions<T> {
  retries?: number;
  failureRate?: number; 
  fallbackData: T;
}

export function useFaultTolerantRequest<T>() {
  const [circuitState, setCircuitState] = useState<CircuitState>("CLOSED");
  const [failures, setFailures] = useState(0);
  const [isViewingFallback, setIsViewingFallback] = useState(false);
  
  const stateRef = useRef<CircuitState>("CLOSED");
  const failuresRef = useRef(0);
  const halfOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transitionTo = useCallback((nextState: CircuitState) => {
    stateRef.current = nextState;
    setCircuitState(nextState);
    log(`🔌 Circuit Breaker transitioned to ${nextState}`, nextState === "OPEN" ? "warn" : "info");
    
    if (nextState === "OPEN") {
      if (halfOpenTimer.current) clearTimeout(halfOpenTimer.current);
      // Automatically attempt recovery (Half-Open) after 10 seconds
      halfOpenTimer.current = setTimeout(() => {
        transitionTo("HALF-OPEN");
      }, 10000);
    }
  }, []);

  const executeRequest = useCallback(async (
    requestFn: () => Promise<T>,
    options: RequestOptions<T>
  ): Promise<T> => {
    const { retries = 3, fallbackData, failureRate = 0 } = options;

    // 1. Fail-Fast if the Circuit is OPEN
    if (stateRef.current === "OPEN") {
      log(`🚫 Circuit is OPEN. Request blocked (Fail-Fast). Serving fallback data.`, "warn");
      setIsViewingFallback(true);
      return fallbackData;
    }

    let attempt = 0;
    while (attempt <= retries) {
      try {
        // Simulate network failure rate
        if (failureRate > 0 && Math.random() < failureRate) {
          throw new Error("Simulated Server Connection Timeout (504)");
        }

        const result = await requestFn();
        
        // Success Recovery Path
        failuresRef.current = 0;
        setFailures(0);
        setIsViewingFallback(false);

        if (stateRef.current === "HALF-OPEN") {
          transitionTo("CLOSED");
        }
        return result;

      } catch (err: any) {
        attempt++;
        // Exponential backoff: Math.pow(2, attempt) * 1000
        const backoffDelay = Math.pow(2, attempt) * 1000;
        log(`❌ Attempt ${attempt} failed: ${err.message}`, "warn");

        if (attempt <= retries) {
          log(`⏳ Retrying in ${backoffDelay}ms (Exponential Backoff)...`, "info");
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          // Exhausted all retries
          failuresRef.current += 1;
          setFailures(failuresRef.current);
          log(`🚨 Request failed after ${retries + 1} attempts.`, "warn");

          if (failuresRef.current >= 3 && stateRef.current !== "OPEN") {
            transitionTo("OPEN");
          } else if (stateRef.current === "HALF-OPEN") {
            // A single failure in HALF-OPEN state trips the circuit immediately
            transitionTo("OPEN");
          }

          setIsViewingFallback(true);
          return fallbackData;
        }
      }
    }
    
    setIsViewingFallback(true);
    return fallbackData;
  }, [transitionTo]);

  // Cleanup timers on hook unmount
  useEffect(() => {
    return () => {
      if (halfOpenTimer.current) clearTimeout(halfOpenTimer.current);
    };
  }, []);

  return {
    circuitState,
    failures,
    isViewingFallback,
    executeRequest,
  };
}

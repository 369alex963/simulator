"use client";

import { useEffect, useRef, useState } from "react";

type SSEPayload = {
  paused: boolean;
  announcements: Array<{ id: number; title: string; message: string; severity: string }>;
};

export function useExamSSE(enabled = true) {
  const [state, setState] = useState<SSEPayload>({ paused: false, announcements: [] });
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const reconnectDelayRef = useRef(5000);
  const MAX_DELAY = 60000;

  useEffect(() => {
    mountedRef.current = true;
    reconnectDelayRef.current = 5000;
    if (!enabled) return;

    const connect = () => {
      if (!mountedRef.current) return;

      const es = new EventSource("/api/notifications/sse/", { withCredentials: true });
      esRef.current = es;

      es.onopen = () => {
        reconnectDelayRef.current = 5000; // reset on successful connection
      };

      es.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as SSEPayload;
          setState(data);
        } catch { /* ignore malformed */ }
      };

      es.onerror = () => {
        es.close();
        if (mountedRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_DELAY);
            connect();
          }, reconnectDelayRef.current);
        }
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [enabled]);

  return state;
}

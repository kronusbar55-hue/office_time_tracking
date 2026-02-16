"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

interface BreakItem {
  startTime: string;
  endTime: string | null;
}

interface SessionData {
  id: string;
  clockIn: string;
  breaks: BreakItem[];
}

interface TimeTrackingState {
  active: boolean;
  sessionData: SessionData | null;
  ongoingBreak: boolean;
  workedMs: number;
  breakMs: number;
  /** Current active break duration (when on break) */
  currentBreakMs: number;
  overtimeMs: number;
  /** Remaining time until shift target (countdown) */
  remainingMs: number;
  busy: boolean;
  error: string | null;
  shiftHoursTarget: number;
  /** Increments on clock actions — use for charts/stats refresh */
  refreshKey: number;
  refresh: () => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
}

const TimeTrackingContext = createContext<TimeTrackingState | undefined>(undefined);

export function useTimeTracking() {
  const ctx = useContext(TimeTrackingContext);
  if (!ctx) throw new Error("useTimeTracking must be used within TimeTrackingProvider");
  return ctx;
}

export function TimeTrackingProvider({ children, shiftHoursTarget = 8 }: { children: React.ReactNode; shiftHoursTarget?: number }) {
  const [active, setActive] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [ongoingBreak, setOngoingBreak] = useState(false);
  const [workedMs, setWorkedMs] = useState(0);
  const [breakMs, setBreakMs] = useState(0);
  const [currentBreakMs, setCurrentBreakMs] = useState(0);
  const [overtimeMs, setOvertimeMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<SessionData | null>(null);

  async function refreshActive() {
    try {
      const res = await fetch("/api/time-entries/active");
      if (!res.ok) {
        setActive(false);
        setSessionData(null);
        setOngoingBreak(false);
        return;
      }
      const data = await res.json();
      const activeData = data?.active;
      setActive(!!activeData);
      if (activeData && typeof activeData === "object") {
        const breaks = (activeData.breaks || []).map((b: { breakStart?: string; breakEnd?: string | null }) => ({
          startTime: b.breakStart || "",
          endTime: b.breakEnd ?? null
        }));
        setSessionData({
          id: activeData.id || "",
          clockIn: activeData.clockIn || "",
          breaks
        });
        const hasOngoing = breaks.some((b: { startTime: string; endTime: string | null }) => b.endTime === null);
        setOngoingBreak(!!hasOngoing);
      } else {
        setSessionData(null);
        setOngoingBreak(false);
      }
    } catch (e) {
      setActive(false);
      setSessionData(null);
      setOngoingBreak(false);
    }
  }

  // keep a ref to sessionData so interval callback reads latest
  useEffect(() => {
    sessionRef.current = sessionData;
  }, [sessionData]);

  useEffect(() => {
    void refreshActive();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const s = sessionRef.current;
      if (!s) {
        setWorkedMs(0);
        setBreakMs(0);
        setCurrentBreakMs(0);
        setOvertimeMs(0);
        setRemainingMs(0);
        return;
      }

      const clockInMs = new Date(s.clockIn).getTime();
      let totalBreakMs = 0;
      let activeBreakMs = 0;
      s.breaks?.forEach((brk) => {
        const startMs = new Date(brk.startTime).getTime();
        const endMs = brk.endTime ? new Date(brk.endTime).getTime() : now;
        const duration = Math.max(0, endMs - startMs);
        totalBreakMs += duration;
        if (!brk.endTime) activeBreakMs = duration;
      });

      const worked = Math.max(0, now - clockInMs - totalBreakMs);
      setWorkedMs(worked);
      setBreakMs(totalBreakMs);
      setCurrentBreakMs(activeBreakMs);

      const overtime = Math.max(0, worked - shiftHoursTarget * 3600000);
      setOvertimeMs(overtime);
      const remaining = Math.max(0, shiftHoursTarget * 3600000 - worked);
      setRemainingMs(remaining);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shiftHoursTarget]);

  async function postAndRefresh(url: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || `${url} failed`;
        throw new Error(msg);
      }

      // If backend returned immediate data, update session locally for instant UI
      if (json?.success && json?.data) {
        const d = json.data;
        if (url.endsWith("/clock-in")) {
          setSessionData({ id: d.id, clockIn: new Date(d.clockIn).toISOString(), breaks: [] });
          setActive(true);
          setOngoingBreak(false);
        } else if (url.endsWith("/break-start")) {
          setOngoingBreak(true);
          setSessionData((prev) => {
            const brk = { startTime: new Date(d.breakStart).toISOString(), endTime: null };
            if (!prev) return prev;
            return { ...prev, breaks: [...(prev.breaks || []), brk] };
          });
        } else if (url.endsWith("/break-end")) {
          setOngoingBreak(false);
          setSessionData((prev) => {
            if (!prev) return prev;
            const breaks = (prev.breaks || []).map((b) => ({ ...b }));
            for (let i = breaks.length - 1; i >= 0; i--) {
              if (breaks[i].endTime === null && d.breakEnd) {
                breaks[i].endTime = new Date(d.breakEnd).toISOString();
                break;
              }
            }
            return { ...prev, breaks };
          });
        }
      }

      // refresh authoritative state from backend
      await refreshActive();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function clockIn() {
    await postAndRefresh("/api/time-entries/clock-in");
  }

  async function clockOut() {
    await postAndRefresh("/api/time-entries/clock-out");
  }

  async function startBreak() {
    await postAndRefresh("/api/time-entries/break-start");
  }

  async function endBreak() {
    await postAndRefresh("/api/time-entries/break-end");
  }

  const value: TimeTrackingState = {
    active,
    sessionData,
    ongoingBreak,
    workedMs,
    breakMs,
    currentBreakMs,
    overtimeMs,
    remainingMs,
    busy,
    error,
    shiftHoursTarget,
    refreshKey,
    refresh: refreshActive,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
  };

  return <TimeTrackingContext.Provider value={value}>{children}</TimeTrackingContext.Provider>;
}

export default TimeTrackingProvider;

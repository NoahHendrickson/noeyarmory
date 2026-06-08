"use client";

import { cn, frostedSurface } from "@repo/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CURSOR_HIDE_CLASS = "cursor-copied-feedback";

type CopiedFeedback = {
  fading: boolean;
};

export function useCursorCopiedFeedback(durationMs = 1200) {
  const [feedback, setFeedback] = useState<CopiedFeedback | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [sessionKey, setSessionKey] = useState(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    if (!feedback) return;

    document.documentElement.classList.add(CURSOR_HIDE_CLASS);

    const onMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const fadeAt = Math.max(durationMs - 250, 0);
    timersRef.current.push(
      window.setTimeout(() => {
        setFeedback((current) => (current ? { ...current, fading: true } : null));
      }, fadeAt),
      window.setTimeout(() => setFeedback(null), durationMs),
    );

    return () => {
      window.removeEventListener("mousemove", onMove);
      clearTimers();
      document.documentElement.classList.remove(CURSOR_HIDE_CLASS);
    };
  }, [clearTimers, durationMs, sessionKey]);

  useEffect(() => {
    if (feedback) return;
    document.documentElement.classList.remove(CURSOR_HIDE_CLASS);
  }, [feedback]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const showCopiedAtCursor = useCallback(
    (event: { clientX: number; clientY: number }) => {
      clearTimers();
      setPosition({ x: event.clientX, y: event.clientY });
      setFeedback({ fading: false });
      setSessionKey((key) => key + 1);
    },
    [clearTimers],
  );

  const pill =
    feedback && typeof document !== "undefined"
      ? createPortal(
          <span
            role="status"
            aria-live="polite"
            className={cn(
              frostedSurface("pill"),
              "pointer-events-none fixed z-[9999] rounded-pill px-2.5 py-1 text-xs font-medium transition-opacity duration-200",
              feedback.fading ? "opacity-0" : "opacity-100",
            )}
            style={{
              left: position.x,
              top: position.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            Copied
          </span>,
          document.body,
        )
      : null;

  return { showCopiedAtCursor, pill };
}

"use client";

import { useEffect, useRef } from "react";

/** Native SVG viewBox — display size is scaled down for the background. */
const LOGO_WIDTH = 90;
const LOGO_HEIGHT = Math.round((90 * 252) / 264);
const SPEED = 0.9;

export function MoonfangScreensaver() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      el.style.transform = `translate(${Math.max(0, window.innerWidth - LOGO_WIDTH - 24)}px, 24px)`;
      return;
    }

    let x = Math.random() * Math.max(0, window.innerWidth - LOGO_WIDTH);
    let y = Math.random() * Math.max(0, window.innerHeight - LOGO_HEIGHT);
    let vx = SPEED * (Math.random() > 0.5 ? 1 : -1);
    let vy = SPEED * (Math.random() > 0.5 ? 1 : -1);
    let raf = 0;

    const clampPosition = () => {
      const maxX = Math.max(0, window.innerWidth - LOGO_WIDTH);
      const maxY = Math.max(0, window.innerHeight - LOGO_HEIGHT);
      x = Math.min(Math.max(0, x), maxX);
      y = Math.min(Math.max(0, y), maxY);
    };

    const tick = () => {
      x += vx;
      y += vy;

      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
      } else if (x + LOGO_WIDTH >= window.innerWidth) {
        x = window.innerWidth - LOGO_WIDTH;
        vx = -Math.abs(vx);
      }

      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
      } else if (y + LOGO_HEIGHT >= window.innerHeight) {
        y = window.innerHeight - LOGO_HEIGHT;
        vy = -Math.abs(vy);
      }

      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => clampPosition();
    const onMotionChange = () => {
      if (reducedMotion.matches) {
        cancelAnimationFrame(raf);
        el.style.transform = `translate3d(${Math.max(0, window.innerWidth - LOGO_WIDTH - 24)}px, 24px, 0)`;
      }
    };

    clampPosition();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed top-0 left-0 z-[1] will-change-transform"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/moonfang.svg"
        alt=""
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className="block"
        draggable={false}
      />
    </div>
  );
}

"use client";

import { useLayoutEffect, useRef } from "react";

/** Native SVG viewBox — display size is scaled down for the background. */
const LOGO_WIDTH = 72;
const LOGO_HEIGHT = Math.round((72 * 252) / 264);
/** Pixels per second — time-based so speed is consistent across refresh rates. */
const SPEED_PX_PER_SEC = 110;
const REDUCED_MOTION_FACTOR = 0.75;

function motionSpeedPxPerSec(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? SPEED_PX_PER_SEC * REDUCED_MOTION_FACTOR
    : SPEED_PX_PER_SEC;
}

function viewportBounds() {
  const vv = window.visualViewport;
  if (vv) {
    return {
      width: vv.width,
      height: vv.height,
      offsetX: vv.offsetLeft,
      offsetY: vv.offsetTop,
    };
  }

  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    offsetX: 0,
    offsetY: 0,
  };
}

export function MoonfangScreensaver() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let x = 0;
    let y = 0;
    let dirX = 1;
    let dirY = 1;
    let raf = 0;
    let running = true;
    let lastTime = performance.now();

    const applyTransform = () => {
      const { offsetX, offsetY } = viewportBounds();
      el.style.setProperty("--moonfang-x", `${offsetX + x}px`);
      el.style.setProperty("--moonfang-y", `${offsetY + y}px`);
    };

    const resetPosition = () => {
      const { width, height } = viewportBounds();
      const maxX = Math.max(0, width - LOGO_WIDTH);
      const maxY = Math.max(0, height - LOGO_HEIGHT);
      x = Math.random() * maxX;
      y = Math.random() * maxY;
      dirX = Math.random() > 0.5 ? 1 : -1;
      dirY = Math.random() > 0.5 ? 1 : -1;
      lastTime = performance.now();
      applyTransform();
    };

    const tick = (now: number) => {
      if (!running) return;

      if (!document.hidden) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const speed = motionSpeedPxPerSec();
        const { width, height } = viewportBounds();
        const maxX = Math.max(0, width - LOGO_WIDTH);
        const maxY = Math.max(0, height - LOGO_HEIGHT);

        x += dirX * speed * dt;
        y += dirY * speed * dt;

        if (x <= 0) {
          x = 0;
          dirX = 1;
        } else if (x >= maxX) {
          x = maxX;
          dirX = -1;
        }

        if (y <= 0) {
          y = 0;
          dirY = 1;
        } else if (y >= maxY) {
          y = maxY;
          dirY = -1;
        }

        applyTransform();
      } else {
        lastTime = now;
      }

      raf = requestAnimationFrame(tick);
    };

    const onViewportChange = () => {
      const { width, height } = viewportBounds();
      x = Math.min(x, Math.max(0, width - LOGO_WIDTH));
      y = Math.min(y, Math.max(0, height - LOGO_HEIGHT));
      applyTransform();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      if (raf === 0) {
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    resetPosition();
    if (!document.hidden) {
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("visibilitychange", onVisibilityChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="moonfang-screensaver pointer-events-none fixed top-0 left-0 z-[1]"
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

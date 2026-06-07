"use client";

import { useEffect } from "react";

const CAPTURE_SCRIPT = "https://mcp.figma.com/mcp/html-to-design/capture.js";

function hashHasFigmaCapture() {
  return /figmacapture=/i.test(window.location.hash);
}

function injectCaptureScript() {
  if (document.querySelector(`script[src="${CAPTURE_SCRIPT}"]`)) return;
  const el = document.createElement("script");
  el.src = CAPTURE_SCRIPT;
  el.async = true;
  document.head.appendChild(el);
}

/**
 * Ensures Figma's html-to-design capture script loads on /design/* when the URL
 * hash includes figmacapture=… — required for the floating toolbar (Send to
 * Figma, Entire screen, Select element).
 */
export function FigmaCaptureHelper() {
  useEffect(() => {
    const boot = () => {
      if (hashHasFigmaCapture()) {
        injectCaptureScript();
      }
    };

    boot();
    window.addEventListener("hashchange", boot);
    return () => window.removeEventListener("hashchange", boot);
  }, []);

  return null;
}

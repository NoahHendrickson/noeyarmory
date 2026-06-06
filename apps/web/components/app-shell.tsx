"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ShaderBackground = dynamic(
  () => import("./shader-background").then((m) => m.ShaderBackground),
  { ssr: false },
);

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ShaderBackground />
      <div className="relative z-10">{children}</div>
    </>
  );
}

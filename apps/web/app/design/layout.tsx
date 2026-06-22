import type { ReactNode } from "react";

import { FigmaCaptureHelper } from "../../components/figma-capture-helper";

/** Design-capture routes — no app chrome (shader, etc.). */
export default function DesignLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <FigmaCaptureHelper />
      {children}
    </>
  );
}

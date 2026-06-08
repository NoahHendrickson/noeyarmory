const BACKGROUND_URL = "/background.jpg";

export function AppBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-50 [contain:strict] isolate"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- full-viewport decorative background */}
      <img src={BACKGROUND_URL} alt="" className="size-full object-cover" />
    </div>
  );
}

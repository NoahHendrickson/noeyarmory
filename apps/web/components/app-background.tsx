const BACKGROUND_URL = "/background.jpg";

export function AppBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden [contain:strict] isolate"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- full-viewport decorative background */}
      <img
        src={BACKGROUND_URL}
        alt=""
        className="size-full scale-105 object-cover opacity-45 blur-[3px] brightness-75 saturate-75"
      />
      <div className="absolute inset-0 bg-background/35" />
    </div>
  );
}

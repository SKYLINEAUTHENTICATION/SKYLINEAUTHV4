import { useMemo } from "react";

/**
 * SnowDrift — global drifting micro-particles rendered as a fixed overlay.
 * - Mounted once at app root, visible on every page
 * - Pointer-events disabled so it never blocks UI interaction
 * - Each particle has unique size, speed, drift path, and delay
 * - Purple-tinted to match brand, varied opacity for depth
 */
export function SnowDrift({ count = 55 }: { count?: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const r1 = Math.sin(i * 12.9898) * 43758.5453;
      const r2 = Math.sin(i * 78.233)  * 43758.5453;
      const r3 = Math.sin(i * 39.346)  * 43758.5453;
      const r4 = Math.sin(i * 91.534)  * 43758.5453;
      const r5 = Math.sin(i * 27.182)  * 43758.5453;
      const rand = (r: number) => r - Math.floor(r);

      const size  = rand(r1) * 3 + 1;            // 1–4 px
      const left  = rand(r2) * 100;              // 0–100 vw
      const dur   = rand(r3) * 18 + 14;          // 14–32 s fall
      const delay = rand(r4) * -30;              // negative so it starts mid-fall
      const sway  = rand(r5) * 60 + 20;          // 20–80 px horizontal sway
      const opac  = rand(r1 * 1.7) * 0.45 + 0.20;// 0.20–0.65 opacity
      const tint  = rand(r2 * 1.3);              // determines color tint
      const blur  = size > 2.5 ? 1.5 : 0;

      // Mostly purple with occasional pink/white sparkles
      const color =
        tint > 0.85 ? `rgba(255,255,255,${opac})` :
        tint > 0.65 ? `rgba(220,160,255,${opac})` :
        tint > 0.40 ? `rgba(180,100,255,${opac})` :
                      `rgba(140,60,240,${opac})`;

      return { id: i, size, left, dur, delay, sway, color, blur };
    });
  }, [count]);

  return (
    <>
      <style>{`
        @keyframes snow-drift-fall {
          0%   { transform: translate3d(0, -10vh, 0); opacity: 0; }
          8%   { opacity: var(--snow-opacity, 0.8); }
          92%  { opacity: var(--snow-opacity, 0.8); }
          100% { transform: translate3d(var(--snow-sway, 30px), 110vh, 0); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .snow-drift-particle { animation: none !important; opacity: 0 !important; }
        }
      `}</style>

      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9999,
          overflow: "hidden",
        }}
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className="snow-drift-particle"
            style={{
              position: "absolute",
              top: 0,
              left: `${p.left}vw`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              filter: p.blur ? `blur(${p.blur}px)` : "none",
              animation: `snow-drift-fall ${p.dur}s linear ${p.delay}s infinite`,
              willChange: "transform, opacity",
              ["--snow-sway" as string]: `${p.sway - 40}px`,
              ["--snow-opacity" as string]: 1,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}

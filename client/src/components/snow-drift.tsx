import { useMemo } from "react";

/**
 * SnowDrift — global white particles drifting randomly in all directions.
 * - White color, slight opacity variation for depth
 * - Each particle has a unique multi-waypoint keyframe path
 * - Motion is slow then suddenly fast (jittery, organic)
 * - Pointer-events disabled so it never blocks UI interaction
 */
export function SnowDrift({ count = 55 }: { count?: number }) {
  const { particles, keyframesCSS } = useMemo(() => {
    const rand = (i: number, seed: number) => {
      const r = Math.sin(i * seed) * 43758.5453;
      return r - Math.floor(r);
    };

    const particles = Array.from({ length: count }, (_, i) => {
      // 40% bigger than before: 1.4 – 5.6 px
      const size  = rand(i, 12.9898) * 4.2 + 1.4;
      const startX = rand(i, 78.233)  * 100;          // 0–100 vw
      const startY = rand(i, 39.346)  * 100;          // 0–100 vh
      const dur   = rand(i, 91.534)   * 28 + 16;      // 16–44 s full cycle
      const delay = rand(i, 27.182)   * -40;          // negative so it pre-distributes
      const opac  = rand(i, 11.732)   * 0.55 + 0.35;  // 0.35–0.90 white
      const blur  = size > 3.8 ? 0.6 : 0;

      // Build 6 random waypoints scattered across the viewport
      const points = Array.from({ length: 6 }, (_, k) => ({
        x: rand(i + k * 0.37, 53.7  + k) * 100,
        y: rand(i + k * 0.59, 91.13 + k) * 100,
      }));

      return { id: i, size, startX, startY, dur, delay, opac, blur, points };
    });

    /* Build a unique keyframe per particle with sharp velocity changes:
       - Each waypoint sits at a non-uniform percentage so motion is slow then suddenly fast.
       - Easing handled by setting close-together waypoints (= fast burst) and
         spread-out waypoints (= slow drift).
    */
    const stops = [0, 12, 18, 35, 42, 70, 78, 100]; // non-uniform = slow/fast bursts

    const keyframesCSS = particles.map((p) => {
      const frames = stops.map((stop, idx) => {
        if (idx === 0) {
          return `${stop}% { transform: translate3d(${p.startX}vw, ${p.startY}vh, 0); opacity: 0; }`;
        }
        if (idx === 1) {
          return `${stop}% { transform: translate3d(${p.points[0].x}vw, ${p.points[0].y}vh, 0); opacity: ${p.opac}; }`;
        }
        if (idx === stops.length - 1) {
          return `${stop}% { transform: translate3d(${p.startX}vw, ${p.startY}vh, 0); opacity: 0; }`;
        }
        const wp = p.points[idx - 1] ?? p.points[p.points.length - 1];
        return `${stop}% { transform: translate3d(${wp.x}vw, ${wp.y}vh, 0); opacity: ${p.opac}; }`;
      }).join(" ");
      return `@keyframes snow-drift-${p.id} { ${frames} }`;
    }).join("\n");

    return { particles, keyframesCSS };
  }, [count]);

  return (
    <>
      <style>{`
        ${keyframesCSS}
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
              left: 0,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: `rgba(255,255,255,${p.opac})`,
              boxShadow: `0 0 ${p.size * 2.2}px rgba(255,255,255,${p.opac * 0.7})`,
              filter: p.blur ? `blur(${p.blur}px)` : "none",
              /* cubic-bezier creates the "slow then suddenly fast" feel between waypoints */
              animation: `snow-drift-${p.id} ${p.dur}s cubic-bezier(0.85, 0, 0.15, 1) ${p.delay}s infinite`,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>
    </>
  );
}

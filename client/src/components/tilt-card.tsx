import { useRef, useState, useCallback, useEffect } from "react";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxDeg?: number;
  /* 0–1 opacity of the inner spotlight glow */
  glowIntensity?: number;
  style?: React.CSSProperties;
}

/**
 * TiltCard — extreme 3D mouse-reactive card with inner spotlight.
 *
 * - Tracks mouse relative to *this card only* (not the page)
 * - Applies perspective rotateX/Y proportional to cursor distance from center
 * - Renders a radial-gradient spotlight that follows the cursor inside the card
 * - Shadow shifts in the *opposite* direction of the tilt (light-source illusion)
 * - Returns to neutral with spring-like ease on mouse leave
 */
export function TiltCard({
  children,
  className = "",
  maxDeg = 18,
  glowIntensity = 0.20,
  style,
  onMouseMove: _ignored,
  onMouseEnter: _ignored2,
  onMouseLeave: _ignored3,
  ...rest
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width;   // 0–1
      const cy = (e.clientY - rect.top) / rect.height;   // 0–1
      setTilt({
        x: (cy - 0.5) * -maxDeg * 2,   // rotateX: up = positive
        y: (cx - 0.5) * maxDeg * 2,    // rotateY: right = positive
      });
      setSpot({ x: cx * 100, y: cy * 100 });
    });
  }, [maxDeg]);

  const onEnter = useCallback(() => setHovered(true), []);

  const onLeave = useCallback(() => {
    setHovered(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTilt({ x: 0, y: 0 });
    setSpot({ x: 50, y: 50 });
  }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  /* Shadow shifts opposite to tilt — simulates a fixed light source above */
  const shadowX = (-tilt.y / maxDeg) * 18;
  const shadowY = (tilt.x / maxDeg) * 18;

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      {...rest}
      style={{
        ...style,
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.04 : 1})`,
        transition: hovered
          ? "transform 0.08s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.15s ease"
          : "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.55s ease",
        willChange: "transform",
        position: "relative",
        boxShadow: hovered
          ? `${shadowX}px ${shadowY + 18}px 50px rgba(102,0,255,0.38), 0 8px 20px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(153,0,255,0.30)`
          : "0 4px 20px rgba(0,0,0,0.4)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Moving inner spotlight — follows mouse position */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          zIndex: 2,
          background: hovered
            ? `radial-gradient(circle 80px at ${spot.x}% ${spot.y}%, rgba(153,0,255,${glowIntensity}) 0%, transparent 75%)`
            : "none",
          transition: hovered ? "background 0.04s" : "background 0.35s",
        }}
      />
      {/* Top sheen — brightens slightly at the high tilt corner */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          zIndex: 1,
          background: hovered
            ? `linear-gradient(135deg, rgba(255,255,255,${Math.abs(tilt.y / maxDeg) * 0.06}) 0%, transparent 55%)`
            : "none",
          transition: "background 0.08s",
        }}
      />
      {children}
    </div>
  );
}

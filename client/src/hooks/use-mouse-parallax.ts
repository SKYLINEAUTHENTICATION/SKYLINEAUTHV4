import { useCallback, useRef, useState } from "react";

interface MouseParallaxOptions {
  /** Multiplier for how far orbs move (default: 40) */
  intensity?: number;
  /** CSS transition duration in ms (default: 120) */
  transitionMs?: number;
}

/**
 * Hook: Tracks mouse position relative to a container.
 * Returns normalized coords (0–1) and derived parallax offsets.
 */
export function useMouseParallax(options: MouseParallaxOptions = {}) {
  const { intensity = 40, transitionMs = 120 } = options;
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouse({ x: 0.5, y: 0.5 });
  }, []);

  /** Returns x/y offset for a layer at a given depth multiplier */
  const offset = (depthX: number, depthY: number = depthX) => ({
    x: (mouse.x - 0.5) * intensity * depthX,
    y: (mouse.y - 0.5) * intensity * depthY,
  });

  /** Card 3D tilt for perspective effect */
  const cardTilt = (maxDeg = 8) => ({
    rotateX: (mouse.y - 0.5) * -maxDeg,
    rotateY: (mouse.x - 0.5) * maxDeg,
  });

  return {
    containerRef,
    mouse,
    handleMouseMove,
    handleMouseLeave,
    offset,
    cardTilt,
    transitionMs,
  };
}

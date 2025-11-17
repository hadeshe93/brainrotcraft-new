/**
 * 封装一个 scroll 的 hook，用于监听 scroll 事件，并获得 scroll 的距离
 */

import { useEffect, useState } from "react";

interface ScrollPosition {
  x: number;
  y: number;
}

export function useScroll(): ScrollPosition {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      // Use requestAnimationFrame for better performance
      rafId = requestAnimationFrame(() => {
        setScrollPosition({
          x: window.scrollX,
          y: window.scrollY,
        });
      });
    };

    // Initial check
    setScrollPosition({
      x: window.scrollX,
      y: window.scrollY,
    });

    // Add the listener with passive option for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Clean up
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return scrollPosition;
}

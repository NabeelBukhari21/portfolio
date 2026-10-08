"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * true while `ref` is within `enter` of the viewport; goes back to false only once it's further
 * than `leave` away. Used to mount heavy WebGL scenes late and unmount them (freeing GPU memory)
 * when you've scrolled well past — the gap between the two margins stops it flickering.
 */
export function useNear(ref: RefObject<HTMLElement | null>, enter = "100%", leave = "300%") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ioIn = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: `${enter} 0px` });
    const ioOut = new IntersectionObserver(([e]) => !e.isIntersecting && setNear(false), { rootMargin: `${leave} 0px` });
    ioIn.observe(el);
    ioOut.observe(el);
    return () => {
      ioIn.disconnect();
      ioOut.disconnect();
    };
  }, [ref, enter, leave]);
  return near;
}

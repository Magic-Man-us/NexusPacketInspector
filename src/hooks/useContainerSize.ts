import { useState, useEffect, useRef, type RefObject } from "react";

export function useContainerSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const prevSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update(w: number, h: number) {
      // Only update state if dimensions actually changed (prevents infinite loops)
      const rw = Math.round(w);
      const rh = Math.round(h);
      if (rw !== prevSize.current.width || rh !== prevSize.current.height) {
        prevSize.current = { width: rw, height: rh };
        setSize({ width: rw, height: rh });
      }
    }

    update(el.clientWidth, el.clientHeight);

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        update(e.contentRect.width, e.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

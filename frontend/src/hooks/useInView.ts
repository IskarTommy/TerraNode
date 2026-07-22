import { useState, useEffect, useRef, useCallback } from "react";

interface Options {
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function useInView(opts: Options = {}): [boolean, React.RefObject<HTMLDivElement | null>] {
  const { once = true, threshold = 0.15, rootMargin = "0px 0px -40px 0px" } = opts;
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handle = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        setInView(true);
        if (once && observerRef.current) {
          observerRef.current.disconnect();
        }
      } else if (!once) {
        setInView(false);
      }
    },
    [once]
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    observerRef.current = new IntersectionObserver(handle, { threshold, rootMargin });
    observerRef.current.observe(node);
    return () => observerRef.current?.disconnect();
  }, [handle, threshold, rootMargin]);

  return [inView, ref];
}

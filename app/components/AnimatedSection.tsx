"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function AnimatedSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("slide-in-visible");
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`slide-in-ready ${className ?? ""}`}>
      {children}
    </div>
  );
}

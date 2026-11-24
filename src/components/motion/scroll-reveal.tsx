'use client';

import { useEffect, useRef, ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  startY?: number;
  startX?: number;
  startScale?: number;
  startOpacity?: number;
  threshold?: number;
  once?: boolean;
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  ease = 'power2.out',
  startY = 30,
  startX = 0,
  startScale = 1,
  startOpacity = 0,
  threshold = 0.8,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        {
          y: startY,
          x: startX,
          scale: startScale,
          opacity: startOpacity,
        },
        {
          y: 0,
          x: 0,
          scale: 1,
          opacity: 1,
          duration,
          delay,
          ease,
          scrollTrigger: {
            trigger: element,
            start: `top ${threshold * 100}%`,
            toggleActions: 'play none none none',
            once,
          },
        }
      );
    });

    return () => ctx.revert();
  }, [startY, startX, startScale, startOpacity, duration, delay, ease, threshold, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

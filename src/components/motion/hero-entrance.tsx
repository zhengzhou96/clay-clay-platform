'use client';

import { useEffect, useRef, ReactNode } from 'react';
import gsap from 'gsap';

interface HeroEntranceProps {
  children: ReactNode;
  className?: string;
}

export function HeroEntrance({ children, className = '' }: HeroEntranceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Hero image fade in
      tl.from('.hero-image', {
        opacity: 0,
        scale: 0.95,
        duration: 1,
      })
      // Headline rises
        .from('.hero-headline', {
          y: 60,
          opacity: 0,
          duration: 1.2,
        }, '-=0.6')
      // Subtitle fades in
        .from('.hero-subtitle', {
          y: 30,
          opacity: 0,
          duration: 0.8,
        }, '-=0.8')
      // CTA buttons pop in
        .from('.hero-cta', {
          y: 20,
          opacity: 0,
          scale: 0.9,
          duration: 0.6,
          stagger: 0.15,
          ease: 'back.out(1.7)',
        }, '-=0.6');
    });

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

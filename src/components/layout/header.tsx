'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { ScrollReveal } from '@/components/motion/scroll-reveal';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/workshops/pottery-painting', label: 'Pottery Painting' },
    { href: '/workshops/hand-building', label: 'Hand Building' },
    { href: '/workshops/wheel-throwing', label: 'Wheel Throwing' },
    { href: '/workshops/private-events', label: 'Private Events' },
    { href: '/workshops/corporate', label: 'Corporate' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-clay-white/95 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="container-max flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-clay-terracotta flex items-center justify-center">
            <span className="text-clay-white font-serif font-bold text-lg">C</span>
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight">Clay Clay</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-clay-ink/80 hover:text-clay-terracotta transition-colors duration-200 text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/booking">
            <Button variant="primary" size="default">
              Book Now
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-clay-ink"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-clay-white border-t border-clay-warm-gray/50 shadow-lg">
          <nav className="flex flex-col p-6 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-clay-ink/80 hover:text-clay-terracotta transition-colors py-2 text-base font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/booking" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="primary" size="lg" className="w-full mt-4">
                Book Now
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ScrollReveal } from '@/components/motion/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { CheckCircle, Calendar, Clock, MapPin, Download, Share2 } from 'lucide-react';

export default function ConfirmationPage() {
  const [bookingReference, setBookingReference] = useState('');

  useEffect(() => {
    setBookingReference(`CLAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  }, []);

  return (
    <main className="min-h-screen bg-clay-sand/20">
      <Header />

      {/* Success Header */}
      <section className="pt-32 pb-12 bg-clay-white">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 rounded-full bg-clay-success/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-clay-success" />
              </div>
              <h1 className="text-5xl font-serif mb-4 text-clay-success">Booking Confirmed!</h1>
              <p className="text-clay-ink/70 text-lg mb-2">
                Thank you for booking with Clay Clay
              </p>
              <p className="text-clay-ink/50">
                Reference: <span className="font-mono font-semibold">{bookingReference}</span>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Booking Details */}
      <section className="py-12">
        <div className="container-max px-6">
          <div className="max-w-2xl mx-auto">
            <ScrollReveal delay={0.2}>
              <Card className="mb-8">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-serif mb-6">Booking Details</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4 p-4 bg-clay-sand/50 rounded-sm">
                      <Calendar className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                      <div>
                        <p className="text-sm text-clay-ink/60 mb-1">Date & Time</p>
                        <p className="font-semibold">Saturday, 23 November 2026</p>
                        <p className="text-clay-ink/80">10:00 AM - 11:30 AM</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-clay-sand/50 rounded-sm">
                      <Clock className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                      <div>
                        <p className="text-sm text-clay-ink/60 mb-1">Workshop</p>
                        <p className="font-semibold">Pottery Painting</p>
                        <p className="text-clay-ink/80">90 minutes • 2 participants</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-clay-sand/50 rounded-sm">
                      <MapPin className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                      <div>
                        <p className="text-sm text-clay-ink/60 mb-1">Location</p>
                        <p className="font-semibold">Clay Clay Studio</p>
                        <p className="text-clay-ink/80">
                          123 Pottery Lane, #01-45<br />
                          Singapore 234567
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-clay-sand/50 rounded-sm">
                      <div className="w-6 h-6 text-clay-terracotta shrink-0 mt-1 font-semibold">✉</div>
                      <div>
                        <p className="text-sm text-clay-ink/60 mb-1">Confirmation Email</p>
                        <p className="text-clay-ink/80">
                          A confirmation email has been sent to your registered email address with all the details.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <Card className="mb-8">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-serif mb-6">What to Expect</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-clay-terracotta/10 flex items-center justify-center shrink-0">
                        <span className="text-clay-terracotta font-semibold">1</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Arrive 10 minutes early</p>
                        <p className="text-clay-ink/70 text-sm">
                          This gives you time to settle in and choose your ceramic piece before the session starts.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-clay-terracotta/10 flex items-center justify-center shrink-0">
                        <span className="text-clay-terracotta font-semibold">2</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Wear comfortable clothes</p>
                        <p className="text-clay-ink/70 text-sm">
                          Pottery painting can be messy! We provide aprons, but wear something you don&apos;t mind getting a bit of paint on.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-clay-terracotta/10 flex items-center justify-center shrink-0">
                        <span className="text-clay-terracotta font-semibold">3</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Enjoy your creative session</p>
                        <p className="text-clay-ink/70 text-sm">
                          Our instructors will guide you through the process. Take your time and have fun!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-clay-terracotta/10 flex items-center justify-center shrink-0">
                        <span className="text-clay-terracotta font-semibold">4</span>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Collect your fired piece</p>
                        <p className="text-clay-ink/70 text-sm">
                          In 1-2 weeks, we&apos;ll notify you when your piece is ready for collection. It will be food-safe and dishwasher-safe!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="primary" size="lg" className="flex-1">
                  <Download className="mr-2" size={20} />
                  Download Confirmation
                </Button>
                <Button variant="outline" size="lg" className="flex-1">
                  <Share2 className="mr-2" size={20} />
                  Share
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.5}>
              <div className="mt-8 text-center">
                <p className="text-clay-ink/70 mb-4">Need to make changes?</p>
                <Link href="/manage-booking">
                  <Button variant="ghost">
                    Manage Your Booking
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

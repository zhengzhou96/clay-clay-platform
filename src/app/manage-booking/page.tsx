'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ScrollReveal } from '@/components/motion/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function ManageBookingPage() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [found, setFound] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (reference && email) {
      setFound(true);
    }
  };

  return (
    <main className="min-h-screen bg-clay-sand/20">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-clay-white">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-5xl font-serif mb-4">Manage Your Booking</h1>
              <p className="text-clay-ink/70 text-lg">
                Find your booking to reschedule or cancel
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Search Form */}
      <section className="py-12">
        <div className="container-max px-6">
          <div className="max-w-xl mx-auto">
            {!found ? (
              <ScrollReveal>
                <Card>
                  <CardContent className="p-8">
                    <form onSubmit={handleSearch} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Booking Reference
                        </label>
                        <Input
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value.toUpperCase())}
                          placeholder="CLAY-ABC123"
                          className="font-mono"
                        />
                        <p className="text-xs text-clay-ink/50 mt-2">
                          Find this in your confirmation email
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                        />
                      </div>

                      <Button type="submit" variant="primary" size="lg" className="w-full">
                        <Search className="mr-2" size={20} />
                        Find Booking
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ) : (
              <ScrollReveal>
                <div className="space-y-6">
                  {/* Booking Details */}
                  <Card>
                    <CardContent className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-sm text-clay-ink/60 mb-1">Booking Reference</p>
                          <p className="font-mono text-xl font-semibold">{reference}</p>
                        </div>
                        <div className="px-4 py-2 bg-clay-success/10 text-clay-success rounded-full text-sm font-medium">
                          Confirmed
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <Calendar className="w-5 h-5 text-clay-terracotta" />
                          <div>
                            <p className="text-sm text-clay-ink/60">Date</p>
                            <p className="font-semibold">Saturday, 23 November 2026</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <Clock className="w-5 h-5 text-clay-terracotta" />
                          <div>
                            <p className="text-sm text-clay-ink/60">Time</p>
                            <p className="font-semibold">10:00 AM - 11:30 AM</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <CheckCircle className="w-5 h-5 text-clay-terracotta" />
                          <div>
                            <p className="text-sm text-clay-ink/60">Workshop</p>
                            <p className="font-semibold">Pottery Painting</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <CheckCircle className="w-5 h-5 text-clay-terracotta" />
                          <div>
                            <p className="text-sm text-clay-ink/60">Participants</p>
                            <p className="font-semibold">2 people</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <CheckCircle className="w-5 h-5 text-clay-terracotta" />
                          <div>
                            <p className="text-sm text-clay-ink/60">Total Paid</p>
                            <p className="font-semibold text-clay-terracotta">S$66</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <Card>
                    <CardContent className="p-8">
                      <h2 className="text-xl font-serif mb-6">Manage Booking</h2>
                      
                      <div className="space-y-4">
                        <div className="p-4 border border-clay-warm-gray/50 rounded-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold mb-1">Reschedule Session</h3>
                              <p className="text-sm text-clay-ink/70 mb-3">
                                Change your booking to a different date or time
                              </p>
                              <p className="text-xs text-clay-ink/50">
                                Free rescheduling up to 48 hours before your session
                              </p>
                            </div>
                            <Button variant="outline" size="default">
                              Reschedule
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 border border-clay-warm-gray/50 rounded-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold mb-1">Cancel Booking</h3>
                              <p className="text-sm text-clay-ink/70 mb-3">
                                Cancel your booking and receive a refund
                              </p>
                              <p className="text-xs text-clay-ink/50">
                                Full refund if cancelled 48+ hours before. 50% refund within 48 hours.
                              </p>
                            </div>
                            <Button variant="outline" size="default" className="text-clay-error border-clay-error/50 hover:bg-clay-error/10">
                              <XCircle className="mr-2" size={16} />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setFound(false);
                        setReference('');
                        setEmail('');
                      }}
                    >
                      Search Another Booking
                    </Button>
                  </div>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* Cancellation Policy Summary */}
      <section className="py-12">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <Card className="bg-clay-ink text-clay-white">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-serif mb-4">Cancellation Policy</h2>
                  <div className="space-y-3 text-clay-white/80">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-clay-success shrink-0 mt-0.5" />
                      <p>
                        <span className="font-semibold">48+ hours before:</span> Full refund
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-clay-warning shrink-0 mt-0.5" />
                      <p>
                        <span className="font-semibold">24-48 hours before:</span> 50% refund
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-clay-error shrink-0 mt-0.5" />
                      <p>
                        <span className="font-semibold">Less than 24 hours:</span> No refund
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-clay-terracotta shrink-0 mt-0.5" />
                      <p>
                        <span className="font-semibold">No-shows:</span> No refund or reschedule
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-clay-white/50 mt-6">
                    For full policy details, please refer to our Terms of Service.
                  </p>
                </CardContent>
              </Card>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}

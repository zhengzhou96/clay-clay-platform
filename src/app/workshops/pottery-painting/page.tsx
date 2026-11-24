'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ScrollReveal } from '@/components/motion/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { Clock, Users, CheckCircle, Calendar, MapPin, ArrowRight } from 'lucide-react';

export default function PotteryPaintingPage() {
  const inclusions = [
    'Choice of over 200 ceramic pieces to paint',
    'Premium glazes and paints in various colors',
    'Brushes and all painting tools provided',
    'Expert guidance from our instructors',
    'First firing included in the price',
    'Comfortable studio seating',
  ];

  const faqs = [
    {
      question: 'What is pottery painting?',
      answer: 'Pottery painting involves selecting pre-made ceramic bisque pieces and painting them with our special glazes. After firing, the colors become vibrant and permanent, creating a functional piece of art.',
    },
    {
      question: 'How long does a session take?',
      answer: 'A typical pottery painting session takes about 90 minutes. However, you can take your time - there\'s no rush! Some people finish in an hour, others enjoy 2-3 hours of creative time.',
    },
    {
      question: 'What pieces can I paint?',
      answer: 'We have over 200 different shapes including mugs, plates, bowls, vases, figurines, tiles, and seasonal items. New designs are added regularly!',
    },
    {
      question: 'Do I need to book in advance?',
      answer: 'Walk-ins are welcome based on availability, but we recommend booking ahead, especially on weekends and evenings. Groups of 6 or more must book in advance.',
    },
    {
      question: 'Can children participate?',
      answer: 'Absolutely! Pottery painting is suitable for all ages. Children under 8 must be accompanied by an adult. We have special kid-friendly pieces and non-toxic paints.',
    },
  ];

  const galleryImages = [
    'https://images.unsplash.com/photo-1565193566173-034e4e811f36?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516961642265-531546e84af2?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574621159966-e85e6c7e6f7d?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1528659570-b892884e7c6e?q=80&w=800&auto=format&fit=crop',
  ];

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-24 bg-clay-sand/30">
        <div className="container-max px-6">
          <div className="editorial-grid items-center">
            <ScrollReveal>
              <div>
                <div className="inline-block px-4 py-2 bg-clay-terracotta/10 text-clay-terracotta text-sm font-medium rounded-full mb-6">
                  Most Popular Workshop
                </div>
                <h1 className="text-5xl md:text-6xl font-serif mb-6">Pottery Painting</h1>
                <p className="text-xl text-clay-ink/70 mb-8 max-w-xl">
                  Paint beautiful ceramic pieces with our premium glazes. No experience needed - just come and create.
                </p>
                <div className="flex flex-wrap gap-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-6 h-6 text-clay-terracotta" />
                    <div>
                      <p className="text-sm text-clay-ink/60">Duration</p>
                      <p className="font-semibold">90 minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-clay-terracotta" />
                    <div>
                      <p className="text-sm text-clay-ink/60">Group Size</p>
                      <p className="font-semibold">1-8 people</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 text-clay-terracotta" />
                    <div>
                      <p className="text-sm text-clay-ink/60">Availability</p>
                      <p className="font-semibold">Daily</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/booking">
                    <Button variant="primary" size="xl">
                      Book Now - S$33
                    </Button>
                  </Link>
                  <Link href="#what-to-expect">
                    <Button variant="outline" size="xl">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="aspect-[4/5] rounded-sm overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1565193566173-034e4e811f36?q=80&w=2070&auto=format&fit=crop"
                  alt="Pottery painting workshop"
                  className="w-full h-full object-cover"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Description */}
      <section id="what-to-expect" className="py-24 bg-clay-white">
        <div className="container-max px-6">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <h2 className="text-4xl font-serif mb-8 text-center">What to Expect</h2>
              <div className="prose prose-lg mx-auto">
                <p className="text-clay-ink/70 mb-6">
                  Pottery painting is the perfect creative experience for all ages and skill levels. Choose from our extensive collection of bisque ceramic pieces - from simple mugs and bowls to intricate figurines and decorative items.
                </p>
                <p className="text-clay-ink/70 mb-6">
                  Our studio is equipped with everything you need: comfortable seating, excellent lighting, and an array of premium glazes in every color imaginable. Our friendly instructors are always on hand to offer tips and techniques, whether you&apos;re a first-timer or a returning artist.
                </p>
                <p className="text-clay-ink/70 mb-6">
                  After you&apos;ve finished painting, we&apos;ll apply a clear glaze and fire your piece in our kiln at 1200°C. This vitrification process makes your creation food-safe, dishwasher-safe, and permanent. Return in 1-2 weeks to collect your masterpiece!
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Inclusions */}
      <section className="py-24 bg-clay-sand/30">
        <div className="container-max px-6">
          <ScrollReveal>
            <h2 className="text-4xl font-serif mb-12 text-center">What&apos;s Included</h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inclusions.map((item, index) => (
              <ScrollReveal key={item} delay={index * 0.1}>
                <Card>
                  <CardContent className="p-6 flex items-start space-x-4">
                    <CheckCircle className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                    <p className="text-clay-ink/80">{item}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.3}>
            <div className="mt-12 p-8 bg-clay-terracotta text-clay-white rounded-sm text-center">
              <h3 className="text-2xl font-serif mb-4">Pricing</h3>
              <div className="flex items-center justify-center space-x-4 mb-6">
                <span className="text-5xl font-semibold">S$33</span>
                <span className="text-clay-white/80">per person</span>
              </div>
              <p className="text-clay-white/80 mb-6">
                Plus cost of ceramic piece (S$8-20 depending on selection)
              </p>
              <Link href="/booking">
                <Button variant="secondary" size="lg">
                  Book Your Session
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-24 bg-clay-white">
        <div className="container-max px-6">
          <ScrollReveal>
            <h2 className="text-4xl font-serif mb-12 text-center">Gallery</h2>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryImages.map((src, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="aspect-square rounded-sm overflow-hidden">
                  <img
                    src={src}
                    alt={`Pottery painting gallery ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 bg-clay-sand/30">
        <div className="container-max px-6">
          <ScrollReveal>
            <h2 className="text-4xl font-serif mb-12 text-center">FAQs</h2>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="max-w-3xl mx-auto">
              <Accordion>
                {faqs.map((faq, index) => (
                  <AccordionItem key={index}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <div className="text-center mt-12">
              <p className="text-clay-ink/70 mb-6">Have more questions?</p>
              <Link href="/contact">
                <Button variant="outline" size="lg">
                  Contact Us
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-clay-ink text-clay-white">
        <div className="container-max px-6 text-center">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-serif mb-6">Ready to Paint?</h2>
            <p className="text-clay-white/70 max-w-2xl mx-auto mb-8 text-lg">
              Book your pottery painting session today and unleash your inner artist
            </p>
            <ScrollReveal delay={0.2}>
              <Link href="/booking">
                <Button variant="primary" size="xl">
                  Book Now
                  <ArrowRight className="ml-2" size={24} />
                </Button>
              </Link>
            </ScrollReveal>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}

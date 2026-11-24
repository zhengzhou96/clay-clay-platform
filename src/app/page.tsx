'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroEntrance } from '@/components/motion/hero-entrance';
import { ScrollReveal } from '@/components/motion/scroll-reveal';
import { Counter } from '@/components/motion/counter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { Calendar, Clock, Users, CheckCircle, MapPin, ArrowRight, Star } from 'lucide-react';

export default function HomePage() {
  const workshops = [
    {
      title: 'Pottery Painting',
      slug: 'pottery-painting',
      description: 'Paint pre-made ceramic pieces with our premium glazes',
      price: 33,
      duration: 90,
      image: 'https://images.unsplash.com/photo-1565193566173-034e4e811f36?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Hand Building',
      slug: 'hand-building',
      description: 'Create unique pieces from scratch using clay',
      price: 55,
      duration: 120,
      image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Wheel Throwing',
      slug: 'wheel-throwing',
      description: 'Learn the art of shaping clay on the pottery wheel',
      price: 65,
      duration: 120,
      image: 'https://images.unsplash.com/photo-1549488497-6581d5f45e71?q=80&w=2070&auto=format&fit=crop',
    },
  ];

  const steps = [
    {
      icon: Calendar,
      title: 'Book Your Session',
      description: 'Choose your preferred workshop and time slot online',
    },
    {
      icon: Users,
      title: 'Join the Workshop',
      description: 'Arrive at our studio and get guided by our expert instructors',
    },
    {
      icon: CheckCircle,
      title: 'Create & Paint',
      description: 'Paint your piece or create from scratch with clay',
    },
    {
      icon: Clock,
      title: 'Fire & Collect',
      description: 'We fire your piece and you collect it in 1-2 weeks',
    },
  ];

  const galleryImages = [
    'https://images.unsplash.com/photo-1565193566173-034e4e811f36?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1549488497-6581d5f45e71?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516961642265-531546e84af2?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574621159966-e85e6c7e6f7d?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1528659570-b892884e7c6e?q=80&w=800&auto=format&fit=crop',
  ];

  const events = [
    {
      title: 'Date Night Pottery',
      date: 'Every Friday',
      time: '7:00 PM - 9:00 PM',
      price: 80,
      description: 'A romantic evening for two with wine and clay',
    },
    {
      title: 'Kids Birthday Party',
      date: 'Weekends',
      time: '10:00 AM - 12:00 PM',
      price: 45,
      description: 'Fun pottery party for children ages 6-12',
    },
    {
      title: 'Mindful Pottery Session',
      date: 'Sunday Mornings',
      time: '9:00 AM - 11:00 AM',
      price: 55,
      description: 'Start your week with a calming pottery practice',
    },
  ];

  const faqs = [
    {
      question: 'Do I need any prior experience?',
      answer: 'Not at all! Our workshops are designed for all skill levels, from complete beginners to experienced artists. Our instructors will guide you through every step.',
    },
    {
      question: 'What should I wear?',
      answer: 'Wear comfortable clothes that you don\'t mind getting a bit of clay on. We provide aprons, but pottery can be messy!',
    },
    {
      question: 'How long until I can collect my piece?',
      answer: 'After your session, pieces need to be fired in our kiln. This process takes 1-2 weeks. We\'ll notify you when your piece is ready for collection.',
    },
    {
      question: 'Can I bring my own food and drinks?',
      answer: 'We have a small café area with light refreshments available for purchase. For private events, we can arrange catering.',
    },
    {
      question: 'What is your cancellation policy?',
      answer: 'You can reschedule or cancel up to 48 hours before your session for a full refund. Cancellations within 48 hours are subject to a 50% fee.',
    },
  ];

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="hero-image w-full h-full bg-gradient-to-br from-clay-sand/30 to-clay-terracotta/20" />
          <img
            src="https://images.unsplash.com/photo-1565193566173-034e4e811f36?q=80&w=2070&auto=format&fit=crop"
            alt="Pottery painting at Clay Clay studio"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-clay-white via-transparent to-transparent" />
        </div>

        <HeroEntrance className="relative z-10 container-max text-center px-6">
          <h1 className="hero-headline text-5xl md:text-7xl lg:text-8xl font-serif font-medium mb-6 text-clay-ink">
            Shape Your<br />
            <span className="text-clay-terracotta">Creativity</span>
          </h1>
          <p className="hero-subtitle text-lg md:text-xl text-clay-ink/80 max-w-2xl mx-auto mb-8">
            Singapore&apos;s premier pottery painting studio. Paint, create, and take home your own ceramic masterpieces.
          </p>
          <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking">
              <Button variant="primary" size="xl">
                Book a Session
              </Button>
            </Link>
            <Link href="/workshops/pottery-painting">
              <Button variant="outline" size="xl">
                Explore Workshops
              </Button>
            </Link>
          </div>
        </HeroEntrance>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-clay-ink/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Workshops Preview */}
      <section className="py-24 bg-clay-white">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif mb-4">Our Workshops</h2>
              <p className="text-clay-ink/70 max-w-2xl mx-auto">
                Choose from our range of pottery experiences, from painting pre-made pieces to creating from scratch
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {workshops.map((workshop, index) => (
              <ScrollReveal key={workshop.slug} delay={index * 0.1}>
                <Card className="overflow-hidden group cursor-pointer">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={workshop.image}
                      alt={workshop.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-serif mb-2">{workshop.title}</h3>
                    <p className="text-clay-ink/70 mb-4">{workshop.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-clay-ink/60">
                        <span className="flex items-center">
                          <Clock size={16} className="mr-1" />
                          {workshop.duration} min
                        </span>
                      </div>
                      <span className="text-lg font-semibold text-clay-terracotta">
                        S$<Counter value={workshop.price} duration={1} />
                      </span>
                    </div>
                    <Link href={`/workshops/${workshop.slug}`}>
                      <Button variant="secondary" className="w-full mt-4">
                        Learn More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/workshops/pottery-painting">
              <Button variant="outline" size="lg">
                View All Workshops
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-clay-sand/30">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif mb-4">How It Works</h2>
              <p className="text-clay-ink/70 max-w-2xl mx-auto">
                Four simple steps to your pottery masterpiece
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <ScrollReveal key={step.title} delay={index * 0.15}>
                <div className="text-center relative">
                  <div className="w-16 h-16 rounded-full bg-clay-terracotta/10 flex items-center justify-center mx-auto mb-6">
                    <step.icon className="w-8 h-8 text-clay-terracotta" />
                  </div>
                  <div className="text-6xl font-serif text-clay-warm-gray/30 absolute -mt-20 -ml-8">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-clay-ink/70">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-24 bg-clay-white">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif mb-4">Gallery</h2>
              <p className="text-clay-ink/70 max-w-2xl mx-auto">
                See what our community has created
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((src, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="aspect-square overflow-hidden rounded-sm group">
                  <img
                    src={src}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="py-24 bg-clay-ink text-clay-white">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif mb-4">Events & Classes</h2>
              <p className="text-clay-white/70 max-w-2xl mx-auto">
                Join our special events and regular classes
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {events.map((event, index) => (
              <ScrollReveal key={event.title} delay={index * 0.15}>
                <Card className="bg-clay-white/10 border-clay-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2 text-clay-terracotta mb-4">
                      <Star size={20} />
                      <span className="text-sm font-medium">{event.date}</span>
                    </div>
                    <h3 className="text-2xl font-serif mb-2">{event.title}</h3>
                    <p className="text-clay-white/70 mb-4">{event.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-clay-white/60">{event.time}</span>
                      <span className="text-lg font-semibold text-clay-terracotta">
                        S$<Counter value={event.price} duration={1} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/booking">
              <Button variant="primary" size="lg">
                View All Events
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Studio Info */}
      <section className="py-24 bg-clay-white">
        <div className="container-max px-6">
          <div className="editorial-grid items-center">
            <ScrollReveal>
              <div>
                <h2 className="text-4xl md:text-5xl font-serif mb-6">Visit Our Studio</h2>
                <p className="text-clay-ink/70 mb-8">
                  Located in the heart of Singapore, our studio is a creative sanctuary where you can escape the city buzz and immerse yourself in clay.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <MapPin className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Address</h4>
                      <p className="text-clay-ink/70">123 Pottery Lane, #01-45<br />Singapore 234567</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Clock className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Opening Hours</h4>
                      <p className="text-clay-ink/70">
                        Mon - Fri: 10am - 8pm<br />
                        Sat: 9am - 9pm<br />
                        Sun: 9am - 7pm
                      </p>
                    </div>
                  </div>
                </div>
                <Link href="/contact">
                  <Button variant="primary" size="lg" className="mt-8">
                    Get Directions
                  </Button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="aspect-[4/5] rounded-sm overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1549488497-6581d5f45e71?q=80&w=2070&auto=format&fit=crop"
                  alt="Clay Clay studio interior"
                  className="w-full h-full object-cover"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 bg-clay-sand/30">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif mb-4">FAQs</h2>
              <p className="text-clay-ink/70 max-w-2xl mx-auto">
                Got questions? We&apos;ve got answers
              </p>
            </div>
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
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-clay-terracotta text-clay-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-clay-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-clay-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="container-max px-6 relative z-10 text-center">
          <ScrollReveal>
            <h2 className="text-4xl md:text-6xl font-serif mb-6">Ready to Get Creative?</h2>
            <p className="text-clay-white/80 max-w-2xl mx-auto mb-8 text-lg">
              Book your session today and experience the joy of creating with clay
            </p>
            <ScrollReveal delay={0.2}>
              <Link href="/booking">
                <Button variant="secondary" size="xl" className="bg-clay-white text-clay-terracotta hover:bg-clay-cream">
                  Book Your Session Now
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

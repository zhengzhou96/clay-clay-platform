'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ScrollReveal } from '@/components/motion/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-clay-sand/30">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-5xl font-serif mb-4">Get in Touch</h1>
              <p className="text-clay-ink/70 text-lg">
                Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="container-max px-6">
          <div className="editorial-grid gap-12">
            {/* Contact Form */}
            <ScrollReveal>
              <Card>
                <CardContent className="p-8">
                  <h2 className="text-2xl font-serif mb-6">Send us a message</h2>
                  
                  <form className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">First Name</label>
                        <Input type="text" placeholder="Jane" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Last Name</label>
                        <Input type="text" placeholder="Doe" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input type="email" placeholder="jane@example.com" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Phone (Optional)</label>
                      <Input type="tel" placeholder="+65 1234 5678" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Subject</label>
                      <select className="flex h-11 w-full rounded-sm border border-clay-ink/20 bg-clay-white px-4 py-3 text-base focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-clay-terracotta focus-visible:outline-offset-2">
                        <option value="">Select a subject</option>
                        <option value="general">General Inquiry</option>
                        <option value="booking">Booking Question</option>
                        <option value="private-event">Private Event</option>
                        <option value="corporate">Corporate Workshop</option>
                        <option value="feedback">Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Message</label>
                      <textarea
                        className="flex min-h-[150px] w-full rounded-sm border border-clay-ink/20 bg-clay-white px-4 py-3 text-base focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-clay-terracotta focus-visible:outline-offset-2"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <Button variant="primary" size="lg" className="w-full">
                      <Send className="mr-2" size={20} />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Contact Info */}
            <ScrollReveal delay={0.2}>
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-serif mb-6">Contact Information</h2>
                  <p className="text-clay-ink/70 mb-8">
                    Fill up the form and our team will get back to you within 24 hours.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <MapPin className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Address</h3>
                      <p className="text-clay-ink/70">
                        123 Pottery Lane, #01-45<br />
                        Singapore 234567
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <Phone className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <p className="text-clay-ink/70">+65 6789 1234</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <Mail className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <p className="text-clay-ink/70">hello@clayclay.sg</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <Clock className="w-6 h-6 text-clay-terracotta shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Opening Hours</h3>
                      <div className="text-clay-ink/70 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Monday - Friday</span>
                          <span>10:00 AM - 8:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Saturday</span>
                          <span>9:00 AM - 9:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sunday</span>
                          <span>9:00 AM - 7:00 PM</span>
                        </div>
                        <div className="flex justify-between text-clay-terracotta">
                          <span>Public Holidays</span>
                          <span>10:00 AM - 6:00 PM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map Placeholder */}
                <div className="aspect-[4/3] rounded-sm overflow-hidden bg-clay-sand/50">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.822675569601!2d103.8198!3d1.3521!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da190e749e2a79%3A0x1234567890abcdef!2sSingapore!5e0!3m2!1sen!2ssg!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="grayscale opacity-80"
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

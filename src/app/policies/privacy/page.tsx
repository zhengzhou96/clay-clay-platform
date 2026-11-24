'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ScrollReveal } from '@/components/motion/scroll-reveal';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-clay-sand/30">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <Link href="/" className="inline-flex items-center text-clay-terracotta hover:underline mb-6">
                <ArrowLeft className="mr-2" size={20} />
                Back to Home
              </Link>
              <h1 className="text-5xl font-serif mb-4">Privacy Policy</h1>
              <p className="text-clay-ink/70 text-lg">
                Last updated: 21 November 2026
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container-max px-6">
          <div className="max-w-3xl mx-auto prose prose-lg">
            <ScrollReveal>
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-serif mb-4">1. Introduction</h2>
                  <p className="text-clay-ink/70">
                    Clay Clay (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our studio or use our booking services.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">2. Information We Collect</h2>
                  <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
                  <p className="text-clay-ink/70 mb-4">
                    We may collect personal information that you voluntarily provide to us when you:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-clay-ink/70">
                    <li>Book a workshop or event through our website</li>
                    <li>Sign up for our newsletter</li>
                    <li>Contact us via email, phone, or contact form</li>
                    <li>Visit our studio</li>
                  </ul>
                  <p className="text-clay-ink/70 mt-4">
                    This information may include your name, email address, phone number, postal address, and payment information.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">3. How We Use Your Information</h2>
                  <p className="text-clay-ink/70 mb-4">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-clay-ink/70">
                    <li>Process and confirm your bookings</li>
                    <li>Send you booking confirmations and updates</li>
                    <li>Respond to your inquiries and provide customer support</li>
                    <li>Send promotional communications (with your consent)</li>
                    <li>Improve our services and website</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">4. Information Sharing</h2>
                  <p className="text-clay-ink/70 mb-4">
                    We do not sell, trade, or rent your personal information to third parties. We may share your information with:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-clay-ink/70">
                    <li><span className="font-semibold">Service providers:</span> Payment processors, email service providers, and booking platform providers who assist in our operations</li>
                    <li><span className="font-semibold">Legal requirements:</span> When required by law or to protect our rights</li>
                    <li><span className="font-semibold">Business transfers:</span> In connection with a merger, sale, or transfer of business assets</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">5. Data Security</h2>
                  <p className="text-clay-ink/70">
                    We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">6. Your Rights</h2>
                  <p className="text-clay-ink/70 mb-4">
                    You have the right to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-clay-ink/70">
                    <li>Access your personal information</li>
                    <li>Correct inaccurate information</li>
                    <li>Request deletion of your information</li>
                    <li>Opt-out of marketing communications</li>
                    <li>Withdraw consent at any time</li>
                  </ul>
                  <p className="text-clay-ink/70 mt-4">
                    To exercise these rights, please contact us at{' '}
                    <a href="mailto:hello@clayclay.sg" className="text-clay-terracotta hover:underline">
                      hello@clayclay.sg
                    </a>
                    .
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">7. Cookies</h2>
                  <p className="text-clay-ink/70">
                    Our website uses cookies to enhance your browsing experience. You can choose to disable cookies through your browser settings, but this may affect your ability to use certain features of our website.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">8. Third-Party Links</h2>
                  <p className="text-clay-ink/70">
                    Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">9. Children&apos;s Privacy</h2>
                  <p className="text-clay-ink/70">
                    We do not knowingly collect personal information from children under 13 years of age. If you believe we have collected information from a child under 13, please contact us immediately.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">10. Changes to This Policy</h2>
                  <p className="text-clay-ink/70">
                    We may update this Privacy Policy from time to time. The updated version will be posted on this page with a revised &quot;Last updated&quot; date. We encourage you to review this policy periodically.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-serif mb-4">11. Contact Us</h2>
                  <p className="text-clay-ink/70 mb-2">
                    If you have questions about this Privacy Policy, please contact us:
                  </p>
                  <div className="text-clay-ink/70">
                    <p>Email: <a href="mailto:hello@clayclay.sg" className="text-clay-terracotta hover:underline">hello@clayclay.sg</a></p>
                    <p>Phone: +65 6789 1234</p>
                    <p>Address: 123 Pottery Lane, #01-45, Singapore 234567</p>
                  </div>
                </section>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ScrollReveal } from '@/components/motion/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Calendar as CalendarIcon, Clock, Users, CheckCircle, ChevronLeft } from 'lucide-react';

const workshops = [
  { id: 'pottery-painting', name: 'Pottery Painting', price: 33, duration: 90 },
  { id: 'hand-building', name: 'Hand Building', price: 55, duration: 120 },
  { id: 'wheel-throwing', name: 'Wheel Throwing', price: 65, duration: 120 },
  { id: 'private-events', name: 'Private Events', price: 40, duration: 120 },
  { id: 'corporate', name: 'Corporate Workshop', price: 40, duration: 120 },
];

const timeSlots = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM',
];

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [dates, setDates] = useState<Array<{ full: string; day: string; date: number; month: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
  });

  // Generate dates on client side
  useEffect(() => {
    const generateDates = () => {
      const dates = [];
      const today = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        dates.push({
          full: date.toISOString().split('T')[0],
          day: days[date.getDay()],
          date: date.getDate(),
          month: date.toLocaleString('default', { month: 'short' }),
        });
      }
      return dates;
    };
    setDates(generateDates());
  }, []);

  const handleNext = () => {
    if (step === 1 && selectedWorkshop) setStep(2);
    else if (step === 2 && selectedDate && selectedTime) setStep(3);
    else if (step === 3) setStep(4);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const calculateTotal = () => {
    const workshop = workshops.find(w => w.id === selectedWorkshop);
    if (!workshop) return 0;
    return workshop.price * participantCount;
  };

  return (
    <main className="min-h-screen bg-clay-sand/20">
      <Header />

      {/* Header */}
      <section className="pt-32 pb-12 bg-clay-white">
        <div className="container-max px-6">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-5xl font-serif mb-4">Book Your Session</h1>
              <p className="text-clay-ink/70 text-lg">
                Choose your workshop, date, and time to reserve your spot
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Progress Steps */}
      <section className="py-8 bg-clay-white border-b border-clay-warm-gray/50">
        <div className="container-max px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              {['Workshop', 'Date & Time', 'Details', 'Confirm'].map((label, index) => (
                <div key={label} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step > index + 1 ? 'bg-clay-terracotta text-clay-white' :
                    step === index + 1 ? 'bg-clay-terracotta text-clay-white' :
                    'bg-clay-warm-gray text-clay-ink/50'
                  }`}>
                    {step > index + 1 ? <CheckCircle size={20} /> : index + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    step === index + 1 ? 'text-clay-ink' : 'text-clay-ink/50'
                  }`}>
                    {label}
                  </span>
                  {index < 3 && (
                    <div className={`w-12 md:w-24 h-0.5 mx-2 md:mx-4 ${
                      step > index + 1 ? 'bg-clay-terracotta' : 'bg-clay-warm-gray'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="py-12">
        <div className="container-max px-6">
          <div className="max-w-3xl mx-auto">
            {/* Step 1: Select Workshop */}
            {step === 1 && (
              <ScrollReveal>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif">Choose Your Workshop</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {workshops.map((workshop) => (
                        <button
                          key={workshop.id}
                          onClick={() => setSelectedWorkshop(workshop.id)}
                          className={`p-6 rounded-sm border-2 text-left transition-all ${
                            selectedWorkshop === workshop.id
                              ? 'border-clay-terracotta bg-clay-terracotta/5'
                              : 'border-clay-warm-gray/50 hover:border-clay-terracotta/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold mb-1">{workshop.name}</h3>
                              <div className="flex items-center space-x-4 text-sm text-clay-ink/60">
                                <span className="flex items-center">
                                  <Clock size={16} className="mr-1" />
                                  {workshop.duration} min
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-semibold text-clay-terracotta">S${workshop.price}</p>
                              <p className="text-sm text-clay-ink/60">per person</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end mt-6">
                      <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleNext}
                        disabled={!selectedWorkshop}
                      >
                        Continue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )}

            {/* Step 2: Select Date & Time */}
            {step === 2 && (
              <ScrollReveal>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif">Choose Date & Time</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Date Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Select Date</label>
                      <div className="grid grid-cols-7 gap-2">
                        {dates.map((date) => (
                          <button
                            key={date.full}
                            onClick={() => setSelectedDate(date.full)}
                            className={`p-3 rounded-sm text-center transition-all ${
                              selectedDate === date.full
                                ? 'bg-clay-terracotta text-clay-white'
                                : 'bg-clay-sand/50 hover:bg-clay-warm-gray/50'
                            }`}
                          >
                            <div className="text-xs">{date.day}</div>
                            <div className="text-lg font-semibold">{date.date}</div>
                            <div className="text-xs">{date.month}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Select Time</label>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`py-3 px-2 rounded-sm text-sm transition-all ${
                              selectedTime === time
                                ? 'bg-clay-terracotta text-clay-white'
                                : 'bg-clay-sand/50 hover:bg-clay-warm-gray/50'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Participants */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Number of Participants</label>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setParticipantCount(Math.max(1, participantCount - 1))}
                        >
                          -
                        </Button>
                        <span className="text-2xl font-semibold w-12 text-center">{participantCount}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setParticipantCount(Math.min(8, participantCount + 1))}
                        >
                          +
                        </Button>
                        <span className="text-sm text-clay-ink/60">(max 8)</span>
                      </div>
                    </div>

                    <div className="flex justify-between mt-6">
                      <Button variant="outline" size="lg" onClick={handleBack}>
                        <ChevronLeft className="mr-2" size={20} />
                        Back
                      </Button>
                      <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleNext}
                        disabled={!selectedDate || !selectedTime}
                      >
                        Continue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )}

            {/* Step 3: Customer Details */}
            {step === 3 && (
              <ScrollReveal>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif">Your Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone</label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+65 1234 5678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Special Requests (Optional)</label>
                      <textarea
                        value={formData.specialRequests}
                        onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                        className="flex min-h-[100px] w-full rounded-sm border border-clay-ink/20 bg-clay-white px-4 py-3 text-base focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-clay-terracotta focus-visible:outline-offset-2"
                        placeholder="Birthday celebration, dietary requirements, etc."
                      />
                    </div>

                    <div className="flex justify-between mt-6">
                      <Button variant="outline" size="lg" onClick={handleBack}>
                        <ChevronLeft className="mr-2" size={20} />
                        Back
                      </Button>
                      <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleNext}
                        disabled={!formData.name || !formData.email || !formData.phone}
                      >
                        Review Booking
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <ScrollReveal>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif">Review & Confirm</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Order Summary */}
                    <div className="bg-clay-sand/50 p-6 rounded-sm">
                      <h3 className="font-semibold mb-4">Booking Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-clay-ink/70">Workshop</span>
                          <span className="font-medium">
                            {workshops.find(w => w.id === selectedWorkshop)?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-clay-ink/70">Date</span>
                          <span className="font-medium">{selectedDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-clay-ink/70">Time</span>
                          <span className="font-medium">{selectedTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-clay-ink/70">Participants</span>
                          <span className="font-medium">{participantCount}</span>
                        </div>
                        <div className="border-t border-clay-warm-gray/50 pt-3 flex justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="font-semibold text-clay-terracotta">
                            S${calculateTotal()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div>
                      <h3 className="font-semibold mb-3">Contact Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-clay-ink/70">Name:</span> {formData.name}</p>
                        <p><span className="text-clay-ink/70">Email:</span> {formData.email}</p>
                        <p><span className="text-clay-ink/70">Phone:</span> {formData.phone}</p>
                        {formData.specialRequests && (
                          <p><span className="text-clay-ink/70">Special Requests:</span> {formData.specialRequests}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between mt-6">
                      <Button variant="outline" size="lg" onClick={handleBack}>
                        <ChevronLeft className="mr-2" size={20} />
                        Back
                      </Button>
                      <Link href="/confirmation">
                        <Button variant="primary" size="xl">
                          Confirm & Pay
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

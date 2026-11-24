export interface Workshop {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  duration: number; // minutes
  inclusions: string[];
  images: string[];
  category: 'pottery-painting' | 'hand-building' | 'wheel-throwing' | 'private-events' | 'corporate';
  maxParticipants: number;
  minParticipants: number;
  faqs: FAQ[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  price: number;
  spotsAvailable: number;
  image: string;
}

export interface BookingSession {
  id: string;
  workshopId: string;
  date: string;
  time: string;
  duration: number;
  spotsAvailable: number;
  price: number;
}

export interface Booking {
  id: string;
  sessionId: string;
  workshopId: string;
  participantCount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequests?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  reference: string;
}

export interface StudioInfo {
  address: string;
  phone: string;
  email: string;
  hours: {
    day: string;
    open: string;
    close: string;
    closed?: boolean;
  }[];
  mapUrl: string;
}

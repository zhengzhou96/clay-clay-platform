# Clay Clay Pottery Studio Booking Platform

Database schema and booking engine core for Clay Clay's Singapore pottery studio.

## Structure

```
clay-clay-platform/
├── db/
│   └── migrations/
│       └── 001_initial_schema.sql    # Complete Supabase-compatible schema
├── types/
│   └── index.ts                       # TypeScript types for all entities
├── lib/
│   └── booking-engine/
│       └── index.ts                   # Core booking engine logic
├── scripts/
│   ├── run-migrations.ts              # Migration runner
│   └── cleanup-holds.ts               # Hold cleanup cron script
├── tests/
│   └── booking-engine/
│       └── booking-engine.test.ts     # Vitest test suite
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `customers` | Customer information |
| `workshop_types` | Workshop types (Pottery Painting, Hand Building, etc.) |
| `rooms` | Studio rooms with capacity |
| `sessions` | Scheduled workshop sessions |
| `bookings` | Customer bookings |
| `booking_holds` | Temporary seat reservations (15-min expiry) |
| `payments` | Payment records (HitPay integration) |
| `products` | Add-on products |
| `inventory_movements` | Inventory tracking |
| `audit_logs` | Audit trail |

### Key Features

- **Row Level Security (RLS)**: Customer data isolation
- **Atomic booking creation**: Advisory locks prevent overbooking
- **Temporary holds**: 15-minute seat reservations with automatic expiry
- **Audit trail**: Automatic logging of all mutations
- **Money in cents**: Integer-based SGD amounts

## Installation

```bash
npm install
```

## Running Migrations

```bash
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npm run db:migrate
```

Or manually run the SQL in `db/migrations/001_initial_schema.sql` via:
- Supabase Dashboard SQL Editor
- `psql` connection string
- Supabase CLI: `supabase db push`

## Booking Engine API

```typescript
import { createBookingEngine } from './lib/booking-engine';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, serviceRoleKey);
const engine = createBookingEngine({
  async query(sql, params) {
    const { data, error } = await supabase.rpc('execute_sql', { sql, params });
    if (error) throw error;
    return data;
  },
  async queryOne(sql, params) {
    const results = await this.query(sql, params);
    return results[0] ?? null;
  },
  async transaction(fn) {
    // Implement transaction support
    return await fn(this);
  },
});
```

### Session Availability

```typescript
// Get available sessions
const sessions = await engine.getAvailableSessions({
  workshopTypeId: 'uuid',
  date: '2024-01-15',
});

// Check specific session availability
const available = await engine.getAvailableSeats(sessionId);
const canBook = await engine.checkAvailability(sessionId, 3);
```

### Seat Holds

```typescript
// Create 15-minute hold
const hold = await engine.createHold(sessionId, customerId, 3);
// hold = { hold_id, session_id, seats, expires_at, expires_in_seconds }

// Release hold manually
await engine.releaseHold(holdId);

// Cleanup expired holds (run via cron)
const cleaned = await engine.cleanupExpiredHolds();
```

### Booking Creation

```typescript
// Create booking (with optional hold)
const booking = await engine.createBooking(
  sessionId,
  customerId,
  3, // participants
  9900, // total in cents (S$99)
  { holdId: hold.hold_id, notes: 'Special request' }
);
// booking = { booking_id, reference, session_id, customer_id, ... }
```

### Payment Processing

```typescript
// Create payment record
const payment = await engine.createPayment(bookingId, 9900, {
  hitpayRequestId: 'hp_req_xxx',
  checkoutUrl: 'https://hitpay.sg/checkout/xxx',
});

// Process webhook
const result = await engine.processWebhook({
  request_id: 'hp_req_xxx',
  status: 'completed',
  amount: 99,
  currency: 'SGD',
});
// result = { success, bookingId, message }
```

### Customer Management

```typescript
// Upsert customer
const customer = await engine.upsertCustomer(
  'user@example.com',
  'Name',
  '+65 9123 4567'
);

// Get customer bookings
const bookings = await engine.getCustomerBookings(customerId);
```

## Running Tests

```bash
npm test
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Test Coverage

- ✅ Concurrent last-seat booking (prevents overbooking)
- ✅ Abandoned checkout (hold expiry releases seats)
- ✅ Hold expiry (automatic cleanup)
- ✅ Duplicate webhook (idempotent processing)
- ✅ Booking status transitions
- ✅ Customer management

## Cron Setup

### Hold Cleanup (every 5 minutes)

**Vercel Cron:**
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-holds",
    "schedule": "*/5 * * * *"
  }]
}
```

**Traditional cron:**
```bash
*/5 * * * * cd /path/to/app && npm run db:cleanup-holds >> /var/log/clay-cleanup.log
```

## Business Rules

| Workshop Type | Duration | Base Price |
|--------------|----------|------------|
| Pottery Painting | 90 min | S$33 |
| Hand Building | 90 min | S$38 |
| Wheel Throwing | 90 min | S$40 |
| Private Event | 120 min | S$50 |
| Corporate | 90 min | S$40 |

- **Sessions**: 11am, 2pm, 4pm, 6pm (Singapore time)
- **Capacity**: 24-26 per session (configurable per room)
- **Hold duration**: 15 minutes (configurable)
- **Payment**: HitPay integration

## Concurrency Protection

1. **Advisory locks**: `pg_advisory_xact_lock()` per session during booking
2. **SELECT FOR UPDATE**: Locks holds and bookings during transactions
3. **Atomic functions**: `create_booking_atomic()` ensures consistency
4. **Hold expiry**: Automatic cleanup prevents ghost reservations

## Security

- **RLS policies**: Customers can only access their own data
- **Service role**: Required for admin operations
- **Audit logs**: All mutations tracked
- **Input validation**: Check constraints on money, counts, emails

## Next Steps

1. Deploy migrations to Supabase
2. Integrate booking engine with Next.js API routes
3. Set up HitPay webhook endpoint
4. Configure Vercel cron for hold cleanup
5. Add inventory management for products
6. Implement email notifications (confirmation, reminders)

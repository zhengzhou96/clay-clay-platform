-- Clay Clay Pottery Studio Booking Platform
-- Migration 001: Initial Schema
-- Supabase-compatible PostgreSQL migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE booking_status AS ENUM (
    'pending_payment',
    'confirmed',
    'cancelled',
    'completed',
    'no_show',
    'expired'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'authorized',
    'captured',
    'failed',
    'refunded',
    'cancelled'
);

CREATE TYPE audit_action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE'
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT customers_email_unique UNIQUE (email),
    CONSTRAINT customers_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Workshop types table
CREATE TABLE workshop_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    duration_min INTEGER NOT NULL DEFAULT 90,
    base_price_cents INTEGER NOT NULL DEFAULT 3300,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT workshop_types_name_unique UNIQUE (name),
    CONSTRAINT workshop_types_duration_positive CHECK (duration_min > 0),
    CONSTRAINT workshop_types_price_positive CHECK (base_price_cents >= 0)
);

-- Rooms table (for capacity management)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    default_capacity INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT rooms_capacity_positive CHECK (default_capacity > 0)
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_type_id UUID NOT NULL REFERENCES workshop_types(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    start_time_tz TIMESTAMPTZ NOT NULL,
    end_time_tz TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT sessions_end_after_start CHECK (end_time_tz > start_time_tz),
    CONSTRAINT sessions_capacity_positive CHECK (capacity > 0),
    CONSTRAINT sessions_duration_reasonable CHECK (
        EXTRACT(EPOCH FROM (end_time_tz - start_time_tz)) / 60 <= 180
    )
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    participant_count INTEGER NOT NULL DEFAULT 1,
    total_cents INTEGER NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending_payment',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    reference TEXT UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT bookings_participant_count_positive CHECK (participant_count > 0),
    CONSTRAINT bookings_total_positive CHECK (total_cents >= 0),
    CONSTRAINT bookings_reference_format CHECK (
        reference IS NULL OR reference ~* '^CLAY-[A-Z0-9]{8,12}$'
    )
);

-- Booking holds table (temporary seat reservations)
CREATE TABLE booking_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    seats INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT booking_holds_seats_positive CHECK (seats > 0),
    CONSTRAINT booking_holds_expiry_future CHECK (expires_at > NOW())
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    hitpay_request_id TEXT,
    hitpay_checkout_url TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SGD',
    status payment_status NOT NULL DEFAULT 'pending',
    webhook_payload JSONB,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT payments_amount_positive CHECK (amount_cents > 0),
    CONSTRAINT payments_hitpay_request_unique UNIQUE (hitpay_request_id)
);

-- Products table (add-ons, pottery pieces, etc.)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0,
    inventory_qty INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT products_price_non_negative CHECK (price_cents >= 0),
    CONSTRAINT products_inventory_non_negative CHECK (inventory_qty >= 0)
);

-- Inventory movements table
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    quantity_delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT inventory_movements_delta_non_zero CHECK (quantity_delta != 0)
);

-- Audit logs table
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    customer_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Workshop types
CREATE INDEX idx_workshop_types_active ON workshop_types(is_active) WHERE is_active = true;

-- Rooms
CREATE INDEX idx_rooms_active ON rooms(is_active) WHERE is_active = true;

-- Sessions
CREATE INDEX idx_sessions_workshop_type ON sessions(workshop_type_id);
CREATE INDEX idx_sessions_room ON sessions(room_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time_tz);
CREATE INDEX idx_sessions_end_time ON sessions(end_time_tz);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_sessions_date_range ON sessions USING GIST (
    tstzrange(start_time_tz, end_time_tz)
);

-- Bookings
CREATE INDEX idx_bookings_session ON bookings(session_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_reference ON bookings(reference);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_bookings_pending_payment ON bookings(session_id, status) 
    WHERE status = 'pending_payment';

-- Booking holds
CREATE INDEX idx_booking_holds_session ON booking_holds(session_id);
CREATE INDEX idx_booking_holds_expires_at ON booking_holds(expires_at);
CREATE INDEX idx_booking_holds_unclaimed ON booking_holds(session_id, expires_at) 
    WHERE claimed_booking_id IS NULL;
CREATE INDEX idx_booking_holds_expired ON booking_holds(expires_at) 
    WHERE expires_at < NOW() AND claimed_booking_id IS NULL;

-- Payments
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_hitpay_request ON payments(hitpay_request_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Products
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;

-- Inventory movements
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_booking ON inventory_movements(booking_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Audit logs
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_customer ON audit_logs(customer_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    reference TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        reference := 'CLAY-' || UPPER(substring(uuid_generate_v4()::text, 1, 8));
        SELECT COUNT(*) INTO exists_count FROM bookings WHERE reference = reference;
        EXIT WHEN exists_count = 0;
    END LOOP;
    RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- Function to get available seats for a session (accounts for holds and confirmed bookings)
CREATE OR REPLACE FUNCTION get_available_seats(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_capacity INTEGER;
    v_booked INTEGER;
    v_held INTEGER;
BEGIN
    -- Get session capacity
    SELECT capacity INTO v_capacity FROM sessions WHERE id = p_session_id;
    IF v_capacity IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count confirmed/pending participants
    SELECT COALESCE(SUM(participant_count), 0) INTO v_booked
    FROM bookings
    WHERE session_id = p_session_id
    AND status IN ('confirmed', 'pending_payment', 'completed');
    
    -- Count held seats (unexpired, unclaimed)
    SELECT COALESCE(SUM(seats), 0) INTO v_held
    FROM booking_holds
    WHERE session_id = p_session_id
    AND expires_at > NOW()
    AND claimed_booking_id IS NULL;
    
    RETURN GREATEST(0, v_capacity - v_booked - v_held);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if seats are available (with optional hold consideration)
CREATE OR REPLACE FUNCTION check_seat_availability(
    p_session_id UUID,
    p_seats INTEGER,
    p_hold_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_available INTEGER;
    v_current_hold INTEGER := 0;
BEGIN
    -- If checking with existing hold, subtract those seats
    IF p_hold_id IS NOT NULL THEN
        SELECT seats INTO v_current_hold
        FROM booking_holds
        WHERE id = p_hold_id
        AND expires_at > NOW();
        v_current_hold := COALESCE(v_current_hold, 0);
    END IF;
    
    v_available := get_available_seats(p_session_id);
    
    RETURN v_available >= (p_seats - v_current_hold);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to create a hold on seats
CREATE OR REPLACE FUNCTION create_seat_hold(
    p_session_id UUID,
    p_customer_id UUID,
    p_seats INTEGER,
    p_duration_minutes INTEGER DEFAULT 15
)
RETURNS UUID AS $$
DECLARE
    v_hold_id UUID;
    v_available INTEGER;
BEGIN
    -- Check availability first
    v_available := get_available_seats(p_session_id);
    
    IF v_available < p_seats THEN
        RAISE EXCEPTION 'Not enough available seats. Available: %, Requested: %', v_available, p_seats
        USING ERRCODE = '55000';
    END IF;
    
    -- Create the hold
    INSERT INTO booking_holds (session_id, customer_id, seats, expires_at)
    VALUES (p_session_id, p_customer_id, p_seats, NOW() + (p_duration_minutes || ' minutes')::INTERVAL)
    RETURNING id INTO v_hold_id;
    
    RETURN v_hold_id;
END;
$$ LANGUAGE plpgsql;

-- Function to claim a hold with a booking
CREATE OR REPLACE FUNCTION claim_hold_with_booking(
    p_hold_id UUID,
    p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_hold RECORD;
    v_booking RECORD;
BEGIN
    -- Get hold details
    SELECT * INTO v_hold FROM booking_holds WHERE id = p_hold_id FOR UPDATE;
    
    IF v_hold IS NULL THEN
        RAISE EXCEPTION 'Hold not found' USING ERRCODE = '55000';
    END IF;
    
    IF v_hold.expires_at <= NOW() THEN
        RAISE EXCEPTION 'Hold has expired' USING ERRCODE = '55000';
    END IF;
    
    IF v_hold.claimed_booking_id IS NOT NULL THEN
        RAISE EXCEPTION 'Hold already claimed' USING ERRCODE = '55000';
    END IF;
    
    -- Get booking details
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
    
    IF v_booking IS NULL THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = '55000';
    END IF;
    
    IF v_booking.session_id != v_hold.session_id THEN
        RAISE EXCEPTION 'Booking session does not match hold session' USING ERRCODE = '55000';
    END IF;
    
    IF v_booking.participant_count != v_hold.seats THEN
        RAISE EXCEPTION 'Booking participant count does not match hold seats' USING ERRCODE = '55000';
    END IF;
    
    -- Claim the hold
    UPDATE booking_holds SET claimed_booking_id = p_booking_id WHERE id = p_hold_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired holds
CREATE OR REPLACE FUNCTION cleanup_expired_holds()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM booking_holds
    WHERE expires_at < NOW()
    AND claimed_booking_id IS NULL;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to release a hold
CREATE OR REPLACE FUNCTION release_hold(p_hold_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM booking_holds WHERE id = p_hold_id AND claimed_booking_id IS NULL;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to handle booking status transitions
CREATE OR REPLACE FUNCTION transition_booking_status(
    p_booking_id UUID,
    p_new_status booking_status
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_status booking_status;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    SELECT status INTO v_current_status FROM bookings WHERE id = p_booking_id FOR UPDATE;
    
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = '55000';
    END IF;
    
    -- Validate transitions
    CASE
        WHEN v_current_status = 'pending_payment' AND p_new_status IN ('confirmed', 'cancelled', 'expired') THEN
            v_valid_transition := TRUE;
        WHEN v_current_status = 'confirmed' AND p_new_status IN ('completed', 'cancelled', 'no_show') THEN
            v_valid_transition := TRUE;
        WHEN v_current_status = 'cancelled' AND p_new_status = 'confirmed' THEN
            -- Allow re-activation within policy window
            v_valid_transition := TRUE;
        ELSE
            v_valid_transition := FALSE;
    END CASE;
    
    IF NOT v_valid_transition THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_new_status
        USING ERRCODE = '55000';
    END IF;
    
    -- Apply the transition
    UPDATE bookings SET 
        status = p_new_status,
        updated_at = NOW(),
        confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END
    WHERE id = p_booking_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to handle concurrent booking with advisory lock
CREATE OR REPLACE FUNCTION create_booking_atomic(
    p_session_id UUID,
    p_customer_id UUID,
    p_participant_count INTEGER,
    p_total_cents INTEGER,
    p_hold_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_booking_id UUID;
    v_reference TEXT;
    v_available INTEGER;
    v_hold_seats INTEGER := 0;
BEGIN
    -- Acquire advisory lock for this session to prevent concurrent bookings
    PERFORM pg_advisory_xact_lock(hashtext('session_booking' || p_session_id::text));
    
    -- If hold is provided, verify and get seat count
    IF p_hold_id IS NOT NULL THEN
        SELECT seats INTO v_hold_seats
        FROM booking_holds
        WHERE id = p_hold_id
        AND expires_at > NOW()
        AND claimed_booking_id IS NULL
        FOR UPDATE;
        
        IF v_hold_seats IS NULL THEN
            RAISE EXCEPTION 'Invalid or expired hold' USING ERRCODE = '55000';
        END IF;
        
        IF v_hold_seats != p_participant_count THEN
            RAISE EXCEPTION 'Hold seats do not match participant count' USING ERRCODE = '55000';
        END IF;
    END IF;
    
    -- Check availability (with hold consideration)
    v_available := get_available_seats(p_session_id);
    
    IF p_hold_id IS NOT NULL THEN
        -- Hold seats are already counted in get_available_seats
        IF v_available < 0 THEN
            RAISE EXCEPTION 'Session is fully booked' USING ERRCODE = '55000';
        END IF;
    ELSE
        IF v_available < p_participant_count THEN
            RAISE EXCEPTION 'Not enough available seats. Available: %, Requested: %', 
                v_available, p_participant_count USING ERRCODE = '55000';
        END IF;
    END IF;
    
    -- Generate reference
    v_reference := generate_booking_reference();
    
    -- Create the booking
    INSERT INTO bookings (
        session_id,
        customer_id,
        participant_count,
        total_cents,
        status,
        payment_status,
        reference
    ) VALUES (
        p_session_id,
        p_customer_id,
        p_participant_count,
        p_total_cents,
        'pending_payment',
        'pending',
        v_reference
    ) RETURNING id INTO v_booking_id;
    
    -- Claim the hold if provided
    IF p_hold_id IS NOT NULL THEN
        UPDATE booking_holds SET claimed_booking_id = v_booking_id WHERE id = p_hold_id;
    END IF;
    
    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_types_updated_at
    BEFORE UPDATE ON workshop_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
    END IF;
    
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        customer_id
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP::audit_action,
        v_old_values,
        v_new_values,
        NULL, -- user_id would come from context
        COALESCE(NEW.customer_id, OLD.customer_id)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_bookings
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Customers: Users can only see their own data
CREATE POLICY customers_select_own ON customers
    FOR SELECT USING (auth.uid() IS NULL OR id = (SELECT customer_id FROM bookings WHERE customer_id = id LIMIT 1));

CREATE POLICY customers_insert_own ON customers
    FOR INSERT WITH CHECK (true); -- Allow self-registration

CREATE POLICY customers_update_own ON customers
    FOR UPDATE USING (true); -- Allow updates via booking flow

-- Bookings: Customers can see their own bookings
CREATE POLICY bookings_select_own ON bookings
    FOR SELECT USING (
        auth.uid() IS NULL OR 
        customer_id IN (SELECT id FROM customers WHERE email = (SELECT auth.jwt()->>'email'))
    );

CREATE POLICY bookings_insert_own ON bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY bookings_update_own ON bookings
    FOR UPDATE USING (
        auth.uid() IS NULL OR 
        customer_id IN (SELECT id FROM customers WHERE email = (SELECT auth.jwt()->>'email'))
    );

-- Booking holds: Customers can manage their own holds
CREATE POLICY booking_holds_select_own ON booking_holds
    FOR SELECT USING (
        auth.uid() IS NULL OR 
        customer_id IS NULL OR 
        customer_id IN (SELECT id FROM customers WHERE email = (SELECT auth.jwt()->>'email'))
    );

CREATE POLICY booking_holds_insert_own ON booking_holds
    FOR INSERT WITH CHECK (true);

CREATE POLICY booking_holds_update_own ON booking_holds
    FOR UPDATE USING (
        auth.uid() IS NULL OR 
        customer_id IS NULL OR 
        customer_id IN (SELECT id FROM customers WHERE email = (SELECT auth.jwt()->>'email'))
    );

CREATE POLICY booking_holds_delete_own ON booking_holds
    FOR DELETE USING (
        auth.uid() IS NULL OR 
        customer_id IS NULL OR 
        customer_id IN (SELECT id FROM customers WHERE email = (SELECT auth.jwt()->>'email'))
    );

-- Payments: Customers can see their own payments
CREATE POLICY payments_select_own ON payments
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings WHERE customer_id IN (
                SELECT id FROM customers WHERE email = (SELECT auth.jwt()->>'email')
            )
        )
    );

CREATE POLICY payments_insert_own ON payments
    FOR INSERT WITH CHECK (true);

-- Inventory movements: Service role only
CREATE POLICY inventory_movements_service ON inventory_movements
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Default workshop types
INSERT INTO workshop_types (name, description, duration_min, base_price_cents) VALUES
    ('Pottery Painting', 'Paint your own pottery piece. Price includes one standard piece.', 90, 3300),
    ('Hand Building', 'Learn hand-building techniques to create unique pottery.', 90, 3800),
    ('Wheel Throwing', 'Master the pottery wheel with guided instruction.', 90, 4000),
    ('Private Event', 'Private studio booking for groups and special occasions.', 120, 5000),
    ('Corporate Workshop', 'Team-building pottery workshop for corporate groups.', 90, 4000);

-- Default room
INSERT INTO rooms (name, default_capacity) VALUES ('Main Studio', 24);

-- Sample products (add-ons)
INSERT INTO products (name, sku, description, price_cents, inventory_qty) VALUES
    ('Extra Pottery Piece (Small)', 'POTTERY-SMALL', 'Additional small pottery piece for painting', 800, 100),
    ('Extra Pottery Piece (Large)', 'POTTERY-LARGE', 'Additional large pottery piece for painting', 1500, 50),
    ('Glaze Upgrade', 'GLAZE-UPGRADE', 'Premium glaze finish upgrade', 500, 200),
    ('Gift Box', 'GIFT-BOX', 'Decorative gift box for finished piece', 300, 75),
    ('Studio Apron', 'APRON', 'Clay Clay branded apron (keep)', 1200, 30);

COMMENT ON TABLE customers IS 'Customer information for bookings';
COMMENT ON TABLE workshop_types IS 'Types of pottery workshops offered';
COMMENT ON TABLE rooms IS 'Studio rooms with capacity limits';
COMMENT ON TABLE sessions IS 'Scheduled workshop sessions';
COMMENT ON TABLE bookings IS 'Customer workshop bookings';
COMMENT ON TABLE booking_holds IS 'Temporary seat reservations (15-min expiry)';
COMMENT ON TABLE payments IS 'Payment records linked to bookings';
COMMENT ON TABLE products IS 'Add-on products and pottery pieces';
COMMENT ON TABLE inventory_movements IS 'Inventory tracking for products';
COMMENT ON TABLE audit_logs IS 'Audit trail for all data changes';

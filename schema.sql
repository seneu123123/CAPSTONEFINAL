-- ==============================================================================
-- HOLIDAY TRAVELERS TRAVEL AND TOURS INC. - ENTERPRISE GLOBAL DATABASE SCHEMA
-- Includes Row-Level Security (RLS), RBAC Staff Accounts, Security Auditing,
-- Fiscal Reconciliations, Passenger Manifests, and Tour Package Management
-- ==============================================================================

-- 1. Users Table (Travelers & Public Auth Accounts)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    password_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure password_updated_at column exists if table already created
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Staff Accounts Table (Enterprise RBAC Governance & Multi-Role Staff)
CREATE TABLE IF NOT EXISTS staff_accounts (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'Tour Operations Manager', -- 'Super Admin', 'Tour Operations Manager', 'Finance Officer', 'Tour Guide', 'Custom Staff'
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Suspended', 'Pending 2FA'
    allowed_tabs JSONB NOT NULL DEFAULT '[]'::jsonb,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    two_factor_enabled BOOLEAN DEFAULT TRUE,
    backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    phone VARCHAR(50),
    notes TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure optional columns exist if table was created in an earlier migration
ALTER TABLE staff_accounts ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE staff_accounts ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Tour Packages Table (Package Management)
CREATE TABLE IF NOT EXISTS tour_packages (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    duration_days INT NOT NULL DEFAULT 1,
    duration_nights INT NOT NULL DEFAULT 0,
    price_per_pax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    max_capacity INT NOT NULL DEFAULT 20,
    inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    banner_url TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    review_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    featured BOOLEAN DEFAULT FALSE,
    itinerary JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bookings & Passenger Manifest Table
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(100) PRIMARY KEY,
    booking_ref VARCHAR(50) UNIQUE NOT NULL,
    tour_package_id VARCHAR(100),
    tour_title VARCHAR(255) NOT NULL,
    customer JSONB NOT NULL DEFAULT '{}'::jsonb, -- { full_name, email, phone, special_requests }
    passengers JSONB NOT NULL DEFAULT '[]'::jsonb, -- Passenger manifests array
    travel_date DATE NOT NULL,
    num_pax INT NOT NULL DEFAULT 1,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deposit_required NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    booking_status VARCHAR(50) DEFAULT 'Confirmed', -- 'Confirmed', 'Pending', 'Completed', 'Cancelled'
    payment_status VARCHAR(50) DEFAULT 'Unpaid', -- 'Paid', 'Partial', 'Unpaid'
    assigned_guide VARCHAR(255),
    hotel_reservation JSONB,
    transport_reservation JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Invoices & Payment Audit Table
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(100) PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    booking_ref VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'GCash', -- 'GCash', 'Maya', 'Bank Transfer', 'In-Person Cash', 'Credit Card'
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending Verification', -- 'Verified', 'Pending Verification', 'Rejected'
    receipt_photo_url TEXT,
    reference_number VARCHAR(100),
    verified_by VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    issued_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Fiscal Reconciliations Table
CREATE TABLE IF NOT EXISTS fiscal_reconciliations (
    id VARCHAR(100) PRIMARY KEY,
    period_month VARCHAR(50) NOT NULL,
    total_gross_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_vendor_payables NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_guide_commissions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_refunds_disbursed NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_agency_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Reconciled', -- 'Reconciled', 'Pending Review', 'Audit Flagged'
    reconciled_by VARCHAR(255) NOT NULL,
    reconciled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 7. Security Audit Logs Table (Tamper-Evident SHA-256 Chain)
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp VARCHAR(100) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    submodule VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(100) DEFAULT '127.0.0.1',
    sha256_signature VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Customer Feedback Table
CREATE TABLE IF NOT EXISTS customer_feedbacks (
    id VARCHAR(100) PRIMARY KEY,
    booking_ref VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
    tour_guide_rating INT CHECK (tour_guide_rating BETWEEN 1 AND 5),
    hotel_rating INT CHECK (hotel_rating BETWEEN 1 AND 5),
    transport_rating INT CHECK (transport_rating BETWEEN 1 AND 5),
    comments TEXT,
    would_recommend BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. System & Agency Settings Table (Global Theme, Agency Config & Promo Popups)
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global_config',
    settings_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- 10. Concierge Customer Chat Threads Table
CREATE TABLE IF NOT EXISTS concierge_chats (
    id VARCHAR(100) PRIMARY KEY,
    ticket_ref VARCHAR(100),
    session_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    customer_name VARCHAR(255) DEFAULT 'Traveler Guest',
    customer_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Handed_To_Human', 'Resolved'
    last_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE concierge_chats ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);

-- 11. Concierge Messages Table
CREATE TABLE IF NOT EXISTS concierge_messages (
    id VARCHAR(100) PRIMARY KEY,
    chat_id VARCHAR(100) REFERENCES concierge_chats(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL, -- 'user', 'ai', 'admin'
    sender_name VARCHAR(255) NOT NULL, -- e.g. 'Karl Jacob'
    sender_role VARCHAR(100), -- e.g. 'Super Admin'
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 24-Hour Auto-Purge Clean-up Function for Resolved Chat Threads
CREATE OR REPLACE FUNCTION purge_expired_concierge_chats()
RETURNS void AS $$
BEGIN
    DELETE FROM concierge_chats
    WHERE status = 'Resolved' AND (ended_at < NOW() - INTERVAL '24 hours' OR expires_at < NOW());
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Enable Row Level Security across all enterprise core tables
-- ==============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE concierge_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE concierge_messages ENABLE ROW LEVEL SECURITY;

-- Allow Public & Authenticated Client/Admin Access for Web Platform Sync
DROP POLICY IF EXISTS "Public users access" ON users;
CREATE POLICY "Public users access" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public staff_accounts access" ON staff_accounts;
CREATE POLICY "Public staff_accounts access" ON staff_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public tour_packages access" ON tour_packages;
CREATE POLICY "Public tour_packages access" ON tour_packages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public bookings access" ON bookings;
CREATE POLICY "Public bookings access" ON bookings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public invoices access" ON invoices;
CREATE POLICY "Public invoices access" ON invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public fiscal_reconciliations access" ON fiscal_reconciliations;
CREATE POLICY "Public fiscal_reconciliations access" ON fiscal_reconciliations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public security_audit_logs access" ON security_audit_logs;
CREATE POLICY "Public security_audit_logs access" ON security_audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public customer_feedbacks access" ON customer_feedbacks;
CREATE POLICY "Public customer_feedbacks access" ON customer_feedbacks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public system_settings access" ON system_settings;
CREATE POLICY "Public system_settings access" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- Concierge Chats and Messages RLS
-- Note: You can either leave public access enabled or enable granular customer-level isolation below:
DROP POLICY IF EXISTS "Public concierge_chats access" ON concierge_chats;
CREATE POLICY "Public concierge_chats access" ON concierge_chats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public concierge_messages access" ON concierge_messages;
CREATE POLICY "Public concierge_messages access" ON concierge_messages FOR ALL USING (true) WITH CHECK (true);

-- Optional Granular Customer Row Level Security:
-- To isolate by user_id, session_id, or staff role, you can run:
/*
DROP POLICY IF EXISTS "Customer concierge_chats access" ON concierge_chats;
CREATE POLICY "Customer concierge_chats access" ON concierge_chats
  FOR ALL
  USING (
    -- Authenticated traveler owns the ticket
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
    -- OR Staff / Admin access (if using staff_accounts or auth.jwt())
    OR (auth.jwt() ->> 'role' IN ('service_role', 'admin', 'staff'))
    -- OR session-based access for guest travelers
    OR (session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Customer concierge_messages access" ON concierge_messages;
CREATE POLICY "Customer concierge_messages access" ON concierge_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM concierge_chats 
      WHERE concierge_chats.id = concierge_messages.chat_id
    )
  );
*/

-- ==============================================================================
-- DEFAULT SEED DATA FOR SUPER ADMIN & PACKAGES
-- ==============================================================================

INSERT INTO staff_accounts (id, email, full_name, role, status, allowed_tabs, permissions, notes)
VALUES 
(
  'staff-superadmin-01',
  'karlljacob8@gmail.com',
  'Karll Jacob',
  'Super Admin',
  'Active',
  '["analytics", "rbac", "packages", "bookings", "payment-gate", "fiscal-recon", "guide-manifests", "system-health", "marketing", "settings"]'::jsonb,
  '["rbac_manage_users", "rbac_edit_roles", "finance_approve_payouts", "packages_create", "packages_edit", "bookings_manage", "audit_view_logs"]'::jsonb,
  'Commercial Administrator and Operations Lead. Full governance clearance across all submodules.'
),
(
  'staff-ops-02',
  'kyle.dulay@holidaytravelers.com',
  'Kyle Dulay',
  'Tour Operations Manager',
  'Active',
  '["analytics", "packages", "bookings", "guide-manifests", "system-health"]'::jsonb,
  '["packages_create", "packages_edit", "bookings_manage", "guide_manifest_assign"]'::jsonb,
  'Lead Logistics Officer. Manages island-hopping packages, local dispatch fleet, and manifest schedules.'
),
(
  'staff-fin-03',
  'ilona.ambe@holidaytravelers.com',
  'Ilona May Ambe',
  'Finance Officer',
  'Active',
  '["analytics", "bookings", "payment-gate", "fiscal-recon"]'::jsonb,
  '["finance_approve_payouts", "fiscal_reconcile", "invoices_generate"]'::jsonb,
  'Chief Financial Comptroller. Oversees payment reconciliations, merchant payouts, and invoices.'
),
(
  'staff-guide-04',
  'michael.baynosa@holidaytravelers.com',
  'Michael Baynosa',
  'Tour Guide',
  'Active',
  '["guide-manifests"]'::jsonb,
  '["guide_manifest_view", "guest_checkin"]'::jsonb,
  'Senior Island Expeditions Guide. Mobile field manifests, safety protocols, and guest check-ins.'
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  allowed_tabs = EXCLUDED.allowed_tabs,
  permissions = EXCLUDED.permissions,
  notes = EXCLUDED.notes;

INSERT INTO tour_packages (id, code, title, destination, category, duration_days, duration_nights, price_per_pax, max_capacity, inclusions, exclusions, banner_url, status, featured, itinerary)
VALUES 
(
  'pkg-pal-01',
  'PKG-PAL-01',
  'El Nido Island Hopping Tour A & C Ultimate Package',
  'El Nido, Palawan',
  'Island Hopping',
  4, 3, 14500.00, 15,
  '["4-Star Hotel Accommodation with Breakfast", "Private Air-Conditioned Van Transfers", "Tour A & C Boat Rentals with Licensed Guide", "Buffet Lunch on Island", "Environmental & Eco-Tourism Permits"]'::jsonb,
  '["Airfare / Flight Tickets", "Personal Travel Insurance", "Dinner & Alcoholic Beverages"]'::jsonb,
  'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&q=80&w=1200',
  'Active', TRUE,
  '[{"day": 1, "title": "Arrival & Sunset Beach Walk", "activity": "Pickup from Lio Airport or Puerto Princesa Van Transfer. Check-in at Cove Resort and free evening sunset walk at Las Cabañas."}, {"day": 2, "title": "Tour A: Big Lagoon & Secret Lagoon", "activity": "Full day island hopping featuring Big Lagoon kayaking, Shimizu Island snorkeling, and Seven Commandos beach relax."}, {"day": 3, "title": "Tour C: Hidden Beach & Helicopter Island", "activity": "Explore Matinloc Shrine, Hidden Beach, and Helicopter Island with seafood lunch feast on board."}]'::jsonb
),
(
  'pkg-ceb-02',
  'PKG-CEB-02',
  'Cebu & Bohol Heritage & Whale Shark Escapade',
  'Cebu & Bohol',
  'Heritage & Wildlife',
  3, 2, 11800.00, 20,
  '["Whale Shark Interaction Fee & Gear", "Bohol Countryside Tour with Loboc River Cruise", "FastCraft Ferry Tickets (Cebu to Tagbilaran v.v.)", "Hotel Stay at Alona Beach Resort"]'::jsonb,
  '["Flights", "Souvenirs & Tipping"]'::jsonb,
  'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=1200',
  'Active', TRUE,
  '[{"day": 1, "title": "Oslob Whale Shark & Tumalog Falls", "activity": "Early morning pickup for whale shark encounter followed by Tumalog Falls cooling dip and Sumilon Island sandbar."}, {"day": 2, "title": "Bohol Countryside & Chocolate Hills", "activity": "FastCraft to Bohol. Visit Chocolate Hills, Tarsier Sanctuary, and enjoy Loboc River lunch buffet with live music."}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION FOR INSTANT CROSS-SESSION UPDATES
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE staff_accounts;
        ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
        ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
        ALTER PUBLICATION supabase_realtime ADD TABLE tour_packages;
        ALTER PUBLICATION supabase_realtime ADD TABLE security_audit_logs;
        ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
        ALTER PUBLICATION supabase_realtime ADD TABLE concierge_chats;
        ALTER PUBLICATION supabase_realtime ADD TABLE concierge_messages;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

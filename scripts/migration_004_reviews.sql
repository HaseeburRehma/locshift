-- migration_004_reviews.sql
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  customer_name TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  review_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  token_used_at TIMESTAMPTZ,
  source TEXT DEFAULT 'email' CHECK (source IN ('email','whatsapp','manual')),
  admin_response TEXT,
  admin_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_token ON reviews(review_token);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(is_published, rating);

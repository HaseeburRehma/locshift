-- 1. Add budget column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget text;

-- 2. Ensure lead_marketplace table exists
CREATE TABLE IF NOT EXISTS lead_marketplace (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
    price decimal(10,2) NOT NULL,
    status text DEFAULT 'active',
    is_exclusive boolean DEFAULT false,
    listed_at timestamp with time zone DEFAULT now(),
    lead_preview jsonb DEFAULT '{}'::jsonb
);

-- 3. Elevate jhaseeb718@gmail.com to admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'jhaseeb718@gmail.com';

-- 4. In case the user is auth.users but not in profiles yet (though screenshot shows they are)
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}' 
WHERE email = 'jhaseeb718@gmail.com';

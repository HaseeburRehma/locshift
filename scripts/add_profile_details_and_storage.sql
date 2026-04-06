-- 1. Extend the profiles table to include personal details fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS bio text;

-- 2. Populate first_name and last_name from full_name if present
UPDATE public.profiles
SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE 
                WHEN position(' ' in full_name) > 0 THEN substr(full_name, position(' ' in full_name) + 1)
                ELSE ''
              END
WHERE first_name IS NULL AND full_name IS NOT NULL;

-- 3. Create the 'avatars' storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Create policies for the avatars bucket directly (RLS is already active by default in Supabase)
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar." ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar." ON storage.objects
    FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatar." ON storage.objects
    FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Run this in your Supabase SQL Editor to make jhaseeb718@gmail.com an admin
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'jhaseeb718@gmail.com'
);

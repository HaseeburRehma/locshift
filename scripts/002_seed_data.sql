-- Seed technicians for NRW region
INSERT INTO technicians (name, email, phone, service_area, skills) VALUES
  ('Max Müller', 'max@fixdone.de', '+49 176 1234567', ARRAY['Düsseldorf', 'Köln', 'Essen'], ARRAY['fuse box', 'wiring', 'lighting', 'outlets']),
  ('Stefan Schmidt', 'stefan@fixdone.de', '+49 176 2345678', ARRAY['Dortmund', 'Bochum', 'Gelsenkirchen'], ARRAY['fuse box', 'smart home', 'ev charging']),
  ('Thomas Weber', 'thomas@fixdone.de', '+49 176 3456789', ARRAY['Köln', 'Bonn', 'Leverkusen'], ARRAY['emergency repairs', 'industrial', 'rewiring'])
ON CONFLICT DO NOTHING;

-- Seed sample leads for demo
INSERT INTO leads (name, phone, postcode, city, description, service_type, job_type, urgency, estimated_value, priority, status, source) VALUES
  ('Anna Becker', '+49 151 9876543', '40213', 'Düsseldorf', 'Fuse box keeps tripping in my apartment. Happens every time I use the washing machine.', 'electrician', 'fuse box repair', 'high', '€400-€900', 'dispatch technician', 'new', 'website'),
  ('Klaus Hoffmann', '+49 152 8765432', '50667', 'Köln', 'Need new outlets installed in home office, 4 outlets total.', 'electrician', 'outlet installation', 'medium', '€200-€400', 'schedule', 'qualified', 'google_ads'),
  ('Maria Fischer', '+49 153 7654321', '44135', 'Dortmund', 'Smart home wiring consultation for new apartment.', 'electrician', 'smart home', 'low', '€500-€1500', 'schedule', 'scheduled', 'meta_ads'),
  ('Peter Braun', '+49 154 6543210', '45127', 'Essen', 'Emergency - no power in half the house since this morning!', 'electrician', 'emergency repair', 'urgent', '€300-€800', 'dispatch technician', 'assigned', 'website')
ON CONFLICT DO NOTHING;

-- Create jobs for assigned/scheduled leads
INSERT INTO jobs (lead_id, technician_id, scheduled_time, status)
SELECT 
  l.id,
  t.id,
  NOW() + INTERVAL '1 day',
  'scheduled'
FROM leads l
CROSS JOIN (SELECT id FROM technicians WHERE name = 'Max Müller' LIMIT 1) t
WHERE l.name = 'Maria Fischer'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (lead_id, technician_id, scheduled_time, status)
SELECT 
  l.id,
  t.id,
  NOW() + INTERVAL '2 hours',
  'in_progress'
FROM leads l
CROSS JOIN (SELECT id FROM technicians WHERE name = 'Stefan Schmidt' LIMIT 1) t
WHERE l.name = 'Peter Braun'
ON CONFLICT DO NOTHING;

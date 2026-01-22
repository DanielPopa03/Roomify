-- Add smoker_friendly and pet_friendly columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS smoker_friendly BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT false;

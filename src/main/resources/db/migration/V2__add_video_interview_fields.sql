-- V2__add_video_interview_fields.sql
-- Adds columns for Video Interview feature to the users table

ALTER TABLE users ADD COLUMN video_url TEXT;
ALTER TABLE users ADD COLUMN video_transcript TEXT;
ALTER TABLE users ADD COLUMN job_title VARCHAR(255);
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN is_video_public BOOLEAN DEFAULT FALSE;

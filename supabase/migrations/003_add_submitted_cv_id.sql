-- Add submitted_cv_id to job_positions
-- This tracks which tailored CV version was actually submitted for the application

ALTER TABLE job_positions 
ADD COLUMN IF NOT EXISTS submitted_cv_id UUID REFERENCES tailored_cvs(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_positions_submitted_cv ON job_positions(submitted_cv_id);

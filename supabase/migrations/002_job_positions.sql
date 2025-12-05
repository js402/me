-- Job Position Management & Tailored CV Storage Migration
-- Run this in Supabase SQL Editor
-- This migration is idempotent and can be run multiple times safely

-- ============================================================================
-- TABLE: job_positions
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Job Details
    company_name VARCHAR(255) NOT NULL,
    position_title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    job_url VARCHAR(500),
    location VARCHAR(255),
    salary_range VARCHAR(100),
    
    -- Match Data (from job match analysis)
    match_score INTEGER,
    matching_skills TEXT[],
    missing_skills TEXT[],
    recommendations TEXT[],
    
    -- Application Tracking
    status VARCHAR(50) DEFAULT 'saved',
    applied_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_match_score CHECK (match_score >= 0 AND match_score <= 100),
    CONSTRAINT valid_status CHECK (status IN ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'))
);

-- Indexes for job_positions
CREATE INDEX IF NOT EXISTS idx_job_positions_user_id ON job_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_status ON job_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_positions_created ON job_positions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_positions_match_score ON job_positions(user_id, match_score DESC);

-- ============================================================================
-- TABLE: tailored_cvs
-- ============================================================================

CREATE TABLE IF NOT EXISTS tailored_cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_position_id UUID NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
    
    -- CV Content
    original_cv_hash VARCHAR(64) NOT NULL,
    tailored_content TEXT NOT NULL,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique versions per position
    UNIQUE(job_position_id, version)
);

-- Indexes for tailored_cvs
CREATE INDEX IF NOT EXISTS idx_tailored_cvs_user_id ON tailored_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_cvs_position ON tailored_cvs(job_position_id);
CREATE INDEX IF NOT EXISTS idx_tailored_cvs_active ON tailored_cvs(job_position_id, is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on job_positions
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view own positions" ON job_positions;
DROP POLICY IF EXISTS "Users can insert own positions" ON job_positions;
DROP POLICY IF EXISTS "Users can update own positions" ON job_positions;
DROP POLICY IF EXISTS "Users can delete own positions" ON job_positions;

-- Create policies for job_positions
CREATE POLICY "Users can view own positions"
    ON job_positions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
    ON job_positions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
    ON job_positions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own positions"
    ON job_positions FOR DELETE
    USING (auth.uid() = user_id);

-- Enable RLS on tailored_cvs
ALTER TABLE tailored_cvs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view own tailored CVs" ON tailored_cvs;
DROP POLICY IF EXISTS "Users can insert own tailored CVs" ON tailored_cvs;
DROP POLICY IF EXISTS "Users can delete own tailored CVs" ON tailored_cvs;

-- Create policies for tailored_cvs
CREATE POLICY "Users can view own tailored CVs"
    ON tailored_cvs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tailored CVs"
    ON tailored_cvs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tailored CVs"
    ON tailored_cvs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Reuse existing update_updated_at_column function if it exists
-- Otherwise create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for job_positions updated_at
DROP TRIGGER IF EXISTS update_job_positions_updated_at ON job_positions;
CREATE TRIGGER update_job_positions_updated_at
    BEFORE UPDATE ON job_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Deactivate old CV versions
-- ============================================================================

CREATE OR REPLACE FUNCTION deactivate_old_cv_versions()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new CV is inserted, deactivate all other versions for this position
    IF NEW.is_active = true THEN
        UPDATE tailored_cvs
        SET is_active = false
        WHERE job_position_id = NEW.job_position_id
          AND id != NEW.id
          AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-deactivate old versions
DROP TRIGGER IF EXISTS deactivate_old_versions_trigger ON tailored_cvs;
CREATE TRIGGER deactivate_old_versions_trigger
    AFTER INSERT ON tailored_cvs
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_old_cv_versions();

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify setup)
-- ============================================================================

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('job_positions', 'tailored_cvs');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('job_positions', 'tailored_cvs');

-- Check policies exist
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('job_positions', 'tailored_cvs');

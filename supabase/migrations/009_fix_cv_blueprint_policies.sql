-- ============================================================================
-- Migration: 009_fix_cv_blueprint_policies.sql
-- Description: Fix duplicate policy creation issues for CV blueprints
-- ============================================================================

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view own blueprint" ON cv_blueprints;
DROP POLICY IF EXISTS "Users can insert own blueprint" ON cv_blueprints;
DROP POLICY IF EXISTS "Users can update own blueprint" ON cv_blueprints;
DROP POLICY IF EXISTS "Users can view own blueprint changes" ON cv_blueprint_changes;
DROP POLICY IF EXISTS "Users can insert own blueprint changes" ON cv_blueprint_changes;

-- Recreate policies for cv_blueprints table
CREATE POLICY "Users can view own blueprint"
    ON cv_blueprints FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blueprint"
    ON cv_blueprints FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blueprint"
    ON cv_blueprints FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Recreate policies for cv_blueprint_changes table
CREATE POLICY "Users can view own blueprint changes"
    ON cv_blueprint_changes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blueprint changes"
    ON cv_blueprint_changes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE cv_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_blueprint_changes ENABLE ROW LEVEL SECURITY;

-- Grant permissions (re-run to ensure they exist)
GRANT SELECT, INSERT, UPDATE ON cv_blueprints TO authenticated;
GRANT SELECT, INSERT ON cv_blueprint_changes TO authenticated;

-- Grant function permissions (re-run to ensure they exist)
GRANT EXECUTE ON FUNCTION get_or_create_cv_blueprint(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_blueprint_change(UUID, UUID, VARCHAR, TEXT, JSONB, JSONB, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_data_completeness(JSONB) TO authenticated;

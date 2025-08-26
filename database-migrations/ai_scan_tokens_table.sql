-- AI Scan Tokens Table for Rate Limiting
-- Tracks daily AI scan token usage per user

CREATE TABLE ai_scan_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User who owns these tokens
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Token tracking
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tokens_used INTEGER DEFAULT 0,
    tokens_limit INTEGER DEFAULT 5, -- Default 5 tokens per day
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per date
    UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX idx_ai_scan_tokens_user_date ON ai_scan_tokens(user_id, date);
CREATE INDEX idx_ai_scan_tokens_organization ON ai_scan_tokens(organization_id);

-- RLS (Row Level Security) policies
ALTER TABLE ai_scan_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own token usage
CREATE POLICY "Users can view own ai scan tokens" ON ai_scan_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own token records
CREATE POLICY "Users can create own ai scan tokens" ON ai_scan_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own token usage
CREATE POLICY "Users can update own ai scan tokens" ON ai_scan_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_scan_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ai_scan_tokens_updated_at_trigger
    BEFORE UPDATE ON ai_scan_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_scan_tokens_updated_at();

-- Function to check if user has available tokens
CREATE OR REPLACE FUNCTION check_ai_scan_tokens(user_uuid UUID, required_tokens INTEGER DEFAULT 1)
RETURNS TABLE(
    has_tokens BOOLEAN,
    tokens_remaining INTEGER,
    tokens_limit INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    current_usage ai_scan_tokens%ROWTYPE;
BEGIN
    -- Get or create today's usage record
    SELECT * INTO current_usage
    FROM ai_scan_tokens
    WHERE user_id = user_uuid 
    AND date = CURRENT_DATE;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO ai_scan_tokens (user_id, organization_id, date, tokens_used, tokens_limit)
        SELECT user_uuid, (SELECT organization_id FROM profiles WHERE id = user_uuid), CURRENT_DATE, 0, 5
        RETURNING * INTO current_usage;
    END IF;
    
    -- Calculate remaining tokens and reset time (midnight tomorrow)
    RETURN QUERY SELECT 
        (current_usage.tokens_used + required_tokens) <= current_usage.tokens_limit as has_tokens,
        GREATEST(0, current_usage.tokens_limit - current_usage.tokens_used) as tokens_remaining,
        current_usage.tokens_limit,
        (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE as reset_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume AI scan tokens
CREATE OR REPLACE FUNCTION consume_ai_scan_tokens(user_uuid UUID, tokens_to_consume INTEGER DEFAULT 1)
RETURNS TABLE(
    success BOOLEAN,
    tokens_remaining INTEGER,
    tokens_limit INTEGER,
    message TEXT
) AS $$
DECLARE
    current_usage ai_scan_tokens%ROWTYPE;
    available_tokens INTEGER;
BEGIN
    -- Get today's usage record
    SELECT * INTO current_usage
    FROM ai_scan_tokens
    WHERE user_id = user_uuid 
    AND date = CURRENT_DATE;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO ai_scan_tokens (user_id, organization_id, date, tokens_used, tokens_limit)
        SELECT user_uuid, (SELECT organization_id FROM profiles WHERE id = user_uuid), CURRENT_DATE, 0, 5
        RETURNING * INTO current_usage;
    END IF;
    
    available_tokens := current_usage.tokens_limit - current_usage.tokens_used;
    
    -- Check if user has enough tokens
    IF available_tokens >= tokens_to_consume THEN
        -- Consume tokens
        UPDATE ai_scan_tokens 
        SET tokens_used = tokens_used + tokens_to_consume
        WHERE user_id = user_uuid AND date = CURRENT_DATE;
        
        RETURN QUERY SELECT 
            TRUE as success,
            GREATEST(0, available_tokens - tokens_to_consume) as tokens_remaining,
            current_usage.tokens_limit,
            'Tokens consumed successfully'::TEXT as message;
    ELSE
        -- Not enough tokens
        RETURN QUERY SELECT 
            FALSE as success,
            available_tokens as tokens_remaining,
            current_usage.tokens_limit,
            'Insufficient AI scan tokens for today'::TEXT as message;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current token status
CREATE OR REPLACE FUNCTION get_user_ai_scan_status(user_uuid UUID)
RETURNS TABLE(
    tokens_used INTEGER,
    tokens_remaining INTEGER,
    tokens_limit INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE,
    can_scan BOOLEAN
) AS $$
DECLARE
    current_usage ai_scan_tokens%ROWTYPE;
BEGIN
    -- Get today's usage record
    SELECT * INTO current_usage
    FROM ai_scan_tokens
    WHERE user_id = user_uuid 
    AND date = CURRENT_DATE;
    
    -- If no record exists, return default values
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            0 as tokens_used,
            5 as tokens_remaining,
            5 as tokens_limit,
            (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE as reset_time,
            TRUE as can_scan;
    ELSE
        RETURN QUERY SELECT 
            current_usage.tokens_used,
            GREATEST(0, current_usage.tokens_limit - current_usage.tokens_used) as tokens_remaining,
            current_usage.tokens_limit,
            (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE as reset_time,
            (current_usage.tokens_used < current_usage.tokens_limit) as can_scan;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example usage and comments
/*
Usage Examples:

-- Check if user has tokens available
SELECT * FROM check_ai_scan_tokens('user-uuid-here', 1);

-- Consume tokens (when AI scan is performed)
SELECT * FROM consume_ai_scan_tokens('user-uuid-here', 1);

-- Get user's current status
SELECT * FROM get_user_ai_scan_status('user-uuid-here');

Features:
- Daily reset at midnight
- 5 tokens per user per day (configurable)
- Tracks usage per user and organization
- Prevents over-usage with database constraints
- Provides remaining tokens and reset time
- Secure functions with SECURITY DEFINER
*/
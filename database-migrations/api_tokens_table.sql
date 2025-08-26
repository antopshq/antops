-- API Tokens Table for ANTOPS
-- This table stores API tokens for programmatic access to the ANTOPS API

CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User who owns this token
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Token details
    name VARCHAR(255) NOT NULL, -- User-friendly name like "GitHub Integration", "Mobile App"
    token_hash TEXT NOT NULL UNIQUE, -- Hashed version of the actual token (never store plain text)
    token_prefix VARCHAR(20) NOT NULL, -- First few chars for identification (antops_sk_1234...)
    
    -- Permissions and scope
    permissions JSONB DEFAULT '["read", "write"]', -- Array of permissions
    scope TEXT DEFAULT 'full', -- 'full', 'incidents_only', 'read_only', etc.
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    usage_count INTEGER DEFAULT 0,
    
    -- Lifecycle management
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = no expiration
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_organization_id ON api_tokens(organization_id);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX idx_api_tokens_active ON api_tokens(is_active) WHERE is_active = true;
CREATE INDEX idx_api_tokens_expires_at ON api_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- RLS (Row Level Security) policies
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "Users can view own api tokens" ON api_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create tokens for themselves
CREATE POLICY "Users can create own api tokens" ON api_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens (deactivate, update name, etc.)
CREATE POLICY "Users can update own api tokens" ON api_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own api tokens" ON api_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_api_tokens_updated_at_trigger
    BEFORE UPDATE ON api_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_api_tokens_updated_at();

-- Function to clean up expired tokens (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_api_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_tokens 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Example usage and comments
/*
Token format: antops_sk_live_1234567890abcdef1234567890abcdef12345678
             ^prefix  ^env ^random_32_chars

Prefix meanings:
- antops_sk = ANTOPS Secret Key
- live = production environment  
- test = test/development environment

Usage:
- Store only the hash of the full token in token_hash
- Store the first 12 characters in token_prefix for display
- Never log or expose the full token after initial generation
*/
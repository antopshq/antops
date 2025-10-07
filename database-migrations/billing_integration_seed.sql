-- Insert default billing configuration for existing organizations
INSERT INTO billing_integrations (organization_id, enabled, current_plan)
SELECT id, false, 'free'
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM billing_integrations)
ON CONFLICT (organization_id) DO NOTHING;
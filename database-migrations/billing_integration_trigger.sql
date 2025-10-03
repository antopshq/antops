-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_billing_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_billing_integrations_updated_at
  BEFORE UPDATE ON billing_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_integrations_updated_at();
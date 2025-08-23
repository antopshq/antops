-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types for enums
CREATE TYPE priority_type AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status_type AS ENUM ('open', 'investigating', 'resolved', 'closed');
CREATE TYPE change_status_type AS ENUM ('draft', 'pending', 'approved', 'in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE problem_status_type AS ENUM ('identified', 'investigating', 'known_error', 'resolved', 'closed');

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create problems table
CREATE TABLE problems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority priority_type NOT NULL DEFAULT 'medium',
  status problem_status_type NOT NULL DEFAULT 'identified',
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  root_cause TEXT,
  workaround TEXT,
  solution TEXT,
  tags TEXT[] DEFAULT '{}',
  affected_services TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create incidents table
CREATE TABLE incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority priority_type NOT NULL DEFAULT 'medium',
  status incident_status_type NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  problem_id UUID REFERENCES problems(id),
  tags TEXT[] DEFAULT '{}',
  affected_services TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create changes table
CREATE TABLE changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status change_status_type NOT NULL DEFAULT 'draft',
  priority priority_type NOT NULL DEFAULT 'medium',
  requested_by UUID REFERENCES profiles(id) NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  rollback_plan TEXT NOT NULL,
  test_plan TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  affected_services TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create comments table
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  change_id UUID REFERENCES changes(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT comments_reference_check CHECK (
    (incident_id IS NOT NULL AND change_id IS NULL AND problem_id IS NULL) OR
    (incident_id IS NULL AND change_id IS NOT NULL AND problem_id IS NULL) OR
    (incident_id IS NULL AND change_id IS NULL AND problem_id IS NOT NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for problems
CREATE POLICY "Users can view all problems" ON problems
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert problems" ON problems
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update problems they created or are assigned to" ON problems
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to
  );

-- Create policies for incidents
CREATE POLICY "Users can view all incidents" ON incidents
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert incidents" ON incidents
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update incidents they created or are assigned to" ON incidents
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to
  );

-- Create policies for changes
CREATE POLICY "Users can view all changes" ON changes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert changes" ON changes
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Users can update changes they requested or are assigned to" ON changes
  FOR UPDATE USING (
    auth.uid() = requested_by OR 
    auth.uid() = assigned_to
  );

-- Create policies for comments
CREATE POLICY "Users can view all comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = author_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_changes_updated_at BEFORE UPDATE ON changes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Sample data will be inserted after you create your first user account
-- The app will work without sample data - incidents will be created when users sign up and create them
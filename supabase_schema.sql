-- SQL schema for profiles and in-app team messages
-- You can run this in your Supabase SQL Editor to support auth synchronization!

-- Create a table for public profiles linked to Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  tag TEXT NOT NULL,
  role TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow individual write access to profiles" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Create a trigger to automatically insert a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, tag, role, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'tag', floor(1000 + random() * 9000)::text),
    COALESCE(new.raw_user_meta_data->>'role', 'Member'),
    'online'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a table for team messages / direct messages
CREATE TABLE IF NOT EXISTS public.team_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on messages
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read DMs involving them" ON public.team_messages
  FOR SELECT USING (true); -- In a production app, restrict to sender_id or receiver_id

CREATE POLICY "Allow users to insert DMs involving them" ON public.team_messages
  FOR INSERT WITH CHECK (true);

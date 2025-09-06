-- SQL Schema for Атэелька Points Management System
-- Execute this in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS public.user (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fio TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    points INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_fio TEXT NOT NULL,
    username VARCHAR(50) NOT NULL,
    product VARCHAR(255) NOT NULL,
    cost INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.user(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.user(role);
CREATE INDEX IF NOT EXISTS idx_users_fio ON public.user(fio);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_username ON public.orders(username);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (since we're using anon key)
-- In production, you should create proper authentication policies
CREATE POLICY "Allow all operations for anonymous users on users" ON public.user
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for anonymous users on orders" ON public.orders
    FOR ALL USING (true);

-- Insert default admin user (using 'user' table name)
INSERT INTO public.user (username, password, fio, role, points) 
VALUES ('admin', '1234', 'VG9yb3AgR2xlYg==', 'superadmin', 1)
ON CONFLICT (username) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.user 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
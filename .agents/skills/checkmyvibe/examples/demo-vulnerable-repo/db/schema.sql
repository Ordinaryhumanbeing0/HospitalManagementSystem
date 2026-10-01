-- Schema for Demo Vulnerable Repo

-- Table 1: Users/Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    username TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Missing RLS: No "ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;" is called here.

-- Table 2: Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY,
    user_id UUID,
    product_name TEXT,
    price_cents INTEGER,
    status TEXT
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Database Misconfiguration: Overly permissive allow-all policy using (true)
CREATE POLICY "allow_all_orders" ON public.orders
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

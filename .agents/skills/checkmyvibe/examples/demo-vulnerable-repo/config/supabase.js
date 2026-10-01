const { createClient } = require('@supabase/supabase-js');

// Planted Secret: Hardcoded Google API Key (AIza...) in code file
const GOOGLE_API_KEY = "AIzaSyD-aBcDeFgHiJkLmNoPqRsTuVwXyZ12345";

// Mock Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy_anon_key_here';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  supabase,
  GOOGLE_API_KEY
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iqtwhrtywrginsrpjmkn.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    // Just testing the syntax of the select query, we don't care if RLS blocks the data
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*, users(name), user_settings(dark_mode, notifications_enabled, theme_color, language)')
        .limit(1);

    console.log("TEST - Join Syntax Check:");
    if (error) console.error("Error Object:", JSON.stringify(error, null, 2));
    else console.log("Success, data returned (even if empty due to RLS):", data);
}

testFetch();

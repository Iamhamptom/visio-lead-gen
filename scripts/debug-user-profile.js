require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Environment Variables in .env.local');
    process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Key Length:', supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkUser(email) {
    console.log(`Checking user: ${email}`);

    // 1. Get User ID from Auth
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error listing users:', userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found in auth.users');
        return;
    }

    console.log('User found:', user.id);
    console.log('App Metadata:', user.app_metadata);
    console.log('User Metadata:', user.user_metadata);

    // 2. Check Profiles Table
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }

    if (profiles.length === 0) {
        console.error('NO PROFILE FOUND in public.profiles table!');
    } else if (profiles.length > 1) {
        console.error('MULTIPLE PROFILES FOUND! This will break .single()', profiles);
    } else {
        console.log('Profile found:', profiles[0]);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: node scripts/debug-user-profile.js <email>');
    process.exit(1);
}
checkUser(email);

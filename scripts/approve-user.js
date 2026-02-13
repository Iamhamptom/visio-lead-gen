require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase Environment Variables in .env.local');
    process.exit(1);
}

console.log('Initializing Supabase client...');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function approveUser(email) {
    console.log(`Looking up user: ${email}`);

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`User ${email} not found.`);
        return;
    }

    console.log(`Found user ${user.id} (${user.email}). Approving...`);

    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { app_metadata: { ...user.app_metadata, approved: true } }
    );

    if (updateError) {
        console.error('Error updating user:', updateError);
    } else {
        console.log(`SUCCESS: User ${email} approved!`);
        console.log('New Status:', data.user.app_metadata.approved ? 'Approved' : 'Pending');
    }
}

approveUser('coolpixiemusic@gmail.com');

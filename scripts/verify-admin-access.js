require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

async function verifyAdmin(email) {
    console.log(`Verifying admin status for: ${email}`);

    // 1. Check env-based allowlist (mirrors lib/api-auth.ts)
    const isInAllowlist = ADMIN_EMAILS.includes(email.toLowerCase());
    console.log(`- Is in ADMIN_EMAILS allowlist? ${isInAllowlist ? 'YES' : 'NO'}`);

    // 2. Check Database Role
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.log("- User not found in Auth database.");
        return;
    }

    const role = user.app_metadata?.role;
    console.log(`- App Metadata Role: ${role || 'None'}`);

    if (isInAllowlist || role === 'admin') {
        console.log("SUCCESS: User has admin access.");
    } else {
        console.log("FAILURE: User is NOT an admin (needs 'admin' role or be in ADMIN_EMAILS env var).");

        console.log("Attempting to grant admin role...");
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { app_metadata: { ...user.app_metadata, role: 'admin' } }
        );

        if (!updateError) console.log("SUCCESS: Admin role granted!");
        else console.error("Failed to grant admin role:", updateError);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: node scripts/verify-admin-access.js <email>');
    process.exit(1);
}
verifyAdmin(email);

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const ADMIN_EMAILS = ['tonydavidhampton@gmail.com', 'hamptonmusicgroup@gmail.com'];

async function verifyAdmin(email) {
    console.log(`Verifying admin status for: ${email}`);

    // 1. Check Built-in List (Simulating lib/api-auth.ts)
    const isBuiltIn = ADMIN_EMAILS.includes(email);
    console.log(`- Is in Built-in Admin List? ${isBuiltIn ? 'YES' : 'NO'}`);

    if (isBuiltIn) {
        console.log("SUCCESS: User is a built-in admin.");
        return;
    }

    // 2. Check Database Role
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.log("- User not found in Auth database.");
        return;
    }

    const role = user.app_metadata?.role;
    console.log(`- App Metadata Role: ${role || 'None'}`);

    if (role === 'admin') {
        console.log("SUCCESS: User has 'admin' role in database.");
    } else {
        console.log("FAILURE: User is NOT an admin (needs 'admin' role or be in built-in list).");

        // Auto-fix?
        console.log("Attempting to grant admin role...");
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { app_metadata: { ...user.app_metadata, role: 'admin' } }
        );

        if (!updateError) console.log("SUCCESS: Admin role granted!");
        else console.error("Failed to grant admin role:", updateError);
    }
}

verifyAdmin('tonydavidhampton@gmail.com');

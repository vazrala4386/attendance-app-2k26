import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
// Prefer service role key for bypassing RLS if available in env, else anon

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAdmin() {
    console.log('Resetting admin password...');
    const newPass = 'admin123';
    const newHash = bcrypt.hashSync(newPass, 10);

    // 1. Try to update existing 'admin'
    const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ password: newHash })
        .eq('username', 'admin')
        .select();

    if (updateError) {
        console.error('Update Error:', updateError);
        return;
    }

    if (updateData && updateData.length > 0) {
        console.log('SUCCESS: Updated admin password to "admin123"');
        console.log('User:', updateData[0]);
    } else {
        console.log('Admin user not found, inserting new admin...');
        // 2. Insert if not exists
        const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert([{
                username: 'admin',
                password: newHash,
                role: 'admin',
                email: 'admin@example.com'
            }])
            .select();

        if (insertError) {
            console.error('Insert Error:', insertError);
        } else {
            console.log('SUCCESS: Created new admin user with password "admin123"');
        }
    }
}

resetAdmin();

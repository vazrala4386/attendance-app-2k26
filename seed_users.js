import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUser() {
    const adminPass = 'admin123';
    const adminHash = bcrypt.hashSync(adminPass, 10);

    console.log('Attempting to seed admin user...');

    const { data, error } = await supabase.from('users').insert([
        {
            username: 'admin',
            password: adminHash,
            role: 'admin',
            email: 'admin@example.com'
        }
    ]).select();

    if (error) {
        console.error('Error seeding user:', error.message);
        console.log('Note: This usually fails if RLS is enabled on Supabase. In that case, you MUST run the SQL script in the Supabase Dashboard.');
    } else {
        console.log('Successfully seeded admin user:', data);
    }
}

seedUser();

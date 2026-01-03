import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('Checking Supabase connection...');
    const { data: users, error } = await supabase.from('users').select('username, role');

    if (error) {
        console.error('Error fetching users:', error.message);
        return;
    }

    console.log('Users found in database:', users);
}

checkUsers();

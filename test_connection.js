import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    console.log('--- SUPABASE CONNECTION REPORT ---');
    console.log(`URL: ${supabaseUrl}`);

    // Check Users Table
    const { data: users, error: userError } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (userError) console.error('❌ Users table Error:', userError.message);
    else console.log(`✅ Users table: OK (${users === null ? 0 : users.length} records found)`);

    // Check Files Table
    const { error: fileError } = await supabase.from('files').select('id').limit(1);
    if (fileError) console.error('❌ Files table Error:', fileError.message);
    else console.log('✅ Files table: OK');

    // Check Attendance Table
    const { error: attendError } = await supabase.from('attendance_records').select('id').limit(1);
    if (attendError) console.error('❌ Attendance table Error:', attendError.message);
    else console.log('✅ Attendance table: OK');

    console.log('---------------------------------');
    if (!userError && !fileError && !attendError) {
        console.log('🚀 ALL SYSTEMS GO: Connection is fully functional!');
    } else {
        console.log('⚠️ PARTIAL FAILURE: Some tables are missing or inaccessible.');
    }
}

checkConnection();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedStudents() {
    console.log('--- Seeding Students ---');
    const pass = 'student123';
    const hash = bcrypt.hashSync(pass, 10);

    const users = [
        { username: 'CSE_2K26', role: 'student', branch: 'CSE', email: 'cse@example.com' },
        { username: 'AIML_2K26', role: 'student', branch: 'AIML', email: 'aiml@example.com' },
        { username: 'CSD_2K26', role: 'student', branch: 'CSD', email: 'csd@example.com' },
        { username: 'ECE_2K26', role: 'student', branch: 'ECE', email: 'ece@example.com' },
        { username: 'MCA_2K26', role: 'student', branch: 'MCA', email: 'mca@example.com' }
    ];

    for (const u of users) {
        process.stdout.write(`User ${u.username}: `);

        // Check for duplicates
        const { data: existing, error } = await supabase.from('users').select('id, username').eq('username', u.username);

        if (error) {
            console.error('Error checking:', error.message);
            continue;
        }

        if (existing && existing.length > 0) {
            console.log(`Found ${existing.length} existing record(s). Updating password...`);
            // Update first one
            const firstId = existing[0].id;
            await supabase.from('users').update({
                password: hash,
                role: u.role,
                branch: u.branch
            }).eq('id', firstId);

            // Delete duplicates if any
            if (existing.length > 1) {
                console.log('   Removing duplicates...');
                for (let i = 1; i < existing.length; i++) {
                    await supabase.from('users').delete().eq('id', existing[i].id);
                }
            }
        } else {
            console.log('Creating new user...');
            const { error: insertError } = await supabase.from('users').insert([{
                ...u,
                password: hash
            }]);
            if (insertError) console.error('   Insert failed:', insertError.message);
        }
    }
    console.log('--- Seeding Complete ---');
}

seedStudents();

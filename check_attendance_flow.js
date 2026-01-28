import fetch from 'node-fetch'; // Standard node fetch in v20 doesn't need import if using .mjs or type:module with no import, but let's just use global fetch.
// Actually, in Node 20 'fetch' is global. No import needed.

const BASE_URL = 'http://localhost:3001';

async function runTest() {
    try {
        console.log('--- STARTING ATTENDANCE FLOW TEST ---');

        // 1. ADMIN LOGIN & UPLOAD (Optional - assumes file exists, but good to be safe)
        // I will skip upload for now and use existing file if any.

        // 2. STUDENT LOGIN
        console.log('1. Logging in as Student (CSE_2K26)...');
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'CSE_2K26',
                password: 'student123'
            })
        });

        if (!loginRes.ok) throw new Error(`Login Failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log(`   Logged in. Token acquired.`);

        // 3. GET FILES
        console.log('\n2. Fetching Files...');
        let filesRes = await fetch(`${BASE_URL}/files`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        let files = await filesRes.json();
        console.log(`   Found ${files.length} files.`);

        if (files.length === 0) {
            console.log('   [WARN] No files found. Cannot test attendance submission.');
            // Check if we can reset a file? 
            // Or maybe attendance was already marked for all?
            // Let's assume there is at least one file.
            return;
        }

        const targetFile = files[0];
        console.log(`   Selected File: ${targetFile.original_name} (ID: ${targetFile.id})`);

        // 4. SUBMIT ATTENDANCE
        console.log('\n3. Submitting Attendance...');
        const attendanceData = [
            {
                name: 'Test Student',
                roll: '101',
                branch: 'CSE',
                normalized_branch: 'CSE',
                gender: 'Male',
                status: 'present'
            }
        ];

        const submitRes = await fetch(`${BASE_URL}/attendance/${targetFile.id}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ attendanceData })
        });

        if (!submitRes.ok) {
            const err = await submitRes.text();
            throw new Error(`Submission Failed: ${err}`);
        }
        console.log('   Attendance submitted.');

        // 5. VERIFY FILE VISIBILITY
        console.log('\n4. Verifying File Visibility...');
        filesRes = await fetch(`${BASE_URL}/files`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        files = await filesRes.json();

        const stillVisible = files.find(f => f.id === targetFile.id);

        if (!stillVisible) {
            console.log('___ SUCCESS: File is hidden from list! ___');
        } else {
            console.log('___ FAILURE: File is STILL visible in list! ___');
        }

    } catch (error) {
        console.error('TEST ERROR:', error);
    }
}

runTest();

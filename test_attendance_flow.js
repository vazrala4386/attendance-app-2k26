const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function runTest() {
    try {
        console.log('1. Logging in as Student (CSE_2K26)...');
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            username: 'CSE_2K26',
            password: 'student123'
        });
        const token = loginRes.data.token;
        const student = loginRes.data.user;
        console.log(`   Logged in as ${student.username} (ID: ${student.id}, Branch: ${student.branch})`);

        console.log('\n2. Fetching Files...');
        let filesRes = await axios.get(`${BASE_URL}/files`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        let files = filesRes.data;
        console.log(`   Found ${files.length} files available.`);

        if (files.length === 0) {
            console.log('   No files to test with. Please upload a file as admin first.');
            return;
        }

        const targetFile = files[0];
        console.log(`   Targeting File: ${targetFile.original_name} (ID: ${targetFile.id})`);

        console.log('\n3. Submitting Attendance...');
        // Create dummy attendance data
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

        await axios.post(`${BASE_URL}/attendance/${targetFile.id}`,
            { attendanceData },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('   Attendance submitted successfully.');

        console.log('\n4. Fetching Files Again (Should be hidden)...');
        filesRes = await axios.get(`${BASE_URL}/files`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        files = filesRes.data;

        const isHidden = !files.find(f => f.id === targetFile.id);
        if (isHidden) {
            console.log('SUCCESS: Target file is NO LONGER visible.');
        } else {
            console.log('FAILURE: Target file is STILL visible.');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

runTest();

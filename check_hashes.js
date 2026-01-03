import bcrypt from 'bcryptjs';

const adminPass = 'admin123';
const studentPass = 'student123';

const adminHash = bcrypt.hashSync(adminPass, 10);
const studentHash = bcrypt.hashSync(studentPass, 10);

console.log('--- CORRECT HASHES ---');
console.log(`admin123: ${adminHash}`);
console.log(`student123: ${studentHash}`);

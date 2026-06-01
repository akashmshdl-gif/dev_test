const bcrypt = require('bcryptjs');

const plainTextPassword = 'password123';
const saltRounds = 10;

bcrypt.hash(plainTextPassword, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
    } else {
        console.log('Hashed password:', hash);
        // Use this 'hash' value in your INSERT statement.
    }
});

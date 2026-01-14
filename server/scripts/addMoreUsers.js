const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CLASSROOMS = ['004', '005', '202', '203', '205', '207', '208'];

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

const additionalUsers = [
    { name: 'Archi Daga', username: 'archi@ingenium.com', password: 'obs@ingenium' },
    { name: 'Pratham Sandesara', username: 'pratham@ingenium.com', password: 'obs@ingenium' },
    { name: 'Param Shah', username: 'param@ingenium.com', password: 'obs@ingenium' },
    { name: 'Shreya Godhani', username: 'shreya@ingenium.com', password: 'obs@ingenium' }
];

const addMoreUsers = async () => {
    try {
        await connectDB();

        console.log(`Adding ${additionalUsers.length} additional users...`);

        for (const user of additionalUsers) {
            try {
                const username = user.username.trim().toLowerCase();
                const existingUser = await User.findOne({ username });

                if (existingUser) {
                    existingUser.name = user.name;
                    existingUser.password = user.password;
                    existingUser.role = 'volunteer';
                    existingUser.assignedClassrooms = CLASSROOMS;
                    await existingUser.save();
                    console.log(`✅ Updated: ${username}`);
                } else {
                    await User.create({
                        username,
                        name: user.name,
                        password: user.password,
                        role: 'volunteer',
                        assignedClassrooms: CLASSROOMS
                    });
                    console.log(`✅ Created: ${username}`);
                }
            } catch (err) {
                console.error(`❌ Error with ${user.username}:`, err.message);
            }
        }

        console.log('\nDone!\n');
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
};

addMoreUsers();

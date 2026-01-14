const mongoose = require('mongoose');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
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

const importUsers = async () => {
    try {
        await connectDB();

        const filePath = path.join(__dirname, '../../Excel/list.xlsx');
        console.log(`Reading file: ${filePath}`);

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        console.log(`Found ${data.length} entries in Excel file.`);

        let successCount = 0;
        let updateCount = 0;
        let errorCount = 0;

        for (const entry of data) {
            const { Name, Email, Password } = entry;

            if (!Name || !Email || !Password) {
                console.warn(`⚠️  Skipping invalid entry: ${JSON.stringify(entry)}`);
                errorCount++;
                continue;
            }

            try {
                const username = Email.toString().trim().toLowerCase();
                const existingUser = await User.findOne({ username });

                if (existingUser) {
                    existingUser.name = Name;
                    existingUser.password = Password; // Pre-save hook will hash
                    existingUser.role = 'volunteer';
                    existingUser.assignedClassrooms = CLASSROOMS;
                    await existingUser.save();
                    updateCount++;
                    console.log(`✅ Updated existing user: ${username}`);
                } else {
                    await User.create({
                        username,
                        name: Name,
                        password: Password, // Pre-save hook will hash
                        role: 'volunteer',
                        assignedClassrooms: CLASSROOMS
                    });
                    successCount++;
                    console.log(`✅ Created new user: ${username}`);
                }
            } catch (err) {
                console.error(`❌ Error importing ${Email}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n--- Import Summary ---');
        console.log(`Total processed: ${data.length}`);
        console.log(`Successfully created: ${successCount}`);
        console.log(`Successfully updated: ${updateCount}`);
        console.log(`Errors/Skipped: ${errorCount}`);
        console.log('----------------------\n');

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Bulk import failed:', error);
        process.exit(1);
    }
};

importUsers();

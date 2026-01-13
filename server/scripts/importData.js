const mongoose = require('mongoose');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Load models
const Team = require('../models/Team');
const Member = require('../models/Member');
const Classroom = require('../models/Classroom');

// Load env vars
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('Loading .env from:', envPath);
console.log('Loading .env from:', envPath);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');

const importData = async () => {
    try {
        // Connect to Database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Read Excel File
        const excelPath = path.join(__dirname, '../../Excel/data.xlsx');
        if (!fs.existsSync(excelPath)) {
            throw new Error(`Excel file not found at ${excelPath}`);
        }

        const workbook = xlsx.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} rows in Excel file.`);

        let teamsCreated = 0;
        let membersCreated = 0;
        let errors = 0;

        for (const row of data) {
            try {
                // Extract Data using exact column names provided
                const teamName = row['TEAM NAME'];
                const roomNumber = row['Room No.']?.toString().trim(); // Ensure string and trim

                // Members 1-5
                const memberNames = [
                    row['MEMBER 1'],
                    row['MEMBER 2'],
                    row['MEMBER 3'],
                    row['MEMBER 4'],
                    row['MEMBER 5']
                ].filter(name => name && name.toString().trim().length > 0);

                if (!teamName || !roomNumber) {
                    console.warn(`Skipping row: Missing Team Name or Room Number. Data: ${JSON.stringify(row)}`);
                    continue;
                }

                // 1. Find or Create Classroom
                let classroom = await Classroom.findOne({ roomNumber });
                if (!classroom) {
                    // We only create valid classrooms based on the enum if they don't exist
                    // Or we can try to create and catch the validation error
                    // For now, let's try to find it. If it doesn't exist, we'll try to create it using defaults.
                    console.log(`Classroom ${roomNumber} not found, attempting to create...`);
                    try {
                        classroom = new Classroom({ roomNumber });
                        await classroom.save();
                        console.log(`Created Classroom ${roomNumber}`);
                    } catch (err) {
                        console.error(`Failed to create classroom ${roomNumber}: ${err.message}`);
                        errors++;
                        continue; // Skip this row if classroom requires strict validation and fails
                    }
                }

                // 2. Create Team
                // Check if team already exists to avoid duplicates?
                let team = await Team.findOne({ teamName, classroom: classroom._id });
                if (team) {
                    console.log(`Team "${teamName}" already exists in Room ${roomNumber}. Skipping creation.`);
                } else {
                    team = new Team({
                        teamName,
                        classroom: classroom._id
                    });
                    await team.save();
                    teamsCreated++;

                    // Update classroom with new team
                    classroom.teams.push(team._id);
                    await classroom.save();
                }

                // 3. Create Members
                for (const name of memberNames) {
                    // Check if member already exists in this team
                    const existingMember = await Member.findOne({ name, team: team._id });
                    if (!existingMember) {
                        const member = new Member({
                            name: name.toString().trim(),
                            team: team._id
                        });
                        await member.save();

                        // Link member to team
                        team.members.push(member._id);
                        membersCreated++;
                    }
                }
                await team.save();

            } catch (rowError) {
                console.error(`Error processing row: ${JSON.stringify(row)}`, rowError);
                errors++;
            }
        }

        console.log('\nImport Summary:');
        console.log(`Teams Created: ${teamsCreated}`);
        console.log(`Members Created: ${membersCreated}`);
        console.log(`Errors encountered: ${errors}`);

        process.exit(0);
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
};

importData();

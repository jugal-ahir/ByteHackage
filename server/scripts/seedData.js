const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Team = require('../models/Team');
const Member = require('../models/Member');

dotenv.config();

const CLASSROOMS = ['004', '005', '202', '203', '205', '207', '208'];
const TEAM_NAMES = [
  'Alpha Team', 'Beta Squad', 'Gamma Group', 'Delta Force', 'Epsilon Elite',
  'Zeta Zone', 'Eta Heroes', 'Theta Titans', 'Iota Innovators', 'Kappa Kings'
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Classroom.deleteMany({});
    await Team.deleteMany({});
    await Member.deleteMany({});

    // Create users
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const volunteer1 = await User.create({
      username: 'volunteer1',
      password: hashedPassword,
      role: 'volunteer',
      name: 'John Volunteer',
      assignedClassrooms: ['004', '005']
    });

    const volunteer2 = await User.create({
      username: 'volunteer2',
      password: hashedPassword,
      role: 'volunteer',
      name: 'Jane Volunteer',
      assignedClassrooms: ['202', '203']
    });

    const coordinator = await User.create({
      username: 'coordinator',
      password: hashedPassword,
      role: 'coordinator',
      name: 'Admin Coordinator',
      assignedClassrooms: CLASSROOMS
    });

    const organizer = await User.create({
      username: 'organizer',
      password: hashedPassword,
      role: 'organizer',
      name: 'Main Organizer',
      assignedClassrooms: CLASSROOMS
    });

    console.log('Users created:', {
      volunteer1: volunteer1.username,
      volunteer2: volunteer2.username,
      coordinator: coordinator.username,
      organizer: organizer.username
    });

    // Create classrooms with teams and members
    console.log('Creating classrooms, teams, and members...');
    
    for (const roomNumber of CLASSROOMS) {
      const classroom = await Classroom.create({
        roomNumber,
        currentStatus: 'active'
      });

      // Create 7-10 teams per classroom
      const numTeams = Math.floor(Math.random() * 4) + 7; // 7-10 teams
      const teams = [];

      for (let i = 0; i < numTeams; i++) {
        const teamName = `${TEAM_NAMES[i % TEAM_NAMES.length]} ${roomNumber}-${i + 1}`;
        const team = await Team.create({
          teamName,
          classroom: classroom._id
        });

        // Create 3-5 members per team
        const numMembers = Math.floor(Math.random() * 3) + 3; // 3-5 members
        const members = [];

        for (let j = 0; j < numMembers; j++) {
          const member = await Member.create({
            name: `Member ${j + 1} of ${teamName}`,
            team: team._id,
            currentStatus: 'present',
            statusHistory: [{
              status: 'present',
              timestamp: new Date(),
              roomNumber,
              teamName
            }]
          });
          members.push(member._id);
        }

        team.members = members;
        await team.save();
        teams.push(team._id);
      }

      classroom.teams = teams;
      await classroom.save();

      console.log(`Created classroom ${roomNumber} with ${numTeams} teams`);
    }

    console.log('\n✅ Seed data created successfully!');
    console.log('\nLogin credentials:');
    console.log('  Volunteer: volunteer1 / password123');
    console.log('  Coordinator: coordinator / password123');
    console.log('  Organizer: organizer / password123');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();


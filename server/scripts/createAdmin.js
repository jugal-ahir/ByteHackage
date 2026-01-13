const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

dotenv.config();

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

const createAdmin = async () => {
  try {
    await connectDB();

    const email = 'jugal.v@ahduni.edu.in';
    const password = 'Jugal@h';
    const name = 'Jugal V';

    // Check if user already exists
    const existingUser = await User.findOne({ username: email });
    if (existingUser) {
      console.log(`\n⚠️  User with username "${email}" already exists!`);
      console.log('Updating password and role...');
      
      // Set plain password - the pre-save hook will hash it
      existingUser.password = password;
      existingUser.role = 'organizer';
      existingUser.name = name;
      existingUser.assignedClassrooms = CLASSROOMS;
      await existingUser.save();
      
      console.log('\n✅ Admin account updated successfully!');
      console.log(`\nLogin credentials:`);
      console.log(`  Username: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Role: organizer`);
      console.log('\n');
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin user
      const admin = await User.create({
        username: email,
        password: hashedPassword,
        role: 'organizer',
        name: name,
        assignedClassrooms: CLASSROOMS
      });

      console.log('\n✅ Admin account created successfully!');
      console.log(`\nLogin credentials:`);
      console.log(`  Username: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Role: organizer`);
      console.log(`  Name: ${name}`);
      console.log(`  Assigned Classrooms: All (${CLASSROOMS.join(', ')})`);
      console.log('\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin account:', error);
    process.exit(1);
  }
};

createAdmin();


const mongoose = require('mongoose');
const dotenv = require('dotenv');
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

const createUser = async () => {
  try {
    await connectDB();

    // Get arguments from command line or use defaults
    const args = process.argv.slice(2);
    const username = args[0] || 'vol002';
    const password = args[1] || 'vol002';
    const role = args[2] || 'volunteer';
    const name = args[3] || 'Volunteer 002';
    const classrooms = args[4] ? args[4].split(',') : ['004', '005'];

    // Validate role
    if (!['volunteer', 'coordinator', 'organizer'].includes(role)) {
      console.error('Invalid role. Must be: volunteer, coordinator, or organizer');
      process.exit(1);
    }

    // Validate classrooms
    const validClassrooms = classrooms.filter(c => CLASSROOMS.includes(c.trim()));
    if (validClassrooms.length === 0 && role === 'volunteer') {
      console.error('No valid classrooms provided. Valid classrooms:', CLASSROOMS.join(', '));
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(`\n⚠️  User with username "${username}" already exists!`);
      console.log('Updating password and details...');
      
      // Set plain password - the pre-save hook will hash it
      existingUser.password = password;
      existingUser.role = role;
      existingUser.name = name;
      if (role === 'organizer' || role === 'coordinator') {
        existingUser.assignedClassrooms = CLASSROOMS;
      } else {
        existingUser.assignedClassrooms = validClassrooms.map(c => c.trim());
      }
      await existingUser.save();
      
      console.log('\n✅ User account updated successfully!');
      console.log(`\nLogin credentials:`);
      console.log(`  Username: ${username}`);
      console.log(`  Password: ${password}`);
      console.log(`  Role: ${role}`);
      console.log(`  Name: ${name}`);
      console.log(`  Assigned Classrooms: ${existingUser.assignedClassrooms.join(', ')}`);
      console.log('\n');
    } else {
      // Create user - password will be hashed by pre-save hook
      const user = await User.create({
        username,
        password, // Will be hashed by pre-save hook
        role,
        name,
        assignedClassrooms: role === 'organizer' || role === 'coordinator' 
          ? CLASSROOMS 
          : validClassrooms.map(c => c.trim())
      });

      console.log('\n✅ User account created successfully!');
      console.log(`\nLogin credentials:`);
      console.log(`  Username: ${username}`);
      console.log(`  Password: ${password}`);
      console.log(`  Role: ${role}`);
      console.log(`  Name: ${name}`);
      console.log(`  Assigned Classrooms: ${user.assignedClassrooms.join(', ')}`);
      console.log('\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating user account:', error);
    process.exit(1);
  }
};

createUser();


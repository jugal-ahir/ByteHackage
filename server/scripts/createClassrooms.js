const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Classroom = require('../models/Classroom');

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

const createClassrooms = async () => {
  try {
    await connectDB();

    console.log('Creating/updating classrooms...\n');

    for (const roomNumber of CLASSROOMS) {
      const existingClassroom = await Classroom.findOne({ roomNumber });
      
      if (existingClassroom) {
        console.log(`✓ Classroom ${roomNumber} already exists`);
      } else {
        const classroom = await Classroom.create({
          roomNumber,
          currentStatus: 'active'
        });
        console.log(`✓ Created classroom ${roomNumber}`);
      }
    }

    console.log('\n✅ All classrooms are ready!');
    console.log(`\nClassrooms: ${CLASSROOMS.join(', ')}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating classrooms:', error);
    process.exit(1);
  }
};

createClassrooms();


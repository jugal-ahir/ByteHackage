const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const LOCAL_URI = 'mongodb://localhost:27017/hackathon_management'; // Change to your local DB name
const ATLAS_URI = process.env.MONGODB_URI;

async function migrate() {
    if (!ATLAS_URI || ATLAS_URI.includes('localhost')) {
        console.error('❌ Error: MONGODB_URI in .env must be your Atlas connection string.');
        process.exit(1);
    }

    try {
        console.log('🔌 Connecting to local MongoDB...');
        const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log('✅ Connected to local MongoDB');

        console.log('🔌 Connecting to MongoDB Atlas...');
        const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log('✅ Connected to MongoDB Atlas');

        const collections = await localConn.db.listCollections().toArray();
        console.log(`📦 Found ${collections.length} collections locally.`);

        for (const coll of collections) {
            const name = coll.name;
            console.log(`  🚀 Migrating collection: ${name}...`);

            const documents = await localConn.db.collection(name).find({}).toArray();
            if (documents.length > 0) {
                // Drop existing if it exists in Atlas to start fresh
                try {
                    await atlasConn.db.collection(name).drop();
                } catch (e) {
                    // Ignore if it doesn't exist
                }

                await atlasConn.db.collection(name).insertMany(documents);
                console.log(`    ✅ Migrated ${documents.length} documents.`);
            } else {
                console.log(`    ⚠️ Collection ${name} is empty, skipping.`);
            }
        }

        console.log('🎉 Migration complete!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
}

migrate();

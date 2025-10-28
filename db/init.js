// Database initialization script
const fs = require('fs');
const path = require('path');
const db = require('./database');

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schema);

    console.log('✅ Database schema created successfully!');
    console.log('✅ Database initialization complete!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();

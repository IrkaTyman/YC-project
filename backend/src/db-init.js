const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: "-",
  database: "-",
  user: "-",
  password: "-",
  port: 6432,
  ssl: {
    rejectUnauthorized: false 
  }
});

const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database schema initialized successfully');
    
    await pool.query(`
      INSERT INTO notes (value)
      VALUES 
        ('Содержимое первой заметки'),
        ('Содержимое второй заметки')
      ON CONFLICT DO NOTHING
    `);
    
    console.log('Sample data inserted successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDatabase();

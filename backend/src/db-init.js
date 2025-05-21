const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: "rc1a-3n15f88sd5nq2oau.mdb.yandexcloud.net",
  database: "db1",
  user: "user1",
  password: "qwertyuio",
  port: 6432,
  ssl: {
    rejectUnauthorized: false 
  }
});

const initializeDatabase = async () => {
  try {
    // Создание таблицы notes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database schema initialized successfully');
    
    // Добавление тестовых данных
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

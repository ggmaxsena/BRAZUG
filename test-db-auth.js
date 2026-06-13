const { Client } = require('pg');

const client = new Client({
  user: 'brazug',
  password: 'BrazugUgjd8dO2Gmabs!25',
  host: '2.24.124.162',
  port: 5432,
  database: 'brazug',
});

async function testConnection() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Successfully connected to the database!');
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

testConnection();

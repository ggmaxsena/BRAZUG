require('dotenv').config();
const ARMORY_URL = process.env.ARMORY_URL || "http://2.24.124.162:3001";
const name = 'gekz';
const realm = 'doomhowl';
const region = 'us';

async function test() {
  console.log(`Testing sync proxy to: ${ARMORY_URL}`);
  try {
    const response = await fetch(`${ARMORY_URL}/api/character/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, realm, region })
    });
    console.log('STATUS:', response.status);
    const data = await response.json();
    console.log('DATA:', data);
  } catch (err) {
    console.error('FETCH FAILED:', err.message);
  }
}
test();

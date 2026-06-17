require('dotenv').config();

async function testAuth() {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  const region = 'us';

  console.log(`Testing Blizzard Auth for Client ID: ${clientId}`);
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const response = await fetch(
      `https://${region}.battle.net/oauth/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials'
      }
    );

    const data = await response.json();

    if (response.ok) {
        console.log('✅ AUTH SUCCESSFUL!');
        console.log('Token expires in:', data.expires_in);
    } else {
        console.error('❌ AUTH FAILED!');
        console.error('Status:', response.status);
        console.error('Data:', data);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testAuth();

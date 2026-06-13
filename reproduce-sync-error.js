const http = require('http');

async function reproduce() {
  const payload = JSON.stringify({
    name: 'gekz',
    realm: 'doomhowl',
    region: 'us'
  });

  const options = {
    hostname: '2.24.124.162',
    port: 3001,
    path: '/api/character/sync',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };

  console.log(`Testing sync for gekz-doomhowl at http://2.24.124.162:3001/api/character/sync...`);

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
      } catch (e) {
        console.log('Response (raw):', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.write(payload);
  req.end();
}

reproduce();

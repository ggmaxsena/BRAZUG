const urlString = 'postgresql://brazug:BrazugUgjd8dO2Gmabs!25@2.24.124.162:5432/brazug';
const url = new URL(urlString);
console.log('Username:', url.username);
console.log('Password:', url.password);
console.log('Hostname:', url.hostname);
console.log('Port:', url.port);
console.log('Database:', url.pathname.slice(1));

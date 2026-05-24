const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  console.log('Loading env from:', envPath);

  if (!fs.existsSync(envPath)) {
    console.log('File not found');
    return;
  }

  const text = fs.readFileSync(envPath, "utf8");

  for (const line of text.split("\n")) {
    const t = line.trim();

    if (!t || t.startsWith("#")) {
      continue;
    }

    const i = t.indexOf("=");

    if (i === -1) {
      continue;
    }

    const key = t.slice(0, i).trim();

    if (process.env[key]) {
      console.log('Key already exists in env:', key);
      continue;
    }

    process.env[key] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    
    console.log('Set key:', key, 'to:', process.env[key]);
  }
}

loadEnv();
console.log('Final DATABASE_URL:', process.env.DATABASE_URL);

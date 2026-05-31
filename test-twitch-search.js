
const twitch = require("./lib/twitch.cjs");
require("dotenv").config();

async function testSearch(query) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    console.log(`Buscando canais ao vivo com query: ${query}...`);
    const res = await fetch(`https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&live_only=true&first=100`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    
    console.log(`Total de resultados: ${data.data ? data.data.length : 0}`);
    if (data.data) {
        data.data.forEach(c => {
            console.log(`- [${c.is_live ? 'LIVE' : 'OFF'}] ${c.display_name}: ${c.title} (Game: ${c.game_name})`);
        });
    }
  } catch (e) {
    console.error("Erro no teste:", e.message);
  }
}

testSearch("brazug");

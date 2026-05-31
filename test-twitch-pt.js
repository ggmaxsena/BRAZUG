
const twitch = require("./lib/twitch.cjs");
require("dotenv").config();

async function testLanguageScan() {
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

    const gameIds = ["21703", "18122", "1122165802", "493057"];
    let url = `https://api.twitch.tv/helix/streams?language=pt&first=100`;
    gameIds.forEach(id => url += `&game_id=${id}`);

    console.log("Buscando streams de WoW em Português...");
    const res = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    
    console.log(`Total encontrado em PT: ${data.data ? data.data.length : 0}`);
    if (data.data) {
        const found = data.data.find(s => s.user_login.toLowerCase() === "tioslliper");
        if (found) {
            console.log("SUCESSO! tioslliper encontrado via filtro de linguagem PT:");
            console.log("- Título:", found.title);
        } else {
            console.log("tioslliper não encontrado na primeira página de PT.");
            data.data.forEach(s => {
                if (s.title.toUpperCase().includes("BRAZUG")) {
                    console.log(`- [FOUND] ${s.user_name}: ${s.title}`);
                }
            });
        }
    }
  } catch (e) {
    console.error("Erro no teste:", e.message);
  }
}

testLanguageScan();

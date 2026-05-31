
const twitch = require("./lib/twitch.cjs");
require("dotenv").config();

async function debugUser(login) {
  try {
    const { token, clientId } = await (require("./lib/twitch.cjs").getAppAccessToken ? 
        require("./lib/twitch.cjs").getAppAccessToken() : 
        // Fallback if I can't reach the internal function directly due to module exports
        {token: null, clientId: null});
    
    // If I can't use the internal function easily, I'll just use collectBrazugStreams and check the output
    console.log("Buscando todas as streams Brazug...");
    const streams = await twitch.collectBrazugStreams();
    const found = streams.find(s => s.login === login.toLowerCase());
    
    if (found) {
      console.log("Sucesso! Stream encontrada:", found);
    } else {
      console.log("Stream não encontrada na lista coletada.");
      
      // Tentativa de busca direta para ver o que a Twitch diz
      const auth = await getAppAccessTokenInternal();
      const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${login}`, {
        headers: {
            'Client-ID': auth.clientId,
            'Authorization': `Bearer ${auth.token}`
        }
      });
      const data = await res.json();
      if (data.data && data.data.length > 0) {
          const s = data.data[0];
          console.log("Dados reais da Twitch para o usuário:");
          console.log("- Título:", s.title);
          console.log("- Game ID:", s.game_id);
          console.log("- Game Name:", s.game_name);
          console.log("- Live:", s.type === 'live');
          
          const tagMatch = s.title.toUpperCase().includes("BRAZUG");
          console.log("- Contém 'brazug' no título:", tagMatch);
      } else {
          console.log("Twitch diz que o usuário NÃO está ao vivo agora.");
      }
    }
  } catch (e) {
    console.error("Erro no debug:", e.message);
  }
}

// Re-implementação simplificada para o debug
async function getAppAccessTokenInternal() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  return { token: data.access_token, clientId };
}

debugUser("tioslliper");

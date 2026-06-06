(function (root) {
  "use strict";

  const GlobalFooter = {
    init() {
      // Check if footer already exists to avoid duplication
      if (document.querySelector('.brazug-footer')) return;

      const footerHtml = `
        <footer class="brazug-footer">
          <div class="footer-container">
            <!-- Brand Section -->
            <div class="footer-section footer-brand">
              <img src="/assets/branding/LOGO.png" alt="BRAZUG Logo" class="footer-logo" onerror="this.src='/assets/branding/contentbra.png'">
              <p>A maior comunidade Hardcore do WoW Classic na América Latina. Forjada em sangue e honra, unida pelo destino de Azeroth.</p>
              <div class="horde-badge">
                <img src="/assets/branding/mhorda.png" alt="Horde" onerror="this.style.display='none'">
                <span>Pela Horda!</span>
              </div>
            </div>

            <!-- Site Map -->
            <div class="footer-section">
              <h4>Navegação</h4>
              <ul class="footer-links">
                <li><a href="/index.html">Mural de Aventuras</a></li>
                <li><a href="/armory">Armory & Rankings</a></li>
                <li><a href="/vendas.html">Casa de Leilões</a></li>
                <li><a href="/login.html">Painel do Herói</a></li>
              </ul>
            </div>

            <!-- Community -->
            <div class="footer-section">
              <h4>Comunidade</h4>
              <ul class="footer-links">
                <li><a href="https://discord.gg/brazug" target="_blank">Discord Oficial</a></li>
                <li><a href="https://twitch.tv/directory/game/World%20of%20Warcraft" target="_blank">Streams da Guilda</a></li>
                <li><a href="/register.html">Alistar-se</a></li>
              </ul>
            </div>

            <!-- Spotify Integration Space -->
            <div class="footer-section">
              <h4>Brazug Radio</h4>
              <div class="spotify-radio-mini" id="spotify-footer-player">
                <div class="spotify-icon-wrap" id="spotify-play-pause">
                  <i class="fas fa-play" id="spotify-icon-main"></i>
                </div>
                <div class="radio-info">
                  <div class="radio-status">Offline</div>
                  <div class="radio-track">Conecte sua conta Spotify</div>
                </div>
                <div class="radio-controls">
                  <button id="spotify-mute-btn" class="radio-btn" title="Mudar Volume">
                    <i class="fas fa-volume-up" id="spotify-mute-icon"></i>
                  </button>
                </div>
              </div>
              <p style="font-size: 10px; margin-top: 10px; color: #444;">Spotify Premium necessário para reprodução direta no site.</p>
            </div>
          </div>

          <div class="footer-bottom">
            <div class="copyright">
              &copy; 2026 BRAZUG Community. Todos os direitos reservados. 
              <span style="color: #333; margin-left: 10px;">World of Warcraft e Blizzard Entertainment são marcas registradas.</span>
            </div>
            <div class="footer-meta">
              v2.4.0-STABLE | <a href="/admin.html" style="color: #444; text-decoration: none;">Acesso Restrito</a>
            </div>
          </div>
        </footer>
      `;

      // Append to the end of body
      document.body.insertAdjacentHTML('beforeend', footerHtml);

      this.setupSpotify();
    },

    async setupSpotify() {
      const playerEl = document.getElementById('spotify-footer-player');
      if (!playerEl) return;

      const trackNameEl = playerEl.querySelector('.radio-track');
      const statusEl = playerEl.querySelector('.radio-status');
      const muteBtn = document.getElementById('spotify-mute-btn');
      const muteIcon = document.getElementById('spotify-mute-icon');

      // 1. Carregar Script do SDK
      if (!document.getElementById('spotify-sdk-script')) {
        const script = document.createElement('script');
        script.id = 'spotify-sdk-script';
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }

      // 2. Definir Callback Global do SDK
      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log("[Spotify] SDK Ready");
        this.initPlayer();
      };

      // 3. Lógica de Interação (Play/Pause)
      const playPauseWrap = document.getElementById('spotify-play-pause');
      
      // Clique no ícone/bola de play
      playPauseWrap.onclick = (e) => {
        e.stopPropagation();
        console.log("[Spotify] Click on Play/Pause. Player exists:", !!this.spotifyPlayer);
        if (!this.spotifyPlayer) {
          this.loginSpotify();
        } else {
          this.spotifyPlayer.togglePlay().then(() => {
            console.log("[Spotify] TogglePlay command sent");
          });
        }
      };

      // Clique no resto do retângulo da rádio
      playerEl.onclick = (e) => {
        if (!this.spotifyPlayer) {
          console.log("[Spotify] Click on player body, initiating login...");
          this.loginSpotify();
        }
      };

      // Mute Toggle
      let isMuted = localStorage.getItem('spotify_muted') === 'true';
      this.updateMuteUI(isMuted);

      muteBtn.onclick = (e) => {
        e.stopPropagation();
        isMuted = !isMuted;
        localStorage.setItem('spotify_muted', isMuted);
        if (this.spotifyPlayer) {
          this.spotifyPlayer.setVolume(isMuted ? 0 : 0.5);
        }
        this.updateMuteUI(isMuted);
      };

      // 4. Ouvir sucesso da autenticação via postMessage
      window.addEventListener("message", (event) => {
        if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
          this.initPlayer(event.data.tokens.access_token);
          
          const brazugToken = localStorage.getItem("brazug_admin_token");
          if (brazugToken && event.data.tokens.refresh_token) {
            fetch("/api/spotify/save-token", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${brazugToken}`
              },
              body: JSON.stringify({ refresh_token: event.data.tokens.refresh_token })
            });
          }
        }
      }, false);

      this.initPlayer();
    },

    async loginSpotify() {
      const res = await fetch("/api/spotify/auth-url");
      const { url } = await res.json();
      window.open(url, "Spotify Login", "width=600,height=800");
    },

    updateMuteUI(isMuted) {
      const muteIcon = document.getElementById('spotify-mute-icon');
      if (muteIcon) {
        muteIcon.className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        muteIcon.style.color = isMuted ? '#c41e3a' : '#1DB954';
      }
    },

    async initPlayer(manualToken = null) {
      if (this._playerInitializing) return;
      this._playerInitializing = true;

      try {
        let token = manualToken;
        if (!token) {
          const brazugToken = localStorage.getItem("brazug_admin_token");
          const headers = brazugToken ? { "Authorization": `Bearer ${brazugToken}` } : {};
          const res = await fetch("/api/spotify/token", { headers });
          if (res.ok) {
            const data = await res.json();
            token = data.access_token;
          }
        }

        if (!token || !window.Spotify) {
          this._playerInitializing = false;
          return;
        }

        const isMuted = localStorage.getItem('spotify_muted') === 'true';
        const player = new window.Spotify.Player({
          name: 'BRAZUG Radio Web',
          getOAuthToken: cb => { cb(token); },
          volume: isMuted ? 0 : 0.5
        });

        player.addListener('ready', ({ device_id }) => {
          const statusEl = document.querySelector('.radio-status');
          if (statusEl) {
            statusEl.textContent = "Online";
            statusEl.style.color = "#1DB954";
          }
        });

        player.addListener('player_state_changed', state => {
          if (!state) return;
          const track = state.track_window.current_track;
          const trackNameEl = document.querySelector('.radio-track');
          const statusEl = document.querySelector('.radio-status');
          const mainIcon = document.getElementById('spotify-icon-main');

          if (trackNameEl) trackNameEl.textContent = `${track.name} - ${track.artists[0].name}`;
          if (statusEl) {
            statusEl.textContent = state.paused ? "Pausado" : "Reproduzindo";
          }
          if (mainIcon) {
            mainIcon.className = state.paused ? 'fas fa-play' : 'fas fa-pause';
          }
        });

        player.connect().then(success => {
          if (success) this.spotifyPlayer = player;
        });

      } catch (err) {
        console.error("[Spotify] Init error:", err);
      } finally {
        this._playerInitializing = false;
      }
    }
  };

  root.GlobalFooter = GlobalFooter;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GlobalFooter.init());
  } else {
    GlobalFooter.init();
  }
})(window);

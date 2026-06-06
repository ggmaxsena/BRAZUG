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

              <div class="album-carousel" id="album-carousel">
                  <!-- Spotify Artist Embed -->
                  <div class="carousel-container">
                      <iframe src="https://open.spotify.com/embed/artist/7d2pfUNb5463ZeyejrDwdI?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                  </div>
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
            <div class="footer-section promo-artist">
              <h4>Ouvindo agora: Ggmaxsena</h4>
              <p style="font-size: 12px; margin-bottom: 10px;">Apoie o artista da nossa guilda!</p>



              <!-- YouTube Guild Radio (Global) -->
              <div class="youtube-radio-mini" id="youtube-guild-radio" style="flex-direction: column; align-items: stretch;">
                  <div id="yt-player-container" style="height: 200px; width: 100%;"></div>
                  <div class="radio-controls" style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top: 5px;">
                      <button id="yt-prev-btn" class="radio-btn" title="Anterior"><i class="fas fa-step-backward"></i></button>
                      <button id="yt-play-btn" class="radio-btn" title="Play/Pause"><i class="fas fa-music" id="yt-icon-main"></i></button>
                      <button id="yt-next-btn" class="radio-btn" title="Próxima"><i class="fas fa-step-forward"></i></button>
                      <button id="yt-mute-btn" class="radio-btn" title="Silenciar"><i class="fas fa-volume-up" id="yt-mute-icon"></i></button>
                      <input type="range" id="yt-volume-slider" min="0" max="100" value="2" style="width: 60px; cursor: pointer;">
                  </div>
              </div>
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
      this.setupYouTube();
    },

    async setupYouTube() {
      const ytPlayerContainer = document.getElementById('yt-player-container');
      const ytPlayPause = document.getElementById('yt-play-pause');
      const ytMuteBtn = document.getElementById('yt-mute-btn');

      // Playlist atualizada: Trilha épica Brazug
      const playlistId = 'PLKqwDqLHZSr32NwfIJdHgaEJBPqzVQGXv';

      // 1. Carregar IFrame API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = () => {
        this.ytPlayer = new YT.Player('yt-player-container', {
          height: '0',
          width: '0',
          playerVars: {
            'listType': 'playlist',
            'list': playlistId,
            'autoplay': 1,
            'mute': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'modestbranding': 1,
            'loop': 1
          },
          events: {
            'onReady': (event) => {
              console.log("[YouTube] Ready");
              const isMuted = localStorage.getItem('yt_muted') === 'true';
              if (isMuted) event.target.mute();
              this.updateYTMuteUI(isMuted);
            },
            'onStateChange': (event) => {
              const icon = document.getElementById('yt-icon-main');
              if (event.data === YT.PlayerState.PLAYING) {
                if (icon) icon.className = 'fas fa-pause';
                this.fadeInVolume(event.target);
              } else {
                if (icon) icon.className = 'fas fa-music';
              }
            }
          }
        });
      };

      // Previous/Next Controls
      const ytPrevBtn = document.getElementById('yt-prev-btn');
      if (ytPrevBtn) {
        ytPrevBtn.onclick = (e) => { 
          e.stopPropagation(); 
          if (this.ytPlayer && typeof this.ytPlayer.previousVideo === 'function') this.ytPlayer.previousVideo(); 
        };
      }

      const ytNextBtn = document.getElementById('yt-next-btn');
      if (ytNextBtn) {
        ytNextBtn.onclick = (e) => { 
          e.stopPropagation(); 
          if (this.ytPlayer && typeof this.ytPlayer.nextVideo === 'function') this.ytPlayer.nextVideo(); 
        };
      }

      if (ytPlayPause) {
        ytPlayPause.onclick = (e) => {
          e.stopPropagation();
          if (!this.ytPlayer || typeof this.ytPlayer.getPlayerState !== 'function') return;
          const state = this.ytPlayer.getPlayerState();
          if (state === YT.PlayerState.PLAYING) {
            this.ytPlayer.pauseVideo();
          } else {
            this.ytPlayer.unMute(); // Garante som ao dar play
            this.ytPlayer.playVideo();
          }
        };
      }

      // Volume Control - Refined
      const volumeSlider = document.getElementById('yt-volume-slider');
      if (volumeSlider) {
        volumeSlider.oninput = (e) => {
          if (!this.ytPlayer || typeof this.ytPlayer.setVolume !== 'function') return;

          const vol = parseInt(e.target.value);

          // Garante que o player esteja desmutado antes de ajustar volume
        if (vol > 0) {
            this.ytPlayer.unMute();
            this.ytPlayer.setVolume(vol);
        } else {
            this.ytPlayer.mute();
        }

        localStorage.setItem('yt_volume', vol);
        this.updateYTMuteUI(vol === 0);
      };

      // Load saved volume
      const savedVol = localStorage.getItem('yt_volume') || 2;
      volumeSlider.value = savedVol;
    },

    fadeInVolume(player) {
      if (this._fading) return;
      this._fading = true;
      let currentVol = 0;
      player.setVolume(currentVol);
      player.unMute();

      const step = 0.2; // Aumenta 0.2% a cada intervalo
      const interval = setInterval(() => {
        currentVol += step;
        player.setVolume(currentVol);
        if (currentVol >= 2) {
          clearInterval(interval);
          this._fading = false;
        }
      }, 1000); // 1000ms * 10 passos = 10 segundos
    },

    updateYTMuteUI(isMuted) {
      const icon = document.getElementById('yt-mute-icon');
      if (icon) {
        icon.className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        icon.style.color = isMuted ? '#c41e3a' : '#ff0000';
      }
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

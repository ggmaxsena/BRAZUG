(function () {
  "use strict";

  var API_URL = "/api/live-streams";
  var REFRESH_MS = 60 * 1000;

  var statusEl = document.getElementById("streams-status");
  var listEl = document.getElementById("streams-list");
  var emptyEl = document.getElementById("streams-empty");
  var errorEl = document.getElementById("streams-error");

  if (!statusEl) return;

  function formatViewers(n) {
    if (n >= 1000) {
      return (n / 1000).toFixed(1).replace(/\.0$/, "") + " mil";
    }
    return String(n);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderStreams(streams) {
    listEl.innerHTML = "";

    streams.forEach(function (s) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "stream-card";
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      var thumbSrc =
        s.thumbnailUrl ||
        "https://static-cdn.jtvnw.net/previews-ttv/live_user_" +
          encodeURIComponent(s.login) +
          "-440x248.jpg";

      a.innerHTML =
        '<div class="stream-thumb-wrap">' +
        '<img class="stream-thumb" src="' +
        escapeHtml(thumbSrc) +
        '" alt="" loading="lazy" />' +
        '<span class="stream-live-badge">Ao vivo</span>' +
        '<span class="stream-viewers">' +
        escapeHtml(formatViewers(s.viewers)) +
        " espectadores</span>" +
        "</div>" +
        '<div class="stream-body">' +
        '<p class="stream-channel">' +
        escapeHtml(s.displayName || s.login) +
        "</p>" +
        '<p class="stream-title">' +
        escapeHtml(s.title) +
        "</p>" +
        "</div>";

      li.appendChild(a);
      listEl.appendChild(li);
    });
  }

  function setVisible(which) {
    statusEl.hidden = which !== "loading";
    listEl.hidden = which !== "list";
    emptyEl.hidden = which !== "empty";
    errorEl.hidden = which !== "error";
  }

  async function loadStreams() {
    setVisible("loading");
    statusEl.textContent = "Buscando lives com <BRAZUG> no título…";
    errorEl.textContent = "";

    try {
      var res = await fetch(API_URL);
      var data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao buscar lives (" + res.status + ")");
      }

      var streams = data.streams || [];

      if (streams.length === 0) {
        setVisible("empty");
        statusEl.textContent = "";
        return;
      }

      renderStreams(streams);
      setVisible("list");
      statusEl.textContent =
        streams.length === 1
          ? "1 canal ao vivo"
          : streams.length + " canais ao vivo";
      statusEl.hidden = false;
    } catch (err) {
      setVisible("error");
      errorEl.textContent =
        (err && err.message) ||
        "Não foi possível carregar as lives. Verifique se o servidor Node está no ar e as credenciais Twitch no .env.";
      statusEl.textContent = "";
    }
  }

  loadStreams();
  setInterval(loadStreams, REFRESH_MS);
})();

(function () {
  "use strict";

  const API_URL = "/api/live-streams";
  const REFRESH_MS = 60_000;

  const elements = {
    status: document.getElementById("streams-status"),
    list: document.getElementById("streams-list"),
    empty: document.getElementById("streams-empty"),
    error: document.getElementById("streams-error"),
  };

  if (!elements.status) return;

  /* =========================
     HELPERS
  ========================== */

  const formatViewers = (n = 0) =>
    n >= 1000
      ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")} mil`
      : String(n);

  const escapeHtml = (str = "") => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  const twitchThumb = (login) =>
    `https://static-cdn.jtvnw.net/previews-ttv/live_user_${encodeURIComponent(
      login
    )}-440x248.jpg`;

  const setView = (view) => {
    elements.status.hidden = view !== "loading" && view !== "success";
    elements.list.hidden = view !== "success";
    elements.empty.hidden = view !== "empty";
    elements.error.hidden = view !== "error";
  };

  /* =========================
     CARD
  ========================== */

  function createStreamCard(stream) {
    const li = document.createElement("li");

    const thumb =
      stream.thumbnailUrl ||
      twitchThumb(stream.login);

    li.innerHTML = `
      <a
        class="stream-card"
        href="${escapeHtml(stream.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >

        <div class="stream-thumb-wrap">

          <img
            class="stream-thumb"
            src="${escapeHtml(thumb)}"
            alt="${escapeHtml(stream.displayName)}"
            loading="lazy"
          />

          <span class="stream-live-badge">
            ● AO VIVO
          </span>

          <span class="stream-viewers">
            ${escapeHtml(formatViewers(stream.viewers))}
            espectadores
          </span>

        </div>

        <div class="stream-body">

          <p class="stream-channel">
            ${escapeHtml(stream.displayName || stream.login)}
          </p>

          <p class="stream-title">
            ${escapeHtml(stream.title)}
          </p>

        </div>

      </a>
    `;

    return li;
  }

  /* =========================
     RENDER
  ========================== */

  function renderStreams(streams) {
    const fragment = document.createDocumentFragment();

    streams.forEach((stream) => {
      fragment.appendChild(createStreamCard(stream));
    });

    elements.list.innerHTML = "";
    elements.list.appendChild(fragment);
  }

  /* =========================
     FETCH
  ========================== */

  async function fetchStreams() {
    const response = await fetch(API_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Erro ao buscar lives (${response.status})`
      );
    }

    return response.json();
  }

  /* =========================
     LOAD
  ========================== */

  async function loadStreams() {
    try {
      setView("loading");

      elements.status.textContent =
        "Buscando lives da Guilda Brazug...";

      const data = await fetchStreams();

      const streams = data.streams || [];

      if (!streams.length) {
        setView("empty");
        return;
      }

      renderStreams(streams);

      setView("success");

      elements.status.textContent =
        streams.length === 1
          ? "1 aventureiro ao vivo"
          : `${streams.length} aventureiros ao vivo`;

    } catch (error) {
      console.error(error);

      setView("error");

      elements.error.textContent =
        error.message ||
        "Não foi possível carregar as transmissões.";
    }
  }

  /* =========================
     INIT
  ========================== */

  loadStreams();

  setInterval(loadStreams, REFRESH_MS);

})();
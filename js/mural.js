(function () {
  "use strict";

  var statusEl = document.getElementById("mural-status");
  var gridEl = document.getElementById("mural-grid");
  var emptyEl = document.getElementById("mural-empty");

  if (!statusEl || !gridEl) return;

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso + "T12:00:00");
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return iso;
    }
  }

  function renderCard(a) {
    var imgBlock = a.image_url
      ? '<img class="mural-card-img" src="' +
        escapeHtml(a.image_url) +
        '" alt="" loading="lazy" />'
      : '<div class="mural-card-img placeholder" aria-hidden="true"></div>';

    return (
      '<article class="mural-card">' +
      imgBlock +
      '<div class="mural-card-body">' +
      '<p class="mural-card-meta">' +
      escapeHtml(formatDate(a.event_date)) +
      "</p>" +
      "<h3 class=\"mural-card-title\">" +
      escapeHtml(a.title) +
      "</h3>" +
      '<p class="mural-card-text">' +
      escapeHtml(a.body) +
      "</p>" +
      (a.author
        ? '<p class="mural-card-author">— ' + escapeHtml(a.author) + "</p>"
        : "") +
      "</div></article>"
    );
  }

  async function loadMural() {
    statusEl.textContent = "Carregando mural…";
    statusEl.hidden = false;
    gridEl.hidden = true;
    emptyEl.hidden = true;

    try {
      var res = await fetch("/api/adventures");
      var data = await res.json();
      var list = data.adventures || [];

      if (!list.length) {
        statusEl.hidden = true;
        emptyEl.hidden = false;
        return;
      }

      gridEl.innerHTML = list.map(renderCard).join("");
      statusEl.textContent = list.length + " aventura(s) no mural";
      statusEl.hidden = false;
      gridEl.hidden = false;
    } catch (err) {
      statusEl.textContent = "Erro ao carregar o mural.";
      console.error(err);
    }
  }

  loadMural();
})();

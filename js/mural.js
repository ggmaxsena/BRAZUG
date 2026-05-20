(function () {
  "use strict";

  var statusEl = document.getElementById("mural-status");
  var gridEl = document.getElementById("mural-grid");
  var emptyEl = document.getElementById("mural-empty");
  var modalEl = document.getElementById("mural-modal");
  var modalImg = document.getElementById("mural-modal-img");
  var modalTitle = document.getElementById("mural-modal-title");
  var modalDate = document.getElementById("mural-modal-date");
  var modalBody = document.getElementById("mural-modal-body");
  var modalAuthor = document.getElementById("mural-modal-author");

  var adventuresCache = [];

  if (!statusEl || !gridEl || !modalEl) return;

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
        '" alt="' +
        escapeHtml(a.title) +
        '" loading="lazy" />'
      : '<div class="mural-card-img placeholder" aria-hidden="true"></div>';

    return (
      '<article class="mural-card" data-adventure-id="' +
      escapeHtml(String(a.id)) +
      '">' +
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

  function openModal(adventure) {
    if (!adventure) return;
    modalImg.src = adventure.image_url || "";
    modalImg.alt = adventure.title ? escapeHtml(adventure.title) : "Aventura";
    modalTitle.textContent = adventure.title || "Aventura";
    modalDate.textContent = formatDate(adventure.event_date);
    modalBody.textContent = adventure.body || "";
    modalAuthor.textContent = adventure.author ? "— " + adventure.author : "";
    modalEl.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modalEl.hidden = true;
    modalImg.src = "";
    document.body.style.overflow = "";
  }

  function findAdventureById(id) {
    return adventuresCache.find(function (item) {
      return String(item.id) === String(id);
    });
  }

  gridEl.addEventListener("click", function (event) {
    var cardEl = event.target.closest(".mural-card");
    if (!cardEl) return;
    var id = cardEl.getAttribute("data-adventure-id");
    var adventure = findAdventureById(id);
    if (adventure) {
      openModal(adventure);
    }
  });

  modalEl.addEventListener("click", function (event) {
    var action = event.target.getAttribute("data-action");
    if (action === "close") {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modalEl.hidden) {
      closeModal();
    }
  });

  async function loadMural() {
    statusEl.textContent = "Carregando mural…";
    statusEl.hidden = false;
    gridEl.hidden = true;
    emptyEl.hidden = true;

    try {
      var res = await fetch("/api/adventures");
      var data = await res.json();
      var list = data.adventures || [];
      adventuresCache = list;

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

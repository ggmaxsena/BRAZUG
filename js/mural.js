(function () {
  "use strict";

  /* =========================================
     ELEMENTS
  ========================================= */

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

  if (
    !statusEl ||
    !gridEl ||
    !emptyEl ||
    !modalEl
  ) {
    console.error("[BRAZUG] mural elements missing");
    return;
  }

  /* =========================================
     HELPERS
  ========================================= */

  window._muralFallback = function(img) {
    var backup = img.getAttribute("data-fallback-src");
    if (backup && backup.startsWith("data:image") && !img.dataset.fallbackApplied) {
      img.src = backup;
      img.dataset.fallbackApplied = "true";
      console.log("[BRAZUG] Imagem recuperada via backup (Base64)");
    }
  };

  function escapeHtml(str) {
    var div = document.createElement("div");

    div.textContent = String(str || "");

    return div.innerHTML;
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "";
    }

    try {
      var date = new Date(dateString + "T12:00:00");

      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (err) {
      return dateString;
    }
  }

  function getImageUrl(url) {
    if (!url) {
      return "";
    }

    return String(url).trim();
  }

  /* =========================================
     CARD
  ========================================= */

  function renderCard(adventure) {
    var imageUrl = getImageUrl(adventure.image_url);
    var fallbackData = adventure.image_data || "";

    var imageBlock = imageUrl
      ? (
          '<img ' +
          'class="mural-card-img" ' +
          'src="' + escapeHtml(imageUrl) + '" ' +
          'data-fallback-src="' + escapeHtml(fallbackData) + '" ' +
          'onerror="_muralFallback(this)" ' +
          'alt="' + escapeHtml(adventure.title || "Aventura") + '" ' +
          'loading="lazy" />'
        )
      : (
          '<div class="mural-card-img placeholder"></div>'
        );

    return (
      '<article class="mural-card" ' +
      'data-adventure-id="' +
      escapeHtml(adventure.id) +
      '">' +

      imageBlock +

      '<div class="mural-card-body">' +

      '<p class="mural-card-meta">' +
      escapeHtml(formatDate(adventure.event_date)) +
      "</p>" +

      '<h3 class="mural-card-title">' +
      escapeHtml(adventure.title || "Sem título") +
      "</h3>" +

      '<p class="mural-card-text">' +
      escapeHtml(adventure.body || "") +
      "</p>" +

      (
        adventure.author
          ? (
              '<p class="mural-card-author">' +
              "— " +
              escapeHtml(adventure.author) +
              "</p>"
            )
          : ""
      ) +

      "</div>" +
      "</article>"
    );
  }

  /* =========================================
     MODAL
  ========================================= */

  function openModal(adventure) {
    if (!adventure) {
      return;
    }

    var imageUrl = getImageUrl(adventure.image_url);
    var fallbackData = adventure.image_data || "";

    // Reset fallback state for modal image
    delete modalImg.dataset.fallbackApplied;
    modalImg.setAttribute("data-fallback-src", fallbackData);
    modalImg.onerror = function() {
      window._muralFallback(modalImg);
    };

    modalImg.src = imageUrl || "";

    modalImg.alt =
      adventure.title || "Aventura";

    modalTitle.textContent =
      adventure.title || "Aventura";

    modalDate.textContent =
      formatDate(adventure.event_date);

    modalBody.textContent =
      adventure.body || "";

    modalAuthor.textContent =
      adventure.author
        ? "— " + adventure.author
        : "";

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

  /* =========================================
     EVENTS
  ========================================= */

  gridEl.addEventListener("click", function (event) {
    var card = event.target.closest(".mural-card");

    if (!card) {
      return;
    }

    var id =
      card.getAttribute("data-adventure-id");

    var adventure =
      findAdventureById(id);

    if (adventure) {
      openModal(adventure);
    }
  });

  modalEl.addEventListener("click", function (event) {
    var action =
      event.target.getAttribute("data-action");

    if (action === "close") {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      !modalEl.hidden
    ) {
      closeModal();
    }
  });

  /* =========================================
     LOAD FROM DATABASE
  ========================================= */

  async function loadMural() {
    statusEl.hidden = false;
    statusEl.textContent = "Carregando mural...";

    gridEl.hidden = true;
    emptyEl.hidden = true;

    try {
      var response = await fetch(
        "/api/adventures",
        {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "API returned " + response.status
        );
      }

      var data = await response.json();

      console.log(
        "[BRAZUG] adventures:",
        data
      );

      var adventures =
        Array.isArray(data.adventures)
          ? data.adventures
          : [];

      adventuresCache = adventures;

      if (!adventures.length) {
        statusEl.hidden = true;

        emptyEl.hidden = false;

        return;
      }

      gridEl.innerHTML =
        adventures
          .map(renderCard)
          .join("");

      gridEl.hidden = false;

      statusEl.hidden = false;

      statusEl.textContent =
        adventures.length === 1
          ? "1 aventura no mural"
          : adventures.length +
            " aventuras no mural";

    } catch (err) {
      console.error(
        "[BRAZUG] mural load failed:",
        err
      );

      statusEl.hidden = false;

      statusEl.textContent =
        "Erro ao carregar mural.";
    }
  }

  /* =========================================
     START
  ========================================= */

  loadMural();

})();
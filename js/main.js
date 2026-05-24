(function () {
  "use strict";

  // Menu toggle logic
  var menuToggle = document.getElementById("menu-toggle");
  var headerNav = document.getElementById("header-nav");
  var navLinks = document.querySelectorAll(".nav-link");

  if (menuToggle && headerNav) {
    menuToggle.addEventListener("click", function() {
      headerNav.classList.toggle("active");
    });

    // Close menu when a link is clicked
    navLinks.forEach(function(link) {
      link.addEventListener("click", function() {
        headerNav.classList.remove("active");
      });
    });
  }

  // Atualize aqui quando a versão no .toc mudar (ou carregue de um JSON depois).
  var ADDON_VERSION = "1.8.8";

  var el = document.getElementById("addon-version");
  if (el) {
    el.textContent = ADDON_VERSION;
  }
})();

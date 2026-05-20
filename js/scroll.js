(function () {
  "use strict";

  var root = document.getElementById("scroll-root");
  var panels = document.querySelectorAll(".panel[data-panel]");
  var dots = document.querySelectorAll(".dot[data-section]");

  if (!root || !panels.length) return;

  function setActive(sectionId) {
    dots.forEach(function (dot) {
      var match = dot.getAttribute("data-section") === sectionId;
      dot.classList.toggle("is-active", match);
    });
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          setActive(entry.target.getAttribute("data-panel"));
        }
      });
    },
    { root: root, threshold: [0.5, 0.65] }
  );

  panels.forEach(function (panel) {
    observer.observe(panel);
  });

  dots.forEach(function (dot) {
    dot.addEventListener("click", function (e) {
      var id = dot.getAttribute("data-section");
      var target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();

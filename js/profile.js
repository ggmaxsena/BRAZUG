(function () {
  "use strict";

  var passForm = document.getElementById("password-form");
  var passMsg = document.getElementById("password-msg");

  function getToken() { return localStorage.getItem("brazug_admin_token") || ""; }

  passForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    passMsg.hidden = true;
    var fd = new FormData(passForm);
    var body = Object.fromEntries(fd);

    try {
      var res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + getToken(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      passMsg.textContent = "Senha alterada com sucesso!";
      passMsg.style.color = "#2d6a3e";
      passMsg.hidden = false;
      passForm.reset();
    } catch (e) {
      passMsg.textContent = e.message;
      passMsg.style.color = "#e07a6a";
      passMsg.hidden = false;
    }
  });

  async function loadUserAdventures() {
    try {
      var res = await fetch("/api/admin/adventures", {
        headers: { "Authorization": "Bearer " + getToken() }
      });
      var data = await res.json();
      var listEl = document.getElementById("user-adventures-list");
      var username = localStorage.getItem("brazug_admin_user");
      
      var filtered = (data.adventures || []).filter(function(a) {
        return a.author && a.author.toLowerCase().includes(username.toLowerCase());
      });

      listEl.innerHTML = filtered.map(function(a) {
        return '<li>' + a.title + ' (' + a.event_date + ')</li>';
      }).join("") || '<li>Nenhuma aventura cadastrada por você.</li>';
    } catch (e) { console.error(e); }
  }

  if (getToken()) loadUserAdventures();
})();

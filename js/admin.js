(function () {
  "use strict";

  var TOKEN_KEY = "brazug_admin_token";

  var loginPanel = document.getElementById("login-panel");
  var dashboardPanel = document.getElementById("dashboard-panel");
  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");
  var btnLogout = document.getElementById("btn-logout");
  var adventureForm = document.getElementById("adventure-form");
  var formMsg = document.getElementById("form-msg");
  var adminList = document.getElementById("admin-list");

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    return {
      Authorization: "Bearer " + getToken(),
      "Content-Type": "application/json",
    };
  }

  function showDashboard(show) {
    loginPanel.hidden = show;
    dashboardPanel.hidden = !show;
    btnLogout.hidden = !show;
  }

  async function api(path, options) {
    var res = await fetch("/api/admin" + path, options || {});
    var data = {};
    try {
      data = await res.json();
    } catch (e) {}
    if (!res.ok) throw new Error(data.error || "Erro " + res.status);
    return data;
  }

  async function loadList() {
    var data = await api("/adventures", { headers: authHeaders() });
    var list = data.adventures || [];
    adminList.innerHTML = "";

    if (!list.length) {
      adminList.innerHTML = "<li><span class=\"admin-list-info\">Nenhuma aventura.</span></li>";
      return;
    }

    list.forEach(function (a) {
      var li = document.createElement("li");
      li.innerHTML =
        '<div class="admin-list-info"><strong>' +
        escapeHtml(a.title) +
        "</strong><span>" +
        escapeHtml(a.event_date) +
        (a.published ? "" : " · rascunho") +
        "</span></div>" +
        '<div class="admin-list-actions">' +
        '<button type="button" class="btn-small danger" data-del="' +
        a.id +
        '">Excluir</button></div>';
      adminList.appendChild(li);
    });

    adminList.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Excluir esta aventura?")) return;
        try {
          await api("/adventures/" + btn.getAttribute("data-del"), {
            method: "DELETE",
            headers: authHeaders(),
          });
          loadList();
        } catch (e) {
          alert(e.message);
        }
      });
    });
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    loginError.hidden = true;
    try {
      var res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: document.getElementById("login-password").value,
        }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login falhou");
      setToken(data.token);
      showDashboard(true);
      loadList();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.hidden = false;
    }
  });

  btnLogout.addEventListener("click", function () {
    setToken("");
    showDashboard(false);
  });

  adventureForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    formMsg.hidden = true;

    var fd = new FormData(adventureForm);
    var imageUrl = (fd.get("image_url") || "").toString().trim();
    var file = fd.get("image_file");

    if (file && file.size > 0) {
      var up = new FormData();
      up.append("image", file);
      var upRes = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + getToken() },
        body: up,
      });
      var upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || "Upload falhou");
      imageUrl = upData.url;
    }

    var payload = {
      title: fd.get("title"),
      body: fd.get("body"),
      author: fd.get("author") || "",
      image_url: imageUrl,
      event_date: fd.get("event_date") || new Date().toISOString().slice(0, 10),
      published: !!fd.get("published"),
    };

    try {
      await api("/adventures", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      formMsg.textContent = "Aventura salva no mural.";
      formMsg.hidden = false;
      adventureForm.reset();
      adventureForm.querySelector("[name=published]").checked = true;
      loadList();
    } catch (err) {
      formMsg.textContent = err.message;
      formMsg.hidden = false;
      formMsg.style.color = "#e07a6a";
    }
  });

  if (getToken()) {
    api("/adventures", { headers: authHeaders() })
      .then(function () {
        showDashboard(true);
        loadList();
      })
      .catch(function () {
        setToken("");
        showDashboard(false);
      });
  } else {
    showDashboard(false);
  }
})();

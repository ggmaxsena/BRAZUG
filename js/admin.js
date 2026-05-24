(function () {
  "use strict";

  var TOKEN_KEY = "brazug_admin_token";
  var ROLE_KEY = "brazug_admin_role";
  var editingId = null;

  var loginPanel = document.getElementById("login-panel");
  var dashboardPanel = document.getElementById("dashboard-panel");
  var loginForm = document.getElementById("login-form");
  var registerForm = document.getElementById("register-form");
  var authError = document.getElementById("auth-error");
  var authSuccess = document.getElementById("auth-success");
  var authTitle = document.getElementById("auth-title");
  var authHint = document.getElementById("auth-hint");
  var btnLogout = document.getElementById("btn-logout");
  
  // Header user display
  var userBadge = document.getElementById("user-badge");
  var userDisplayName = document.getElementById("user-display-name");
  var userDisplayRole = document.getElementById("user-display-role");

  var toggleToRegister = document.getElementById("toggle-to-register");
  var toggleToLogin = document.getElementById("toggle-to-login");

  var adventureForm = document.getElementById("adventure-form");
  var formMsg = document.getElementById("form-msg");
  var adminList = document.getElementById("admin-list");

  // User management elements
  var usersPanel = document.getElementById("users-panel");
  var userForm = document.getElementById("user-form");
  var usersList = document.getElementById("users-list");
  var adventurePanel = document.getElementById("adventure-panel");

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function getUsername() {
    return localStorage.getItem("brazug_admin_user") || "";
  }

  function getRole() {
    return localStorage.getItem(ROLE_KEY) || "";
  }

  function setAuth(token, role, username) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ROLE_KEY, role);
      localStorage.setItem("brazug_admin_user", username || "");
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem("brazug_admin_user");
    }
  }

  function authHeaders() {
    return {
      Authorization: "Bearer " + getToken(),
      "Content-Type": "application/json",
    };
  }

  function showDashboard(show) {
    var role = getRole();
    var username = getUsername();
    
    loginPanel.hidden = show;
    dashboardPanel.hidden = !show;
    btnLogout.hidden = !show;
    
    if (userBadge) {
      userBadge.hidden = !show;
      if (show) {
        userDisplayName.textContent = username;
        userDisplayRole.textContent = role.toUpperCase();
      }
    }

    if (show) {
      // Admin only panel
      usersPanel.hidden = (role !== "admin");
      
      // Guildmember can't create adventures
      if (adventurePanel) {
        adventurePanel.hidden = (role === "guildmember");
      }
    }
  }

  // Auth Toggles
  if (toggleToRegister) {
    toggleToRegister.addEventListener("click", function(e) {
      e.preventDefault();
      loginForm.hidden = true;
      registerForm.hidden = false;
      authTitle.textContent = "Criar Conta";
      authHint.textContent = "Use a palavra-passe fornecida pelo líder.";
      authError.hidden = true;
      authSuccess.hidden = true;
    });
  }

  if (toggleToLogin) {
    toggleToLogin.addEventListener("click", function(e) {
      e.preventDefault();
      loginForm.hidden = false;
      registerForm.hidden = true;
      authTitle.textContent = "Mural de Aventuras";
      authHint.textContent = "Acesso restrito a oficiais da guilda.";
      authError.hidden = true;
      authSuccess.hidden = true;
    });
  }

  async function api(path, options) {
    var res = await fetch("/api/admin" + path, options || {});
    var data = {};

    try {
      data = await res.json();
    } catch (e) {}

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        // Token expired or unauthorized
        if (path !== "/login") {
          setAuth("");
          showDashboard(false);
        }
      }
      throw new Error(data.error || "Erro " + res.status);
    }

    return data;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function fillForm(adventure) {
    editingId = adventure.id;

    adventureForm.title.value = adventure.title || "";
    adventureForm.body.value = adventure.body || "";
    adventureForm.author.value = adventure.author || "";
    adventureForm.image_url.value = adventure.image_url || "";
    adventureForm.event_date.value = adventure.event_date || "";
    adventureForm.published.checked = !!adventure.published;
    if (adventureForm.visibility) adventureForm.visibility.value = adventure.visibility || "public";

    formMsg.textContent = "Modo edição ativado.";
    formMsg.hidden = false;

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    editingId = null;
    adventureForm.reset();
    if (adventureForm.querySelector("[name=published]")) {
      adventureForm.querySelector("[name=published]").checked = true;
    }
  }

  async function loadList() {
    try {
      var data = await api("/adventures", {
        headers: authHeaders(),
      });

      var list = data.adventures || [];
      var role = getRole();

      adminList.innerHTML = "";

      if (!list.length) {
        adminList.innerHTML =
          '<li><span class="admin-list-info">Nenhuma aventura.</span></li>';
        return;
      }

      list.forEach(function (a) {
        var li = document.createElement("li");

        var canEdit = ["admin", "guildmaster", "officer"].includes(role);
        var canDelete = ["admin", "guildmaster"].includes(role);

        var actions = "";
        if (canEdit) actions += '<button type="button" class="btn-small edit" data-edit="' + a.id + '">Editar</button>';
        if (canDelete) actions += '<button type="button" class="btn-small danger" data-del="' + a.id + '">Excluir</button>';

        li.innerHTML =
          '<div class="admin-list-info">' +
          "<strong>" +
          escapeHtml(a.title) +
          "</strong>" +
          "<span>" +
          escapeHtml(a.event_date) +
          (a.published ? "" : " · rascunho") +
          "</span>" +
          "</div>" +
          '<div class="admin-list-actions">' +
          actions +
          "</div>";

        adminList.appendChild(li);

        if (canEdit) {
          li.querySelector("[data-edit]").addEventListener("click", function () {
            fillForm(a);
          });
        }

        if (canDelete) {
          li.querySelector("[data-del]").addEventListener("click", async function () {
            if (!confirm("Excluir esta aventura?")) return;
            try {
              await api("/adventures/" + a.id, {
                method: "DELETE",
                headers: authHeaders(),
              });
              loadList();
            } catch (e) {
              alert(e.message);
            }
          });
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function loadUsers() {
    if (getRole() !== "admin") return;
    try {
      var data = await api("/users", { headers: authHeaders() });
      var list = data.users || [];
      usersList.innerHTML = "";
      list.forEach(function (u) {
        var li = document.createElement("li");
        li.innerHTML = 
          '<div class="admin-list-info">' +
          "<strong>" + escapeHtml(u.username) + "</strong>" +
          "<span>Role: " + escapeHtml(u.role) + "</span>" +
          "</div>" +
          '<div class="admin-list-actions">' +
          '<button type="button" class="btn-small edit" data-reset-pw="' + u.id + '">Senha</button>' +
          '<button type="button" class="btn-small danger" data-del-user="' + u.id + '">Excluir</button>' +
          "</div>";
        usersList.appendChild(li);

        li.querySelector("[data-reset-pw]").addEventListener("click", async function() {
          var newPass = prompt("Digite a nova senha para o usuário '" + u.username + "':");
          if (!newPass) return;
          try {
            await api("/users/" + u.id + "/reset-password", { 
              method: "POST", 
              headers: authHeaders(),
              body: JSON.stringify({ password: newPass })
            });
            alert("Senha alterada com sucesso!");
          } catch(e) { alert(e.message); }
        });

        li.querySelector("[data-del-user]").addEventListener("click", async function() {
          if (!confirm("Excluir este usuário?")) return;
          try {
            await api("/users/" + u.id, { method: "DELETE", headers: authHeaders() });
            loadUsers();
          } catch(e) { alert(e.message); }
        });
      });
    } catch (e) { console.error(e); }
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    authError.hidden = true;
    authSuccess.hidden = true;

    try {
      var res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: document.getElementById("login-username").value,
          password: document.getElementById("login-password").value,
        }),
      });

      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login falhou");

      setAuth(data.token, data.user.role, data.user.username);
      showDashboard(true);
      loadList();
      loadUsers();

    } catch (err) {
      authError.textContent = err.message;
      authError.hidden = false;
    }
  });

  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    authError.hidden = true;
    authSuccess.hidden = true;

    try {
      var res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: document.getElementById("reg-username").value,
          password: document.getElementById("reg-password").value,
          secret: document.getElementById("reg-secret").value,
        }),
      });

      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cadastro falhou");

      authSuccess.textContent = "Conta criada! Agora você já pode fazer login.";
      authSuccess.hidden = false;
      
      // Volta para o login após 2 segundos
      setTimeout(function() {
        toggleToLogin.click();
        document.getElementById("login-username").value = document.getElementById("reg-username").value;
        registerForm.reset();
      }, 2000);

    } catch (err) {
      authError.textContent = err.message;
      authError.hidden = false;
    }
  });

  btnLogout.addEventListener("click", function () {
    setAuth("");
    showDashboard(false);
  });

  adventureForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    formMsg.hidden = true;

    try {
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
        visibility: fd.get("visibility") || "public",
        title: fd.get("title"),
        body: fd.get("body"),
        author: fd.get("author") || "",
        image_url: imageUrl,
        event_date: fd.get("event_date") || new Date().toISOString().slice(0, 10),
        published: !!fd.get("published"),
      };

      if (editingId) {
        await api("/adventures/" + editingId, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        formMsg.textContent = "Aventura atualizada.";
      } else {
        await api("/adventures", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        formMsg.textContent = "Aventura criada.";
      }

      formMsg.hidden = false;
      resetForm();
      loadList();

    } catch (err) {
      formMsg.textContent = err.message;
      formMsg.style.color = "#e07a6a";
      formMsg.hidden = false;
    }
  });

  if (userForm) {
    userForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      var fd = new FormData(userForm);
      try {
        await api("/users", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(Object.fromEntries(fd))
        });
        userForm.reset();
        loadUsers();
      } catch(e) { alert(e.message); }
    });
  }

  if (getToken()) {
    api("/me", { headers: authHeaders() })
      .then(function (data) {
        setAuth(getToken(), data.user.role);
        showDashboard(true);
        loadList();
        loadUsers();
      })
      .catch(function () {
        setAuth("");
        showDashboard(false);
      });
  } else {
    showDashboard(false);
  }
})();
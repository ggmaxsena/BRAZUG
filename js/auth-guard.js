(function() {
  "use strict";

  var role = localStorage.getItem("brazug_admin_role");
  var page = window.location.pathname;

  var permissions = {
    "/admin.html": ["admin"],
    "/cadastro-aventura.html": ["admin", "guildmaster", "officer", "guildmember"],
    "/perfil.html": ["admin", "guildmaster", "officer", "guildmember"]
  };

  if (permissions[page]) {
    if (!role || !permissions[page].includes(role)) {
      alert("Acesso negado: Você não tem permissão para acessar esta página.");
      window.location.href = "/admin.html";
    }
  }
})();

(function() {
  "use strict";

  var role = (localStorage.getItem("brazug_admin_role") || "").trim().toLowerCase();
  var token = localStorage.getItem("brazug_admin_token");
  var page = window.location.pathname;

  // Páginas restritas a administradores
  var adminOnly = ["/admin.html"];
  // Páginas para qualquer membro autenticado (perfil e cadastro de personagem/aventura)
  var memberPages = ["/cadastro-aventura.html", "/perfil.html"];

  function deny(redirect) {
    alert("Acesso negado: Você não tem permissão para acessar esta página.");
    window.location.href = redirect;
  }

  if (adminOnly.indexOf(page) !== -1) {
    // Apenas admin; redireciona os demais para o perfil (evita loop de redirecionamento)
    if (role !== "admin") deny("/perfil.html");
  } else if (memberPages.indexOf(page) !== -1) {
    // Basta estar autenticado (qualquer role). O servidor valida o token de verdade.
    if (!token || !role) deny("/login.html");
  }
})();

(async function () {
  "use strict";

  var page = window.location.pathname;
  var adminOnly = ["/admin.html"];
  var staffPages = ["/admin-core.html"];
  var memberPages = ["/cadastro-aventura.html", "/perfil.html", "/ficha.html"];

  var needsAdmin = adminOnly.indexOf(page) !== -1;
  var needsStaff = staffPages.indexOf(page) !== -1;
  var needsMember = memberPages.indexOf(page) !== -1;
  if (!needsAdmin && !needsStaff && !needsMember) return;

  function deny(redirect) {
    alert("Acesso negado: Você não tem permissão para acessar esta página.");
    window.location.href = redirect;
  }

  try {
    var res = await fetch("/api/auth/me");
    if (!res.ok) return deny("/login.html");
    var data = await res.json();
    var role = (data.user && data.user.role ? data.user.role : "").trim().toLowerCase();
    localStorage.setItem("brazug_admin_token", "session");
    localStorage.setItem("brazug_admin_role", data.user.role);
    localStorage.setItem("brazug_admin_user", data.user.username);

    if (needsAdmin && role !== "admin") return deny("/perfil.html");
    if (needsStaff && ["admin", "guildmaster", "officer"].indexOf(role) === -1) {
      // Raid leaders de um CORE também podem entrar no painel de COREs.
      var leadRes = await fetch("/api/core/my-leadership");
      var leadData = leadRes.ok ? await leadRes.json().catch(function () { return {}; }) : {};
      if (!leadData.coreIds || !leadData.coreIds.length) return deny("/perfil.html");
    }
  } catch (e) {
    deny("/login.html");
  }
})();

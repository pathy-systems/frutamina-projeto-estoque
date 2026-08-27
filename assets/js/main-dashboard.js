// Entry point de visao-geral.html (dashboard: total do CD, saida de caixas, overview).
import { PAGE_MODE, isRestrictedPageMode } from "./state.js";
import {
  applyCatalogOverridesFromCache,
  refreshCatalogOverrides,
} from "./catalog-overrides.js";
import {
  initSetorSelects,
  setupTheme,
  setupShellEvents,
  setupAuth,
  enforceSessionLimit,
  lockRestrictedAccess,
  setSidebarOpen,
  showNotificationInvite,
} from "./auth-ui.js";
import { setupDashboard, renderDashboard } from "./dashboard.js";
import { loadPublicRecords, loadSnapshotRecords, loadUserLabels } from "./supabase-api.js";
import { setupHistoricoProduto } from "./historico-produto.js";

applyCatalogOverridesFromCache();
initSetorSelects();
setupTheme();
setupShellEvents();
if (isRestrictedPageMode()) {
  lockRestrictedAccess();
}
setSidebarOpen(false);
setupDashboard();
setupHistoricoProduto();
setupAuth();
loadPublicRecords();
loadUserLabels();
if (PAGE_MODE === "dashboard") {
  loadSnapshotRecords();
}
setInterval(enforceSessionLimit, 60 * 1000);

window.addEventListener("resize", () => {
  renderDashboard();
});

window.addEventListener("load", () => {
  setTimeout(showNotificationInvite, 2000);
});

// Catalogo global vem do Supabase, mas nao pode bloquear o boot: a UI ja subiu
// com o cache local acima e so re-renderiza se a rede trouxer algo diferente.
refreshCatalogOverrides().then((changed) => {
  if (changed) {
    import("./catalog-crud.js").then((m) => m.refreshCatalogDependentUI());
  }
});

// Entry point de index.html (estoque publico + comando de texto).
import { state, isRestrictedPageMode } from "./state.js";
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
import {
  buildFilterOptions,
  renderContext,
  renderPublicTable,
  renderCountTable,
  setPublicViewMode,
  setCountViewMode,
  setupPublicTableEvents,
  setupCountTableEvents,
} from "./tables.js";
import { setupCommandEvents } from "./voice-actions.js";
import { loadPublicRecords, loadUserLabels } from "./supabase-api.js";

applyCatalogOverridesFromCache();
initSetorSelects();
buildFilterOptions();
renderContext();
renderPublicTable();
renderCountTable();
setPublicViewMode(state.publicViewMode);
setCountViewMode(state.countViewMode);
setupTheme();
setupShellEvents();
setupPublicTableEvents({ loadPublicRecords });
setupCountTableEvents();
setupCommandEvents();
if (isRestrictedPageMode()) {
  lockRestrictedAccess();
}
setSidebarOpen(false);
setupAuth();
loadPublicRecords();
loadUserLabels();
setInterval(enforceSessionLimit, 60 * 1000);

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

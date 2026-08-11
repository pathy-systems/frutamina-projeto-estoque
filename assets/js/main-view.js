// Entry point de index.html (estoque publico + comando de texto).
import { state, isRestrictedPageMode } from "./state.js";
import { loadCatalogOverrides } from "./catalog-overrides.js";
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

await loadCatalogOverrides();
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

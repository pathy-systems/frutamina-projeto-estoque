// Entry point de editar.html (voz, formulario manual, edicao, nova contagem offline).
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
  setupCountTableEvents,
} from "./tables.js";
import { setupCommandEvents } from "./voice-actions.js";
import { setupVoice } from "./voice-speech.js";
import { initManualForm, setupManualFormEvents } from "./manual-form.js";
import { setupCountModeEvents, updateCountModeUI } from "./count-mode.js";
import { loadPublicRecords, loadUserLabels } from "./supabase-api.js";

await loadCatalogOverrides();
initSetorSelects();
initManualForm();
buildFilterOptions();
renderContext();
renderPublicTable();
renderCountTable();
setPublicViewMode(state.publicViewMode);
setCountViewMode(state.countViewMode);
updateCountModeUI();
setupTheme();
setupVoice();
setupShellEvents();
setupCountTableEvents();
setupCommandEvents();
setupManualFormEvents();
setupCountModeEvents();
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

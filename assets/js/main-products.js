// Entry point de produtos.html (cadastro/CRUD do catalogo de produtos).
import { isRestrictedPageMode } from "./state.js";
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
import { buildFilterOptions, renderContext, renderPublicTable, renderCountTable } from "./tables.js";
import { initCatalogForm, setupCatalogEvents } from "./catalog-crud.js";
import { loadPublicRecords } from "./supabase-api.js";

await loadCatalogOverrides();
initSetorSelects();
initCatalogForm();
buildFilterOptions();
renderContext();
renderPublicTable();
renderCountTable();
setupTheme();
setupShellEvents();
setupCatalogEvents();
if (isRestrictedPageMode()) {
  lockRestrictedAccess();
}
setSidebarOpen(false);
setupAuth();
loadPublicRecords();
setInterval(enforceSessionLimit, 60 * 1000);

window.addEventListener("load", () => {
  setTimeout(showNotificationInvite, 2000);
});

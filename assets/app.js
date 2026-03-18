const SUPABASE_URL = "https://ldkazwnzfppcsoolydkp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_14RDXtWzeDV-nzAHfGrNCw_lB4XsUSn";
const TABLE_NAME = "estoque_registros";
const SNAPSHOT_TABLE = "estoque_snapshots";
const SESSION_MAX_MS = 60 * 60 * 1000;
const SUPABASE_TIMEOUT_MS = 45000;
const PUBLIC_CACHE_KEY = "cd_public_cache";
const PUBLIC_CACHE_AT_KEY = "cd_public_cache_at";

const CONFIG_GERAL = {
  CHAO: {
    AMARELO: {
      ANGEL: (t) => (t >= 4 && t <= 9 ? 72 : 65),
      BAHIA: (t) => 66,
      SAMBA: (t) => (t >= 4 && t <= 6 ? 66 : 65),
      BRAZIL: (t) => (t >= 4 && t <= 6 ? 66 : 65),
      "BRAZIL REDE": (t) => (t >= 4 && t <= 7 ? 66 : 65),
      MOSSORO: (t) => (t >= 4 && t <= 6 ? 72 : 70),
      "MOSSORO REDE": (t) => (t >= 4 && t <= 6 ? 72 : 70),
      SOL: (t) => 72,
    },
    SAPO: {
      ANGEL: (t) => (t >= 4 && t <= 9 ? 72 : 65),
      SAMBA: (t) => (t >= 4 && t <= 6 ? 66 : 65),
      "SAMBA REDE": (t) => 77,
      LOLA: (t) => 66,
      BAHIA: (t) => 66,
  
    },
    "MELANCIA (CHAO)": {
      SAMBA: (t) => (t >= 4 && t <= 7 ? 66 : 65),
      MOSSORO: (t) => 60,
    },
  },
  GELADEIRA: {
    CANTALOUPE: {
      SAMBA: (t) => 65,
      BRAZIL: (t) => 65,
    },
    DINO: {
      SAMBA: (t) => 84,
      BRAZIL: (t) => 84,
    },
  },
  ITAUEIRA: {
    AMARELO: {
      REI: (t) => (t === 4 ? 77 : 84),
      "REI 14Kg": (t) => 66,
      CEPI: (t) => (t === 4 ? 77 : 84),
      GAIA: (t) => (t === 4 ? 77 : 84),
    },
    SAPO: {
      REI: (t) => (t === 4 ? 77 : 84),
      "REI 14Kg": (t) => 66,
      CEPI: (t) => (t === 4 ? 77 : 84),
      GAIA: (t) => (t >= 6 && t <= 7 ? 66 : 65),
    },
    "MELANCIA (ITAUEIRA)": {
      MAGALI: (t) => (t >= 5 && t <= 6 ? 77 : 84),
      "MAGALI 14Kg": (t) => 66,
      CEPI: (t) => (t >= 5 && t <= 6 ? 77 : 84),
      "CEPI 14Kg": (t) => 66,
    },
    MATISSE: {
      "MATISSE REI": (t) => (t >= 5 && t <= 6 ? 77 : 84),
      "MATISSE CEPI": (t) => (t >= 5 && t <= 6 ? 77 : 84),
      CEPI: (t) => (t >= 5 && t <= 6 ? 77 : 84),
    },
    CANTALOUPE: {
      "CANTALOUPE REI": (t) => (t >= 5 && t <= 6 ? 77 : 84),
      "CANTALOUPE CEPI": (t) => (t >= 5 && t <= 6 ? 77 : 84),
    },
    GALIA: {
      "GALIA REI": (t) => (t >= 5 && t <= 6 ? 77 : 84),
      "GALIA CEPI": (t) => (t >= 5 && t <= 6 ? 77 : 84),
    },
    PIMENTAO: {
      AMARELO: (t) => 88,
      VERMELHO: (t) => 88,
      LARANJA: (t) => 88,
      DUO: (t) => 88,
    },
  },
};

const NUMBER_WORDS = {
  ZERO: 0,
  UM: 1,
  UMA: 1,
  DOIS: 2,
  DUAS: 2,
  TRES: 3,
  QUATRO: 4,
  CINCO: 5,
  SEIS: 6,
  SETE: 7,
  OITO: 8,
  NOVE: 9,
  DEZ: 10,
  ONZE: 11,
  DOZE: 12,
  TREZE: 13,
  CATORZE: 14,
  QUATORZE: 14,
  QUINZE: 15,
  DEZESSEIS: 16,
  DEZESSETE: 17,
  DEZOITO: 18,
  DEZENOVE: 19,
  VINTE: 20,
};

const ADD_KEYWORDS = new Set([
  "ADICIONAR",
  "ADICIONE",
  "ADICIONA",
  "SOMAR",
  "SOME",
  "SOMA",
  "ACRESCENTAR",
  "ACRESCENTE",
  "ACRESCENTA",
  "MAIS",
]);

const state = {
  setor: Object.keys(CONFIG_GERAL)[0],
  produto: null,
  marca: null,
  tipo: null,
  countMode: "current",
  sessionRows: [],
  userRows: [],
  editTarget: null,
  selectedRowKey: null,
  publicQuery: "",
  publicFilters: {
    setor: "",
    produto: "",
    marca: "",
    tipo: "",
  },
  publicViewMode: "detailed",
  countViewMode: "detailed",
  lastUpdatePublicAt: null,
  lastUpdateCountAt: null,
  lastUpdatePublicBy: null,
  lastUpdateCountBy: null,
  snapshotRows: [],
  publicRows: [],
  rawPublicRows: [],
  user: null,
  dashboardRange: "1D",
  dashboardSeries: null,
  dashboardHover: {
    total: null,
    outflow: null,
  },
  dashboardMeta: {
    total: null,
    outflow: null,
  },
};

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const elements = {
  menuView: document.getElementById("menu-view"),
  menuDashboard: document.getElementById("menu-dashboard"),
  menuCount: document.getElementById("menu-count"),
  menuUser: document.getElementById("menu-user"),
  menuUserEmail: document.getElementById("menu-user-email"),
  menuLogout: document.getElementById("menu-logout"),
  publicPanel: document.getElementById("public-panel"),
  publicSearchForm: document.getElementById("public-search-form"),
  publicSearch: document.getElementById("public-search"),
  publicFilterBtn: document.getElementById("public-filter-btn"),
  filterModal: document.getElementById("filter-modal"),
  filterClose: document.getElementById("filter-close"),
  filterCloseBtn: document.getElementById("filter-close-btn"),
  filterApply: document.getElementById("filter-apply"),
  filterClear: document.getElementById("filter-clear"),
  filterSetor: document.getElementById("filter-setor"),
  filterProduto: document.getElementById("filter-produto"),
  filterMarca: document.getElementById("filter-marca"),
  filterTipo: document.getElementById("filter-tipo"),
  publicTableBody: document.getElementById("public-table-body"),
  publicTotalGeral: document.getElementById("public-total-geral"),
  publicExportToggle: document.getElementById("public-export-toggle"),
  publicExportSheet: document.getElementById("public-export-sheet"),
  publicExportClose: document.getElementById("public-export-close"),
  publicExportCsv: document.getElementById("public-export-csv"),
  publicExportPdf: document.getElementById("public-export-pdf"),
  publicExportPrint: document.getElementById("public-export-print"),
  publicRefresh: document.getElementById("public-refresh"),
  publicViewDetailedBtn: document.getElementById("public-view-detailed"),
  publicViewSummaryBtn: document.getElementById("public-view-summary"),
  publicViewToggle: document.getElementById("public-view-toggle"),
  publicTableDetailed: document.getElementById("public-table-detailed"),
  publicTableSummary: document.getElementById("public-table-summary"),
  publicLastUpdate: document.getElementById("public-last-update"),
  publicMsg: document.getElementById("public-msg"),
  authPanel: document.getElementById("auth-panel"),
  countPanel: document.getElementById("count-panel"),
  dashboardPanel: document.getElementById("dashboard-panel"),
  loginBtn: document.getElementById("login-btn"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  authMsg: document.getElementById("auth-msg"),
  setorSelect: document.getElementById("setor-select"),
  ctxSetor: document.getElementById("ctx-setor"),
  ctxProduto: document.getElementById("ctx-produto"),
  ctxMarca: document.getElementById("ctx-marca"),
  clearContext: document.getElementById("clear-context"),
  modeCurrentBtn: document.getElementById("mode-current"),
  modeNewBtn: document.getElementById("mode-new"),
  countModeTag: document.getElementById("count-mode-tag"),
  newCountActions: document.getElementById("new-count-actions"),
  saveNewCountBtn: document.getElementById("save-new-count"),
  discardNewCountBtn: document.getElementById("discard-new-count"),
  editItemBtn: document.getElementById("edit-item-btn"),
  editModal: document.getElementById("edit-modal"),
  editClose: document.getElementById("edit-close"),
  editCloseBtn: document.getElementById("edit-close-btn"),
  editTitle: document.getElementById("edit-title"),
  editSetor: document.getElementById("edit-setor"),
  editProduto: document.getElementById("edit-produto"),
  editMarca: document.getElementById("edit-marca"),
  editTipo: document.getElementById("edit-tipo"),
  editCaixas: document.getElementById("edit-caixas"),
  editPallets: document.getElementById("edit-pallets"),
  editSave: document.getElementById("edit-save"),
  editMsg: document.getElementById("edit-msg"),
  debugPanel: document.getElementById("debug-panel"),
  debugUrl: document.getElementById("debug-url"),
  debugKey: document.getElementById("debug-key"),
  debugUser: document.getElementById("debug-user"),
  debugResult: document.getElementById("debug-result"),
  debugHide: document.getElementById("debug-hide"),
  countViewDetailedBtn: document.getElementById("count-view-detailed"),
  countViewSummaryBtn: document.getElementById("count-view-summary"),
  countViewToggle: document.getElementById("count-view-toggle"),
  countTableDetailed: document.getElementById("count-table-detailed"),
  countTableSummary: document.getElementById("count-table-summary"),
  countLastUpdate: document.getElementById("count-last-update"),
  voiceCard: document.getElementById("voice-card"),
  voiceBtn: document.getElementById("voice-btn"),
  voiceStatus: document.getElementById("voice-status"),
  voiceLast: document.getElementById("voice-last"),
  commandInput: document.getElementById("command-input"),
  processBtn: document.getElementById("process-btn"),
  manualSetor: document.getElementById("manual-setor"),
  manualProduto: document.getElementById("manual-produto"),
  manualMarca: document.getElementById("manual-marca"),
  manualTipo: document.getElementById("manual-tipo"),
  manualPallets: document.getElementById("manual-pallets"),
  manualAdd: document.getElementById("manual-add"),
  manualTable: document.getElementById("manual-table"),
  manualLabelTipo: document.getElementById("manual-label-tipo"),
  manualLabelQty: document.getElementById("manual-label-qty"),
  messages: document.getElementById("messages"),
  countTableBody: document.getElementById("count-table-body"),
  countTotalGeral: document.getElementById("count-total-geral"),
  countExportToggle: document.getElementById("count-export-toggle"),
  countExportSheet: document.getElementById("count-export-sheet"),
  countExportClose: document.getElementById("count-export-close"),
  countExportCsv: document.getElementById("count-export-csv"),
  countExportPdf: document.getElementById("count-export-pdf"),
  countExportPrint: document.getElementById("count-export-print"),
  countClearBtn: document.getElementById("count-clear-btn"),
  chartRange: document.getElementById("chart-range"),
  chartTotal: document.getElementById("chart-total"),
  chartTotalValue: document.getElementById("chart-total-value"),
  chartTotalChange: document.getElementById("chart-total-change"),
  chartTotalDate: document.getElementById("chart-total-date"),
  chartTotalTooltip: document.getElementById("chart-total-tooltip"),
  chartOutflow: document.getElementById("chart-outflow"),
  chartOutflowValue: document.getElementById("chart-outflow-value"),
  chartOutflowChange: document.getElementById("chart-outflow-change"),
  chartOutflowDate: document.getElementById("chart-outflow-date"),
  chartOutflowTooltip: document.getElementById("chart-outflow-tooltip"),
};

const PAGE_MODE = document.body?.dataset?.page || "view";

function normalizeText(text) {
  const base = (text || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!base) return "";

  const spaced = base
    .replace(/([A-Z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([A-Z])/g, "$1 $2");

  const tokens = spaced.split(" ").filter(Boolean);
  if (!tokens.length) return "";

  const unitMap = {
    QUILO: "KG",
    QUILOS: "KG",
    KILO: "KG",
    KILOS: "KG",
    QUILOGRAMA: "KG",
    QUILOGRAMAS: "KG",
  };

  return tokens.map((token) => unitMap[token] || token).join(" ").trim();
}

const NO_TIPO_PRODUCTS = new Set(["PIMENTAO"]);
const NO_TIPO_VALUE = 0;
const TIPO_MIN = 3;
const TIPO_MAX = 15;

function isNoTipoProduct(produto) {
  if (!produto) return false;
  return NO_TIPO_PRODUCTS.has(normalizeText(produto));
}

function formatTipoLabelValue(produto, tipo) {
  if (isNoTipoProduct(produto)) {
    if (tipo === null || tipo === undefined || Number(tipo) === NO_TIPO_VALUE) {
      return "S/T";
    }
  }
  return tipo;
}

function isTipoValid(tipo) {
  return Number.isFinite(tipo) && tipo >= TIPO_MIN && tipo <= TIPO_MAX;
}

function tokenizeText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

function buildNormalizedMap(values) {
  const map = {};
  (values || []).forEach((value) => {
    const key = normalizeText(value);
    if (!key) return;
    map[key] = value;
  });
  return map;
}

function containsTokenSequence(tokens, sequence) {
  if (!sequence.length || tokens.length < sequence.length) return false;
  for (let i = 0; i <= tokens.length - sequence.length; i += 1) {
    let match = true;
    for (let j = 0; j < sequence.length; j += 1) {
      if (tokens[i + j] !== sequence[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

function findExactMatch(tokens, map) {
  const entries = Object.entries(map || {}).sort((a, b) => b[0].length - a[0].length);
  for (const [key, value] of entries) {
    if (!key) continue;
    const seq = key.split(" ").filter(Boolean);
    if (!seq.length) continue;
    if (containsTokenSequence(tokens, seq)) {
      return value;
    }
  }
  return null;
}

function toAuthEmail(value) {
  const raw = (value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const sanitized = normalized
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
  if (!sanitized) return "";
  return `${sanitized}@cd.local`;
}

function displayUserFromEmail(email) {
  if (!email) return "--";
  return email.split("@")[0] || email;
}

function extractNumbers(text) {
  const results = [];
  const digitMatches = text.match(/\d+/g);
  if (digitMatches) {
    digitMatches.forEach((match) => {
      const value = Number.parseInt(match, 10);
      if (Number.isFinite(value)) {
        results.push(value);
      }
    });
  }
  const normalized = normalizeText(text);
  const tokens = normalized.split(" ").filter(Boolean);
  tokens.forEach((token) => {
    if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, token)) {
      results.push(NUMBER_WORDS[token]);
    }
  });
  return results;
}

function isAddCommand(text) {
  const tokens = normalizeText(text).split(" ").filter(Boolean);
  return tokens.some((token) => ADD_KEYWORDS.has(token));
}

function pushMessage(type, text) {
  if (!elements.messages) return;
  const msg = document.createElement("div");
  msg.className = `msg ${type}`;
  msg.textContent = text;
  elements.messages.prepend(msg);
  while (elements.messages.children.length > 5) {
    elements.messages.removeChild(elements.messages.lastChild);
  }
}

function setPublicMessage(type, text) {
  if (!elements.publicMsg) return;
  elements.publicMsg.innerHTML = "";
  if (!text) return;
  const msg = document.createElement("div");
  msg.className = `msg ${type}`;
  msg.textContent = text;
  elements.publicMsg.appendChild(msg);
}

function savePublicCache(rows) {
  try {
    localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(rows || []));
    localStorage.setItem(PUBLIC_CACHE_AT_KEY, new Date().toISOString());
  } catch (error) {
    console.warn("Nao foi possivel salvar cache publico.", error);
  }
}

function loadPublicCache() {
  try {
    const raw = localStorage.getItem(PUBLIC_CACHE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Nao foi possivel ler cache publico.", error);
    return [];
  }
}

function setEditMessage(type, text) {
  if (!elements.editMsg) return;
  elements.editMsg.innerHTML = "";
  if (!text) return;
  const msg = document.createElement("div");
  msg.className = `msg ${type}`;
  msg.textContent = text;
  elements.editMsg.appendChild(msg);
}

function setAuthMessage(type, text) {
  if (!elements.authMsg) return;
  elements.authMsg.innerHTML = "";
  if (!text) return;
  const msg = document.createElement("div");
  msg.className = `msg ${type}`;
  msg.textContent = text;
  elements.authMsg.appendChild(msg);
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function storeUserLabel(userId, email) {
  if (!userId || !email) return;
  const label = displayUserFromEmail(email);
  if (!label) return;
  localStorage.setItem(`cd_user_label_${userId}`, label);
}

function getStoredUserLabel(userId) {
  if (!userId) return "";
  return localStorage.getItem(`cd_user_label_${userId}`) || "";
}

function formatUserLabel(userId) {
  if (!userId) return "--";
  if (state.user?.id && userId === state.user.id) {
    return displayUserFromEmail(state.user.email);
  }
  const stored = getStoredUserLabel(userId);
  if (stored) return stored;
  const raw = String(userId);
  const short = raw.includes("-") ? raw.split("-")[0] : raw.slice(0, 6);
  return `usuario ${short}`;
}

function formatLastUpdateText(dateValue, userId) {
  const dateText = formatDateTime(dateValue);
  const userText = formatUserLabel(userId);
  if (dateText === "--" && userText === "--") return "--";
  if (userText === "--") return dateText;
  if (dateText === "--") return userText;
  return `${dateText} | ${userText}`;
}

function renderLastUpdate() {
  if (elements.publicLastUpdate) {
    elements.publicLastUpdate.textContent = formatLastUpdateText(
      state.lastUpdatePublicAt,
      state.lastUpdatePublicBy
    );
  }
  if (elements.countLastUpdate) {
    elements.countLastUpdate.textContent = formatLastUpdateText(
      state.lastUpdateCountAt,
      state.lastUpdateCountBy
    );
  }
}

function updateLastUpdateFromRows(rows, target) {
  let latestRow = null;
  let latestTimestamp = null;
  (rows || []).forEach((row) => {
    const updatedAt = row?.updated_at ? new Date(row.updated_at) : null;
    if (!updatedAt || Number.isNaN(updatedAt.getTime())) return;
    const ts = updatedAt.getTime();
    if (latestTimestamp === null || ts > latestTimestamp) {
      latestTimestamp = ts;
      latestRow = row;
    }
  });

  if (!latestRow || latestTimestamp === null) {
    if (target === "public") {
      state.lastUpdatePublicAt = null;
      state.lastUpdatePublicBy = null;
    } else {
      state.lastUpdateCountAt = null;
      state.lastUpdateCountBy = null;
    }
    renderLastUpdate();
    return;
  }

  if (target === "public") {
    state.lastUpdatePublicAt = new Date(latestTimestamp);
    state.lastUpdatePublicBy = latestRow?.user_id || null;
  } else {
    state.lastUpdateCountAt = new Date(latestTimestamp);
    state.lastUpdateCountBy = latestRow?.user_id || null;
  }
  renderLastUpdate();
}

function getLoginTimestamp() {
  const raw = localStorage.getItem("cd_login_at");
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function setLoginTimestamp() {
  localStorage.setItem("cd_login_at", String(Date.now()));
}

function clearLoginTimestamp() {
  localStorage.removeItem("cd_login_at");
}

function isSessionExpired() {
  const timestamp = getLoginTimestamp();
  if (!timestamp) return false;
  return Date.now() - timestamp > SESSION_MAX_MS;
}

async function enforceSessionLimit() {
  if (isSessionExpired()) {
    await supabaseClient.auth.signOut();
    clearLoginTimestamp();
    setAuthMessage("info", "Sessão expirada. Faça login novamente.");
  }
}

function renderContext() {
  if (elements.ctxSetor) elements.ctxSetor.textContent = state.setor || "--";
  if (elements.ctxProduto) elements.ctxProduto.textContent = state.produto || "--";
  if (elements.ctxMarca) elements.ctxMarca.textContent = state.marca || "--";
  if (elements.setorSelect) elements.setorSelect.value = state.setor;
}

function aggregateRows(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const key = `${row.setor}|||${row.produto}|||${row.marca}|||${row.tipo}`;
    const current = map.get(key);
    if (current) {
      current.pallets += row.pallets;
      current.total_caixas += row.total_caixas;
    } else {
      map.set(key, {
        setor: row.setor,
        produto: row.produto,
        marca: row.marca,
        tipo: row.tipo,
        caixas_pallet: row.caixas_pallet,
        pallets: row.pallets,
        total_caixas: row.total_caixas,
      });
    }
  });
  return Array.from(map.values());
}

function formatSummaryValue(value, showZero = false) {
  if (value === null || value === undefined) return "";
  if (value === 0 && !showZero) return "";
  return value;
}

function buildSummaryGroups(rows) {
  const groups = new Map();
  (rows || []).forEach((row) => {
    if (!row) return;
    const setor = row.setor || "Sem setor";
    const produto = row.produto || "Sem produto";
    const marca = row.marca || "Sem marca";
    const tipo = Number.parseInt(row.tipo, 10);
    if (Number.isNaN(tipo)) return;
    const groupKey = `${setor}|||${produto}`;
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        setor,
        produto,
        brands: new Set(),
        tipos: new Set(),
        matrix: new Map(),
        totals: new Map(),
      };
      groups.set(groupKey, group);
    }

    const pallets = Number(row.pallets) || 0;
    const caixasPallet = Number(row.caixas_pallet);
    const totalCaixas =
      Number(row.total_caixas) ||
      pallets * (Number(row.caixas_pallet) || 0);

    group.brands.add(marca);
    group.tipos.add(tipo);

    if (!group.matrix.has(tipo)) {
      group.matrix.set(tipo, new Map());
    }
    const brandMap = group.matrix.get(tipo);
    const cell = brandMap.get(marca) || {
      pallets: 0,
      total_caixas: 0,
      caixas_pallet: null,
    };
    if (Number.isFinite(caixasPallet) && caixasPallet > 0) {
      cell.caixas_pallet = caixasPallet;
    }
    cell.pallets += pallets;
    cell.total_caixas += totalCaixas;
    brandMap.set(marca, cell);

    const total = group.totals.get(marca) || { pallets: 0, total_caixas: 0 };
    total.pallets += pallets;
    total.total_caixas += totalCaixas;
    group.totals.set(marca, total);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      brands: Array.from(group.brands).sort(),
      tipos: Array.from(group.tipos).sort((a, b) => a - b),
    }))
    .sort((a, b) => {
      const setorDiff = a.setor.localeCompare(b.setor);
      if (setorDiff !== 0) return setorDiff;
      return a.produto.localeCompare(b.produto);
    });
}

function renderSummaryTables(rows, container, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  const groups = buildSummaryGroups(rows);
  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "msg info";
    empty.textContent = "Sem dados para o resumo.";
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "summary-grid";

  groups.forEach((group, index) => {
    const card = document.createElement("section");
    card.className = "summary-card";
    if (options.colorizeFirst && index === 0) {
      card.classList.add("summary-colorized");
    }

    const header = document.createElement("div");
    header.className = "summary-header";
    const title = document.createElement("h3");
    title.textContent = group.produto;
    header.appendChild(title);

    if (options.showSetor !== false) {
      const subtitle = document.createElement("p");
      subtitle.textContent = `Setor: ${group.setor}`;
      header.appendChild(subtitle);
    }

    const table = document.createElement("table");
    table.className = "summary-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const thTipo = document.createElement("th");
    thTipo.textContent = "Tipo";
    thTipo.rowSpan = 2;
    headRow.appendChild(thTipo);
    group.brands.forEach((brand) => {
      const thBrand = document.createElement("th");
      thBrand.textContent = `M: ${brand}`;
      thBrand.colSpan = 3;
      headRow.appendChild(thBrand);
    });
    thead.appendChild(headRow);

    const headRow2 = document.createElement("tr");
    group.brands.forEach(() => {
      const thCaixas = document.createElement("th");
      thCaixas.textContent = "Cx/P";
      const thPallets = document.createElement("th");
      thPallets.textContent = "P";
      const thTotal = document.createElement("th");
      thTotal.textContent = "T";
      headRow2.append(thCaixas, thPallets, thTotal);
    });
    thead.appendChild(headRow2);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    group.tipos.forEach((tipo) => {
      const row = document.createElement("tr");
      const tipoCell = document.createElement("td");
      tipoCell.textContent = tipo;
      tipoCell.className = "cell-tipo";
      row.appendChild(tipoCell);
      group.brands.forEach((brand) => {
        const cell = group.matrix.get(tipo)?.get(brand);
        const caixasPallet = cell?.caixas_pallet ?? 0;
        const pallets = cell?.pallets || 0;
        const total = cell?.total_caixas || 0;
        const caixasCell = document.createElement("td");
        caixasCell.textContent = formatSummaryValue(caixasPallet);
        caixasCell.className = "cell-caixas";
        const palletsCell = document.createElement("td");
        palletsCell.textContent = formatSummaryValue(pallets);
        palletsCell.className = "cell-pallets";
        const totalCell = document.createElement("td");
        totalCell.textContent = formatSummaryValue(total);
        totalCell.className = "cell-total";
        row.append(caixasCell, palletsCell, totalCell);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    const tfoot = document.createElement("tfoot");
    const totalRow = document.createElement("tr");
    const totalLabel = document.createElement("td");
    totalLabel.textContent = "Total";
    totalLabel.className = "cell-sum";
    totalRow.appendChild(totalLabel);
    group.brands.forEach((brand) => {
      const totals = group.totals.get(brand) || {
        pallets: 0,
        total_caixas: 0,
      };
      const caixasTotalCell = document.createElement("td");
      caixasTotalCell.textContent = "";
      const palletsTotalCell = document.createElement("td");
      palletsTotalCell.textContent = "";
      const totalCaixasCell = document.createElement("td");
      totalCaixasCell.textContent = formatSummaryValue(
        totals.total_caixas,
        true
      );
      totalCaixasCell.className = "cell-sum";
      totalRow.append(caixasTotalCell, palletsTotalCell, totalCaixasCell);
    });
    tfoot.appendChild(totalRow);
    table.appendChild(tfoot);

    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    tableWrap.appendChild(table);

    card.append(header, tableWrap);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function setPublicViewMode(mode) {
  state.publicViewMode = mode === "summary" ? "summary" : "detailed";
  if (elements.publicViewToggle) {
    elements.publicViewToggle.classList.toggle(
      "mode-summary",
      state.publicViewMode === "summary"
    );
  }
  if (elements.publicViewDetailedBtn) {
    elements.publicViewDetailedBtn.setAttribute(
      "aria-pressed",
      state.publicViewMode === "detailed"
    );
  }
  if (elements.publicViewSummaryBtn) {
    elements.publicViewSummaryBtn.setAttribute(
      "aria-pressed",
      state.publicViewMode === "summary"
    );
  }
  if (elements.publicTableDetailed) {
    elements.publicTableDetailed.classList.toggle(
      "hidden",
      state.publicViewMode !== "detailed"
    );
  }
  if (elements.publicTableSummary) {
    elements.publicTableSummary.classList.toggle(
      "hidden",
      state.publicViewMode !== "summary"
    );
  }
  if (state.publicViewMode === "summary") {
    renderPublicSummary();
  }
}

function setCountViewMode(mode) {
  state.countViewMode = mode === "summary" ? "summary" : "detailed";
  if (elements.countViewToggle) {
    elements.countViewToggle.classList.toggle(
      "mode-summary",
      state.countViewMode === "summary"
    );
  }
  if (elements.countViewDetailedBtn) {
    elements.countViewDetailedBtn.setAttribute(
      "aria-pressed",
      state.countViewMode === "detailed"
    );
  }
  if (elements.countViewSummaryBtn) {
    elements.countViewSummaryBtn.setAttribute(
      "aria-pressed",
      state.countViewMode === "summary"
    );
  }
  if (elements.countTableDetailed) {
    elements.countTableDetailed.classList.toggle(
      "hidden",
      state.countViewMode !== "detailed"
    );
  }
  if (elements.countTableSummary) {
    elements.countTableSummary.classList.toggle(
      "hidden",
      state.countViewMode !== "summary"
    );
  }
  if (state.countViewMode === "summary") {
    renderCountSummary();
  }
}

function renderPublicSummary() {
  if (!elements.publicTableSummary) return;
  const rows = state.publicRows.filter(matchesPublicFilters);
  renderSummaryTables(rows, elements.publicTableSummary, {
    showSetor: true,
    colorizeFirst: true,
  });
}

function renderCountSummary() {
  if (!elements.countTableSummary) return;
  const rows = getCountRowsForSetor();
  renderSummaryTables(rows, elements.countTableSummary, {
    showSetor: false,
    colorizeFirst: true,
  });
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const RANGE_PRESETS = {
  "1D": { unit: "hour", size: 24, label: "ultimas 24h" },
  "5D": { unit: "day", size: 5, label: "ultimos 5 dias" },
  "1M": { unit: "day", size: 30, label: "ultimo mes" },
  "6M": { unit: "day", size: 180, label: "ultimos 6 meses" },
  "1Y": { unit: "day", size: 365, label: "ultimo ano" },
  "5Y": { unit: "day", size: 365 * 5, label: "ultimos 5 anos" },
  MAX: { unit: "day", size: null, label: "todo o periodo" },
};

function normalizeRange(value) {
  const key = String(value || "").toUpperCase();
  return RANGE_PRESETS[key] ? key : "1D";
}

function getRangeLabel(range) {
  const key = normalizeRange(range);
  return RANGE_PRESETS[key]?.label || "todo o periodo";
}

function buildRangeDates(range, rows) {
  const key = normalizeRange(range);
  const preset = RANGE_PRESETS[key];
  const now = new Date();
  const dates = [];

  if (preset.unit === "hour") {
    const end = endOfHour(now);
    const start = new Date(end);
    start.setHours(end.getHours() - (preset.size - 1));
    for (let i = 0; i < preset.size; i += 1) {
      const date = new Date(start);
      date.setHours(start.getHours() + i);
      dates.push(endOfHour(date));
    }
    return { dates, range: key };
  }

  const end = endOfDay(now);
  let start = new Date(end);
  if (preset.size) {
    start.setDate(end.getDate() - (preset.size - 1));
  } else {
    const earliest = getEarliestDate(rows) || end;
    start = endOfDay(earliest);
  }
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(endOfDay(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  if (!dates.length) {
    dates.push(endOfDay(now));
  }

  return { dates, range: key };
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function endOfHour(date) {
  const next = new Date(date);
  next.setMinutes(59, 59, 999);
  return next;
}

function getEarliestDate(rows) {
  let earliest = null;
  (rows || []).forEach((row) => {
    const source = row?.created_at || row?.updated_at;
    if (!source) return;
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) return;
    if (!earliest || date < earliest) earliest = date;
  });
  return earliest;
}

function buildTimeSeries(rows, range) {
  const { dates, range: key } = buildRangeDates(range, rows);

  const values = dates.map((date) => {
    return (rows || []).reduce((sum, row) => {
      const updatedAt = row?.updated_at ? new Date(row.updated_at) : null;
      if (!updatedAt || Number.isNaN(updatedAt.getTime())) return sum;
      if (updatedAt <= date) {
        return sum + (Number(row.total_caixas) || 0);
      }
      return sum;
    }, 0);
  });

  return { dates, values, range: key };
}

function buildSnapshotSeries(rows, range) {
  const { dates, range: key } = buildRangeDates(range, rows);
  const snapshots = (rows || [])
    .map((row) => {
      const source = row?.created_at || row?.updated_at;
      const date = source ? new Date(source) : null;
      if (!date || Number.isNaN(date.getTime())) return null;
      return {
        date,
        value: Number(row.total_caixas) || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  let cursor = 0;
  let lastValue = 0;
  const values = dates.map((date) => {
    while (cursor < snapshots.length && snapshots[cursor].date <= date) {
      lastValue = snapshots[cursor].value;
      cursor += 1;
    }
    return lastValue;
  });

  return { dates, values, range: key };
}

function buildOutflowSeries(values) {
  return values.map((value, index) => {
    if (index === 0) return 0;
    const prev = values[index - 1] ?? value;
    return Math.max(0, prev - value);
  });
}

function formatTooltipDate(date, range) {
  if (!date) return "--";
  const key = normalizeRange(range);
  const options =
    key === "1D"
      ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
      : key === "5D" || key === "1M"
        ? { day: "2-digit", month: "short" }
        : { day: "2-digit", month: "short", year: "2-digit" };
  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

function renderLineChart(canvas, series, options = {}) {
  if (!canvas) return;
  const values = series?.values || [];
  const dates = series?.dates || [];
  const parentWidth = canvas.parentElement?.clientWidth || 900;
  const height = options.height || 260;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = parentWidth * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${parentWidth}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padding = {
    top: 24,
    right: 20,
    bottom: options.showLabels ? 32 : 16,
    left: 42,
  };
  const width = parentWidth;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const maxValue = values.length ? Math.max(...values, 1) : 1;
  const minValue = values.length ? Math.min(...values, 0) : 0;
  const range = maxValue - minValue || 1;

  const getX = (index) =>
    padding.left + (innerWidth * index) / Math.max(values.length - 1, 1);
  const getY = (value) =>
    padding.top + innerHeight - ((value - minValue) / range) * innerHeight;

  ctx.strokeStyle = options.gridColor || "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    const y = padding.top + (innerHeight * i) / 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  if (values.length) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = getX(index);
      const y = getY(value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = options.lineColor || "#93c5fd";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height);
    gradient.addColorStop(0, options.fillStart || "rgba(59, 130, 246, 0.35)");
    gradient.addColorStop(1, options.fillEnd || "rgba(59, 130, 246, 0.05)");
    ctx.lineTo(
      padding.left + innerWidth,
      padding.top + innerHeight
    );
    ctx.lineTo(padding.left, padding.top + innerHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    const lastIndex = values.length - 1;
    const lastX = getX(lastIndex);
    const lastY = getY(values[lastIndex]);
    ctx.fillStyle = options.lineColor || "#93c5fd";
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (Number.isInteger(options.hoverIndex)) {
    const index = Math.max(0, Math.min(values.length - 1, options.hoverIndex));
    const hx = getX(index);
    const hy = getY(values[index]);
    ctx.save();
    ctx.strokeStyle = options.hoverLineColor || "rgba(148, 163, 184, 0.5)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, padding.top);
    ctx.lineTo(hx, padding.top + innerHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = options.hoverDotColor || options.lineColor || "#93c5fd";
    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return {
    width,
    height,
    padding,
    innerWidth,
    innerHeight,
    getX,
    getY,
    values,
    dates,
  };
}

function buildDashboardSeries(range) {
  const snapshotRows = state.snapshotRows || [];
  const useSnapshots = snapshotRows.length > 0;
  const sourceRows = useSnapshots ? snapshotRows : state.rawPublicRows || [];
  const total = useSnapshots
    ? buildSnapshotSeries(sourceRows, range)
    : buildTimeSeries(sourceRows, range);
  const outflowValues = buildOutflowSeries(total.values);
  const outflow = {
    dates: total.dates,
    values: outflowValues,
    range: total.range,
  };
  return { range: total.range, total, outflow, source: useSnapshots ? "snapshot" : "live" };
}

function renderDashboard(force = false) {
  if (PAGE_MODE !== "dashboard") return;
  if (!elements.chartTotal || !elements.chartOutflow) return;

  if (
    !state.dashboardSeries ||
    force ||
    state.dashboardSeries.range !== normalizeRange(state.dashboardRange)
  ) {
    state.dashboardSeries = buildDashboardSeries(state.dashboardRange);
  }

  const series = state.dashboardSeries;
  const total = series.total;
  const outflow = series.outflow;

  state.dashboardMeta.total = renderLineChart(elements.chartTotal, total, {
    lineColor: "#93c5fd",
    fillStart: "rgba(59, 130, 246, 0.35)",
    fillEnd: "rgba(59, 130, 246, 0.05)",
    labelColor: "#cbd5f5",
    showLabels: false,
    hoverIndex: state.dashboardHover.total,
  });

  state.dashboardMeta.outflow = renderLineChart(elements.chartOutflow, outflow, {
    lineColor: "#fca5a5",
    fillStart: "rgba(248, 113, 113, 0.35)",
    fillEnd: "rgba(248, 113, 113, 0.05)",
    labelColor: "#e2e8f0",
    showLabels: false,
    hoverIndex: state.dashboardHover.outflow,
  });

  const totalValues = total.values;
  const lastIndex = totalValues.length - 1;
  const firstValue = totalValues[0] ?? 0;
  const lastValue = totalValues[lastIndex] ?? 0;
  const diff = lastValue - firstValue;
  const sign = diff >= 0 ? "+" : "-";
  const pct =
    firstValue > 0 ? (Math.abs(diff) / firstValue) * 100 : null;
  const rangeLabel = getRangeLabel(series.range);
  const lastDate = total.dates[lastIndex] || new Date();

  if (elements.chartTotalValue) {
    elements.chartTotalValue.textContent = formatNumber(lastValue);
  }
  if (elements.chartTotalChange) {
    const pctText = pct === null ? "" : ` (${formatPercent(pct)}%)`;
    elements.chartTotalChange.textContent = `${sign}${formatNumber(
      Math.abs(diff)
    )}${pctText} ${rangeLabel}`;
  }
  if (elements.chartTotalDate) {
    elements.chartTotalDate.textContent = formatTooltipDate(
      lastDate,
      series.range
    );
  }

  const outflowValues = outflow.values || [];
  const outflowSum = outflowValues.reduce((sum, value) => sum + value, 0);
  const outflowMax = outflowValues.length ? Math.max(...outflowValues) : 0;

  if (elements.chartOutflowValue) {
    elements.chartOutflowValue.textContent = formatNumber(outflowSum);
  }
  if (elements.chartOutflowChange) {
    elements.chartOutflowChange.textContent = `Pico: ${formatNumber(outflowMax)}`;
  }
  if (elements.chartOutflowDate) {
    elements.chartOutflowDate.textContent = formatTooltipDate(
      lastDate,
      series.range
    );
  }
}

function updateRangeButtons(range) {
  if (!elements.chartRange) return;
  const normalized = normalizeRange(range);
  elements.chartRange.querySelectorAll(".range-btn").forEach((button) => {
    const buttonRange = normalizeRange(button.dataset.range);
    button.classList.toggle("active", buttonRange === normalized);
  });
}

function setDashboardRange(range) {
  const normalized = normalizeRange(range);
  if (state.dashboardRange === normalized && state.dashboardSeries) {
    updateRangeButtons(normalized);
    return;
  }
  state.dashboardRange = normalized;
  state.dashboardSeries = null;
  state.dashboardHover.total = null;
  state.dashboardHover.outflow = null;
  updateRangeButtons(normalized);
  if (elements.chartTotalTooltip) {
    elements.chartTotalTooltip.classList.remove("visible");
  }
  if (elements.chartOutflowTooltip) {
    elements.chartOutflowTooltip.classList.remove("visible");
  }
  renderDashboard(true);
}

function updateChartTooltip(tooltip, meta, index, range, unitLabel = "caixas") {
  if (!tooltip || !meta) return;
  if (!Number.isInteger(index) || index < 0 || index >= meta.values.length) {
    tooltip.classList.remove("visible");
    return;
  }
  const value = meta.values[index] ?? 0;
  const date = meta.dates[index];
  const x = meta.getX(index);
  const y = meta.getY(value);
  const minX = 12;
  const maxX = meta.width - 12;
  const left = Math.min(Math.max(x, minX), maxX);
  const top = Math.max(y, 24);
  tooltip.innerHTML = `<strong>${formatNumber(value)}</strong> ${unitLabel}<span class="tooltip-date">${formatTooltipDate(
    date,
    range
  )}</span>`;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.add("visible");
}

function attachChartHover(canvas, tooltip, key) {
  if (!canvas) return;
  const handleMove = (event) => {
    const meta = state.dashboardMeta[key];
    if (!meta || !meta.values.length) {
      if (tooltip) tooltip.classList.remove("visible");
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const x = clientX - rect.left;
    if (x < meta.padding.left || x > meta.width - meta.padding.right) {
      if (state.dashboardHover[key] !== null) {
        state.dashboardHover[key] = null;
        renderDashboard();
      }
      if (tooltip) tooltip.classList.remove("visible");
      return;
    }
    const ratio = (x - meta.padding.left) / meta.innerWidth;
    const index = Math.max(
      0,
      Math.min(meta.values.length - 1, Math.round(ratio * (meta.values.length - 1)))
    );
    if (state.dashboardHover[key] !== index) {
      state.dashboardHover[key] = index;
      renderDashboard();
    }
    updateChartTooltip(tooltip, state.dashboardMeta[key], index, state.dashboardRange);
  };

  const handleLeave = () => {
    if (state.dashboardHover[key] !== null) {
      state.dashboardHover[key] = null;
      renderDashboard();
    }
    if (tooltip) tooltip.classList.remove("visible");
  };

  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("mouseleave", handleLeave);
  canvas.addEventListener("touchmove", handleMove, { passive: true });
  canvas.addEventListener("touchend", handleLeave);
}

function setupDashboard() {
  if (PAGE_MODE !== "dashboard") return;
  if (elements.chartRange) {
    const active = elements.chartRange.querySelector(".range-btn.active");
    if (active?.dataset?.range) {
      state.dashboardRange = normalizeRange(active.dataset.range);
    }
    updateRangeButtons(state.dashboardRange);
    elements.chartRange.addEventListener("click", (event) => {
      const button = event.target.closest(".range-btn");
      if (!button?.dataset?.range) return;
      setDashboardRange(button.dataset.range);
    });
  }

  attachChartHover(
    elements.chartTotal,
    elements.chartTotalTooltip,
    "total"
  );
  attachChartHover(
    elements.chartOutflow,
    elements.chartOutflowTooltip,
    "outflow"
  );
}

function renderPublicTable() {
  if (!elements.publicTableBody || !elements.publicTotalGeral) return;
  elements.publicTableBody.innerHTML = "";
  let total = 0;
  const rows = state.publicRows.filter(matchesPublicFilters);
  for (const row of rows) {
    const tipoLabel = formatTipoLabelValue(row.produto, row.tipo);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.produto}</td>
      <td>${row.marca}</td>
      <td>${tipoLabel}</td>
      <td>${row.caixas_pallet}</td>
      <td>${row.pallets}</td>
      <td>${row.total_caixas}</td>
    `;
    elements.publicTableBody.appendChild(tr);
    total += row.total_caixas;
  }
  elements.publicTotalGeral.textContent = total;
  renderPublicSummary();
}

function matchesPublicFilters(row) {
  const { setor, produto, marca, tipo } = state.publicFilters;
  if (setor && row.setor !== setor) return false;
  if (produto && row.produto !== produto) return false;
  if (marca && row.marca !== marca) return false;
  if (tipo) {
    const tipoNum = Number.parseInt(tipo, 10);
    if (!Number.isNaN(tipoNum) && row.tipo !== tipoNum) return false;
  }
  const query = normalizeText(state.publicQuery);
  if (query) {
    const haystack = normalizeText(
      `${row.setor} ${row.produto} ${row.marca} ${row.tipo}`
    );
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function renderCountTable() {
  if (!elements.countTableBody || !elements.countTotalGeral) return;
  elements.countTableBody.innerHTML = "";
  let total = 0;
  const showActions = PAGE_MODE === "edit";
  const rows = getCountRowsForSetor();
  for (const row of rows) {
    const tipoLabel = formatTipoLabelValue(row.produto, row.tipo);
    const tr = document.createElement("tr");
    const rowKey = getRowKey(row);
    if (rowKey) {
      tr.dataset.rowKey = rowKey;
      if (state.selectedRowKey === rowKey) {
        tr.classList.add("row-selected");
      }
      tr.addEventListener("click", (event) => {
        if (event.target.closest(".row-actions")) return;
        state.selectedRowKey = rowKey;
        renderCountTable();
      });
    }
    const totalCaixas = Number(
      row.total_caixas ?? row.pallets * row.caixas_pallet
    );
    tr.innerHTML = `
      <td>${row.produto}</td>
      <td>${row.marca}</td>
      <td>${tipoLabel}</td>
      <td>${row.caixas_pallet}</td>
      <td>${row.pallets}</td>
      <td>${totalCaixas}</td>
    `;
    if (showActions) {
      const actionsTd = document.createElement("td");
      actionsTd.className = "row-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "ghost";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => {
        openEditModal(row);
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Remover";
      deleteBtn.addEventListener("click", () => {
        removeRow(row);
      });
      actionsTd.append(editBtn, deleteBtn);
      tr.appendChild(actionsTd);
    }
    elements.countTableBody.appendChild(tr);
    total += totalCaixas;
  }
  elements.countTotalGeral.textContent = total;
  renderCountSummary();
}

function getCountRowsForSetor() {
  const source =
    state.countMode === "new" ? state.sessionRows : state.userRows;
  if (!state.setor) return source;
  return source.filter((row) => row.setor === state.setor);
}

function updateAggregateRecord({
  setor,
  produto,
  marca,
  tipo,
  caixas_pallet,
  palletsDelta = 1,
}) {
  const found = state.publicRows.find(
    (row) =>
      row.setor === setor &&
      row.produto === produto &&
      row.marca === marca &&
      row.tipo === tipo
  );
  if (found) {
    found.pallets += palletsDelta;
    found.total_caixas = found.pallets * found.caixas_pallet;
  } else {
    state.publicRows.push({
      setor,
      produto,
      marca,
      tipo,
      caixas_pallet,
      pallets: palletsDelta,
      total_caixas: caixas_pallet * palletsDelta,
    });
  }
}

function getTotalCaixas(rows) {
  return (rows || []).reduce((sum, row) => {
    const value =
      Number(row.total_caixas) ||
      (Number(row.pallets) || 0) * (Number(row.caixas_pallet) || 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

async function loadSnapshotRecords(options = {}) {
  const { showError = false } = options;
  const { data, error } = await supabaseClient
    .from(SNAPSHOT_TABLE)
    .select("id, user_id, total_caixas, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    if (showError) {
      pushMessage("error", `Erro ao carregar historico: ${error.message}`);
    } else {
      console.warn("Erro ao carregar historico:", error.message);
    }
    state.snapshotRows = [];
    return { data: null, error };
  }

  state.snapshotRows = data || [];
  renderDashboard();
  return { data: state.snapshotRows, error: null };
}

async function saveSnapshotTotal() {
  if (!state.user) {
    pushMessage("warn", "Faca login para salvar o historico.");
    return false;
  }
  let total = getTotalCaixas(state.publicRows);
  if (!state.publicRows.length && state.userRows.length) {
    total = getTotalCaixas(state.userRows);
  }
  const { error } = await supabaseClient.from(SNAPSHOT_TABLE).insert({
    user_id: state.user.id,
    total_caixas: total,
  });
  if (error) {
    pushMessage("error", `Erro ao salvar historico: ${error.message}`);
    return false;
  }
  pushMessage("success", "Historico salvo com sucesso.");
  await loadSnapshotRecords();
  return true;
}

async function loadPublicRecords() {
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select(
      "setor, produto, marca, tipo, caixas_pallet, pallets, total_caixas, updated_at, user_id"
    );

  if (error) {
    const cached = loadPublicCache();
    if (cached.length) {
      state.rawPublicRows = cached;
      state.dashboardSeries = null;
      state.dashboardHover.total = null;
      state.dashboardHover.outflow = null;
      state.publicRows = aggregateRows(cached);
      updateLastUpdateFromRows(cached, "public");
      renderPublicTable();
      renderCountTable();
      renderDashboard();
      setPublicMessage(
        "warn",
        "Sem acesso ao servidor. Exibindo o ultimo estoque salvo."
      );
      return;
    }
    setPublicMessage("error", `Erro ao carregar dados: ${error.message}`);
    return;
  }

  state.rawPublicRows = data || [];
  savePublicCache(state.rawPublicRows);
  state.dashboardSeries = null;
  state.dashboardHover.total = null;
  state.dashboardHover.outflow = null;
  state.publicRows = aggregateRows(data || []);
  updateLastUpdateFromRows(data || [], "public");
  renderPublicTable();
  renderCountTable();
  renderDashboard();
  setPublicMessage("", "");
}

async function loadUserRecords(options = {}) {
  const { showError = true } = options;
  if (!state.user) {
    state.userRows = [];
    renderCountTable();
    return { data: [], error: null };
  }
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select(
      "id, user_id, setor, produto, marca, tipo, caixas_pallet, pallets, total_caixas, updated_at"
    )
    .eq("user_id", state.user.id);

  if (error) {
    if (showError) {
      pushMessage("error", `Erro ao carregar itens do usuario: ${error.message}`);
    }
    return { data: null, error };
  }

  state.userRows = data || [];
  updateLastUpdateFromRows(state.userRows, "count");
  renderCountTable();
  return { data: state.userRows, error: null };
}

async function upsertRecord({
  setor,
  produto,
  marca,
  tipo,
  caixas_pallet,
  palletsDelta = 1,
}) {
  if (!state.user) return;
  const { data: existing, error: selectError } = await supabaseClient
    .from(TABLE_NAME)
    .select("id, pallets, caixas_pallet")
    .eq("user_id", state.user.id)
    .eq("setor", setor)
    .eq("produto", produto)
    .eq("marca", marca)
    .eq("tipo", tipo)
    .maybeSingle();

  if (selectError) {
    pushMessage("error", `Erro ao consultar registro: ${selectError.message}`);
    return;
  }

  if (existing) {
    const newPallets = existing.pallets + palletsDelta;
    const newTotal = newPallets * existing.caixas_pallet;
    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .update({
        pallets: newPallets,
        total_caixas: newTotal,
      })
      .eq("id", existing.id);

    if (error) {
      pushMessage("error", `Erro ao atualizar registro: ${error.message}`);
    }
  } else {
    const { error } = await supabaseClient.from(TABLE_NAME).insert({
      user_id: state.user.id,
      setor,
      produto,
      marca,
      tipo,
      caixas_pallet,
      pallets: palletsDelta,
      total_caixas: caixas_pallet * palletsDelta,
    });

    if (error) {
      pushMessage("error", `Erro ao salvar registro: ${error.message}`);
    }
  }
}

function buildMaps(setor) {
  const products = CONFIG_GERAL[setor] || {};
  const productMap = buildNormalizedMap(Object.keys(products));
  return { products, productMap };
}

function buildBrandMap(products, product) {
  return buildNormalizedMap(Object.keys(products?.[product] || {}));
}

function buildAllBrandMap(products) {
  const allBrands = [];
  Object.keys(products || {}).forEach((product) => {
    allBrands.push(...Object.keys(products[product] || {}));
  });
  return buildNormalizedMap(allBrands);
}

function formatTipoCounts(tipoCounts) {
  return Array.from(tipoCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([tipo, count]) => (count > 1 ? `${tipo}x${count}` : String(tipo)))
    .join(", ");
}

async function processCommand(rawText) {
  const tokens = tokenizeText(rawText);
  if (!tokens.length) return;

  const sectorMap = buildNormalizedMap(Object.keys(CONFIG_GERAL));
  const sectorFound = findExactMatch(tokens, sectorMap);
  if (sectorFound) {
    const changed = sectorFound !== state.setor;
    state.setor = sectorFound;
    if (changed) {
      state.produto = null;
      state.marca = null;
      state.tipo = null;
    }
    pushMessage("info", `Setor fixado: ${sectorFound}`);
  }

  const { products, productMap } = buildMaps(state.setor);
  const productFound = findExactMatch(tokens, productMap);
  if (productFound) {
    const changed = productFound !== state.produto;
    state.produto = productFound;
    if (changed) {
      state.marca = null;
      state.tipo = null;
    }
    pushMessage("info", `Produto fixado: ${productFound}`);
  }

  let brandFound = null;
  if (state.produto) {
    const brandMap = buildBrandMap(products, state.produto);
    brandFound = findExactMatch(tokens, brandMap);
    if (brandFound) {
      const changed = brandFound !== state.marca;
      state.marca = brandFound;
      if (changed) {
        state.tipo = null;
      }
      pushMessage("info", `Marca fixada: ${brandFound}`);
    }
  } else {
    const anyBrand = findExactMatch(tokens, buildAllBrandMap(products));
    if (anyBrand) {
      pushMessage("warn", "Diga o produto antes da marca.");
    }
  }

  const tipos = extractNumbers(rawText);
  const noTipo = isNoTipoProduct(state.produto);
  const addCommand = isAddCommand(rawText);

  if (addCommand && !tipos.length) {
    pushMessage("warn", "Diga a quantidade para adicionar.");
    renderContext();
    return;
  }

  if (addCommand && tipos.length) {
    if (!state.produto || !state.marca) {
      pushMessage(
        "warn",
        "Diga primeiro o produto e a marca antes de adicionar quantidade."
      );
      renderContext();
      return;
    }

    const regra = products[state.produto]?.[state.marca];
    if (!regra) {
      pushMessage(
        "error",
        `Essa marca '${state.marca}' nao tem regra para o produto '${state.produto}'.`
      );
      renderContext();
      return;
    }

    const numericValues = tipos
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!numericValues.length) {
      renderContext();
      return;
    }

    const quantity = numericValues[numericValues.length - 1];
    let tipoParaAdicionar = noTipo ? NO_TIPO_VALUE : state.tipo;

    if (!noTipo && numericValues.length >= 2) {
      const candidateTipo = numericValues[0];
      if (isTipoValid(candidateTipo)) {
        tipoParaAdicionar = candidateTipo;
        state.tipo = candidateTipo;
      }
    }

    if (!noTipo && !Number.isFinite(tipoParaAdicionar)) {
      pushMessage(
        "warn",
        "Diga o tipo primeiro (ex: REI 4) para usar 'adicionar'."
      );
      renderContext();
      return;
    }
    if (!noTipo && !isTipoValid(tipoParaAdicionar)) {
      pushMessage("warn", "Tipo deve estar entre 3 e 15.");
      renderContext();
      return;
    }

    const caixasPallet = regra(tipoParaAdicionar);
    const palletsDelta = quantity;

    if (state.countMode === "new") {
      updateSessionAggregateRecord({
        setor: state.setor,
        produto: state.produto,
        marca: state.marca,
        tipo: tipoParaAdicionar,
        caixas_pallet: caixasPallet,
        palletsDelta,
      });
      renderCountTable();
      pushMessage(
        "success",
        noTipo
          ? `Adicionado (nova contagem): ${state.produto} ${state.marca} Pallets ${palletsDelta}`
          : `Adicionado (nova contagem): ${state.produto} ${state.marca} Tipo ${tipoParaAdicionar} +${palletsDelta}`
      );
    } else {
      updateAggregateRecord({
        setor: state.setor,
        produto: state.produto,
        marca: state.marca,
        tipo: tipoParaAdicionar,
        caixas_pallet: caixasPallet,
        palletsDelta,
      });
      renderPublicTable();
      renderCountTable();
      pushMessage(
        "success",
        noTipo
          ? `Adicionado: ${state.produto} ${state.marca} Pallets ${palletsDelta}`
          : `Adicionado: ${state.produto} ${state.marca} Tipo ${tipoParaAdicionar} +${palletsDelta}`
      );

      await upsertRecord({
        setor: state.setor,
        produto: state.produto,
        marca: state.marca,
        tipo: tipoParaAdicionar,
        caixas_pallet: caixasPallet,
        palletsDelta,
      });
      await loadUserRecords();
      await loadPublicRecords();
    }

    renderContext();
    return;
  }

  if (noTipo && brandFound && !tipos.length) {
    const regra = products[state.produto]?.[state.marca];
    if (!regra) {
      pushMessage(
        "error",
        `Essa marca '${state.marca}' n?o tem regra para o produto '${state.produto}'.`
      );
      renderContext();
      return;
    }

    const caixasPallet = regra(NO_TIPO_VALUE);
    const palletsDelta = 1;
    state.tipo = NO_TIPO_VALUE;

    if (state.countMode === "new") {
      updateSessionAggregateRecord({
        setor: state.setor,
        produto: state.produto,
        marca: state.marca,
        tipo: NO_TIPO_VALUE,
        caixas_pallet: caixasPallet,
        palletsDelta,
      });
      renderCountTable();
      pushMessage(
        "success",
        `Registrado (nova contagem): ${state.produto} ${state.marca} Pallets ${palletsDelta}`
      );
    } else {
      updateAggregateRecord({
        setor: state.setor,
        produto: state.produto,
        marca: state.marca,
        tipo: NO_TIPO_VALUE,
        caixas_pallet: caixasPallet,
        palletsDelta,
      });
      renderPublicTable();
      renderCountTable();
      pushMessage(
        "success",
        `Registrado: ${state.produto} ${state.marca} Pallets ${palletsDelta}`
      );

      await upsertRecord({
        setor: state.setor,
        produto: state.produto,
        marca: state.marca,
        tipo: NO_TIPO_VALUE,
        caixas_pallet: caixasPallet,
        palletsDelta,
      });
      await loadUserRecords();
      await loadPublicRecords();
    }

    renderContext();
    return;
  }

  if (tipos.length) {
    if (!state.produto || !state.marca) {
      pushMessage(
        "warn",
        "Diga primeiro o produto e a marca antes de informar o n?mero."
      );
      renderContext();
      return;
    }

    const regra = products[state.produto]?.[state.marca];
    if (!regra) {
      pushMessage(
        "error",
        `Essa marca '${state.marca}' n?o tem regra para o produto '${state.produto}'.`
      );
      renderContext();
      return;
    }

    if (noTipo) {
      const palletsTotal = tipos
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0)
        .reduce((acc, value) => acc + value, 0);

      if (!palletsTotal) {
        renderContext();
        return;
      }

      const caixasPallet = regra(NO_TIPO_VALUE);
      state.tipo = NO_TIPO_VALUE;

      if (state.countMode === "new") {
        updateSessionAggregateRecord({
          setor: state.setor,
          produto: state.produto,
          marca: state.marca,
          tipo: NO_TIPO_VALUE,
          caixas_pallet: caixasPallet,
          palletsDelta: palletsTotal,
        });
        renderCountTable();
        pushMessage(
          "success",
          `Registrado (nova contagem): ${state.produto} ${state.marca} Pallets ${palletsTotal}`
        );
      } else {
        updateAggregateRecord({
          setor: state.setor,
          produto: state.produto,
          marca: state.marca,
          tipo: NO_TIPO_VALUE,
          caixas_pallet: caixasPallet,
          palletsDelta: palletsTotal,
        });
        renderPublicTable();
        renderCountTable();
        pushMessage(
          "success",
          `Registrado: ${state.produto} ${state.marca} Pallets ${palletsTotal}`
        );

        await upsertRecord({
          setor: state.setor,
          produto: state.produto,
          marca: state.marca,
          tipo: NO_TIPO_VALUE,
          caixas_pallet: caixasPallet,
          palletsDelta: palletsTotal,
        });
        await loadUserRecords();
        await loadPublicRecords();
      }

      renderContext();
      return;
    }

    const tiposValid = tipos
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && isTipoValid(value));

    if (!tiposValid.length) {
      pushMessage("warn", "Tipo deve estar entre 3 e 15.");
      renderContext();
      return;
    }

    const tipoCounts = new Map();
    tiposValid.forEach((tipo) => {
      tipoCounts.set(tipo, (tipoCounts.get(tipo) || 0) + 1);
    });

    if (!tipoCounts.size) {
      renderContext();
      return;
    }

    for (let i = tiposValid.length - 1; i >= 0; i -= 1) {
      const lastTipo = tiposValid[i];
      if (Number.isFinite(lastTipo)) {
        state.tipo = lastTipo;
        break;
      }
    }

    const tipoLabel = formatTipoCounts(tipoCounts);
    if (state.countMode === "new") {
      tipoCounts.forEach((count, tipo) => {
        const caixasPallet = regra(tipo);
        updateSessionAggregateRecord({
          setor: state.setor,
          produto: state.produto,
          marca: state.marca,
          tipo,
          caixas_pallet: caixasPallet,
          palletsDelta: count,
        });
      });
      renderCountTable();
      pushMessage(
        "success",
        `Registrado (nova contagem): ${state.produto} ${state.marca} Tipos ${tipoLabel}`
      );
    } else {
      tipoCounts.forEach((count, tipo) => {
        const caixasPallet = regra(tipo);
        updateAggregateRecord({
          setor: state.setor,
          produto: state.produto,
          marca: state.marca,
          tipo,
          caixas_pallet: caixasPallet,
          palletsDelta: count,
        });
      });
      renderPublicTable();
      renderCountTable();
      pushMessage(
        "success",
        `Registrado: ${state.produto} ${state.marca} Tipos ${tipoLabel}`
      );

      const upserts = [];
      tipoCounts.forEach((count, tipo) => {
        const caixasPallet = regra(tipo);
        upserts.push(
          upsertRecord({
            setor: state.setor,
            produto: state.produto,
            marca: state.marca,
            tipo,
            caixas_pallet: caixasPallet,
            palletsDelta: count,
          })
        );
      });
      await Promise.all(upserts);
      await loadUserRecords();
      await loadPublicRecords();
    }
  }

  renderContext();
}

function setupVoice() {
  if (PAGE_MODE !== "edit") return;
  if (!elements.voiceBtn) return;
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (elements.voiceStatus) {
      elements.voiceStatus.textContent =
        "Navegador nao suporta reconhecimento de voz. Use Chrome ou Edge.";
    }
    elements.voiceBtn.textContent = "Sem suporte";
    elements.voiceBtn.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;

  let listening = false;
  let shouldListen = false;

  elements.voiceBtn.addEventListener("click", () => {
    if (!shouldListen) {
      shouldListen = true;
      recognition.start();
      return;
    }
    shouldListen = false;
    recognition.stop();
  });

  recognition.onstart = () => {
    listening = true;
    if (elements.voiceStatus) {
      elements.voiceStatus.textContent = "Ouvindo...";
    }
    if (elements.voiceLast) {
      elements.voiceLast.value = "";
    }
    elements.voiceBtn.textContent = "Parar";
    if (elements.voiceCard) {
      elements.voiceCard.classList.add("listening");
    }
  };

  recognition.onend = () => {
    listening = false;
    if (elements.voiceStatus) {
      elements.voiceStatus.textContent = "Parado.";
    }
    elements.voiceBtn.textContent = "Iniciar escuta";
    if (elements.voiceCard) {
      elements.voiceCard.classList.remove("listening");
    }
    if (shouldListen) {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (error) {
          // Ignora se o navegador ainda estiver finalizando a sessao anterior.
        }
      }, 200);
    }
  };

  recognition.onerror = (event) => {
    if (elements.voiceStatus) {
      elements.voiceStatus.textContent = `Erro: ${event.error}`;
    }
    if (elements.voiceCard) {
      elements.voiceCard.classList.remove("listening");
    }
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      shouldListen = false;
      elements.voiceBtn.textContent = "Sem permissao";
      elements.voiceBtn.disabled = true;
    }
  };

  recognition.onresult = (event) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const text = result[0]?.transcript || "";
      if (result.isFinal) {
        finalTranscript += text;
      } else {
        interimTranscript += text;
      }
    }

    const displayText = (finalTranscript || interimTranscript).trim();
    if (elements.voiceLast) {
      elements.voiceLast.value = displayText;
    }
    if (elements.commandInput) {
      elements.commandInput.value = displayText;
    }
    if (finalTranscript.trim()) {
      processCommand(finalTranscript.trim());
    }
  };
}

function exportRows(rows, filename) {
  if (!rows.length) {
    pushMessage("warn", "Nenhum item para exportar.");
    return;
  }
  const header = [
    "Setor",
    "Produto",
    "Marca",
    "Tipo",
    "Caixas/Pallet",
    "Pallets",
    "Total Caixas",
  ];
  const csv = [
    header.join(";"),
    ...rows.map((row) =>
      [
        row.setor,
        row.produto,
        row.marca,
        row.tipo,
        row.caixas_pallet,
        row.pallets,
        row.total_caixas,
      ].join(";")
    ),
  ].join("");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getExportRows(scope) {
  if (scope === "public") {
    return state.publicRows.filter(matchesPublicFilters);
  }
  return getCountRowsForSetor();
}

function getExportNode(scope) {
  if (scope === "public") {
    return state.publicViewMode === "summary"
      ? elements.publicTableSummary
      : elements.publicTableDetailed;
  }
  return state.countViewMode === "summary"
    ? elements.countTableSummary
    : elements.countTableDetailed;
}

function openPrintWindow(title, contentNode) {
  if (!contentNode) return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  document.body.appendChild(frame);

  const styles = `
    body { font-family: "Source Sans 3", Arial, sans-serif; padding: 20px; color: #111827; }
    h1 { font-family: "Space Grotesk", sans-serif; font-size: 18px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #111827; padding: 6px 8px; text-align: center; }
    th:first-child, td:first-child { text-align: left; }
    .summary-grid { display: grid; gap: 16px; }
    .summary-card { border: 1px solid #111827; padding: 8px; page-break-inside: avoid; }
    .summary-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .summary-header h3 { margin: 0; font-size: 14px; }
    .table-wrap { overflow: visible; }
    .table-footer, .table-modes, .view-toggle, .actions { display: none !important; }
  `;

  const doc = frame.contentDocument || frame.contentWindow.document;
  const clone = contentNode.cloneNode(true);
  clone
    .querySelectorAll(".actions, .table-modes, .view-toggle")
    .forEach((node) => node.remove());

  doc.open();
  doc.write(
    `<!doctype html><html><head><title>${title}</title><style>${styles}</style></head><body><h1>${title}</h1></body></html>`
  );
  doc.close();
  doc.body.appendChild(clone);

  const cleanup = () => {
    frame.remove();
  };

  const contentWindow = frame.contentWindow;
  if (contentWindow) {
    contentWindow.focus();
    contentWindow.onafterprint = cleanup;
    setTimeout(() => {
      contentWindow.print();
      setTimeout(cleanup, 2000);
    }, 300);
  } else {
    cleanup();
  }
}

function handleExport(scope, format) {
  const rows = getExportRows(scope);
  if (!rows.length) {
    pushMessage("warn", "Nenhum item para exportar.");
    return;
  }
  if (format === "csv") {
    const filename =
      scope === "public"
        ? "estoque_filtro.csv"
        : `estoque_${state.setor}.csv`;
    exportRows(rows, filename);
    return;
  }

  const node = getExportNode(scope);
  if (!node) return;
  const title =
    scope === "public"
      ? "Estoque - Visao Geral"
      : `Estoque - ${state.setor}`;
  openPrintWindow(title, node);
}

function openExportSheet(scope) {
  const sheet = scope === "public" ? elements.publicExportSheet : elements.countExportSheet;
  if (sheet) sheet.classList.remove("hidden");
}

function closeExportSheet(scope) {
  const sheet = scope === "public" ? elements.publicExportSheet : elements.countExportSheet;
  if (sheet) sheet.classList.add("hidden");
}

function showAuthPanel() {
  if (elements.authPanel) {
    elements.authPanel.classList.remove("hidden");
    elements.authPanel.scrollIntoView({ behavior: "smooth" });
  }
  if (elements.countPanel) elements.countPanel.classList.add("hidden");
}

function showCountPanel() {
  if (elements.authPanel) elements.authPanel.classList.add("hidden");
  if (elements.countPanel) {
    elements.countPanel.classList.remove("hidden");
    elements.countPanel.scrollIntoView({ behavior: "smooth" });
  }
}

function updateSessionAggregateRecord({
  setor,
  produto,
  marca,
  tipo,
  caixas_pallet,
  palletsDelta = 1,
}) {
  const found = state.sessionRows.find(
    (row) =>
      row.setor === setor &&
      row.produto === produto &&
      row.marca === marca &&
      row.tipo === tipo
  );
  if (found) {
    found.pallets += palletsDelta;
    found.total_caixas = found.pallets * found.caixas_pallet;
  } else {
    state.sessionRows.push({
      _localId: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      setor,
      produto,
      marca,
      tipo,
      caixas_pallet,
      pallets: palletsDelta,
      total_caixas: caixas_pallet * palletsDelta,
    });
  }
}

function cleanLabel(value) {
  return normalizeText(value);
}

function normalizeKey(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function normalizeSetorValue(rawSetor) {
  if (!rawSetor) return rawSetor;
  const targetKey = normalizeKey(rawSetor);
  const match = Object.keys(CONFIG_GERAL).find(
    (setor) => normalizeKey(setor) === targetKey
  );
  return match || rawSetor;
}

async function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message || "Tempo limite excedido."));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function probeSupabase() {
  try {
    const response = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
      8000
    );
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || String(error),
    };
  }
}

function getProdutoMarcaInfo(produto, marca) {
  if (!produto || !marca) {
    return { produtoExists: false, marcaExists: false, setores: [], setoresKey: [] };
  }
  const produtoKey = normalizeKey(produto);
  const marcaKey = normalizeKey(marca);
  const setores = new Set();
  const setoresKey = new Set();
  let produtoExists = false;
  let marcaExists = false;

  Object.entries(CONFIG_GERAL).forEach(([setor, produtos]) => {
    Object.entries(produtos || {}).forEach(([produtoNome, marcas]) => {
      if (normalizeKey(produtoNome) !== produtoKey) return;
      produtoExists = true;
      Object.keys(marcas || {}).forEach((marcaNome) => {
        if (normalizeKey(marcaNome) === marcaKey) {
          marcaExists = true;
          setores.add(setor);
          setoresKey.add(normalizeKey(setor));
        }
      });
    });
  });

  return {
    produtoExists,
    marcaExists,
    setores: Array.from(setores),
    setoresKey: Array.from(setoresKey),
  };
}

function inferSetorFromProdutoMarca(produto, marca) {
  const info = getProdutoMarcaInfo(produto, marca);
  return info.setores.length === 1 ? info.setores[0] : null;
}

function getRowKey(row) {
  return row?.id ?? row?._localId ?? null;
}

function findCurrentRowByKey(key) {
  const source = state.countMode === "new" ? state.sessionRows : state.userRows;
  return source.find((row) => getRowKey(row) === key);
}

function openEditModal(row = null) {
  if (!elements.editModal) return;
  state.editTarget = {
    rowKey: getRowKey(row),
  };
  setEditMessage("", "");

  if (elements.editTitle) {
    elements.editTitle.textContent = "Editar item";
  }

  if (elements.editSetor) {
    elements.editSetor.value = row?.setor || state.setor || "";
  }
  if (elements.editProduto) {
    elements.editProduto.value = row?.produto || "";
  }
  if (elements.editMarca) {
    elements.editMarca.value = row?.marca || "";
  }
  if (elements.editTipo) {
    elements.editTipo.value = row?.tipo ?? "";
  }
  if (elements.editCaixas) {
    elements.editCaixas.value = row?.caixas_pallet ?? "";
  }
  if (elements.editPallets) {
    elements.editPallets.value = row?.pallets ?? 1;
  }

  elements.editModal.classList.remove("hidden");
}

function closeEditModal() {
  if (!elements.editModal) return;
  elements.editModal.classList.add("hidden");
  state.editTarget = null;
}

function showDebugPanel(result) {
  if (!elements.debugPanel) return;
  if (elements.debugUrl) {
    elements.debugUrl.textContent = SUPABASE_URL || "--";
  }
  if (elements.debugKey) {
    const suffix = SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(-6) : "--";
    elements.debugKey.textContent = `...${suffix}`;
  }
  if (elements.debugUser) {
    elements.debugUser.textContent = state.user?.email || "--";
  }
  if (elements.debugResult) {
    elements.debugResult.textContent =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);
  }
  elements.debugPanel.classList.remove("hidden");
}

function findSessionRowByKey(key) {
  return state.sessionRows.find((row) => getRowKey(row) === key);
}

async function saveEditItem() {
  if (!elements.editSetor || !elements.editProduto || !elements.editMarca) return;

  setEditMessage("info", "Salvando...");

  try {
    let slowTimer = setTimeout(() => {
      setEditMessage("info", "Servidor acordando... aguarde alguns segundos.");
    }, 10000);

    let setor = normalizeSetorValue(elements.editSetor.value);
    const produto = cleanLabel(elements.editProduto.value);
    const marca = cleanLabel(elements.editMarca.value);
    const tipo = Number.parseInt(elements.editTipo.value, 10);
    const caixasPallet = Number.parseInt(elements.editCaixas.value, 10);
    const pallets = Number.parseInt(elements.editPallets.value, 10);
    const noTipo = isNoTipoProduct(produto);

    const info = getProdutoMarcaInfo(produto, marca);
    if (!info.produtoExists) {
      setEditMessage("error", "Produto não cadastrado.");
      return;
    }
    if (!info.marcaExists) {
      setEditMessage("error", "Marca não cadastrada para este produto.");
      return;
    }

    if (elements.editSetor && elements.editSetor.value !== setor) {
      elements.editSetor.value = setor;
    }

    let setorKey = normalizeKey(setor);
    const inferredSetor = inferSetorFromProdutoMarca(produto, marca);
    if (inferredSetor && inferredSetor !== setor) {
      setor = inferredSetor;
      setorKey = normalizeKey(setor);
      if (elements.editSetor) {
        elements.editSetor.value = inferredSetor;
      }
    }

    if (info.setoresKey.length && !info.setoresKey.includes(setorKey)) {
      if (info.setores.length === 1) {
        setor = info.setores[0];
        if (elements.editSetor) {
          elements.editSetor.value = setor;
        }
      } else {
        setEditMessage(
          "error",
          `Produto e marca cadastrados nos setores: ${info.setores.join(", ")}.`
        );
        return;
      }
    }

    if (!setor || !produto || !marca) {
      setEditMessage("error", "Preencha setor, produto e marca.");
      return;
    }
    if (
      Number.isNaN(caixasPallet) ||
      Number.isNaN(pallets) ||
      (!noTipo && Number.isNaN(tipo))
    ) {
      setEditMessage(
        "error",
        "Preencha tipo, caixas/pallet e pallets com numeros validos."
      );
      return;
    }
    if (!noTipo && !isTipoValid(tipo)) {
      setEditMessage("error", "Tipo deve estar entre 3 e 15.");
      return;
    }

    const tipoFinal = noTipo ? NO_TIPO_VALUE : tipo;
    const totalCaixas = caixasPallet * pallets;

    if (state.countMode === "new") {
      if (!state.editTarget?.rowKey) {
        setEditMessage("error", "Selecione um item para editar.");
        return;
      }
      const row = findSessionRowByKey(state.editTarget.rowKey);
      if (!row) {
        setEditMessage("error", "Item selecionado n\u00e3o encontrado.");
        return;
      }
      row.setor = setor;
      row.produto = produto;
      row.marca = marca;
      row.tipo = tipoFinal;
      row.caixas_pallet = caixasPallet;
      row.pallets = pallets;
      row.total_caixas = totalCaixas;
      if (setor && state.setor !== setor) {
        state.setor = setor;
        if (elements.setorSelect) elements.setorSelect.value = setor;
        renderContext();
      }
      renderCountTable();
      state.selectedRowKey = null;
      closeEditModal();
      return;
    }

    if (!state.user) {
      setEditMessage("error", "Faça login para salvar alterações.");
      return;
    }

    const payload = {
      user_id: state.user.id,
      setor,
      produto,
      marca,
      tipo: tipoFinal,
      caixas_pallet: caixasPallet,
      pallets,
      total_caixas: totalCaixas,
    };

    if (!state.editTarget?.rowKey) {
      setEditMessage("error", "Selecione um item para editar.");
      return;
    }
    const updateResult = await withTimeout(
      supabaseClient
        .from(TABLE_NAME)
        .update(payload)
        .eq("id", state.editTarget.rowKey)
        .eq("user_id", state.user.id),
      SUPABASE_TIMEOUT_MS,
      "Tempo limite ao atualizar item."
    );
    if (updateResult?.error) {
      setEditMessage("error", `Erro ao atualizar item: ${updateResult.error.message}`);
      showDebugPanel(updateResult);
      clearTimeout(slowTimer);
      return;
    }

    const userResult = await withTimeout(
      loadUserRecords({ showError: false }),
      SUPABASE_TIMEOUT_MS,
      "Tempo limite ao atualizar lista."
    );
    if (userResult?.error) {
      setEditMessage(
        "error",
        `Erro ao atualizar lista: ${userResult.error.message}`
      );
      showDebugPanel(userResult);
      clearTimeout(slowTimer);
      return;
    }
    const publicResult = await withTimeout(
      loadPublicRecords(),
      SUPABASE_TIMEOUT_MS,
      "Tempo limite ao atualizar dados."
    );
    if (publicResult?.error) {
      showDebugPanel(publicResult);
    }
    clearTimeout(slowTimer);
    if (setor && state.setor !== setor) {
      state.setor = setor;
      if (elements.setorSelect) elements.setorSelect.value = setor;
      renderContext();
    }
    state.selectedRowKey = null;
    closeEditModal();
  } catch (error) {
    console.error("Erro ao salvar item:", error);
    setEditMessage(
      "error",
      `Erro inesperado ao salvar. ${error?.message || "Tente novamente."}`
    );
    const probe = await probeSupabase();
    showDebugPanel({
      error: error?.message || error,
      probe,
    });
  }
}

async function removeRow(row) {
  const rowKey = getRowKey(row);
  if (!rowKey) return;
  const confirmDelete = window.confirm(
    `Remover o item ${row.produto} ${row.marca} Tipo ${row.tipo}?`
  );
  if (!confirmDelete) return;

  if (state.countMode === "new") {
    state.sessionRows = state.sessionRows.filter(
      (item) => getRowKey(item) !== rowKey
    );
    if (state.selectedRowKey === rowKey) {
      state.selectedRowKey = null;
    }
    renderCountTable();
    return;
  }

  if (!state.user) return;
  const { error } = await supabaseClient
    .from(TABLE_NAME)
    .delete()
    .eq("id", rowKey)
    .eq("user_id", state.user.id);
  if (error) {
    pushMessage("error", `Erro ao remover item: ${error.message}`);
    return;
  }
  if (state.selectedRowKey === rowKey) {
    state.selectedRowKey = null;
  }
  await loadUserRecords();
  await loadPublicRecords();
}

function hideCountPanels() {
  if (elements.countPanel) elements.countPanel.classList.add("hidden");
}

function hideAuthPanel() {
  if (elements.authPanel) elements.authPanel.classList.add("hidden");
}


function updateCountModeUI() {
  if (elements.modeCurrentBtn && elements.modeNewBtn) {
    if (state.countMode === "new") {
      elements.modeCurrentBtn.classList.remove("primary");
      elements.modeCurrentBtn.classList.add("ghost");
      elements.modeNewBtn.classList.remove("ghost");
      elements.modeNewBtn.classList.add("primary");
    } else {
      elements.modeCurrentBtn.classList.remove("ghost");
      elements.modeCurrentBtn.classList.add("primary");
      elements.modeNewBtn.classList.remove("primary");
      elements.modeNewBtn.classList.add("ghost");
    }
  }

  if (elements.countModeTag) {
    elements.countModeTag.classList.toggle(
      "hidden",
      state.countMode !== "new"
    );
  }

  if (elements.newCountActions) {
    elements.newCountActions.classList.toggle(
      "hidden",
      state.countMode !== "new"
    );
  }
}



function setCountMode(mode) {
  if (mode === state.countMode) return;
  if (mode === "new") {
    const confirmed = window.confirm(
      "Iniciar nova contagem? A contagem atual só será substituída quando você salvar."
    );
    if (!confirmed) return;
    state.countMode = "new";
    state.sessionRows = [];
    pushMessage(
      "info",
      "Nova contagem iniciada. Salve quando terminar para substituir a contagem antiga."
    );
  } else {
    state.countMode = "current";
    state.sessionRows = [];
  }
  updateCountModeUI();
  renderCountTable();
}

async function saveNewCount() {
  if (!state.user) {
    pushMessage("warn", "Faça login para salvar a nova contagem.");
    return;
  }
  if (!state.sessionRows.length) {
    pushMessage("warn", "Nenhum item na nova contagem para salvar.");
    return;
  }
  const confirmed = window.confirm(
    "Salvar nova contagem? Isso vai apagar a contagem antiga e substituir pela nova."
  );
  if (!confirmed) return;

  const { error: deleteError } = await supabaseClient
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", state.user.id);
  if (deleteError) {
    pushMessage("error", `Erro ao apagar contagem antiga: ${deleteError.message}`);
    return;
  }

  const payload = state.sessionRows.map((row) => ({
    user_id: state.user.id,
    setor: row.setor,
    produto: row.produto,
    marca: row.marca,
    tipo: row.tipo,
    caixas_pallet: row.caixas_pallet,
    pallets: row.pallets,
    total_caixas: row.total_caixas,
  }));

  const { error: insertError } = await supabaseClient
    .from(TABLE_NAME)
    .insert(payload);
  if (insertError) {
    pushMessage("error", `Erro ao salvar nova contagem: ${insertError.message}`);
    return;
  }

  state.sessionRows = [];
  state.countMode = "current";
  updateCountModeUI();
  await loadUserRecords();
  await loadPublicRecords();
  pushMessage("success", "Nova contagem salva. Estoque atualizado.");
}

function discardNewCount() {
  const confirmed = window.confirm(
    "Descartar a nova contagem? Os dados não salvos serão perdidos."
  );
  if (!confirmed) return;
  state.sessionRows = [];
  state.countMode = "current";
  updateCountModeUI();
  renderCountTable();
  pushMessage("info", "Nova contagem descartada.");
}

function openFilterModal() {
  if (!elements.filterModal) return;
  buildFilterOptions();
  elements.filterModal.classList.remove("hidden");
}

function closeFilterModal() {
  if (!elements.filterModal) return;
  elements.filterModal.classList.add("hidden");
}

function setSelectOptions(select, options, currentValue) {
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Todos";
  select.appendChild(empty);
  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    select.appendChild(option);
  });
  select.value = currentValue || "";
}

function setSelectOptionsWithPlaceholder(
  select,
  options,
  currentValue,
  placeholder
) {
  if (!select) return;
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder || "Selecione";
  select.appendChild(empty);
  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    select.appendChild(option);
  });
  select.value = currentValue || "";
}

function setNumberOptions(select, min, max, currentValue, placeholder) {
  if (!select) return;
  select.innerHTML = "";
  if (placeholder) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder;
    select.appendChild(empty);
  }
  for (let value = min; value <= max; value += 1) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    select.appendChild(option);
  }
  if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
    select.value = String(currentValue);
  } else if (placeholder) {
    select.value = "";
  }
}

function updateManualTipoOptions() {
  if (!elements.manualTipo || !elements.manualProduto) return;
  const produto = elements.manualProduto.value;
  if (isNoTipoProduct(produto)) {
    elements.manualTipo.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "S/T";
    elements.manualTipo.appendChild(option);
    elements.manualTipo.disabled = true;
    return;
  }
  elements.manualTipo.disabled = false;
  setNumberOptions(
    elements.manualTipo,
    TIPO_MIN,
    TIPO_MAX,
    elements.manualTipo.value,
    "Selecione"
  );
}

function listProductsBySetor(setor) {
  const products = new Set();
  if (setor) {
    Object.keys(CONFIG_GERAL[setor] || {}).forEach((p) => products.add(p));
  } else {
    Object.keys(CONFIG_GERAL).forEach((s) => {
      Object.keys(CONFIG_GERAL[s]).forEach((p) => products.add(p));
    });
  }
  return Array.from(products).sort();
}

function listBrands(setor, produto) {
  const brands = new Set();
  const setores = setor ? [setor] : Object.keys(CONFIG_GERAL);
  setores.forEach((s) => {
    const produtos = CONFIG_GERAL[s] || {};
    if (produto) {
      Object.keys(produtos[produto] || {}).forEach((b) => brands.add(b));
    } else {
      Object.keys(produtos).forEach((p) => {
        Object.keys(produtos[p] || {}).forEach((b) => brands.add(b));
      });
    }
  });
  return Array.from(brands).sort();
}

function initManualForm() {
  if (
    !elements.manualSetor ||
    !elements.manualProduto ||
    !elements.manualMarca ||
    !elements.manualTipo ||
    !elements.manualPallets
  ) {
    return;
  }

  const setores = Object.keys(CONFIG_GERAL).sort();
  setSelectOptionsWithPlaceholder(
    elements.manualSetor,
    setores,
    state.setor || "",
    "Selecione"
  );
  setSelectOptionsWithPlaceholder(
    elements.manualProduto,
    listProductsBySetor(elements.manualSetor.value),
    "",
    "Selecione"
  );
  setSelectOptionsWithPlaceholder(
    elements.manualMarca,
    listBrands(elements.manualSetor.value, elements.manualProduto.value),
    "",
    "Selecione"
  );
  updateManualTipoOptions();
  setNumberOptions(elements.manualPallets, 1, 50, 1);
}

function updateManualDependencies() {
  if (!elements.manualSetor || !elements.manualProduto || !elements.manualMarca) {
    return;
  }
  const setor = elements.manualSetor.value;
  const produtoAtual = elements.manualProduto.value;
  const marcaAtual = elements.manualMarca.value;

  setSelectOptionsWithPlaceholder(
    elements.manualProduto,
    listProductsBySetor(setor),
    produtoAtual,
    "Selecione"
  );
  setSelectOptionsWithPlaceholder(
    elements.manualMarca,
    listBrands(setor, elements.manualProduto.value),
    marcaAtual,
    "Selecione"
  );
  updateManualTipoOptions();
}

async function addManualItem() {
  if (
    !elements.manualSetor ||
    !elements.manualProduto ||
    !elements.manualMarca ||
    !elements.manualTipo
  ) {
    return;
  }

  const setor = elements.manualSetor.value;
  const produto = elements.manualProduto.value;
  const marca = elements.manualMarca.value;
  const tipoInput = Number.parseInt(elements.manualTipo.value, 10);
  const pallets = Number.parseInt(elements.manualPallets?.value, 10) || 1;
  const noTipo = isNoTipoProduct(produto);

  if (!setor || !produto || !marca) {
    pushMessage("warn", "Preencha setor, produto e marca.");
    return;
  }

  if (!noTipo && Number.isNaN(tipoInput)) {
    pushMessage("warn", "Informe o tipo.");
    return;
  }
  if (!noTipo && !isTipoValid(tipoInput)) {
    pushMessage("warn", "Tipo deve estar entre 3 e 15.");
    return;
  }

  if (pallets <= 0) {
    pushMessage("warn", "Informe uma quantidade de pallets válida.");
    return;
  }

  const regra = CONFIG_GERAL[setor]?.[produto]?.[marca];
  if (!regra) {
    pushMessage("error", "Combinação de setor/produto/marca inválida.");
    return;
  }

  const tipo = noTipo ? NO_TIPO_VALUE : tipoInput;
  const caixasPallet = regra(tipo);
  const palletsDelta = pallets;

  state.setor = setor;
  state.produto = produto;
  state.marca = marca;
  if (elements.setorSelect) {
    elements.setorSelect.value = setor;
  }
  renderContext();

  if (state.countMode === "new") {
    updateSessionAggregateRecord({
      setor,
      produto,
      marca,
      tipo: tipoFinal,
      caixas_pallet: caixasPallet,
      palletsDelta,
    });
    renderCountTable();
    pushMessage(
      "success",
      noTipo
        ? `Registrado (nova contagem): ${produto} ${marca} Pallets ${palletsDelta}`
        : `Registrado (nova contagem): ${produto} ${marca} Tipo ${tipo}`
    );
    return;
  }

  updateAggregateRecord({
    setor,
    produto,
    marca,
    tipo,
    caixas_pallet: caixasPallet,
    palletsDelta,
  });
  renderPublicTable();
  renderCountTable();
  pushMessage(
    "success",
    noTipo
      ? `Registrado: ${produto} ${marca} Pallets ${palletsDelta}`
      : `Registrado: ${produto} ${marca} Tipo ${tipo}`
  );

  await upsertRecord({
    setor,
    produto,
    marca,
    tipo,
    caixas_pallet: caixasPallet,
    palletsDelta,
  });
  await loadUserRecords();
  await loadPublicRecords();
}

function buildFilterOptions() {
  if (
    !elements.filterSetor ||
    !elements.filterProduto ||
    !elements.filterMarca ||
    !elements.filterTipo
  ) {
    return;
  }
  const setor = state.publicFilters.setor;
  const produto = state.publicFilters.produto;
  const marca = state.publicFilters.marca;

  setSelectOptions(elements.filterSetor, Object.keys(CONFIG_GERAL).sort(), setor);
  setSelectOptions(elements.filterProduto, listProductsBySetor(setor), produto);
  setSelectOptions(
    elements.filterMarca,
    listBrands(setor, elements.filterProduto.value || produto),
    marca
  );

  elements.filterTipo.value = state.publicFilters.tipo || "";
}

function updateFilterDependencies() {
  if (!elements.filterSetor || !elements.filterProduto || !elements.filterMarca) {
    return;
  }
  const setor = elements.filterSetor.value;
  const produto = elements.filterProduto.value;
  setSelectOptions(elements.filterProduto, listProductsBySetor(setor), produto);
  setSelectOptions(elements.filterMarca, listBrands(setor, produto), elements.filterMarca.value);
}

function setupEvents() {
  if (elements.menuView) {
    if (elements.menuView.dataset.href) {
      elements.menuView.addEventListener("click", () => {
        window.location.href = elements.menuView.dataset.href;
      });
    } else if (elements.publicPanel) {
      elements.menuView.addEventListener("click", () => {
        elements.publicPanel.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  if (elements.menuDashboard) {
    if (elements.menuDashboard.dataset.href) {
      elements.menuDashboard.addEventListener("click", () => {
        window.location.href = elements.menuDashboard.dataset.href;
      });
    } else if (elements.dashboardPanel) {
      elements.menuDashboard.addEventListener("click", () => {
        elements.dashboardPanel.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  if (elements.menuCount) {
    if (elements.menuCount.dataset.href) {
      elements.menuCount.addEventListener("click", () => {
        window.location.href = elements.menuCount.dataset.href;
      });
    } else {
      elements.menuCount.addEventListener("click", () => {
        if (state.user) {
          showCountPanel();
        } else {
          showAuthPanel();
        }
      });
    }
  }

  if (elements.publicViewDetailedBtn) {
    elements.publicViewDetailedBtn.addEventListener("click", () => {
      setPublicViewMode("detailed");
    });
  }

  if (elements.publicViewSummaryBtn) {
    elements.publicViewSummaryBtn.addEventListener("click", () => {
      setPublicViewMode("summary");
    });
  }

  if (elements.countViewDetailedBtn) {
    elements.countViewDetailedBtn.addEventListener("click", () => {
      setCountViewMode("detailed");
    });
  }

  if (elements.countViewSummaryBtn) {
    elements.countViewSummaryBtn.addEventListener("click", () => {
      setCountViewMode("summary");
    });
  }

  if (elements.modeCurrentBtn) {
    elements.modeCurrentBtn.addEventListener("click", () => {
      setCountMode("current");
    });
  }

  if (elements.modeNewBtn) {
    elements.modeNewBtn.addEventListener("click", () => {
      setCountMode("new");
    });
  }



  if (elements.editItemBtn) {
    elements.editItemBtn.addEventListener("click", () => {
      if (!state.selectedRowKey) {
        window.alert("Selecione um item na tabela para editar.");
        return;
      }
      const row = findCurrentRowByKey(state.selectedRowKey);
      if (!row) {
        window.alert("Item selecionado nao encontrado.");
        return;
      }
      openEditModal(row);
    });
  }

  if (elements.editClose) {
    elements.editClose.addEventListener("click", closeEditModal);
  }

  if (elements.editCloseBtn) {
    elements.editCloseBtn.addEventListener("click", closeEditModal);
  }

  if (elements.editSave) {
    elements.editSave.addEventListener("click", saveEditItem);
  }

  if (elements.debugHide) {
    elements.debugHide.addEventListener("click", () => {
      if (elements.debugPanel) {
        elements.debugPanel.classList.add("hidden");
      }
    });
  }

  if (elements.menuLogout) {
    elements.menuLogout.addEventListener("click", async () => {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        setAuthMessage("error", `Erro ao sair: ${error.message}`);
      }
      await handleAuthState("SIGNED_OUT", null);
    });
  }

  if (elements.loginBtn) {
    elements.loginBtn.addEventListener("click", async () => {
      const loginId = elements.email.value.trim();
      const email = toAuthEmail(loginId);
      if (!email) {
        elements.authMsg.textContent = "Informe um usuario ou numero valido.";
        elements.authMsg.className = "msg error";
        return;
      }
      const password = elements.password.value;
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        elements.authMsg.textContent = error.message;
        elements.authMsg.className = "msg error";
      }
    });
  }

  if (elements.setorSelect) {
    elements.setorSelect.addEventListener("change", (event) => {
      state.setor = event.target.value;
      state.produto = null;
      state.marca = null;
      state.tipo = null;
      pushMessage("info", `Setor fixado: ${state.setor}`);
      renderContext();
      renderCountTable();
    });
  }

  if (elements.publicSearch) {
    elements.publicSearch.addEventListener("input", (event) => {
      state.publicQuery = event.target.value;
      renderPublicTable();
    });
  }

  if (elements.publicSearchForm) {
    elements.publicSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }

  if (elements.publicFilterBtn) {
    elements.publicFilterBtn.addEventListener("click", () => {
      openFilterModal();
    });
  }

  if (elements.filterClose) {
    elements.filterClose.addEventListener("click", closeFilterModal);
  }
  if (elements.filterCloseBtn) {
    elements.filterCloseBtn.addEventListener("click", closeFilterModal);
  }

  if (elements.filterSetor) {
    elements.filterSetor.addEventListener("change", () => {
      updateFilterDependencies();
    });
  }

  if (elements.filterProduto) {
    elements.filterProduto.addEventListener("change", () => {
      setSelectOptions(
        elements.filterMarca,
        listBrands(elements.filterSetor.value, elements.filterProduto.value),
        elements.filterMarca.value
      );
    });
  }

  if (elements.filterApply) {
    elements.filterApply.addEventListener("click", () => {
      state.publicFilters = {
        setor: elements.filterSetor.value,
        produto: elements.filterProduto.value,
        marca: elements.filterMarca.value,
        tipo: elements.filterTipo.value.trim(),
      };
      renderPublicTable();
      closeFilterModal();
    });
  }

  if (elements.filterClear) {
    elements.filterClear.addEventListener("click", () => {
      state.publicFilters = { setor: "", produto: "", marca: "", tipo: "" };
      buildFilterOptions();
      renderPublicTable();
    });
  }

  if (elements.publicRefresh) {
    elements.publicRefresh.addEventListener("click", () => {
      loadPublicRecords();
    });
  }

  if (elements.clearContext) {
    elements.clearContext.addEventListener("click", () => {
      state.produto = null;
      state.marca = null;
      state.tipo = null;
      pushMessage("info", "Contexto limpo.");
      renderContext();
    });
  }

  if (elements.processBtn) {
    elements.processBtn.addEventListener("click", () => {
      processCommand(elements.commandInput.value);
    });
  }

  if (elements.commandInput) {
    elements.commandInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        processCommand(elements.commandInput.value);
      }
    });
  }

  if (elements.manualSetor) {
    elements.manualSetor.addEventListener("change", () => {
      if (elements.manualSetor.value) {
        state.setor = elements.manualSetor.value;
        renderCountTable();
      }
      updateManualDependencies();
    });
  }

  if (elements.manualProduto) {
    elements.manualProduto.addEventListener("change", () => {
      updateManualDependencies();
    });
  }

  if (elements.manualAdd) {
    elements.manualAdd.addEventListener("click", () => {
      addManualItem();
    });
  }

  if (elements.publicExportToggle) {
    elements.publicExportToggle.addEventListener("click", () => {
      openExportSheet("public");
    });
  }

  if (elements.publicExportClose) {
    elements.publicExportClose.addEventListener("click", () => {
      closeExportSheet("public");
    });
  }

  if (elements.publicExportSheet) {
    elements.publicExportSheet.addEventListener("click", (event) => {
      if (event.target.classList.contains("share-backdrop")) {
        closeExportSheet("public");
      }
    });
  }

  if (elements.publicExportCsv) {
    elements.publicExportCsv.addEventListener("click", () => {
      handleExport("public", "csv");
      closeExportSheet("public");
    });
  }

  if (elements.publicExportPdf) {
    elements.publicExportPdf.addEventListener("click", () => {
      handleExport("public", "pdf");
      closeExportSheet("public");
    });
  }

  if (elements.publicExportPrint) {
    elements.publicExportPrint.addEventListener("click", () => {
      handleExport("public", "print");
      closeExportSheet("public");
    });
  }

  if (elements.countExportToggle) {
    elements.countExportToggle.addEventListener("click", () => {
      openExportSheet("count");
    });
  }

  if (elements.countExportClose) {
    elements.countExportClose.addEventListener("click", () => {
      closeExportSheet("count");
    });
  }

  if (elements.countExportSheet) {
    elements.countExportSheet.addEventListener("click", (event) => {
      if (event.target.classList.contains("share-backdrop")) {
        closeExportSheet("count");
      }
    });
  }

  if (elements.countExportCsv) {
    elements.countExportCsv.addEventListener("click", () => {
      handleExport("count", "csv");
      closeExportSheet("count");
    });
  }

  if (elements.countExportPdf) {
    elements.countExportPdf.addEventListener("click", () => {
      handleExport("count", "pdf");
      closeExportSheet("count");
    });
  }

  if (elements.countExportPrint) {
    elements.countExportPrint.addEventListener("click", () => {
      handleExport("count", "print");
      closeExportSheet("count");
    });
  }

  if (elements.countClearBtn) {
    elements.countClearBtn.addEventListener("click", async () => {
      if (state.countMode === "new") {
        const confirmClear = window.confirm(
          `Deseja limpar a nova contagem do setor ${state.setor}?`
        );
        if (!confirmClear) return;
        state.sessionRows = state.sessionRows.filter(
          (row) => row.setor !== state.setor
        );
        renderCountTable();
        pushMessage("success", "Nova contagem limpa para o setor atual.");
        return;
      }

      if (!state.user) return;
      const confirmClear = window.confirm(
        `Deseja apagar todas as contagens do setor ${state.setor}?`
      );
      if (!confirmClear) return;

      const shouldSave = window.confirm(
        "Salvar o estoque atual no historico antes de apagar?\nOK = salvar e apagar\nCancelar = apagar sem salvar"
      );
      if (shouldSave) {
        const saved = await saveSnapshotTotal();
        if (!saved) {
          const proceed = window.confirm(
            "Falha ao salvar o historico. Deseja apagar mesmo assim?"
          );
          if (!proceed) return;
        }
      }
      const { error } = await supabaseClient
        .from(TABLE_NAME)
        .delete()
        .eq("user_id", state.user.id)
        .eq("setor", state.setor);
      if (error) {
        pushMessage("error", `Erro ao limpar: ${error.message}`);
        return;
      }
      await loadPublicRecords();
      pushMessage(
        "success",
        shouldSave
          ? "Contagem limpa e historico salvo."
          : "Contagem limpa para o setor atual."
      );
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeExportSheet("public");
      closeExportSheet("count");
    }
  });

  if (elements.saveNewCountBtn) {
    elements.saveNewCountBtn.addEventListener("click", saveNewCount);
  }

  if (elements.discardNewCountBtn) {
    elements.discardNewCountBtn.addEventListener("click", discardNewCount);
  }
}

async function handleAuthState(event, session) {
  state.user = session?.user ?? null;
  if (state.user) {
    if (event === "SIGNED_IN") {
      setLoginTimestamp();
    } else if (!getLoginTimestamp()) {
      setLoginTimestamp();
    }
    storeUserLabel(state.user.id, state.user.email);
    if (isSessionExpired()) {
      await supabaseClient.auth.signOut();
      clearLoginTimestamp();
      setAuthMessage("info", "Sessão expirada. Faça login novamente.");
      return;
    }
    if (elements.menuUserEmail) {
      elements.menuUserEmail.textContent = displayUserFromEmail(
        state.user.email
      );
    }
    if (elements.menuUser) elements.menuUser.classList.remove("hidden");
    if (elements.menuLogout) elements.menuLogout.classList.remove("hidden");
    if (PAGE_MODE === "edit") {
      hideAuthPanel();
      if (elements.countPanel) elements.countPanel.classList.remove("hidden");
      renderContext();
      renderCountTable();
      updateCountModeUI();
      await loadUserRecords();
    } else {
      hideAuthPanel();
      hideCountPanels();
    }
  } else {
    if (event === "SIGNED_OUT") {
      clearLoginTimestamp();
    }
    if (elements.menuUser) elements.menuUser.classList.add("hidden");
    if (elements.menuLogout) elements.menuLogout.classList.add("hidden");
    if (PAGE_MODE === "edit") {
      showAuthPanel();
      hideCountPanels();
      state.userRows = [];
      renderCountTable();
    } else {
      hideAuthPanel();
      hideCountPanels();
    }
  }
}

function setupAuth() {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    handleAuthState(event, session);
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    handleAuthState("INITIAL_SESSION", data?.session ?? null);
  });
}

function initSetorSelects() {
  const setores = Object.keys(CONFIG_GERAL);
  if (elements.setorSelect) {
    elements.setorSelect.innerHTML = "";
    setores.forEach((setor) => {
      const option = document.createElement("option");
      option.value = setor;
      option.textContent = setor;
      elements.setorSelect.appendChild(option);
    });
    elements.setorSelect.value = state.setor;
  }

  if (elements.editSetor) {
    elements.editSetor.innerHTML = "";
    setores.forEach((setor) => {
      const option = document.createElement("option");
      option.value = setor;
      option.textContent = setor;
      elements.editSetor.appendChild(option);
    });
    elements.editSetor.value = state.setor;
  }
}



initSetorSelects();
initManualForm();
buildFilterOptions();
renderContext();
renderPublicTable();
renderCountTable();
setPublicViewMode(state.publicViewMode);
setCountViewMode(state.countViewMode);
updateCountModeUI();
setupVoice();
setupEvents();
setupDashboard();
setupAuth();
loadPublicRecords();
if (PAGE_MODE === "dashboard") {
  loadSnapshotRecords();
}
setInterval(enforceSessionLimit, 60 * 1000);

window.addEventListener("resize", () => {
  if (PAGE_MODE === "dashboard") {
    renderDashboard();
  }
});


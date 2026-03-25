const SUPABASE_URL = "https://ldkazwnzfppcsoolydkp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_14RDXtWzeDV-nzAHfGrNCw_lB4XsUSn";
const TABLE_NAME = "estoque_registros";
const SNAPSHOT_TABLE = "estoque_snapshots";
const SESSION_MAX_MS = 60 * 60 * 1000;
const SUPABASE_TIMEOUT_MS = 45000;
const PUBLIC_CACHE_KEY = "cd_public_cache";
const PUBLIC_CACHE_AT_KEY = "cd_public_cache_at";
const COUNT_DRAFT_KEY_PREFIX = "cd_count_draft_v1";
const LAST_COMPARISON_KEY = "cd_last_comparison_v1";

/*
  Arquivo central do sistema.

  Responsabilidades principais:
  - manter as regras de negocio do estoque por setor/produto/marca;
  - processar voz, formulario manual e edicao;
  - salvar/recuperar o rascunho offline da nova contagem;
  - sincronizar dados com o Supabase;
  - montar dashboard, comparacao de saida e exportacoes.
*/

const CONFIG_GERAL = {
  CHAO: {
    AMARELO: {
      ANGEL: (t) => (t >= 4 && t <= 9 ? 72 : 65),
      "BAHIA (LULA)": (t) => 66,
      "BAHIA (ANGELA)": (t) => 66,
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
      COSA: (t) => 66,
  
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
    ORANGE: {
      BAHIA: (t) => 130,
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
      GAIA: (t) => (t >= 4 && t <= 7 ? 66 : 65),
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

const BOX_KEYWORDS = new Set([
  "CAIXA",
  "CAIXAS",
  "CX",
  "CXS",
  "AVULSA",
  "AVULSAS",
]);

const REMOVE_KEYWORDS = new Set(["REMOVER", "REMOVA", "DESFAZER"]);
const CORRECT_KEYWORDS = new Set(["CORRIGIR", "CORRIGE", "CORRECAO"]);

// Estado global compartilhado entre as paginas. Cada tela usa apenas parte dele.
const state = {
  setor: Object.keys(CONFIG_GERAL)[0],
  produto: null,
  marca: null,
  tipo: null,
  countMode: "current",
  sessionRows: [],
  userRows: [],
  previousCountRows: [],
  previousPublicRows: [],
  lastLaunch: null,
  pendingCorrection: null,
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
  lastComparisonReport: null,
  countDraftSavedAt: null,
  countDraftHash: "",
};

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonNegativeInt(value, fallback = 0) {
  return Math.max(0, toInt(value, fallback));
}

/*
  ===== Utilitarios de inventario =====
  Estas funcoes garantem que pallets, caixas avulsas e total de caixas
  fiquem consistentes em qualquer parte do sistema.
*/

/**
 * Regra central das metricas:
 * total_caixas = pallets * caixas_pallet + caixas_avulsas.
 * Se as caixas avulsas fecharem um pallet completo, a conversao e automatica.
 */
function normalizeInventoryMetrics({
  caixasPallet,
  pallets = 0,
  caixasAvulsas,
  totalCaixas,
}) {
  const caixasPorPallet = toNonNegativeInt(caixasPallet, 0);
  let palletsCount = toNonNegativeInt(pallets, 0);
  const hasLooseBoxesValue =
    caixasAvulsas !== undefined && caixasAvulsas !== null && caixasAvulsas !== "";
  let looseBoxes = toNonNegativeInt(caixasAvulsas, 0);
  let totalBoxes = toNonNegativeInt(totalCaixas, 0);

  if (!caixasPorPallet) {
    if (!hasLooseBoxesValue) {
      totalBoxes = toNonNegativeInt(totalCaixas, palletsCount);
      looseBoxes = totalBoxes;
      palletsCount = 0;
    } else {
      totalBoxes = looseBoxes;
      palletsCount = 0;
    }

    return {
      caixas_pallet: caixasPorPallet,
      pallets: palletsCount,
      caixas_avulsas: looseBoxes,
      total_caixas: totalBoxes,
    };
  }

  if (hasLooseBoxesValue) {
    if (looseBoxes >= caixasPorPallet) {
      palletsCount += Math.floor(looseBoxes / caixasPorPallet);
      looseBoxes %= caixasPorPallet;
    }
    totalBoxes = palletsCount * caixasPorPallet + looseBoxes;
  } else {
    totalBoxes = toNonNegativeInt(
      totalCaixas,
      palletsCount * caixasPorPallet
    );
    palletsCount = Math.floor(totalBoxes / caixasPorPallet);
    looseBoxes = totalBoxes % caixasPorPallet;
  }

  return {
    caixas_pallet: caixasPorPallet,
    pallets: palletsCount,
    caixas_avulsas: looseBoxes,
    total_caixas: totalBoxes,
  };
}

function hydrateInventoryRow(row, overrides = {}) {
  const base = { ...(row || {}), ...(overrides || {}) };
  const metrics = normalizeInventoryMetrics({
    caixasPallet: base.caixas_pallet,
    pallets: base.pallets,
    caixasAvulsas: base.caixas_avulsas,
    totalCaixas: base.total_caixas,
  });
  return {
    ...base,
    ...metrics,
  };
}

function applyInventoryDeltas(target, { caixas_pallet, palletsDelta = 0, caixasAvulsasDelta = 0 }) {
  if (!target) return;
  const metrics = normalizeInventoryMetrics({
    caixasPallet: caixas_pallet ?? target.caixas_pallet,
    pallets: toNonNegativeInt(target.pallets, 0) + toNonNegativeInt(palletsDelta, 0),
    caixasAvulsas:
      toNonNegativeInt(target.caixas_avulsas, 0) +
      toNonNegativeInt(caixasAvulsasDelta, 0),
  });
  target.caixas_pallet = metrics.caixas_pallet;
  target.pallets = metrics.pallets;
  target.caixas_avulsas = metrics.caixas_avulsas;
  target.total_caixas = metrics.total_caixas;
}

function formatInventoryStack(pallets, caixasAvulsas) {
  const palletsCount = toNonNegativeInt(pallets, 0);
  const looseBoxes = toNonNegativeInt(caixasAvulsas, 0);
  if (palletsCount && looseBoxes) {
    return `${palletsCount} + ${looseBoxes}cxs`;
  }
  if (palletsCount) {
    return String(palletsCount);
  }
  if (looseBoxes) {
    return `${looseBoxes}cxs`;
  }
  return "";
}

function formatInventoryMessage(pallets, caixasAvulsas) {
  const palletsCount = toNonNegativeInt(pallets, 0);
  const looseBoxes = toNonNegativeInt(caixasAvulsas, 0);
  const palletLabel = palletsCount === 1 ? "pallet" : "pallets";
  if (palletsCount && looseBoxes) {
    return `${palletsCount} ${palletLabel} + ${looseBoxes} cxs`;
  }
  if (palletsCount) {
    return `${palletsCount} ${palletLabel}`;
  }
  if (looseBoxes) {
    return `${looseBoxes} cxs`;
  }
  return "0";
}

// Estruturas auxiliares para desfazer/remover/corrigir o ultimo lancamento por voz.
function buildLaunchItem({
  setor,
  produto,
  marca,
  tipo,
  caixasPallet,
  palletsDelta = 0,
  caixasAvulsasDelta = 0,
}) {
  const normalizedCaixasPallet = toNonNegativeInt(caixasPallet, 0);
  const normalizedPalletsDelta = toNonNegativeInt(palletsDelta, 0);
  const normalizedCaixasAvulsasDelta = toNonNegativeInt(caixasAvulsasDelta, 0);

  return {
    setor,
    produto,
    marca,
    tipo,
    caixas_pallet: normalizedCaixasPallet,
    palletsDelta: normalizedPalletsDelta,
    caixasAvulsasDelta: normalizedCaixasAvulsasDelta,
    totalCaixasDelta:
      normalizedPalletsDelta * normalizedCaixasPallet +
      normalizedCaixasAvulsasDelta,
  };
}

function buildLaunchRecord({
  items,
  correctionMode = null,
  actionKind = "pallets",
  label = "",
}) {
  const normalizedItems = (items || [])
    .map((item) => buildLaunchItem(item))
    .filter((item) => item.totalCaixasDelta > 0);

  if (!normalizedItems.length) return null;

  return {
    id: `launch_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    mode: state.countMode,
    items: normalizedItems,
    correctionMode,
    actionKind,
    label,
    createdAt: new Date().toISOString(),
  };
}

function clearVoiceActionState() {
  state.lastLaunch = null;
  state.pendingCorrection = null;
}

function setLastLaunch(record) {
  state.lastLaunch = record ? JSON.parse(JSON.stringify(record)) : null;
  state.pendingCorrection = null;
}

function getLaunchItemLabel(item) {
  if (!item) return "ultimo lancamento";
  const tipoLabel = formatTipoLabelValue(item.produto, item.tipo, item.marca);
  if (isNoTipoContext(item.produto, item.marca)) {
    return `${item.produto} ${item.marca}`;
  }
  return `${item.produto} ${item.marca} Tipo ${tipoLabel}`;
}

function describeLaunchRecord(record) {
  if (!record?.items?.length) return "ultimo lancamento";
  if (record.items.length === 1) {
    const item = record.items[0];
    return `${getLaunchItemLabel(item)} (${formatInventoryMessage(
      item.palletsDelta,
      item.caixasAvulsasDelta
    )})`;
  }
  return `${record.items.length} itens do ultimo lancamento`;
}

function getCorrectionPrompt(record) {
  if (!record) return "";
  if (record.correctionMode === "type") {
    return "Diga o tipo correto para substituir o ultimo lancamento.";
  }
  if (record.correctionMode === "quantity") {
    return record.actionKind === "boxes"
      ? "Diga a quantidade correta de caixas avulsas."
      : "Diga a quantidade correta para substituir o ultimo lancamento.";
  }
  return "Esse ultimo lancamento nao pode ser corrigido por voz. Use REMOVER e repita o comando.";
}

function buildRowFromTotal(row, totalCaixas) {
  const baseRow = hydrateInventoryRow(row);
  const nextTotal = toNonNegativeInt(totalCaixas, 0);
  if (nextTotal <= 0) return null;
  const metrics = normalizeInventoryMetrics({
    caixasPallet: baseRow.caixas_pallet,
    totalCaixas: nextTotal,
  });
  return {
    ...baseRow,
    ...metrics,
  };
}

function revertLaunchInSession(record) {
  if (!record?.items?.length) return false;

  for (const item of record.items) {
    const row = getInventoryRowByIdentity(state.sessionRows, item);
    if (!row) {
      pushMessage("warn", "Nao encontrei o item do ultimo lancamento para remover.");
      return false;
    }
    const nextRow = buildRowFromTotal(row, row.total_caixas - item.totalCaixasDelta);
    if (!nextRow) {
      state.sessionRows = state.sessionRows.filter(
        (current) => getRowKey(current) !== getRowKey(row)
      );
    } else {
      row.caixas_pallet = nextRow.caixas_pallet;
      row.pallets = nextRow.pallets;
      row.caixas_avulsas = nextRow.caixas_avulsas;
      row.total_caixas = nextRow.total_caixas;
    }
  }

  if (state.selectedRowKey && !findSessionRowByKey(state.selectedRowKey)) {
    state.selectedRowKey = null;
  }

  renderCountTable();
  return true;
}

async function revertLaunchInCurrentCount(record) {
  if (!record?.items?.length || !state.user) return false;

  for (const item of record.items) {
    const currentRow = getInventoryRowByIdentity(state.userRows, item);
    if (!currentRow?.id) {
      pushMessage("warn", "Nao encontrei o item do ultimo lancamento para remover.");
      return false;
    }

    const nextRow = buildRowFromTotal(
      currentRow,
      currentRow.total_caixas - item.totalCaixasDelta
    );

    if (!nextRow) {
      const deleteResult = await withTimeout(
        supabaseClient
          .from(TABLE_NAME)
          .delete()
          .eq("id", currentRow.id)
          .eq("user_id", state.user.id),
        SUPABASE_TIMEOUT_MS,
        "Tempo limite ao remover o ultimo lancamento."
      );

      if (deleteResult?.error) {
        pushMessage(
          "error",
          `Erro ao remover o ultimo lancamento: ${deleteResult.error.message}`
        );
        return false;
      }
    } else {
      const payload = buildDbRowPayload(
        {
          ...nextRow,
          user_id: state.user.id,
        },
        false,
        currentRow.caixas_avulsas > 0 || nextRow.caixas_avulsas > 0
      );

      const updateResult = await withTimeout(
        supabaseClient
          .from(TABLE_NAME)
          .update(payload)
          .eq("id", currentRow.id)
          .eq("user_id", state.user.id),
        SUPABASE_TIMEOUT_MS,
        "Tempo limite ao atualizar o ultimo lancamento."
      );

      if (updateResult?.error) {
        const message = isLooseBoxesSchemaError(updateResult.error)
          ? "Erro ao corrigir o ultimo lancamento: rode a migracao de caixas avulsas no Supabase."
          : `Erro ao corrigir o ultimo lancamento: ${updateResult.error.message}`;
        pushMessage("error", message);
        return false;
      }
    }
  }

  await loadUserRecords();
  await loadPublicRecords();
  return true;
}

async function revertLaunchRecord(record) {
  if (!record?.items?.length) {
    pushMessage("warn", "Nao ha ultimo lancamento para remover.");
    return false;
  }

  if (record.mode !== state.countMode) {
    pushMessage(
      "warn",
      record.mode === "new"
        ? "Volte para a nova contagem para remover esse ultimo lancamento."
        : "Volte para a contagem atual para remover esse ultimo lancamento."
    );
    return false;
  }

  if (state.countMode === "new") {
    return revertLaunchInSession(record);
  }

  return revertLaunchInCurrentCount(record);
}

async function removeLastLaunchCommand() {
  if (!state.lastLaunch) {
    pushMessage("warn", "Nao ha ultimo lancamento para remover.");
    return false;
  }

  const removed = await revertLaunchRecord(state.lastLaunch);
  if (!removed) return false;

  pushMessage("success", `Ultimo lancamento removido: ${describeLaunchRecord(state.lastLaunch)}.`);
  clearVoiceActionState();
  return true;
}

function getInventoryRowByIdentity(rows, { setor, produto, marca, tipo }) {
  return (rows || []).find(
    (row) =>
      row?.setor === setor &&
      row?.produto === produto &&
      row?.marca === marca &&
      row?.tipo === tipo
  );
}

function buildInventoryPreview({
  currentRow,
  caixasPallet,
  palletsDelta = 0,
  caixasAvulsasDelta = 0,
}) {
  const before = hydrateInventoryRow(
    currentRow || {
      caixas_pallet: caixasPallet,
      pallets: 0,
      caixas_avulsas: 0,
      total_caixas: 0,
    },
    {
      caixas_pallet: caixasPallet,
    }
  );
  const after = hydrateInventoryRow(before, {
    caixas_pallet: caixasPallet,
    pallets: before.pallets + toNonNegativeInt(palletsDelta, 0),
    caixas_avulsas: before.caixas_avulsas + toNonNegativeInt(caixasAvulsasDelta, 0),
  });

  return { before, after };
}

function buildInventoryResultMessage({
  successPrefix,
  successSubject,
  palletsDelta = 0,
  caixasAvulsasDelta = 0,
  before,
  after,
  isNewCount = false,
}) {
  const base = `${successPrefix}${isNewCount ? " (nova contagem)" : ""}: ${successSubject} ${formatInventoryMessage(
    palletsDelta,
    caixasAvulsasDelta
  )}`.trim();
  const parts = [base];

  if (after) {
    parts.push(`Total do item: ${formatInventoryMessage(after.pallets, after.caixas_avulsas)}.`);
  }

  const convertedPallets =
    toNonNegativeInt(after?.pallets, 0) -
    toNonNegativeInt(before?.pallets, 0) -
    toNonNegativeInt(palletsDelta, 0);

  if (convertedPallets > 0) {
    const convertedLabel = convertedPallets === 1 ? "pallet" : "pallets";
    parts.push(
      `${convertedPallets} ${convertedLabel} vieram das caixas avulsas acumuladas.`
    );
  }

  return parts.join(" ");
}

function hasBoxKeyword(text) {
  return tokenizeText(text).some((token) => BOX_KEYWORDS.has(token));
}

function buildDbRowPayload(row, includeUserId = false, forceLooseBoxes = false) {
  const normalizedRow = hydrateInventoryRow(row);
  const payload = {
    setor: normalizedRow.setor,
    produto: normalizedRow.produto,
    marca: normalizedRow.marca,
    tipo: normalizedRow.tipo,
    caixas_pallet: normalizedRow.caixas_pallet,
    pallets: normalizedRow.pallets,
    total_caixas: normalizedRow.total_caixas,
  };

  if (forceLooseBoxes || normalizedRow.caixas_avulsas > 0) {
    payload.caixas_avulsas = normalizedRow.caixas_avulsas;
  }
  if (includeUserId && normalizedRow.user_id) {
    payload.user_id = normalizedRow.user_id;
  }

  return payload;
}

function isLooseBoxesSchemaError(error) {
  const message = error?.message || "";
  return /caixas_avulsas/i.test(message);
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cache dos elementos de DOM usados ao longo do arquivo para evitar buscas repetidas.
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
  countSyncBanner: document.getElementById("count-sync-banner"),
  countSyncPill: document.getElementById("count-sync-pill"),
  countSyncTitle: document.getElementById("count-sync-title"),
  countSyncText: document.getElementById("count-sync-text"),
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
  editLooseBoxes: document.getElementById("edit-loose-boxes"),
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
  manualBoxes: document.getElementById("manual-boxes"),
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
  comparisonMeta: document.getElementById("comparison-meta"),
  comparisonBody: document.getElementById("comparison-body"),
};

const PAGE_MODE = document.body?.dataset?.page || "view";

/*
  ===== Regras de linguagem / voz =====
  Esta camada normaliza transcricoes, converte apelidos de fala e identifica
  tipos especiais como 6A/6B no ORANGE.
*/

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

  const tokenMap = {
    QUILO: "KG",
    QUILOS: "KG",
    KILO: "KG",
    KILOS: "KG",
    QUILOGRAMA: "KG",
    QUILOGRAMAS: "KG",
    CEP: "CEPI",
    BRASIL: "BRAZIL",
    ORANAGE: "ORANGE",
  };

  return tokens.map((token) => tokenMap[token] || token).join(" ").trim();
}

const NO_TIPO_PRODUCTS = new Set(["PIMENTAO"]);
const NO_TIPO_VALUE = 0;
const TIPO_MIN = 3;
const TIPO_MAX = 15;
const SPECIAL_TIPO_VARIANTS = {
  ORANGE: [
    {
      value: 14,
      label: "6A",
      matchSequences: [
        ["6", "A"],
        ["SEIS", "A"],
      ],
    },
    {
      value: 15,
      label: "6B",
      matchSequences: [
        ["6", "B"],
        ["SEIS", "B"],
      ],
    },
  ],
};

function isNoTipoProduct(produto) {
  if (!produto) return false;
  return NO_TIPO_PRODUCTS.has(normalizeText(produto));
}

function isNoTipoBrand(marca) {
  if (!marca) return false;
  return /\bKG\b/.test(normalizeText(marca));
}

function isNoTipoContext(produto, marca) {
  return isNoTipoProduct(produto);
}

function formatTipoLabelValue(produto, tipo, marca = "") {
  if (isNoTipoContext(produto, marca)) {
    return "S/T";
  }
  return getSpecialTipoLabel(produto, tipo) || tipo;
}

function isTipoValid(tipo) {
  return Number.isFinite(tipo) && tipo >= TIPO_MIN && tipo <= TIPO_MAX;
}

function getSpecialTipoVariants(produto) {
  if (!produto) return [];
  return SPECIAL_TIPO_VARIANTS[normalizeText(produto)] || [];
}

function getSpecialTipoLabel(produto, tipo) {
  const numericTipo = Number.parseInt(tipo, 10);
  if (!Number.isFinite(numericTipo)) return null;
  return (
    getSpecialTipoVariants(produto).find((variant) => variant.value === numericTipo)
      ?.label || null
  );
}

function hasSpecialTipoVariants(produto) {
  return getSpecialTipoVariants(produto).length > 0;
}

function isTipoValidForContext(produto, tipo) {
  const numericTipo = Number.parseInt(tipo, 10);
  if (!Number.isFinite(numericTipo)) return false;
  const specialVariants = getSpecialTipoVariants(produto);
  if (specialVariants.length) {
    return specialVariants.some((variant) => variant.value === numericTipo);
  }
  return isTipoValid(numericTipo);
}

function getTipoValidationMessage(produto) {
  if (hasSpecialTipoVariants(produto)) {
    return "Para ORANGE, use 6A ou 6B.";
  }
  return "Tipo deve estar entre 3 e 15.";
}

function parseTipoInputValue(value, produto) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;

  const specialMatch = getSpecialTipoVariants(produto).find((variant) =>
    variant.matchSequences.some((sequence) => sequence.join(" ") === normalizedValue)
  );
  if (specialMatch) {
    return specialMatch.value;
  }

  const numericTipo = Number.parseInt(normalizedValue, 10);
  return Number.isFinite(numericTipo) ? numericTipo : null;
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

function buildIgnoredTokenIndexes(tokens, ignoredValues = []) {
  const ignoredIndexes = new Set();

  (ignoredValues || []).forEach((value) => {
    const sequence = tokenizeText(value);
    if (!sequence.length || sequence.length > tokens.length) return;

    for (let i = 0; i <= tokens.length - sequence.length; i += 1) {
      let match = true;
      for (let j = 0; j < sequence.length; j += 1) {
        if (tokens[i + j] !== sequence[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        for (let j = 0; j < sequence.length; j += 1) {
          ignoredIndexes.add(i + j);
        }
        break;
      }
    }
  });

  return ignoredIndexes;
}

function extractCommandTokens(text, ignoredValues = []) {
  const tokens = tokenizeText(text);
  if (!tokens.length) return [];

  const ignoredIndexes = buildIgnoredTokenIndexes(tokens, ignoredValues);

  return tokens.filter((token, index) => !ignoredIndexes.has(index));
}

function extractCommandNumbers(text, ignoredValues = []) {
  const tokens = extractCommandTokens(text, ignoredValues);
  if (!tokens.length) return [];

  return tokens.reduce((results, token, index) => {
    if (/^\d+$/.test(token)) {
      results.push(Number.parseInt(token, 10));
      return results;
    }
    if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, token)) {
      results.push(NUMBER_WORDS[token]);
    }
    return results;
  }, []);
}

function extractSpecialTipoSequence(text, produto, ignoredValues = []) {
  const variants = getSpecialTipoVariants(produto);
  if (!variants.length) return [];

  const tokens = extractCommandTokens(text, ignoredValues);
  const results = [];

  for (let index = 0; index < tokens.length; index += 1) {
    let matched = null;
    for (const variant of variants) {
      const sequence = variant.matchSequences.find((candidate) =>
        candidate.every((token, offset) => tokens[index + offset] === token)
      );
      if (sequence) {
        matched = { value: variant.value, length: sequence.length };
        break;
      }
    }
    if (matched) {
      results.push(matched.value);
      index += matched.length - 1;
    }
  }

  return results;
}

function isAddCommand(text) {
  const tokens = normalizeText(text).split(" ").filter(Boolean);
  return tokens.some((token) => ADD_KEYWORDS.has(token));
}

function isRemoveCommand(text) {
  const tokens = tokenizeText(text);
  return tokens.some((token) => REMOVE_KEYWORDS.has(token));
}

function isCorrectCommand(text) {
  const tokens = tokenizeText(text);
  return tokens.some((token) => CORRECT_KEYWORDS.has(token));
}

/*
  ===== Mensagens de interface, cache e rascunho offline =====
  Tudo que ajuda o usuario a acompanhar o estado da contagem passa por aqui.
*/

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

let countDraftPersistTimer = null;

function getCountDraftStorageKey(userId = state.user?.id) {
  if (!userId) return "";
  return `${COUNT_DRAFT_KEY_PREFIX}_${userId}`;
}

function normalizeDraftRows(rows, prefix = "draft") {
  return aggregateRows(
    (rows || []).map((row, index) =>
      hydrateInventoryRow({
        ...(row || {}),
        _localId:
          row?._localId ||
          row?.id ||
          `${prefix}_${index}_${Math.random().toString(16).slice(2)}`,
      })
    )
  );
}

function getCurrentPublicAggregateRows() {
  const sourceRows = state.rawPublicRows?.length
    ? state.rawPublicRows
    : state.publicRows;
  return aggregateRows(cloneInventoryRows(sourceRows));
}

function hasCountDraftData() {
  return Boolean(
    state.sessionRows.length ||
      state.previousCountRows.length ||
      state.previousPublicRows.length
  );
}

function renderCountSyncStatus() {
  if (!elements.countSyncBanner) return;

  if (!state.user) {
    elements.countSyncBanner.classList.add("hidden");
    return;
  }

  const online = navigator.onLine;
  const hasDraft = hasCountDraftData();
  const lastSaved = formatDateTime(state.countDraftSavedAt);

  let title = "";
  let text = "";

  if (hasDraft) {
    if (online) {
      title =
        state.countMode === "new"
          ? "Nova contagem protegida neste aparelho"
          : "Rascunho da nova contagem guardado neste aparelho";
      text =
        lastSaved === "--"
          ? "Voce pode continuar contando. Ao salvar a nova contagem, o sistema sincroniza tudo de uma vez."
          : `Voce pode continuar contando. Ultimo salvamento local: ${lastSaved}. Ao salvar a nova contagem, o sistema sincroniza tudo de uma vez.`;
    } else {
      title = "Sem internet, mas a contagem continua segura";
      text =
        lastSaved === "--"
          ? "Os lancamentos desta nova contagem seguem salvos neste aparelho ate a conexao voltar."
          : `Os lancamentos desta nova contagem seguem salvos neste aparelho. Ultimo salvamento local: ${lastSaved}.`;
    }
  } else if (online) {
    title = "Sistema pronto para contagem offline";
    text =
      "Quando voce iniciar uma nova contagem, o rascunho sera salvo automaticamente neste aparelho.";
  } else {
    title = "Sem internet no momento";
    text =
      "Se a nova contagem ja foi iniciada, continue normalmente. Se ainda nao foi, inicie antes de entrar na camara para garantir o rascunho offline.";
  }

  elements.countSyncBanner.classList.remove("hidden");

  if (elements.countSyncPill) {
    elements.countSyncPill.textContent = online ? "Online" : "Offline";
    elements.countSyncPill.className = `sync-pill ${online ? "online" : "offline"}`;
  }
  if (elements.countSyncTitle) {
    elements.countSyncTitle.textContent = title;
  }
  if (elements.countSyncText) {
    elements.countSyncText.textContent = text;
  }
}

function saveCountDraftLocally() {
  if (!state.user) return false;

  const storageKey = getCountDraftStorageKey();
  if (!storageKey) return false;

  if (!hasCountDraftData()) {
    localStorage.removeItem(storageKey);
    state.countDraftSavedAt = null;
    state.countDraftHash = "";
    renderCountSyncStatus();
    return false;
  }

  const payload = {
    version: 1,
    user_id: state.user.id,
    setor: state.setor,
    produto: state.produto,
    marca: state.marca,
    tipo: state.tipo,
    count_mode: state.countMode,
    session_rows: cloneInventoryRows(state.sessionRows),
    previous_count_rows: cloneInventoryRows(state.previousCountRows),
    previous_public_rows: cloneInventoryRows(state.previousPublicRows),
    last_launch: state.lastLaunch,
  };
  const payloadHash = JSON.stringify(payload);

  if (payloadHash === state.countDraftHash) {
    renderCountSyncStatus();
    return true;
  }

  payload.saved_at = new Date().toISOString();

  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
    state.countDraftSavedAt = payload.saved_at;
    state.countDraftHash = payloadHash;
    renderCountSyncStatus();
    return true;
  } catch (error) {
    console.warn("Nao foi possivel salvar rascunho local da contagem.", error);
    pushMessage(
      "warn",
      "Nao foi possivel salvar o rascunho offline neste aparelho."
    );
    renderCountSyncStatus();
    return false;
  }
}

function scheduleCountDraftPersist() {
  renderCountSyncStatus();
  if (!state.user || state.countMode !== "new") return;
  clearTimeout(countDraftPersistTimer);
  countDraftPersistTimer = setTimeout(() => {
    saveCountDraftLocally();
  }, 120);
}

function clearCountDraft(options = {}) {
  const { userId = state.user?.id, keepSavedAt = false } = options;
  clearTimeout(countDraftPersistTimer);
  const storageKey = getCountDraftStorageKey(userId);
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
  if (!keepSavedAt) {
    state.countDraftSavedAt = null;
  }
  state.countDraftHash = "";
  renderCountSyncStatus();
}

function restoreCountDraftForCurrentUser() {
  if (!state.user) return false;

  const storageKey = getCountDraftStorageKey();
  if (!storageKey) return false;

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    state.countDraftSavedAt = null;
    state.countDraftHash = "";
    state.sessionRows = [];
    state.previousCountRows = [];
    state.previousPublicRows = [];
    state.lastLaunch = null;
    state.pendingCorrection = null;
    state.countMode = "current";
    renderCountSyncStatus();
    return false;
  }

  try {
    const payload = JSON.parse(raw);
    const sessionRows = normalizeDraftRows(payload?.session_rows, "session");
    const previousCountRows = normalizeDraftRows(
      payload?.previous_count_rows,
      "previous_count"
    );
    const previousPublicRows = normalizeDraftRows(
      payload?.previous_public_rows,
      "previous_public"
    );
    const hasDraft =
      sessionRows.length || previousCountRows.length || previousPublicRows.length;

    if (!hasDraft) {
      clearCountDraft();
      state.sessionRows = [];
      state.previousCountRows = [];
      state.previousPublicRows = [];
      state.lastLaunch = null;
      state.pendingCorrection = null;
      state.countMode = "current";
      return false;
    }

    state.sessionRows = sessionRows;
    state.previousCountRows = previousCountRows.length
      ? previousCountRows
      : cloneInventoryRows(state.userRows);
    state.previousPublicRows = previousPublicRows.length
      ? previousPublicRows
      : getCurrentPublicAggregateRows();
    state.lastLaunch = payload?.last_launch || null;
    state.pendingCorrection = null;
    state.countMode = "new";
    state.selectedRowKey = null;
    state.setor = normalizeSetorValue(payload?.setor) || state.setor;
    state.produto = payload?.produto || null;
    state.marca = payload?.marca || null;
    state.tipo =
      payload?.tipo === 0 || Number.isFinite(payload?.tipo)
        ? payload.tipo
        : null;
    state.countDraftSavedAt = payload?.saved_at || null;
    const restoredHash = JSON.stringify({
      version: payload?.version ?? 1,
      user_id: state.user.id,
      setor: state.setor,
      produto: state.produto,
      marca: state.marca,
      tipo: state.tipo,
      count_mode: payload?.count_mode || "new",
      session_rows: cloneInventoryRows(state.sessionRows),
      previous_count_rows: cloneInventoryRows(state.previousCountRows),
      previous_public_rows: cloneInventoryRows(state.previousPublicRows),
      last_launch: state.lastLaunch,
    });
    const shouldAnnounceRestore =
      restoredHash !== state.countDraftHash || state.countMode !== "new";
    state.countDraftHash = restoredHash;

    renderContext();
    updateCountModeUI();
    renderCountTable();
    if (shouldAnnounceRestore) {
      pushMessage(
        "info",
        "Rascunho local da nova contagem recuperado neste aparelho."
      );
    }
    renderCountSyncStatus();
    return true;
  } catch (error) {
    console.warn("Nao foi possivel restaurar rascunho local da contagem.", error);
    clearCountDraft();
    state.sessionRows = [];
    state.previousCountRows = [];
    state.previousPublicRows = [];
    state.lastLaunch = null;
    state.pendingCorrection = null;
    state.countMode = "current";
    state.countDraftHash = "";
    renderCountSyncStatus();
    return false;
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

/*
  ===== Datas, usuario e sessao =====
  Mantem os textos de "ultima atualizacao", o nome do usuario e a expiracao do login.
*/

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
  if (elements.manualSetor && elements.manualSetor.value !== state.setor) {
    elements.manualSetor.value = state.setor || "";
    updateManualDependencies();
  }
  renderCountSyncStatus();
  if (state.countMode === "new") {
    scheduleCountDraftPersist();
  }
}

/*
  ===== Agregacao e comparacao =====
  Aqui nascem os totais por item, a soma da saida e o relatorio "o que saiu?".
*/

function aggregateRows(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const normalizedRow = hydrateInventoryRow(row);
    const key = `${normalizedRow.setor}|||${normalizedRow.produto}|||${normalizedRow.marca}|||${normalizedRow.tipo}`;
    const current = map.get(key);
    if (current) {
      applyInventoryDeltas(current, {
        caixas_pallet: normalizedRow.caixas_pallet,
        palletsDelta: normalizedRow.pallets,
        caixasAvulsasDelta: normalizedRow.caixas_avulsas,
      });
    } else {
      map.set(key, normalizedRow);
    }
  });
  return Array.from(map.values());
}

function cloneInventoryRows(rows) {
  return (rows || []).map((row) => hydrateInventoryRow({ ...row }));
}

function buildInventoryIdentityKey(row) {
  const normalizedRow = hydrateInventoryRow(row);
  return [
    normalizedRow.setor,
    normalizedRow.produto,
    normalizedRow.marca,
    normalizedRow.tipo,
  ].join("|||");
}

function buildInventoryTotalsMap(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const normalizedRow = hydrateInventoryRow(row);
    const key = buildInventoryIdentityKey(normalizedRow);
    const currentTotal = map.get(key) || 0;
    map.set(key, currentTotal + normalizedRow.total_caixas);
  });
  return map;
}

function calculateOutflowCaixas(previousRows, currentRows) {
  const previousMap = buildInventoryTotalsMap(previousRows);
  const currentMap = buildInventoryTotalsMap(currentRows);
  let total = 0;
  previousMap.forEach((previousTotal, key) => {
    const currentTotal = currentMap.get(key) || 0;
    total += Math.max(0, previousTotal - currentTotal);
  });
  return total;
}

/**
 * Reconstroi o estoque publico "apos salvar" sem depender de uma nova leitura do servidor.
 * Isso evita perder a comparacao caso o usuario troque de pagina logo depois de salvar.
 */
function buildPublicRowsAfterUserReplacement(
  previousPublicRows,
  previousUserRows,
  currentUserRows
) {
  const totalsMap = new Map();

  const applyRows = (rows, direction = 1) => {
    aggregateRows(rows).forEach((row) => {
      const normalizedRow = hydrateInventoryRow(row);
      const key = buildInventoryIdentityKey(normalizedRow);
      const current = totalsMap.get(key);
      const currentTotal = current ? toNonNegativeInt(current.total_caixas, 0) : 0;
      const nextTotal = Math.max(
        0,
        currentTotal + direction * toNonNegativeInt(normalizedRow.total_caixas, 0)
      );

      if (!nextTotal) {
        totalsMap.delete(key);
        return;
      }

      totalsMap.set(key, {
        ...(current || {}),
        setor: normalizedRow.setor,
        produto: normalizedRow.produto,
        marca: normalizedRow.marca,
        tipo: normalizedRow.tipo,
        caixas_pallet:
          normalizedRow.caixas_pallet || current?.caixas_pallet || 0,
        total_caixas: nextTotal,
      });
    });
  };

  applyRows(previousPublicRows, 1);
  applyRows(previousUserRows, -1);
  applyRows(currentUserRows, 1);

  return Array.from(totalsMap.values()).map((row) => hydrateInventoryRow(row));
}

/**
 * Monta a comparacao detalhada entre a contagem anterior e a atual.
 * O foco e listar apenas os itens que perderam caixas (saida > 0).
 */
function buildComparisonReport(previousRows, currentRows) {
  const previousAggregated = aggregateRows(previousRows);
  const currentAggregated = aggregateRows(currentRows);
  const previousMap = new Map();
  const currentMap = new Map();

  previousAggregated.forEach((row) => {
    previousMap.set(buildInventoryIdentityKey(row), hydrateInventoryRow(row));
  });
  currentAggregated.forEach((row) => {
    currentMap.set(buildInventoryIdentityKey(row), hydrateInventoryRow(row));
  });

  const items = [];
  previousMap.forEach((previousRow, key) => {
    const currentRow = currentMap.get(key);
    const previousTotal = toNonNegativeInt(previousRow.total_caixas, 0);
    const currentTotal = toNonNegativeInt(currentRow?.total_caixas, 0);
    const saidaCaixas = Math.max(0, previousTotal - currentTotal);

    if (!saidaCaixas) return;

    items.push({
      setor: previousRow.setor,
      produto: previousRow.produto,
      marca: previousRow.marca,
      tipo: previousRow.tipo,
      caixas_pallet: previousRow.caixas_pallet || currentRow?.caixas_pallet || 0,
      previous_pallets: toNonNegativeInt(previousRow.pallets, 0),
      previous_caixas_avulsas: toNonNegativeInt(previousRow.caixas_avulsas, 0),
      previous_total_caixas: previousTotal,
      current_pallets: toNonNegativeInt(currentRow?.pallets, 0),
      current_caixas_avulsas: toNonNegativeInt(currentRow?.caixas_avulsas, 0),
      current_total_caixas: currentTotal,
      saida_caixas: saidaCaixas,
    });
  });

  items.sort((a, b) => {
    const bySaida = b.saida_caixas - a.saida_caixas;
    if (bySaida !== 0) return bySaida;
    const bySetor = a.setor.localeCompare(b.setor);
    if (bySetor !== 0) return bySetor;
    const byProduto = a.produto.localeCompare(b.produto);
    if (byProduto !== 0) return byProduto;
    const byMarca = a.marca.localeCompare(b.marca);
    if (byMarca !== 0) return byMarca;
    return toNonNegativeInt(a.tipo, 0) - toNonNegativeInt(b.tipo, 0);
  });

  const totalSaida = items.reduce((sum, item) => sum + item.saida_caixas, 0);

  return {
    created_at: new Date().toISOString(),
    total_saida_caixas: totalSaida,
    itens_com_saida: items.length,
    items,
  };
}

function saveComparisonReport(report) {
  state.lastComparisonReport = report || null;
  try {
    if (!report) {
      localStorage.removeItem(LAST_COMPARISON_KEY);
    } else {
      localStorage.setItem(LAST_COMPARISON_KEY, JSON.stringify(report));
    }
  } catch (error) {
    console.warn("Nao foi possivel salvar o relatorio de saida.", error);
  }
  renderComparisonReport();
}

function loadComparisonReport() {
  try {
    const raw = localStorage.getItem(LAST_COMPARISON_KEY);
    state.lastComparisonReport = raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Nao foi possivel carregar o relatorio de saida.", error);
    state.lastComparisonReport = null;
  }
  renderComparisonReport();
}

function formatInventorySnapshot(pallets, caixasAvulsas, totalCaixas) {
  const stack = formatInventoryStack(pallets, caixasAvulsas);
  if (stack) {
    return `${stack} (${formatNumber(totalCaixas)})`;
  }
  return formatNumber(totalCaixas);
}

function renderComparisonReport() {
  if (PAGE_MODE !== "dashboard") return;
  if (!elements.comparisonBody || !elements.comparisonMeta) return;

  const report = state.lastComparisonReport;
  elements.comparisonBody.innerHTML = "";

  if (!report) {
    elements.comparisonMeta.textContent = "Ainda nao existe comparacao salva.";
    const empty = document.createElement("p");
    empty.className = "msg info";
    empty.textContent =
      "Finalize uma nova contagem para ver quais itens sairam em relacao ao estoque anterior.";
    elements.comparisonBody.appendChild(empty);
    return;
  }

  const totalSaida = toNonNegativeInt(report.total_saida_caixas, 0);
  const itensComSaida = toNonNegativeInt(report.itens_com_saida, 0);
  const createdAt = formatDateTime(report.created_at);
  elements.comparisonMeta.textContent = `${formatNumber(totalSaida)} caixas sairam em ${itensComSaida} item(ns). Comparado em ${createdAt}.`;

  if (!report.items?.length) {
    const empty = document.createElement("p");
    empty.className = "msg success";
    empty.textContent = "Nenhuma saida encontrada na ultima comparacao.";
    elements.comparisonBody.appendChild(empty);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "table-wrap comparison-wrap";

  const table = document.createElement("table");
  table.className = "comparison-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Setor</th>
        <th>Produto</th>
        <th>Marca</th>
        <th>Tipo</th>
        <th>Antes</th>
        <th>Agora</th>
        <th>Saida</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  report.items.forEach((item) => {
    const tr = document.createElement("tr");
    const tipoLabel = formatTipoLabelValue(item.produto, item.tipo, item.marca);
    tr.innerHTML = `
      <td>${item.setor}</td>
      <td>${item.produto}</td>
      <td>${item.marca}</td>
      <td>${tipoLabel}</td>
      <td>${formatInventorySnapshot(
        item.previous_pallets,
        item.previous_caixas_avulsas,
        item.previous_total_caixas
      )}</td>
      <td>${formatInventorySnapshot(
        item.current_pallets,
        item.current_caixas_avulsas,
        item.current_total_caixas
      )}</td>
      <td class="comparison-loss">${formatNumber(item.saida_caixas)}</td>
    `;
    tbody.appendChild(tr);
  });

  wrap.appendChild(table);
  elements.comparisonBody.appendChild(wrap);
}

/*
  ===== Resumos matriciais =====
  Gera as tabelas-resumo por produto/marca/tipo usadas na visualizacao e na impressao.
*/

function formatSummaryValue(value, showZero = false) {
  if (value === null || value === undefined) return "";
  if (value === 0 && !showZero) return "";
  return value;
}

function buildSummaryGroups(rows) {
  const groups = new Map();
  (rows || []).forEach((row) => {
    if (!row) return;
    const normalizedRow = hydrateInventoryRow(row);
    const setor = normalizedRow.setor || "Sem setor";
    const produto = normalizedRow.produto || "Sem produto";
    const marca = normalizedRow.marca || "Sem marca";
    const tipo = Number.parseInt(normalizedRow.tipo, 10);
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

    const pallets = normalizedRow.pallets;
    const caixasPallet = normalizedRow.caixas_pallet;
    const caixasAvulsas = normalizedRow.caixas_avulsas;
    const totalCaixas = normalizedRow.total_caixas;

    group.brands.add(marca);
    group.tipos.add(tipo);

    if (!group.matrix.has(tipo)) {
      group.matrix.set(tipo, new Map());
    }
    const brandMap = group.matrix.get(tipo);
    const cell = brandMap.get(marca) || {
      pallets: 0,
      caixas_avulsas: 0,
      total_caixas: 0,
      caixas_pallet: null,
    };
    if (Number.isFinite(caixasPallet) && caixasPallet > 0) {
      cell.caixas_pallet = caixasPallet;
    }
    applyInventoryDeltas(cell, {
      caixas_pallet: caixasPallet,
      palletsDelta: pallets,
      caixasAvulsasDelta: caixasAvulsas,
    });
    brandMap.set(marca, cell);

    const total = group.totals.get(marca) || { total_caixas: 0 };
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
      thPallets.textContent = "P + Av";
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
      tipoCell.textContent = formatTipoLabelValue(group.produto, tipo);
      tipoCell.className = "cell-tipo";
      row.appendChild(tipoCell);
      group.brands.forEach((brand) => {
        const cell = group.matrix.get(tipo)?.get(brand);
        const caixasPallet = cell?.caixas_pallet ?? 0;
        const pallets = cell?.pallets || 0;
        const caixasAvulsas = cell?.caixas_avulsas || 0;
        const total = cell?.total_caixas || 0;
        const caixasCell = document.createElement("td");
        caixasCell.textContent = formatSummaryValue(caixasPallet);
        caixasCell.className = "cell-caixas";
        const palletsCell = document.createElement("td");
        palletsCell.textContent = formatInventoryStack(pallets, caixasAvulsas);
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

/*
  ===== Dashboard =====
  Construcao dos graficos de total do CD e da saida de caixas ao longo do tempo.
*/

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

function getLatestDate(rows) {
  let latest = null;
  (rows || []).forEach((row) => {
    const source = row?.updated_at || row?.created_at;
    if (!source) return;
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) return;
    if (!latest || date > latest) latest = date;
  });
  return latest;
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

function buildSnapshotEventSeries(rows, range, field) {
  const { dates, range: key } = buildRangeDates(range, rows);
  const values = new Array(dates.length).fill(0);
  const points = (rows || [])
    .map((row) => {
      const source = row?.created_at || row?.updated_at;
      const date = source ? new Date(source) : null;
      if (!date || Number.isNaN(date.getTime())) return null;
      return {
        date,
        value: Number(row?.[field]) || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  points.forEach((point) => {
    let bucketIndex = 0;
    for (let i = 0; i < dates.length; i += 1) {
      if (dates[i] <= point.date) {
        bucketIndex = i;
      } else {
        break;
      }
    }
    values[bucketIndex] = point.value;
  });

  return { dates, values, range: key };
}

function getDashboardLiveRows() {
  return getCurrentPublicAggregateRows();
}

function mergeLivePointIntoSeries(series, liveRows) {
  const normalizedRows = aggregateRows(liveRows || []);
  if (!normalizedRows.length) return series;
  const liveTotal = getTotalCaixas(normalizedRows);
  const values = [...(series?.values || [])];
  const dates = [...(series?.dates || [])];
  const liveDate = getLatestDate(normalizedRows) || new Date();

  if (!values.length) {
    return {
      dates: [liveDate],
      values: [liveTotal],
      range: normalizeRange(series?.range || state.dashboardRange),
    };
  }

  values[values.length - 1] = liveTotal;
  dates[dates.length - 1] = liveDate;

  return {
    ...series,
    dates,
    values,
  };
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
  const liveRows = getDashboardLiveRows();
  const useSnapshots = snapshotRows.length > 0;
  const sourceRows = useSnapshots ? snapshotRows : state.rawPublicRows || [];
  const totalBase = useSnapshots
    ? buildSnapshotSeries(sourceRows, range)
    : buildTimeSeries(sourceRows, range);
  const total = liveRows.length
    ? mergeLivePointIntoSeries(totalBase, liveRows)
    : totalBase;
  const outflow = useSnapshots
    ? buildSnapshotEventSeries(sourceRows, range, "outflow_caixas")
    : {
        dates: total.dates,
        values: buildOutflowSeries(total.values),
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
  loadComparisonReport();
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

/*
  ===== Tabelas principais =====
  Renderizam a tela publica de estoque e a tabela de contagem do usuario logado.
*/

function renderPublicTable() {
  if (!elements.publicTableBody || !elements.publicTotalGeral) return;
  elements.publicTableBody.innerHTML = "";
  let total = 0;
  const rows = state.publicRows.filter(matchesPublicFilters);
  for (const row of rows) {
    const normalizedRow = hydrateInventoryRow(row);
    const tipoLabel = formatTipoLabelValue(
      normalizedRow.produto,
      normalizedRow.tipo,
      normalizedRow.marca
    );
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${normalizedRow.produto}</td>
      <td>${normalizedRow.marca}</td>
      <td>${tipoLabel}</td>
      <td>${normalizedRow.caixas_pallet}</td>
      <td>${normalizedRow.pallets}</td>
      <td>${normalizedRow.caixas_avulsas || ""}</td>
      <td>${normalizedRow.total_caixas}</td>
    `;
    elements.publicTableBody.appendChild(tr);
    total += normalizedRow.total_caixas;
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
    const tipoText = formatTipoLabelValue(row.produto, row.tipo, row.marca);
    const haystack = normalizeText(
      `${row.setor} ${row.produto} ${row.marca} ${row.tipo} ${tipoText}`
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
    const normalizedRow = hydrateInventoryRow(row);
    const tipoLabel = formatTipoLabelValue(
      normalizedRow.produto,
      normalizedRow.tipo,
      normalizedRow.marca
    );
    const tr = document.createElement("tr");
    const rowKey = getRowKey(normalizedRow);
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
    const totalCaixas = normalizedRow.total_caixas;
    tr.innerHTML = `
      <td>${normalizedRow.produto}</td>
      <td>${normalizedRow.marca}</td>
      <td>${tipoLabel}</td>
      <td>${normalizedRow.caixas_pallet}</td>
      <td>${normalizedRow.pallets}</td>
      <td>${normalizedRow.caixas_avulsas || ""}</td>
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
  renderCountSyncStatus();
  if (state.countMode === "new") {
    scheduleCountDraftPersist();
  }
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
  caixasAvulsasDelta = 0,
}) {
  const found = state.publicRows.find(
    (row) =>
      row.setor === setor &&
      row.produto === produto &&
      row.marca === marca &&
      row.tipo === tipo
  );
  if (found) {
    applyInventoryDeltas(found, {
      caixas_pallet,
      palletsDelta,
      caixasAvulsasDelta,
    });
  } else {
    state.publicRows.push(hydrateInventoryRow({
      setor,
      produto,
      marca,
      tipo,
      caixas_pallet,
      pallets: palletsDelta,
      caixas_avulsas: caixasAvulsasDelta,
    }));
  }
}

function getTotalCaixas(rows) {
  return (rows || []).reduce((sum, row) => {
    const normalizedRow = hydrateInventoryRow(row);
    return sum + normalizedRow.total_caixas;
  }, 0);
}

/*
  ===== Supabase =====
  Toda leitura e escrita do banco foi centralizada aqui para facilitar manutencao.
*/

async function loadSnapshotRecords(options = {}) {
  const { showError = false } = options;
  const { data, error } = await supabaseClient
    .from(SNAPSHOT_TABLE)
    .select("*")
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

function isSnapshotOutflowSchemaError(error) {
  const message = error?.message || "";
  return /outflow_caixas/i.test(message);
}

async function saveSnapshotRecord({ rows, outflowCaixas = 0, showSuccess = true }) {
  if (!state.user) {
    pushMessage("warn", "Faca login para salvar o historico.");
    return false;
  }
  const normalizedRows = aggregateRows(rows || []);
  const total = getTotalCaixas(normalizedRows);
  const payload = {
    user_id: state.user.id,
    total_caixas: total,
  };
  if (outflowCaixas > 0) {
    payload.outflow_caixas = outflowCaixas;
  }

  const { error } = await supabaseClient.from(SNAPSHOT_TABLE).insert(payload);
  if (error) {
    const message = isSnapshotOutflowSchemaError(error)
      ? "Historico salvo sem saida. Rode a migracao do dashboard no Supabase."
      : `Erro ao salvar historico: ${error.message}`;
    pushMessage("error", message);
    return false;
  }
  if (showSuccess) {
    pushMessage("success", "Historico salvo com sucesso.");
  }
  await loadSnapshotRecords();
  return true;
}

async function saveSnapshotTotal() {
  let rows = state.userRows;
  if (!rows.length) {
    rows = state.publicRows;
  }
  return saveSnapshotRecord({
    rows,
    outflowCaixas: 0,
    showSuccess: true,
  });
}

async function loadPublicRecords() {
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("*");

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
    .select("*")
    .eq("user_id", state.user.id);

  if (error) {
    if (showError) {
      pushMessage("error", `Erro ao carregar itens do usuario: ${error.message}`);
    }
    return { data: null, error };
  }

  state.userRows = (data || []).map((row) => hydrateInventoryRow(row));
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
  caixasAvulsasDelta = 0,
}) {
  if (!state.user) return false;
  const { data: existing, error: selectError } = await supabaseClient
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", state.user.id)
    .eq("setor", setor)
    .eq("produto", produto)
    .eq("marca", marca)
    .eq("tipo", tipo)
    .maybeSingle();

  if (selectError) {
    pushMessage("error", `Erro ao consultar registro: ${selectError.message}`);
    return false;
  }

  if (existing) {
    const current = hydrateInventoryRow(existing);
    const updated = hydrateInventoryRow(current, {
      caixas_pallet: caixas_pallet ?? current.caixas_pallet,
      pallets: current.pallets + toNonNegativeInt(palletsDelta, 0),
      caixas_avulsas:
        current.caixas_avulsas + toNonNegativeInt(caixasAvulsasDelta, 0),
    });
    const payload = buildDbRowPayload(
      updated,
      false,
      Object.prototype.hasOwnProperty.call(existing || {}, "caixas_avulsas") ||
        updated.caixas_avulsas > 0 ||
        toNonNegativeInt(caixasAvulsasDelta, 0) > 0
    );
    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      const message = isLooseBoxesSchemaError(error)
        ? "Erro ao atualizar registro: rode a migracao de caixas avulsas no Supabase."
        : `Erro ao atualizar registro: ${error.message}`;
      pushMessage("error", message);
      return false;
    }
  } else {
    const newRow = hydrateInventoryRow({
      user_id: state.user.id,
      setor,
      produto,
      marca,
      tipo,
      caixas_pallet,
      pallets: palletsDelta,
      caixas_avulsas: caixasAvulsasDelta,
    });
    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .insert(buildDbRowPayload(newRow, true));

    if (error) {
      const message = isLooseBoxesSchemaError(error)
        ? "Erro ao salvar registro: rode a migracao de caixas avulsas no Supabase."
        : `Erro ao salvar registro: ${error.message}`;
      pushMessage("error", message);
      return false;
    }
  }
  return true;
}

/*
  ===== Parser e execucao dos comandos de voz =====
  Este bloco decide como um texto reconhecido vira contexto ou lancamento.
*/

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

function formatTipoCounts(tipoCounts, produto, marca = "") {
  return Array.from(tipoCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([tipo, count]) => {
      const tipoLabel = formatTipoLabelValue(produto, tipo, marca);
      return count > 1 ? `${tipoLabel}x${count}` : String(tipoLabel);
    })
    .join(", ");
}

async function registerInventoryChange({
  setor,
  produto,
  marca,
  tipo,
  caixasPallet,
  palletsDelta = 0,
  caixasAvulsasDelta = 0,
  successPrefix = "Registrado",
  successSubject = "",
  actionKind = "pallets",
  correctionMode = null,
}) {
  const sourceRows =
    state.countMode === "new" ? state.sessionRows : state.userRows;
  const currentRow = getInventoryRowByIdentity(sourceRows, {
    setor,
    produto,
    marca,
    tipo,
  });
  const { before, after } = buildInventoryPreview({
    currentRow,
    caixasPallet,
    palletsDelta,
    caixasAvulsasDelta,
  });
  const successMessage = buildInventoryResultMessage({
    successPrefix,
    successSubject,
    palletsDelta,
    caixasAvulsasDelta,
    before,
    after,
    isNewCount: state.countMode === "new",
  });

  if (state.countMode === "new") {
    updateSessionAggregateRecord({
      setor,
      produto,
      marca,
      tipo,
      caixas_pallet: caixasPallet,
      palletsDelta,
      caixasAvulsasDelta,
    });
    renderCountTable();
    pushMessage("success", successMessage);
    const launchRecord = buildLaunchRecord({
      items: [
        {
          setor,
          produto,
          marca,
          tipo,
          caixasPallet,
          palletsDelta,
          caixasAvulsasDelta,
        },
      ],
      correctionMode,
      actionKind,
      label: successSubject,
    });
    if (launchRecord) {
      setLastLaunch(launchRecord);
    }
    return launchRecord;
  }

  updateAggregateRecord({
    setor,
    produto,
    marca,
    tipo,
    caixas_pallet: caixasPallet,
    palletsDelta,
    caixasAvulsasDelta,
  });
  renderPublicTable();
  renderCountTable();
  pushMessage("success", successMessage);

  const saved = await upsertRecord({
    setor,
    produto,
    marca,
    tipo,
    caixas_pallet: caixasPallet,
    palletsDelta,
    caixasAvulsasDelta,
  });
  if (!saved) return null;
  await loadUserRecords();
  await loadPublicRecords();
  const launchRecord = buildLaunchRecord({
    items: [
      {
        setor,
        produto,
        marca,
        tipo,
        caixasPallet,
        palletsDelta,
        caixasAvulsasDelta,
      },
    ],
    correctionMode,
    actionKind,
    label: successSubject,
  });
  if (launchRecord) {
    setLastLaunch(launchRecord);
  }
  return launchRecord;
}

function beginVoiceCorrection() {
  if (!state.lastLaunch) {
    pushMessage("warn", "Nao ha ultimo lancamento para corrigir.");
    return false;
  }

  if (state.lastLaunch.mode !== state.countMode) {
    pushMessage(
      "warn",
      state.lastLaunch.mode === "new"
        ? "Volte para a nova contagem para corrigir esse ultimo lancamento."
        : "Volte para a contagem atual para corrigir esse ultimo lancamento."
    );
    return false;
  }

  if (
    !state.lastLaunch.correctionMode ||
    state.lastLaunch.correctionMode === "batch" ||
    state.lastLaunch.items.length !== 1
  ) {
    pushMessage("warn", getCorrectionPrompt(state.lastLaunch));
    return false;
  }

  state.pendingCorrection = {
    ...JSON.parse(JSON.stringify(state.lastLaunch)),
  };
  pushMessage("info", getCorrectionPrompt(state.pendingCorrection));
  return true;
}

async function handlePendingCorrection(rawText) {
  const correction = state.pendingCorrection;
  if (!correction?.items?.length) return false;

  const item = correction.items[0];
  const ignoredValues = [item.setor, item.produto, item.marca];
  const numericValues = extractCommandNumbers(rawText, [
    item.setor,
    item.produto,
    item.marca,
  ])
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  const specialTipos = extractSpecialTipoSequence(
    rawText,
    item.produto,
    ignoredValues
  );
  const setor = item.setor;
  const produto = item.produto;
  const marca = item.marca;
  const noTipo = isNoTipoContext(produto, marca);
  const regra = CONFIG_GERAL[setor]?.[produto]?.[marca];

  if (!regra) {
    pushMessage("error", "Nao encontrei a regra do ultimo lancamento para corrigir.");
    state.pendingCorrection = null;
    return true;
  }

  let nextParams = null;

  if (correction.correctionMode === "type") {
    const tipoCorrigido =
      specialTipos[0] ??
      numericValues.find((value) => isTipoValidForContext(produto, value));
    if (!Number.isFinite(tipoCorrigido)) {
      pushMessage(
        "warn",
        hasSpecialTipoVariants(produto)
          ? "Diga o tipo correto para corrigir o ultimo lancamento (ex: 6A ou 6B)."
          : "Diga o tipo correto para corrigir o ultimo lancamento."
      );
      return true;
    }

    const tipoLabel = formatTipoLabelValue(produto, tipoCorrigido, marca);
    nextParams = {
      setor,
      produto,
      marca,
      tipo: tipoCorrigido,
      caixasPallet: regra(tipoCorrigido),
      palletsDelta: item.palletsDelta || 1,
      caixasAvulsasDelta: item.caixasAvulsasDelta || 0,
      successPrefix: "Corrigido",
      successSubject: `${produto} ${marca} Tipo ${tipoLabel}`,
      actionKind:
        item.caixasAvulsasDelta > 0
          ? "boxes"
          : item.palletsDelta > 1
            ? "pallets"
            : "pallets",
      correctionMode:
        item.caixasAvulsasDelta > 0 || item.palletsDelta > 1
          ? "quantity"
          : "type",
    };
  } else if (correction.correctionMode === "quantity") {
    if (!numericValues.length) {
      pushMessage(
        "warn",
        correction.actionKind === "boxes"
          ? "Diga a quantidade correta de caixas avulsas."
          : "Diga a quantidade correta para substituir o ultimo lancamento."
      );
      return true;
    }

    const quantidade = numericValues[numericValues.length - 1];
    if (correction.actionKind === "boxes") {
      const tipoLabel = formatTipoLabelValue(produto, item.tipo, marca);
      nextParams = {
        setor,
        produto,
        marca,
        tipo: noTipo ? NO_TIPO_VALUE : item.tipo,
        caixasPallet: regra(noTipo ? NO_TIPO_VALUE : item.tipo),
        palletsDelta: 0,
        caixasAvulsasDelta: quantidade,
        successPrefix: "Corrigido",
        successSubject: noTipo
          ? `${produto} ${marca}`
          : `${produto} ${marca} Tipo ${tipoLabel}`,
        actionKind: "boxes",
        correctionMode: "quantity",
      };
    } else {
      const tipoLabel = formatTipoLabelValue(produto, item.tipo, marca);
      nextParams = {
        setor,
        produto,
        marca,
        tipo: noTipo ? NO_TIPO_VALUE : item.tipo,
        caixasPallet: regra(noTipo ? NO_TIPO_VALUE : item.tipo),
        palletsDelta: quantidade,
        caixasAvulsasDelta: 0,
        successPrefix: "Corrigido",
        successSubject: noTipo
          ? `${produto} ${marca}`
          : `${produto} ${marca} Tipo ${tipoLabel}`,
        actionKind: "pallets",
        correctionMode: quantidade > 1 || noTipo ? "quantity" : "type",
      };
    }
  }

  if (!nextParams) {
    pushMessage("warn", "Nao consegui entender a correcao do ultimo lancamento.");
    return true;
  }

  const reverted = await revertLaunchRecord(correction);
  if (!reverted) return true;

  state.pendingCorrection = null;
  state.setor = setor;
  state.produto = produto;
  state.marca = marca;
  state.tipo = nextParams.tipo;
  if (elements.setorSelect) {
    elements.setorSelect.value = setor;
  }
  renderContext();

  const corrected = await registerInventoryChange(nextParams);
  if (!corrected) {
    pushMessage(
      "warn",
      "O ultimo lancamento foi removido, mas a correcao nao foi aplicada. Repita o comando."
    );
  }
  return true;
}

/**
 * Interpreta o comando final da voz.
 * Ordem da leitura:
 * - comandos especiais (remover/corrigir);
 * - travas de contexto (setor/produto/marca);
 * - tipo e quantidade;
 * - gravacao do item no modo atual ou na nova contagem.
 */
async function processCommand(rawText) {
  const tokens = tokenizeText(rawText);
  if (!tokens.length) return;

  if (isRemoveCommand(rawText)) {
    state.pendingCorrection = null;
    await removeLastLaunchCommand();
    renderContext();
    return;
  }

  if (isCorrectCommand(rawText)) {
    beginVoiceCorrection();
    renderContext();
    return;
  }

  if (state.pendingCorrection) {
    const handled = await handlePendingCorrection(rawText);
    if (handled) {
      renderContext();
      return;
    }
  }

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
      pushMessage(
        "info",
        /\bKG\b/.test(normalizeText(brandFound)) && !isNoTipoProduct(state.produto)
          ? `Marca fixada: ${brandFound}. Agora diga o tipo.`
          : `Marca fixada: ${brandFound}`
      );
    }
  } else {
    const anyBrand = findExactMatch(tokens, buildAllBrandMap(products));
    if (anyBrand) {
      pushMessage("warn", "Diga o produto antes da marca.");
    }
  }

  const ignoredValues = [
    sectorFound,
    productFound,
    brandFound,
    state.setor,
    state.produto,
    state.marca,
  ];
  const numericValues = extractCommandNumbers(rawText, ignoredValues)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  const specialTipos = extractSpecialTipoSequence(
    rawText,
    state.produto,
    ignoredValues
  );
  const noTipo = isNoTipoContext(state.produto, state.marca);
  const addCommand = isAddCommand(rawText);
  const boxCommand = hasBoxKeyword(rawText);

  if (boxCommand && !numericValues.length) {
    pushMessage("warn", "Diga a quantidade de caixas.");
    renderContext();
    return;
  }

  if (boxCommand) {
    if (!state.produto || !state.marca) {
      pushMessage(
        "warn",
        "Diga primeiro o produto e a marca antes de adicionar caixas."
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

    let tipoParaAdicionar = noTipo ? NO_TIPO_VALUE : state.tipo;

    if (!noTipo && specialTipos.length) {
      tipoParaAdicionar = specialTipos[specialTipos.length - 1];
      state.tipo = tipoParaAdicionar;
    } else if (!noTipo && numericValues.length >= 2) {
      const candidateTipo = numericValues[0];
      if (isTipoValidForContext(state.produto, candidateTipo)) {
        tipoParaAdicionar = candidateTipo;
        state.tipo = candidateTipo;
      }
    }

    if (!noTipo && !Number.isFinite(tipoParaAdicionar)) {
      pushMessage(
        "warn",
        hasSpecialTipoVariants(state.produto)
          ? "Diga o tipo primeiro (ex: 6A ou 6B) para somar caixas avulsas."
          : "Diga o tipo primeiro (ex: REI 4) para somar caixas avulsas."
      );
      renderContext();
      return;
    }
    if (!noTipo && !isTipoValidForContext(state.produto, tipoParaAdicionar)) {
      pushMessage("warn", getTipoValidationMessage(state.produto));
      renderContext();
      return;
    }

    const caixasAvulsasDelta = numericValues[numericValues.length - 1];
    const caixasPallet = regra(tipoParaAdicionar);
    const tipoLabel = formatTipoLabelValue(
      state.produto,
      tipoParaAdicionar,
      state.marca
    );

    await registerInventoryChange({
      setor: state.setor,
      produto: state.produto,
      marca: state.marca,
      tipo: tipoParaAdicionar,
      caixasPallet,
      caixasAvulsasDelta,
      successPrefix: "Registrado",
      successSubject: noTipo
        ? `${state.produto} ${state.marca}`
        : `${state.produto} ${state.marca} Tipo ${tipoLabel}`,
      actionKind: "boxes",
      correctionMode: "quantity",
    });

    renderContext();
    return;
  }

  if (addCommand && !numericValues.length) {
    pushMessage("warn", "Diga a quantidade para adicionar.");
    renderContext();
    return;
  }

  if (addCommand && numericValues.length) {
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

    const quantity = numericValues[numericValues.length - 1];
    let tipoParaAdicionar = noTipo ? NO_TIPO_VALUE : state.tipo;

    if (!noTipo && specialTipos.length) {
      tipoParaAdicionar = specialTipos[specialTipos.length - 1];
      state.tipo = tipoParaAdicionar;
    } else if (!noTipo && numericValues.length >= 2) {
      const candidateTipo = numericValues[0];
      if (isTipoValidForContext(state.produto, candidateTipo)) {
        tipoParaAdicionar = candidateTipo;
        state.tipo = candidateTipo;
      }
    }

    if (!noTipo && !Number.isFinite(tipoParaAdicionar)) {
      pushMessage(
        "warn",
        hasSpecialTipoVariants(state.produto)
          ? "Diga o tipo primeiro (ex: 6A ou 6B) para usar 'adicionar'."
          : "Diga o tipo primeiro (ex: REI 4) para usar 'adicionar'."
      );
      renderContext();
      return;
    }
    if (!noTipo && !isTipoValidForContext(state.produto, tipoParaAdicionar)) {
      pushMessage("warn", getTipoValidationMessage(state.produto));
      renderContext();
      return;
    }

    const caixasPallet = regra(tipoParaAdicionar);
    const palletsDelta = quantity;
    const tipoLabel = formatTipoLabelValue(
      state.produto,
      tipoParaAdicionar,
      state.marca
    );

    await registerInventoryChange({
      setor: state.setor,
      produto: state.produto,
      marca: state.marca,
      tipo: tipoParaAdicionar,
      caixasPallet,
      palletsDelta,
      successPrefix: "Adicionado",
      successSubject: noTipo
        ? `${state.produto} ${state.marca}`
        : `${state.produto} ${state.marca} Tipo ${tipoLabel}`,
      actionKind: "pallets",
      correctionMode: "quantity",
    });

    renderContext();
    return;
  }

  if (noTipo && brandFound && !numericValues.length) {
    const regra = products[state.produto]?.[state.marca];
    if (!regra) {
      pushMessage(
        "error",
        `Essa marca '${state.marca}' nao tem regra para o produto '${state.produto}'.`
      );
      renderContext();
      return;
    }

    const caixasPallet = regra(NO_TIPO_VALUE);
    state.tipo = NO_TIPO_VALUE;

    await registerInventoryChange({
      setor: state.setor,
      produto: state.produto,
      marca: state.marca,
      tipo: NO_TIPO_VALUE,
      caixasPallet,
      palletsDelta: 1,
      successPrefix: "Registrado",
      successSubject: `${state.produto} ${state.marca}`,
      actionKind: "pallets",
      correctionMode: "quantity",
    });

    renderContext();
    return;
  }

  if (numericValues.length) {
    if (!state.produto || !state.marca) {
      pushMessage(
        "warn",
        "Diga primeiro o produto e a marca antes de informar o numero."
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

    if (noTipo) {
      const palletsTotal = numericValues.reduce((acc, value) => acc + value, 0);

      if (!palletsTotal) {
        renderContext();
        return;
      }

      const caixasPallet = regra(NO_TIPO_VALUE);
      state.tipo = NO_TIPO_VALUE;

      await registerInventoryChange({
        setor: state.setor,
        produto: state.produto,
        marca: state.marca,
        tipo: NO_TIPO_VALUE,
        caixasPallet,
        palletsDelta: palletsTotal,
        successPrefix: "Registrado",
        successSubject: `${state.produto} ${state.marca}`,
        actionKind: "pallets",
        correctionMode: "quantity",
      });

      renderContext();
      return;
    }

    const tiposValid = hasSpecialTipoVariants(state.produto)
      ? specialTipos
      : numericValues.filter((value) => isTipoValid(value));

    if (!tiposValid.length) {
      pushMessage("warn", getTipoValidationMessage(state.produto));
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

    const tipoLabel = formatTipoCounts(
      tipoCounts,
      state.produto,
      state.marca
    );
    const launchItems = Array.from(tipoCounts.entries()).map(([tipo, count]) => ({
      setor: state.setor,
      produto: state.produto,
      marca: state.marca,
      tipo,
      caixasPallet: regra(tipo),
      palletsDelta: count,
    }));
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
      const launchRecord = buildLaunchRecord({
        items: launchItems,
        correctionMode: launchItems.length === 1 && launchItems[0].palletsDelta === 1
          ? "type"
          : "batch",
        actionKind: launchItems.length === 1 ? "pallets" : "batch",
        label: `${state.produto} ${state.marca} Tipos ${tipoLabel}`,
      });
      if (launchRecord) {
        setLastLaunch(launchRecord);
      }
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
      const results = await Promise.all(upserts);
      if (results.some((result) => !result)) {
        renderContext();
        return;
      }
      await loadUserRecords();
      await loadPublicRecords();
      const launchRecord = buildLaunchRecord({
        items: launchItems,
        correctionMode: launchItems.length === 1 && launchItems[0].palletsDelta === 1
          ? "type"
          : "batch",
        actionKind: launchItems.length === 1 ? "pallets" : "batch",
        label: `${state.produto} ${state.marca} Tipos ${tipoLabel}`,
      });
      if (launchRecord) {
        setLastLaunch(launchRecord);
      }
    }
  }

  renderContext();
}

// Inicializa a Web Speech API e encaminha cada frase final para `processCommand`.
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

/*
  ===== Exportacao e impressao =====
  Compartilhado pelas tabelas de estoque publico e de contagem.
*/

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
    "Caixas Avulsas",
    "Total Caixas",
  ];
  const csv = [
    header.join(";"),
    ...rows.map((row) =>
      {
        const normalizedRow = hydrateInventoryRow(row);
        const tipoLabel = formatTipoLabelValue(
          normalizedRow.produto,
          normalizedRow.tipo,
          normalizedRow.marca
        );
        return [
          normalizedRow.setor,
          normalizedRow.produto,
          normalizedRow.marca,
          tipoLabel,
          normalizedRow.caixas_pallet,
          normalizedRow.pallets,
          normalizedRow.caixas_avulsas,
          normalizedRow.total_caixas,
        ].join(";");
      }
    ),
  ].join("\n");

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
  const clone = contentNode.cloneNode(true);
  clone
    .querySelectorAll(".actions, .table-modes, .view-toggle")
    .forEach((node) => node.remove());

  const isMobilePrint =
    (window.matchMedia && window.matchMedia("(max-width: 820px)").matches) ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const mobileStyles = isMobilePrint
    ? `
    @media print {
      body { font-size: 10px; }
      th, td { padding: 4px 5px; }
    }
  `
    : "";

  const styles = `
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: "Source Sans 3", Arial, sans-serif; padding: 0; margin: 0; color: #111827; }
    .print-root { width: 100%; max-width: 194mm; margin: 0 auto; }
    h1 { font-family: "Space Grotesk", sans-serif; font-size: 18px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #111827; padding: 5px 6px; text-align: center; }
    th:first-child, td:first-child { text-align: left; }
    th, td { word-break: break-word; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .summary-grid { display: block; }
    .summary-card {
      display: block;
      width: 100%;
      border: 1px solid #111827;
      padding: 6px;
      margin-bottom: 12px;
      break-inside: avoid;
      break-inside: avoid-page;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }
    .summary-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .summary-header h3 { margin: 0; font-size: 14px; }
    .table-wrap {
      overflow: visible;
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }
    table {
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }
    .table-footer, .table-modes, .view-toggle, .actions { display: none !important; }
    .print-actions { display: flex; gap: 8px; margin: 0 0 16px; }
    .print-actions button { padding: 8px 12px; border-radius: 10px; border: 1px solid #cbd5f5; background: #1d4ed8; color: #fff; cursor: pointer; }
    .print-actions button.secondary { background: #e2e8f0; color: #0f172a; border-color: #e2e8f0; }
    @media print {
      .print-actions { display: none !important; }
    }
    ${mobileStyles}
  `;

  const win = window.open("", "_blank");
  if (!win) {
    pushMessage("warn", "Popup bloqueado. Permita pop-ups para imprimir.");
    return;
  }

  win.document.open();
  win.document.write(
    `<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="print-actions">
          <button onclick="window.print()">Imprimir</button>
          <button class="secondary" onclick="window.close()">Fechar</button>
        </div>
        <div class="print-root">
          <h1>${title}</h1>
          ${clone.outerHTML}
        </div>
      </body>
    </html>`
  );
  win.document.close();
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

/*
  ===== Edicao, autenticacao visual e agregacao da sessao =====
  Aqui ficam o modal de edicao, a troca entre login/painel e a soma local da nova contagem.
*/

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
  caixasAvulsasDelta = 0,
}) {
  const found = state.sessionRows.find(
    (row) =>
      row.setor === setor &&
      row.produto === produto &&
      row.marca === marca &&
      row.tipo === tipo
  );
  if (found) {
    applyInventoryDeltas(found, {
      caixas_pallet,
      palletsDelta,
      caixasAvulsasDelta,
    });
  } else {
    state.sessionRows.push(hydrateInventoryRow({
      _localId: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      setor,
      produto,
      marca,
      tipo,
      caixas_pallet,
      pallets: palletsDelta,
      caixas_avulsas: caixasAvulsasDelta,
    }));
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
    elements.editTipo.value =
      row?.tipo === 0 || row?.tipo
        ? formatTipoLabelValue(row?.produto, row?.tipo, row?.marca)
        : "";
  }
  if (elements.editCaixas) {
    elements.editCaixas.value = row?.caixas_pallet ?? "";
  }
  if (elements.editPallets) {
    elements.editPallets.value = row?.pallets ?? 1;
  }
  if (elements.editLooseBoxes) {
    elements.editLooseBoxes.value = row?.caixas_avulsas ?? 0;
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
    const tipo = parseTipoInputValue(elements.editTipo.value, produto);
    const caixasPallet = Number.parseInt(elements.editCaixas.value, 10);
    const pallets = Number.parseInt(elements.editPallets.value, 10);
    const caixasAvulsas = toNonNegativeInt(elements.editLooseBoxes?.value, 0);
    const noTipo = isNoTipoContext(produto, marca);

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
      (!noTipo && !Number.isFinite(tipo))
    ) {
      setEditMessage(
        "error",
        "Preencha tipo, caixas/pallet e pallets com valores validos."
      );
      return;
    }
    if (pallets < 0 || caixasAvulsas < 0) {
      setEditMessage("error", "Pallets e caixas avulsas nao podem ser negativos.");
      return;
    }
    if (pallets === 0 && caixasAvulsas === 0) {
      setEditMessage("error", "Informe pallets ou caixas avulsas.");
      return;
    }
    if (!noTipo && !isTipoValidForContext(produto, tipo)) {
      setEditMessage("error", getTipoValidationMessage(produto));
      return;
    }

    const tipoFinal = noTipo ? NO_TIPO_VALUE : tipo;
    const normalizedMetrics = normalizeInventoryMetrics({
      caixasPallet,
      pallets,
      caixasAvulsas,
    });

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
      row.caixas_pallet = normalizedMetrics.caixas_pallet;
      row.pallets = normalizedMetrics.pallets;
      row.caixas_avulsas = normalizedMetrics.caixas_avulsas;
      row.total_caixas = normalizedMetrics.total_caixas;
      if (setor && state.setor !== setor) {
        state.setor = setor;
        if (elements.setorSelect) elements.setorSelect.value = setor;
        renderContext();
      }
      renderCountTable();
      state.selectedRowKey = null;
      clearVoiceActionState();
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
      caixas_pallet: normalizedMetrics.caixas_pallet,
      pallets: normalizedMetrics.pallets,
      total_caixas: normalizedMetrics.total_caixas,
    };
    if (normalizedMetrics.caixas_avulsas > 0) {
      payload.caixas_avulsas = normalizedMetrics.caixas_avulsas;
    }

    if (!state.editTarget?.rowKey) {
      setEditMessage("error", "Selecione um item para editar.");
      return;
    }
    const originalRow = findCurrentRowByKey(state.editTarget.rowKey);
    const hasLooseBoxesColumn =
      Object.prototype.hasOwnProperty.call(originalRow || {}, "caixas_avulsas") ||
      normalizedMetrics.caixas_avulsas > 0;
    const updateResult = await withTimeout(
      supabaseClient
        .from(TABLE_NAME)
        .update({
          ...payload,
          ...(hasLooseBoxesColumn
            ? { caixas_avulsas: normalizedMetrics.caixas_avulsas }
            : {}),
        })
        .eq("id", state.editTarget.rowKey)
        .eq("user_id", state.user.id),
      SUPABASE_TIMEOUT_MS,
      "Tempo limite ao atualizar item."
    );
    if (updateResult?.error) {
      const message = isLooseBoxesSchemaError(updateResult.error)
        ? "Erro ao atualizar item: rode a migracao de caixas avulsas no Supabase."
        : `Erro ao atualizar item: ${updateResult.error.message}`;
      setEditMessage("error", message);
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
    clearVoiceActionState();
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
  const tipoLabel = formatTipoLabelValue(row?.produto, row?.tipo, row?.marca);
  const confirmDelete = window.confirm(
    isNoTipoContext(row?.produto, row?.marca)
      ? `Remover o item ${row.produto} ${row.marca}?`
      : `Remover o item ${row.produto} ${row.marca} Tipo ${tipoLabel}?`
  );
  if (!confirmDelete) return;

  if (state.countMode === "new") {
    state.sessionRows = state.sessionRows.filter(
      (item) => getRowKey(item) !== rowKey
    );
    clearVoiceActionState();
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
  clearVoiceActionState();
  await loadUserRecords();
  await loadPublicRecords();
}

function hideCountPanels() {
  if (elements.countPanel) elements.countPanel.classList.add("hidden");
}

function hideAuthPanel() {
  if (elements.authPanel) elements.authPanel.classList.add("hidden");
}

/*
  ===== Modo de contagem =====
  Controla a diferenca entre "estoque atual" e "nova contagem" com rascunho offline.
*/

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
  state.selectedRowKey = null;
  clearVoiceActionState();
  if (mode === "new") {
    if (hasCountDraftData()) {
      state.countMode = "new";
      pushMessage("info", "Rascunho da nova contagem retomado.");
    } else {
      const confirmed = window.confirm(
        "Iniciar nova contagem? A contagem atual so sera substituida quando voce salvar."
      );
      if (!confirmed) return;
      state.countMode = "new";
      state.sessionRows = [];
      state.previousCountRows = cloneInventoryRows(state.userRows);
      state.previousPublicRows = getCurrentPublicAggregateRows();
      pushMessage(
        "info",
        "Nova contagem iniciada. O estoque anterior ficou guardado temporariamente para comparacao no final."
      );
    }
  } else {
    if (hasCountDraftData()) {
      const confirmed = window.confirm(
        "Voltar para o estoque atual? O rascunho da nova contagem ficara salvo neste aparelho para voce retomar depois."
      );
      if (!confirmed) return;
      saveCountDraftLocally();
      pushMessage("info", "Rascunho da nova contagem mantido neste aparelho.");
    }
    state.countMode = "current";
  }
  updateCountModeUI();
  renderContext();
  renderCountTable();
}

/**
 * Finaliza a nova contagem:
 * - substitui os registros antigos do usuario;
 * - salva snapshot do dashboard;
 * - registra a comparacao detalhada da ultima contagem.
 */
async function saveNewCount() {
  if (!state.user) {
    pushMessage("warn", "Faça login para salvar a nova contagem.");
    return;
  }
  if (!state.sessionRows.length) {
    pushMessage("warn", "Nenhum item na nova contagem para salvar.");
    return;
  }
  if (!navigator.onLine) {
    saveCountDraftLocally();
    pushMessage(
      "warn",
      "Sem internet. A nova contagem continua salva neste aparelho. Conecte-se e tente sincronizar novamente."
    );
    return;
  }
  const previousRows = state.previousCountRows.length
    ? cloneInventoryRows(state.previousCountRows)
    : cloneInventoryRows(state.userRows);
  const currentRows = cloneInventoryRows(state.sessionRows);
  const previousPublicRows = state.previousPublicRows.length
    ? cloneInventoryRows(state.previousPublicRows)
    : getCurrentPublicAggregateRows();
  const comparisonPreviousRows = previousPublicRows.length
    ? previousPublicRows
    : previousRows;
  const confirmed = window.confirm(
    "Salvar nova contagem? Isso vai apagar a contagem antiga e substituir pela nova."
  );
  if (!confirmed) return;

  try {
    const deleteResult = await withTimeout(
      supabaseClient.from(TABLE_NAME).delete().eq("user_id", state.user.id),
      SUPABASE_TIMEOUT_MS,
      "Tempo limite ao sincronizar a nova contagem."
    );
    const deleteError = deleteResult?.error;
    if (deleteError) {
      pushMessage(
        "error",
        `Erro ao apagar contagem antiga: ${deleteError.message}. O rascunho offline foi mantido neste aparelho.`
      );
      saveCountDraftLocally();
      return;
    }

    const payload = currentRows.map((row) =>
      buildDbRowPayload(
        {
          ...row,
          user_id: state.user.id,
        },
        true,
        row.caixas_avulsas > 0
      )
    );

    const insertResult = await withTimeout(
      supabaseClient.from(TABLE_NAME).insert(payload),
      SUPABASE_TIMEOUT_MS,
      "Tempo limite ao enviar a nova contagem."
    );
    const insertError = insertResult?.error;
    if (insertError) {
      const message = isLooseBoxesSchemaError(insertError)
        ? "Erro ao salvar nova contagem: rode a migracao de caixas avulsas no Supabase. O rascunho offline foi mantido neste aparelho."
        : `Erro ao salvar nova contagem: ${insertError.message}. O rascunho offline foi mantido neste aparelho.`;
      pushMessage("error", message);
      saveCountDraftLocally();
      return;
    }

    const currentPublicRows = buildPublicRowsAfterUserReplacement(
      comparisonPreviousRows,
      previousRows,
      currentRows
    );
    const comparisonReport = buildComparisonReport(
      comparisonPreviousRows,
      currentPublicRows.length ? currentPublicRows : currentRows
    );
    saveComparisonReport(comparisonReport);
    const outflowCaixas = calculateOutflowCaixas(
      comparisonPreviousRows,
      currentPublicRows.length ? currentPublicRows : currentRows
    );
    const snapshotSaved = await saveSnapshotRecord({
      rows: currentPublicRows.length ? currentPublicRows : currentRows,
      outflowCaixas,
      showSuccess: false,
    });

    state.sessionRows = [];
    state.previousCountRows = [];
    state.previousPublicRows = [];
    state.countMode = "current";
    clearVoiceActionState();
    clearCountDraft();
    updateCountModeUI();
    renderContext();
    await loadUserRecords();
    await loadPublicRecords();
    pushMessage(
      snapshotSaved ? "success" : "warn",
      snapshotSaved
        ? "Nova contagem salva. Visao geral atualizada com total e saida."
        : "Nova contagem salva, mas o historico da visao geral nao foi atualizado."
    );
  } catch (error) {
    pushMessage(
      "error",
      `${error?.message || "Erro ao sincronizar a nova contagem."} O rascunho offline foi mantido neste aparelho.`
    );
    saveCountDraftLocally();
  }
}

function discardNewCount() {
  const confirmed = window.confirm(
    "Descartar a nova contagem? Os dados não salvos serão perdidos."
  );
  if (!confirmed) return;
  state.sessionRows = [];
  state.previousCountRows = [];
  state.previousPublicRows = [];
  state.countMode = "current";
  clearVoiceActionState();
  clearCountDraft();
  updateCountModeUI();
  renderContext();
  renderCountTable();
  pushMessage("info", "Nova contagem descartada.");
}

/*
  ===== Formulario manual, selects dependentes e filtros =====
  Este bloco controla os campos em cascata (setor > produto > marca > tipo).
*/

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
  if (!elements.manualTipo || !elements.manualProduto || !elements.manualMarca) return;
  const produto = elements.manualProduto.value;
  const marca = elements.manualMarca.value;
  const currentTipoValue = elements.manualTipo.value;
  if (isNoTipoContext(produto, marca)) {
    elements.manualTipo.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "S/T";
    elements.manualTipo.appendChild(option);
    elements.manualTipo.disabled = true;
    updateManualBoxesOptions();
    return;
  }
  elements.manualTipo.disabled = false;
  if (hasSpecialTipoVariants(produto)) {
    elements.manualTipo.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Selecione";
    elements.manualTipo.appendChild(empty);
    getSpecialTipoVariants(produto).forEach((variant) => {
      const option = document.createElement("option");
      option.value = String(variant.value);
      option.textContent = variant.label;
      elements.manualTipo.appendChild(option);
    });
    if (
      currentTipoValue &&
      elements.manualTipo.querySelector(`option[value="${currentTipoValue}"]`)
    ) {
      elements.manualTipo.value = currentTipoValue;
    } else {
      elements.manualTipo.value = "";
    }
    updateManualBoxesOptions();
    return;
  }
  setNumberOptions(
    elements.manualTipo,
    TIPO_MIN,
    TIPO_MAX,
    currentTipoValue,
    "Selecione"
  );
  updateManualBoxesOptions();
}

function getManualCaixasPallet() {
  const setor = elements.manualSetor?.value;
  const produto = elements.manualProduto?.value;
  const marca = elements.manualMarca?.value;
  if (!setor || !produto || !marca) return 0;
  const regra = CONFIG_GERAL[setor]?.[produto]?.[marca];
  if (!regra) return 0;
  const noTipo = isNoTipoContext(produto, marca);
  const tipo = noTipo
    ? NO_TIPO_VALUE
    : parseTipoInputValue(elements.manualTipo?.value, produto);
  if (!noTipo && !isTipoValidForContext(produto, tipo)) return 0;
  return toNonNegativeInt(regra(tipo), 0);
}

function updateManualBoxesOptions() {
  if (!elements.manualBoxes) return;
  const caixasPallet = getManualCaixasPallet();
  elements.manualBoxes.min = "0";
  elements.manualBoxes.step = "1";
  elements.manualBoxes.placeholder = "0";
  elements.manualBoxes.title = caixasPallet
    ? `${caixasPallet} caixas fecham 1 pallet.`
    : "Digite a quantidade de caixas avulsas.";
  if (elements.manualBoxes.value === "") {
    elements.manualBoxes.value = "0";
  }
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
    !elements.manualPallets ||
    !elements.manualBoxes
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
  setNumberOptions(elements.manualPallets, 0, 50, 0);
  updateManualBoxesOptions();
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
  updateManualBoxesOptions();
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
  const tipoInput = parseTipoInputValue(elements.manualTipo.value, produto);
  const pallets = toNonNegativeInt(elements.manualPallets?.value, 0);
  const caixasAvulsas = toNonNegativeInt(elements.manualBoxes?.value, 0);
  const noTipo = isNoTipoContext(produto, marca);

  if (!setor || !produto || !marca) {
    pushMessage("warn", "Preencha setor, produto e marca.");
    return;
  }

  if (!noTipo && !Number.isFinite(tipoInput)) {
    pushMessage("warn", "Informe o tipo.");
    return;
  }
  if (!noTipo && !isTipoValidForContext(produto, tipoInput)) {
    pushMessage("warn", getTipoValidationMessage(produto));
    return;
  }

  if (pallets <= 0 && caixasAvulsas <= 0) {
    pushMessage("warn", "Informe pallets ou caixas avulsas.");
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
  const tipoLabel = formatTipoLabelValue(produto, tipo, marca);

  state.setor = setor;
  state.produto = produto;
  state.marca = marca;
  if (elements.setorSelect) {
    elements.setorSelect.value = setor;
  }
  renderContext();

  await registerInventoryChange({
    setor,
    produto,
    marca,
    tipo,
    caixasPallet,
    palletsDelta,
    caixasAvulsasDelta: caixasAvulsas,
    successPrefix: "Registrado",
    successSubject: noTipo
      ? `${produto} ${marca}`
      : `${produto} ${marca} Tipo ${tipoLabel}`,
    actionKind: caixasAvulsas > 0 ? "boxes" : "pallets",
    correctionMode:
      caixasAvulsas > 0 || pallets > 1 || noTipo ? "quantity" : "type",
  });

  if (elements.manualPallets) {
    elements.manualPallets.value = "0";
  }
  if (elements.manualBoxes) {
    elements.manualBoxes.value = "0";
  }
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

/*
  ===== Eventos e bootstrap =====
  Conecta o DOM com as funcoes acima e inicializa a aplicacao no final do arquivo.
*/

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

  if (elements.manualMarca) {
    elements.manualMarca.addEventListener("change", () => {
      updateManualBoxesOptions();
    });
  }

  if (elements.manualTipo) {
    elements.manualTipo.addEventListener("change", () => {
      updateManualBoxesOptions();
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
          "Deseja limpar a nova contagem inteira? Isso vai zerar todos os setores que voce ja contou."
        );
        if (!confirmClear) return;
        state.sessionRows = [];
        state.selectedRowKey = null;
        clearVoiceActionState();
        saveCountDraftLocally();
        renderCountTable();
        pushMessage("success", "Nova contagem limpa em todos os setores.");
        return;
      }

      if (!state.user) return;
      const confirmClear = window.confirm(
        "Deseja iniciar uma nova contagem do zero para todos os setores?"
      );
      if (!confirmClear) return;

      const shouldSave = window.confirm(
        "Salvar o total atual no historico antes de iniciar a nova contagem?\nOK = salvar e iniciar\nCancelar = iniciar sem salvar"
      );
      if (shouldSave) {
        const saved = await saveSnapshotRecord({
          rows: aggregateRows(
            cloneInventoryRows(state.rawPublicRows?.length ? state.rawPublicRows : state.userRows)
          ),
          outflowCaixas: 0,
          showSuccess: false,
        });
        if (!saved) {
          const proceed = window.confirm(
            "Falha ao salvar o historico. Deseja iniciar a nova contagem mesmo assim?"
          );
          if (!proceed) return;
        }
      }
      state.previousCountRows = cloneInventoryRows(state.userRows);
      state.previousPublicRows = getCurrentPublicAggregateRows();
      state.sessionRows = [];
      state.selectedRowKey = null;
      state.countMode = "new";
      clearVoiceActionState();
      saveCountDraftLocally();
      updateCountModeUI();
      renderContext();
      renderCountTable();
      pushMessage(
        "success",
        shouldSave
          ? "Nova contagem iniciada do zero. Estoque anterior salvo e guardado temporariamente para comparacao."
          : "Nova contagem iniciada do zero. Estoque anterior guardado temporariamente para comparacao."
      );
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeExportSheet("public");
      closeExportSheet("count");
    }
  });

  window.addEventListener("online", () => {
    renderCountSyncStatus();
  });

  window.addEventListener("offline", () => {
    renderCountSyncStatus();
  });

  window.addEventListener("pagehide", () => {
    if (state.countMode === "new") {
      saveCountDraftLocally();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.countMode === "new") {
      saveCountDraftLocally();
    }
  });

  if (elements.saveNewCountBtn) {
    elements.saveNewCountBtn.addEventListener("click", saveNewCount);
  }

  if (elements.discardNewCountBtn) {
    elements.discardNewCountBtn.addEventListener("click", discardNewCount);
  }
}

// Sincroniza estado de login da interface com a sessao atual do Supabase.
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
      restoreCountDraftForCurrentUser();
      renderCountSyncStatus();
    } else {
      hideAuthPanel();
      hideCountPanels();
    }
  } else {
    state.previousCountRows = [];
    state.previousPublicRows = [];
    clearVoiceActionState();
    if (event === "SIGNED_OUT") {
      clearLoginTimestamp();
    }
    if (elements.menuUser) elements.menuUser.classList.add("hidden");
    if (elements.menuLogout) elements.menuLogout.classList.add("hidden");
    if (PAGE_MODE === "edit") {
      showAuthPanel();
      hideCountPanels();
      state.userRows = [];
      state.countMode = "current";
      state.countDraftSavedAt = null;
      state.countDraftHash = "";
      renderCountTable();
      renderCountSyncStatus();
    } else {
      hideAuthPanel();
      hideCountPanels();
    }
  }
}

// Ponto de entrada da autenticacao: observa mudancas de sessao e carrega a sessao atual.
function setupAuth() {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    handleAuthState(event, session);
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    handleAuthState("INITIAL_SESSION", data?.session ?? null);
  });
}

// Inicializa os selects base de setor usados no contexto e no modal de edicao.
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
// Bootstrap final: monta selects, listeners, autenticacao e carrega os dados iniciais.
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

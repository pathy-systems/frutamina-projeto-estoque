// Comparacao de saida entre a contagem anterior e a atual.
// Feature dormente hoje: nenhuma pagina tem os elementos comparison-meta/comparison-body
// no HTML, entao renderComparisonReport() e um no-op. Modulo migrado mas nao conectado
// em nenhum entry point (ver plano de migracao).
import { state, elements, PAGE_MODE } from "./state.js";
import { LAST_COMPARISON_KEY } from "./config.js";
import {
  toNonNegativeInt,
  formatTipoLabelValue,
  getTipoSortOrder,
  formatNumber,
} from "./utils.js";
import {
  aggregateRows,
  hydrateInventoryRow,
  buildInventoryIdentityKey,
  buildInventoryTotalsMap,
  formatInventoryStack,
} from "./inventory-core.js";
import { formatDateTime } from "./tables.js";

export function calculateOutflowCaixas(previousRows, currentRows) {
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
 * Reconéri o estoque público "após salvar" sem depender de uma nova leitura do servidor.
 * Isso evita perder a comparação caso o usuário troque de página logo depois de salvar.
 */
export function buildPublicRowsAfterUserReplacement(
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
 * Monta a comparação detalhada entre a contagem anterior e a atual.
 * O foco é listar apenas os itens que perderam caixas (saída > 0).
 */
export function buildComparisonReport(previousRows, currentRows) {
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
    return getTipoSortOrder(a.produto, a.tipo) - getTipoSortOrder(b.produto, b.tipo);
  });

  const totalSaida = items.reduce((sum, item) => sum + item.saida_caixas, 0);

  return {
    created_at: new Date().toISOString(),
    total_saida_caixas: totalSaida,
    itens_com_saida: items.length,
    items,
  };
}

export function saveComparisonReport(report) {
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

export function loadComparisonReport() {
  try {
    const raw = localStorage.getItem(LAST_COMPARISON_KEY);
    state.lastComparisonReport = raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Nao foi possivel carregar o relatorio de saida.", error);
    state.lastComparisonReport = null;
  }
  renderComparisonReport();
}

export function formatInventorySnapshot(pallets, caixasAvulsas, totalCaixas) {
  const stack = formatInventoryStack(pallets, caixasAvulsas);
  if (stack) {
    return `${stack} (${formatNumber(totalCaixas)})`;
  }
  return formatNumber(totalCaixas);
}

export function renderComparisonReport() {
  if (PAGE_MODE !== "dashboard") return;
  if (!elements.comparisonBody || !elements.comparisonMeta) return;

  const report = state.lastComparisonReport;
  elements.comparisonBody.innerHTML = "";

  if (!report) {
    elements.comparisonMeta.textContent = "Ainda não existe comparação salva.";
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
    empty.textContent = "Nenhuma saída encontrada na última comparação.";
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

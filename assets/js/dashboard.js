// Graficos de total do CD e saida de caixas, e o overview da Visao Geral.
import { state, elements, PAGE_MODE } from "./state.js";
import { toNonNegativeInt, formatNumber, formatPercent, formatTipoLabelValue } from "./utils.js";
import { aggregateRows, hydrateInventoryRow, getCurrentPublicAggregateRows } from "./inventory-core.js";
import { getTotalCaixas, formatUserLabel, formatDateTime } from "./tables.js";

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

const DASHBOARD_OVERVIEW_COLORS = [
  "#2ee981",
  "#4ea8ff",
  "#fbb034",
  "#a97cff",
  "#22d3ee",
  "#f87171",
  "#34d399",
  "#60a5fa",
];

function getDashboardMinimumStock(row) {
  const caixasPallet = toNonNegativeInt(row?.caixas_pallet, 0);
  if (!caixasPallet) return 20;
  return Math.max(20, Math.round(caixasPallet * 0.45));
}

function getDashboardSnapshotHistory() {
  const snapshotsAsc = (state.snapshotRows || [])
    .map((row) => {
      const dateValue = row?.created_at || row?.updated_at;
      const date = dateValue ? new Date(dateValue) : null;
      if (!date || Number.isNaN(date.getTime())) return null;
      return {
        date,
        total: toNonNegativeInt(row?.total_caixas, 0),
        outflow: toNonNegativeInt(row?.outflow_caixas, 0),
        userId: row?.user_id || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  const entries = snapshotsAsc.map((entry, index) => {
    const previous = snapshotsAsc[index - 1] || null;
    const delta = previous ? entry.total - previous.total : 0;
    const eventBase =
      entry.outflow > 0
        ? `Contagem completa · saída ${formatNumber(entry.outflow)} cx`
        : "Snapshot de estoque";
    return {
      when: entry.date,
      operator: formatUserLabel(entry.userId),
      event: `${eventBase} · ${formatNumber(entry.total)} cx`,
      total: entry.total,
      delta,
    };
  });

  return entries.reverse();
}

function buildDashboardOverviewData() {
  const rows = (state.publicRows || []).map((row) => hydrateInventoryRow(row));
  const totalCaixas = rows.reduce((sum, row) => sum + toNonNegativeInt(row.total_caixas, 0), 0);
  const totalPallets = rows.reduce((sum, row) => sum + toNonNegativeInt(row.pallets, 0), 0);

  const setorMap = new Map();
  const produtoMap = new Map();
  const marcaMap = new Map();
  const lowStockMap = new Map();

  rows.forEach((row) => {
    const setor = row.setor || "Sem setor";
    const produto = row.produto || "Sem produto";
    const marca = row.marca || "Sem marca";
    const totalRow = toNonNegativeInt(row.total_caixas, 0);
    const palletsRow = toNonNegativeInt(row.pallets, 0);

    setorMap.set(setor, (setorMap.get(setor) || 0) + totalRow);

    const productKey = `${produto}|||${marca}`;
    const productCurrent = produtoMap.get(productKey) || {
      produto,
      marca,
      totalCaixas: 0,
      pallets: 0,
      setores: new Set(),
    };
    productCurrent.totalCaixas += totalRow;
    productCurrent.pallets += palletsRow;
    productCurrent.setores.add(setor);
    produtoMap.set(productKey, productCurrent);

    const marcaCurrent = marcaMap.get(marca) || {
      marca,
      totalCaixas: 0,
      pallets: 0,
      produtos: new Set(),
    };
    marcaCurrent.totalCaixas += totalRow;
    marcaCurrent.pallets += palletsRow;
    marcaCurrent.produtos.add(produto);
    marcaMap.set(marca, marcaCurrent);

    // Chave por setor+produto+marca+tipo (mesma identidade de uma linha de
    // estoque usada no resto do app) para nao mascarar a falta de um tipo/
    // setor especifico atras do estoque saudavel de outro.
    const lowKey = `${setor}|||${produto}|||${marca}|||${row.tipo}`;
    const lowCurrent = lowStockMap.get(lowKey) || {
      setor,
      produto,
      marca,
      tipo: row.tipo,
      totalCaixas: 0,
      minimo: 0,
    };
    lowCurrent.totalCaixas += totalRow;
    lowCurrent.minimo += getDashboardMinimumStock(row);
    lowStockMap.set(lowKey, lowCurrent);
  });

  const setores = Array.from(setorMap.entries())
    .map(([setor, total]) => ({ setor, total }))
    .sort((a, b) => b.total - a.total);

  const produtos = Array.from(produtoMap.values())
    .map((item) => ({
      ...item,
      setorCount: item.setores.size,
    }))
    .sort((a, b) => b.totalCaixas - a.totalCaixas);

  const marcas = Array.from(marcaMap.values())
    .map((item) => ({
      marca: item.marca,
      totalCaixas: item.totalCaixas,
      pallets: item.pallets,
      produtos: item.produtos.size,
    }))
    .sort((a, b) => b.totalCaixas - a.totalCaixas);

  const lowStockItems = Array.from(lowStockMap.values())
    .map((item) => {
      const minimo = Math.max(1, toNonNegativeInt(item.minimo, 0));
      const ratio = item.totalCaixas / minimo;
      const isCritical = item.totalCaixas < minimo;
      const isWarning = !isCritical && item.totalCaixas < minimo * 1.25;
      return {
        ...item,
        minimo,
        ratio,
        isCritical,
        isWarning,
      };
    })
    .sort((a, b) => a.ratio - b.ratio);

  const lowCritical = lowStockItems.filter((item) => item.isCritical);
  const lowWarning = lowStockItems.filter((item) => item.isWarning);
  const lowCount = lowCritical.length + lowWarning.length;

  const history = getDashboardSnapshotHistory();
  const latestSnapshot = history[0];
  const previousSnapshot = history[1];

  let totalCaixasMeta = "Sem base comparativa ainda.";
  if (latestSnapshot && previousSnapshot) {
    const diff = latestSnapshot.delta;
    const sign = diff >= 0 ? "+" : "-";
    const prevTotal = toNonNegativeInt(previousSnapshot.total, 0);
    const pct =
      previousSnapshot && prevTotal > 0
        ? (Math.abs(diff) / prevTotal) * 100
        : null;
    const pctText = Number.isFinite(pct) ? ` (${formatPercent(pct)}%)` : "";
    totalCaixasMeta = `${sign}${formatNumber(Math.abs(diff))} cx${pctText} vs. contagem anterior`;
  }

  const setorLabel = setores.length === 1 ? "setor" : "setores";
  const marcaLabel = marcas.length === 1 ? "marca" : "marcas";
  const lowLabel = lowCount === 1 ? "item" : "itens";

  return {
    totalCaixas,
    totalPallets,
    produtosDistintos: produtos.length,
    marcasDistintas: marcas.length,
    setores,
    produtos,
    marcas,
    lowStockItems,
    lowCritical,
    lowWarning,
    lowCount,
    history,
    totalCaixasMeta,
    palletsMeta: `${setores.length} ${setorLabel} com pallets ativos`,
    produtosMeta: `${marcas.length} ${marcaLabel} cadastradas`,
    lowMeta:
      lowCount > 0
        ? `${lowCount} ${lowLabel} abaixo/próximo do mínimo`
        : "Nenhum item abaixo do mínimo recomendado",
  };
}

function renderDashboardSetorBars(setores) {
  if (!elements.ovSetorBars) return;
  elements.ovSetorBars.innerHTML = "";

  if (!setores.length) {
    const empty = document.createElement("p");
    empty.className = "overview-empty";
    empty.textContent = "Sem dados de setor no momento.";
    elements.ovSetorBars.appendChild(empty);
    return;
  }

  const maxValue = Math.max(...setores.map((item) => item.total), 1);
  setores.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "overview-bar-row";

    const label = document.createElement("span");
    label.className = "overview-bar-label";
    label.textContent = item.setor;

    const track = document.createElement("div");
    track.className = "overview-bar-track";

    const fill = document.createElement("div");
    fill.className = "overview-bar-fill";
    fill.style.width = `${Math.max(6, (item.total / maxValue) * 100)}%`;
    fill.style.setProperty(
      "--bar-color",
      DASHBOARD_OVERVIEW_COLORS[index % DASHBOARD_OVERVIEW_COLORS.length]
    );

    const value = document.createElement("span");
    value.className = "overview-bar-value";
    value.textContent = formatNumber(item.total);

    fill.appendChild(value);
    track.appendChild(fill);
    row.append(label, track);
    elements.ovSetorBars.appendChild(row);
  });
}

function renderDashboardTopProducts(produtos) {
  if (!elements.ovTopProdutosList) return;
  elements.ovTopProdutosList.innerHTML = "";

  const topList = produtos.slice(0, 7);
  if (!topList.length) {
    const empty = document.createElement("p");
    empty.className = "overview-empty";
    empty.textContent = "Sem produtos para exibir.";
    elements.ovTopProdutosList.appendChild(empty);
    return;
  }

  topList.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "overview-top-item";

    const rank = document.createElement("span");
    rank.className = "overview-rank";
    rank.textContent = `#${index + 1}`;

    const details = document.createElement("div");
    details.className = "overview-top-details";

    const name = document.createElement("strong");
    name.textContent = item.produto;

    const brand = document.createElement("span");
    brand.textContent = item.marca;

    details.append(name, brand);

    const total = document.createElement("strong");
    total.className = "overview-top-total";
    total.textContent = `${formatNumber(item.totalCaixas)} cx`;

    row.append(rank, details, total);
    elements.ovTopProdutosList.appendChild(row);
  });
}

function formatLowStockTitle(item) {
  const tipoLabel = formatTipoLabelValue(item.produto, item.tipo, item.marca);
  const tipoSuffix = tipoLabel === "S/T" ? "" : ` · Tipo ${tipoLabel}`;
  return `${item.produto} — ${item.marca} (${item.setor}${tipoSuffix})`;
}

function renderDashboardAlerts(data) {
  if (!elements.ovAlertList) return;
  elements.ovAlertList.innerHTML = "";

  const alerts = [];
  data.lowCritical.slice(0, 2).forEach((item) => {
    alerts.push({
      tone: "critical",
      title: formatLowStockTitle(item),
      text: `Estoque em ${formatNumber(item.totalCaixas)} cx — abaixo do mínimo (${formatNumber(
        item.minimo
      )} cx).`,
    });
  });

  data.lowWarning.slice(0, 2).forEach((item) => {
    alerts.push({
      tone: "warning",
      title: formatLowStockTitle(item),
      text: `Estoque em ${formatNumber(item.totalCaixas)} cx — próximo ao mínimo (${formatNumber(
        item.minimo
      )} cx). Monitorar reposição.`,
    });
  });

  if (!alerts.length && data.produtos[0]) {
    const leader = data.produtos[0];
    alerts.push({
      tone: "success",
      title: `${leader.produto} — ${leader.marca}`,
      text: `Estoque saudável (${formatNumber(
        leader.totalCaixas
      )} cx). Nenhuma ação necessária.`,
    });
  }

  alerts.push({
    tone: "success",
    title: "Demais produtos",
    text:
      data.lowCount > 0
        ? "Acompanhar conforme próximos ajustes de contagem."
        : "Dentro dos parâmetros normais de estoque.",
  });

  alerts.slice(0, 4).forEach((alert) => {
    const item = document.createElement("article");
    item.className = `overview-alert-item ${alert.tone}`;

    const title = document.createElement("strong");
    title.textContent = alert.title;

    const text = document.createElement("p");
    text.textContent = alert.text;

    item.append(title, text);
    elements.ovAlertList.appendChild(item);
  });
}

function renderDashboardHistory(history) {
  if (!elements.ovHistoryBody) return;
  elements.ovHistoryBody.innerHTML = "";

  const rows = history.slice(0, 8);
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="4" class="overview-empty-cell">Sem histórico registrado.</td>';
    elements.ovHistoryBody.appendChild(tr);
    return;
  }

  rows.forEach((entry) => {
    const tr = document.createElement("tr");
    const deltaClass =
      entry.delta > 0 ? "positive" : entry.delta < 0 ? "negative" : "neutral";
    const deltaSign = entry.delta > 0 ? "+" : "";
    tr.innerHTML = `
      <td>${formatDateTime(entry.when)}</td>
      <td>${entry.operator}</td>
      <td>${entry.event}</td>
      <td class="overview-delta ${deltaClass}">${deltaSign}${formatNumber(entry.delta)} cx</td>
    `;
    elements.ovHistoryBody.appendChild(tr);
  });
}

function buildDashboardBrandGradient(marcas) {
  if (!marcas.length) {
    return "conic-gradient(#1f2937 0 100%)";
  }
  const total = marcas.reduce((sum, item) => sum + item.totalCaixas, 0) || 1;
  let cursor = 0;
  const segments = marcas.map((item, index) => {
    const share = (item.totalCaixas / total) * 100;
    const start = cursor;
    const end = Math.min(100, start + share);
    cursor = end;
    return `${DASHBOARD_OVERVIEW_COLORS[index % DASHBOARD_OVERVIEW_COLORS.length]} ${start.toFixed(
      2
    )}% ${end.toFixed(2)}%`;
  });
  if (cursor < 100) {
    segments.push(`#1f2937 ${cursor.toFixed(2)}% 100%`);
  }
  return `conic-gradient(${segments.join(", ")})`;
}

function renderDashboardBrands(data) {
  if (elements.ovBrandChartTotal) {
    elements.ovBrandChartTotal.textContent = formatNumber(data.marcasDistintas);
  }
  if (elements.ovBrandChart) {
    elements.ovBrandChart.style.setProperty(
      "--ov-brand-donut",
      buildDashboardBrandGradient(data.marcas)
    );
  }
  if (!elements.ovBrandGrid) return;
  elements.ovBrandGrid.innerHTML = "";

  if (!data.marcas.length) {
    const empty = document.createElement("p");
    empty.className = "overview-empty";
    empty.textContent = "Sem marcas para exibir.";
    elements.ovBrandGrid.appendChild(empty);
    return;
  }

  data.marcas.forEach((marca, index) => {
    const card = document.createElement("article");
    card.className = "overview-brand-item";
    card.style.setProperty(
      "--brand-accent",
      DASHBOARD_OVERVIEW_COLORS[index % DASHBOARD_OVERVIEW_COLORS.length]
    );

    const label = document.createElement("span");
    label.className = "overview-brand-label";
    label.textContent = marca.marca;

    const total = document.createElement("strong");
    total.className = "overview-brand-total";
    total.textContent = formatNumber(marca.totalCaixas);

    const meta = document.createElement("span");
    meta.className = "overview-brand-meta";
    meta.textContent = `${formatNumber(marca.produtos)} produtos · ${formatNumber(
      marca.pallets
    )} pallets`;

    card.append(label, total, meta);
    elements.ovBrandGrid.appendChild(card);
  });
}

function renderDashboardOverview() {
  if (PAGE_MODE !== "dashboard") return;
  if (!elements.ovTotalCaixas) return;

  const data = buildDashboardOverviewData();

  if (elements.ovTotalCaixas) {
    elements.ovTotalCaixas.textContent = formatNumber(data.totalCaixas);
  }
  if (elements.ovTotalCaixasMeta) {
    elements.ovTotalCaixasMeta.textContent = data.totalCaixasMeta;
  }
  if (elements.ovTotalPallets) {
    elements.ovTotalPallets.textContent = formatNumber(data.totalPallets);
  }
  if (elements.ovTotalPalletsMeta) {
    elements.ovTotalPalletsMeta.textContent = data.palletsMeta;
  }
  if (elements.ovProdutosDistintos) {
    elements.ovProdutosDistintos.textContent = formatNumber(data.produtosDistintos);
  }
  if (elements.ovProdutosDistintosMeta) {
    elements.ovProdutosDistintosMeta.textContent = data.produtosMeta;
  }
  if (elements.ovBaixoEstoque) {
    elements.ovBaixoEstoque.textContent = formatNumber(data.lowCount);
  }
  if (elements.ovBaixoEstoqueMeta) {
    elements.ovBaixoEstoqueMeta.textContent = data.lowMeta;
  }

  renderDashboardSetorBars(data.setores);
  renderDashboardTopProducts(data.produtos);
  renderDashboardAlerts(data);
  renderDashboardHistory(data.history);
  renderDashboardBrands(data);
}

export function renderDashboard(force = false) {
  if (PAGE_MODE !== "dashboard") return;
  if (elements.ovTotalCaixas) {
    renderDashboardOverview();
    return;
  }
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

export function setupDashboard() {
  if (PAGE_MODE !== "dashboard") return;
  if (elements.ovTotalCaixas) {
    renderDashboardOverview();
    return;
  }
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

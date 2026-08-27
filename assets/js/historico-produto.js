// Historico diario de estoque por produto+marca (sazonalidade) — so visao-geral.html.
// Fonte dos dados: tabela estoque_historico_diario, gravada 1x/dia por um cron no
// Supabase (ver supabase-historico-diario.sql), independente de "Nova Contagem".
import { state, elements, PAGE_MODE } from "./state.js";
import { listProductsBySetor, listBrands, setSelectOptionsWithPlaceholder, formatNumber } from "./utils.js";
import { loadHistoricoDiario } from "./supabase-api.js";
import { renderLineChart } from "./dashboard.js";

let chartMeta = null;
let hoverIndex = null;

function formatDiaLabel(value) {
  const date = value ? new Date(`${value}T00:00:00`) : null;
  if (!date || Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }).format(date);
}

function getRangeDias() {
  const active = elements.historicoRange?.querySelector(".range-btn.active");
  const raw = active?.dataset?.dias;
  if (!raw || raw === "all") return null;
  const dias = Number.parseInt(raw, 10);
  return Number.isFinite(dias) ? dias : null;
}

function filterSerieByRange(serie, dias) {
  if (!dias) return serie;
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  return serie.filter((ponto) => new Date(`${ponto.data}T00:00:00`) >= limite);
}

function computeMinMax(serie) {
  if (!serie.length) return { min: null, max: null };
  let min = serie[0];
  let max = serie[0];
  serie.forEach((ponto) => {
    if (ponto.total_caixas < min.total_caixas) min = ponto;
    if (ponto.total_caixas > max.total_caixas) max = ponto;
  });
  return { min, max };
}

function renderHistoricoEmpty(message) {
  chartMeta = null;
  if (elements.historicoCanvas) {
    const ctx = elements.historicoCanvas.getContext("2d");
    ctx?.clearRect(0, 0, elements.historicoCanvas.width, elements.historicoCanvas.height);
  }
  if (elements.historicoTooltip) elements.historicoTooltip.classList.remove("visible");
  if (elements.historicoSummary) elements.historicoSummary.textContent = message;
  if (elements.historicoMaxLabel) elements.historicoMaxLabel.textContent = "";
  if (elements.historicoMinLabel) elements.historicoMinLabel.textContent = "";
}

function renderHistoricoChartAndSummary() {
  if (!state.historicoProduto || !state.historicoMarca) {
    renderHistoricoEmpty("Selecione um produto e uma marca para ver o historico.");
    return;
  }

  const dias = getRangeDias();
  state.historicoRangeDias = dias;
  const serieFiltrada = filterSerieByRange(state.historicoSerie, dias);

  if (!serieFiltrada.length) {
    renderHistoricoEmpty("Sem dados historicos ainda para esse periodo.");
    return;
  }

  const dates = serieFiltrada.map((ponto) => new Date(`${ponto.data}T00:00:00`));
  const values = serieFiltrada.map((ponto) => ponto.total_caixas);

  chartMeta = renderLineChart(elements.historicoCanvas, { dates, values }, {
    lineColor: "#2ee981",
    fillStart: "rgba(46, 233, 129, 0.35)",
    fillEnd: "rgba(46, 233, 129, 0.05)",
    labelColor: "rgba(148, 163, 184, 0.9)",
    showLabels: true,
    height: 240,
    hoverIndex,
  });

  const { min, max } = computeMinMax(serieFiltrada);
  if (elements.historicoSummary) {
    elements.historicoSummary.textContent = `${formatNumber(values[values.length - 1])} cx hoje · ${serieFiltrada.length} dia(s) no periodo`;
  }
  if (elements.historicoMaxLabel && max) {
    elements.historicoMaxLabel.textContent = `Maior estoque: ${formatNumber(max.total_caixas)} cx em ${formatDiaLabel(max.data)}`;
  }
  if (elements.historicoMinLabel && min) {
    elements.historicoMinLabel.textContent = `Menor estoque: ${formatNumber(min.total_caixas)} cx em ${formatDiaLabel(min.data)}`;
  }
}

async function reloadHistoricoSerie() {
  if (!state.historicoProduto || !state.historicoMarca) {
    renderHistoricoEmpty("Selecione um produto e uma marca para ver o historico.");
    return;
  }
  renderHistoricoEmpty("Carregando historico...");
  state.historicoSerie = await loadHistoricoDiario(state.historicoProduto, state.historicoMarca);
  renderHistoricoChartAndSummary();
}

function updateHistoricoMarcaOptions() {
  if (!elements.historicoMarcaSelect) return;
  const marcas = state.historicoProduto ? listBrands(null, state.historicoProduto) : [];
  setSelectOptionsWithPlaceholder(elements.historicoMarcaSelect, marcas, "", "Selecione");
  elements.historicoMarcaSelect.disabled = !marcas.length;
}

function updateRangeButtons(activeButton) {
  if (!elements.historicoRange) return;
  elements.historicoRange.querySelectorAll(".range-btn").forEach((button) => {
    button.classList.toggle("active", button === activeButton);
  });
}

function attachHistoricoHover() {
  if (!elements.historicoCanvas) return;

  const handleMove = (event) => {
    if (!chartMeta || !chartMeta.values.length) return;
    const rect = elements.historicoCanvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const x = clientX - rect.left;
    if (x < chartMeta.padding.left || x > chartMeta.width - chartMeta.padding.right) {
      hoverIndex = null;
      if (elements.historicoTooltip) elements.historicoTooltip.classList.remove("visible");
      renderHistoricoChartAndSummary();
      return;
    }
    const ratio = (x - chartMeta.padding.left) / chartMeta.innerWidth;
    const index = Math.max(
      0,
      Math.min(chartMeta.values.length - 1, Math.round(ratio * (chartMeta.values.length - 1)))
    );
    if (hoverIndex === index) return;
    hoverIndex = index;
    renderHistoricoChartAndSummary();
    if (elements.historicoTooltip && chartMeta) {
      const value = chartMeta.values[index];
      const date = chartMeta.dates[index];
      const px = chartMeta.getX(index);
      const py = chartMeta.getY(value);
      elements.historicoTooltip.innerHTML = `<strong>${formatNumber(value)}</strong> cx<span class="tooltip-date">${formatDiaLabel(
        date.toISOString().slice(0, 10)
      )}</span>`;
      elements.historicoTooltip.style.left = `${Math.min(Math.max(px, 12), chartMeta.width - 12)}px`;
      elements.historicoTooltip.style.top = `${Math.max(py, 24)}px`;
      elements.historicoTooltip.classList.add("visible");
    }
  };

  const handleLeave = () => {
    hoverIndex = null;
    if (elements.historicoTooltip) elements.historicoTooltip.classList.remove("visible");
    renderHistoricoChartAndSummary();
  };

  elements.historicoCanvas.addEventListener("mousemove", handleMove);
  elements.historicoCanvas.addEventListener("mouseleave", handleLeave);
  elements.historicoCanvas.addEventListener("touchmove", handleMove, { passive: true });
  elements.historicoCanvas.addEventListener("touchend", handleLeave);
}

export function setupHistoricoProduto() {
  if (PAGE_MODE !== "dashboard") return;
  if (!elements.historicoProdutoSelect || !elements.historicoMarcaSelect) return;

  setSelectOptionsWithPlaceholder(elements.historicoProdutoSelect, listProductsBySetor(null), "", "Selecione");
  updateHistoricoMarcaOptions();
  renderHistoricoEmpty("Selecione um produto e uma marca para ver o historico.");

  elements.historicoProdutoSelect.addEventListener("change", () => {
    state.historicoProduto = elements.historicoProdutoSelect.value || null;
    state.historicoMarca = null;
    updateHistoricoMarcaOptions();
    hoverIndex = null;
    reloadHistoricoSerie();
  });

  elements.historicoMarcaSelect.addEventListener("change", () => {
    state.historicoMarca = elements.historicoMarcaSelect.value || null;
    hoverIndex = null;
    reloadHistoricoSerie();
  });

  if (elements.historicoRange) {
    elements.historicoRange.addEventListener("click", (event) => {
      const button = event.target.closest(".range-btn");
      if (!button) return;
      updateRangeButtons(button);
      hoverIndex = null;
      renderHistoricoChartAndSummary();
    });
    updateRangeButtons(elements.historicoRange.querySelector(".range-btn.active"));
  }

  attachHistoricoHover();
}

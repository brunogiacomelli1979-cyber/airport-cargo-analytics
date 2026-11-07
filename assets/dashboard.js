"use strict";
const A = CargoAnalytics,
  FILES = A.FILES,
  $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (v, d = 0) =>
  v === null || !Number.isFinite(Number(v))
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });
const pct = (n, d) => (d ? fmt((100 * n) / d, 1) + "%" : "—"),
  hr = (v) => (v === null ? "—" : fmt(v, 2) + " h");
const views = {
  overview: [
    "Visão geral",
    "Uma leitura do volume, dos tempos e da qualidade da operação.",
  ],
  performance: [
    "Performance operacional",
    "Compare companhias, perfis de carga e etapas do ciclo operacional.",
  ],
  quality: [
    "Conformidade e qualidade",
    "Investigue encerramentos, manifesto e adequação da armazenagem.",
  ],
  bottlenecks: [
    "Gargalos e retrabalho",
    "Explore ocorrências e seus intervalos registrados de resolução.",
  ],
  explore: [
    "Exploração de dados",
    "Do voo à carga: consulte, investigue e exporte os registros selecionados.",
  ],
  methodology: [
    "Metodologia e fontes",
    "Definições, denominadores e limites para uma análise rastreável.",
  ],
};
let state = null,
  selected = null,
  currentView = "overview",
  charts = [],
  tableState = {
    query: "",
    flight: "all",
    quality: "all",
    sort: "arrival",
    direction: "asc",
    page: 1,
  },
  tableRows = [];
const filters = () => ({
  month: $("filter-month").value,
  airline: $("filter-airline").value,
  type: $("filter-type").value,
});
function options(id, values, label) {
  const s = $(id);
  s.replaceChildren(new Option(label, "all"));
  [...new Set(values)]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .forEach((v) => s.add(new Option(v, v)));
}
const metric = (label, value, note) =>
  `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
const strip = (items) =>
  `<section class="metric-strip" aria-label="Indicadores">${items.join("")}</section>`;
const panel = (title, description, id, unit = "", size = "") =>
  `<section class="panel"><div class="panel-head"><div><h2>${title}</h2><p>${description}</p></div><span class="unit">${unit}</span></div><div class="chart ${size}" id="${id}" role="img" aria-label="${title}"></div><details class="chart-table"><summary>Consultar valores do gráfico</summary><div class="table-wrap" id="${id}-data"></div></details></section>`;
function chart(
  id,
  labels,
  series,
  { horizontal = false, percent = false } = {},
) {
  const root = $(id);
  if (!root) return;
  const rows = labels.map((label, i) => [
    label,
    ...series.map(
      (s) => fmt(s.data[i], s.decimals || 0) + (percent ? "%" : ""),
    ),
  ]);
  $(id + "-data").innerHTML =
    `<table><thead><tr>${["Categoria", ...series.map((s) => s.name)].map((x) => `<th scope="col">${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((x, i) => `<${i ? "td" : "th"}${i ? "" : ' scope="row"'}>${esc(x)}</${i ? "td" : "th"}>`).join("")}</tr>`).join("")}</tbody></table>`;
  root.setAttribute(
    "aria-label",
    root.getAttribute("aria-label") + ". Valores em tabela logo abaixo.",
  );
  if (!labels.length) {
    root.innerHTML = '<div class="empty">Sem observações neste recorte.</div>';
    return;
  }
  if (!window.echarts) {
    root.innerHTML =
      '<p class="empty">Gráfico indisponível. Consulte os valores na tabela abaixo.</p>';
    return;
  }
  const narrow = root.clientWidth < 440;
  if (horizontal && labels.length > 8)
    root.style.height = Math.max(360, labels.length * 36 + 70) + "px";
  const c = echarts.init(root, null, { renderer: "svg" });
  charts.push(c);
  const axis = {
    type: "value",
    min: 0,
    splitNumber: 3,
    ...(percent ? { max: 100, interval: 25 } : {}),
    axisLabel: {
      color: "#526579",
      fontSize: 11,
      formatter: (v) => fmt(v) + (percent ? "%" : ""),
    },
    splitLine: { lineStyle: { color: "#e9eef3" } },
    axisLine: { show: false },
  };
  const cat = {
    type: "category",
    data: labels,
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: {
      color: "#526579",
      fontSize: 11,
      interval: 0,
      ...(horizontal
        ? { width: narrow ? 118 : 150, overflow: "break", lineHeight: 13 }
        : {}),
    },
    ...(horizontal ? { inverse: true } : {}),
  };
  c.setOption({
    animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: 250,
    color: ["#2368ad", "#237766", "#a26108"],
    textStyle: { fontFamily: "Segoe UI, Arial, sans-serif" },
    aria: { enabled: true },
    grid: {
      left: horizontal ? (narrow ? 126 : 158) : 46,
      right: 40,
      top: series.length > 1 ? 42 : 12,
      bottom: 34,
      containLabel: false,
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      renderMode: "richText",
      valueFormatter: (v) => fmt(v, 2) + (percent ? "%" : ""),
    },
    legend: {
      show: series.length > 1,
      top: 0,
      left: 0,
      textStyle: { color: "#526579", fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    xAxis: horizontal ? axis : cat,
    yAxis: horizontal ? cat : axis,
    series: series.map((s) => ({
      name: s.name,
      type: s.type || "bar",
      data: s.data,
      barMaxWidth: 30,
      symbolSize: 7,
      smooth: false,
      ...(s.stack ? { stack: s.stack } : {}),
      label: {
        show: series.length === 1,
        position: horizontal ? "right" : "top",
        fontSize: 11,
        color: "#152d43",
        formatter: (p) => fmt(p.value, s.decimals || 0) + (percent ? "%" : ""),
      },
      itemStyle: { borderRadius: 2 },
      emphasis: { focus: "series" },
    })),
  });
}
const countChart = (id, rows, key) => {
  const g = A.groups(rows, key).sort((a, b) => b.value - a.value);
  chart(
    id,
    g.map((x) => x.label),
    [{ name: "Ocorrências", data: g.map((x) => x.value) }],
    { horizontal: true },
  );
};
function renderOverview(s, m) {
  $("view").innerHTML =
    strip([
      metric("Voos analisados", fmt(m.flights), "Voos únicos no recorte"),
      metric("Cargas / AWBs", fmt(m.cargo), "Conhecimentos aéreos únicos"),
      metric("Volumes recebidos", fmt(m.pieces), "Volumes físicos registrados"),
      metric("Peso recebido", fmt(m.kg / 1000, 2) + " t", fmt(m.kg, 2) + " kg"),
    ]) +
    `<div class="grid">${panel("Movimento da importação", "Evolução mensal pela chegada da aeronave", "monthly", "Voos / AWBs")}<section class="panel"><div class="panel-head"><div><h2>Encerramento no prazo</h2><p>Conformidade por voo, calculada pelas datas</p></div></div><div class="health"><div class="ring" style="--value:${m.flights ? (100 * m.onTime) / m.flights : 0}"><strong id="kpi-compliance">${pct(m.onTime, m.flights)}</strong></div><div><b>${fmt(m.onTime)} de ${fmt(m.flights)}</b><p>voos dentro do prazo simulado</p><p>${fmt(m.flights - m.onTime)} encerrados após o limite</p></div></div><div class="note">O prazo é fictício. A classificação textual da origem não determina este indicador.</div></section></div><div class="quality-list"><div class="quality-item"><strong>${pct(m.manifest, m.cargo)}</strong><div><span>Erro de manifesto</span><small>${fmt(m.manifest)} de ${fmt(m.cargo)} AWBs</small></div></div><div class="quality-item"><strong>${pct(m.rework, m.cargo)}</strong><div><span>Cargas com retrabalho</span><small>${fmt(m.rework)} AWBs distintos</small></div></div><div class="quality-item"><strong>${pct(m.storage, m.cargo)}</strong><div><span>Armazenagem conforme</span><small>${fmt(m.storage)} de ${fmt(m.cargo)} AWBs</small></div></div></div><div class="grid equal">${panel("Tempos do ciclo", "Médias por AWB; dwell inclui todo o ciclo até a entrega", "cycle", "Horas", "short")}${panel("Perfil da carga", "Distribuição dos conhecimentos aéreos selecionados", "profile", "AWBs", "short")}</div><div class="section-title"><h2>Voos para investigação</h2><p>Maiores ultrapassagens do prazo fictício</p></div><section class="panel"><div class="table-wrap">${lateTable(s.flights)}</div></section>`;
  monthly(s);
  chart(
    "cycle",
    ["Chegada → registro", "Registro → encerramento", "Chegada → entrega"],
    [
      {
        name: "Média em horas",
        data: [m.depot, m.postDepot, m.dwell],
        decimals: 2,
      },
    ],
    { horizontal: true },
  );
  const g = A.groups(s.cargo, "cargo_type").sort((a, b) => b.value - a.value);
  chart(
    "profile",
    g.map((x) => x.label),
    [{ name: "AWBs", data: g.map((x) => x.value) }],
    { horizontal: true },
  );
}
function monthly(s) {
  const months = [
    ...new Set(s.flights.map((f) => f.aircraft_arrival_datetime.slice(0, 7))),
  ].sort();
  chart(
    "monthly",
    months.map(
      (x) =>
        (({ "01": "Jan", "02": "Fev", "03": "Mar" })[x.slice(5)] || x) +
        " 2026",
    ),
    [
      {
        name: "Voos",
        data: months.map(
          (k) =>
            s.flights.filter((f) => f.aircraft_arrival_datetime.startsWith(k))
              .length,
        ),
      },
      {
        name: "AWBs",
        data: months.map(
          (k) => s.cargo.filter((c) => c.arrival.startsWith(k)).length,
        ),
      },
    ],
  );
}
function lateTable(flights) {
  const late = flights
    .map((f) => ({
      f,
      h: A.hours(f.legal_deadline_datetime, f.mantra_closure_datetime),
    }))
    .filter((x) => x.h > 0)
    .sort((a, b) => b.h - a.h)
    .slice(0, 5);
  return `<table><thead><tr>${["Voo", "Companhia", "Origem", "Chegada", "Após o limite", "Investigar"].map((x) => `<th scope="col">${x}</th>`).join("")}</tr></thead><tbody>${late.map(({ f, h }) => `<tr><td>${esc(f.flight_number)}</td><td>${esc(f.airline)}</td><td>${esc(f.origin_airport)}</td><td>${esc(f.aircraft_arrival_datetime)}</td><td><span class="badge warn">${hr(h)}</span></td><td><button class="link-button" data-flight="${esc(f.flight_id)}">Ver cargas</button></td></tr>`).join("") || '<tr><td colspan="6">Nenhum voo fora do prazo neste recorte.</td></tr>'}</tbody></table>`;
}
function renderPerformance(s, m) {
  $("view").innerHTML =
    strip([
      metric("Chegada → registro", hr(m.depot), "Média por AWB"),
      metric("Registro → encerramento", hr(m.postDepot), "Média por AWB"),
      metric("Chegada → encerramento", hr(m.closure), "Média por voo único"),
      metric("Dwell total", hr(m.dwell), "Média por AWB até entrega"),
    ]) +
    `<div class="grid equal">${panel("Movimento mensal", "Voos e AWBs por mês de chegada", "monthly", "Quantidade")}${panel("Companhias aéreas", "Média entre chegada e encerramento, por voo", "airline-time", "Horas")}</div><div class="grid equal">${panel("Tempo por perfil de carga", "Média por AWB nas duas etapas até encerramento", "type-time", "Horas")}${panel("Distribuição do dwell total", "Intervalos de chegada até entrega; uma observação por AWB", "distribution", "AWBs")}</div>`;
  monthly(s);
  let g = A.groups(s.flights, "airline", (rows) =>
    A.mean(
      rows.map((f) =>
        A.hours(f.aircraft_arrival_datetime, f.mantra_closure_datetime),
      ),
    ),
  ).sort((a, b) => b.value - a.value);
  chart(
    "airline-time",
    g.map((x) => x.label),
    [
      {
        name: "Horas até encerramento",
        data: g.map((x) => x.value),
        decimals: 2,
      },
    ],
    { horizontal: true },
  );
  g = A.groups(s.cargo, "cargo_type");
  chart(
    "type-time",
    g.map((x) => x.label),
    [
      {
        name: "Chegada → registro",
        data: g.map((x) => A.mean(x.items.map((c) => c.depot))),
        stack: "time",
        decimals: 2,
      },
      {
        name: "Registro → encerramento",
        data: g.map((x) => A.mean(x.items.map((c) => c.postDepot))),
        stack: "time",
        decimals: 2,
      },
    ],
    { horizontal: true },
  );
  chart(
    "distribution",
    ["0–24 h", "24–48 h", "48–72 h", "72–96 h", "96–120 h", "≥120 h"],
    [
      {
        name: "AWBs",
        data: [0, 24, 48, 72, 96, 120].map(
          (low, i) =>
            s.cargo.filter(
              (c) => c.dwell >= low && (i === 5 || c.dwell < low + 24),
            ).length,
        ),
      },
    ],
  );
}
function renderQuality(s, m) {
  const weight = s.cargo.filter(
      (c) => Number(c.declared_weight_kg) !== Number(c.received_weight_kg),
    ).length,
    pieces = s.cargo.filter(
      (c) => Number(c.declared_pieces) !== Number(c.received_pieces),
    ).length;
  $("view").innerHTML =
    strip([
      metric(
        "Encerramento no prazo",
        pct(m.onTime, m.flights),
        `${m.onTime} de ${m.flights} voos`,
      ),
      metric(
        "Erro de manifesto",
        pct(m.manifest, m.cargo),
        `${m.manifest} de ${m.cargo} AWBs`,
      ),
      metric("Divergência de peso", fmt(weight), "AWBs: declarado ≠ recebido"),
      metric(
        "Divergência de volumes",
        fmt(pieces),
        "AWBs: declarado ≠ recebido",
      ),
    ]) +
    `<div class="note">Regra fictícia de prazo: encerramento entre a chegada e o limite do CSV. Não representa interpretação jurídica. Divergência física e erro registrado no manifesto são medidas distintas.</div><div class="section-title"><h2>Qualidade por segmento</h2></div><div class="grid equal">${panel("Conformidade por companhia", "Voos no prazo / voos da companhia no recorte", "airline-quality", "% de voos")}${panel("Armazenagem por perfil", "Cargas com status Conforme / AWBs do perfil", "storage-quality", "% de AWBs")}</div><div class="grid equal">${panel("Erros documentais registrados", "Tipo informado no manifesto, apenas flag Sim", "manifest-types", "AWBs")}${panel("Erro de manifesto por companhia", "AWBs com erro / AWBs da companhia", "manifest-airline", "% de AWBs")}</div>`;
  let g = A.groups(
    s.flights,
    "airline",
    (rows) => (100 * rows.filter(A.onTime).length) / rows.length,
  ).sort((a, b) => b.value - a.value);
  chart(
    "airline-quality",
    g.map((x) => x.label),
    [{ name: "No prazo", data: g.map((x) => x.value), decimals: 1 }],
    { horizontal: true, percent: true },
  );
  g = A.groups(
    s.cargo,
    "cargo_type",
    (rows) =>
      (100 * rows.filter((c) => c.storage === "Conforme").length) / rows.length,
  );
  chart(
    "storage-quality",
    g.map((x) => x.label),
    [{ name: "Conforme", data: g.map((x) => x.value), decimals: 1 }],
    { horizontal: true, percent: true },
  );
  const records = s.cargo
    .filter((c) => c.manifest_error === "Sim")
    .map((c) => state.manifestMap.get(c.cargo_id));
  countChart("manifest-types", records, "manifest_error_type");
  g = A.groups(
    s.cargo,
    "airline",
    (rows) =>
      (100 * rows.filter((c) => c.manifest_error === "Sim").length) /
      rows.length,
  );
  chart(
    "manifest-airline",
    g.map((x) => x.label),
    [{ name: "Com erro", data: g.map((x) => x.value), decimals: 1 }],
    { horizontal: true, percent: true },
  );
}
function renderBottlenecks(s, m) {
  $("view").innerHTML =
    strip([
      metric("Ocorrências", fmt(m.occurrences), "Grão: inconsistency_id"),
      metric(
        "Cargas afetadas",
        fmt(m.affected),
        pct(m.affected, m.cargo) + " dos AWBs",
      ),
      metric(
        "Cargas com retrabalho",
        fmt(m.rework),
        pct(m.rework, m.cargo) + " dos AWBs",
      ),
      metric(
        "Detecção → resolução",
        hr(m.resolution),
        "Tempo decorrido médio por ocorrência",
      ),
    ]) +
    `<div class="note">O intervalo de resolução não mede horas trabalhadas. Grupo e controlabilidade são classificações da ocorrência e não comprovam a causa de atrasos.</div><div class="section-title"><h2>Mapa das ocorrências</h2></div><div class="grid equal">${panel("Tipos de inconsistência", "Contagem de ocorrências, sem duplicar peso ou volume", "inc-types", "Ocorrências", "tall")}${panel("Grupos registrados", "Responsáveis ou influenciadores conforme a classificação de origem", "responsibility", "Ocorrências", "tall")}</div><div class="grid equal">${panel("Controlabilidade registrada", "Classificação de ocorrências, não de atrasos de voo", "control", "Ocorrências")}${panel("Intervalo de resolução por tipo", "Média de resolução − detecção; todas as ocorrências", "resolution", "Horas")}</div>`;
  countChart("inc-types", s.occurrences, "inconsistency_type");
  countChart("responsibility", s.occurrences, "responsibility_group");
  countChart("control", s.occurrences, "controllability_level");
  const g = A.groups(s.occurrences, "inconsistency_type", (rows) =>
    A.mean(rows.map((i) => A.hours(i.detected_datetime, i.resolved_datetime))),
  ).sort((a, b) => b.value - a.value);
  chart(
    "resolution",
    g.map((x) => x.label),
    [{ name: "Horas decorridas", data: g.map((x) => x.value), decimals: 2 }],
    { horizontal: true },
  );
}
function renderExplore() {
  $("view").innerHTML =
    `<section class="panel"><div class="panel-head"><div><h2>Registros de carga</h2><p>Os filtros abaixo refinam a tabela e a exportação. Indicadores globais usam os filtros do cabeçalho.</p></div></div><div class="tools"><label>Buscar AWB, voo ou companhia<input id="search" type="search" placeholder="Ex.: 693-83197857" value="${esc(tableState.query)}"></label><label>Voo relacionado<select id="flight-select"></select></label><label>Condição da carga<select id="quality-select"><option value="all">Todas as condições</option><option value="manifest">Erro de manifesto</option><option value="storage">Armazenagem não conforme</option><option value="rework">Com retrabalho</option></select></label><button id="download-csv" class="primary">Exportar CSV</button></div><div class="table-wrap" tabindex="0" role="region" aria-label="Tabela de cargas, role horizontalmente para outras colunas"><table><caption id="table-caption">Cargas selecionadas</caption><thead><tr>${[
      ["awb_number", "AWB"],
      ["flight_number", "Voo"],
      ["airline", "Companhia"],
      ["cargo_type", "Perfil"],
      ["arrival", "Chegada"],
      ["received_weight_kg", "Peso (kg)"],
      ["dwell", "Dwell (h)"],
      ["storage", "Armazenagem"],
    ]
      .map(
        ([key, label]) =>
          `<th scope="col" data-key="${key}"><button data-sort="${key}">${label} <span aria-hidden="true">↕</span></button></th>`,
      )
      .join(
        "",
      )}<th scope="col">Detalhes</th></tr></thead><tbody id="cargo-table"></tbody></table></div><div class="pagination"><span id="table-summary" role="status"></span><div><button id="prev">Anterior</button><button id="next">Próxima</button></div></div></section>`;
  options(
    "flight-select",
    selected.flights.map((f) => f.flight_id),
    "Todos os voos",
  );
  for (const opt of $("flight-select").options) {
    const f = state.flightMap.get(opt.value);
    if (f) opt.textContent = f.flight_number + " / " + f.flight_id;
  }
  if (!selected.flights.some((f) => f.flight_id === tableState.flight))
    tableState.flight = "all";
  $("flight-select").value = tableState.flight;
  $("quality-select").value = tableState.quality;
  $("search").addEventListener("input", (e) => {
    tableState.query = e.target.value;
    tableState.page = 1;
    updateTable();
  });
  $("flight-select").addEventListener("change", (e) => {
    tableState.flight = e.target.value;
    tableState.page = 1;
    updateTable();
  });
  $("quality-select").addEventListener("change", (e) => {
    tableState.quality = e.target.value;
    tableState.page = 1;
    updateTable();
  });
  document.querySelectorAll("[data-sort]").forEach((b) =>
    b.addEventListener("click", () => {
      tableState.direction =
        tableState.sort === b.dataset.sort && tableState.direction === "asc"
          ? "desc"
          : "asc";
      tableState.sort = b.dataset.sort;
      updateTable();
    }),
  );
  $("prev").onclick = () => {
    tableState.page--;
    updateTable();
  };
  $("next").onclick = () => {
    tableState.page++;
    updateTable();
  };
  $("download-csv").onclick = exportCargo;
  updateTable();
}
function updateTable() {
  tableRows = A.explore(selected.cargo, tableState);
  const pages = Math.max(1, Math.ceil(tableRows.length / 15));
  tableState.page = Math.max(1, Math.min(tableState.page, pages));
  const start = (tableState.page - 1) * 15;
  $("cargo-table").innerHTML =
    tableRows
      .slice(start, start + 15)
      .map(
        (c) =>
          `<tr><td><button class="link-button" data-cargo="${esc(c.cargo_id)}">${esc(c.awb_number)}</button></td><td>${esc(c.flight_number)}</td><td>${esc(c.airline)}</td><td>${esc(c.cargo_type)}</td><td>${esc(c.arrival)}</td><td>${fmt(Number(c.received_weight_kg), 2)}</td><td>${fmt(c.dwell, 2)}</td><td><span class="badge ${c.storage === "Conforme" ? "" : "warn"}">${esc(c.storage)}</span></td><td><button class="link-button" data-cargo="${esc(c.cargo_id)}">Detalhes</button></td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="9">Nenhuma carga encontrada. Revise a busca ou limpe os filtros.</td></tr>';
  $("table-summary").textContent =
    `${fmt(tableRows.length)} AWBs encontrados • Página ${tableState.page} de ${pages}`;
  $("table-caption").textContent =
    `${fmt(tableRows.length)} cargas no recorte da tabela`;
  $("prev").disabled = tableState.page === 1;
  $("next").disabled = tableState.page === pages;
  $("download-csv").disabled = !tableRows.length;
  document.querySelectorAll("th[data-key]").forEach((th) => {
    if (th.dataset.key === tableState.sort)
      th.setAttribute(
        "aria-sort",
        tableState.direction === "asc" ? "ascending" : "descending",
      );
    else th.removeAttribute("aria-sort");
  });
}
function exportCargo() {
  const url = URL.createObjectURL(
    new Blob([A.csv(tableRows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "airport-cargo-cargas-filtradas.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("status").textContent =
    `CSV exportado com ${fmt(tableRows.length)} AWBs da seleção da tabela.`;
}
function detail(cid) {
  const c = state.cargoMap.get(cid),
    f = state.flightMap.get(c.flight_id),
    r = state.rows.find((x) => x.cargo_id === cid);
  $("detail-title").textContent = "AWB " + c.awb_number;
  $("detail-body").innerHTML =
    `<dl class="facts">${[
      ["Voo / companhia", f.flight_number + " / " + f.airline],
      ["Identificadores", cid + " / " + f.flight_id],
      ["Perfil", c.cargo_type],
      ["Peso recebido", fmt(Number(c.received_weight_kg), 2) + " kg"],
      ["Chegada da aeronave", f.aircraft_arrival_datetime],
      [
        "Encerramento / limite fictício",
        f.mantra_closure_datetime + " / " + f.legal_deadline_datetime,
      ],
      ["Chegada → registro", hr(r.depot)],
      ["Dwell total", hr(r.dwell)],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
      .join("")}</dl>` +
    [
      ["Manifesto", state.manifestMap.get(cid)],
      ["Operação e armazenagem", state.operationsMap.get(cid)],
      ["Liberação", state.release_processMap.get(cid)],
      ["Entrega", state.deliveryMap.get(cid)],
      ["Ocorrências", state.incMap.get(cid) || []],
    ]
      .map(
        ([name, obj]) =>
          `<details><summary>${name}</summary><pre>${esc(JSON.stringify(obj, null, 2))}</pre></details>`,
      )
      .join("");
  $("detail").showModal();
}
function renderMethodology() {
  const kpis = [
    [
      "Voos / AWBs",
      "Contagem distinta de flight_id / cargo_id. Tipo de carga seleciona voos com pelo menos um AWB do perfil.",
    ],
    [
      "Encerramento no prazo",
      "Voos com chegada ≤ encerramento ≤ limite simulado / voos selecionados.",
    ],
    [
      "Volumes / peso",
      "Soma de received_pieces / received_weight_kg por carga única; sem junção direta com ocorrências.",
    ],
    [
      "Chegada → registro",
      "Média por AWB de depositary_system_receiving_datetime − aircraft_arrival_datetime, em horas.",
    ],
    [
      "Registro → encerramento",
      "Média por AWB de mantra_closure_datetime − depositary_system_receiving_datetime.",
    ],
    [
      "Chegada → encerramento",
      "Média por voo de mantra_closure_datetime − aircraft_arrival_datetime.",
    ],
    [
      "Dwell total",
      "Média por AWB de delivery_datetime − aircraft_arrival_datetime. Inclui dependências externas.",
    ],
    [
      "Erro de manifesto",
      "AWBs com manifest_error_flag = Sim / AWBs selecionados.",
    ],
    [
      "Retrabalho",
      "AWBs distintos com pelo menos uma ocorrência rework_flag = Sim / AWBs selecionados.",
    ],
    [
      "Armazenagem conforme",
      "AWBs com storage_compliance_status = Conforme / AWBs selecionados.",
    ],
    [
      "Cargas afetadas",
      "AWBs distintos com uma ou mais inconsistências / AWBs selecionados.",
    ],
    [
      "Resolução de ocorrências",
      "Média de resolved_datetime − detected_datetime por ocorrência. Não mede tempo de trabalho ativo.",
    ],
  ];
  $("view").innerHTML =
    `<section class="panel prose"><h2>Uma base fictícia, com definições explícitas</h2><p>Os sete CSVs versionados representam somente importação, com chegadas entre janeiro e março de 2026. Nenhuma observação descreve operações reais de aeroportos, companhias, clientes ou autoridades. Os filtros do cabeçalho usam o mês de chegada do voo, companhia e perfil da carga; os filtros da exploração refinam apenas a tabela e seu CSV.</p><h2>Cobertura integral das fontes</h2><p>Os números abaixo descrevem os arquivos completos, independentemente do recorte selecionado.</p><div class="table-wrap"><table><thead><tr><th scope="col">Arquivo CSV</th><th scope="col">Registros</th><th scope="col">Grão</th></tr></thead><tbody>${FILES.map((n) => `<tr><td><a href="./data/processed/csv/${n}.csv" download>${n}.csv</a></td><td>${fmt(state[n].length)}</td><td>${n === "flights" ? "Voo" : n === "inconsistencies" ? "Ocorrência" : "Uma linha por AWB"}</td></tr>`).join("")}</tbody></table></div><h2>Definições dos indicadores</h2><div class="table-wrap"><table class="audit-table"><thead><tr><th scope="col">Indicador</th><th scope="col">Fórmula e denominador</th></tr></thead><tbody>${kpis.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join("")}</tbody></table></div><h2>Critérios de integridade</h2><p>Chaves únicas, relacionamentos completos, cobertura 1:1 de manifesto, operação, liberação e entrega; ocorrências relacionadas por cargo_id. Pesos e volumes são agregados por AWB, antes de qualquer classificação de ocorrências. Datas sem fuso são preservadas sem conversão; os intervalos usam minutos, exibidos em horas. Totais e médias não arredondados são usados nos cálculos.</p><h2>Limites de interpretação</h2><ul><li>41 voos com rótulo “Próximo ao limite” estão fora do prazo pela comparação das datas. O rótulo não é usado no KPI.</li><li>Grupos e níveis de controlabilidade classificam ocorrências; não demonstram culpabilidade ou causalidade de atrasos.</li><li>Não há eventos de fluxo do armazém, saldos correntes ou exportações. Ocupação atual e dwell operacional limpo não podem ser calculados.</li><li>Divergências de peso e volumes comparam valores declarados e recebidos, sem tolerância operacional presumida.</li><li>O arquivo PBIX nativo é uma entrega separada, pendente de construção e validação no Power BI Desktop.</li></ul><p><a href="https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/tree/main/docs" target="_blank" rel="noopener noreferrer">Documentação, SQL e recibos de validação no repositório</a></p></section>`;
}
function route() {
  const key = location.hash.slice(1);
  currentView = views[key] ? key : "overview";
  $("mobile-nav").value = currentView;
  const [title, description] = views[currentView];
  $("page-title").textContent = title;
  $("breadcrumb").textContent = title;
  $("page-description").textContent = description;
  document.title = "Airport Cargo Analytics | " + title;
  document.querySelectorAll("[data-view]").forEach((a) => {
    if (a.dataset.view === currentView) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (state) render();
}
function render() {
  charts.forEach((c) => c.dispose());
  charts = [];
  selected = A.select(state, filters());
  const m = A.metrics(selected);
  $("scope").textContent =
    `${fmt(m.flights)} voos / ${fmt(m.cargo)} AWBs / ${fmt(m.occurrences)} ocorrências`;
  $("status").textContent = m.cargo
    ? "Dados carregados • 7 fontes simuladas"
    : "Nenhum resultado. Revise ou limpe os filtros.";
  ({
    overview: renderOverview,
    performance: renderPerformance,
    quality: renderQuality,
    bottlenecks: renderBottlenecks,
    explore: renderExplore,
    methodology: renderMethodology,
  })[currentView](selected, m);
  if (!m.cargo && currentView !== "methodology" && currentView !== "explore")
    $("view").insertAdjacentHTML(
      "afterbegin",
      '<div class="empty">Não há observações para esta combinação. Use “Limpar filtros” para voltar à base completa.</div>',
    );
  document.querySelectorAll("#view .table-wrap").forEach((el) => {
    el.tabIndex = 0;
    el.setAttribute("role", "region");
    if (!el.hasAttribute("aria-label"))
      el.setAttribute(
        "aria-label",
        "Tabela de dados, role horizontalmente se necessário",
      );
  });
  $("view").setAttribute("aria-busy", "false");
}
async function init() {
  route();
  try {
    const all = await Promise.all(
      FILES.map(async (name) => {
        const r = await fetch("./data/processed/csv/" + name + ".csv");
        if (!r.ok) throw new Error(name + ".csv: HTTP " + r.status);
        return [name, A.parseCsv(await r.text())];
      }),
    );
    state = A.prepare(Object.fromEntries(all));
    options(
      "filter-month",
      state.flights.map((f) => f.aircraft_arrival_datetime.slice(0, 7)),
      "Todos os meses",
    );
    options(
      "filter-airline",
      state.flights.map((f) => f.airline),
      "Todas as companhias",
    );
    options(
      "filter-type",
      state.cargo.map((c) => c.cargo_type),
      "Todos os perfis",
    );
    for (const id of ["filter-month", "filter-airline", "filter-type"])
      $(id).onchange = () => {
        tableState.page = 1;
        render();
      };
    $("reset").onclick = () => {
      for (const id of ["filter-month", "filter-airline", "filter-type"])
        $(id).value = "all";
      tableState = {
        query: "",
        flight: "all",
        quality: "all",
        sort: "arrival",
        direction: "asc",
        page: 1,
      };
      render();
    };
    render();
  } catch (e) {
    $("status").className = "error";
    $("status").textContent = "Falha ao carregar a base: " + e.message;
    $("view").setAttribute("aria-busy", "false");
    $("view").innerHTML =
      '<section class="panel error-panel"><h2>Não foi possível abrir os dados</h2><p>Verifique sua conexão e recarregue a página. Na execução local, use um servidor HTTP, como python -m http.server 8000.</p><button id="retry">Tentar novamente</button></section>';
    $("retry").onclick = () => location.reload();
    console.error(e);
  }
}
$("mobile-nav").onchange = (e) => {
  location.hash = e.target.value;
};
window.addEventListener("hashchange", () => {
  route();
  $("conteudo").focus({ preventScroll: true });
});
window.addEventListener("resize", () => charts.forEach((c) => c.resize()));
$("open-explore").onclick = () => {
  location.hash = "explore";
};
$("close-detail").onclick = () => $("detail").close();
$("view").addEventListener("click", (e) => {
  const cargo = e.target.closest("[data-cargo]"),
    flight = e.target.closest("[data-flight]");
  if (cargo) detail(cargo.dataset.cargo);
  if (flight) {
    tableState.flight = flight.dataset.flight;
    tableState.page = 1;
    location.hash = "explore";
  }
});
document.addEventListener("DOMContentLoaded", init);

/* Pure analytical layer. CSV dates are naive; UTC is only an arithmetic coordinate. */
(function (root) {
  "use strict";
  const FILES = [
    "flights",
    "cargo",
    "manifest",
    "operations",
    "inconsistencies",
    "release_process",
    "delivery",
  ];
  function parseCsv(text) {
    text = text.replace(/^\uFEFF/, "");
    const out = [];
    let row = [],
      cell = "",
      quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (!quoted && c === ",") {
        row.push(cell);
        cell = "";
      } else if (!quoted && (c === "\n" || c === "\r")) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        if (row.some(Boolean)) out.push(row);
        row = [];
        cell = "";
      } else cell += c;
    }
    if (quoted) throw new Error("CSV com aspas não encerradas");
    if (cell || row.length) {
      row.push(cell);
      out.push(row);
    }
    if (!out.length) throw new Error("CSV sem cabeçalho");
    const head = out.shift();
    if (new Set(head).size !== head.length)
      throw new Error("Cabeçalho duplicado");
    return out.map((fields) => {
      if (fields.length !== head.length)
        throw new Error("Linha CSV com quantidade inválida de campos");
      return Object.fromEntries(head.map((key, j) => [key, fields[j]]));
    });
  }
  const stamp = (s) =>
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s || "")
      ? Date.parse(s.replace(" ", "T") + "Z")
      : NaN;
  const hours = (a, b) => (stamp(b) - stamp(a)) / 3600000;
  const mean = (a) => {
    const v = a.filter(Number.isFinite);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const onTime = (f) =>
    stamp(f.mantra_closure_datetime) >= stamp(f.aircraft_arrival_datetime) &&
    stamp(f.mantra_closure_datetime) <= stamp(f.legal_deadline_datetime);
  function prepare(d) {
    for (const name of FILES) {
      const key = {
        flights: "flight_id",
        cargo: "cargo_id",
        manifest: "manifest_id",
        operations: "operation_id",
        inconsistencies: "inconsistency_id",
        release_process: "release_id",
        delivery: "delivery_id",
      }[name];
      if (
        !Array.isArray(d[name]) ||
        new Set(d[name].map((x) => x[key])).size !== d[name].length ||
        d[name].some((x) => !x[key])
      )
        throw new Error("Chaves inválidas em " + name);
    }
    d.flightMap = new Map(d.flights.map((x) => [x.flight_id, x]));
    d.cargoMap = new Map(d.cargo.map((x) => [x.cargo_id, x]));
    for (const name of [
      "manifest",
      "operations",
      "release_process",
      "delivery",
    ]) {
      const map = new Map(d[name].map((x) => [x.cargo_id, x]));
      if (
        map.size !== d[name].length ||
        map.size !== d.cargo.length ||
        [...map.keys()].some((k) => !d.cargoMap.has(k))
      )
        throw new Error("Relação 1:1 inválida em " + name);
      d[name + "Map"] = map;
    }
    if (
      d.cargo.some((c) => !d.flightMap.has(c.flight_id)) ||
      d.inconsistencies.some((i) => !d.cargoMap.has(i.cargo_id))
    )
      throw new Error("Referência ausente");
    d.incMap = new Map();
    for (const i of d.inconsistencies) {
      if (!d.incMap.has(i.cargo_id)) d.incMap.set(i.cargo_id, []);
      d.incMap.get(i.cargo_id).push(i);
    }
    d.rows = d.cargo.map((c) => {
      const f = d.flightMap.get(c.flight_id),
        o = d.operationsMap.get(c.cargo_id),
        m = d.manifestMap.get(c.cargo_id),
        delivery = d.deliveryMap.get(c.cargo_id),
        inc = d.incMap.get(c.cargo_id) || [];
      return {
        ...c,
        airline: f.airline,
        flight_number: f.flight_number,
        origin_airport: f.origin_airport,
        arrival: f.aircraft_arrival_datetime,
        manifest_error: m.manifest_error_flag,
        storage: o.storage_compliance_status,
        occurrences: inc.length,
        rework: inc.some((i) => i.rework_flag === "Sim"),
        depot: hours(
          f.aircraft_arrival_datetime,
          o.depositary_system_receiving_datetime,
        ),
        postDepot: hours(
          o.depositary_system_receiving_datetime,
          f.mantra_closure_datetime,
        ),
        closure: hours(f.aircraft_arrival_datetime, f.mantra_closure_datetime),
        dwell: hours(f.aircraft_arrival_datetime, delivery.delivery_datetime),
        onTime: onTime(f),
      };
    });
    if (
      d.rows.some(
        (r) =>
          ["depot", "postDepot", "closure", "dwell"].some(
            (k) => !Number.isFinite(r[k]) || r[k] < 0,
          ) ||
          !Number.isFinite(Number(r.received_weight_kg)) ||
          !Number.isFinite(Number(r.received_pieces)),
      )
    )
      throw new Error("Medida ou data inválida");
    return d;
  }
  function select(d, filters = {}) {
    const match = (f) =>
      (!filters.month ||
        filters.month === "all" ||
        f.aircraft_arrival_datetime.startsWith(filters.month)) &&
      (!filters.airline ||
        filters.airline === "all" ||
        f.airline === filters.airline);
    const cargo = d.rows.filter(
      (c) =>
        match(d.flightMap.get(c.flight_id)) &&
        (!filters.type ||
          filters.type === "all" ||
          c.cargo_type === filters.type),
    );
    const cargoIds = new Set(cargo.map((c) => c.cargo_id)),
      flightIds = new Set(cargo.map((c) => c.flight_id));
    const flights = d.flights.filter(
      (f) =>
        match(f) &&
        (!filters.type || filters.type === "all" || flightIds.has(f.flight_id)),
    );
    const occurrences = d.inconsistencies.filter((i) =>
      cargoIds.has(i.cargo_id),
    );
    return { cargo, flights, occurrences };
  }
  function metrics(s) {
    return {
      flights: s.flights.length,
      cargo: s.cargo.length,
      onTime: s.flights.filter(onTime).length,
      manifest: s.cargo.filter((c) => c.manifest_error === "Sim").length,
      rework: s.cargo.filter((c) => c.rework).length,
      storage: s.cargo.filter((c) => c.storage === "Conforme").length,
      affected: s.cargo.filter((c) => c.occurrences > 0).length,
      occurrences: s.occurrences.length,
      pieces: s.cargo.reduce((v, c) => v + Number(c.received_pieces), 0),
      kg: s.cargo.reduce((v, c) => v + Number(c.received_weight_kg), 0),
      depot: mean(s.cargo.map((c) => c.depot)),
      postDepot: mean(s.cargo.map((c) => c.postDepot)),
      closure: mean(
        s.flights.map((f) =>
          hours(f.aircraft_arrival_datetime, f.mantra_closure_datetime),
        ),
      ),
      dwell: mean(s.cargo.map((c) => c.dwell)),
      resolution: mean(
        s.occurrences.map((i) =>
          hours(i.detected_datetime, i.resolved_datetime),
        ),
      ),
    };
  }
  function groups(rows, key, value) {
    const m = new Map();
    for (const r of rows) {
      const k = typeof key === "function" ? key(r) : r[key];
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return [...m].map(([label, items]) => ({
      label,
      value: value ? value(items) : items.length,
      items,
    }));
  }
  function explore(
    rows,
    {
      query = "",
      flight = "all",
      quality = "all",
      sort = "arrival",
      direction = "asc",
    } = {},
  ) {
    const q = query.toLocaleLowerCase("pt-BR").trim();
    return rows
      .filter(
        (r) =>
          (!q ||
            [
              r.awb_number,
              r.flight_number,
              r.airline,
              r.cargo_type,
              r.cargo_id,
            ].some((v) => v.toLocaleLowerCase("pt-BR").includes(q))) &&
          (flight === "all" || r.flight_id === flight) &&
          (quality === "all" ||
            (quality === "manifest" && r.manifest_error === "Sim") ||
            (quality === "storage" && r.storage !== "Conforme") ||
            (quality === "rework" && r.rework)),
      )
      .sort((a, b) => {
        const av = a[sort],
          bv = b[sort];
        return (
          (typeof av === "number" || ["received_weight_kg", "received_pieces"].includes(sort)
            ? Number(av) - Number(bv)
            : String(av).localeCompare(String(bv), "pt-BR", {
                numeric: true,
              })) * (direction === "desc" ? -1 : 1)
        );
      });
  }
  function csv(rows) {
    const keys = [
      "cargo_id",
      "flight_id",
      "awb_number",
      "airline",
      "flight_number",
      "cargo_type",
      "received_pieces",
      "received_weight_kg",
      "manifest_error",
      "storage",
      "occurrences",
      "arrival",
      "depot",
      "postDepot",
      "dwell",
    ];
    const safe = (v) => {
      let s = String(v ?? "");
      if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    return (
      "\uFEFF" +
      [keys, ...rows.map((r) => keys.map((k) => r[k]))]
        .map((row) => row.map(safe).join(","))
        .join("\r\n")
    );
  }
  const api = {
    FILES,
    parseCsv,
    stamp,
    hours,
    mean,
    onTime,
    prepare,
    select,
    metrics,
    groups,
    explore,
    csv,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.CargoAnalytics = api;
})(globalThis);

const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  cp = require("node:child_process");
const A = require("../assets/analytics.js");
const load = () =>
  Object.fromEntries(
    A.FILES.map((n) => [
      n,
      A.parseCsv(fs.readFileSync("data/processed/csv/" + n + ".csv", "utf8")),
    ]),
  );
const d = A.prepare(load());
test("independent Python baseline reconciles all core metrics", () => {
  const p = JSON.parse(
    cp.execFileSync("python", ["scripts/validate_data.py"], {
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    }),
  );
  const m = A.metrics(A.select(d));
  for (const [js, py] of Object.entries({ flights: "flights", cargo: "cargo" }))
    assert.equal(m[js], p.table_rows[py]);
  for (const [js, py] of Object.entries({
    onTime: "flight_on_time",
    manifest: "manifest_error_cargo",
    rework: "cargo_with_rework",
    storage: "storage_compliant_cargo",
    affected: "cargo_with_inconsistency",
    pieces: "received_pieces",
    kg: "received_weight_kg",
    dwell: "avg_hours_arrival_to_delivery",
    depot: "avg_hours_arrival_to_depositary",
    postDepot: "avg_hours_depositary_to_closure",
    closure: "avg_hours_arrival_to_closure_per_flight",
    resolution: "avg_occurrence_resolution_hours",
  }))
    assert.ok(Math.abs(m[js] - p[py]) < 0.001, js);
});
test("all combinations preserve distinct grains and sums", () => {
  for (const month of ["all", "2026-01", "2026-02", "2026-03"])
    for (const airline of ["all", ...new Set(d.flights.map((f) => f.airline))])
      for (const type of [
        "all",
        ...new Set(d.cargo.map((c) => c.cargo_type)),
      ]) {
        const s = A.select(d, { month, airline, type });
        assert.equal(
          s.cargo.length,
          new Set(s.cargo.map((c) => c.cargo_id)).size,
        );
        assert.equal(
          s.flights.length,
          new Set(s.flights.map((f) => f.flight_id)).size,
        );
        const raw = d.cargo.filter((c) => {
          const f = d.flightMap.get(c.flight_id);
          return (
            (month === "all" ||
              f.aircraft_arrival_datetime.startsWith(month)) &&
            (airline === "all" || f.airline === airline) &&
            (type === "all" || c.cargo_type === type)
          );
        });
        assert.deepEqual(
          new Set(s.cargo.map((c) => c.cargo_id)),
          new Set(raw.map((c) => c.cargo_id)),
        );
        assert.ok(
          Math.abs(
            A.metrics(s).kg -
              raw.reduce((n, c) => n + Number(c.received_weight_kg), 0),
          ) < 1e-6,
        );
      }
});
test("timestamp boundary ignores misleading text and avoids timezone shift", () => {
  const f = {
    aircraft_arrival_datetime: "2026-01-01 00:00",
    legal_deadline_datetime: "2026-01-01 12:00",
    mantra_closure_datetime: "2026-01-01 12:00",
    closure_compliance_status: "Fora",
  };
  assert.equal(A.onTime(f), true);
  assert.equal(
    A.onTime({
      ...f,
      mantra_closure_datetime: "2026-01-01 12:01",
      closure_compliance_status: "Dentro",
    }),
    false,
  );
  assert.equal(A.hours("2026-01-01 23:00", "2026-01-02 01:30"), 2.5);
  assert.equal(
    d.flights.filter(
      (f) =>
        f.closure_compliance_status === "Próximo ao limite" && !A.onTime(f),
    ).length,
    41,
  );
});
test("empty selection has undefined rates and means, zero sums", () => {
  const m = A.metrics(A.select(d, { month: "2030-01" }));
  assert.equal(m.cargo, 0);
  assert.equal(m.dwell, null);
  assert.equal(m.kg, 0);
});
test("CSV handles BOM quotes CRLF and rejects malformed records", () => {
  assert.deepEqual(
    A.parseCsv('\uFEFFa,b\r\n"hello, ""cargo""","line\nbreak"\r\n'),
    [{ a: 'hello, "cargo"', b: "line\nbreak" }],
  );
  assert.throws(() => A.parseCsv("a,b\n1"));
  assert.throws(() => A.parseCsv('a,b\n"bad,2'));
});
test("one-to-one duplicates fail instead of silently overwriting", () => {
  const raw = load();
  raw.operations[1].cargo_id = raw.operations[0].cargo_id;
  assert.throws(() => A.prepare(raw), /1:1/);
});
test("table search, filters, numeric sorting and CSV preserve exact selection", () => {
  const rows = A.explore(d.rows, {
    query: "Atlas",
    quality: "manifest",
    sort: "dwell",
    direction: "desc",
  });
  assert.ok(rows.length > 0);
  assert.ok(
    rows.every(
      (r) => r.airline.includes("Atlas") && r.manifest_error === "Sim",
    ),
  );
  assert.ok(rows.every((r, i) => !i || r.dwell <= rows[i - 1].dwell));
  const exported = A.parseCsv(A.csv(rows));
  assert.deepEqual(
    exported.map((r) => r.cargo_id),
    rows.map((r) => r.cargo_id),
  );
  assert.ok(A.csv([{ cargo_id: "=SUM(A1)" }]).includes("'=SUM(A1)"));
});
test("decimal weight sorting compares numeric values", () => {
  const rows = [9.9, 9.11, 100.1].map((kg, i) => ({
    ...d.rows[i],
    received_weight_kg: String(kg),
  }));
  assert.deepEqual(
    A.explore(rows, { sort: "received_weight_kg" }).map(
      (r) => r.received_weight_kg,
    ),
    ["9.11", "9.9", "100.1"],
  );
});

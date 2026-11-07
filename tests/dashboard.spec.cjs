const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const A = require("../assets/analytics.js");
const data = A.prepare(
  Object.fromEntries(
    A.FILES.map((n) => [
      n,
      A.parseCsv(fs.readFileSync("data/processed/csv/" + n + ".csv", "utf8")),
    ]),
  ),
);
const sizes = [
  ["desktop", 1920, 1080],
  ["notebook", 1366, 768],
  ["tablet", 768, 1024],
  ["mobile", 390, 844],
];
for (const [name, width, height] of sizes)
  test(
    name + " navigation, charts, accessibility and layout",
    async ({ page }) => {
      await page.setViewportSize({ width, height });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("response", (r) => {
        if (r.status() >= 400) errors.push(r.url() + ": " + r.status());
      });
      await page.goto("./");
      await expect(page.locator("#scope")).toContainText("1.111 AWBs");
      for (const view of [
        "overview",
        "performance",
        "quality",
        "bottlenecks",
        "explore",
        "methodology",
      ]) {
        if (width < 701) await page.locator("#mobile-nav").selectOption(view);
        else await page.locator('[data-view="' + view + '"]').click();
        await expect(page.locator("#view")).toHaveAttribute(
          "aria-busy",
          "false",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy();
        if (view !== "explore" && view !== "methodology")
          expect(
            await page.locator("#view .chart svg").count(),
          ).toBeGreaterThan(0);
        await page.screenshot({
          path:
            (process.env.SCREENSHOT_DIR || "../outputs") +
            "/after-" +
            name +
            "-" +
            view +
            ".png",
          fullPage: true,
        });
        const a = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          a.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
      }
      expect(errors).toEqual([]);
    },
  );
test("filters reconcile with original CSV, table, export, drilldown and keyboard", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator("#scope")).toContainText("1.111");
  for (const f of [
    { month: "2026-02", airline: "all", type: "all" },
    { month: "2026-01", airline: "Atlas Air", type: "Geral" },
    { month: "2026-03", airline: "all", type: "DGR" },
  ]) {
    await page.locator("#filter-month").selectOption(f.month);
    await page.locator("#filter-airline").selectOption(f.airline);
    await page.locator("#filter-type").selectOption(f.type);
    const s = A.select(data, f),
      m = A.metrics(s);
    await expect(page.locator("#scope")).toContainText(
      m.flights + " voos / " + m.cargo + " AWBs",
    );
    await expect(page.locator("#kpi-compliance")).toHaveText(
      ((100 * m.onTime) / m.flights).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + "%",
    );
  }
  await page.locator("#reset").click();
  await page.locator("[data-flight]").first().click();
  await expect(page.locator("#flight-select")).not.toHaveValue("all");
  const fid = await page.locator("#flight-select").inputValue();
  const expected = data.rows.filter((r) => r.flight_id === fid).length;
  await expect(page.locator("#table-summary")).toContainText(
    expected + " AWBs",
  );
  await page.locator("#reset").click();
  await page.locator("#quality-select").selectOption("manifest");
  await page.locator("#search").fill("Atlas");
  const expectedRows = A.explore(data.rows, {
    quality: "manifest",
    query: "Atlas",
  });
  await expect(page.locator("#table-summary")).toContainText(
    expectedRows.length + " AWBs",
  );
  await page.locator('[data-sort="dwell"]').click();
  await expect(page.locator('th[data-key="dwell"]')).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  const download = page.waitForEvent("download");
  await page.locator("#download-csv").click();
  const dl = await download;
  const exported = A.parseCsv(fs.readFileSync(await dl.path(), "utf8"));
  expect(exported).toHaveLength(expectedRows.length);
  expect(new Set(exported.map((r) => r.cargo_id))).toEqual(
    new Set(expectedRows.map((r) => r.cargo_id)),
  );
  await page.locator("[data-cargo]").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#detail")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#detail")).not.toBeVisible();
  await page.locator("#search").fill("not-a-real-awb");
  await expect(page.locator("#cargo-table")).toContainText("Nenhuma carga");
  await expect(page.locator("#download-csv")).toBeDisabled();
  await page.locator("#reset").click();
  await page.locator("#next").click();
  await expect(page.locator("#table-summary")).toContainText("Página 2");
  await page.locator("#prev").click();
  await expect(page.locator("#table-summary")).toContainText("Página 1");
});
test("loading, HTTP error and retry", async ({ page }) => {
  await page.route("**/flights.csv", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("./");
  await expect(page.locator("#status")).toContainText("HTTP 503");
  await expect(page.locator("#retry")).toBeVisible();
  await page.unroute("**/flights.csv");
  await page.locator("#retry").click();
  await expect(page.locator("#scope")).toContainText("1.111 AWBs");
});
test("empty global intersection and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#scope")).toContainText("1.111");
  await page
    .locator("#filter-month")
    .evaluate((el) => el.add(new Option("Sem dados", "2030-01")));
  await page.locator("#filter-month").selectOption("2030-01");
  await expect(page.locator("#scope")).toHaveText(
    "0 voos / 0 AWBs / 0 ocorrências",
  );
  await expect(page.locator("#kpi-compliance")).toHaveText("—");
  await expect(page.locator("#view")).toContainText("Não há observações");
  await page.locator("#reset").click();
  await expect(page.locator("#scope")).toContainText("1.111");
});
test("analysis URL restores global filters and exploration state", async ({
  page,
}) => {
  await page.goto(
    "./?month=2026-02&airline=Atlas+Air&q=Geral&quality=manifest#explore",
  );
  await expect(page.locator("#filter-month")).toHaveValue("2026-02");
  await expect(page.locator("#filter-airline")).toHaveValue("Atlas Air");
  await expect(page.locator("#search")).toHaveValue("Geral");
  await expect(page.locator("#quality-select")).toHaveValue("manifest");
  const expected = A.explore(
    A.select(data, { month: "2026-02", airline: "Atlas Air" }).cargo,
    { query: "Geral", quality: "manifest" },
  );
  await expect(page.locator("#table-summary")).toContainText(
    expected.length + " AWBs",
  );
  await page.reload();
  await expect(page.locator("#table-summary")).toContainText(
    expected.length + " AWBs",
  );
});

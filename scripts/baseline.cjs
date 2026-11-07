const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chromium" });
  for (const [name, width, height] of [
    ["desktop", 1920, 1080],
    ["mobile", 390, 844],
  ]) {
    const p = await b.newPage({ viewport: { width, height } });
    await p.goto("http://localhost:8000");
    await p.locator("#kpi-cargo").filter({ hasText: "1.111" }).waitFor();
    await p.screenshot({
      path: "../outputs/before-" + name + ".png",
      fullPage: true,
    });
    await p.close();
  }
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

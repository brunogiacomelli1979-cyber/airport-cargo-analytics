const fs = require("node:fs");
fs.mkdirSync("assets/vendor", { recursive: true });
for (const [source, target] of [
  ["dist/echarts.min.js", "echarts.min.js"],
  ["LICENSE", "ECHARTS-LICENSE.txt"],
  ["NOTICE", "ECHARTS-NOTICE.txt"],
])
  fs.copyFileSync("node_modules/echarts/" + source, "assets/vendor/" + target);

fs.copyFileSync(
  "node_modules/zrender/LICENSE",
  "assets/vendor/ZRENDER-LICENSE.txt",
);
fs.copyFileSync(
  "node_modules/tslib/LICENSE.txt",
  "assets/vendor/TSLIB-LICENSE.txt",
);

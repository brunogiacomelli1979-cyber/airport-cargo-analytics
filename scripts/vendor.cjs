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

// Canonical line endings keep license verification reproducible on Windows/Linux.
for (const name of fs.readdirSync("assets/vendor").filter(name => name.endsWith(".txt"))) {
  const target = "assets/vendor/" + name;
  fs.writeFileSync(target, fs.readFileSync(target,"utf8").replace(/\r\n/g,"\n"));
}

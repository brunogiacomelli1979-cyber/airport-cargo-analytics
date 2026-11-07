const fs = require("node:fs");
fs.mkdirSync("dist", { recursive: true });
for (const path of ["index.html", "assets", "data/processed/csv"]) {
  fs.cpSync(path, "dist/" + path, { recursive: true });
}
fs.writeFileSync("dist/.nojekyll", "");

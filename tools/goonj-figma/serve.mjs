/**
 * Serves the captured page (out/) to the Figma plugin while it builds.
 * Keep this running, then run the plugin in Figma.
 *
 *   node serve.mjs   →  http://localhost:4545
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const PORT = 4545;
const OUT = path.resolve("out");
const LOGO = path.resolve("../../apps/web/public/goonj/goonj-logo-script.svg");
const TYPES = { ".json": "application/json", ".jpg": "image/jpeg", ".gif": "image/gif" };

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (url === "/data.json") {
      const data = JSON.parse(fs.readFileSync(path.join(OUT, "data.json"), "utf8"));
      data.nav.logoSvg = fs.readFileSync(LOGO, "utf8");
      const anims = path.join(OUT, "anims.json");
      data.anims = fs.existsSync(anims) ? JSON.parse(fs.readFileSync(anims, "utf8")) : [];
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(data));
    }
    const file = path.join(OUT, path.normalize(url).replace(/^(\.\.[/\\])+/, ""));
    if (!file.startsWith(OUT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      return res.end("not found");
    }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Serving the Goonj capture on http://localhost:${PORT} (Ctrl+C to stop)`));

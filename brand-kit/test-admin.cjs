const puppeteer = require("puppeteer");
const http = require("http");
const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "../dist");

const server = http.createServer((req, res) => {
  let filePath = path.join(distDir, req.url === "/" || req.url === "/admin" ? "index.html" : req.url);
  if (!fs.existsSync(filePath)) filePath = path.join(distDir, "index.html");
  const ext = path.extname(filePath);
  const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(5199, async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", msg => console.log("CONSOLE:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));

  await page.goto("http://localhost:5199/admin", { waitUntil: "networkidle0", timeout: 15000 }).catch(e => console.log("NAV:", e.message));
  await new Promise(r => setTimeout(r, 2000));

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log("BODY TEXT:", JSON.stringify(bodyText.substring(0, 500)));

  await browser.close();
  server.close();
});

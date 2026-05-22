const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

  const filePath = "file://" + path.resolve(__dirname, "slides.html").replace(/\\/g, "/");
  await page.goto(filePath, { waitUntil: "networkidle0" });

  const slides = await page.$$(".slide");
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({ path: path.join(__dirname, `slide-${i + 1}.png`) });
    console.log(`Saved slide-${i + 1}.png`);
  }

  await browser.close();
})();

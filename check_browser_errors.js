import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on("console", (msg) => console.log(`[Browser Console]: ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[Browser Error]: ${err.message}`));

  try {
    await page.goto("http://localhost:5173/fashion-stylist", { waitUntil: "networkidle" });
    console.log("Page loaded successfully.");
  } catch (e) {
    console.error("Failed to load page:", e);
  } finally {
    await browser.close();
  }
}

run();

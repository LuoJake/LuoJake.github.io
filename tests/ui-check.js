const { chromium } = require("playwright");

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.GARDEN_URL || "http://127.0.0.1:4173";

async function check(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const errors = [];
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", error => errors.push(`${viewport.name}: ${error.message}`));

    await page.goto(`${baseUrl}/#/`, { waitUntil: "networkidle" });
    await check(await page.locator(".entry-card").count() === 8, `${viewport.name}: 首页内容数量异常`);
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    await check(dimensions.scroll <= dimensions.client, `${viewport.name}: 页面存在横向溢出 ${JSON.stringify(dimensions)}`);

    await page.locator(".entry-card").first().click();
    await check(await page.locator(".article-body blockquote").count() === 1, `${viewport.name}: 文章正文未渲染`);

    await page.goto(`${baseUrl}/#/studio`, { waitUntil: "networkidle" });
    await check(await page.locator(".toastui-editor-defaultUI").count() === 1, `${viewport.name}: 可视化编辑器未加载`);
    await page.locator(".import-panel summary").click();
    await page.locator("#importText").fill("第一条旧笔记\n内容一\n\n第二条旧笔记\n内容二");
    await page.locator("#detectImport").click();
    await check(await page.locator(".detected-item").count() === 2, `${viewport.name}: 批量识别结果异常`);
    await page.close();
  }

  await browser.close();
  if (errors.length) throw new Error(`页面脚本错误：\n${errors.join("\n")}`);
  console.log("UI checks passed: desktop and mobile layouts, article rendering, editor, and bulk import.");
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});

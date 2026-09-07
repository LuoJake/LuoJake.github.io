const { chromium } = require("playwright");

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.GARDEN_URL || "http://127.0.0.1:4173";
const localAuthoring = ["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname);

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
    await check(await page.locator(".entry-card").count() === 9, `${viewport.name}: 首页内容数量异常`);
    await check(await page.locator("#dailyText").innerText() !== "", `${viewport.name}: 每日自省未显示`);
    const firstDailyQuote = await page.locator("#dailyText").innerText();
    await page.locator("#nextQuote").click();
    await check(await page.locator("#dailyText").innerText() !== firstDailyQuote, `${viewport.name}: 每日自省无法翻页`);
    await page.locator("#randomPost").click();
    await page.locator(".article-head").waitFor();
    await check(new URL(page.url()).hash.startsWith("#/post/"), `${viewport.name}: 随机阅读没有进入文章`);
    await page.goto(`${baseUrl}/#/`, { waitUntil: "networkidle" });
    const studioEnabled = await page.locator('[data-nav="studio"]').evaluate(node => !node.hidden);
    await check(studioEnabled === localAuthoring, `${viewport.name}: 写作台入口权限状态异常`);
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    await check(dimensions.scroll <= dimensions.client, `${viewport.name}: 页面存在横向溢出 ${JSON.stringify(dimensions)}`);

    await page.locator(".entry-card .tag").first().click();
    await check(await page.locator(".tag-list a.active").count() === 1, `${viewport.name}: 标签专题没有激活`);
    await check(await page.locator(".timeline-item").count() > 0, `${viewport.name}: 标签专题没有匹配内容`);

    await page.goto(`${baseUrl}/#/library`, { waitUntil: "networkidle" });
    await check(await page.locator(".source-card").count() === 5, `${viewport.name}: 人物与书籍数量异常`);
    await page.locator(".source-card").first().click();
    await page.locator(".source-profile-title").waitFor();
    await check(await page.locator(".source-content .entry-card").count() > 0, `${viewport.name}: 人物详情没有关联文章`);

    await page.goto(`${baseUrl}/#/`, { waitUntil: "networkidle" });
    await page.locator('.entry-main[href="#/post/price-and-value"]').click();
    await page.locator(".article-body blockquote").waitFor();
    await check(await page.locator(".article-body blockquote").count() === 1, `${viewport.name}: 文章正文未渲染`);

    await page.goto(`${baseUrl}/#/post/circle-of-competence`, { waitUntil: "networkidle" });
    await check(await page.locator(".viewpoint-status.considered").innerText() === "暂时认同", `${viewport.name}: 观点状态未显示`);
    await check((await page.locator(".review-date").innerText()).includes("2027年3月1日"), `${viewport.name}: 复查日期未显示`);
    await check(await page.locator(".reflection-item").count() === 1, `${viewport.name}: 观点演进记录未显示`);
    await check(await page.locator(".stance.supplement").innerText() === "补充", `${viewport.name}: 回看态度未显示`);

    await page.goto(`${baseUrl}/#/studio`, { waitUntil: "networkidle" });
    if (localAuthoring) {
      await check(await page.locator(".toastui-editor-defaultUI").count() === 1, `${viewport.name}: 可视化编辑器未加载`);
      await page.locator("#postTitle").fill("长期投资中的风险与决策");
      await page.locator("#postViewpointStatus").selectOption("considered");
      await page.locator("#postReviewDate").fill("2027-03-01");
      await page.locator("#recommendTags").click();
      await check(await page.locator(".suggestion-chip").count() >= 2, `${viewport.name}: 标签推荐结果不足`);
      await page.locator('[data-suggested-tag="投资理财"]').click();
      await check((await page.locator("#postTags").inputValue()).includes("投资理财"), `${viewport.name}: 推荐标签没有写入`);
      await page.locator(".import-panel summary").click();
      await page.locator("#importText").fill("第一条旧笔记\n内容一\n\n第二条旧笔记\n内容二");
      await page.locator("#splitMode").selectOption("paragraph");
      await page.locator("#detectImport").click();
      await check(await page.locator(".detected-item").count() === 2, `${viewport.name}: 批量识别结果异常`);
      await check(await page.evaluate(() => Boolean(window.pdfjsLib)), `${viewport.name}: PDF 解析组件未加载`);
      await page.locator("#importFile").setInputFiles({ name: "quotes.txt", mimeType: "text/plain", buffer: Buffer.from("长期投资需要耐心与纪律，也需要在市场喧闹时保持独立判断。\n每天持续学习，才能让今天的自己比昨天更有智慧。", "utf8") });
      await check(await page.locator(".detected-item").count() >= 2, `${viewport.name}: 文件短句发现异常`);
      if (viewport.name === "desktop" && process.env.PDF_FIXTURE) {
        await page.locator("#importFile").setInputFiles(process.env.PDF_FIXTURE);
        await page.locator("#importFileName").filter({ hasText: "发现" }).waitFor({ timeout: 60000 });
        await check(await page.locator(".detected-item").count() > 0, `${viewport.name}: PDF 未发现候选短句`);
      }
    } else {
      await check(await page.locator(".toastui-editor-defaultUI").count() === 0, `${viewport.name}: 公网页面不应加载写作台`);
    }
    await page.close();
  }

  await browser.close();
  if (errors.length) throw new Error(`页面脚本错误：\n${errors.join("\n")}`);
  console.log("UI checks passed: desktop and mobile layouts, article rendering, editor, and bulk import.");
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});

(function () {
  const app = document.getElementById("app");
  const posts = window.GARDEN_POSTS || [];
  const dailyQuotes = window.DAILY_QUOTES || [];
  const sources = window.GARDEN_SOURCES || [];
  let editor = null;
  let activeFilter = "all";
  let archiveTag = "all";
  const authoringAllowed = ["localhost", "127.0.0.1"].includes(location.hostname);
  const today = new Date();
  const localDayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
  let dailyQuoteIndex = dailyQuotes.length ? localDayNumber % dailyQuotes.length : 0;

  const typeLabels = { quote: "书摘", note: "随笔", article: "长文" };
  const typeIcons = { quote: "quote", note: "feather", article: "file-text" };

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function renderMarkdown(markdown) {
    if (!window.marked || !window.DOMPurify) return `<pre>${escapeHtml(markdown)}</pre>`;
    return DOMPurify.sanitize(marked.parse(markdown));
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`));
  }

  function tagUrl(tag) {
    return `#/archive/tag/${encodeURIComponent(tag)}`;
  }

  function toast(message) {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
  }

  function refreshIcons() {
    if (window.lucide) lucide.createIcons();
  }

  function setActiveNav(name) {
    document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("active", a.dataset.nav === name));
    document.querySelector(".primary-nav").classList.remove("open");
  }

  function card(post) {
    return `<article class="entry-card ${post.featured ? "featured" : ""}">
      <a class="entry-main" href="#/post/${post.id}"><span class="entry-type"><i data-lucide="${typeIcons[post.type]}"></i>${typeLabels[post.type]}</span><h3>${escapeHtml(post.title)}</h3><p class="summary">${escapeHtml(post.summary)}</p></a>
      <div class="entry-meta"><span>${escapeHtml(post.author)}</span><span>·</span><time>${formatDate(post.date)}</time>${post.tags.slice(0, 2).map(tag => `<a class="tag" href="${tagUrl(tag)}">${escapeHtml(tag)}</a>`).join("")}</div>
    </article>`;
  }

  function renderHome() {
    setActiveNav("home");
    app.innerHTML = `<section class="intro-band">
      <div class="page-shell intro-inner">
        <div><p class="eyebrow">JAKE'S NOTES & ESSAYS</p><h1>收藏值得反复阅读的句子，安放<em>持续生长</em>的思考。</h1><p class="intro-copy">这里不追赶信息，只整理那些经得起时间的判断。</p></div>
        <aside class="today-note"><div class="daily-head"><span id="dailyTheme">每日自省</span><div class="daily-controls"><button id="previousQuote" aria-label="上一条" title="上一条"><i data-lucide="chevron-left"></i></button><span id="dailyCount"></span><button id="nextQuote" aria-label="下一条" title="下一条"><i data-lucide="chevron-right"></i></button></div></div><blockquote id="dailyText"></blockquote><cite id="dailyAuthor"></cite></aside>
      </div>
    </section>
    <section class="control-band"><div class="page-shell controls">
      <div class="search-box"><i data-lucide="search"></i><input id="searchInput" type="search" placeholder="搜索标题、正文、作者或标签" autocomplete="off"><button id="searchClear" class="search-clear" aria-label="清除搜索"><i data-lucide="x"></i></button></div>
      <div class="filter-tabs" role="tablist">${[["all","全部"],["quote","书摘"],["note","随笔"],["article","长文"]].map(([id,label]) => `<button data-filter="${id}" class="${activeFilter === id ? "active" : ""}">${label}</button>`).join("")}</div>
    </div></section>
    <section class="page-shell content-section"><div class="section-head"><h2>最近更新</h2><p id="resultCount">共 ${posts.length} 篇</p></div><div class="content-grid" id="contentGrid"></div></section>`;
    const grid = document.getElementById("contentGrid");
    const search = document.getElementById("searchInput");
    const clear = document.getElementById("searchClear");
    function updateDailyQuote() {
      const quote = dailyQuotes[dailyQuoteIndex];
      if (!quote) return;
      document.getElementById("dailyTheme").textContent = quote.theme || "每日自省";
      document.getElementById("dailyText").textContent = `“${quote.text}”`;
      document.getElementById("dailyAuthor").textContent = quote.author || "每日自省";
      document.getElementById("dailyCount").textContent = `${dailyQuoteIndex + 1} / ${dailyQuotes.length}`;
    }
    function turnDailyQuote(direction) {
      dailyQuoteIndex = (dailyQuoteIndex + direction + dailyQuotes.length) % dailyQuotes.length;
      updateDailyQuote();
    }
    document.getElementById("previousQuote").addEventListener("click", () => turnDailyQuote(-1));
    document.getElementById("nextQuote").addEventListener("click", () => turnDailyQuote(1));
    function update() {
      const q = search.value.trim().toLowerCase();
      const visible = posts.filter(p => (activeFilter === "all" || p.type === activeFilter) && (!q || [p.title, p.author, p.summary, p.body, ...p.tags].join(" ").toLowerCase().includes(q)));
      grid.innerHTML = visible.length ? visible.map(card).join("") : `<div class="empty-state"><i data-lucide="search-x"></i><p>没有找到相关内容，换个关键词试试。</p></div>`;
      document.getElementById("resultCount").textContent = `共 ${visible.length} 篇`;
      clear.style.display = q ? "block" : "none";
      refreshIcons();
    }
    search.addEventListener("input", update);
    clear.addEventListener("click", () => { search.value = ""; update(); search.focus(); });
    document.querySelectorAll("[data-filter]").forEach(btn => btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(x => x.classList.toggle("active", x === btn));
      update();
    }));
    updateDailyQuote();
    update();
  }

  function renderPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) { renderNotFound(); return; }
    setActiveNav("");
    app.innerHTML = `<article class="article-shell">
      <a class="back-link" href="#/"><i data-lucide="arrow-left"></i>返回阅读</a>
      <header class="article-head"><span class="entry-type"><i data-lucide="${typeIcons[post.type]}"></i>${typeLabels[post.type]}</span><h1>${escapeHtml(post.title)}</h1><div class="article-info"><span>${escapeHtml(post.author)}</span><time>${formatDate(post.date)}</time>${post.tags.map(t => `<a class="tag" href="${tagUrl(t)}">${escapeHtml(t)}</a>`).join("")}</div></header>
      <div class="article-body">${renderMarkdown(post.body)}</div>
      <div class="source-box"><strong>出处说明：</strong> ${escapeHtml(post.source)} ${post.sourceUrl ? `<a href="${escapeHtml(post.sourceUrl)}" target="_blank" rel="noopener">查看原始来源</a>` : ""}</div>
    </article>`;
    window.scrollTo(0, 0);
    refreshIcons();
  }

  function renderArchive(selectedTag = archiveTag) {
    setActiveNav("archive");
    archiveTag = selectedTag;
    const allTags = [...new Set(posts.flatMap(p => p.tags))];
    const visible = archiveTag === "all" ? posts : posts.filter(p => p.tags.includes(archiveTag));
    const groups = visible.reduce((acc, post) => { const y = post.date.slice(0, 4); (acc[y] ||= []).push(post); return acc; }, {});
    app.innerHTML = `<div class="page-shell archive-layout"><aside class="archive-sidebar"><h1>${archiveTag === "all" ? "归档" : escapeHtml(archiveTag)}</h1><p>${visible.length} 篇文字，${allTags.length} 个标签</p><div class="tag-list"><a href="#/archive" class="${archiveTag === "all" ? "active" : ""}">全部</a>${allTags.map(t => `<a href="${tagUrl(t)}" class="${archiveTag === t ? "active" : ""}">${escapeHtml(t)}<small>${posts.filter(p => p.tags.includes(t)).length}</small></a>`).join("")}</div></aside><section>${Object.keys(groups).sort().reverse().map(year => `<div class="timeline-group"><h2 class="timeline-year">${year}</h2>${groups[year].map(p => `<a class="timeline-item" href="#/post/${p.id}"><time>${p.date.slice(5).replace("-", "/")}</time><strong>${escapeHtml(p.title)}</strong><span>${typeLabels[p.type]}</span></a>`).join("")}</div>`).join("") || `<div class="empty-state">这个标签下还没有内容。</div>`}</section></div>`;
    refreshIcons();
  }

  function relatedPosts(sourceId) {
    return posts.filter(post => (post.relatedSources || []).includes(sourceId));
  }

  function renderLibrary() {
    setActiveNav("library");
    const people = sources.filter(source => source.type === "person");
    const books = sources.filter(source => source.type === "book");
    const sourceCards = items => items.map(source => {
      const count = relatedPosts(source.id).length;
      return `<a class="source-card" href="#/source/${encodeURIComponent(source.id)}"><span class="source-mark"><i data-lucide="${source.type === "person" ? "user-round" : "book-open"}"></i></span><div><span class="source-kind">${source.type === "person" ? "人物" : "书籍 / 文集"}</span><h3>${escapeHtml(source.name)}</h3><p>${escapeHtml(source.subtitle || source.intro)}</p><div class="source-themes">${(source.themes || []).map(theme => `<span>${escapeHtml(theme)}</span>`).join("")}</div><small>${count} 篇相关内容</small></div></a>`;
    }).join("");
    app.innerHTML = `<div class="page-shell library-shell"><header class="library-head"><p class="eyebrow">PEOPLE & BOOKS</p><h1>人物与书籍</h1><p>从一个人或一本书出发，重新找到散落在不同时间里的摘录与思考。</p></header><section class="source-section"><div class="section-head"><h2>人物</h2><p>${people.length} 位</p></div><div class="source-grid">${sourceCards(people)}</div></section><section class="source-section"><div class="section-head"><h2>书籍与文集</h2><p>${books.length} 本</p></div><div class="source-grid">${sourceCards(books)}</div></section></div>`;
    refreshIcons();
  }

  function renderSource(id) {
    const source = sources.find(item => item.id === id);
    if (!source) { renderNotFound(); return; }
    setActiveNav("library");
    const sourcePosts = relatedPosts(source.id);
    const sourceQuotes = dailyQuotes.filter(quote => quote.sourceId === source.id);
    app.innerHTML = `<div class="source-profile"><div class="page-shell source-profile-inner"><a class="back-link" href="#/library"><i data-lucide="arrow-left"></i>返回人物与书籍</a><div class="source-profile-title"><span class="source-mark large"><i data-lucide="${source.type === "person" ? "user-round" : "book-open"}"></i></span><div><span class="source-kind">${source.type === "person" ? "人物" : "书籍 / 文集"}</span><h1>${escapeHtml(source.name)}</h1><p>${escapeHtml(source.subtitle || "")}</p></div></div><p class="source-intro">${escapeHtml(source.intro)}</p><div class="source-themes">${(source.themes || []).map(theme => posts.some(post => post.tags.includes(theme)) ? `<a href="${tagUrl(theme)}">${escapeHtml(theme)}</a>` : `<span>${escapeHtml(theme)}</span>`).join("")}</div></div></div><div class="page-shell source-content">${sourceQuotes.length ? `<section class="source-quotes"><div class="section-head"><h2>每日自省收录</h2><p>${sourceQuotes.length} 条</p></div>${sourceQuotes.map(quote => `<blockquote>“${escapeHtml(quote.text)}”<cite>${escapeHtml(quote.author)}</cite></blockquote>`).join("")}</section>` : ""}<section><div class="section-head"><h2>相关文章与书摘</h2><p>${sourcePosts.length} 篇</p></div><div class="content-grid">${sourcePosts.length ? sourcePosts.map(card).join("") : `<div class="empty-state"><i data-lucide="notebook-pen"></i><p>还没有关联内容，可以从管理后台添加第一篇。</p></div>`}</div></section></div>`;
    window.scrollTo(0, 0);
    refreshIcons();
  }

  function parseTags(value) {
    return [...new Set(value.split(/[,，]/).map(x => x.trim()).filter(Boolean))];
  }

  function recommendTags(title, body, type) {
    const text = `${title}\n${body}`.toLowerCase();
    const rules = {
      "投资理财": ["投资", "股票", "市场", "企业", "公司", "价格", "价值", "资本", "估值", "现金流", "巴菲特", "芒格", "复利", "持有"],
      "个人思考": ["我", "自己", "思考", "感受", "认为", "生活", "经历", "成长", "提醒", "理解"],
      "阅读摘录": ["摘录", "引用", "原文", "作者", "书中", "读到", "这句话"],
      "长期主义": ["长期", "时间", "耐心", "复利", "持有", "等待", "永远"],
      "决策方法": ["决策", "判断", "选择", "能力圈", "机会成本", "反过来", "方法"],
      "风险管理": ["风险", "安全边际", "损失", "负债", "不确定", "错误", "缓冲"],
      "情绪与纪律": ["情绪", "恐惧", "贪婪", "纪律", "冲动", "冷静", "性情"]
    };
    const scores = Object.entries(rules).map(([tag, words]) => ({ tag, score: words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0) }));
    if (type === "quote") scores.find(x => x.tag === "阅读摘录").score += 2;
    if (type === "note") scores.find(x => x.tag === "个人思考").score += 2;
    if (type === "article") scores.find(x => x.tag === "个人思考").score += 1;
    return scores.filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(x => x.tag);
  }

  function renderTagSuggestions() {
    const tagsInput = document.getElementById("postTags");
    const selected = parseTags(tagsInput.value);
    const suggestions = recommendTags(document.getElementById("postTitle").value, editor.getMarkdown(), document.getElementById("postType").value);
    const node = document.getElementById("tagSuggestions");
    node.innerHTML = suggestions.map(tag => `<button type="button" class="suggestion-chip ${selected.includes(tag) ? "active" : ""}" data-suggested-tag="${escapeHtml(tag)}"><i data-lucide="${selected.includes(tag) ? "check" : "plus"}"></i>${escapeHtml(tag)}</button>`).join("") || `<span>暂时没有匹配项，可以继续使用自定义标签。</span>`;
    node.querySelectorAll("[data-suggested-tag]").forEach(button => button.addEventListener("click", () => {
      const current = parseTags(tagsInput.value);
      const tag = button.dataset.suggestedTag;
      tagsInput.value = current.includes(tag) ? current.filter(x => x !== tag).join("，") : [...current, tag].join("，");
      renderTagSuggestions();
    }));
    refreshIcons();
  }

  function getDrafts() {
    try { return JSON.parse(localStorage.getItem("jake-garden-drafts") || "[]"); } catch { return []; }
  }

  function saveDrafts(drafts) { localStorage.setItem("jake-garden-drafts", JSON.stringify(drafts)); }

  function slugify(text) {
    const ascii = text.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
    return ascii || `note-${Date.now()}`;
  }

  function exportMarkdown() {
    const title = document.getElementById("postTitle").value.trim() || "未命名文字";
    const type = document.getElementById("postType").value;
    const author = document.getElementById("postAuthor").value.trim() || "Jake";
    const source = document.getElementById("postSource").value.trim();
    const relatedSource = document.getElementById("postRelatedSource").value;
    const tags = parseTags(document.getElementById("postTags").value);
    const md = editor.getMarkdown();
    const summary = md.replace(/^#+\s+/gm, "").replace(/^>\s?/gm, "").replace(/[*_`\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 100);
    const frontmatter = `---\ntitle: ${JSON.stringify(title)}\ntype: ${type}\nauthor: ${JSON.stringify(author)}\ndate: ${new Date().toISOString().slice(0,10)}\ntags: ${JSON.stringify(tags.length ? tags : ["待整理"])}\nrelatedSources: ${JSON.stringify(relatedSource ? [relatedSource] : [])}\nsummary: ${JSON.stringify(summary || title)}\nfeatured: false\nsource: ${JSON.stringify(source)}\nsourceUrl: ""\n---\n\n`;
    const blob = new Blob([frontmatter + md], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `${slugify(title)}.md`; link.click();
    URL.revokeObjectURL(link.href);
    toast("Markdown 文件已导出");
  }

  function renderDraftList() {
    const list = document.getElementById("draftList");
    const drafts = getDrafts();
    list.innerHTML = drafts.length ? drafts.sort((a,b) => b.updated.localeCompare(a.updated)).map(d => `<button class="draft-item" data-draft="${d.id}"><strong>${escapeHtml(d.title || "未命名文字")}</strong><small>${new Date(d.updated).toLocaleString("zh-CN")} · ${typeLabels[d.type]}</small></button>`).join("") : `<p class="studio-note">还没有保存在这台浏览器里的草稿。</p>`;
    list.querySelectorAll("[data-draft]").forEach(btn => btn.addEventListener("click", () => {
      const draft = getDrafts().find(d => d.id === btn.dataset.draft);
      if (!draft) return;
      document.getElementById("draftId").value = draft.id; document.getElementById("postTitle").value = draft.title; document.getElementById("postType").value = draft.type; document.getElementById("postAuthor").value = draft.author || "Jake"; document.getElementById("postTags").value = draft.tags; document.getElementById("postSource").value = draft.source || ""; document.getElementById("postRelatedSource").value = draft.relatedSource || ""; editor.setMarkdown(draft.body); toast("草稿已打开");
    }));
  }

  function splitImportedText(text, mode) {
    const clean = text.replace(/\r/g, "").trim();
    if (!clean) return [];
    let chunks;
    if (mode === "candidate") {
      const keywords = ["价值", "价格", "投资", "市场", "企业", "风险", "选择", "思考", "时间", "长期", "习惯", "努力", "智慧", "学习", "人生", "自由", "纪律", "错误", "决策", "机会"];
      const seen = new Set();
      return clean.replace(/([。！？!?；;])/g, "$1\n").split(/\n+/).map(sentence => sentence.replace(/\s+/g, " ").trim()).filter(sentence => {
        if (sentence.length < 18 || sentence.length > 180 || seen.has(sentence)) return false;
        if (/目录|版权|出版社|ISBN|第\s*\d+\s*页|www\.|https?:/i.test(sentence)) return false;
        seen.add(sentence); return true;
      }).map(sentence => ({ body: sentence, score: keywords.reduce((sum, word) => sum + (sentence.includes(word) ? 2 : 0), 0) + (/[“”"'「」]/.test(sentence) ? 2 : 0) + (sentence.length >= 28 && sentence.length <= 100 ? 1 : 0) })).sort((a, b) => b.score - a.score).slice(0, 50).map((item, index) => ({ title: item.body.length <= 32 ? item.body : `${item.body.slice(0, 28)}…`, body: item.body, index }));
    }
    if (mode === "line") chunks = clean.split(/\n+/);
    else if (mode === "date") chunks = clean.split(/(?=^(?:20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?))/m);
    else chunks = clean.split(/\n\s*\n+/);
    return chunks.map((body, index) => {
      const lines = body.trim().split("\n").filter(Boolean);
      const first = lines[0].replace(/^#+\s*/, "").trim();
      const title = first.length <= 32 ? first : `${first.slice(0, 28)}…`;
      return { title: title || `片段 ${index + 1}`, body: body.trim() };
    }).filter(x => x.body);
  }

  async function readImportFile(file) {
    if (!file) return "";
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      if (!window.pdfjsLib) throw new Error("PDF 解析组件未加载");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages = [];
      for (let number = 1; number <= pdf.numPages; number += 1) {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => `${item.str}${item.hasEOL ? "\n" : " "}`).join(""));
      }
      return pages.join("\n");
    }
    return file.text();
  }

  function renderStudio() {
    if (!authoringAllowed) { renderNotFound(); return; }
    setActiveNav("studio");
    if (editor) { editor.destroy(); editor = null; }
    const sourceOptions = sources.map(source => `<option value="${escapeHtml(source.id)}">${escapeHtml(source.name)}</option>`).join("");
    app.innerHTML = `<div class="studio-shell">
      <div class="studio-head"><div><h1>写作台</h1><p>像普通文档一样编辑，也可以随时切换到 Markdown 或预览。</p></div><div class="studio-actions"><button class="button" id="newDraft"><i data-lucide="file-plus"></i>新建</button><button class="button" id="saveDraft"><i data-lucide="save"></i>保存草稿</button><button class="button primary" id="exportMd"><i data-lucide="download"></i>导出 Markdown</button></div></div>
      <input type="hidden" id="draftId"><div class="studio-meta"><div class="field"><label for="postTitle">标题</label><input id="postTitle" placeholder="给这篇文字起个标题"></div><div class="field"><label for="postType">类型</label><select id="postType"><option value="note">随笔</option><option value="quote">书摘</option><option value="article">长文</option></select></div><div class="field"><label for="postAuthor">作者</label><input id="postAuthor" value="Jake" placeholder="作者或整理者"></div></div><div class="studio-meta secondary"><div class="field"><label for="postTags">标签</label><div class="tag-input-row"><input id="postTags" placeholder="个人思考，投资理财"><button class="button" id="recommendTags" type="button"><i data-lucide="sparkles"></i>推荐</button></div></div><div class="field"><label for="postSource">出处</label><input id="postSource" placeholder="书名、文章或演讲"></div><div class="field"><label for="postRelatedSource">关联人物或书籍</label><select id="postRelatedSource"><option value="">暂不关联</option>${sourceOptions}</select></div></div><div class="tag-recommender" id="tagSuggestions"><span>写完后点击“推荐”，选择符合内容的标签。</span></div>
      <div class="editor-wrap" id="editor"></div><p class="studio-note"><i data-lucide="lock"></i> 草稿只保存在当前浏览器，不会自动公开。发布到网站前请导出 Markdown 并纳入 Git 版本管理。</p>
      <section class="draft-drawer"><h2>本机草稿</h2><div class="draft-list" id="draftList"></div></section>
      <details class="import-panel"><summary>导入旧文字或书籍 PDF</summary><div class="import-filebar"><input id="importFile" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain"><label class="button" for="importFile"><i data-lucide="file-up"></i>选择 PDF / TXT / MD</label><span id="importFileName">也可以直接粘贴文字</span></div><div class="import-source-meta"><div class="field"><label for="importAuthor">原作者</label><input id="importAuthor" placeholder="例如：查理·芒格"></div><div class="field"><label for="importSource">书名或出处</label><input id="importSource" placeholder="例如：《穷查理宝典》"></div></div><div class="import-grid"><div><textarea id="importText" placeholder="文件文字会出现在这里，也可以直接粘贴……"></textarea><div class="import-options"><select id="splitMode"><option value="candidate">智能发现短句</option><option value="paragraph">按空行识别</option><option value="date">按日期识别</option><option value="line">每行一条</option></select><button class="button" id="detectImport"><i data-lucide="scan-text"></i>开始识别</button></div><p class="studio-note">文件只在当前浏览器处理；发布前请核对原文、作者、版本与引用范围。</p></div><div><div class="detected-list" id="detectedList"><div class="empty-state">候选内容会显示在这里。</div></div><div class="import-options"><button class="button primary" id="saveDetected" disabled><i data-lucide="save"></i>将选中项存为草稿</button></div></div></div></details>
    </div>`;
    editor = new toastui.Editor({ el: document.querySelector("#editor"), height: "610px", initialEditType: "wysiwyg", previewStyle: "vertical", usageStatistics: false, hideModeSwitch: false, language: "zh-CN", initialValue: "## 从这里开始写\n\n可以直接输入普通文字，选中文字后使用上方工具栏排版。\n\n> 这里可以放一段值得收藏的句子。\n\n然后写下自己的理解。" });
    document.getElementById("saveDraft").addEventListener("click", () => {
      const idNode = document.getElementById("draftId");
      const drafts = getDrafts();
      const draft = { id: idNode.value || crypto.randomUUID(), title: document.getElementById("postTitle").value.trim(), type: document.getElementById("postType").value, author: document.getElementById("postAuthor").value.trim(), tags: document.getElementById("postTags").value, source: document.getElementById("postSource").value.trim(), relatedSource: document.getElementById("postRelatedSource").value, body: editor.getMarkdown(), updated: new Date().toISOString() };
      const index = drafts.findIndex(d => d.id === draft.id); if (index >= 0) drafts[index] = draft; else drafts.push(draft);
      saveDrafts(drafts); idNode.value = draft.id; renderDraftList(); toast("草稿已保存在这台浏览器");
    });
    document.getElementById("newDraft").addEventListener("click", () => { document.getElementById("draftId").value = ""; document.getElementById("postTitle").value = ""; document.getElementById("postAuthor").value = "Jake"; document.getElementById("postTags").value = ""; document.getElementById("postSource").value = ""; document.getElementById("postRelatedSource").value = ""; editor.setMarkdown(""); toast("已新建空白文档"); });
    document.getElementById("exportMd").addEventListener("click", exportMarkdown);
    document.getElementById("recommendTags").addEventListener("click", renderTagSuggestions);
    let detected = [];
    function renderDetected() {
      document.getElementById("detectedList").innerHTML = detected.length ? detected.map((x,i) => `<label class="detected-item"><input type="checkbox" data-detected-index="${i}" checked><span><strong>${i+1}. ${escapeHtml(x.title)}</strong><span>${escapeHtml(x.body.slice(0,120))}${x.body.length > 120 ? "…" : ""}</span></span></label>`).join("") : `<div class="empty-state">没有识别到内容。</div>`;
      document.getElementById("saveDetected").disabled = !detected.length;
    }
    document.getElementById("importFile").addEventListener("change", async event => {
      const file = event.target.files[0];
      if (!file) return;
      const label = document.getElementById("importFileName");
      label.textContent = `正在读取 ${file.name}…`;
      try {
        document.getElementById("importText").value = await readImportFile(file);
        if (!document.getElementById("importSource").value) document.getElementById("importSource").value = file.name.replace(/\.[^.]+$/, "");
        detected = splitImportedText(document.getElementById("importText").value, "candidate");
        renderDetected(); label.textContent = `${file.name} · 发现 ${detected.length} 条候选`;
      } catch (error) { label.textContent = file.name; toast(error.message || "文件读取失败"); }
    });
    document.getElementById("detectImport").addEventListener("click", () => {
      detected = splitImportedText(document.getElementById("importText").value, document.getElementById("splitMode").value);
      renderDetected();
    });
    document.getElementById("saveDetected").addEventListener("click", () => {
      const selected = [...document.querySelectorAll("[data-detected-index]:checked")].map(input => detected[Number(input.dataset.detectedIndex)]);
      const author = document.getElementById("importAuthor").value.trim() || "待补充";
      const source = document.getElementById("importSource").value.trim();
      const related = sources.find(item => item.name.includes(author.replace(/[《》]/g, "")) || author.includes(item.name))?.id || "";
      const drafts = getDrafts(); selected.forEach(x => drafts.push({ id: crypto.randomUUID(), title: x.title, type: "quote", author, tags: "阅读摘录，待整理", source, relatedSource: related, body: `> ${x.body}\n\n## 我的思考\n\n`, updated: new Date().toISOString() })); saveDrafts(drafts); renderDraftList(); toast(`已保存 ${selected.length} 条草稿`);
    });
    renderDraftList(); refreshIcons();
  }

  function renderNotFound() {
    setActiveNav("");
    app.innerHTML = `<div class="article-shell empty-state"><i data-lucide="file-question"></i><h1>没有找到这篇文字</h1><a class="button" href="#/">返回首页</a></div>`;
    refreshIcons();
  }

  function route() {
    const path = location.hash.slice(1) || "/";
    if (path === "/") renderHome();
    else if (path === "/archive") renderArchive("all");
    else if (path.startsWith("/archive/tag/")) renderArchive(decodeURIComponent(path.slice(13)));
    else if (path === "/library") renderLibrary();
    else if (path.startsWith("/source/")) renderSource(decodeURIComponent(path.slice(8)));
    else if (path === "/studio") renderStudio();
    else if (path.startsWith("/post/")) renderPost(decodeURIComponent(path.slice(6)));
    else renderNotFound();
    app.focus({ preventScroll: true });
  }

  document.getElementById("year").textContent = new Date().getFullYear();
  document.querySelector('[data-nav="studio"]').hidden = !authoringAllowed;
  document.getElementById("mobileMenu").addEventListener("click", () => document.querySelector(".primary-nav").classList.toggle("open"));
  window.addEventListener("hashchange", route);
  route();
})();

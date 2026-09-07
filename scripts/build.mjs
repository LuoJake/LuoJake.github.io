import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const postsDir = path.join(root, "content", "posts");

function parsePost(filename) {
  const raw = fs.readFileSync(path.join(postsDir, filename), "utf8").replace(/\r/g, "");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: missing YAML frontmatter`);
  const data = YAML.parse(match[1]);
  const required = ["title", "type", "author", "date", "tags", "summary"];
  for (const field of required) if (data[field] == null) throw new Error(`${filename}: missing ${field}`);
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
  return { id: path.basename(filename, ".md"), ...data, date, tags: Array.isArray(data.tags) ? data.tags : [data.tags], relatedSources: Array.isArray(data.relatedSources) ? data.relatedSources : [], featured: Boolean(data.featured), body: match[2].trim() };
}

function copy(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

fs.mkdirSync(dist, { recursive: true });
for (const entry of fs.readdirSync(dist)) fs.rmSync(path.join(dist, entry), { recursive: true, force: true });
fs.mkdirSync(path.join(dist, "js"), { recursive: true });

const posts = fs.readdirSync(postsDir).filter(name => name.endsWith(".md")).map(parsePost).sort((a, b) => b.date.localeCompare(a.date));
const daily = YAML.parse(fs.readFileSync(path.join(root, "content", "daily-quotes.yml"), "utf8"));
const sourceData = YAML.parse(fs.readFileSync(path.join(root, "content", "sources.yml"), "utf8"));
if (!Array.isArray(daily.quotes) || daily.quotes.length === 0) throw new Error("daily-quotes.yml: quotes must not be empty");
if (!Array.isArray(sourceData.sources) || sourceData.sources.length === 0) throw new Error("sources.yml: sources must not be empty");

copy("index.html");
copy("styles.css");
copy(path.join("js", "app.js"));
if (fs.existsSync(path.join(root, "assets"))) fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });

const dataScript = `window.GARDEN_POSTS = ${JSON.stringify(posts, null, 2)};\nwindow.DAILY_QUOTES = ${JSON.stringify(daily.quotes, null, 2)};\nwindow.GARDEN_SOURCES = ${JSON.stringify(sourceData.sources, null, 2)};\n`;
fs.writeFileSync(path.join(dist, "js", "content.js"), dataScript, "utf8");
fs.writeFileSync(path.join(dist, ".nojekyll"), "", "utf8");
console.log(`Built ${posts.length} posts, ${daily.quotes.length} daily quotes, and ${sourceData.sources.length} sources into dist/.`);

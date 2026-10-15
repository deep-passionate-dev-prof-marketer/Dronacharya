#!/usr/bin/env node
/**
 * Design-system ratchet (runs with `npm run lint`). Fails when the UI code gains:
 *  - hard-coded colour classes like `bg-[#003872]` (use the tokens in src/index.css: bg-brand-navy, bg-surface…);
 *  - text smaller than the 11px minimum, like `text-[10px]` (use text-2xs).
 * The limits only ever go down: lower them when you clean up more.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LIMITS = { hexClasses: 0, tinyText: 0 };
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const found = { hexClasses: [], tinyText: [] };

const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name) && !/\.test\./.test(e.name)) {
      const lines = fs.readFileSync(p, "utf8").split("\n");
      lines.forEach((line, i) => {
        const where = `${path.relative(path.join(root, ".."), p)}:${i + 1}`;
        for (const m of line.matchAll(/\b[a-z][a-z0-9:-]*-\[#[0-9a-fA-F]{3,8}\]/g)) found.hexClasses.push(`${where}  ${m[0]}`);
        for (const m of line.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)) if (Number(m[1]) < 11) found.tinyText.push(`${where}  ${m[0]}`);
      });
    }
  }
};
walk(root);

let failed = false;
for (const [k, list] of Object.entries(found)) {
  if (list.length > LIMITS[k]) {
    failed = true;
    console.error(`ui-debt: ${list.length} ${k === "hexClasses" ? "hard-coded colour classes" : "text sizes under 11px"} (limit ${LIMITS[k]}):`);
    for (const l of list.slice(0, 20)) console.error(`  ${l}`);
  }
}
if (failed) {
  console.error("Use the design tokens in src/index.css (colours) and text-2xs (smallest text).");
  process.exit(1);
}
console.log(`ui-debt: OK (${found.hexClasses.length} hard-coded colours, ${found.tinyText.length} tiny text sizes)`);

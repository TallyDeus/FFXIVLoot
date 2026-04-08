import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const j = JSON.parse(fs.readFileSync(path.join(__dirname, '../tmp-raidplan-pageprops.json'), 'utf8'));
const nodes = j._plan.nodes || [];
const byStep = new Map();
for (const n of nodes) {
  const st = n.meta?.step ?? 0;
  if (!byStep.has(st)) byStep.set(st, []);
  byStep.get(st).push(n);
}
const steps = [...byStep.keys()].sort((a, b) => a - b);
console.log('unique steps', steps.length, 'min', steps[0], 'max', steps[steps.length - 1]);
for (const st of steps.slice(0, 5)) {
  const list = byStep.get(st);
  const img = list.find((n) => n.type === 'arena' && n.attr?.shape === 'image' && n.attr?.imageUrl);
  console.log('step', st, 'nodes', list.length, 'bg', img?.attr?.imageUrl?.slice(0, 60));
}
// text nodes?
const textTypes = new Set(nodes.map((n) => n.type));
console.log('node types', [...textTypes]);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const h = fs.readFileSync(path.join(__dirname, '../tmp-raidplan.html'), 'utf8');
const m = h.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
if (!m) {
  console.error('no __NEXT_DATA__');
  process.exit(1);
}
const j = JSON.parse(m[1]);
const pp = j.props?.pageProps;
console.log('pageProps keys:', Object.keys(pp || {}));
fs.writeFileSync(path.join(__dirname, '../tmp-raidplan-pageprops.json'), JSON.stringify(pp, null, 2));
console.log('wrote tmp-raidplan-pageprops.json');

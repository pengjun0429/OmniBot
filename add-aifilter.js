const fs = require('fs');
let c = fs.readFileSync('admin/views/server.ejs', 'utf-8');
const search = '<label>釣魚/詐騙偵測（自動比對 OpenPhish 資料庫）</label>';
const replace = '<label>釣魚/詐騙偵測（自動比對 OpenPhish 資料庫）</label>\n          </div>\n          <div class="form-group checkbox">\n            <input type="hidden" name="aiFilter" value="0">\n            <input type="checkbox" name="aiFilter" value="1" <%= guild.autoMod.aiFilter ? "checked" : "" %>>\n            <label>AI 語意過濾（Gemini 判斷是否為惡意）</label>';
if (c.includes(search)) {
  c = c.replace(search, replace);
  fs.writeFileSync('admin/views/server.ejs', c, 'utf-8');
  console.log('OK');
} else {
  console.log('NOT FOUND');
  const alt = c.indexOf('釣魚');
  if (alt > 0) console.log('Found fish at:', alt, ':', JSON.stringify(c.slice(alt, alt+50)));
}

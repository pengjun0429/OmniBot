// ===== OmniBot 資料庫 - Google Apps Script =====
// 部署方式：工具 -> 指令碼編輯器 -> 貼上此程式碼 -> 部署 -> 新增部署 -> 網頁應用程式
// 部署後取得網址，設為 GOOGLE_DB_URL

const SHEET_NAME = 'OmniBotDB';

function doGet(e) {
  const action = e?.parameter?.action;
  const guildId = e?.parameter?.guild;

  try {
    if (action === 'ping') return json({ status: 'ok' });

    if (action === 'get' && guildId) {
      const val = getProp(guildId);
      return json({ settings: val ? JSON.parse(val) : null });
    }

    if (action === 'getAll') {
      const all = getAllProps();
      return json({ allSettings: all });
    }

    return json({ error: 'unknown action' });
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body = typeof e?.postData?.contents === 'string'
      ? JSON.parse(e.postData.contents) : e?.parameter || {};

    const { guildId, settings, action } = body;

    if (action === 'set' && guildId) {
      setProp(guildId, JSON.stringify(settings));
      return json({ success: true });
    }

    return json({ error: 'unknown action' });
  } catch (err) {
    return json({ error: err.message });
  }
}

function getProp(key) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(key)) return data[i][1] || null;
  }
  return null;
}

function setProp(key, val) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(key)) {
      sheet.getRange(i + 1, 2).setValue(val);
      return;
    }
  }
  sheet.appendRow([key, val]);
}

function getAllProps() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const result = {};
  for (let i = 0; i < data.length; i++) {
    if (data[i][0]) result[String(data[i][0])] = JSON.parse(data[i][1] || '{}');
  }
  return result;
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['guild_id', 'settings_json']);
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const axios = require('axios');
const logger = require('../utils/logger');

const GEMINI_KEY = () => process.env.GEMINI_API_KEY;

async function askGemini(question, faq) {
  const key = GEMINI_KEY();
  if (!key) return null;

  const prompt = `你是 OmniBot 客服 AI。請根據以下 FAQ 資料回答使用者的問題。
如果問題可以被 FAQ 完整回答，請給出答案並在最後加上 [CONFIDENCE: 0.95]。
如果問題與 FAQ 部分相關但不完全匹配，回答後加上 [CONFIDENCE: 0.5]。
如果問題完全無關，回答後加上 [CONFIDENCE: 0.1]。

FAQ:
${faq || '無'}

使用者問題: ${question}`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { timeout: 15000 }
    );
    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\[CONFIDENCE:\s*([\d.]+)\]/);
    const confidence = match ? parseFloat(match[1]) : 0;
    const answer = text.replace(/\[CONFIDENCE:\s*[\d.]+\]/, '').trim();
    return { answer, confidence };
  } catch (err) {
    logger.error('[AI] Gemini API 失敗:', err.message);
    return null;
  }
}

module.exports = { askGemini };

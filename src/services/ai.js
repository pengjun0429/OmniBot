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

async function moderateMessage(content) {
  const key = GEMINI_KEY();
  if (!key || !content || content.trim().length === 0) return { flagged: false };

  const prompt = `You are a Discord Automod AI. Analyze the following message for content policy violations:
- Toxicity (insults, severe harassment, extreme hate speech, racism)
- Scams/Phishing (fake Nitro, crypto scams, phishing links, credentials harvesting)
- Severe profanity or spam (repetitive nonsensical text, wall of text)
- Sexual content/NSFW (explicit verbal descriptions of sexual acts)

Analyze carefully and output a JSON object strictly in the following format, with no extra text or markdown formatting:
{
  "flagged": true,
  "reason": "toxicity/scam/profanity/sexual/none",
  "explanation": "Brief explanation in Traditional Chinese about why it is flagged"
}
If there are no violations, output:
{
  "flagged": false,
  "reason": "none",
  "explanation": ""
}

Message to analyze:
"${content}"`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { timeout: 8000 }
    );
    let text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);
    return {
      flagged: !!data.flagged,
      reason: data.reason || 'none',
      explanation: data.explanation || ''
    };
  } catch (err) {
    logger.error('[AI Automod] 審核失敗:', err.message);
    return { flagged: false };
  }
}

module.exports = { askGemini, moderateMessage };

/**
 * 专家特长描述 → 检索关键词（DeepSeek 官方 API）
 * 需在 backend/.env 配置 DEEPSEEK_API_KEY
 */

const DEEPSEEK_API_BASE = String(process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com').replace(/\/$/, '');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 30000);

async function getExpertDomainNames(pool, expertId) {
  const [rows] = await pool.query(
    `SELECT rd.name
     FROM \`ExpertDomain\` ed
     INNER JOIN \`ResearchDomain\` rd ON ed.domain_id = rd.id
     WHERE ed.expert_id = ?
     ORDER BY rd.sort_order ASC, rd.name ASC`,
    [expertId],
  );
  return rows.map((r) => r.name).filter(Boolean);
}

function normalizeKeywordsText(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw
    .split(/[,，、;；\n\r]+/)
    .map((s) => s.trim().replace(/^["'「『【\[]+|["'」』】\]]+$/g, ''))
    .filter((s) => s && s.length <= 50);
  const unique = [...new Set(parts)];
  if (!unique.length) return null;
  let joined = unique.join(',');
  if (joined.length > 500) joined = joined.slice(0, 500);
  return joined;
}

async function extractExpertKeywordsFromDescription(description, excludeDomainNames = []) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const text = String(description || '').trim();
  if (!text) return null;
  if (!apiKey) {
    console.warn('[expertKeywords] DEEPSEEK_API_KEY 未配置，跳过关键词提取');
    return null;
  }

  const exclude = (excludeDomainNames || []).filter(Boolean);
  const excludeHint = exclude.length
    ? `不要输出以下已选研究领域名称或其明显同义词：${exclude.join('、')}。`
    : '';

  const userPrompt = `从下面的专家专业特长描述中提取用于检索匹配的中文关键词。
要求：
1. 只输出关键词，用英文逗号分隔，不要编号、不要解释、不要引号
2. 只提取原文，不要编造
3. 最多 15 个，每个 2~12 个字为宜
4. ${excludeHint || '提取技术方向、方法、应用场景等检索词'}
5. 若无可提取内容，只输出空字符串

专业特长描述：
${text}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const res = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是关键词提取助手。严格遵守：只输出逗号分隔的关键词，无其他文字。',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 256,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`DeepSeek API ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() || '';
    return normalizeKeywordsText(content);
  } finally {
    clearTimeout(timer);
  }
}

/** 根据描述同步 keywords；失败时返回 undefined 且不覆盖库中旧值 */
async function syncExpertKeywords(pool, expertId, description) {
  const desc = description != null ? String(description).trim() || null : null;
  if (!desc) {
    await pool.query('UPDATE `ExpertProfile` SET keywords = NULL WHERE id = ?', [expertId]);
    return null;
  }

  try {
    const excludeDomains = await getExpertDomainNames(pool, expertId);
    const keywords = await extractExpertKeywordsFromDescription(desc, excludeDomains);
    await pool.query('UPDATE `ExpertProfile` SET keywords = ? WHERE id = ?', [keywords, expertId]);
    return keywords;
  } catch (e) {
    console.error('[expertKeywords] 提取失败:', e.message);
    return undefined;
  }
}

/** 写入特长描述并尝试提取关键词 */
async function upsertExpertiseDescription(pool, expertId, description) {
  const desc = String(description ?? '').trim() || null;
  await pool.query(
    `INSERT INTO \`ExpertProfile\` (id, expertise_description, created_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE expertise_description = VALUES(expertise_description)`,
    [expertId, desc],
  );
  const keywords = await syncExpertKeywords(pool, expertId, desc);
  return { expertise_description: desc, keywords };
}

/** 领域变更后，按现有描述重新提取（排除新领域列表） */
async function refreshExpertKeywordsFromProfile(pool, expertId) {
  const [rows] = await pool.query(
    'SELECT expertise_description FROM `ExpertProfile` WHERE id = ?',
    [expertId],
  );
  return syncExpertKeywords(pool, expertId, rows[0]?.expertise_description ?? null);
}

module.exports = {
  upsertExpertiseDescription,
  refreshExpertKeywordsFromProfile,
  extractExpertKeywordsFromDescription,
};

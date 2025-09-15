// WARNING: This embeds your API key into the client bundle.
// For prototype use only. Do not ship to production.

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_BASE = (process.env.OPENAI_API_BASE || 'https://api.openai.com').replace(/\/$/, '');
const OPENAI_ORG = process.env.OPENAI_ORG || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const openAIConfigured = Boolean(OPENAI_API_KEY);

let client = null;
if (OPENAI_API_KEY) {
  client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_API_BASE + '/v1',
    organization: OPENAI_ORG || undefined,
    dangerouslyAllowBrowser: true
  });
}

export async function chatWithOpenAI(persona, messages) {
  if (!client) {
    const last = [...messages].reverse().find(m => m.role === 'user');
    console.warn('[MM Proto] OPENAI_API_KEY missing. Returning stub response.');
    return `[stub] ${persona.name} replies: ${last ? last.content : '...'}`;
  }

  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: persona.system },
        ...messages.filter(m => m.role !== 'system')
      ]
    });
    return resp.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('[MM Proto] OpenAI request failed:', err);
    throw err;
  }
}

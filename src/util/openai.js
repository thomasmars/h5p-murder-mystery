// WARNING: This embeds your API key into the client bundle.
// For prototype use only. Do not ship to production.

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL_ID = 'gpt-5';

const client = OPENAI_API_KEY
  ? new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  })
  : null;

function toInput(persona, messages) {
  return [
    { role: 'system', content: persona.system },
    ...messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))
  ];
}

export async function chatWithOpenAI(persona, messages) {
  if (!client) {
    const last = [...messages].reverse().find(m => m.role === 'user');
    return `[stub] ${persona.name} replies: ${last ? last.content : '...'}`;
  }

  const response = await client.responses.create({
    model: MODEL_ID,
    input: toInput(persona, messages)
  });

  return response.output_text || '[error] Empty response from model';
}

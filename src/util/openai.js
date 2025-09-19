// WARNING: This embeds your API key into the client bundle.
// For prototype use only. Do not ship to production.

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL_ID = 'gpt-4o-mini';
const SPEECH_MODEL_ID = 'gpt-4o-mini-tts';

const client = OPENAI_API_KEY
  ? new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  })
  : null;

export const openAIConfigured = Boolean(OPENAI_API_KEY);

function toInput(systemPrompt, messages) {
  return [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))
  ];
}

export async function chatWithOpenAI(persona, messages, { systemAugment = '' } = {}) {
  const systemPrompt = systemAugment
    ? `${persona.system}\n\n${systemAugment}`
    : persona.system;

  if (!client) {
    const last = [...messages].reverse().find(m => m.role === 'user');
    if (persona.id === 'lars') {
      return `[stub] Lars replies (compliments ???): ${last ? last.content : '...'}`;
    }
    return `[stub] ${persona.name} replies: ${last ? last.content : '...'}`;
  }

  const response = await client.responses.create({
    model: MODEL_ID,
    input: toInput(systemPrompt, messages)
  });

  return response.output_text || '[error] Empty response from model';
}

export async function synthesizeSpeech(text, { voice = 'alloy', format = 'mp3' } = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY missing for speech synthesis');
  }

  const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: SPEECH_MODEL_ID,
      voice,
      format,
      input: text
    })
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Speech synthesis failed: ${resp.status} ${errorText}`);
  }

  return resp.arrayBuffer();
}

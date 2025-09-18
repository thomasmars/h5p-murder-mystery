import { useEffect, useMemo, useRef, useState } from 'react';
import endingImage from '../assets/end.png';
import hannePortrait from '../assets/personas/hanne.png';
import larsPortrait from '../assets/personas/lars.png';
import marisPortrait from '../assets/personas/maris.png';
import frodePortrait from '../assets/personas/frode.png';
import ryanPortrait from '../assets/personas/ryan.png';
import { personas } from '../util/personas.js';
import { chatWithOpenAI, synthesizeSpeech, openAIConfigured } from '../util/openai.js';

const personaImages = {
  hanne: hannePortrait,
  lars: larsPortrait,
  maris: marisPortrait,
  frode: frodePortrait,
  ryan: ryanPortrait
};

const complimentKeywords = [
  'nice', 'kind', 'smart', 'brilliant', 'great', 'amazing', 'awesome', 'helpful', 'handsome',
  'talented', 'cool', 'wonderful', 'fantastic', 'impressive', 'sweet', 'lovely', 'admirable',
  'incredible', 'best', 'appreciate', 'love', 'admire'
];
const complimentRegex = new RegExp(`\\b(${complimentKeywords.join('|')})\\b`, 'i');
const complimentSubjectRegex = /\b(you|you're|youre|ur|u|lars)\b/i;
const thanksRegex = /\bthank(?:s| you| ya| u|you so much)\b/i;
const repeatRegex = /\b(?:repeat|say that again|what did you say|come again|speak up|pardon|huh|could you(?: please)? (?:repeat|say that)|can you(?: please)? (?:repeat|say that)|please repeat|sorry[,\s]+(?:what|could you repeat))\b/i;
const incidentKeywordRegex = /(?:incident|handle|door|nugatti|smear|smeared|smearing|sticky|goop|photo|picture|evidence|jar)/i;
const incidentIntentRegex = /(?:who|what|tell|explain|why|how|when|did|happen|saw|see|show|describe|happened)/i;
const hairKeywordRegex = /(?:hair|hairline|locks|ponytail|wig|toupee|scalp|bald)/i;

function defaultPersonaBehavior() {
  return {
    compliments: 0
  };
}

function initialPersonaBehaviors() {
  return personas.reduce((acc, persona) => {
    acc[persona.id] = defaultPersonaBehavior();
    return acc;
  }, {});
}

function countCompliments(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  if (!complimentSubjectRegex.test(lower)) return 0;
  if (thanksRegex.test(lower)) return 1;
  return complimentRegex.test(lower) ? 1 : 0;
}

function isRepeatRequest(text) {
  if (!text) return false;
  return repeatRegex.test(text.toLowerCase());
}

function isIncidentInquiry(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (!incidentKeywordRegex.test(lower)) return false;
  return incidentIntentRegex.test(lower) || lower.includes('?');
}

function buildLarsAugment({
  compliments,
  repeatRequested,
  askedAboutIncident,
  hairMention
}) {
  const complimentsNeeded = Math.max(0, 3 - compliments);
  const complimentsSatisfied = compliments >= 3;

  let complimentDirective;
  if (complimentsSatisfied) {
    complimentDirective = askedAboutIncident
      ? 'The player has finally complimented you at least three separate times and is directly asking about the door-handle incident. Share the truth calmly in one sentence: confirm you saw Frode smearing Nugatti on the handle, mention how messy it looked, and note you snapped a photo.'
      : 'You already feel appreciated. Unless they ask specifically about the incident, stay gentle and humble; do not volunteer accusations yet.';
  } else {
    complimentDirective = `You have only received ${compliments} compliment(s). You still need ${complimentsNeeded} more sincere compliment(s) before revealing what you saw. Never mention Frode, the Nugatti, or your photo yet—just hint that kindness helps you open up without quoting numbers.`;
  }

  const repeatDirective = repeatRequested
    ? complimentsSatisfied
      ? 'The player noticed you whispering. Repeat the thought clearly this time and include the detail you were hiding.'
      : 'The player noticed you whispering. Repeat the thought clearly in one full sentence, but keep it vague and harmless—no accusations or new evidence.'
    : '';

  const hairDirective = hairMention
    ? 'The player mentioned your hair. You are proudly, unmistakably bald. Correct them gently, refuse to count it as a compliment, and encourage them to praise something else about you instead.'
    : 'Remember you are bald. Never pretend you have hair or accept hair-related compliments.';

  return [
    complimentDirective,
    repeatDirective,
    hairDirective,
    'Work the phrase "kinda sorta" into your speech whenever you explain how you feel or what you noticed. Speak softly, stay a little shy, keep replies to a single sentence, and avoid stage directions or asterisks.'
  ].join(' ');
}

function Message({ role, content }) {
  return (
    <div className={`h5p-mm__msg h5p-mm__msg--${role}`}>{content}</div>
  );
}

export default function App({ requestResize = () => {}, params = {} }) {
  const logRef = useRef(null);
  const [active, setActive] = useState(null);
  const [logs, setLogs] = useState(() => personas.reduce((acc, persona) => {
    acc[persona.id] = [{ role: 'system', content: persona.system }];
    return acc;
  }, {}));
  const [personaBehaviors, setPersonaBehaviors] = useState(initialPersonaBehaviors);
  const [input, setInput] = useState('');
  const [guess, setGuess] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(() => openAIConfigured);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);

  const voiceLookup = useMemo(() => personas.reduce((acc, persona) => {
    if (persona.voice) acc[persona.id] = persona.voice;
    return acc;
  }, {}), []);

  const currentMessages = active && logs[active.id]
    ? logs[active.id]
    : active
      ? [{ role: 'system', content: active.system }]
      : [];

  const visibleMessages = useMemo(
    () => currentMessages.filter(m => m.role !== 'system'),
    [currentMessages]
  );

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleMessages.length, active?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      requestResize();
    }, 100);
    return () => {
      clearTimeout(timeout);
    };
  }, [active?.id, visibleMessages.length, wrongGuess, completed, requestResize]);

  function openPersona(persona) {
    if (completed) return;
    setLogs(prev => {
      if (prev[persona.id]) return prev;
      return { ...prev, [persona.id]: [{ role: 'system', content: persona.system }] };
    });
    stopAudio();
    setActive(persona);
    setWrongGuess(false);
    setInput('');
    setGuess('');
    setBusy(false);
    setTimeout(() => requestResize(), 0);
  }

  function goBack() {
    stopAudio();
    setActive(null);
    setInput('');
    setWrongGuess(false);
    setGuess('');
    setBusy(false);
    setTimeout(() => requestResize(), 0);
  }

  async function send() {
    if (completed || !active) return;
    const text = input.trim();
    if (!text || busy) return;
    const personaId = active.id;
    const next = [...currentMessages, { role: 'user', content: text }];
    let larsComplimentIncrement = 0;
    let larsAugment = '';
    let larsHairMention = false;
    if (personaId === 'lars') {
      const state = personaBehaviors[personaId] || defaultPersonaBehavior();
      larsComplimentIncrement = countCompliments(text);
      larsHairMention = hairKeywordRegex.test(text.toLowerCase());
      if (larsHairMention) {
        larsComplimentIncrement = 0;
      }
      const complimentsForPrompt = state.compliments + larsComplimentIncrement;
      const askedRepeat = isRepeatRequest(text);
      const askedAboutIncident = isIncidentInquiry(text);
      larsAugment = buildLarsAugment({
        compliments: complimentsForPrompt,
        repeatRequested: askedRepeat,
        askedAboutIncident,
        hairMention: larsHairMention
      });
    }
    setLogs(prev => ({ ...prev, [personaId]: next }));
    setInput('');
    setBusy(true);
    let larsReply = null;
    try {
      const reply = await chatWithOpenAI(
        active,
        next,
        personaId === 'lars' && larsAugment
          ? { systemAugment: larsAugment }
          : undefined
      );
      const processedReply = reply;
      larsReply = processedReply;
      setLogs(prev => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), { role: 'assistant', content: processedReply }]
      }));
      await speakReply(active.id, processedReply);
    } catch (e) {
      setLogs(prev => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), { role: 'assistant', content: '[error] Unable to get reply' }]
      }));
    } finally {
      if (personaId === 'lars' && (larsComplimentIncrement || larsReply !== null)) {
        setPersonaBehaviors(prev => {
          const prevState = prev[personaId] || defaultPersonaBehavior();
          const compliments = prevState.compliments + larsComplimentIncrement;
          if (compliments === prevState.compliments) {
            return prev;
          }
          return {
            ...prev,
            [personaId]: {
              compliments
            }
          };
        });
      }
      setBusy(false);
    }
  }

  function submitGuess() {
    if (completed) return;
    const g = guess.trim().toLowerCase();
    if (!g) return;
    if (g.includes('frode')) {
      setCompleted(true);
      setWrongGuess(false);
      setGuess('');
      stopAudio();
    } else {
      setWrongGuess(true);
    }
    setTimeout(() => requestResize(), 0);
  }

  async function speakReply(personaId, text) {
    if (!audioEnabled || !openAIConfigured || completed || !text) return;
    const voiceSetting = voiceLookup[personaId];
    const voice = typeof voiceSetting === 'string' ? voiceSetting : voiceSetting?.id || 'alloy';
    const instructions = typeof voiceSetting === 'object' ? voiceSetting.instructions : '';
    try {
      setAudioLoading(true);
      const speechText = instructions ? `${instructions}\n\n${text}` : text;
      const buffer = await synthesizeSpeech(speechText, { voice });
      const blob = new Blob([buffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      stopAudio();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      };
    } catch (err) {
      console.error('[MM Proto] Unable to synthesize speech', err);
    } finally {
      setAudioLoading(false);
    }
  }

  function toggleAudio() {
    if (!openAIConfigured) return;
    if (!audioEnabled) {
      setAudioEnabled(true);
    } else {
      setAudioEnabled(false);
      stopAudio();
    }
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  }

  const introTitle = params?.intro?.title || 'The Door Handle Disaster';
  const introLead = params?.intro?.lead || 'Hanne is distraught after touching something sticky brown on the office door handle. Help her figure out which of your coworkers is responsible.';

  return (
    <>
      <div className={`h5p-mm__shell ${active ? 'is-active' : 'is-selecting'}`}>
        {active ? (
          <div className="h5p-mm__panel">
            <div className="h5p-mm__panel-top">
              <button type="button" className="h5p-mm__back" onClick={goBack}>← Back to persons</button>
              {openAIConfigured && (
                <div className="h5p-mm__toolbar">
                  <button
                    type="button"
                    className={`h5p-mm__audio-toggle ${audioEnabled ? 'is-on' : ''}`}
                    onClick={toggleAudio}
                  >
                    {audioEnabled ? 'Audio replies on' : 'Audio replies off'}
                  </button>
                  {audioEnabled && audioLoading && (
                    <span className="h5p-mm__audio-status">Generating audio…</span>
                  )}
                </div>
              )}
            </div>
            {personaImages[active.id] && (
              <div className="h5p-mm__portrait">
                <img src={personaImages[active.id]} alt={`${active.name} portrait`} className="h5p-mm__portrait-img" />
              </div>
            )}
            <h3 className="h5p-mm__panel-name">{active.name}</h3>
            <div className="h5p-mm__chat-box" ref={logRef}>
              {visibleMessages.map((m, i) => (
                <Message key={i} role={m.role} content={m.content} />
              ))}
            </div>
            <div className="h5p-mm__input">
              <textarea
                className="h5p-mm__text h5p-mm__text--chat"
                value={input}
                placeholder={busy ? 'Waiting for reply…' : 'Ask or say something…'}
                disabled={busy || completed}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={3}
              />
              <button className="h5p-mm__send" onClick={send} disabled={busy || completed}>Send</button>
            </div>
          </div>
        ) : (
          <div className="h5p-mm__select">
            <div className="h5p-mm__intro">
              <h2 className="h5p-mm__intro-title">{introTitle}</h2>
              <p className="h5p-mm__intro-lead">{introLead}</p>
            </div>
            <h3 className="h5p-mm__select-title">Choose someone to question</h3>
            <p className="h5p-mm__select-subtitle">Select a persona to continue your investigation.</p>
            <ul className="h5p-mm__select-list">
              {personas.map(p => (
                <li key={p.id}>
                  <button type="button" className="h5p-mm__select-card" onClick={() => openPersona(p)}>
                    {personaImages[p.id] && (
                      <img src={personaImages[p.id]} alt={`${p.name} portrait`} className="h5p-mm__select-img" />
                    )}
                    <span className="h5p-mm__select-name">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="h5p-mm__solve">
              <input
                className="h5p-mm__text"
                type="text"
                value={guess}
                placeholder="Submit your solution phrase…"
                disabled={completed}
                onChange={e => {
                  setGuess(e.target.value);
                  if (wrongGuess) setWrongGuess(false);
                }}
                onKeyDown={e => e.key === 'Enter' && submitGuess()}
              />
              <button className="h5p-mm__solve-btn" onClick={submitGuess} disabled={completed}>Submit</button>
            </div>
            {wrongGuess && !completed && <p className="h5p-mm__solution-wrong">Not quite — keep investigating.</p>}
          </div>
        )}
      </div>
      {completed && (
        <div className="h5p-mm__ending-full">
          <div className="h5p-mm__ending-panel">
            <div className="h5p-mm__ending-img-wrap">
              <img src={endingImage} alt="Ashford Manor at night" className="h5p-mm__ending-img" />
            </div>
            <h3 className="h5p-mm__ending-title">Case Closed</h3>
            <div className="h5p-mm__ending-text">
              <p>The butler’s alibi collapsed under the missing key, the altered heater timer, and the footprints with a tell-tale drag.</p>
              <p>With the truth out, the manor exhales and the greenhouse lamps dim.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

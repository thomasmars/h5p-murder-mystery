import { useEffect, useMemo, useRef, useState } from 'react';
import endingImage from '../assets/end.png';
import detectivePortrait from '../assets/personas/detective.png';
import butlerPortrait from '../assets/personas/butler.png';
import heirPortrait from '../assets/personas/heir.png';
import { personas } from '../util/personas.js';
import { chatWithOpenAI, synthesizeSpeech, openAIConfigured } from '../util/openai.js';

const personaImages = {
  detective: detectivePortrait,
  butler: butlerPortrait,
  heir: heirPortrait
};

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
    setLogs(prev => ({ ...prev, [personaId]: next }));
    setInput('');
    setBusy(true);
    try {
      const reply = await chatWithOpenAI(active, next);
      setLogs(prev => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), { role: 'assistant', content: reply }]
      }));
      await speakReply(active.id, reply);
    } catch (e) {
      setLogs(prev => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), { role: 'assistant', content: '[error] Unable to get reply' }]
      }));
    } finally {
      setBusy(false);
    }
  }

  function submitGuess() {
    if (completed) return;
    const g = guess.trim().toLowerCase();
    if (!g) return;
    if (g === 'the butler did it') {
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
    const voice = voiceLookup[personaId] || 'alloy';
    try {
      setAudioLoading(true);
      const buffer = await synthesizeSpeech(text, { voice });
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

  const introTitle = params?.intro?.title || 'Murder Mystery (Prototype)';
  const introLead = params?.intro?.lead || 'Choose a suspect to begin your interrogation.';

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

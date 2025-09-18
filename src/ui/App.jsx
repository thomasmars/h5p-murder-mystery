import { useEffect, useMemo, useRef, useState } from 'react';
import endingImage from '../assets/end.png';
import { personas } from '../util/personas.js';
import { chatWithOpenAI } from '../util/openai.js';

function Message({ role, content }) {
  return (
    <div className={`h5p-mm__msg h5p-mm__msg--${role}`}>{content}</div>
  );
}

export default function App({ requestResize = () => {} }) {
  const listRef = useRef(null);
  const logRef = useRef(null);
  const [active, setActive] = useState(personas[0]);
  const [logs, setLogs] = useState(() => personas.reduce((acc, persona) => {
    acc[persona.id] = [{ role: 'system', content: persona.system }];
    return acc;
  }, {}));
  const [input, setInput] = useState('');
  const [guess, setGuess] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);

  const currentMessages = logs[active.id] || [{ role: 'system', content: active.system }];
  const visibleMessages = useMemo(
    () => currentMessages.filter(m => m.role !== 'system'),
    [currentMessages]
  );

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleMessages.length, active.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      requestResize();
    }, 100);
    return () => {
      clearTimeout(timeout);
    };
  }, [active.id, visibleMessages.length, wrongGuess, completed, requestResize]);

  function switchPersona(p) {
    if (completed) return;
    setActive(p);
    setLogs(prev => {
      if (prev[p.id]) return prev;
      return { ...prev, [p.id]: [{ role: 'system', content: p.system }] };
    });
    setWrongGuess(false);
  }

  async function send() {
    if (completed) return;
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
    } else {
      setWrongGuess(true);
    }
  }

  return (
    <>
      <div className="h5p-mm__layout">
        <aside className="h5p-mm__sidebar">
          <h3 className="h5p-mm__side-title">Persons</h3>
          <ul ref={listRef} className="h5p-mm__people">
            {personas.map(p => (
              <li
                key={p.id}
                className={`h5p-mm__person ${p.id === active.id ? 'is-active' : ''}`}
                onClick={() => switchPersona(p)}
              >
                {p.name}
              </li>
            ))}
          </ul>
        </aside>
        <main className="h5p-mm__chat">
          <div className="h5p-mm__log" ref={logRef}>
            {visibleMessages.map((m, i) => (
              <Message key={i} role={m.role} content={m.content} />
            ))}
          </div>
          <div className="h5p-mm__input">
            <textarea
              className="h5p-mm__text h5p-mm__text--chat"
              value={input}
              placeholder={busy ? 'Waiting for reply...' : 'Ask or say something...'}
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
          <div className="h5p-mm__solve">
            <input
              className="h5p-mm__text"
              type="text"
              value={guess}
              placeholder="Submit your solution phrase..."
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
        </main>
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

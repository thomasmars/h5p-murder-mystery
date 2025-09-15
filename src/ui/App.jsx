import { useEffect, useMemo, useRef, useState } from 'react';
import { personas } from '../util/personas.js';
import { chatWithOpenAI, openAIConfigured } from '../util/openai.js';

function Message({ role, content }) {
  return (
    <div className={`h5p-mm__msg h5p-mm__msg--${role}`}>{content}</div>
  );
}

export default function App() {
  const listRef = useRef(null);
  const logRef = useRef(null);
  const [active, setActive] = useState(personas[0]);
  const [messages, setMessages] = useState([{ role: 'system', content: personas[0].system }]);
  const [input, setInput] = useState('');
  const [guess, setGuess] = useState('');
  const [solution, setSolution] = useState({ visible: false, lines: [], wrong: false });
  const [busy, setBusy] = useState(false);

  const visibleMessages = useMemo(() => messages.filter(m => m.role !== 'system'), [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleMessages.length]);

  function switchPersona(p) {
    setActive(p);
    setMessages([{ role: 'system', content: p.system }]);
    setSolution({ visible: false, lines: [], wrong: false });
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const reply = await chatWithOpenAI(active, next);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '[error] Unable to get reply' }]);
    } finally {
      setBusy(false);
    }
  }

  function submitGuess() {
    const g = guess.trim().toLowerCase();
    if (!g) return;
    if (g === 'the butler did it') {
      setSolution({
        visible: true,
        wrong: false,
        lines: [
          'As clues converged, the truth emerged...',
          'Footprints, missing keys, and a hurried alibi.',
          'The butler staged the scene to mislead the eye.'
        ]
      });
    } else {
      setSolution({ visible: false, lines: [], wrong: true });
    }
  }

  return (
    <div className="h5p-mm__layout">
      {!openAIConfigured && (
        <div className="h5p-mm__notice" style={{gridColumn: '1 / -1', marginBottom: 8}}>
          Prototype notice: No OPENAI_API_KEY found at build time — replies are stubbed.
        </div>
      )}
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
            disabled={busy}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={3}
          />
          <button className="h5p-mm__send" onClick={send} disabled={busy}>Send</button>
        </div>
        <div className="h5p-mm__solve">
          <input
            className="h5p-mm__text"
            type="text"
            value={guess}
            placeholder="Submit your solution phrase..."
            onChange={e => setGuess(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitGuess()}
          />
          <button className="h5p-mm__solve-btn" onClick={submitGuess}>Submit</button>
        </div>
        {solution.wrong && <p className="h5p-mm__solution-wrong">Not quite — keep investigating.</p>}
        {solution.visible && (
          <div className="h5p-mm__solution is-visible">
            {solution.lines.map((ln, i) => (
              <p key={i} className="h5p-mm__solution-line">{ln}</p>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

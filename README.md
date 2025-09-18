# h5p-murder-mystery

Development
- Copy `.env.example` to `.env` and set `OPENAI_API_KEY` (prototype only; insecure in client bundles).
- Install deps: `npm install`
- Build bundle: `npm run build` (outputs `dist/murder-mystery.bundle.js`).
- Ensure `library.json` preloads `dist/murder-mystery.bundle.js` and `styles/murder-mystery.css`.

LLM setup (prototype)
- Uses the official `openai` npm package in-browser (prototype only) with the Responses API and `gpt-5`.
- Put your key in `.env` as `OPENAI_API_KEY=...`, then run `npm run build` again so webpack injects it.
- Persona replies can play aloud by calling OpenAI's text-to-speech API from the browser; toggle audio in the chat toolbar.
- If replies are stubbed, check console for CORS/CSP blocks to `api.openai.com`. Some H5P hosts disallow external `connect-src`.

Notes
- This prototype calls OpenAI from the browser via the injected API key. Do not use this approach in production.

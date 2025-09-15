# h5p-murder-mystery

Development
- Copy `.env.example` to `.env` and set `OPENAI_API_KEY` (prototype only; insecure in client bundles).
- Install deps: `npm install`
- Build bundle: `npm run build` (outputs `dist/murder-mystery.bundle.js`).
- Ensure `library.json` preloads `dist/murder-mystery.bundle.js` and `styles/murder-mystery.css`.

LLM setup (prototype)
- Uses the official `openai` npm package in-browser (prototype only).
- Put your key in `.env` as `OPENAI_API_KEY=...`, then run `npm run build` again so webpack injects it.
- Optional: `OPENAI_API_BASE` (default `https://api.openai.com`) and `OPENAI_ORG`.
- Verify: UI notice disappears and Detective Vale returns real replies.
- If replies are stubbed, check console for CORS/CSP blocks to `api.openai.com`. Some H5P hosts disallow external `connect-src`.

Notes
- This prototype calls OpenAI from the browser via the injected API key. Do not use this approach in production.

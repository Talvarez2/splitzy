# Splitzy

Split restaurant bills with friends. Upload a receipt photo, assign items to people, and get the exact amount each person owes — including their share of tax and tip.

## How It Works

1. Upload a photo of your receipt
2. The app extracts line items, tax, and tip using OCR
3. Edit/correct any misreads
4. Add your friends and assign items to each person
5. Get a breakdown of what each person owes (items + proportional tax & tip)
6. Share a link so friends can self-select their items (Phase 2)

## Tech

- Frontend: Vanilla HTML/CSS/JavaScript
- OCR: Tesseract.js (in-browser)
- Hosting: Vercel (static + serverless functions)
- No database required for Phase 1

## Roadmap

### Phase 1 — MVP (current)
- Upload receipt image → OCR extracts line items, tax, tip
- Manual correction UI for OCR misreads
- Create people, assign items via click/drag
- Calculate splits: each person's items + proportional share of tax & tip
- Summary view with per-person totals

### Phase 2 — Shareable Sessions
- Generate unique shareable link per receipt
- Others open link and self-select their items
- Enter Venmo username → generate Venmo deep links for payment requests
- Real-time updates via WebSocket or polling
- Serverless API for session persistence (Vercel KV or similar)

### Phase 3 — Polish
- Account system, receipt history
- Group presets (frequent dining friends)
- QR code for sharing session link at the table
- Push notifications when all friends have selected

### Phase 4 — Mobile
- PWA support with camera capture
- Native-like experience on mobile
- Offline receipt scanning with sync

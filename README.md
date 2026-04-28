# Splitzy 🍽️

**[Try it live →](https://splitzy-rose.vercel.app)**

Split restaurant bills with friends. Upload a receipt photo, assign items to people, and get the exact amount each person owes — including their share of tax and tip.

## Usage

1. **Upload** — Drag & drop or select a receipt photo (or try the sample receipt)
2. **Review** — Edit OCR-extracted items, prices, tax, and tip
3. **Assign** — Add people and tap items to assign them (supports shared items)
4. **Split** — View per-person breakdown with proportional tax & tip

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **OCR**: [Tesseract.js v5](https://github.com/naptha/tesseract.js) loaded from CDN
- **Hosting**: [Vercel](https://vercel.com) (static deployment)
- **No backend required** for Phase 1

## Project Structure

```
public/
├── index.html          # Main SPA
├── css/style.css       # Mobile-first styles
├── js/
│   ├── app.js          # Main controller & state
│   ├── ocr.js          # Tesseract.js integration
│   ├── parser.js       # Receipt text → structured data
│   ├── people.js       # People management
│   └── calculator.js   # Split calculation engine
└── assets/
    └── sample-receipt.svg
vercel.json             # Vercel deployment config
```

## Local Development

Serve the `public/` directory with any static server:

```bash
npx serve public
# or
python3 -m http.server -d public 8000
```

## Deploy to Vercel

```bash
vercel --prod
```

Or connect the GitHub repo to Vercel for automatic deployments.

## How Splitting Works

- Each person pays for their assigned items
- Shared items are split equally among assignees
- Tax and tip are distributed proportionally based on each person's subtotal
- Formula: `person_tax = (person_subtotal / bill_subtotal) * tax`

## Roadmap

- [x] Phase 1 — Receipt upload, OCR, item editing, people assignment, split calculation
- [ ] Phase 2 — Shareable sessions with unique links, Venmo deep links
- [ ] Phase 3 — Accounts, receipt history, group presets, QR sharing
- [ ] Phase 4 — PWA with camera capture, offline support

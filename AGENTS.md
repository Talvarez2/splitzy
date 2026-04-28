# AGENTS.md

## Project: Splitzy

Bill-splitting web app. Phase 1 is a pure static frontend deployed on Vercel.

## Architecture

- Static SPA in `public/` — vanilla HTML/CSS/JS, no build step
- Tesseract.js v5 loaded from CDN for in-browser OCR
- `vercel.json` configures static hosting with rewrites
- `api/` directory reserved for future serverless functions (Phase 2+)

## Key Files

| File | Purpose |
|------|---------|
| `public/js/app.js` | Main controller, state management, UI rendering |
| `public/js/ocr.js` | Tesseract.js wrapper |
| `public/js/parser.js` | Regex-based receipt text parser |
| `public/js/people.js` | People list with color-coded avatars |
| `public/js/calculator.js` | Proportional split calculation |
| `public/css/style.css` | All styles, mobile-first |

## Conventions

- No npm/node dependencies for frontend — CDN only
- No frameworks — vanilla JS with a simple global state object
- Mobile-first responsive design
- All state lives in `App.state`
- Files are loaded via script tags in index.html (order matters)

## Testing

- Use the "try a sample receipt" link on the upload page
- Sample receipt is an SVG in `public/assets/`
- OCR works best with clear, well-lit receipt photos

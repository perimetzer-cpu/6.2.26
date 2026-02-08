# CLAUDE.md - SignSmart Codebase Guide

## Project Overview

**SignSmart** (תוכנה כמעט סופית חתימה) is a Hebrew/English electronic signature platform built as a single-page application. It allows users to upload documents (PDF/Word), define signature fields, manage multiple signers (sequential or parallel), generate AI-powered reminders, and share documents via WhatsApp or Email.

## Repository Structure

The source code is distributed inside a zip archive at the repo root:

```
/
├── תוכנה-כמעט-סופית-חתימה.zip   # Project source archive
│
│   Extracted contents:
│   ├── index.html                 # HTML entry point (RTL, Hebrew, Tailwind via CDN)
│   ├── index.tsx                  # React DOM bootstrap (~41KB, main entry)
│   ├── App.tsx                    # Root React component, view routing, state management
│   ├── types.ts                   # TypeScript enums and interfaces
│   ├── constants.tsx              # Color palette and inline SVG icon components
│   │
│   ├── components/
│   │   ├── Header.tsx             # Navigation bar with branding and view switching
│   │   ├── Dashboard.tsx          # Document list with status, actions (edit/sign/delete/share)
│   │   ├── DocumentEditor.tsx     # PDF viewer + field placement for defining signers/fields
│   │   ├── SignerInterface.tsx    # Step-by-step signing UI with progress tracking
│   │   ├── ShareModal.tsx         # Share signing links via WhatsApp or Email
│   │   ├── FileUploader.tsx       # Drag-and-drop file upload with format validation
│   │   ├── SettingsView.tsx       # Office branding and automation settings
│   │   ├── ContactsView.tsx       # Contact list management
│   │   └── PDFViewer.tsx          # PDF page rendering via canvas
│   │
│   ├── services/
│   │   └── geminiService.ts       # Google Gemini API integration (3 functions)
│   │
│   ├── Code.gs                    # Google Apps Script for Drive integration
│   ├── app_logic.html             # Additional HTML-based logic
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .env.local                 # GEMINI_API_KEY placeholder
│   ├── .gitignore
│   ├── metadata.json
│   └── README.md
│
└── CLAUDE.md                      # This file
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19.2.4 (TypeScript) |
| Build | Vite 6.2.0 |
| Styling | Tailwind CSS (via CDN) |
| AI | Google Gemini API (`@google/genai` ^1.39.0, model: `gemini-3-flash-preview`) |
| PDF | PDF.js (ESM distribution) |
| Language | TypeScript 5.8.2 |
| Font | Assistant (Google Fonts, Hebrew-friendly) |

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000 (host: 0.0.0.0)
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

## Environment Variables

Set in `.env.local`:
```
GEMINI_API_KEY=<your-google-gemini-api-key>
```

Exposed to client code as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` via Vite's `define` config.

## Architecture

### Application Flow

`App.tsx` is the root component managing:
- **View state**: `'dashboard' | 'editor' | 'signing' | 'archive' | 'settings' | 'uploader' | 'contacts'`
- **Document state**: `SmartDocument[]` persisted in `localStorage` key `signsmart_docs`
- **Contact state**: `Contact[]` persisted in `localStorage` key `signsmart_contacts`
- **Deep linking**: URL parameter `?sign=<docId>&signer=<signerId>` opens signing view directly

### State Management

- No external state library (no Redux/Zustand/Context API)
- React `useState` for all UI and data state
- `localStorage` for persistence across sessions
- Unidirectional data flow: parent passes data via props, children communicate back via callbacks

### Key Type Definitions (`types.ts`)

```typescript
enum DocumentStatus { PENDING, IN_PROGRESS, COMPLETED, EXPIRED, ESCALATED }
enum FieldType { SIGNATURE, INITIALS, TEXT, DATE, ID_NUMBER, ADDRESS, AMOUNT, CHECKBOX }

interface SmartDocument   // Core document with signers, fields, status
interface Signer          // Individual signer with contact info and signing state
interface DocumentField   // Positioned field on a PDF page, linked to a specific signer
interface Contact         // Saved contact entry
```

### AI Integration (`services/geminiService.ts`)

Three Gemini API functions:
1. `analyzeDocumentForFields(text)` - Detects signature/text fields in legal document text
2. `generateSmartReminder(docTitle, signerName)` - Creates personalized Hebrew WhatsApp reminders
3. `summarizeDocument(docTitle, fileName)` - One-sentence Hebrew document summary

All use model `gemini-3-flash-preview` with structured JSON output where applicable.

### RTL / Internationalization

- HTML root: `lang="he" dir="rtl"`
- All UI text is in Hebrew
- Tailwind handles RTL layout via `dir="rtl"` on root container
- Font: "Assistant" (supports Hebrew characters)

## Key Conventions

### Code Style
- TypeScript with React functional components (`React.FC`)
- React hooks (`useState`, `useEffect`) for all state and lifecycle
- Inline SVG icons defined in `constants.tsx` (no icon library dependency)
- Tailwind utility classes for all styling (no CSS modules or styled-components)
- Hebrew comments throughout the codebase
- Path alias: `@/*` maps to project root (configured in both `tsconfig.json` and `vite.config.ts`)

### Component Pattern
- Each component is a default export in its own file under `components/`
- Props are typed inline or via interfaces
- No HOCs or render props; straightforward prop drilling
- Document IDs generated via `Math.random().toString(36).substr(2, 9)`

### Data Persistence
- All data stored client-side in `localStorage`
- Documents serialized/deserialized as JSON with date reconstruction
- No backend API or database; `Code.gs` provides optional Google Drive integration

## Testing & CI

- **No test framework** is configured (no jest, vitest, or test files)
- **No CI/CD** pipelines (no GitHub Actions, etc.)
- **No linting/formatting** tools (no ESLint, Prettier, or pre-commit hooks)

## Important Notes for AI Assistants

1. **Source code is in a zip file** - The actual source lives inside `תוכנה-כמעט-סופית-חתימה.zip`. To work with the code, extract it first.
2. **Hebrew throughout** - Component text, comments, and user-facing strings are in Hebrew. Maintain this convention when adding new code.
3. **No backend** - This is a fully client-side app. Data lives in `localStorage`. Do not assume server endpoints exist.
4. **Gemini API key required** - The AI features need a valid `GEMINI_API_KEY` in `.env.local` to function.
5. **Tailwind via CDN** - Tailwind is loaded from CDN (`cdn.tailwindcss.com`), not installed as a dependency. Custom classes beyond Tailwind's defaults require inline styles or the `<style>` block in `index.html`.
6. **No routing library** - Navigation is handled via view state in `App.tsx`, not React Router.
7. **PDF.js via ESM** - PDF rendering uses the ESM distribution of PDF.js loaded via import map in `index.html`.
8. **TypeScript config** - Uses `noEmit: true` (Vite handles transpilation), `allowImportingTsExtensions`, and bundler module resolution.

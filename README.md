# CF Ledger — Codeforces solved-problem tracker

A free, no-database Next.js app that looks up a Codeforces handle, scans submission history in pages, deduplicates accepted problems, and provides problem/submission links, search, rating/topic filters, sorting, and CSV export.

## Requirements
- Node.js 20.9 or newer
- A free GitHub account (for the easiest Vercel deployment)
- A free Vercel account

## Run locally on Windows
1. Extract this folder.
2. Install Node.js LTS from https://nodejs.org/ if you don't have it.
3. Open Command Prompt in this folder.
4. Run:

   ```bat
   npm install
   npm run dev
   ```

5. Open http://localhost:3000

## Deploy free to Vercel
1. Create a new **public or personal GitHub repository** and upload the contents of this folder (the `app` folder, `package.json`, etc.; not the outer zip).
2. Open https://vercel.com/new and sign in with GitHub.
3. Import your `cf-tracker` repository. Vercel should detect Next.js automatically.
4. Click **Deploy**. No environment variables or database are required.
5. Vercel will assign a free `*.vercel.app` URL.

Vercel's Hobby plan is for personal, non-commercial use. Check current plan terms if you later make this a commercial service. The free plan has usage limits.

## How it works
- `app/api/submissions/route.ts` proxies one page of the public Codeforces `user.status` API.
- The browser requests up to 1,000 submissions per page and waits at least 2.1 seconds between pages to respect Codeforces API rate guidance.
- Only `OK` submissions are counted; each problem is listed once, linked to the latest accepted submission found in the newest-first history.
- No profiles are stored and no database or API key is used.

## Notes
- Very long histories can take a while because Codeforces asks API clients to keep requests at least two seconds apart.
- The app depends on Codeforces' public API being available and can be affected by its rate limits or outages.
- The code does not fetch source code, private data, or require a Codeforces login.

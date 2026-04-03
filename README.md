<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TheNewNews

TheNewNews is an AI-powered news reader that combines live NewsAPI headlines with a Poke API-backed digest experience.

## Tech stack

- Vite
- React 19
- Tailwind CSS v4
- OpenAI SDK configured for the Poke API
- NewsAPI via a Vercel Serverless Function proxy

## Features

- Real-time news fetching across multiple categories
- AI News Digest that summarizes the current feed into concise, source-aware highlights
- Search, filters, and article detail views
- Responsive interface designed for fast scanning

## Environment variables

Client-side Vite variables must use the VITE_ prefix.

Create a .env.local file with values like:

```bash
VITE_POKE_API_KEY="your_poke_api_key"
VITE_POKE_API_BASE_URL="https://api.poke.com/v1"
VITE_POKE_MODEL="gpt-4o-mini"
NEWS_API_KEY="your_newsapi_key"
NEWS_API_BASE_URL="https://newsapi.org/v2"
```

The Poke API values are read by the client app. The NewsAPI key is used by /api/news on the server side.

If you are deploying to Vercel, add the VITE_ client variables and NEWS_API_KEY in the project environment settings.

## Local setup

1. Install dependencies:
   npm install
2. Create .env.local with the environment variables above.
3. Start the frontend:
   npm run dev
4. For the live news proxy locally, run Vercel development mode as well:
   vercel dev

## Deployment to Vercel

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Set the VITE_ client variables and NEWS_API_KEY in the Vercel project settings.
4. Deploy using the default Vite build command:
   - Build command: npm run build
   - Output directory: dist

## AI News Digest

The AI News Digest uses the current set of fetched articles and sends them to the Poke API through the OpenAI-compatible SDK. It returns a concise Markdown summary that highlights the most important stories and cites the source of each item.

## Notes

- NewsAPI now loads through /api/news so browser-side CORS and client-side free-tier restrictions are avoided.
- The application title is set to TheNewNews in both index.html and the React app shell.

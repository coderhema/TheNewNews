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
- NewsAPI for live headline fetching

## Features

- Real-time news fetching across multiple categories
- AI News Digest that summarizes the current feed into concise, source-aware highlights
- Search, filters, and article detail views
- Responsive interface designed for fast scanning

## Environment variables

This app is built with Vite, so browser-exposed variables must use the VITE_ prefix.

Create a .env.local file with values like:

```bash
VITE_POKE_API_KEY="your_poke_api_key"
VITE_POKE_API_BASE_URL="https://api.poke.com/v1"
VITE_POKE_MODEL="gpt-4o-mini"
VITE_NEWS_API_KEY="your_newsapi_key"
VITE_NEWS_API_BASE_URL="https://newsapi.org/v2"
```

If you are deploying to Vercel, add the same variables in the project environment settings.

## Local setup

1. Install dependencies:
   npm install
2. Create .env.local with the environment variables above.
3. Start the development server:
   npm run dev
4. Open the app in your browser on the local Vite port.

## Deployment to Vercel

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Set the VITE_ environment variables in the Vercel project settings.
4. Deploy using the default Vite build command:
   - Build command: npm run build
   - Output directory: dist

## AI News Digest

The AI News Digest uses the current set of fetched articles and sends them to the Poke API through the OpenAI-compatible SDK. It returns a concise Markdown summary that highlights the most important stories and cites the source of each item.

## Notes

- If NewsAPI requests are rate-limited or blocked in a browser environment, consider routing them through a Vercel serverless function.
- The application title is set to TheNewNews in both index.html and the React app shell.

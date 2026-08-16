# 🎰 Royal Neon Casino — VIP High-Roller Edition ✨

Welcome to the **Royal Neon Casino**, a premium, immersive full-stack virtual arcade and dashboard. Built with a futuristic cyber-neon aesthetic, it features multiple interactive high-stakes games, a mission quest progression engine, a VIP jackpot vault, and a **server-side Gemini-powered personal VIP Host** named **Vegas Vance** who comments on your plays in real time!

---

## 🎨 Design & Theme
- **Theme**: Premium Cyberpunk Glassmorphism. Features deep-slate backdrops (`bg-slate-950`), glowing fuchsia and indigo accents, border gradients, and highly responsive hover animations.
- **Typography**: Paired display fonts with technical fonts (like `JetBrains Mono`) for transaction ledgers and statistics.
- **Graphics & Visualizers**: Includes an interactive **10x10 Probability Grid Visualizer** (displaying real-time 1:100 jackpot odds) and rotating holographic gears for the VIP Vault.

---

## 🚀 Key Modules & Features

### 1. 🎙️ Vegas Vance (Personal VIP Host)
- Fully integrated server-side with **Gemini-3.5-Flash** via the modern `@google/genai` SDK.
- Vance tracks your current session state (chip balance, loss streaks, loan history, active game) and delivers suave, theatrical, custom audio-visual commentary.
- If the Gemini API key is missing or offline, Vance seamlessly falls back to a highly curated, localized response library to ensure zero service disruption.

### 2. 🔐 $100,000 VIP Mega Win Vault
- An interactive jackpot vault that costs **$5,000 USDT** per decryption attempt.
- Strictly configured with a **1% probability of success** (1 in 100 plays).
- Includes an animated **holographic security lock** and a visual **Odds Grid** explaining the statistical outcome structure.

### 3. 🎯 Achievement & Quest Engine
- Trackable milestones (e.g., getting a high multiplier in Crash, spinning the Slots, or recovering via Vance loans).
- Features instant milestone notifications and custom claim modals to collect reward chips.

### 4. 🎲 High-Stakes Game Catalog
- **Slots**: Match neon symbols with visual paylines and multipliers.
- **Blackjack**: Fully functional card dealing, stand/hit/double, and house dealer AI.
- **Roulette**: Betting board for singles, colors, and splits with a spinning neon wheel.
- **Other Arcade Classics**: Plinko, Mines, Crash, Video Poker, and High-Low.

---

## 🛠️ Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Motion (Animations), Lucide React (Icons).
- **Backend**: Node.js, Express, tsx (dev-loader), esbuild (production bundler).
- **AI Integration**: Google Gemini-3.5-Flash via `@google/genai` TypeScript SDK.

---

## 💻 Local Development Guide

### 1. Prerequisites
Make sure you have Node.js (v18+) installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
GEMINI_API_KEY="your-google-gemini-api-key-here"
```

### 4. Spin up the Development Server
This runs the full-stack server with HMR enabled for the frontend under Vite middleware on port 3000:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Publishing to GitHub

To publish this codebase as a new GitHub repository, follow these quick steps:

1. **Initialize Git**:
   ```bash
   git init
   ```
2. **Add Files**:
   ```bash
   git add .
   ```
3. **Create Initial Commit**:
   ```bash
   git commit -m "feat: initial commit of Royal Neon Casino with Vegas Vance AI Host"
   ```
4. **Link and Push**:
   Create a new blank repository on [GitHub](https://github.com), then run:
   ```bash
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo-name.git
   git push -u origin main
   ```

---

## 🌐 GitHub Pages & Actions Deployment

This repository includes an automated **GitHub Actions CI/CD workflow** (`.github/workflows/deploy.yml`) pre-configured for automated deployment to **GitHub Pages**.

### Automated Deployment via GitHub Pages:

1. **Push to GitHub**:
   Push your commits to the `main` or `master` branch on GitHub:
   ```bash
   git push origin main
   ```
2. **Enable GitHub Pages**:
   - Navigate to your repository's **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. **Automatic Deployment**:
   - The workflow automatically runs tests, builds the application, and publishes the static artifacts directly to GitHub Pages.

---

## 🐳 Cloud Run / Container Deployment (Full-Stack)

Since this app is a containerized full-stack node application, deploying to **Google Cloud Run** is highly recommended for full-stack Node/Express servers.

1. **Build production-ready code**:
   ```bash
   npm run build
   ```
2. **Deploy to Cloud Run via gcloud CLI**:
   ```bash
   gcloud run deploy royal-neon-casino --source . --port 3000 --allow-unauthenticated
   ```
   *Make sure to configure the `GEMINI_API_KEY` in the Cloud Run service environment secrets.*

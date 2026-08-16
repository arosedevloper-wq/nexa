# NexaSpin VIP Casino & P2P Escrow Protocol

A high-performance virtual casino platform and administrative backoffice featuring real-time interactive games, cyber mines, provably fair dice, live table engines, sub-admin management, and P2P agent escrow settlement.

---

## 🚀 Publishing a Brand New GitHub Repository

When ready to publish to your brand new GitHub repository, run:

```bash
# 1. Initialize fresh local git repository
git init

# 2. Add all clean project files
git add .

# 3. Create initial launch commit
git commit -m "feat: fresh production launch of NexaSpin VIP Casino & Admin Platform"

# 4. Set main branch
git branch -M main

# 5. Connect your new remote GitHub repository
# (Replace YOUR_USERNAME and YOUR_NEW_REPO with your actual GitHub repo details)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_NEW_REPO.git

# 6. Push to GitHub
git push -u origin main
```

---

## 🛠️ Local Development & Scripts

```bash
# Install dependencies
npm install

# Start full-stack development server (Express + Vite on port 3000)
npm run dev

# Run TypeScript type check
npm run lint

# Compile production bundle
npm run build

# Start production server
npm start
```

---

## 🎮 Core Platform Architecture

1. **Server-Authoritative Game Engines & Global RTP**:
   - Slots, Roulette, Blackjack, Crash/Rocket, Plinko, Dice, CyberMines, Baccarat, Video Poker.
   - Global RTP configuration (`95.0%` baseline, RTP Biasing, Custom win ratios, Force Lose mode).

2. **Hierarchical Backoffice & Roles**:
   - **SuperAdmin / Admin**: Full financial ledger, master float allocation, player management, global RTP controls, and withdrawal approvals.
   - **Sub-Admin Hub**: Agent management, shift scheduling, float distribution, and audit logs.
   - **P2P Agents**: Live transaction queue, chat, proof verification, deposit/withdrawal fulfillment.
   - **Players**: Instant gaming, deposit cashier (crypto/fiat/P2P), transaction live chat, and withdrawal requests.

3. **Dual Storage Flexibility**:
   - **Local Storage Engine**: Automatic zero-config out-of-the-box local persistence with reactive multi-tab event broadcasting.
   - **Cloud Sync**: Seamless plug-and-play support via environment variables whenever cloud databases are configured.

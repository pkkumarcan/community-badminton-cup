# 🏸 Sindhi Boys Badminton Cup — Live Tournament Portal

A modern, responsive, mobile-first web portal for managing the **Sindhi Boys Badminton Cup** with a 12-round autonomous mini-pod mixer format, 24 players, 4 courts, automatic referee rotations, real-time leaderboard rankings, and dynamic 4-tier Stage 2 Finals seeding (Gold, Silver, Bronze, Copper).

Designed to be hosted directly on **GitHub Pages** with **zero build steps** and **zero external backend dependencies**.

---

## 👥 Confirmed Final 24 Roster (Strict Alphabetical)

| ID | Player Name | Display Name | Stage 1 Matches | Referee Duties |
|:---:|:---|:---:|:---:|:---:|
| 1 | Ajeet | **Ajeet** | 8 | 4 |
| 2 | Amit | **Amit** | 8 | 4 |
| 3 | Deepak | **Deepak** | 8 | 4 |
| 4 | Hira | **Hira** | 8 | 4 |
| 5 | Honey | **Honey** | 8 | 4 |
| 6 | Hrithik | **Hrithik** | 8 | 4 |
| 7 | Manoj | **Manoj** | 8 | 4 |
| 8 | Naresh | **Naresh** | 8 | 4 |
| 9 | Om | **Om** | 8 | 4 |
| 10 | Pardeep | **Pardeep** | 8 | 4 |
| 11 | Partab | **Partab** | 8 | 4 |
| 12 | Raja | **Raja** | 8 | 4 |
| 13 | Rajesh M. | **Rajesh M.** | 8 | 4 |
| 14 | Rajesh N. | **Rajesh N.** | 8 | 4 |
| 15 | Rakesh | **Rakesh** | 8 | 4 |
| 16 | Ranjeet | **Ranjeet** | 8 | 4 |
| 17 | Ravi | **Ravi** | 8 | 4 |
| 18 | Rohit | **Rohit** | 8 | 4 |
| 19 | Sanjay | **Sanjay** | 8 | 4 |
| 20 | Sarwan | **Sarwan** | 8 | 4 |
| 21 | Sunny | **Sunny** | 8 | 4 |
| 22 | Vijay | **Vijay** | 8 | 4 |
| 23 | Vinod | **Vinod** | 8 | 4 |
| 24 | Wijai | **Wijai** | 8 | 4 |

---

## ⚡ Verified Mathematical Invariants

The tournament fixture matrix was synthesized and mathematically audited using constraint programming:

1. **48 Stage 1 Matches Across 12 Rounds on 4 Courts:** Exactly 4 matches running concurrently per round.
2. **Autonomous 6-Player Mini-Pods (4 Blocks × 3 Rounds):** 6 players are assigned to a single court for 3 consecutive rounds. Within those 3 rounds, the 6 players cycle through playing and refereeing with **zero inter-court roaming** between matches.
3. **Only 3 Reshuffle Moments:** Players only change courts between blocks (after R3, R6, and R9).
4. **Strict `Play 2, Rest 1` Pacing:** Maximum consecutive matches played $= 2$ across the entire schedule, including across block boundaries. Zero 3-match fatigue streaks.
5. **100% Unique Partnerships (Zero Repeat Partners):** Every player pairs with 8 completely distinct partners in Stage 1.
6. **Zero Exact Rematches:** No two-person pair ever faces the same two opponents.
7. **Minimal Opponent Repetitions:** Opponents meet at most twice ($\le 2$), with repeats minimized across all 24 players.
8. **Distinct Referee Pairs:** All 48 referee pairs are completely unique combinations.
9. **Even Court Distribution:** Every player plays across all 4 courts (2 matches per court).

---

## ✨ Key Features

- **📱 Mobile-First Experience:** Players can check their schedule, partners, court assignments, and referee duties right from their phones between games.
- **⚡ Live Dynamic Standings:** Recalculates leaderboard rankings in real-time as scores are entered (ranked by: Total Wins &rarr; Net Point Differential &rarr; Total Points Scored).
- **🏆 Dynamic 4-Tier Finals Seeding:** Auto-generates Stage 2 Finals brackets directly from Stage 1 standings:
  - **🥇 Gold Championship (Court 1):** Ranks 1–6 (Snake-seeded: #1&#6, #2&#5, #3&#4)
  - **🥈 Silver Plate (Court 2):** Ranks 7–12 (Snake-seeded: #7&#12, #8&#11, #9&#10)
  - **🥉 Bronze Shield (Court 3):** Ranks 13–18 (Snake-seeded: #13&#18, #14&#17, #15&#16)
  - **🛡️ Copper Bowl (Court 4):** Ranks 19–24 (Snake-seeded: #19&#24, #20&#23, #21&#22)
  - *Finals Officiating:* 3-match round robin per court where the resting team referees, ensuring 2 plays + 1 ref per player.
- **👤 Player Personal Hub:** Select your name from the dropdown to highlight your games, see your win/loss record, current rank, and immediate next match or referee duty.
- **🏸 Court Filtering:** View matches across All Courts or filter directly to Court 1, Court 2, Court 3, or Court 4.
- **💾 Automatic LocalStorage Persistence:** Scores and preferences are saved automatically in the browser (`v7` schema) with a non-destructive timestamped archival backup for legacy data.
- **⚙️ Organizer Desk Tools:**
  - 💾 Export Tournament Backup (JSON)
  - 📥 Import Tournament State (JSON)
  - 🎲 Load Demo Scores (for rehearsals/testing)
  - ⚠️ Reset All Scores (for fresh tournament starts)
  - 🖨️ Printable Scoresheets & High-DPI Poster Wallchart (`poster.html`)
- **🌓 Dark & Light Mode:** Toggle between daylight and arena dark mode.

---

## 🚀 Deploying to GitHub Pages in 2 Minutes

This project requires **no build step** (no `npm run build`, no Node.js required).

### Option 1: GitHub Web Interface (Fastest)

1. Create a new repository on GitHub (e.g. `community-badminton-cup` or `sindhi-boys-badminton-cup`).
2. Upload the files in this directory to your repository root (`index.html`, `poster.html`, `css/`, `js/`, `manifest.json`, `README.md`).
3. In your GitHub repository:
   - Go to **Settings** &rarr; **Pages** (in the left sidebar).
   - Under **Build and deployment** &gt; **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` (or `master`) and folder `/(root)`.
   - Click **Save**.
4. Within 1–2 minutes, your portal will be live!

### Option 2: Command Line (Git)

```bash
cd c:/projects/community-badminton-cup
git add .
git commit -m "Upgrade to 24 players: 4 courts, 12 rounds, 4-block mini-pods, 4-tier finals"
git branch -M main
git remote add origin https://github.com/<your-username>/community-badminton-cup.git
git push -u origin main
```

---

## 📖 Tournament Rules Summary

| Category | Specification |
|---|---|
| **Participants** | 24 Players (Guaranteed 10 matches each: 8 Stage 1 + 2 Finals) |
| **Stage 1 Format** | 12-Round Autonomous Mini-Pod Mixer (4 Blocks of 3 Rounds) |
| **Pod Stability** | 6 players stay on their court for 3 rounds. Reshuffles occur only after R3, R6, R9 |
| **Match Count** | Every player plays 8 matches &amp; referees 4 matches in Stage 1 |
| **Partnerships** | 100% unique partners (you partner with 8 different players) |
| **Scoring (Stage 1)** | 1 set to 15 points (sudden death; first to 15 wins, no deuce) |
| **Scoring (Finals)** | 1 set to 21 points (sudden death at 20–20; or 15 if time-constrained) |
| **Eliminations** | None! All 24 players advance to Stage 2 Finals (Gold, Silver, Bronze, Copper) |

### Referee & Line Judge Positioning
When your team is on rest duty:
- **Ref 1 (Scorekeeper):** Stands on the near diagonal corner, announces score before each serve, and inputs match scores into the portal.
- **Ref 2 (Line Judge):** Positions at the far diagonal corner, judging baseline and sideline calls.

---

## 📂 Project Structure

```
community-badminton-cup/
├── index.html              # Core single-page live tournament application
├── poster.html             # Printable wallchart poster & schedule sheet
├── css/
│   └── style.css           # Modern sports portal stylesheet, tokens & dark mode
├── js/
│   └── app.js              # Tournament rotation logic, state engine & UI bindings
├── manifest.json           # Web app manifest for PWA mobile install
├── .gitignore              # Standard git ignore list
├── README.md               # Documentation & GitHub Pages deployment guide
└── .github/
    └── workflows/
        └── deploy.yml      # Automated GitHub Actions Pages deployment
```

---

## 📄 License

MIT License — Feel free to customize this for your local sports club, badminton league, or social tournaments!

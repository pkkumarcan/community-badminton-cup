# 🏸 Sindhi Boys Badminton Cup — Live Tournament Portal

A modern, responsive, mobile-first web portal for managing the **Sindhi Boys Badminton Cup** with a 9-round mixer format, 18 players, automatic referee rotations, real-time leaderboard rankings, and dynamic Stage 2 Finals seeding.

Designed to be hosted directly on **GitHub Pages** with **zero build steps** and **zero external backend dependencies**.

---

## 👥 Confirmed Final 18 Roster

| ID | Player Name | Display Name | Squad | Notes |
|:---:|:---|:---:|:---:|:---|
| 1 | Ajeet Wankvani | **Ajeet** | A | |
| 2 | Amit Jesrani | **Amit** | A | |
| 3 | Lajpat Soni | **Lajpat** | A | *Replaces Avi* |
| 4 | Deepak Hans | **Deepak** | A | |
| 5 | Hira Canada | **Hira** | A | |
| 6 | Honey Kotak | **Honey** | A | |
| 7 | Hrithik | **Hrithik** | B | |
| 8 | Manoj Ahuja | **Manoj** | B | |
| 9 | Naresh Lohana | **Naresh** | B | |
| 10 | Om Parkash | **Om** | B | |
| 11 | Pardeep | **Pardeep** | B | Organizer |
| 12 | Partab Madhan | **Partab** | B | |
| 13 | Raja King | **Raja** | C | |
| 14 | Rajesh Motwani | **Rajesh M.** | C | |
| 15 | Sunny Kessrani | **Sunny** | C | *Replaces Rajesh N.* |
| 16 | Ranjeet | **Ranjeet** | C | |
| 17 | Sanjay | **Sanjay** | C | |
| 18 | Sarwan Rajani | **Sarwan** | C | |

---

## ✨ Key Features

- **📱 Mobile-First Experience:** Players can check their schedule, partners, court assignments, and referee duties right from their phones between games.
- **⚡ Live Dynamic Standings:** Recalculates leaderboard rankings in real-time as scores are entered (ranked by: Total Wins &rarr; Net Point Differential &rarr; Total Points Scored).
- **🏆 Dynamic Finals Seeding:** Auto-generates Stage 2 Finals brackets directly from Stage 1 standings:
  - **Gold Championship (Court 1):** Ranks 1–6
  - **Silver Plate (Court 2):** Ranks 7–12
  - **Bronze Shield (Court 3):** Ranks 13–18
- **👤 Player Personal Hub:** Select your name from the dropdown to highlight your games, see your win/loss record, current rank, and immediate next match or referee duty.
- **🏸 Court Filtering:** View matches across All Courts or filter directly to Court 1, Court 2, or Court 3.
- **💾 Automatic LocalStorage Persistence:** Scores and preferences are saved automatically in the browser—reload or close the page without losing any entered scores.
- **⚙️ Organizer Desk Tools:**
  - 💾 Export Tournament Backup (JSON)
  - 📥 Import Tournament State (JSON)
  - 🎲 Load Demo Scores (for rehearsals/testing)
  - ⚠️ Reset All Scores (for fresh tournament starts)
  - 🖨️ Printable Scoresheets
- **🌓 Dark & Light Mode:** Toggle between daylight and arena dark mode.

---

## 🚀 Deploying to GitHub Pages in 2 Minutes

This project requires **no build step** (no `npm run build`, no Node.js required).

### Option 1: GitHub Web Interface (Fastest)

1. Create a new repository on GitHub (e.g. `community-badminton-cup` or `sindhi-boys-badminton-cup`).
2. Upload the files in this directory to your repository root (`index.html`, `css/`, `js/`, `manifest.json`, `README.md`).
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
git commit -m "Update roster: Confirmed 18 players with Lajpat and Sunny"
git branch -M main
git remote add origin https://github.com/<your-username>/community-badminton-cup.git
git push -u origin main
```

---

## 📖 Tournament Rules Summary

| Category | Specification |
|---|---|
| **Participants** | 18 Players (Guaranteed 8 matches each) |
| **Stage 1 Format** | 9-Round Mixer (Play 2, Rest 1 rotation) |
| **Match Count** | Every player plays 6 matches &amp; referees 3 matches in Stage 1 |
| **Partnerships** | 100% unique partners (you partner with 6 different players) |
| **Scoring (Stage 1)** | 1 set to 15 points (sudden death; first to 15 wins, no deuce) |
| **Scoring (Finals)** | 1 set to 21 points (sudden death at 20–20; or 15 if time-constrained) |
| **Eliminations** | None! All 18 players advance to Stage 2 Finals (Gold, Silver, Bronze) |

### Referee & Line Judge Positioning
When your team is on rest duty:
- **Ref 1 (Scorekeeper):** Stands on the near diagonal corner, announces score before each serve, and inputs match scores into the portal.
- **Ref 2 (Line Judge):** Positions at the far diagonal corner, judging baseline and sideline calls.

---

## 📂 Project Structure

```
community-badminton-cup/
├── index.html              # Core single-page tournament application
├── css/
│   └── style.css           # Modern sports portal stylesheet & responsive design
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

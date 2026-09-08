/**
 * Community Badminton Cup - Application Logic & State Engine
 */

(function () {
  'use strict';

  // ---------- TOURNAMENT ROSTER ----------
  const ROSTER = [
    { id: 1, name: "Ajeet" }, { id: 2, name: "Amit" }, { id: 3, name: "Lajpat" },
    { id: 4, name: "Deepak" }, { id: 5, name: "Hira" }, { id: 6, name: "Honey" },
    { id: 7, name: "Hrithik" }, { id: 8, name: "Manoj" }, { id: 9, name: "Naresh" },
    { id: 10, name: "Om" }, { id: 11, name: "Pardeep" }, { id: 12, name: "Partab" },
    { id: 13, name: "Raja" }, { id: 14, name: "Rajesh M." }, { id: 15, name: "Sunny" },
    { id: 16, name: "Ranjeet" }, { id: 17, name: "Sanjay" }, { id: 18, name: "Sarwan" }
  ];

  const PLAYERS = ROSTER.map(p => p.name).sort();

  // ---------- ALPHABETICAL SQUAD ASSIGNMENTS (Unbiased Seed) ----------
  const sortedRoster = [...PLAYERS].sort();
  const squadA = sortedRoster.slice(0, 6);
  const squadB = sortedRoster.slice(6, 12);
  const squadC = sortedRoster.slice(12, 18);

  function pairConsecutive(arr) {
    const pairs = [];
    for (let i = 0; i < arr.length; i += 2) {
      pairs.push([arr[i], arr[i + 1]]);
    }
    return pairs;
  }

  const squadAPairs = pairConsecutive(squadA);
  const squadBPairs = pairConsecutive(squadB);
  const squadCPairs = pairConsecutive(squadC);

  const round1Fixtures = squadAPairs.map((t1, i) => ({
    r: 1, c: i + 1, t1, t2: squadBPairs[i], refs: squadCPairs[i],
    s1: 15, s2: 11 // sensible default
  }));

  // Default Stage 1 Template (Rounds 1-9)
  const BASE_FIXTURES = [
    ...round1Fixtures,
    { r: 2, c: 1, t1: ["Hrithik", "Naresh"], t2: ["Raja", "Rajesh M."], refs: ["Ajeet", "Amit"], s1: 15, s2: 11 },
    { r: 2, c: 2, t1: ["Manoj", "Partab"], t2: ["Sunny", "Ranjeet"], refs: ["Lajpat", "Deepak"], s1: 11, s2: 15 },
    { r: 2, c: 3, t1: ["Om", "Pardeep"], t2: ["Sanjay", "Sarwan"], refs: ["Hira", "Honey"], s1: 15, s2: 11 },

    { r: 3, c: 1, t1: ["Raja", "Ranjeet"], t2: ["Ajeet", "Lajpat"], refs: ["Hrithik", "Manoj"], s1: 11, s2: 15 },
    { r: 3, c: 2, t1: ["Rajesh M.", "Sanjay"], t2: ["Amit", "Hira"], refs: ["Naresh", "Om"], s1: 15, s2: 11 },
    { r: 3, c: 3, t1: ["Sunny", "Sarwan"], t2: ["Deepak", "Honey"], refs: ["Pardeep", "Partab"], s1: 11, s2: 15 },

    { r: 4, c: 1, t1: ["Ajeet", "Deepak"], t2: ["Manoj", "Om"], refs: ["Raja", "Rajesh M."], s1: 15, s2: 11 },
    { r: 4, c: 2, t1: ["Amit", "Honey"], t2: ["Hrithik", "Partab"], refs: ["Sunny", "Ranjeet"], s1: 11, s2: 15 },
    { r: 4, c: 3, t1: ["Lajpat", "Hira"], t2: ["Naresh", "Pardeep"], refs: ["Sanjay", "Sarwan"], s1: 15, s2: 11 },

    { r: 5, c: 1, t1: ["Hrithik", "Om"], t2: ["Rajesh M.", "Ranjeet"], refs: ["Ajeet", "Amit"], s1: 11, s2: 15 },
    { r: 5, c: 2, t1: ["Manoj", "Naresh"], t2: ["Sunny", "Sarwan"], refs: ["Lajpat", "Deepak"], s1: 15, s2: 11 },
    { r: 5, c: 3, t1: ["Pardeep", "Partab"], t2: ["Raja", "Sanjay"], refs: ["Hira", "Honey"], s1: 11, s2: 15 },

    { r: 6, c: 1, t1: ["Rajesh M.", "Sarwan"], t2: ["Ajeet", "Honey"], refs: ["Hrithik", "Manoj"], s1: 15, s2: 11 },
    { r: 6, c: 2, t1: ["Sunny", "Raja"], t2: ["Amit", "Deepak"], refs: ["Naresh", "Om"], s1: 11, s2: 15 },
    { r: 6, c: 3, t1: ["Ranjeet", "Sanjay"], t2: ["Lajpat", "Hira"], refs: ["Pardeep", "Partab"], s1: 15, s2: 11 },

    { r: 7, c: 1, t1: ["Ajeet", "Hira"], t2: ["Naresh", "Partab"], refs: ["Raja", "Rajesh M."], s1: 11, s2: 15 },
    { r: 7, c: 2, t1: ["Amit", "Lajpat"], t2: ["Manoj", "Pardeep"], refs: ["Sunny", "Ranjeet"], s1: 15, s2: 11 },
    { r: 7, c: 3, t1: ["Deepak", "Honey"], t2: ["Hrithik", "Om"], refs: ["Sanjay", "Sarwan"], s1: 11, s2: 15 },

    { r: 8, c: 1, t1: ["Hrithik", "Pardeep"], t2: ["Sunny", "Sanjay"], refs: ["Ajeet", "Amit"], s1: 15, s2: 11 },
    { r: 8, c: 2, t1: ["Manoj", "Raja"], t2: ["Rajesh M.", "Sarwan"], refs: ["Lajpat", "Deepak"], s1: 11, s2: 15 },
    { r: 8, c: 3, t1: ["Naresh", "Om"], t2: ["Ranjeet", "Partab"], refs: ["Hira", "Honey"], s1: 15, s2: 11 },

    { r: 9, c: 1, t1: ["Ajeet", "Raja"], t2: ["Amit", "Rajesh M."], refs: ["Hrithik", "Manoj"], s1: 11, s2: 15 },
    { r: 9, c: 2, t1: ["Lajpat", "Sunny"], t2: ["Deepak", "Ranjeet"], refs: ["Naresh", "Om"], s1: 15, s2: 11 },
    { r: 9, c: 3, t1: ["Hira", "Sanjay"], t2: ["Honey", "Sarwan"], refs: ["Pardeep", "Partab"], s1: 15, s2: 11 }
  ];

  // Deep clone to avoid mutating baseline
  let fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));

  let finalsScores = {
    gold:   [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
    silver: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
    bronze: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
  };

  let currentCourtFilter = "all"; // 'all', '1', '2', '3'

  // ---------- PERSISTENCE HELPERS ----------
  const STORAGE_KEY = 'badminton_cup_portal_data_v3';

  function saveState() {
    try {
      const payload = {
        fixtures,
        finalsScores,
        selectedPlayer: document.getElementById("playerSelect")?.value || "",
        currentCourtFilter,
        theme: document.documentElement.getAttribute('data-theme') || 'light'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("Could not save tournament state to localStorage:", e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.fixtures) && data.fixtures.length === BASE_FIXTURES.length) {
        fixtures = data.fixtures;
      }
      if (data.finalsScores) {
        finalsScores = data.finalsScores;
      }
      if (data.currentCourtFilter) {
        currentCourtFilter = data.currentCourtFilter;
      }
      if (data.theme) {
        applyTheme(data.theme);
      }
    } catch (e) {
      console.warn("Error loading state from localStorage:", e);
    }
  }

  // ---------- TOAST NOTIFICATIONS ----------
  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ---------- THEME TOGGLE ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveState();
  };

  // ---------- TAB NAVIGATION ----------
  window.switchTab = function (tab) {
    const tabs = ['fixtures', 'leaderboard', 'finals', 'rules'];
    tabs.forEach((t) => {
      const panel = document.getElementById('tab-' + t);
      const btn = document.getElementById('tabBtn-' + t);
      if (panel) panel.classList.toggle('hidden', t !== tab);
      if (btn) btn.classList.toggle('active', t === tab);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------- COURT FILTER ----------
  window.filterByCourt = function (courtVal) {
    currentCourtFilter = courtVal;
    document.querySelectorAll('.court-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.court === courtVal);
    });
    renderSchedule();
    saveState();
  };

  // ---------- COMPUTATIONS: STAGE 1 LEADERBOARD ----------
  function computeLeaderboard() {
    const stats = {};
    PLAYERS.forEach(p => {
      stats[p] = { name: p, gp: 0, wins: 0, pts: 0, ga: 0 };
    });

    fixtures.forEach(f => {
      if (f.s1 == null || f.s2 == null) return;
      const t1win = Number(f.s1) > Number(f.s2);
      const s1 = Number(f.s1);
      const s2 = Number(f.s2);

      f.t1.forEach(p => {
        if (!stats[p]) return;
        stats[p].gp++;
        stats[p].pts += s1;
        stats[p].ga += s2;
        if (t1win) stats[p].wins++;
      });

      f.t2.forEach(p => {
        if (!stats[p]) return;
        stats[p].gp++;
        stats[p].pts += s2;
        stats[p].ga += s1;
        if (!t1win) stats[p].wins++;
      });
    });

    const list = Object.values(stats).map(s => ({
      ...s,
      diff: s.pts - s.ga
    }));

    // Ranking criteria: 1. Total Wins -> 2. Point Differential -> 3. Points Scored
    list.sort((a, b) => (b.wins - a.wins) || (b.diff - a.diff) || (b.pts - a.pts));

    list.forEach((s, idx) => {
      s.rank = idx + 1;
      if (s.rank <= 6) s.tier = 'Gold';
      else if (s.rank <= 12) s.tier = 'Silver';
      else s.tier = 'Bronze';
    });

    return list;
  }

  // ---------- FINALS POOLS GENERATOR ----------
  function genPoolMatches(team1, team2, team3, idPrefix, poolKey) {
    const defs = [
      { id: idPrefix + "-M1", t1: team2, t2: team3, refs: team1 },
      { id: idPrefix + "-M2", t1: team1, t2: team3, refs: team2 },
      { id: idPrefix + "-M3", t1: team1, t2: team2, refs: team3 }
    ];
    return defs.map((d, i) => ({
      ...d,
      s1: finalsScores[poolKey][i]?.s1 ?? null,
      s2: finalsScores[poolKey][i]?.s2 ?? null
    }));
  }

  function buildFinalsPools(leaderboard) {
    const tierSlice = (start) => leaderboard.slice(start, start + 6).map(s => s.name);
    const makeTeams = names => [
      [names[0], names[1]],
      [names[2], names[3]],
      [names[4], names[5]]
    ];

    const goldNames = tierSlice(0);
    const silverNames = tierSlice(6);
    const bronzeNames = tierSlice(12);

    const [g1, g2, g3] = makeTeams(goldNames);
    const [s1, s2, s3] = makeTeams(silverNames);
    const [b1, b2, b3] = makeTeams(bronzeNames);

    return [
      {
        key: "gold",
        label: "Gold Championship (Court 1 — Ranks 1–6)",
        badgeClass: "tier-gold",
        cls: "gold",
        courtNum: 1,
        matches: genPoolMatches(g1, g2, g3, "G", "gold")
      },
      {
        key: "silver",
        label: "Silver Plate (Court 2 — Ranks 7–12)",
        badgeClass: "tier-silver",
        cls: "silver",
        courtNum: 2,
        matches: genPoolMatches(s1, s2, s3, "S", "silver")
      },
      {
        key: "bronze",
        label: "Bronze Shield (Court 3 — Ranks 13–18)",
        badgeClass: "tier-bronze",
        cls: "bronze",
        courtNum: 3,
        matches: genPoolMatches(b1, b2, b3, "B", "bronze")
      }
    ];
  }

  function computePoolStandings(pool) {
    const names = [...new Set(pool.matches.flatMap(m => [...m.t1, ...m.t2]))];
    const stats = {};
    names.forEach(n => {
      stats[n] = { name: n, gp: 0, wins: 0, pts: 0, ga: 0 };
    });

    pool.matches.forEach(m => {
      if (m.s1 == null || m.s2 == null) return;
      const s1 = Number(m.s1);
      const s2 = Number(m.s2);
      const t1win = s1 > s2;

      m.t1.forEach(p => {
        if (!stats[p]) return;
        stats[p].gp++;
        stats[p].pts += s1;
        stats[p].ga += s2;
        if (t1win) stats[p].wins++;
      });

      m.t2.forEach(p => {
        if (!stats[p]) return;
        stats[p].gp++;
        stats[p].pts += s2;
        stats[p].ga += s1;
        if (!t1win) stats[p].wins++;
      });
    });

    const list = Object.values(stats).map(s => ({
      ...s,
      diff: s.pts - s.ga
    }));

    list.sort((a, b) => (b.wins - a.wins) || (b.diff - a.diff) || (b.pts - a.pts));
    return list;
  }

  // ---------- RENDERING: SCHEDULE TAB ----------
  function renderSchedule() {
    const select = document.getElementById("playerSelect");
    const selected = select ? select.value : "";
    const container = document.getElementById("scheduleContainer");
    if (!container) return;
    container.innerHTML = "";

    const leaderboard = computeLeaderboard();
    const rankMap = {};
    leaderboard.forEach(s => { rankMap[s.name] = s; });

    // Update Player Personal Hub
    const hubCard = document.getElementById("playerHubCard");
    if (selected && hubCard && rankMap[selected]) {
      const s = rankMap[selected];
      hubCard.style.display = "block";
      document.getElementById("hubPlayerName").textContent = selected;
      document.getElementById("hubRankBadge").textContent = `Rank #${s.rank}`;
      document.getElementById("hubRecord").innerHTML = `<strong>${s.wins}W - ${s.gp - s.wins}L</strong> (${s.gp}/6 Played)`;
      document.getElementById("hubDiff").innerHTML = `Diff: <strong>${s.diff > 0 ? '+' : ''}${s.diff}</strong> (${s.pts} Pts)`;
      const tierBadge = document.getElementById("hubTier");
      tierBadge.textContent = `${s.tier} Pool`;
      tierBadge.className = `tier-badge tier-${s.tier.toLowerCase()}`;

      // Find next upcoming match or duty
      const nextMatch = fixtures.find(f => (f.s1 == null || f.s2 == null) && (f.t1.includes(selected) || f.t2.includes(selected) || f.refs.includes(selected)));
      const nextDetail = document.getElementById("hubNextStatus");
      if (nextMatch) {
        const isRef = nextMatch.refs.includes(selected);
        nextDetail.innerHTML = isRef
          ? `📢 Next: <strong>Refereeing Round ${nextMatch.r}</strong> on Court ${nextMatch.c}`
          : `🏸 Next: <strong>Playing Round ${nextMatch.r}</strong> on Court ${nextMatch.c}`;
      } else {
        nextDetail.innerHTML = `✅ All 6 Stage 1 matches completed! Check Finals tab.`;
      }
    } else if (hubCard) {
      hubCard.style.display = "none";
    }

    let lastRound = 0;

    fixtures.forEach((f, idx) => {
      // Court filter
      if (currentCourtFilter !== "all" && String(f.c) !== currentCourtFilter) {
        return;
      }

      // Player filter
      const inT1 = f.t1.includes(selected);
      const inT2 = f.t2.includes(selected);
      const isRef = f.refs.includes(selected);
      if (selected && !inT1 && !inT2 && !isRef) {
        return;
      }

      // Add round divider if viewing all courts
      if (currentCourtFilter === "all" && f.r !== lastRound) {
        lastRound = f.r;
        const divider = document.createElement("div");
        divider.className = "round-divider";
        divider.innerHTML = `
          <span class="round-divider-label">Round ${f.r}</span>
          <div class="round-divider-line"></div>
        `;
        container.appendChild(divider);
      }

      const card = document.createElement("div");
      card.className = "card";
      const badgeClass = f.c === 1 ? "c1" : (f.c === 2 ? "c2" : "c3");
      const hasScore = f.s1 != null && f.s2 != null;
      const t1win = hasScore && Number(f.s1) > Number(f.s2);

      const scoreControls = `
        <div class="score-box">
          <div class="score-stepper">
            <button type="button" class="stepper-btn" onclick="adjustStage1Score(${idx}, 's1', -1)" title="Minus 1">-</button>
            <input type="number" min="0" max="99" placeholder="-" value="${f.s1 ?? ''}"
              class="score-input ${hasScore ? (t1win ? 'winner' : 'loser') : ''}"
              data-idx="${idx}" data-side="s1" onchange="onStage1InputChange(this)">
            <button type="button" class="stepper-btn" onclick="adjustStage1Score(${idx}, 's1', 1)" title="Plus 1">+</button>
          </div>
          <span class="score-colon">:</span>
          <div class="score-stepper">
            <button type="button" class="stepper-btn" onclick="adjustStage1Score(${idx}, 's2', -1)" title="Minus 1">-</button>
            <input type="number" min="0" max="99" placeholder="-" value="${f.s2 ?? ''}"
              class="score-input ${hasScore ? (!t1win ? 'winner' : 'loser') : ''}"
              data-idx="${idx}" data-side="s2" onchange="onStage1InputChange(this)">
            <button type="button" class="stepper-btn" onclick="adjustStage1Score(${idx}, 's2', 1)" title="Plus 1">+</button>
          </div>
        </div>
      `;

      if (isRef) {
        card.classList.add("ref");
        const partnerRef = f.refs.find(r => r !== selected) || "Assigned Partner";
        card.innerHTML = `
          <div class="card-top">
            <span class="round-badge">Round ${f.r}</span>
            <span class="court-badge ref-badge">📢 OFFICIATING Court ${f.c}</span>
          </div>
          <div class="card-body">
            <div class="match-row">
              <div class="teams-container">
                <div class="team-name">${f.t1.join(" & ")} <span class="vs-badge">vs</span> ${f.t2.join(" & ")}</div>
              </div>
              ${scoreControls}
            </div>
            <div class="ref-callout">
              <span>📍 Position: Diagonal Line Judge &amp; Scorekeeper (paired with ${partnerRef})</span>
            </div>
          </div>
        `;
      } else {
        if (selected) card.classList.add("playing");
        if (selected && hasScore) {
          card.classList.add((inT1 && t1win) || (inT2 && !t1win) ? "won" : "lost");
        }

        const t1Display = f.t1.map(p => p === selected ? `<span class="highlight-player">${p}</span>` : p).join(" & ");
        const t2Display = f.t2.map(p => p === selected ? `<span class="highlight-player">${p}</span>` : p).join(" & ");

        card.innerHTML = `
          <div class="card-top">
            <span class="round-badge">Round ${f.r}</span>
            <span class="court-badge ${badgeClass}">Court ${f.c}</span>
          </div>
          <div class="card-body">
            <div class="match-row">
              <div class="teams-container">
                <div class="team-name">${t1Display} <span class="vs-badge">vs</span> ${t2Display}</div>
              </div>
              ${scoreControls}
            </div>
            <div class="sub-refs-info">
              <span>👀 Officiating: ${f.refs.join(" & ")}</span>
            </div>
          </div>
        `;
      }

      container.appendChild(card);
    });

    if (container.children.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding: 30px 20px;">
          <p style="color:var(--text-muted); font-weight:600;">No matches found matching the current court or player filter.</p>
        </div>
      `;
    }
  }

  // ---------- SCORE INPUT HANDLERS (STAGE 1) ----------
  window.onStage1InputChange = function (input) {
    const idx = parseInt(input.dataset.idx, 10);
    const side = input.dataset.side;
    const val = input.value.trim();
    fixtures[idx][side] = val === "" ? null : Math.max(0, parseInt(val, 10));
    saveState();
    renderAll();
  };

  window.adjustStage1Score = function (idx, side, delta) {
    const current = fixtures[idx][side] == null ? 0 : Number(fixtures[idx][side]);
    const nextVal = Math.max(0, current + delta);
    fixtures[idx][side] = nextVal;
    saveState();
    renderAll();
  };

  // ---------- RENDERING: LEADERBOARD TAB ----------
  function renderLeaderboard() {
    const selected = document.getElementById("playerSelect")?.value || "";
    const leaderboard = computeLeaderboard();
    const body = document.getElementById("lbBody");
    if (!body) return;
    body.innerHTML = "";

    leaderboard.forEach(s => {
      const tr = document.createElement("tr");
      if (s.name === selected) tr.classList.add("selected-row");

      const rankBadgeClass = s.rank === 1 ? 'rank-1' : (s.rank === 2 ? 'rank-2' : (s.rank === 3 ? 'rank-3' : ''));
      const tierClass = s.tier === "Gold" ? "tier-gold" : (s.tier === "Silver" ? "tier-silver" : "tier-bronze");
      const diffClass = s.diff > 0 ? "diff-pos" : (s.diff < 0 ? "diff-neg" : "");

      tr.innerHTML = `
        <td><span class="rank-badge ${rankBadgeClass}">${s.rank}</span></td>
        <td class="player-cell"><strong>${s.name}</strong> ${s.name === selected ? '⭐' : ''}</td>
        <td>${s.gp}</td>
        <td><strong>${s.wins}</strong></td>
        <td>${s.pts}</td>
        <td>${s.ga}</td>
        <td class="${diffClass}">${s.diff > 0 ? '+' : ''}${s.diff}</td>
        <td><span class="tier-badge ${tierClass}">${s.tier}</span></td>
      `;
      body.appendChild(tr);
    });
  }

  // ---------- RENDERING: FINALS TAB ----------
  function renderFinals() {
    const selected = document.getElementById("playerSelect")?.value || "";
    const leaderboard = computeLeaderboard();
    const finalsPools = buildFinalsPools(leaderboard);
    const container = document.getElementById("finalsContainer");
    if (!container) return;
    container.innerHTML = "";

    finalsPools.forEach(pool => {
      const section = document.createElement("div");
      section.className = "finals-pool-section";

      let matchesHtml = "";
      pool.matches.forEach((m, idx) => {
        const involvesSel = selected && (m.t1.includes(selected) || m.t2.includes(selected) || m.refs.includes(selected));
        const isRef = selected && m.refs.includes(selected);
        const hasScore = m.s1 != null && m.s2 != null;
        const t1win = hasScore && Number(m.s1) > Number(m.s2);

        const t1Display = m.t1.map(p => p === selected ? `<span class="highlight-player">${p}</span>` : p).join(" & ");
        const t2Display = m.t2.map(p => p === selected ? `<span class="highlight-player">${p}</span>` : p).join(" & ");

        const scoreControls = `
          <div class="score-box">
            <div class="score-stepper">
              <button type="button" class="stepper-btn" onclick="adjustFinalsScore('${pool.key}', ${idx}, 's1', -1)">-</button>
              <input type="number" min="0" max="99" placeholder="-" value="${m.s1 ?? ''}"
                class="score-input ${hasScore ? (t1win ? 'winner' : 'loser') : ''}"
                data-pool="${pool.key}" data-match="${idx}" data-side="s1" onchange="onFinalsInputChange(this)">
              <button type="button" class="stepper-btn" onclick="adjustFinalsScore('${pool.key}', ${idx}, 's1', 1)">+</button>
            </div>
            <span class="score-colon">:</span>
            <div class="score-stepper">
              <button type="button" class="stepper-btn" onclick="adjustFinalsScore('${pool.key}', ${idx}, 's2', -1)">-</button>
              <input type="number" min="0" max="99" placeholder="-" value="${m.s2 ?? ''}"
                class="score-input ${hasScore ? (!t1win ? 'winner' : 'loser') : ''}"
                data-pool="${pool.key}" data-match="${idx}" data-side="s2" onchange="onFinalsInputChange(this)">
              <button type="button" class="stepper-btn" onclick="adjustFinalsScore('${pool.key}', ${idx}, 's2', 1)">+</button>
            </div>
          </div>
        `;

        matchesHtml += `
          <div class="card ${isRef ? 'ref' : (involvesSel ? 'playing' : '')}">
            <div class="card-top">
              <span class="round-badge">${m.id} ${isRef ? '— 📢 YOU OFFICIATE' : ''}</span>
              <span class="court-badge c${pool.courtNum}">Court ${pool.courtNum}</span>
            </div>
            <div class="card-body">
              <div class="match-row">
                <div class="teams-container">
                  <div class="team-name">${t1Display} <span class="vs-badge">vs</span> ${t2Display}</div>
                </div>
                ${scoreControls}
              </div>
              <div class="sub-refs-info">
                <span>Officiating Team: ${m.refs.join(" & ")}</span>
              </div>
            </div>
          </div>
        `;
      });

      const standings = computePoolStandings(pool);
      const standingsHtml = `
        <div class="lb-card" style="margin-top: 10px;">
          <div class="lb-table-wrap">
            <table class="lb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th style="text-align:left;">Player</th>
                  <th>GP</th>
                  <th>W</th>
                  <th>Diff</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                ${standings.map((s, i) => `
                  <tr class="${s.name === selected ? 'selected-row' : ''}">
                    <td><span class="rank-badge ${i === 0 ? 'rank-1' : ''}">${i + 1}</span></td>
                    <td class="player-cell"><strong>${s.name}</strong> ${s.name === selected ? '⭐' : ''}</td>
                    <td>${s.gp}</td>
                    <td><strong>${s.wins}</strong></td>
                    <td class="${s.diff > 0 ? 'diff-pos' : (s.diff < 0 ? 'diff-neg' : '')}">${s.diff > 0 ? '+' : ''}${s.diff}</td>
                    <td>${s.pts}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;

      section.innerHTML = `
        <div class="pool-banner ${pool.cls}">
          <span>🏆 ${pool.label}</span>
          <span style="font-size:0.8rem; font-weight:700; opacity:0.9;">1 Set to 21</span>
        </div>
        <div class="finals-matches-grid">${matchesHtml}</div>
        ${standingsHtml}
      `;
      container.appendChild(section);
    });
  }

  // ---------- SCORE INPUT HANDLERS (FINALS) ----------
  window.onFinalsInputChange = function (input) {
    const poolKey = input.dataset.pool;
    const matchIdx = parseInt(input.dataset.match, 10);
    const side = input.dataset.side;
    const val = input.value.trim();
    finalsScores[poolKey][matchIdx][side] = val === "" ? null : Math.max(0, parseInt(val, 10));
    saveState();
    renderFinals();
  };

  window.adjustFinalsScore = function (poolKey, matchIdx, side, delta) {
    const current = finalsScores[poolKey][matchIdx][side] == null ? 0 : Number(finalsScores[poolKey][matchIdx][side]);
    const nextVal = Math.max(0, current + delta);
    finalsScores[poolKey][matchIdx][side] = nextVal;
    saveState();
    renderFinals();
  };

  // ---------- ORGANIZER ACTIONS & MODAL ----------
  window.openOrganizerModal = function () {
    const modal = document.getElementById('organizerModal');
    if (modal) modal.classList.add('open');
  };

  window.closeOrganizerModal = function () {
    const modal = document.getElementById('organizerModal');
    if (modal) modal.classList.remove('open');
  };

  window.resetTournament = function () {
    if (!confirm("Are you sure you want to reset all match scores to blank? This cannot be undone.")) return;
    fixtures.forEach(f => { f.s1 = null; f.s2 = null; });
    finalsScores = {
      gold:   [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      silver: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      bronze: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
    };
    saveState();
    renderAll();
    closeOrganizerModal();
    showToast("Tournament scores reset to blank!");
  };

  window.loadDemoData = function () {
    fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));
    finalsScores = {
      gold:   [ { s1: 21, s2: 17 }, { s1: 19, s2: 21 }, { s1: 21, s2: 18 } ],
      silver: [ { s1: 21, s2: 15 }, { s1: 21, s2: 19 }, { s1: 16, s2: 21 } ],
      bronze: [ { s1: 21, s2: 14 }, { s1: 18, s2: 21 }, { s1: 21, s2: 19 } ]
    };
    saveState();
    renderAll();
    closeOrganizerModal();
    showToast("Demo tournament data loaded!");
  };

  window.exportDataJSON = function () {
    const payload = {
      timestamp: new Date().toISOString(),
      fixtures,
      finalsScores,
      leaderboard: computeLeaderboard()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `badminton_cup_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Tournament JSON backup downloaded!");
  };

  window.importDataJSON = function (fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported.fixtures)) {
          fixtures = imported.fixtures;
        }
        if (imported.finalsScores) {
          finalsScores = imported.finalsScores;
        }
        saveState();
        renderAll();
        closeOrganizerModal();
        showToast("Tournament data imported successfully!");
      } catch (err) {
        alert("Invalid JSON file format.");
      }
    };
    reader.readAsText(file);
  };

  window.printTournament = function () {
    window.print();
  };

  // ---------- MASTER RENDER ----------
  window.renderAll = function () {
    renderSchedule();
    renderLeaderboard();
    renderFinals();
  };

  // ---------- INITIALIZATION ----------
  document.addEventListener("DOMContentLoaded", function () {
    loadState();

    // Populate player dropdown
    const select = document.getElementById("playerSelect");
    if (select) {
      PLAYERS.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });

      // Restore selected player if saved
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.selectedPlayer) select.value = data.selectedPlayer;
        }
      } catch (e) {}

      select.addEventListener("change", function () {
        renderAll();
        saveState();
      });
    }

    // Set initial court filter button active state
    document.querySelectorAll('.court-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.court === currentCourtFilter);
    });

    renderAll();
  });
})();

/**
 * ============================================================================
 * Sindhi Boys Badminton Season Tracker — Season Mode Engine
 * ============================================================================
 * Scope: Season Mode Foundation (Phase 1), Live Players (Phase 2) & Match Entry (Phase 3).
 * Architectural Invariant: Firebase match ledger is the single source of truth.
 * Zero-Interference Guarantee: Preserves 100% of Tournament Mode logic/state.
 */

(function() {
  'use strict';

  // 1. Season Configuration Constants (Fall 2026)
  const SEASON_CONFIG = Object.freeze({
    seasonId: 'fall2026',
    name: 'Sindhi Boys Badminton Season — Fall 2026',
    startDate: '2026-09-27',
    endDate: '2026-12-20',
    status: 'ACTIVE', // ACTIVE | FROZEN | ARCHIVED
    minGamesQualified: 15,
    startingElo: 1500,
    kFactor: 32
  });

  // Local Storage Key for Portal Mode Preference
  const PORTAL_MODE_STORAGE_KEY = 'sb_badminton_portal_mode';

  function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 2. Firebase Database Path Helpers
  function getSeasonConfigPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/config`;
  }

  function getSeasonPlayersPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/players`;
  }

  function getSeasonMatchesPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/matches`;
  }

  function getSeasonAuditPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/audit`;
  }

  function getSeasonComputedPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/computed`;
  }

  // 3. Season State (Isolated Namespace)
  const SeasonState = {
    activeTab: 'home',
    config: { ...SEASON_CONFIG },
    players: {},
    matches: {},
    playerSearchQuery: '',
    playerStatusFilter: 'active', // 'active' | 'inactive' | 'all'
    matchHistoryFilter: 'ALL', // 'ALL' | 'DOUBLES' | 'SINGLES'
    matchHistorySearch: '',
    matchEntry: {
      matchType: 'DOUBLES', // 'DOUBLES' | 'SINGLES'
      player1: '',
      player2: '',
      player3: '',
      player4: '',
      scoreA: '',
      scoreB: '',
      matchDate: getTodayDateString(),
      court: '',
      session: '',
      notes: '',
      showOptional: false,
      lastSavedSummary: null,
      saving: false
    },
    computed: {
      playerStats: {},
      doublesElo: {},
      singlesElo: {},
      partnerships: {},
      headToHead: {},
      weekly: {}
    },
    initialized: false,
    playersSubscribed: false,
    matchesSubscribed: false
  };

  // 4. Pure Player Normalization & ID Generators
  function normalizePlayerName(name) {
    if (typeof name !== 'string') return '';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function generatePlayerId() {
    const rand = Math.random().toString(36).substring(2, 8);
    const time = Date.now().toString(36);
    return `p_${time}${rand}`;
  }

  function generateMatchId() {
    const rand = Math.random().toString(36).substring(2, 6);
    const time = Date.now().toString(36);
    return `m_${time}_${rand}`;
  }

  function generateAuditId() {
    const rand = Math.random().toString(36).substring(2, 6);
    const time = Date.now().toString(36);
    return `audit_${time}_${rand}`;
  }

  // 5. Player Roster Accessors
  function getPlayers() {
    return Object.values(SeasonState.players);
  }

  function getActivePlayers() {
    return Object.values(SeasonState.players)
      .filter(p => p.active !== false)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }

  function getPlayerById(id) {
    return SeasonState.players[id] || null;
  }

  // 6. Firebase Real-Time Player Subscription
  function subscribeToPlayers() {
    if (SeasonState.playersSubscribed) return;

    if (typeof firebase === 'undefined' || !firebase.database) {
      console.warn('[SeasonApp] Firebase Database not available for player sync');
      return;
    }

    try {
      const db = firebase.database();
      const playersRef = db.ref(getSeasonPlayersPath());

      playersRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        SeasonState.players = data;
        SeasonState.playersSubscribed = true;
        recalculatePlayerStats();

        if (SeasonState.activeTab === 'players') {
          renderPlayers();
        }
        if (SeasonState.activeTab === 'record') {
          renderRecordMatch();
        }
        if (SeasonState.activeTab === 'history') {
          renderMatchHistory();
        }
        if (SeasonState.activeTab === 'leaderboard') {
          renderLeaderboard();
        }
        if (SeasonState.activeTab === 'home') {
          renderSeasonHome();
        }
      }, (error) => {
        console.error('[SeasonApp] Real-time players listener error:', error);
      });
    } catch (e) {
      console.warn('[SeasonApp] Failed to subscribe to Firebase players:', e);
    }
  }

  // 7. Add Player Mutation
  async function addPlayer(name) {
    const trimmedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Please enter a valid player name (at least 2 characters).');
    }

    const norm = normalizePlayerName(trimmedName);
    const existing = Object.values(SeasonState.players).find(p => p.normalizedName === norm);
    if (existing) {
      throw new Error(`"${existing.name}" already exists in this season.`);
    }

    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }

    if (!authUser) {
      throw new Error('Sign in as an authorized organizer to add players.');
    }

    const playerId = generatePlayerId();
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const playerRecord = {
      id: playerId,
      name: trimmedName,
      normalizedName: norm,
      active: true,
      joinedAt: serverTimestamp,
      createdByUid: authUser.uid,
      updatedAt: serverTimestamp,
      updatedByUid: authUser.uid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      await db.ref(`${getSeasonPlayersPath()}/${playerId}`).set(playerRecord);
    } else {
      SeasonState.players[playerId] = { ...playerRecord, joinedAt: Date.now(), updatedAt: Date.now() };
    }

    return playerRecord;
  }

  // 8. Toggle Active / Inactive Status
  async function setPlayerActive(playerId, active) {
    const player = SeasonState.players[playerId];
    if (!player) {
      throw new Error('Player not found.');
    }

    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }

    if (!authUser) {
      throw new Error('Sign in as an authorized organizer to change player status.');
    }

    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const updates = {
      active: Boolean(active),
      updatedAt: serverTimestamp,
      updatedByUid: authUser.uid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      await db.ref(`${getSeasonPlayersPath()}/${playerId}`).update(updates);
    } else {
      SeasonState.players[playerId].active = Boolean(active);
      SeasonState.players[playerId].updatedAt = Date.now();
      SeasonState.players[playerId].updatedByUid = authUser.uid;
    }
  }

  // 9. Match Entry & Validation Engine (Phase 3)
  function setMatchType(type) {
    const valid = type === 'SINGLES' ? 'SINGLES' : 'DOUBLES';
    SeasonState.matchEntry.matchType = valid;
    renderRecordMatch();
  }

  function getSelectedMatchPlayers() {
    const me = SeasonState.matchEntry;
    if (me.matchType === 'SINGLES') {
      return [me.player1, me.player3].filter(Boolean);
    }
    return [me.player1, me.player2, me.player3, me.player4].filter(Boolean);
  }

  function validateMatchEntry(entry = SeasonState.matchEntry) {
    // 1. Check Season Status
    if (SeasonState.config && SeasonState.config.status && SeasonState.config.status !== 'ACTIVE') {
      throw new Error(`This season is currently ${SeasonState.config.status} and not accepting new matches.`);
    }

    // 2. Score Validation
    if (entry.scoreA === '' || entry.scoreA === null || entry.scoreA === undefined ||
        entry.scoreB === '' || entry.scoreB === null || entry.scoreB === undefined) {
      throw new Error('Please enter both team scores.');
    }

    const sA = parseInt(entry.scoreA, 10);
    const sB = parseInt(entry.scoreB, 10);

    if (isNaN(sA) || isNaN(sB)) {
      throw new Error('Scores must be valid numbers.');
    }
    if (sA < 0 || sB < 0) {
      throw new Error('Scores cannot be negative.');
    }
    if (sA === sB) {
      throw new Error('Ties are not allowed. One team must win the match.');
    }

    // 3. Player Selection & Anti-Duplicate Validation
    if (entry.matchType === 'SINGLES') {
      if (!entry.player1 || !entry.player3) {
        throw new Error('Please select both Player A and Player B for Singles.');
      }
      if (entry.player1 === entry.player3) {
        throw new Error('Player A and Player B cannot be the same player.');
      }
      const pA = getPlayerById(entry.player1);
      const pB = getPlayerById(entry.player3);
      if (!pA || pA.active === false) {
        throw new Error(`Player A (${pA ? pA.name : 'Unknown'}) is not an active player.`);
      }
      if (!pB || pB.active === false) {
        throw new Error(`Player B (${pB ? pB.name : 'Unknown'}) is not an active player.`);
      }
    } else {
      // Doubles
      if (!entry.player1 || !entry.player2 || !entry.player3 || !entry.player4) {
        throw new Error('Please select all 4 distinct players for Doubles.');
      }
      const pList = [entry.player1, entry.player2, entry.player3, entry.player4];
      const uniqueSet = new Set(pList);
      if (uniqueSet.size !== 4) {
        throw new Error('All 4 players in Doubles must be different.');
      }
      for (let i = 0; i < pList.length; i++) {
        const p = getPlayerById(pList[i]);
        if (!p || p.active === false) {
          throw new Error(`Player (${p ? p.name : 'Unknown'}) is not an active player in this season.`);
        }
      }
    }

    const winner = sA > sB ? 'A' : 'B';
    return { sA, sB, winner };
  }

  function buildMatchPayload(entry = SeasonState.matchEntry, matchId = generateMatchId(), authUser = null) {
    const { sA, sB, winner } = validateMatchEntry(entry);
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const uid = authUser ? authUser.uid : 'anonymous';
    const userName = authUser ? (authUser.displayName || authUser.email || 'Organizer') : 'Organizer';
    const dateStr = entry.matchDate || getTodayDateString();

    if (entry.matchType === 'SINGLES') {
      return {
        id: matchId,
        matchType: 'SINGLES',
        matchDate: dateStr,
        createdAt: serverTimestamp,
        enteredByUid: uid,
        enteredByName: userName,
        playerA: entry.player1,
        playerB: entry.player3,
        scoreA: sA,
        scoreB: sB,
        winner: winner,
        court: entry.court || '',
        session: entry.session || '',
        notes: entry.notes || '',
        revision: 1,
        updatedAt: serverTimestamp,
        updatedByUid: uid
      };
    } else {
      return {
        id: matchId,
        matchType: 'DOUBLES',
        matchDate: dateStr,
        createdAt: serverTimestamp,
        enteredByUid: uid,
        enteredByName: userName,
        teamA: {
          player1: entry.player1,
          player2: entry.player2
        },
        teamB: {
          player1: entry.player3,
          player2: entry.player4
        },
        scoreA: sA,
        scoreB: sB,
        winner: winner,
        court: entry.court || '',
        session: entry.session || '',
        notes: entry.notes || '',
        revision: 1,
        updatedAt: serverTimestamp,
        updatedByUid: uid
      };
    }
  }

  function formatMatchSummary(payload) {
    if (!payload) return '';
    if (payload.matchType === 'SINGLES') {
      const pA = getPlayerById(payload.playerA);
      const pB = getPlayerById(payload.playerB);
      const nameA = pA ? pA.name : 'Player A';
      const nameB = pB ? pB.name : 'Player B';
      return `${nameA} ${payload.scoreA}–${payload.scoreB} ${nameB}`;
    } else {
      const p1 = getPlayerById(payload.teamA ? payload.teamA.player1 : '');
      const p2 = getPlayerById(payload.teamA ? payload.teamA.player2 : '');
      const p3 = getPlayerById(payload.teamB ? payload.teamB.player1 : '');
      const p4 = getPlayerById(payload.teamB ? payload.teamB.player2 : '');
      const nameA = `${p1 ? p1.name : 'P1'} + ${p2 ? p2.name : 'P2'}`;
      const nameB = `${p3 ? p3.name : 'P3'} + ${p4 ? p4.name : 'P4'}`;
      return `${nameA} ${payload.scoreA}–${payload.scoreB} ${nameB}`;
    }
  }

  async function saveMatch(entry = SeasonState.matchEntry) {
    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }

    if (!authUser) {
      throw new Error('Sign in as an authorized scorekeeper/organizer to record a match.');
    }

    const matchId = generateMatchId();
    const auditId = generateAuditId();
    const matchPayload = buildMatchPayload(entry, matchId, authUser);

    const auditPayload = {
      action: 'MATCH_CREATED',
      targetId: matchId,
      timestamp: (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
        ? firebase.database.ServerValue.TIMESTAMP
        : Date.now(),
      actorUid: authUser.uid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      const updates = {};
      updates[`${getSeasonMatchesPath()}/${matchId}`] = matchPayload;
      updates[`${getSeasonAuditPath()}/${auditId}`] = auditPayload;
      await db.ref().update(updates);
    } else {
      // In-memory fallback (sandbox / test environment)
      SeasonState.matches[matchId] = { ...matchPayload, createdAt: Date.now(), updatedAt: Date.now() };
    }

    return matchPayload;
  }

  function resetMatchScores() {
    SeasonState.matchEntry.scoreA = '';
    SeasonState.matchEntry.scoreB = '';
    SeasonState.matchEntry.notes = '';
    renderRecordMatch();
  }

  function resetMatchEntry() {
    SeasonState.matchEntry.player1 = '';
    SeasonState.matchEntry.player2 = '';
    SeasonState.matchEntry.player3 = '';
    SeasonState.matchEntry.player4 = '';
    SeasonState.matchEntry.scoreA = '';
    SeasonState.matchEntry.scoreB = '';
    SeasonState.matchEntry.notes = '';
    SeasonState.matchEntry.lastSavedSummary = null;
    renderRecordMatch();
  }

  // 10. Portal Mode Switcher (Tournament <-> Season)
  function getPortalMode() {
    try {
      return localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || 'tournament';
    } catch (e) {
      return 'tournament';
    }
  }

  function setPortalMode(mode, savePreference = true) {
    const validMode = (mode === 'season') ? 'season' : 'tournament';
    
    if (savePreference) {
      try {
        localStorage.setItem(PORTAL_MODE_STORAGE_KEY, validMode);
      } catch (e) {
        console.warn('[SeasonApp] Could not persist portal mode preference:', e);
      }
    }

    const tournamentContainer = document.getElementById('tournamentContainer');
    const seasonContainer = document.getElementById('seasonApp');
    const modeBtnTournament = document.getElementById('modeBtnTournament');
    const modeBtnSeason = document.getElementById('modeBtnSeason');
    const portalSubtitle = document.querySelector('.portal-subtitle');

    if (document.body) {
      document.body.classList.toggle('season-active', validMode === 'season');
    }

    if (validMode === 'season') {
      if (tournamentContainer) {
        tournamentContainer.style.display = 'none';
      }
      if (seasonContainer) {
        seasonContainer.classList.remove('hidden');
        seasonContainer.style.display = 'block';
      }
      if (modeBtnTournament) {
        modeBtnTournament.classList.remove('active');
        modeBtnTournament.setAttribute('aria-selected', 'false');
      }
      if (modeBtnSeason) {
        modeBtnSeason.classList.add('active');
        modeBtnSeason.setAttribute('aria-selected', 'true');
      }
      if (portalSubtitle) {
        portalSubtitle.textContent = '12-Week Fall 2026 League • Doubles & Singles Elo • Live Standings';
      }
      initSeasonApp();
    } else {
      if (seasonContainer) {
        seasonContainer.classList.add('hidden');
        seasonContainer.style.display = 'none';
      }
      if (tournamentContainer) {
        tournamentContainer.style.display = 'block';
      }
      if (modeBtnTournament) {
        modeBtnTournament.classList.add('active');
        modeBtnTournament.setAttribute('aria-selected', 'true');
      }
      if (modeBtnSeason) {
        modeBtnSeason.classList.remove('active');
        modeBtnSeason.setAttribute('aria-selected', 'false');
      }
      if (portalSubtitle) {
        portalSubtitle.textContent = 'Live Mixer Fixtures • Standings • Dynamic Finals';
      }
    }
  }

  // 11. Season Tab Navigation
  const SEASON_TABS = [
    'home',
    'record',
    'leaderboard',
    'players',
    'history',
    'weekly',
    'admin',
    'seeding'
  ];

  function switchSeasonTab(tabName) {
    if (!SEASON_TABS.includes(tabName)) tabName = 'home';
    SeasonState.activeTab = tabName;

    SEASON_TABS.forEach(t => {
      const btn = document.getElementById(`seasonTabBtn-${t}`);
      const pane = document.getElementById(`seasonPane-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        }
      }
      if (pane) {
        if (t === tabName) {
          pane.classList.remove('hidden');
          pane.style.display = 'block';
        } else {
          pane.classList.add('hidden');
          pane.style.display = 'none';
        }
      }
    });

    if (tabName === 'home') {
      renderSeasonHome();
    } else if (tabName === 'record') {
      renderRecordMatch();
    } else if (tabName === 'players') {
      renderPlayers();
    } else if (tabName === 'history') {
      renderMatchHistory();
    }
  }

  function isUserAuthorized() {
    if (window.TournamentFirebase && typeof window.TournamentFirebase.isAuthorized === 'function') {
      return window.TournamentFirebase.isAuthorized();
    }
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      return true;
    }
    return false;
  }

  // 12. Render Season Home
  function renderSeasonHome() {
    const container = document.getElementById('seasonHomeContainer');
    if (!container) return;

    const allPlayers = Object.values(SeasonState.players);
    const activePlayers = allPlayers.filter(p => p.active !== false);
    const allMatches = getSortedMatches('DESC');
    const doublesMatches = allMatches.filter(m => m.matchType === 'DOUBLES');
    const singlesMatches = allMatches.filter(m => m.matchType === 'SINGLES');

    const statsList = Object.values(SeasonState.playerStats || {});
    const activeStats = statsList.filter(s => s.combined && s.combined.gp > 0);
    
    let mostActiveStr = '—';
    if (activeStats.length > 0) {
      const topGp = [...activeStats].sort((a, b) => b.combined.gp - a.combined.gp)[0];
      if (topGp && topGp.combined.gp > 0) {
        mostActiveStr = `${topGp.name} (${topGp.combined.gp} GP)`;
      }
    }

    let topWinStr = '—';
    const qualifiedStats = activeStats.filter(s => s.combined.gp >= (SEASON_CONFIG.minGamesQualified || 15));
    if (qualifiedStats.length > 0) {
      const topWin = [...qualifiedStats].sort((a, b) => b.combined.winPct - a.combined.winPct || b.combined.gp - a.combined.gp)[0];
      topWinStr = `${topWin.name} (${topWin.combined.winPct.toFixed(1)}%)`;
    } else if (activeStats.length > 0) {
      const topWin = [...activeStats].sort((a, b) => b.combined.winPct - a.combined.winPct || b.combined.gp - a.combined.gp)[0];
      topWinStr = `${topWin.name} (${topWin.combined.winPct.toFixed(1)}% Prov.)`;
    }

    container.innerHTML = `
      <div class="season-hero-card">
        <div class="season-hero-header">
          <div class="season-hero-badge">📅 12-WEEK LEAGUE</div>
          <h2 class="season-hero-title">${SEASON_CONFIG.name}</h2>
          <p class="season-hero-sub">September 27 – December 20, 2026 &bull; Status: <span class="season-status-active">● ACTIVE</span></p>
        </div>

        <div class="season-quick-stats-grid">
          <div class="season-stat-box">
            <div class="season-stat-val">${activePlayers.length}</div>
            <div class="season-stat-lbl">ACTIVE PLAYERS</div>
          </div>
          <div class="season-stat-box">
            <div class="season-stat-val">${allMatches.length}</div>
            <div class="season-stat-lbl">MATCHES RECORDED</div>
          </div>
          <div class="season-stat-box">
            <div class="season-stat-val">${doublesMatches.length} / ${singlesMatches.length}</div>
            <div class="season-stat-lbl">DOUBLES / SINGLES</div>
          </div>
          <div class="season-stat-box">
            <div class="season-stat-val">1500</div>
            <div class="season-stat-lbl">BASE ELO (K = 32)</div>
          </div>
        </div>

        ${allMatches.length > 0 ? `
          <div class="season-home-highlights-bar">
            <span>🔥 <strong>Most Active:</strong> ${mostActiveStr}</span>
            <span>🎯 <strong>Top Win %:</strong> ${topWinStr}</span>
          </div>
        ` : ''}

        <div class="season-hero-actions">
          <button type="button" class="season-primary-btn" onclick="SeasonApp.switchTab('record')">
            <span>➕</span> <span>Record Match</span>
          </button>
          <button type="button" class="season-secondary-btn" onclick="SeasonApp.switchTab('history')">
            <span>📊</span> <span>Match History (${allMatches.length})</span>
          </button>
          <button type="button" class="season-secondary-btn" onclick="SeasonApp.switchTab('players')">
            <span>👥</span> <span>Players (${activePlayers.length})</span>
          </button>
          <button type="button" class="season-secondary-btn" onclick="SeasonApp.switchTab('leaderboard')">
            <span>🏆</span> <span>Leaderboard</span>
          </button>
        </div>
      </div>

      <div class="season-grid-2col">
        <div class="season-card">
          <div class="season-card-header">
            <h3>🏸 Continuous League Format</h3>
          </div>
          <div class="season-card-body">
            <p style="color:var(--text-secondary); font-size:0.88rem; line-height:1.5; margin-bottom:12px;">
              Play and record games anytime throughout the 12-week season. Every Doubles and Singles game updates live Elo ratings, partner synergies, and rivalry head-to-head records.
            </p>
            <ul class="season-feature-list">
              <li><strong>Doubles (2v2) &amp; Singles (1v1):</strong> Record any social or weekly club game with open deuce scores.</li>
              <li><strong>Deterministic Ledger:</strong> The Firebase match ledger is the sole source of truth for all historical stats.</li>
              <li><strong>Tournament Seeding Bridge:</strong> Final season Elo seeds Level 1 / Level 2 / Level 3 tiers for the next tournament.</li>
            </ul>
          </div>
        </div>

        <div class="season-card">
          <div class="season-card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h3>⚡ Recent Matches (${allMatches.length})</h3>
            ${allMatches.length > 0 ? `<button type="button" class="season-btn-sm" onclick="SeasonApp.switchTab('history')">View All &rarr;</button>` : ''}
          </div>
          <div class="season-card-body" id="seasonRecentFeed">
            ${renderRecentMatchesHtml(allMatches.slice(0, 5))}
          </div>
        </div>
      </div>
    `;
  }

  // 13. Render Record Match Screen (Phase 3)
  function renderRecordMatch() {
    const container = document.getElementById('seasonRecordContainer');
    if (!container) return;

    const me = SeasonState.matchEntry;
    const isDoubles = me.matchType === 'DOUBLES';
    const activePlayers = getActivePlayers();
    const isAuthorized = isUserAuthorized();

    const selectedPlayerIds = [me.player1, me.player2, me.player3, me.player4];

    function renderPlayerOptions(currentSelectedId, slotKey) {
      let optionsHtml = `<option value="">-- Select Player --</option>`;
      activePlayers.forEach(p => {
        const isSelectedHere = p.id === currentSelectedId;
        const isSelectedElsewhere = selectedPlayerIds.includes(p.id) && !isSelectedHere;
        const disabledAttr = isSelectedElsewhere ? 'disabled' : '';
        const label = isSelectedElsewhere ? `${p.name} (Selected)` : p.name;
        optionsHtml += `<option value="${p.id}" ${isSelectedHere ? 'selected' : ''} ${disabledAttr}>${label}</option>`;
      });
      return optionsHtml;
    }

    let postSaveHtml = '';
    if (me.lastSavedSummary) {
      postSaveHtml = `
        <div class="season-post-save-banner">
          <div class="season-post-save-text">
            ✓ ${me.lastSavedSummary} (Saved to Ledger)
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="season-btn-sm season-btn-reactivate" onclick="SeasonApp.resetMatchScores()">
              <span>🔄</span> <span>Same Players</span>
            </button>
            <button type="button" class="season-btn-sm" onclick="SeasonApp.resetMatchEntry()">
              <span>➕</span> <span>New Match</span>
            </button>
          </div>
        </div>
      `;
    }

    let authWarningHtml = '';
    if (!isAuthorized) {
      authWarningHtml = `
        <div class="season-card" style="margin-bottom:16px; border-color:rgba(245, 158, 11, 0.4); background:rgba(254, 243, 199, 0.3);">
          <div class="season-card-body" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px;">
            <div style="font-size:0.85rem; color:#92400e; font-weight:700;">
              🔒 Scorekeeper / Organizer sign in required to record live season matches.
            </div>
            <button type="button" class="season-primary-btn" onclick="handleOrganizerAuthClick()" style="padding:6px 14px; font-size:0.8rem;">
              🔑 Sign In
            </button>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      ${authWarningHtml}
      ${postSaveHtml}

      <div class="season-match-form-card">
        <!-- Match Type Toggle -->
        <div class="season-match-type-toggle" role="tablist">
          <button type="button" class="season-type-btn ${isDoubles ? 'active' : ''}" onclick="SeasonApp.setMatchType('DOUBLES')">
            <span>👥</span> <span>Doubles (2v2)</span>
          </button>
          <button type="button" class="season-type-btn ${!isDoubles ? 'active' : ''}" onclick="SeasonApp.setMatchType('SINGLES')">
            <span>👤</span> <span>Singles (1v1)</span>
          </button>
        </div>

        <form id="seasonRecordMatchForm" onsubmit="SeasonApp.handleMatchFormSubmit(event)">
          <!-- Match Core Grid (Team A vs Team B) -->
          <div class="season-match-grid">
            
            <!-- TEAM A / PLAYER A -->
            <div class="season-team-box">
              <div class="season-team-header">${isDoubles ? 'TEAM A' : 'PLAYER A'}</div>
              <div>
                <select id="seasonMatchP1" class="season-select-styled" required onchange="SeasonApp.onMatchPlayerChange('player1', this.value)">
                  ${renderPlayerOptions(me.player1, 'player1')}
                </select>
              </div>
              ${isDoubles ? `
                <div>
                  <select id="seasonMatchP2" class="season-select-styled" required onchange="SeasonApp.onMatchPlayerChange('player2', this.value)">
                    ${renderPlayerOptions(me.player2, 'player2')}
                  </select>
                </div>
              ` : ''}
              <div class="season-score-input-wrap">
                <input type="number" id="seasonMatchScoreA" class="season-score-input" placeholder="21" min="0" max="99" inputmode="numeric" required value="${me.scoreA}" oninput="SeasonApp.onMatchScoreChange('scoreA', this.value)">
              </div>
            </div>

            <!-- VS DIVIDER -->
            <div class="season-vs-column">
              <span>VS</span>
            </div>

            <!-- TEAM B / PLAYER B -->
            <div class="season-team-box">
              <div class="season-team-header">${isDoubles ? 'TEAM B' : 'PLAYER B'}</div>
              <div>
                <select id="seasonMatchP3" class="season-select-styled" required onchange="SeasonApp.onMatchPlayerChange('player3', this.value)">
                  ${renderPlayerOptions(me.player3, 'player3')}
                </select>
              </div>
              ${isDoubles ? `
                <div>
                  <select id="seasonMatchP4" class="season-select-styled" required onchange="SeasonApp.onMatchPlayerChange('player4', this.value)">
                    ${renderPlayerOptions(me.player4, 'player4')}
                  </select>
                </div>
              ` : ''}
              <div class="season-score-input-wrap">
                <input type="number" id="seasonMatchScoreB" class="season-score-input" placeholder="17" min="0" max="99" inputmode="numeric" required value="${me.scoreB}" oninput="SeasonApp.onMatchScoreChange('scoreB', this.value)">
              </div>
            </div>

          </div>

          <!-- Collapsible Optional Details -->
          <div>
            <button type="button" class="season-accordion-toggle" onclick="SeasonApp.toggleOptionalMatchFields()">
              <span>${me.showOptional ? '▼' : '▶'}</span> <span>Optional Details (Court, Session, Date, Notes)</span>
            </button>
            <div class="season-optional-fields" style="display:${me.showOptional ? 'grid' : 'none'};">
              <div class="season-field-group">
                <label for="seasonMatchDate">MATCH DATE</label>
                <input type="date" id="seasonMatchDate" class="season-search-input" value="${me.matchDate}" onchange="SeasonState.matchEntry.matchDate = this.value">
              </div>
              <div class="season-field-group">
                <label for="seasonMatchCourt">COURT</label>
                <input type="text" id="seasonMatchCourt" class="season-search-input" placeholder="e.g. Court 1" value="${me.court}" oninput="SeasonState.matchEntry.court = this.value">
              </div>
              <div class="season-field-group">
                <label for="seasonMatchSession">SESSION</label>
                <input type="text" id="seasonMatchSession" class="season-search-input" placeholder="e.g. Sunday Afternoon" value="${me.session}" oninput="SeasonState.matchEntry.session = this.value">
              </div>
              <div class="season-field-group" style="grid-column: 1 / -1;">
                <label for="seasonMatchNotes">NOTES</label>
                <input type="text" id="seasonMatchNotes" class="season-search-input" placeholder="e.g. Friendly deuce match" value="${me.notes}" oninput="SeasonState.matchEntry.notes = this.value">
              </div>
            </div>
          </div>

          <!-- Error / Validation Warning -->
          <div id="seasonMatchWarn" class="season-modal-warn" style="margin-bottom:12px;"></div>

          <!-- Submit Button -->
          <button type="submit" id="seasonSaveMatchBtn" class="season-btn-save-match" ${me.saving ? 'disabled' : ''}>
            <span>🏸</span> <span id="seasonSaveMatchBtnText">${me.saving ? 'Saving Match...' : 'Save Game Result'}</span>
          </button>
        </form>
      </div>
    `;
  }

  function onMatchPlayerChange(slotKey, value) {
    SeasonState.matchEntry[slotKey] = value;
    renderRecordMatch();
  }

  function onMatchScoreChange(scoreKey, value) {
    SeasonState.matchEntry[scoreKey] = value;
  }

  function toggleOptionalMatchFields() {
    SeasonState.matchEntry.showOptional = !SeasonState.matchEntry.showOptional;
    renderRecordMatch();
  }

  async function handleMatchFormSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();

    const warn = document.getElementById('seasonMatchWarn');
    const submitBtn = document.getElementById('seasonSaveMatchBtn');
    const submitBtnText = document.getElementById('seasonSaveMatchBtnText');

    if (warn) warn.textContent = '';

    try {
      validateMatchEntry(SeasonState.matchEntry);
    } catch (valErr) {
      if (warn) warn.textContent = `⚠️ ${valErr.message}`;
      return;
    }

    if (!isUserAuthorized()) {
      if (typeof handleOrganizerAuthClick === 'function') {
        handleOrganizerAuthClick();
      } else {
        if (warn) warn.textContent = '⚠️ Sign in as authorized organizer to save matches.';
      }
      return;
    }

    SeasonState.matchEntry.saving = true;
    if (submitBtn) submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = 'Saving to Cloud Ledger...';

    try {
      const savedPayload = await saveMatch(SeasonState.matchEntry);
      SeasonState.matchEntry.saving = false;
      SeasonState.matchEntry.lastSavedSummary = formatMatchSummary(savedPayload);
      SeasonState.matchEntry.scoreA = '';
      SeasonState.matchEntry.scoreB = '';

      if (typeof showToast === 'function') {
        showToast(`✓ Match recorded: ${SeasonState.matchEntry.lastSavedSummary}`, 'success');
      }

      renderRecordMatch();
    } catch (saveErr) {
      SeasonState.matchEntry.saving = false;
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = 'Save Game Result';
      if (warn) warn.textContent = `⚠️ ${saveErr.message}`;
      console.error('[SeasonApp] Match save error:', saveErr);
    }
  }

  // 14. Render Players Screen
  function renderPlayers() {
    const container = document.getElementById('seasonPlayersContainer');
    if (!container) return;

    const allPlayers = Object.values(SeasonState.players);
    const activeCount = allPlayers.filter(p => p.active !== false).length;
    const inactiveCount = allPlayers.filter(p => p.active === false).length;
    const totalCount = allPlayers.length;

    const q = (SeasonState.playerSearchQuery || '').trim().toLowerCase();
    const filter = SeasonState.playerStatusFilter || 'active';

    const filteredPlayers = allPlayers.filter(p => {
      if (filter === 'active' && p.active === false) return false;
      if (filter === 'inactive' && p.active !== false) return false;

      if (q) {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const normMatch = (p.normalizedName || '').includes(q);
        return nameMatch || normMatch;
      }
      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    const isAuthorized = isUserAuthorized();

    let addPlayerActionHtml = '';
    if (isAuthorized) {
      addPlayerActionHtml = `
        <button type="button" class="season-primary-btn" onclick="SeasonApp.openAddPlayerModal()">
          <span>➕</span> <span>Add Player</span>
        </button>
      `;
    } else {
      addPlayerActionHtml = `
        <button type="button" class="season-secondary-btn" onclick="handleOrganizerAuthClick()" title="Sign in as authorized organizer to add players">
          <span>🔑</span> <span>Sign In to Add</span>
        </button>
      `;
    }

    container.innerHTML = `
      <div class="season-roster-header">
        <div class="season-roster-title-area">
          <h2>👤 Season Players Roster</h2>
          <div class="season-roster-chips">
            <span class="season-count-chip active-chip">${activeCount} Active</span>
            <span class="season-count-chip inactive-chip">${inactiveCount} Inactive</span>
            <span class="season-count-chip">${totalCount} Total</span>
          </div>
        </div>
        <div>
          ${addPlayerActionHtml}
        </div>
      </div>

      <div class="season-roster-toolbar">
        <div class="season-search-input-wrap">
          <span class="season-search-icon">🔍</span>
          <input type="text" class="season-search-input" placeholder="Search players by name..." value="${SeasonState.playerSearchQuery || ''}" oninput="SeasonApp.setPlayerSearchQuery(this.value)">
        </div>

        <div class="season-filter-segmented" role="tablist">
          <button type="button" class="season-filter-btn ${filter === 'active' ? 'active' : ''}" onclick="SeasonApp.setPlayerStatusFilter('active')">
            Active (${activeCount})
          </button>
          <button type="button" class="season-filter-btn ${filter === 'inactive' ? 'active' : ''}" onclick="SeasonApp.setPlayerStatusFilter('inactive')">
            Inactive (${inactiveCount})
          </button>
          <button type="button" class="season-filter-btn ${filter === 'all' ? 'active' : ''}" onclick="SeasonApp.setPlayerStatusFilter('all')">
            All (${totalCount})
          </button>
        </div>
      </div>

      <div class="season-players-grid">
        ${filteredPlayers.length > 0 ? filteredPlayers.map(p => {
          const isActive = p.active !== false;
          const initial = (p.name || '?').charAt(0).toUpperCase();

          let actionBtnHtml = '';
          if (isAuthorized) {
            if (isActive) {
              actionBtnHtml = `
                <button type="button" class="season-btn-sm season-btn-deactivate" onclick="SeasonApp.setPlayerActive('${p.id}', false)" title="Deactivate ${p.name}">
                  Deactivate
                </button>
              `;
            } else {
              actionBtnHtml = `
                <button type="button" class="season-btn-sm season-btn-reactivate" onclick="SeasonApp.setPlayerActive('${p.id}', true)" title="Reactivate ${p.name}">
                  Reactivate
                </button>
              `;
            }
          }

          return `
            <div class="season-player-card ${!isActive ? 'is-inactive' : ''}">
              <div class="season-player-info">
                <div class="season-player-avatar">${initial}</div>
                <div>
                  <div class="season-player-name">${p.name}</div>
                  <div class="season-player-meta">
                    <span class="season-status-dot ${!isActive ? 'inactive' : ''}"></span>
                    <span>${isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
              <div class="season-player-actions">
                ${actionBtnHtml}
              </div>
            </div>
          `;
        }).join('') : `
          <div class="season-empty-state" style="grid-column: 1 / -1;">
            <span style="font-size:2rem;">👤</span>
            <p style="font-weight:700; margin:6px 0 2px;">No players found</p>
            <p style="font-size:0.8rem; color:var(--text-muted);">
              ${q ? `No players match "${q}".` : (filter === 'inactive' ? 'No inactive players in this season.' : 'No players registered yet.')}
            </p>
          </div>
        `}
      </div>
    `;
  }

  function setPlayerSearchQuery(query) {
    SeasonState.playerSearchQuery = query;
    renderPlayers();
  }

  function setPlayerStatusFilter(filter) {
    SeasonState.playerStatusFilter = filter;
    renderPlayers();
  }

  function openAddPlayerModal() {
    if (!isUserAuthorized()) {
      if (typeof handleOrganizerAuthClick === 'function') {
        handleOrganizerAuthClick();
      } else {
        alert('Please sign in as an authorized organizer to add players.');
      }
      return;
    }

    const modal = document.getElementById('seasonAddPlayerModal');
    const input = document.getElementById('seasonPlayerNameInput');
    const warn = document.getElementById('seasonPlayerNameWarn');

    if (warn) warn.textContent = '';
    if (input) input.value = '';
    if (modal) {
      modal.classList.add('open');
      setTimeout(() => { if (input) input.focus(); }, 100);
    }
  }

  function closeAddPlayerModal() {
    const modal = document.getElementById('seasonAddPlayerModal');
    if (modal) modal.classList.remove('open');
  }

  function checkDuplicateNameOnInput(val) {
    const warn = document.getElementById('seasonPlayerNameWarn');
    const submitBtn = document.getElementById('seasonAddPlayerSubmitBtn');
    if (!warn) return;

    const norm = normalizePlayerName(val);
    if (!norm) {
      warn.textContent = '';
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const existing = Object.values(SeasonState.players).find(p => p.normalizedName === norm);
    if (existing) {
      warn.textContent = `⚠️ "${existing.name}" already exists in this season.`;
      if (submitBtn) submitBtn.disabled = true;
    } else {
      warn.textContent = '';
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function handleAddPlayerSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();

    const input = document.getElementById('seasonPlayerNameInput');
    const submitBtn = document.getElementById('seasonAddPlayerSubmitBtn');
    const warn = document.getElementById('seasonPlayerNameWarn');

    const name = input ? input.value : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding...';
    }

    try {
      const added = await addPlayer(name);
      closeAddPlayerModal();

      if (typeof showToast === 'function') {
        showToast(`✓ ${added.name} added to Fall 2026 Season`, 'success');
      }
    } catch (err) {
      if (warn) {
        warn.textContent = `⚠️ ${err.message}`;
      } else {
        alert(err.message);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '➕ Add Player';
      }
    }
  }

  // 15. Live Match Ledger & Real-Time Sync Gate (Phase 4)
  function subscribeToMatches() {
    if (SeasonState.matchesSubscribed) return;

    if (typeof firebase === 'undefined' || !firebase.database) {
      console.warn('[SeasonApp] Firebase Database not available for match sync');
      return;
    }

    try {
      const db = firebase.database();
      const matchesRef = db.ref(getSeasonMatchesPath());

      matchesRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        SeasonState.matches = data;
        SeasonState.matchesSubscribed = true;
        recalculatePlayerStats();

        if (SeasonState.activeTab === 'history') {
          renderMatchHistory();
        }
        if (SeasonState.activeTab === 'leaderboard') {
          renderLeaderboard();
        }
        if (SeasonState.activeTab === 'home') {
          renderSeasonHome();
        }
      }, (error) => {
        console.error('[SeasonApp] Real-time matches listener error:', error);
      });
    } catch (e) {
      console.warn('[SeasonApp] Failed to subscribe to Firebase matches:', e);
    }
  }

  function getMatches() {
    return Object.values(SeasonState.matches);
  }

  function isRenderableMatch(match) {
    if (!match || typeof match !== 'object') return false;
    if (!match.id || typeof match.id !== 'string') return false;
    if (match.matchType !== 'DOUBLES' && match.matchType !== 'SINGLES') return false;
    if (typeof match.scoreA !== 'number' || typeof match.scoreB !== 'number') return false;
    return true;
  }

  function getSortedMatches(direction = 'ASC') {
    const list = Object.values(SeasonState.matches).filter(isRenderableMatch);
    const isAsc = direction === 'ASC';

    return list.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;

      if (timeA !== timeB) {
        return isAsc ? timeA - timeB : timeB - timeA;
      }
      const idA = a.id || '';
      const idB = b.id || '';
      return isAsc ? idA.localeCompare(idB) : idB.localeCompare(idA);
    });
  }

  function getPlayerDisplayName(playerId) {
    if (!playerId) return 'Unknown Player';
    const player = SeasonState.players[playerId];
    if (player && player.name) {
      return player.name;
    }
    return 'Unknown Player';
  }

  function matchContainsPlayerSearch(match, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return true;

    const playerIds = [];
    if (match.matchType === 'SINGLES') {
      if (match.playerA) playerIds.push(match.playerA);
      if (match.playerB) playerIds.push(match.playerB);
    } else {
      if (match.teamA) {
        if (match.teamA.player1) playerIds.push(match.teamA.player1);
        if (match.teamA.player2) playerIds.push(match.teamA.player2);
      }
      if (match.teamB) {
        if (match.teamB.player1) playerIds.push(match.teamB.player1);
        if (match.teamB.player2) playerIds.push(match.teamB.player2);
      }
    }

    for (const pId of playerIds) {
      if (pId.toLowerCase().includes(q)) return true;
      const displayName = getPlayerDisplayName(pId);
      if (displayName.toLowerCase().includes(q)) return true;
    }

    if (match.court && match.court.toLowerCase().includes(q)) return true;
    if (match.session && match.session.toLowerCase().includes(q)) return true;
    if (match.notes && match.notes.toLowerCase().includes(q)) return true;
    if (match.enteredByName && match.enteredByName.toLowerCase().includes(q)) return true;

    return false;
  }

  function getFilteredMatches() {
    const allSorted = getSortedMatches('DESC');
    const filter = SeasonState.matchHistoryFilter || 'ALL';
    const query = SeasonState.matchHistorySearch || '';

    return allSorted.filter(m => {
      if (filter === 'DOUBLES' && m.matchType !== 'DOUBLES') return false;
      if (filter === 'SINGLES' && m.matchType !== 'SINGLES') return false;
      return matchContainsPlayerSearch(m, query);
    });
  }

  function formatMatchDate(dateStr, createdAt) {
    if (!dateStr && createdAt) {
      const d = new Date(createdAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }
    if (!dateStr) return 'RECENT';

    const todayStr = getTodayDateString();
    if (dateStr === todayStr) return 'TODAY';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yYyyy = yesterday.getFullYear();
    const yMm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yDd = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yYyyy}-${yMm}-${yDd}`;
    if (dateStr === yesterdayStr) return 'YESTERDAY';

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      if (!isNaN(dateObj.getTime())) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[month]} ${day}, ${year}`;
      }
    }
    return dateStr;
  }

  function formatMatchTime(createdAt) {
    if (!createdAt || typeof createdAt !== 'number') return '';
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function renderMatchCard(match) {
    if (!isRenderableMatch(match)) {
      return `
        <div class="season-match-card error-card">
          <div style="padding:12px; font-size:0.85rem; color:#dc2626;">
            ⚠️ Unable to display malformed match record (ID: ${match && match.id ? match.id : 'unknown'}).
          </div>
        </div>
      `;
    }

    const isDoubles = match.matchType === 'DOUBLES';
    const isWinnerA = match.winner === 'A';
    const isWinnerB = match.winner === 'B';

    let teamAName = '';
    let teamBName = '';

    if (isDoubles) {
      const p1 = getPlayerDisplayName(match.teamA ? match.teamA.player1 : '');
      const p2 = getPlayerDisplayName(match.teamA ? match.teamA.player2 : '');
      const p3 = getPlayerDisplayName(match.teamB ? match.teamB.player1 : '');
      const p4 = getPlayerDisplayName(match.teamB ? match.teamB.player2 : '');
      teamAName = `${p1} + ${p2}`;
      teamBName = `${p3} + ${p4}`;
    } else {
      teamAName = getPlayerDisplayName(match.playerA);
      teamBName = getPlayerDisplayName(match.playerB);
    }

    const playedDate = match.matchDate ? match.matchDate : '';
    const formattedDate = formatMatchDate(match.matchDate, match.createdAt);
    const timeFormatted = formatMatchTime(match.createdAt);
    const authorName = match.enteredByName || 'Organizer';

    const metadataPills = [];
    if (match.court && match.court.trim()) {
      metadataPills.push(`<span class="season-tag-pill">🏟️ ${match.court.trim()}</span>`);
    }
    if (match.session && match.session.trim()) {
      metadataPills.push(`<span class="season-tag-pill">⏰ ${match.session.trim()}</span>`);
    }
    if (match.notes && match.notes.trim()) {
      metadataPills.push(`<span class="season-tag-pill">📝 ${match.notes.trim()}</span>`);
    }

    return `
      <div class="season-match-card ${isDoubles ? 'is-doubles' : 'is-singles'}" data-match-id="${match.id}">
        <div class="season-match-card-header">
          <div class="season-match-badges">
            <span class="season-match-type-pill ${isDoubles ? 'doubles' : 'singles'}">
              ${isDoubles ? '👥 DOUBLES' : '👤 SINGLES'}
            </span>
            ${formattedDate === 'TODAY' || formattedDate === 'YESTERDAY' ? `
              <span class="season-date-pill ${formattedDate === 'TODAY' ? 'today' : 'yesterday'}">${formattedDate}</span>
            ` : ''}
          </div>
          <div class="season-match-time">
            ${timeFormatted ? `<span>⏱️ ${timeFormatted}</span>` : ''}
            ${playedDate ? `<span class="season-played-date" title="Logical Match Date">📅 ${playedDate}</span>` : ''}
          </div>
        </div>

        <div class="season-match-body">
          <div class="season-match-teams">
            
            <!-- TEAM A -->
            <div class="season-match-team-row ${isWinnerA ? 'is-winner' : 'is-loser'}">
              <div class="season-team-identity">
                <div class="season-winner-marker" aria-label="${isWinnerA ? 'Winner' : ''}">
                  ${isWinnerA ? '🏆' : ''}
                </div>
                <div class="season-team-names-wrap">
                  <div class="season-team-display-name">${teamAName}</div>
                  ${isWinnerA ? '<span class="season-winner-label">WINNER</span>' : ''}
                </div>
              </div>
              <div class="season-team-score ${isWinnerA ? 'score-win' : 'score-loss'}">
                ${match.scoreA}
              </div>
            </div>

            <!-- TEAM B -->
            <div class="season-match-team-row ${isWinnerB ? 'is-winner' : 'is-loser'}">
              <div class="season-team-identity">
                <div class="season-winner-marker" aria-label="${isWinnerB ? 'Winner' : ''}">
                  ${isWinnerB ? '🏆' : ''}
                </div>
                <div class="season-team-names-wrap">
                  <div class="season-team-display-name">${teamBName}</div>
                  ${isWinnerB ? '<span class="season-winner-label">WINNER</span>' : ''}
                </div>
              </div>
              <div class="season-team-score ${isWinnerB ? 'score-win' : 'score-loss'}">
                ${match.scoreB}
              </div>
            </div>

          </div>
        </div>

        <div class="season-match-footer">
          <div class="season-match-tags">
            ${metadataPills.join('')}
          </div>
          <div class="season-match-author">
            <span>Entered by ${authorName}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderRecentMatchesHtml(matches) {
    if (!matches || matches.length === 0) {
      const activePlayers = getActivePlayers();
      return `
        <div class="season-empty-state">
          <span style="font-size:2rem;">🏸</span>
          <p style="font-weight:700; margin:6px 0 2px;">No matches recorded yet</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">
            ${activePlayers.length} active players registered. Once matches are recorded, they will appear here in real-time.
          </p>
          <button type="button" class="season-primary-btn" onclick="SeasonApp.switchTab('record')" style="padding:6px 14px; font-size:0.82rem;">
            ➕ Record First Match
          </button>
        </div>
      `;
    }

    return `
      <div class="season-recent-list">
        ${matches.map(m => {
          const isDoubles = m.matchType === 'DOUBLES';
          const isWinnerA = m.winner === 'A';
          const isWinnerB = m.winner === 'B';
          
          let teamAName = '';
          let teamBName = '';
          if (isDoubles) {
            const p1 = getPlayerDisplayName(m.teamA ? m.teamA.player1 : '');
            const p2 = getPlayerDisplayName(m.teamA ? m.teamA.player2 : '');
            const p3 = getPlayerDisplayName(m.teamB ? m.teamB.player1 : '');
            const p4 = getPlayerDisplayName(m.teamB ? m.teamB.player2 : '');
            teamAName = `${p1} + ${p2}`;
            teamBName = `${p3} + ${p4}`;
          } else {
            teamAName = getPlayerDisplayName(m.playerA);
            teamBName = getPlayerDisplayName(m.playerB);
          }

          const dateLabel = formatMatchDate(m.matchDate, m.createdAt);
          const timeLabel = formatMatchTime(m.createdAt);

          return `
            <div class="season-recent-item">
              <div class="season-recent-meta">
                <span class="season-match-pill-sm ${isDoubles ? 'doubles' : 'singles'}">${isDoubles ? '👥 Doubles' : '👤 Singles'}</span>
                <span class="season-recent-time">${dateLabel}${timeLabel ? ` • ${timeLabel}` : ''}</span>
              </div>
              <div class="season-recent-scoreline">
                <div class="season-recent-team ${isWinnerA ? 'is-winner' : ''}">
                  ${isWinnerA ? '<span class="season-winner-crown">🏆</span>' : ''}
                  <span class="season-recent-name">${teamAName}</span>
                  <span class="season-recent-pts">${m.scoreA}</span>
                </div>
                <div class="season-recent-vs">vs</div>
                <div class="season-recent-team ${isWinnerB ? 'is-winner' : ''}">
                  ${isWinnerB ? '<span class="season-winner-crown">🏆</span>' : ''}
                  <span class="season-recent-name">${teamBName}</span>
                  <span class="season-recent-pts">${m.scoreB}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="margin-top:14px; text-align:center;">
        <button type="button" class="season-secondary-btn" onclick="SeasonApp.switchTab('history')" style="width:100%; justify-content:center; padding:8px 14px; font-size:0.85rem;">
          📊 View All Match History &rarr;
        </button>
      </div>
    `;
  }

  function renderMatchHistory() {
    const container = document.getElementById('seasonHistoryContainer');
    if (!container) return;

    const allMatches = getSortedMatches('DESC');
    const totalCount = allMatches.length;
    const doublesCount = allMatches.filter(m => m.matchType === 'DOUBLES').length;
    const singlesCount = allMatches.filter(m => m.matchType === 'SINGLES').length;

    const filteredMatches = getFilteredMatches();
    const currentFilter = SeasonState.matchHistoryFilter || 'ALL';
    const currentSearch = SeasonState.matchHistorySearch || '';
    const isAuthorized = isUserAuthorized();

    const grouped = {};
    filteredMatches.forEach(m => {
      const header = formatMatchDate(m.matchDate, m.createdAt);
      if (!grouped[header]) {
        grouped[header] = [];
      }
      grouped[header].push(m);
    });

    let actionBtnHtml = '';
    if (isAuthorized) {
      actionBtnHtml = `
        <button type="button" class="season-primary-btn" onclick="SeasonApp.switchTab('record')">
          <span>➕</span> <span>Record Match</span>
        </button>
      `;
    }

    container.innerHTML = `
      <div class="season-history-header-wrap">
        <div class="season-history-title-area">
          <h2>📊 Season Match History</h2>
          <div class="season-history-chips">
            <span class="season-count-chip total-chip">${totalCount} Total</span>
            <span class="season-count-chip doubles-chip">${doublesCount} Doubles</span>
            <span class="season-count-chip singles-chip">${singlesCount} Singles</span>
          </div>
        </div>
        <div>
          ${actionBtnHtml}
        </div>
      </div>

      <div class="season-history-toolbar">
        <div class="season-search-input-wrap">
          <span class="season-search-icon">🔍</span>
          <input type="text" id="seasonMatchSearchInput" class="season-search-input" placeholder="Search player, court, notes..." value="${currentSearch}" oninput="SeasonApp.setMatchHistorySearch(this.value)">
        </div>

        <div class="season-filter-segmented" role="tablist">
          <button type="button" class="season-filter-btn ${currentFilter === 'ALL' ? 'active' : ''}" onclick="SeasonApp.setMatchHistoryFilter('ALL')">
            All (${totalCount})
          </button>
          <button type="button" class="season-filter-btn ${currentFilter === 'DOUBLES' ? 'active' : ''}" onclick="SeasonApp.setMatchHistoryFilter('DOUBLES')">
            👥 Doubles (${doublesCount})
          </button>
          <button type="button" class="season-filter-btn ${currentFilter === 'SINGLES' ? 'active' : ''}" onclick="SeasonApp.setMatchHistoryFilter('SINGLES')">
            👤 Singles (${singlesCount})
          </button>
        </div>
      </div>

      <div class="season-history-feed">
        ${totalCount === 0 ? `
          <div class="season-empty-state" style="padding:48px 24px;">
            <span style="font-size:3rem;">🏸</span>
            <p style="font-size:1.1rem; font-weight:800; margin:12px 0 4px;">No season matches recorded yet</p>
            <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:18px; max-width:420px; margin-left:auto; margin-right:auto;">
              Once a game is saved, it will appear here in real-time across all connected devices.
            </p>
            ${isAuthorized ? `
              <button type="button" class="season-primary-btn" onclick="SeasonApp.switchTab('record')">
                <span>➕</span> <span>Record First Match</span>
              </button>
            ` : ''}
          </div>
        ` : (filteredMatches.length === 0 ? `
          <div class="season-empty-state" style="padding:36px 20px;">
            <span style="font-size:2.5rem;">🔍</span>
            <p style="font-size:1rem; font-weight:800; margin:8px 0 4px;">No matching matches found</p>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:14px;">
              ${currentSearch ? `No matches found matching "${currentSearch}".` : 'No matches for the selected filter.'}
            </p>
            <button type="button" class="season-secondary-btn" onclick="SeasonApp.setMatchHistorySearch(''); SeasonApp.setMatchHistoryFilter('ALL');">
              Reset Filters
            </button>
          </div>
        ` : Object.keys(grouped).map(dateHeader => `
          <div class="season-date-group">
            <div class="season-date-group-header">
              <span class="season-date-group-line"></span>
              <span class="season-date-group-title">📅 ${dateHeader}</span>
              <span class="season-date-group-count">${grouped[dateHeader].length} ${grouped[dateHeader].length === 1 ? 'match' : 'matches'}</span>
              <span class="season-date-group-line"></span>
            </div>
            <div class="season-date-group-cards">
              ${grouped[dateHeader].map(m => renderMatchCard(m)).join('')}
            </div>
          </div>
        `).join(''))}
      </div>
    `;
  }

  function setMatchHistoryFilter(filter) {
    const valid = (filter === 'DOUBLES' || filter === 'SINGLES') ? filter : 'ALL';
    SeasonState.matchHistoryFilter = valid;
    renderMatchHistory();
  }

  function setMatchHistorySearch(search) {
    SeasonState.matchHistorySearch = search || '';
    renderMatchHistory();
  }

  // 16. Pure In-Memory Statistics Engine (Phase 5)
  function createEmptyStatBucket() {
    return {
      gp: 0,
      wins: 0,
      losses: 0,
      pf: 0,
      pa: 0,
      pointDiff: 0,
      winPct: 0,
      avgPointDiff: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      last5: []
    };
  }

  function createEmptyPlayerStats(player) {
    return {
      playerId: player.id,
      name: player.name || 'Unknown Player',
      active: player.active !== false,
      combined: createEmptyStatBucket(),
      doubles: createEmptyStatBucket(),
      singles: createEmptyStatBucket(),
      _rawSeq: {
        combined: [],
        doubles: [],
        singles: []
      }
    };
  }

  function calculatePlayerStats(playersMap = {}, matchesMap = {}) {
    const stats = {};

    // 1. Initialize stats buckets for all registered players
    Object.values(playersMap || {}).forEach(player => {
      if (player && player.id) {
        stats[player.id] = createEmptyPlayerStats(player);
      }
    });

    // 2. Sort valid matches in canonical chronological order (createdAt ASC, id ASC)
    const validMatches = Object.values(matchesMap || {}).filter(isRenderableMatch);
    validMatches.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });

    // Helper to apply match result to player stats
    function applyPlayerMatch(pId, category, isWin, pf, pa) {
      if (!pId) return;
      const pStats = stats[pId];
      if (!pStats) return; // Skip unknown player reference safely

      const categories = [category, 'combined'];
      categories.forEach(cat => {
        const bucket = pStats[cat];
        bucket.gp += 1;
        bucket.pf += pf;
        bucket.pa += pa;

        if (isWin) {
          bucket.wins += 1;
          bucket.currentWinStreak += 1;
          if (bucket.currentWinStreak > bucket.bestWinStreak) {
            bucket.bestWinStreak = bucket.currentWinStreak;
          }
          pStats._rawSeq[cat].push('W');
        } else {
          bucket.losses += 1;
          bucket.currentWinStreak = 0;
          pStats._rawSeq[cat].push('L');
        }
      });
    }

    // 3. Process matches chronologically
    validMatches.forEach(m => {
      const isWinnerA = m.winner === 'A';
      if (m.matchType === 'DOUBLES') {
        const p1 = m.teamA ? m.teamA.player1 : null;
        const p2 = m.teamA ? m.teamA.player2 : null;
        const p3 = m.teamB ? m.teamB.player1 : null;
        const p4 = m.teamB ? m.teamB.player2 : null;

        applyPlayerMatch(p1, 'doubles', isWinnerA, m.scoreA, m.scoreB);
        applyPlayerMatch(p2, 'doubles', isWinnerA, m.scoreA, m.scoreB);
        applyPlayerMatch(p3, 'doubles', !isWinnerA, m.scoreB, m.scoreA);
        applyPlayerMatch(p4, 'doubles', !isWinnerA, m.scoreB, m.scoreA);
      } else if (m.matchType === 'SINGLES') {
        applyPlayerMatch(m.playerA, 'singles', isWinnerA, m.scoreA, m.scoreB);
        applyPlayerMatch(m.playerB, 'singles', !isWinnerA, m.scoreB, m.scoreA);
      }
    });

    // 4. Finalize derived fields (pointDiff, winPct, avgPointDiff, last5)
    Object.values(stats).forEach(pStats => {
      ['combined', 'doubles', 'singles'].forEach(cat => {
        const b = pStats[cat];
        b.pointDiff = b.pf - b.pa;
        b.winPct = b.gp > 0 ? (b.wins / b.gp) * 100 : 0;
        b.avgPointDiff = b.gp > 0 ? b.pointDiff / b.gp : 0;
        b.last5 = pStats._rawSeq[cat].slice(-5);
      });
      delete pStats._rawSeq;
    });

    return stats;
  }

  function recalculatePlayerStats() {
    const newStats = calculatePlayerStats(SeasonState.players, SeasonState.matches);
    SeasonState.playerStats = newStats;
    SeasonState.computed.playerStats = newStats;

    if (SeasonState.activeTab === 'leaderboard') {
      renderLeaderboard();
    }
    if (SeasonState.activeTab === 'home') {
      renderSeasonHome();
    }
    return newStats;
  }

  function getPlayerStats(playerId, mode = 'DOUBLES') {
    if (!playerId) return null;
    const pStats = SeasonState.playerStats[playerId];
    if (!pStats) return null;

    const cat = (mode || 'DOUBLES').toLowerCase();
    if (cat === 'singles') return pStats.singles;
    if (cat === 'combined') return pStats.combined;
    return pStats.doubles;
  }

  function getQualificationStatus(playerId, mode = 'DOUBLES') {
    const cat = (mode || 'DOUBLES').toLowerCase();
    const validCat = (cat === 'singles' || cat === 'combined') ? cat : 'doubles';
    const minRequired = SeasonState.config.minGamesQualified || 15;

    const pStats = SeasonState.playerStats[playerId];
    const gp = pStats && pStats[validCat] ? pStats[validCat].gp : 0;
    const qualified = gp >= minRequired;

    return {
      qualified,
      status: qualified ? 'QUALIFIED' : 'PROVISIONAL',
      gamesPlayed: gp,
      minimumRequired: minRequired,
      gamesRemaining: Math.max(0, minRequired - gp)
    };
  }

  function getTraditionalLeaderboard(mode = 'DOUBLES') {
    const cat = (mode || 'DOUBLES').toLowerCase();
    const validCat = (cat === 'singles' || cat === 'combined') ? cat : 'doubles';
    const minRequired = SeasonState.config.minGamesQualified || 15;

    const entries = Object.values(SeasonState.playerStats).map(p => {
      const b = p[validCat] || createEmptyStatBucket();
      const isQual = b.gp >= minRequired;
      return {
        playerId: p.playerId,
        name: p.name,
        active: p.active,
        qualified: isQual,
        status: isQual ? 'QUALIFIED' : 'PROVISIONAL',
        ...b
      };
    });

    // Sort order:
    // 1. Qualified first, Provisional second
    // 2. Win % DESC
    // 3. GP DESC
    // 4. Point Diff DESC
    // 5. PF DESC
    // 6. Name ASC
    entries.sort((a, b) => {
      if (a.qualified !== b.qualified) {
        return a.qualified ? -1 : 1;
      }
      if (Math.abs(a.winPct - b.winPct) > 0.0001) {
        return b.winPct - a.winPct;
      }
      if (a.gp !== b.gp) {
        return b.gp - a.gp;
      }
      if (a.pointDiff !== b.pointDiff) {
        return b.pointDiff - a.pointDiff;
      }
      if (a.pf !== b.pf) {
        return b.pf - a.pf;
      }
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });

    return entries.map((entry, idx) => ({
      rank: idx + 1,
      ...entry
    }));
  }

  function formatWinPct(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0.0%';
    return `${value.toFixed(1)}%`;
  }

  function formatPointDiff(value) {
    if (typeof value !== 'number' || isNaN(value) || value === 0) return '0';
    return value > 0 ? `+${value}` : `${value}`;
  }

  function formatAvgPointDiff(value) {
    if (typeof value !== 'number' || isNaN(value) || value === 0) return '0.00';
    return value > 0 ? `+${value.toFixed(2)}` : `${value.toFixed(2)}`;
  }

  function formatForm(last5) {
    if (!Array.isArray(last5) || last5.length === 0) return '<span style="color:var(--text-muted);">—</span>';
    return last5.map(res => `<span class="season-form-badge ${res === 'W' ? 'win' : 'loss'}">${res}</span>`).join(' ');
  }

  function setLeaderboardMode(mode) {
    const valid = (mode === 'SINGLES' || mode === 'COMBINED') ? mode : 'DOUBLES';
    SeasonState.leaderboardMode = valid;
    renderLeaderboard();
  }

  function renderLeaderboard() {
    const container = document.getElementById('seasonLeaderboardContainer');
    if (!container) return;

    const mode = SeasonState.leaderboardMode || 'DOUBLES';
    const entries = getTraditionalLeaderboard(mode);
    const minRequired = SeasonState.config.minGamesQualified || 15;

    const qualifiedCount = entries.filter(e => e.qualified).length;
    const provisionalCount = entries.filter(e => !e.qualified).length;

    container.innerHTML = `
      <div class="season-lb-wrap">
        <div class="season-lb-header">
          <div class="season-lb-title-area">
            <h2>🏆 Season Traditional Standings</h2>
            <p class="season-lb-subtitle">
              Pure In-Memory Standings &bull; Ranked by: Qualification &rarr; Win % &rarr; GP &rarr; +/- &rarr; PF
            </p>
          </div>
          <div class="season-lb-rule-badge">
            <span>🎯 ${minRequired} Games to Qualify</span>
          </div>
        </div>

        <div class="season-lb-notice">
          ℹ️ <strong>Phase 5 Active:</strong> Traditional Win % standings. Independent Singles &amp; Doubles Elo ratings will activate in <strong>Phase 6</strong>.
        </div>

        <div class="season-lb-toolbar">
          <div class="season-filter-segmented" role="tablist">
            <button type="button" class="season-filter-btn ${mode === 'DOUBLES' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardMode('DOUBLES')">
              👥 Doubles
            </button>
            <button type="button" class="season-filter-btn ${mode === 'SINGLES' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardMode('SINGLES')">
              👤 Singles
            </button>
            <button type="button" class="season-filter-btn ${mode === 'COMBINED' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardMode('COMBINED')">
              🌐 Combined
            </button>
          </div>
          <div class="season-lb-count-info">
            <span class="season-count-chip active-chip">${qualifiedCount} Qualified</span>
            <span class="season-count-chip">${provisionalCount} Provisional</span>
          </div>
        </div>

        <div class="season-lb-table-card">
          <div class="season-lb-table-responsive">
            <table class="season-lb-table">
              <thead>
                <tr>
                  <th style="width:44px; text-align:center;">#</th>
                  <th>PLAYER</th>
                  <th>STATUS</th>
                  <th style="text-align:center;">GP</th>
                  <th style="text-align:center;">W</th>
                  <th style="text-align:center;">L</th>
                  <th style="text-align:right;">WIN %</th>
                  <th style="text-align:right;">PF</th>
                  <th style="text-align:right;">PA</th>
                  <th style="text-align:right;">+/-</th>
                  <th style="text-align:right;">AVG +/-</th>
                  <th style="text-align:center;">FORM (L5)</th>
                </tr>
              </thead>
              <tbody>
                ${entries.length > 0 ? entries.map(e => `
                  <tr class="${e.qualified ? 'row-qualified' : 'row-provisional'}">
                    <td style="text-align:center; font-weight:800; color:var(--text-secondary);">${e.rank}</td>
                    <td>
                      <div style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                        <span>${e.name}</span>
                        ${!e.active ? '<span class="season-tag-pill" style="font-size:0.6rem; padding:1px 4px;">Inactive</span>' : ''}
                      </div>
                    </td>
                    <td>
                      <span class="season-status-pill ${e.qualified ? 'qualified' : 'provisional'}">
                        ${e.qualified ? 'QUALIFIED' : 'PROVISIONAL'}
                      </span>
                    </td>
                    <td style="text-align:center; font-weight:700;">${e.gp}</td>
                    <td style="text-align:center; color:var(--win-color, #059669); font-weight:700;">${e.wins}</td>
                    <td style="text-align:center; color:var(--text-muted);">${e.losses}</td>
                    <td style="text-align:right; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                      ${formatWinPct(e.winPct)}
                    </td>
                    <td style="text-align:right; color:var(--text-secondary);">${e.pf}</td>
                    <td style="text-align:right; color:var(--text-secondary);">${e.pa}</td>
                    <td style="text-align:right; font-weight:700; color:${e.pointDiff > 0 ? 'var(--win-color, #059669)' : (e.pointDiff < 0 ? '#dc2626' : 'var(--text-muted)')};">
                      ${formatPointDiff(e.pointDiff)}
                    </td>
                    <td style="text-align:right; font-weight:600; color:var(--text-secondary);">
                      ${formatAvgPointDiff(e.avgPointDiff)}
                    </td>
                    <td style="text-align:center; white-space:nowrap;">
                      ${formatForm(e.last5)}
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="12" style="text-align:center; padding:32px; color:var(--text-muted);">
                      No players registered yet.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // 17. Initialization
  function initSeasonApp() {
    if (SeasonState.initialized) return;
    SeasonState.initialized = true;

    subscribeToPlayers();
    subscribeToMatches();
    recalculatePlayerStats();
    switchSeasonTab(SeasonState.activeTab);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.TournamentFirebase && typeof window.TournamentFirebase.onAuthChange === 'function') {
      window.TournamentFirebase.onAuthChange(() => {
        if (SeasonState.activeTab === 'players') {
          renderPlayers();
        }
        if (SeasonState.activeTab === 'record') {
          renderRecordMatch();
        }
        if (SeasonState.activeTab === 'history') {
          renderMatchHistory();
        }
        if (SeasonState.activeTab === 'leaderboard') {
          renderLeaderboard();
        }
      });
    }

    const savedMode = getPortalMode();
    if (savedMode === 'season') {
      setPortalMode('season', false);
    } else {
      setPortalMode('tournament', false);
    }
  });

  // Export public API under SeasonApp namespace
  window.SeasonApp = {
    CONFIG: SEASON_CONFIG,
    state: SeasonState,
    getPortalMode,
    setPortalMode,
    switchTab: switchSeasonTab,
    init: initSeasonApp,
    getSeasonConfigPath,
    getSeasonPlayersPath,
    getSeasonMatchesPath,
    getSeasonAuditPath,
    getSeasonComputedPath,

    // Phase 2 Player Management API
    normalizePlayerName,
    generatePlayerId,
    getPlayers,
    getActivePlayers,
    getPlayerById,
    subscribeToPlayers,
    addPlayer,
    setPlayerActive,
    renderPlayers,
    renderSeasonHome,
    setPlayerSearchQuery,
    setPlayerStatusFilter,
    openAddPlayerModal,
    closeAddPlayerModal,
    checkDuplicateNameOnInput,
    handleAddPlayerSubmit,

    // Phase 3 Match Entry API
    generateMatchId,
    generateAuditId,
    setMatchType,
    getSelectedMatchPlayers,
    validateMatchEntry,
    buildMatchPayload,
    formatMatchSummary,
    saveMatch,
    resetMatchScores,
    resetMatchEntry,
    renderRecordMatch,
    onMatchPlayerChange,
    onMatchScoreChange,
    toggleOptionalMatchFields,
    handleMatchFormSubmit,

    // Phase 4 Match History & Live Ledger API
    subscribeToMatches,
    getMatches,
    getSortedMatches,
    getFilteredMatches,
    getPlayerDisplayName,
    matchContainsPlayerSearch,
    isRenderableMatch,
    renderMatchCard,
    renderMatchHistory,
    renderRecentMatches: () => renderRecentMatchesHtml(getSortedMatches('DESC').slice(0, 5)),
    formatMatchDate,
    formatMatchTime,
    setMatchHistoryFilter,
    setMatchHistorySearch,

    // Phase 5 Pure In-Memory Statistics Engine API
    createEmptyStatBucket,
    createEmptyPlayerStats,
    calculatePlayerStats,
    recalculatePlayerStats,
    getPlayerStats,
    getQualificationStatus,
    getTraditionalLeaderboard,
    renderLeaderboard,
    setLeaderboardMode,
    formatWinPct,
    formatPointDiff,
    formatAvgPointDiff,
    formatForm
  };

  // Global helper aliases for HTML onclick handlers
  window.setPortalMode = setPortalMode;
  window.switchSeasonTab = switchSeasonTab;

})();

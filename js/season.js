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
    endDate: '2026-12-19', // Strict 12-week (84 calendar days) match season. Dec 20 is Tournament Seeding Day.
    totalWeeks: 12,
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

  function getSeasonSeedingSnapshotsPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/seedingSnapshots`;
  }

  function getSeasonFinalSnapshotPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/finalSnapshot`;
  }

  // 3. Season State (Isolated Namespace)
  const SeasonState = {
    activeTab: 'home',
    config: { ...SEASON_CONFIG },
    players: {},
    matches: {},
    audit: {},
    playerSearchQuery: '',
    playerStatusFilter: 'active', // 'active' | 'inactive' | 'all'
    matchHistoryFilter: 'ALL', // 'ALL' | 'DOUBLES' | 'SINGLES'
    matchHistorySearch: '',
    auditFilter: 'ALL', // 'ALL' | 'MATCHES' | 'PLAYERS' | 'SEASON'
    leaderboardView: 'ELO', // 'ELO' | 'TRADITIONAL'
    leaderboardMode: 'DOUBLES', // 'DOUBLES' | 'SINGLES' | 'COMBINED'
    selectedPlayerId: null,
    playerProfileMode: 'COMBINED', // 'COMBINED' | 'DOUBLES' | 'SINGLES'
    editMatchState: null,
    elo: {
      ratings: {},
      histories: {},
      matchDeltas: {}
    },
    analytics: {
      partnerships: {},
      headToHead: {}
    },
    weeklyAnalytics: {
      weeks: {},
      seasonSummary: {
        totalWeeks: 12,
        totalMatches: 0,
        doublesMatches: 0,
        singlesMatches: 0,
        totalPlayers: 0,
        avgMatchesPerWeek: 0,
        busiestWeek: null,
        highestParticipationWeek: null,
        weeklyTrends: []
      }
    },
    selectedWeek: 1,
    weeklyMode: 'COMBINED', // 'COMBINED' | 'DOUBLES' | 'SINGLES'
    seeding: {
      selectedPlayerIds: [],
      proposedLevels: {},
      finalLevels: {},
      config: {
        level3Count: 8,
        level2Count: 10,
        level1Count: 6,
        minGamesQualified: 15
      },
      evidencePlayerId: null,
      snapshots: {},
      selectedSnapshotId: null
    },
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
    configSubscribed: false,
    playersSubscribed: false,
    matchesSubscribed: false,
    auditSubscribed: false
  };

  function isSeasonWritable() {
    const isFrozen = Boolean(SeasonState.config && SeasonState.config.status === 'FROZEN');
    return !isFrozen && isUserAuthorized();
  }

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

  // 6. Firebase Real-Time Subscriptions (Config, Players, Audit)
  function subscribeToSeasonConfig() {
    if (SeasonState.configSubscribed) return;

    if (typeof firebase === 'undefined' || !firebase.database) {
      return;
    }

    try {
      const db = firebase.database();
      const configRef = db.ref(getSeasonConfigPath());

      configRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        SeasonState.config = { ...SEASON_CONFIG, ...data };
        SeasonState.configSubscribed = true;

        if (SeasonState.activeTab === 'admin') {
          renderSeasonAdmin();
        }
        if (SeasonState.activeTab === 'record') {
          renderRecordMatch();
        }
        if (SeasonState.activeTab === 'players') {
          renderPlayers();
        }
        if (SeasonState.activeTab === 'home') {
          renderSeasonHome();
        }
        if (SeasonState.activeTab === 'history') {
          renderMatchHistory();
        }
      }, (error) => {
        console.error('[SeasonApp] Real-time config listener error:', error);
      });
    } catch (e) {
      console.warn('[SeasonApp] Failed to subscribe to season config:', e);
    }
  }

  function subscribeToAudit() {
    if (SeasonState.auditSubscribed) return;

    if (typeof firebase === 'undefined' || !firebase.database) {
      return;
    }

    try {
      const db = firebase.database();
      const auditRef = db.ref(getSeasonAuditPath());

      auditRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        SeasonState.audit = data;
        SeasonState.auditSubscribed = true;

        if (SeasonState.activeTab === 'admin') {
          renderSeasonAdmin();
        }
      }, (error) => {
        console.error('[SeasonApp] Real-time audit listener error:', error);
      });
    } catch (e) {
      console.warn('[SeasonApp] Failed to subscribe to season audit:', e);
    }
  }

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
        recalculateElo();
        recalculateAnalytics();

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
        if (SeasonState.activeTab === 'admin') {
          renderSeasonAdmin();
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
    if (!isSeasonWritable()) {
      throw new Error('Season is frozen. Player registrations are locked.');
    }

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

    if (!authUser && !isUserAuthorized()) {
      throw new Error('Sign in as an authorized organizer to add players.');
    }

    const playerId = generatePlayerId();
    const auditId = generateAuditId();
    const actorUid = authUser ? authUser.uid : 'organizer';
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const playerRecord = {
      id: playerId,
      name: trimmedName,
      normalizedName: norm,
      active: true,
      joinedAt: serverTimestamp,
      createdByUid: actorUid,
      updatedAt: serverTimestamp,
      updatedByUid: actorUid
    };

    const auditPayload = {
      action: 'PLAYER_CREATED',
      targetId: playerId,
      playerName: trimmedName,
      playerData: playerRecord,
      timestamp: serverTimestamp,
      actorUid: actorUid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      const updates = {};
      updates[`${getSeasonPlayersPath()}/${playerId}`] = playerRecord;
      updates[`${getSeasonAuditPath()}/${auditId}`] = auditPayload;
      await db.ref().update(updates);
    } else {
      SeasonState.players[playerId] = { ...playerRecord, joinedAt: Date.now(), updatedAt: Date.now() };
      SeasonState.audit[auditId] = auditPayload;
    }

    return playerRecord;
  }

  // 8. Toggle Active / Inactive Status
  async function setPlayerActive(playerId, active) {
    if (!isSeasonWritable()) {
      throw new Error('Season is frozen. Player status changes are locked.');
    }

    const player = SeasonState.players[playerId];
    if (!player) {
      throw new Error('Player not found.');
    }

    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }

    if (!authUser && !isUserAuthorized()) {
      throw new Error('Sign in as an authorized organizer to change player status.');
    }

    const currentActive = player.active !== false;
    const actorUid = authUser ? authUser.uid : 'organizer';
    const auditId = generateAuditId();
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const updates = {
      active: Boolean(active),
      updatedAt: serverTimestamp,
      updatedByUid: actorUid
    };

    const auditPayload = {
      action: 'PLAYER_STATUS_CHANGED',
      targetId: playerId,
      playerName: player.name,
      before: currentActive,
      after: Boolean(active),
      timestamp: serverTimestamp,
      actorUid: actorUid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      const updatesRef = {};
      updatesRef[`${getSeasonPlayersPath()}/${playerId}/active`] = Boolean(active);
      updatesRef[`${getSeasonPlayersPath()}/${playerId}/updatedAt`] = serverTimestamp;
      updatesRef[`${getSeasonPlayersPath()}/${playerId}/updatedByUid`] = actorUid;
      updatesRef[`${getSeasonAuditPath()}/${auditId}`] = auditPayload;
      await db.ref().update(updatesRef);
    } else {
      SeasonState.players[playerId].active = Boolean(active);
      SeasonState.players[playerId].updatedAt = Date.now();
      SeasonState.players[playerId].updatedByUid = actorUid;
      SeasonState.audit[auditId] = auditPayload;
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
    if (!isSeasonWritable()) {
      throw new Error('Season is frozen. Recording new matches is locked.');
    }

    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }

    if (!authUser && !isUserAuthorized()) {
      throw new Error('Sign in as an authorized scorekeeper/organizer to record a match.');
    }

    const matchId = generateMatchId();
    const auditId = generateAuditId();
    const actorUid = authUser ? authUser.uid : 'organizer';
    const matchPayload = buildMatchPayload(entry, matchId, authUser || { uid: actorUid, displayName: 'Organizer' });

    const auditPayload = {
      action: 'MATCH_CREATED',
      targetId: matchId,
      timestamp: (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
        ? firebase.database.ServerValue.TIMESTAMP
        : Date.now(),
      actorUid: actorUid
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
      SeasonState.audit[auditId] = auditPayload;
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
    } else if (tabName === 'leaderboard') {
      renderLeaderboard();
    } else if (tabName === 'weekly') {
      renderWeeklyInsights();
    } else if (tabName === 'admin') {
      renderSeasonAdmin();
    } else if (tabName === 'seeding') {
      renderTournamentSeeding();
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

    let topDoublesEloStr = 'No qualified players yet';
    let topSinglesEloStr = 'No qualified players yet';
    const dLeaders = getEloLeaderboard('DOUBLES').filter(e => e.qualified);
    if (dLeaders.length > 0) {
      topDoublesEloStr = `${dLeaders[0].name} — ${formatElo(dLeaders[0].elo)}`;
    }
    const sLeaders = getEloLeaderboard('SINGLES').filter(e => e.qualified);
    if (sLeaders.length > 0) {
      topSinglesEloStr = `${sLeaders[0].name} — ${formatElo(sLeaders[0].elo)}`;
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
            <div class="season-stat-val">${SEASON_CONFIG.startingElo || 1500}</div>
            <div class="season-stat-lbl">BASE ELO (K = ${SEASON_CONFIG.kFactor || 32})</div>
          </div>
        </div>

        ${allMatches.length > 0 ? `
          <div class="season-home-highlights-bar">
            <span>👥 <strong>Top Doubles:</strong> ${topDoublesEloStr}</span>
            <span>👤 <strong>Top Singles:</strong> ${topSinglesEloStr}</span>
            <span>🔥 <strong>Most Active:</strong> ${mostActiveStr}</span>
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

    if (SeasonState.selectedPlayerId) {
      renderPlayerProfile();
      return;
    }

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
          const pStats = (SeasonState.playerStats && SeasonState.playerStats[p.id]) || null;
          const gp = pStats && pStats.combined ? pStats.combined.gp : 0;
          const dElo = (SeasonState.elo && SeasonState.elo.ratings && SeasonState.elo.ratings[p.id]) ? SeasonState.elo.ratings[p.id].doublesElo : 1500;
          const sElo = (SeasonState.elo && SeasonState.elo.ratings && SeasonState.elo.ratings[p.id]) ? SeasonState.elo.ratings[p.id].singlesElo : 1500;

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
            <div class="season-player-card ${!isActive ? 'is-inactive' : ''}" onclick="SeasonApp.openPlayerProfile('${p.id}')">
              <div class="season-player-info">
                <div class="season-player-avatar">${initial}</div>
                <div>
                  <div class="season-player-name">${p.name}</div>
                  <div class="season-player-meta">
                    <span class="season-status-dot ${!isActive ? 'inactive' : ''}"></span>
                    <span>${isActive ? 'Active' : 'Inactive'}</span>
                    <span class="season-card-gp-pill">${gp} GP</span>
                    <span class="season-card-elo-tag">👥 ${formatElo(dElo)}</span>
                    <span class="season-card-elo-tag">👤 ${formatElo(sElo)}</span>
                  </div>
                </div>
              </div>
              <div class="season-player-actions" onclick="event.stopPropagation()">
                ${actionBtnHtml}
                <button type="button" class="season-btn-sm season-btn-view-profile" onclick="SeasonApp.openPlayerProfile('${p.id}')" title="View ${p.name}'s Profile">
                  Profile &rarr;
                </button>
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
        recalculateElo();
        recalculateAnalytics();

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

    const eloDeltaInfo = (SeasonState.elo && SeasonState.elo.matchDeltas) ? SeasonState.elo.matchDeltas[match.id] : null;
    let deltaPillA = '';
    let deltaPillB = '';
    if (eloDeltaInfo && eloDeltaInfo.deltas) {
      if (isDoubles) {
        const p1 = match.teamA ? match.teamA.player1 : null;
        const d1 = p1 ? eloDeltaInfo.deltas[p1] : null;
        if (typeof d1 === 'number') {
          deltaPillA = `<span class="season-delta-tag ${d1 >= 0 ? 'pos' : 'neg'}">${formatEloDelta(d1)} Elo</span>`;
        }
        const p3 = match.teamB ? match.teamB.player1 : null;
        const d3 = p3 ? eloDeltaInfo.deltas[p3] : null;
        if (typeof d3 === 'number') {
          deltaPillB = `<span class="season-delta-tag ${d3 >= 0 ? 'pos' : 'neg'}">${formatEloDelta(d3)} Elo</span>`;
        }
      } else {
        const dA = match.playerA ? eloDeltaInfo.deltas[match.playerA] : null;
        if (typeof dA === 'number') {
          deltaPillA = `<span class="season-delta-tag ${dA >= 0 ? 'pos' : 'neg'}">${formatEloDelta(dA)} Elo</span>`;
        }
        const dB = match.playerB ? eloDeltaInfo.deltas[match.playerB] : null;
        if (typeof dB === 'number') {
          deltaPillB = `<span class="season-delta-tag ${dB >= 0 ? 'pos' : 'neg'}">${formatEloDelta(dB)} Elo</span>`;
        }
      }
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
                  <div style="display:flex; align-items:center; gap:6px;">
                    ${isWinnerA ? '<span class="season-winner-label">WINNER</span>' : ''}
                    ${deltaPillA}
                  </div>
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
                  <div style="display:flex; align-items:center; gap:6px;">
                    ${isWinnerB ? '<span class="season-winner-label">WINNER</span>' : ''}
                    ${deltaPillB}
                  </div>
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
            ${match.revision && match.revision > 1 ? `<span class="season-tag-pill" style="background:rgba(245, 158, 11, 0.12); color:#b45309; font-weight:800;">Rev ${match.revision}</span>` : ''}
            ${metadataPills.join('')}
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
            <div class="season-match-author">
              <span>Entered by ${authorName}</span>
            </div>
            ${isUserAuthorized() && isSeasonWritable() ? `
              <button type="button" class="season-btn-edit-match" onclick="SeasonApp.openEditMatch('${match.id}')" title="Correct match record">
                <span>✏️</span> <span>Edit</span>
              </button>
            ` : ''}
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

  function setLeaderboardView(view) {
    const valid = view === 'TRADITIONAL' ? 'TRADITIONAL' : 'ELO';
    SeasonState.leaderboardView = valid;
    renderLeaderboard();
  }

  // 17. Deterministic Elo Engine (Phase 6)
  function getStartingElo() {
    return (SeasonState.config && typeof SeasonState.config.startingElo === 'number')
      ? SeasonState.config.startingElo
      : 1500;
  }

  function getKFactor() {
    return (SeasonState.config && typeof SeasonState.config.kFactor === 'number')
      ? SeasonState.config.kFactor
      : 32;
  }

  function calculateExpectedScore(ratingA, ratingB) {
    const rA = typeof ratingA === 'number' && !isNaN(ratingA) ? ratingA : 1500;
    const rB = typeof ratingB === 'number' && !isNaN(ratingB) ? ratingB : 1500;
    return 1 / (1 + Math.pow(10, (rB - rA) / 400));
  }

  function calculateEloDelta(expected, actual, kFactor) {
    const k = typeof kFactor === 'number' && !isNaN(kFactor) ? kFactor : getKFactor();
    const exp = typeof expected === 'number' && !isNaN(expected) ? expected : 0.5;
    const act = typeof actual === 'number' && !isNaN(actual) ? actual : 0;
    return k * (act - exp);
  }

  function createInitialEloState(playersMap = {}, config = {}) {
    const startElo = (config && typeof config.startingElo === 'number') ? config.startingElo : getStartingElo();
    const ratings = {};
    const histories = {};

    Object.values(playersMap || {}).forEach(player => {
      if (player && player.id) {
        ratings[player.id] = {
          playerId: player.id,
          name: player.name || 'Unknown Player',
          active: player.active !== false,
          doublesElo: startElo,
          singlesElo: startElo
        };
        histories[player.id] = {
          doubles: [],
          singles: []
        };
      }
    });

    return {
      ratings,
      histories,
      matchDeltas: {}
    };
  }

  function isValidEloMatch(match, playersMap = {}) {
    if (!match || typeof match !== 'object') return false;
    if (!match.id || typeof match.id !== 'string') return false;
    if (typeof match.scoreA !== 'number' || typeof match.scoreB !== 'number') return false;
    if (match.scoreA === match.scoreB) return false;
    if (match.scoreA < 0 || match.scoreB < 0) return false;
    if (match.winner !== 'A' && match.winner !== 'B') return false;

    const hasPlayersMap = playersMap && Object.keys(playersMap).length > 0;

    if (match.matchType === 'DOUBLES') {
      const p1 = match.teamA ? match.teamA.player1 : null;
      const p2 = match.teamA ? match.teamA.player2 : null;
      const p3 = match.teamB ? match.teamB.player1 : null;
      const p4 = match.teamB ? match.teamB.player2 : null;

      if (!p1 || !p2 || !p3 || !p4) return false;
      const unique = new Set([p1, p2, p3, p4]);
      if (unique.size !== 4) return false;

      if (hasPlayersMap) {
        if (!playersMap[p1] || !playersMap[p2] || !playersMap[p3] || !playersMap[p4]) {
          return false;
        }
      }
      return true;
    } else if (match.matchType === 'SINGLES') {
      const pA = match.playerA;
      const pB = match.playerB;

      if (!pA || !pB || pA === pB) return false;
      if (hasPlayersMap) {
        if (!playersMap[pA] || !playersMap[pB]) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  function calculateEloRatings(playersMap = {}, matchesMap = {}, config = SeasonState.config) {
    const kFactor = (config && typeof config.kFactor === 'number') ? config.kFactor : getKFactor();

    // 1. Initialize ratings and histories for all registered players
    const state = createInitialEloState(playersMap, config);
    const ratings = state.ratings;
    const histories = state.histories;
    const matchDeltas = {};

    // 2. Filter & Sort valid matches chronologically (createdAt ASC, id ASC)
    const validMatches = Object.values(matchesMap || {}).filter(m => isValidEloMatch(m, playersMap));
    validMatches.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });

    // 3. Process matches in canonical order
    validMatches.forEach(m => {
      const isWinnerA = m.winner === 'A';
      const actualA = isWinnerA ? 1 : 0;
      const actualB = 1 - actualA;
      const createdAt = typeof m.createdAt === 'number' ? m.createdAt : 0;

      if (m.matchType === 'DOUBLES') {
        const p1 = m.teamA.player1;
        const p2 = m.teamA.player2;
        const p3 = m.teamB.player1;
        const p4 = m.teamB.player2;

        if (!ratings[p1] || !ratings[p2] || !ratings[p3] || !ratings[p4]) return;

        const r1 = ratings[p1].doublesElo;
        const r2 = ratings[p2].doublesElo;
        const r3 = ratings[p3].doublesElo;
        const r4 = ratings[p4].doublesElo;

        const teamARating = (r1 + r2) / 2;
        const teamBRating = (r3 + r4) / 2;

        const ea = calculateExpectedScore(teamARating, teamBRating);
        const eb = 1 - ea;

        const deltaA = calculateEloDelta(ea, actualA, kFactor);
        const deltaB = -deltaA;

        const postR1 = r1 + deltaA;
        const postR2 = r2 + deltaA;
        const postR3 = r3 + deltaB;
        const postR4 = r4 + deltaB;

        ratings[p1].doublesElo = postR1;
        ratings[p2].doublesElo = postR2;
        ratings[p3].doublesElo = postR3;
        ratings[p4].doublesElo = postR4;

        histories[p1].doubles.push({
          matchId: m.id,
          createdAt: createdAt,
          before: r1,
          delta: deltaA,
          after: postR1
        });
        histories[p2].doubles.push({
          matchId: m.id,
          createdAt: createdAt,
          before: r2,
          delta: deltaA,
          after: postR2
        });
        histories[p3].doubles.push({
          matchId: m.id,
          createdAt: createdAt,
          before: r3,
          delta: deltaB,
          after: postR3
        });
        histories[p4].doubles.push({
          matchId: m.id,
          createdAt: createdAt,
          before: r4,
          delta: deltaB,
          after: postR4
        });

        matchDeltas[m.id] = {
          matchId: m.id,
          matchType: 'DOUBLES',
          createdAt: createdAt,
          preRatings: {
            [p1]: r1,
            [p2]: r2,
            [p3]: r3,
            [p4]: r4
          },
          expected: {
            teamA: ea,
            teamB: eb
          },
          deltas: {
            [p1]: deltaA,
            [p2]: deltaA,
            [p3]: deltaB,
            [p4]: deltaB
          },
          postRatings: {
            [p1]: postR1,
            [p2]: postR2,
            [p3]: postR3,
            [p4]: postR4
          }
        };
      } else if (m.matchType === 'SINGLES') {
        const pA = m.playerA;
        const pB = m.playerB;

        if (!ratings[pA] || !ratings[pB]) return;

        const rA = ratings[pA].singlesElo;
        const rB = ratings[pB].singlesElo;

        const ea = calculateExpectedScore(rA, rB);
        const eb = 1 - ea;

        const deltaA = calculateEloDelta(ea, actualA, kFactor);
        const deltaB = -deltaA;

        const postRA = rA + deltaA;
        const postRB = rB + deltaB;

        ratings[pA].singlesElo = postRA;
        ratings[pB].singlesElo = postRB;

        histories[pA].singles.push({
          matchId: m.id,
          createdAt: createdAt,
          before: rA,
          delta: deltaA,
          after: postRA
        });
        histories[pB].singles.push({
          matchId: m.id,
          createdAt: createdAt,
          before: rB,
          delta: deltaB,
          after: postRB
        });

        matchDeltas[m.id] = {
          matchId: m.id,
          matchType: 'SINGLES',
          createdAt: createdAt,
          preRatings: {
            [pA]: rA,
            [pB]: rB
          },
          expected: {
            playerA: ea,
            playerB: eb
          },
          deltas: {
            [pA]: deltaA,
            [pB]: deltaB
          },
          postRatings: {
            [pA]: postRA,
            [pB]: postRB
          }
        };
      }
    });

    return {
      ratings,
      histories,
      matchDeltas
    };
  }

  function recalculateElo() {
    const result = calculateEloRatings(SeasonState.players, SeasonState.matches, SeasonState.config);
    SeasonState.elo = result;
    SeasonState.computed.doublesElo = {};
    SeasonState.computed.singlesElo = {};

    Object.keys(result.ratings).forEach(pId => {
      SeasonState.computed.doublesElo[pId] = result.ratings[pId].doublesElo;
      SeasonState.computed.singlesElo[pId] = result.ratings[pId].singlesElo;
    });

    if (SeasonState.activeTab === 'leaderboard') {
      renderLeaderboard();
    }
    if (SeasonState.activeTab === 'home') {
      renderSeasonHome();
    }
    if (SeasonState.activeTab === 'history') {
      renderMatchHistory();
    }
    return result;
  }

  function getPlayerElo(playerId, mode = 'DOUBLES') {
    if (!playerId) return null;
    const startElo = getStartingElo();
    if (!SeasonState.elo || !SeasonState.elo.ratings || !SeasonState.elo.ratings[playerId]) {
      return startElo;
    }
    const cat = (mode || 'DOUBLES').toUpperCase();
    if (cat === 'SINGLES') {
      return SeasonState.elo.ratings[playerId].singlesElo;
    }
    if (cat === 'DOUBLES') {
      return SeasonState.elo.ratings[playerId].doublesElo;
    }
    return null;
  }

  function formatElo(value) {
    if (typeof value !== 'number' || isNaN(value)) return '1500';
    return `${Math.round(value)}`;
  }

  function formatEloDelta(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    const rounded = Math.round(value);
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  }

  function getEloLeaderboard(mode = 'DOUBLES') {
    const cat = (mode || 'DOUBLES').toUpperCase();
    const minRequired = (SeasonState.config && SeasonState.config.minGamesQualified) || 15;
    const startElo = getStartingElo();

    if (cat === 'COMBINED') {
      const entries = Object.values(SeasonState.players || {}).map(player => {
        const pId = player.id;
        const pStats = (SeasonState.playerStats && SeasonState.playerStats[pId]) || null;
        const combinedBucket = pStats ? pStats.combined : createEmptyStatBucket();
        const doublesRating = (SeasonState.elo && SeasonState.elo.ratings && SeasonState.elo.ratings[pId]) ? SeasonState.elo.ratings[pId].doublesElo : startElo;
        const singlesRating = (SeasonState.elo && SeasonState.elo.ratings && SeasonState.elo.ratings[pId]) ? SeasonState.elo.ratings[pId].singlesElo : startElo;

        return {
          playerId: pId,
          name: player.name || 'Unknown Player',
          active: player.active !== false,
          doublesElo: doublesRating,
          singlesElo: singlesRating,
          gp: combinedBucket.gp,
          wins: combinedBucket.wins,
          losses: combinedBucket.losses,
          winPct: combinedBucket.winPct,
          rank: '—'
        };
      });

      entries.sort((a, b) => {
        if (a.gp !== b.gp) return b.gp - a.gp;
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });

      return entries;
    }

    const isSingles = cat === 'SINGLES';
    const statKey = isSingles ? 'singles' : 'doubles';
    const eloKey = isSingles ? 'singlesElo' : 'doublesElo';

    const allPlayers = Object.values(SeasonState.players || {});
    const entries = allPlayers.map(player => {
      const pId = player.id;
      const pStats = (SeasonState.playerStats && SeasonState.playerStats[pId]) || null;
      const bucket = pStats ? pStats[statKey] : createEmptyStatBucket();
      const elo = (SeasonState.elo && SeasonState.elo.ratings && SeasonState.elo.ratings[pId]) ? SeasonState.elo.ratings[pId][eloKey] : startElo;
      const isQual = bucket.gp >= minRequired;

      return {
        playerId: pId,
        name: player.name || 'Unknown Player',
        active: player.active !== false,
        elo: elo,
        gp: bucket.gp,
        wins: bucket.wins,
        losses: bucket.losses,
        winPct: bucket.winPct,
        qualified: isQual,
        status: isQual ? 'QUALIFIED' : 'PROVISIONAL'
      };
    });

    entries.sort((a, b) => {
      if (a.qualified !== b.qualified) {
        return a.qualified ? -1 : 1;
      }
      if (Math.abs(a.elo - b.elo) > 0.0001) {
        return b.elo - a.elo;
      }
      if (a.gp !== b.gp) {
        return b.gp - a.gp;
      }
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });

    let qualRank = 1;
    return entries.map(entry => {
      const rank = entry.qualified ? qualRank++ : '—';
      return {
        rank,
        ...entry
      };
    });
  }

  // 18. Leaderboard View Renderer (Elo & Traditional)
  function renderLeaderboard() {
    const container = document.getElementById('seasonLeaderboardContainer');
    if (!container) return;

    const view = SeasonState.leaderboardView || 'ELO';
    const mode = SeasonState.leaderboardMode || 'DOUBLES';
    const minRequired = SeasonState.config.minGamesQualified || 15;

    if (view === 'TRADITIONAL') {
      const entries = getTraditionalLeaderboard(mode);
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

          <div class="season-lb-top-controls">
            <div class="season-lb-view-toggle" role="tablist">
              <button type="button" class="season-lb-view-btn ${view === 'ELO' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardView('ELO')">
                <span>⭐</span> <span>Elo Ratings</span>
              </button>
              <button type="button" class="season-lb-view-btn ${view === 'TRADITIONAL' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardView('TRADITIONAL')">
                <span>📊</span> <span>Traditional Standings</span>
              </button>
            </div>
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
      return;
    }

    // ELO VIEW
    const eloEntries = getEloLeaderboard(mode);
    const isCombined = mode === 'COMBINED';

    if (isCombined) {
      container.innerHTML = `
        <div class="season-lb-wrap">
          <div class="season-lb-header">
            <div class="season-lb-title-area">
              <h2>⭐ Season Elo Ratings</h2>
              <p class="season-lb-subtitle">
                Combined Overview &bull; Independent Doubles &amp; Singles Elo displayed side-by-side
              </p>
            </div>
            <div class="season-lb-rule-badge">
              <span>🎯 ${minRequired} Games to Qualify</span>
            </div>
          </div>

          <div class="season-lb-top-controls">
            <div class="season-lb-view-toggle" role="tablist">
              <button type="button" class="season-lb-view-btn ${view === 'ELO' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardView('ELO')">
                <span>⭐</span> <span>Elo Ratings</span>
              </button>
              <button type="button" class="season-lb-view-btn ${view === 'TRADITIONAL' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardView('TRADITIONAL')">
                <span>📊</span> <span>Traditional Standings</span>
              </button>
            </div>
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
              <span class="season-count-chip">${eloEntries.length} Players</span>
            </div>
          </div>

          <div class="season-lb-notice">
            🌐 <strong>Combined Overview:</strong> Displays independent Doubles and Singles Elo side-by-side. Elo ratings are never averaged or combined into a synthetic composite rank.
          </div>

          <div class="season-lb-table-card">
            <div class="season-lb-table-responsive">
              <table class="season-lb-table">
                <thead>
                  <tr>
                    <th>PLAYER</th>
                    <th style="text-align:right;">DOUBLES ELO</th>
                    <th style="text-align:right;">SINGLES ELO</th>
                    <th style="text-align:center;">COMBINED GP</th>
                    <th style="text-align:center;">W - L</th>
                    <th style="text-align:right;">WIN %</th>
                  </tr>
                </thead>
                <tbody>
                  ${eloEntries.length > 0 ? eloEntries.map(e => `
                    <tr>
                      <td>
                        <div style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                          <span>${e.name}</span>
                          ${!e.active ? '<span class="season-tag-pill" style="font-size:0.6rem; padding:1px 4px;">Inactive</span>' : ''}
                        </div>
                      </td>
                      <td style="text-align:right;">
                        <span class="season-elo-pill doubles">${formatElo(e.doublesElo)}</span>
                      </td>
                      <td style="text-align:right;">
                        <span class="season-elo-pill singles">${formatElo(e.singlesElo)}</span>
                      </td>
                      <td style="text-align:center; font-weight:700;">${e.gp}</td>
                      <td style="text-align:center; color:var(--text-secondary);">${e.wins}–${e.losses}</td>
                      <td style="text-align:right; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                        ${formatWinPct(e.winPct)}
                      </td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">
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
      return;
    }

    // DOUBLES or SINGLES ELO
    const qualifiedEntries = eloEntries.filter(e => e.qualified);
    const provisionalEntries = eloEntries.filter(e => !e.qualified);
    const modeLabel = mode === 'SINGLES' ? 'Singles' : 'Doubles';

    container.innerHTML = `
      <div class="season-lb-wrap">
        <div class="season-lb-header">
          <div class="season-lb-title-area">
            <h2>⭐ Season ${modeLabel} Elo Ratings</h2>
            <p class="season-lb-subtitle">
              Deterministic Replay &bull; Ranked by: Qualified First &rarr; Elo Rating &rarr; GP &rarr; Name
            </p>
          </div>
          <div class="season-lb-rule-badge">
            <span>🎯 ${minRequired} Games to Qualify</span>
          </div>
        </div>

        <div class="season-lb-top-controls">
          <div class="season-lb-view-toggle" role="tablist">
            <button type="button" class="season-lb-view-btn ${view === 'ELO' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardView('ELO')">
              <span>⭐</span> <span>Elo Ratings</span>
            </button>
            <button type="button" class="season-lb-view-btn ${view === 'TRADITIONAL' ? 'active' : ''}" onclick="SeasonApp.setLeaderboardView('TRADITIONAL')">
              <span>📊</span> <span>Traditional Standings</span>
            </button>
          </div>
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
            <span class="season-count-chip active-chip">${qualifiedEntries.length} Qualified</span>
            <span class="season-count-chip">${provisionalEntries.length} Provisional</span>
          </div>
        </div>

        <div class="season-lb-table-card">
          <div class="season-lb-table-responsive">
            <table class="season-lb-table">
              <thead>
                <tr>
                  <th style="width:44px; text-align:center;">#</th>
                  <th>PLAYER</th>
                  <th style="text-align:right;">ELO RATING</th>
                  <th style="text-align:center;">GP</th>
                  <th style="text-align:center;">W - L</th>
                  <th style="text-align:right;">WIN %</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${qualifiedEntries.length > 0 ? qualifiedEntries.map(e => `
                  <tr class="row-qualified">
                    <td style="text-align:center; font-weight:800; color:var(--text-secondary);">${e.rank}</td>
                    <td>
                      <div style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                        <span>${e.name}</span>
                        ${!e.active ? '<span class="season-tag-pill" style="font-size:0.6rem; padding:1px 4px;">Inactive</span>' : ''}
                      </div>
                    </td>
                    <td style="text-align:right;">
                      <span class="season-elo-pill ${mode === 'SINGLES' ? 'singles' : 'doubles'}">${formatElo(e.elo)}</span>
                    </td>
                    <td style="text-align:center; font-weight:700;">${e.gp}</td>
                    <td style="text-align:center; color:var(--text-secondary);">${e.wins}–${e.losses}</td>
                    <td style="text-align:right; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                      ${formatWinPct(e.winPct)}
                    </td>
                    <td>
                      <span class="season-status-pill qualified">QUALIFIED</span>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">
                      No qualified players yet (minimum ${minRequired} games required).
                    </td>
                  </tr>
                `}

                ${provisionalEntries.length > 0 ? `
                  <tr class="season-provisional-divider-row">
                    <td colspan="7">
                      <div class="season-provisional-divider-content">
                        <span>— PROVISIONAL PLAYERS (Needs ${minRequired} GP) —</span>
                      </div>
                    </td>
                  </tr>
                  ${provisionalEntries.map(e => `
                    <tr class="row-provisional">
                      <td style="text-align:center; font-weight:700; color:var(--text-muted);">${e.rank}</td>
                      <td>
                        <div style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                          <span>${e.name}</span>
                          ${!e.active ? '<span class="season-tag-pill" style="font-size:0.6rem; padding:1px 4px;">Inactive</span>' : ''}
                        </div>
                      </td>
                      <td style="text-align:right;">
                        <span class="season-elo-pill provisional">${formatElo(e.elo)}</span>
                      </td>
                      <td style="text-align:center; font-weight:700;">${e.gp}</td>
                      <td style="text-align:center; color:var(--text-muted);">${e.wins}–${e.losses}</td>
                      <td style="text-align:right; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                        ${formatWinPct(e.winPct)}
                      </td>
                      <td>
                        <span class="season-status-pill provisional">PROVISIONAL</span>
                      </td>
                    </tr>
                  `).join('')}
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // 19. Player Profiles, Partner Synergy & Head-to-Head Engine (Phase 7)
  function createEmptyPartnerBucket(partnerId) {
    return {
      partnerId: partnerId,
      gp: 0,
      wins: 0,
      losses: 0,
      pf: 0,
      pa: 0,
      pointDiff: 0,
      winPct: 0,
      avgPointDiff: 0
    };
  }

  function calculatePartnerSynergy(playersMap = {}, matchesMap = {}) {
    const synergy = {};

    Object.values(playersMap || {}).forEach(player => {
      if (player && player.id) {
        synergy[player.id] = {};
      }
    });

    const validMatches = Object.values(matchesMap || {}).filter(m => isValidEloMatch(m, playersMap) && m.matchType === 'DOUBLES');

    function recordPartnership(p1, p2, isWin, pf, pa) {
      if (!p1 || !p2 || !synergy[p1] || !synergy[p2]) return;

      if (!synergy[p1][p2]) synergy[p1][p2] = createEmptyPartnerBucket(p2);
      if (!synergy[p2][p1]) synergy[p2][p1] = createEmptyPartnerBucket(p1);

      [synergy[p1][p2], synergy[p2][p1]].forEach(b => {
        b.gp += 1;
        b.pf += pf;
        b.pa += pa;
        if (isWin) {
          b.wins += 1;
        } else {
          b.losses += 1;
        }
      });
    }

    validMatches.forEach(m => {
      const isWinA = m.winner === 'A';
      const p1 = m.teamA.player1;
      const p2 = m.teamA.player2;
      const p3 = m.teamB.player1;
      const p4 = m.teamB.player2;

      recordPartnership(p1, p2, isWinA, m.scoreA, m.scoreB);
      recordPartnership(p3, p4, !isWinA, m.scoreB, m.scoreA);
    });

    Object.values(synergy).forEach(partnerObj => {
      Object.values(partnerObj).forEach(b => {
        b.pointDiff = b.pf - b.pa;
        b.winPct = b.gp > 0 ? (b.wins / b.gp) * 100 : 0;
        b.avgPointDiff = b.gp > 0 ? b.pointDiff / b.gp : 0;
      });
    });

    return synergy;
  }

  function createEmptyH2HCategoryBucket() {
    return {
      gp: 0,
      wins: 0,
      losses: 0,
      pf: 0,
      pa: 0,
      pointDiff: 0,
      winPct: 0,
      avgPointDiff: 0
    };
  }

  function createEmptyH2HOpponentRecord(opponentId) {
    return {
      opponentId: opponentId,
      combined: createEmptyH2HCategoryBucket(),
      doubles: createEmptyH2HCategoryBucket(),
      singles: createEmptyH2HCategoryBucket()
    };
  }

  function calculateHeadToHead(playersMap = {}, matchesMap = {}) {
    const h2h = {};

    Object.values(playersMap || {}).forEach(player => {
      if (player && player.id) {
        h2h[player.id] = {};
      }
    });

    const validMatches = Object.values(matchesMap || {}).filter(m => isValidEloMatch(m, playersMap));

    function recordEncounter(playerId, opponentId, category, isWin, pf, pa) {
      if (!playerId || !opponentId || playerId === opponentId) return;
      if (!h2h[playerId]) h2h[playerId] = {};
      if (!h2h[playerId][opponentId]) {
        h2h[playerId][opponentId] = createEmptyH2HOpponentRecord(opponentId);
      }

      const record = h2h[playerId][opponentId];
      const categories = [category, 'combined'];

      categories.forEach(cat => {
        const b = record[cat];
        b.gp += 1;
        b.pf += pf;
        b.pa += pa;
        if (isWin) {
          b.wins += 1;
        } else {
          b.losses += 1;
        }
      });
    }

    validMatches.forEach(m => {
      const isWinnerA = m.winner === 'A';

      if (m.matchType === 'SINGLES') {
        const pA = m.playerA;
        const pB = m.playerB;

        recordEncounter(pA, pB, 'singles', isWinnerA, m.scoreA, m.scoreB);
        recordEncounter(pB, pA, 'singles', !isWinnerA, m.scoreB, m.scoreA);
      } else if (m.matchType === 'DOUBLES') {
        const p1 = m.teamA.player1;
        const p2 = m.teamA.player2;
        const p3 = m.teamB.player1;
        const p4 = m.teamB.player2;

        recordEncounter(p1, p3, 'doubles', isWinnerA, m.scoreA, m.scoreB);
        recordEncounter(p1, p4, 'doubles', isWinnerA, m.scoreA, m.scoreB);
        recordEncounter(p2, p3, 'doubles', isWinnerA, m.scoreA, m.scoreB);
        recordEncounter(p2, p4, 'doubles', isWinnerA, m.scoreA, m.scoreB);

        recordEncounter(p3, p1, 'doubles', !isWinnerA, m.scoreB, m.scoreA);
        recordEncounter(p3, p2, 'doubles', !isWinnerA, m.scoreB, m.scoreA);
        recordEncounter(p4, p1, 'doubles', !isWinnerA, m.scoreB, m.scoreA);
        recordEncounter(p4, p2, 'doubles', !isWinnerA, m.scoreB, m.scoreA);
      }
    });

    Object.values(h2h).forEach(oppMap => {
      Object.values(oppMap).forEach(rec => {
        ['combined', 'doubles', 'singles'].forEach(cat => {
          const b = rec[cat];
          b.pointDiff = b.pf - b.pa;
          b.winPct = b.gp > 0 ? (b.wins / b.gp) * 100 : 0;
          b.avgPointDiff = b.gp > 0 ? b.pointDiff / b.gp : 0;
        });
      });
    });

    return h2h;
  }

  function recalculateAnalytics() {
    const partnerships = calculatePartnerSynergy(SeasonState.players, SeasonState.matches);
    const headToHead = calculateHeadToHead(SeasonState.players, SeasonState.matches);

    SeasonState.analytics = {
      partnerships,
      headToHead
    };
    SeasonState.computed.partnerships = partnerships;
    SeasonState.computed.headToHead = headToHead;

    if (SeasonState.activeTab === 'players') {
      renderPlayers();
    }
    return SeasonState.analytics;
  }

  function getEloSummary(playerId, mode = 'DOUBLES') {
    const startElo = getStartingElo();
    if (!playerId) {
      return { start: startElo, current: startElo, peak: startElo, low: startElo, change: 0, games: 0 };
    }

    const cat = (mode || 'DOUBLES').toUpperCase();
    const validCat = cat === 'SINGLES' ? 'singles' : 'doubles';
    const eloKey = cat === 'SINGLES' ? 'singlesElo' : 'doublesElo';

    const currentElo = (SeasonState.elo && SeasonState.elo.ratings && SeasonState.elo.ratings[playerId])
      ? SeasonState.elo.ratings[playerId][eloKey]
      : startElo;

    const history = (SeasonState.elo && SeasonState.elo.histories && SeasonState.elo.histories[playerId] && SeasonState.elo.histories[playerId][validCat])
      ? SeasonState.elo.histories[playerId][validCat]
      : [];

    let peak = startElo;
    let low = startElo;

    history.forEach(step => {
      if (step.after > peak) peak = step.after;
      if (step.after < low) low = step.after;
    });

    return {
      start: startElo,
      current: currentElo,
      peak: peak,
      low: low,
      change: currentElo - startElo,
      games: history.length
    };
  }

  function getPartnerStats(playerId) {
    if (!playerId || !SeasonState.analytics || !SeasonState.analytics.partnerships || !SeasonState.analytics.partnerships[playerId]) {
      return [];
    }
    const partnersMap = SeasonState.analytics.partnerships[playerId];
    const list = Object.values(partnersMap).map(b => {
      const partner = SeasonState.players[b.partnerId] || { id: b.partnerId, name: 'Unknown Player', active: true };
      return {
        partnerId: b.partnerId,
        partnerName: partner.name || 'Unknown Player',
        active: partner.active !== false,
        ...b
      };
    });

    list.sort((a, b) => {
      if (a.gp !== b.gp) return b.gp - a.gp;
      if (Math.abs(a.winPct - b.winPct) > 0.0001) return b.winPct - a.winPct;
      if (a.pointDiff !== b.pointDiff) return b.pointDiff - a.pointDiff;
      return (a.partnerName || '').localeCompare(b.partnerName || '', undefined, { sensitivity: 'base' });
    });

    return list;
  }

  function getHeadToHeadStats(playerId, mode = 'COMBINED') {
    if (!playerId || !SeasonState.analytics || !SeasonState.analytics.headToHead || !SeasonState.analytics.headToHead[playerId]) {
      return [];
    }
    const oppMap = SeasonState.analytics.headToHead[playerId];
    const cat = (mode || 'COMBINED').toLowerCase();
    const validCat = (cat === 'singles' || cat === 'doubles') ? cat : 'combined';

    const list = Object.values(oppMap).map(rec => {
      const b = rec[validCat] || createEmptyH2HCategoryBucket();
      const opponent = SeasonState.players[rec.opponentId] || { id: rec.opponentId, name: 'Unknown Player', active: true };
      return {
        opponentId: rec.opponentId,
        opponentName: opponent.name || 'Unknown Player',
        active: opponent.active !== false,
        ...b
      };
    }).filter(r => r.gp > 0);

    list.sort((a, b) => {
      if (a.gp !== b.gp) return b.gp - a.gp;
      return (a.opponentName || '').localeCompare(b.opponentName || '', undefined, { sensitivity: 'base' });
    });

    return list;
  }

  function getPlayerRecentMatches(playerId, limit = 10) {
    if (!playerId) return [];
    const sorted = getSortedMatches('DESC');
    const filtered = sorted.filter(m => {
      if (m.matchType === 'SINGLES') {
        return m.playerA === playerId || m.playerB === playerId;
      } else if (m.matchType === 'DOUBLES') {
        const p1 = m.teamA ? m.teamA.player1 : null;
        const p2 = m.teamA ? m.teamA.player2 : null;
        const p3 = m.teamB ? m.teamB.player1 : null;
        const p4 = m.teamB ? m.teamB.player2 : null;
        return p1 === playerId || p2 === playerId || p3 === playerId || p4 === playerId;
      }
      return false;
    });
    return filtered.slice(0, limit);
  }

  function getMatchPerspective(match, playerId) {
    if (!match || !playerId) return null;
    const isDoubles = match.matchType === 'DOUBLES';
    let isTeamA = false;
    let isTeamB = false;
    const partnerIds = [];
    const opponentIds = [];

    if (isDoubles) {
      const p1 = match.teamA ? match.teamA.player1 : null;
      const p2 = match.teamA ? match.teamA.player2 : null;
      const p3 = match.teamB ? match.teamB.player1 : null;
      const p4 = match.teamB ? match.teamB.player2 : null;

      if (p1 === playerId) {
        isTeamA = true;
        if (p2) partnerIds.push(p2);
        if (p3) opponentIds.push(p3);
        if (p4) opponentIds.push(p4);
      } else if (p2 === playerId) {
        isTeamA = true;
        if (p1) partnerIds.push(p1);
        if (p3) opponentIds.push(p3);
        if (p4) opponentIds.push(p4);
      } else if (p3 === playerId) {
        isTeamB = true;
        if (p4) partnerIds.push(p4);
        if (p1) opponentIds.push(p1);
        if (p2) opponentIds.push(p2);
      } else if (p4 === playerId) {
        isTeamB = true;
        if (p3) partnerIds.push(p3);
        if (p1) opponentIds.push(p1);
        if (p2) opponentIds.push(p2);
      }
    } else {
      if (match.playerA === playerId) {
        isTeamA = true;
        if (match.playerB) opponentIds.push(match.playerB);
      } else if (match.playerB === playerId) {
        isTeamB = true;
        if (match.playerA) opponentIds.push(match.playerA);
      }
    }

    if (!isTeamA && !isTeamB) return null;

    const isWin = (isTeamA && match.winner === 'A') || (isTeamB && match.winner === 'B');
    const pf = isTeamA ? match.scoreA : match.scoreB;
    const pa = isTeamA ? match.scoreB : match.scoreA;

    let eloDelta = 0;
    if (SeasonState.elo && SeasonState.elo.matchDeltas && SeasonState.elo.matchDeltas[match.id]) {
      const md = SeasonState.elo.matchDeltas[match.id];
      if (md.deltas && typeof md.deltas[playerId] === 'number') {
        eloDelta = md.deltas[playerId];
      }
    }

    return {
      result: isWin ? 'W' : 'L',
      pf,
      pa,
      isDoubles,
      partnerIds,
      opponentIds,
      eloDelta
    };
  }

  function renderEloSvgChart(history, startElo = 1500, mode = 'DOUBLES') {
    const label = mode === 'SINGLES' ? 'Singles' : 'Doubles';
    if (!history || history.length === 0) {
      return `
        <div class="season-chart-empty">
          <span style="font-size:1.5rem;">📈</span>
          <p style="margin:4px 0 2px; font-weight:700;">No ${label} Elo history yet</p>
          <p style="font-size:0.8rem; color:var(--text-muted);">Starting rating: ${startElo}</p>
        </div>
      `;
    }

    const points = [{ index: 0, elo: startElo, matchId: 'start' }];
    history.forEach((step, idx) => {
      points.push({ index: idx + 1, elo: step.after, matchId: step.matchId });
    });

    const width = 500;
    const height = 160;
    const padLeft = 45;
    const padRight = 25;
    const padTop = 20;
    const padBottom = 30;

    const minElo = Math.min(...points.map(p => p.elo));
    const maxElo = Math.max(...points.map(p => p.elo));
    const eloRange = Math.max(40, maxElo - minElo);
    const yMin = Math.floor(minElo - eloRange * 0.15);
    const yMax = Math.ceil(maxElo + eloRange * 0.15);

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    function getX(idx) {
      if (points.length <= 1) return padLeft + plotW / 2;
      return padLeft + (idx / (points.length - 1)) * plotW;
    }

    function getY(elo) {
      if (yMax === yMin) return padTop + plotH / 2;
      return padTop + plotH - ((elo - yMin) / (yMax - yMin)) * plotH;
    }

    const pathCoords = points.map(p => `${getX(p.index).toFixed(1)},${getY(p.elo).toFixed(1)}`).join(' ');
    const areaCoords = `${pathCoords} ${getX(points.length - 1).toFixed(1)},${(padTop + plotH).toFixed(1)} ${getX(0).toFixed(1)},${(padTop + plotH).toFixed(1)}`;

    const isPositive = points[points.length - 1].elo >= startElo;
    const strokeColor = isPositive ? '#059669' : '#dc2626';
    const fillColor = isPositive ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)';

    const gridYLines = [yMin, Math.round((yMin + yMax) / 2), yMax];

    return `
      <div class="season-chart-wrap">
        <svg class="season-elo-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${label} Elo History Chart">
          ${gridYLines.map(yVal => {
            const yPos = getY(yVal);
            return `
              <line x1="${padLeft}" y1="${yPos}" x2="${width - padRight}" y2="${yPos}" stroke="var(--border-subtle, #e2e8f0)" stroke-dasharray="3,3" stroke-width="1" />
              <text x="${padLeft - 6}" y="${yPos + 4}" font-size="9.5" fill="var(--text-muted, #94a3b8)" text-anchor="end" font-family="'Outfit',sans-serif" font-weight="600">${yVal}</text>
            `;
          }).join('')}

          <line x1="${padLeft}" y1="${getY(startElo)}" x2="${width - padRight}" y2="${getY(startElo)}" stroke="rgba(37, 99, 235, 0.4)" stroke-width="1.5" stroke-dasharray="4,4" />

          <polygon points="${areaCoords}" fill="${fillColor}" />
          <polyline points="${pathCoords}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          ${points.map(p => `
            <circle cx="${getX(p.index).toFixed(1)}" cy="${getY(p.elo).toFixed(1)}" r="3.5" fill="${strokeColor}" stroke="var(--bg-card, #fff)" stroke-width="1.5" />
          `).join('')}

          <text x="${padLeft}" y="${height - 8}" font-size="9.5" fill="var(--text-muted, #94a3b8)" text-anchor="start" font-family="'Outfit',sans-serif">Start</text>
          <text x="${width - padRight}" y="${height - 8}" font-size="9.5" fill="var(--text-muted, #94a3b8)" text-anchor="end" font-family="'Outfit',sans-serif">Match ${history.length}</text>
        </svg>
      </div>
    `;
  }

  function openPlayerProfile(playerId) {
    if (!playerId) return;
    SeasonState.selectedPlayerId = playerId;
    SeasonState.playerProfileMode = 'COMBINED';
    renderPlayers();
  }

  function closePlayerProfile() {
    SeasonState.selectedPlayerId = null;
    renderPlayers();
  }

  function setPlayerProfileMode(mode) {
    const valid = (mode === 'SINGLES' || mode === 'DOUBLES') ? mode : 'COMBINED';
    SeasonState.playerProfileMode = valid;
    renderPlayers();
  }

  function renderPlayerProfile() {
    const container = document.getElementById('seasonPlayersContainer');
    if (!container) return;

    const playerId = SeasonState.selectedPlayerId;
    const player = SeasonState.players[playerId] || { id: playerId, name: 'Unknown Player', active: true };
    const isActive = player.active !== false;
    const initial = (player.name || '?').charAt(0).toUpperCase();

    const profMode = SeasonState.playerProfileMode || 'COMBINED';
    const pStats = (SeasonState.playerStats && SeasonState.playerStats[playerId]) || createEmptyPlayerStats(player);
    const modeBucket = pStats[profMode.toLowerCase()] || createEmptyStatBucket();
    const qualStatus = getQualificationStatus(playerId, profMode);

    const doublesElo = getPlayerElo(playerId, 'DOUBLES');
    const singlesElo = getPlayerElo(playerId, 'SINGLES');

    const doublesSummary = getEloSummary(playerId, 'DOUBLES');
    const singlesSummary = getEloSummary(playerId, 'SINGLES');

    const partners = getPartnerStats(playerId);
    const rivals = getHeadToHeadStats(playerId, profMode);
    const recentMatches = getPlayerRecentMatches(playerId, 10);

    let bestPartnerHtml = '';
    const qualifiedPartners = partners.filter(p => p.gp >= 3);
    if (qualifiedPartners.length > 0) {
      const topPartner = [...qualifiedPartners].sort((a, b) => (b.winPct - a.winPct) || (b.gp - a.gp) || (b.pointDiff - a.pointDiff))[0];
      bestPartnerHtml = `
        <div class="season-partner-highlight-badge">
          <span>🤝 <strong>Top Synergy:</strong> ${topPartner.partnerName} (${topPartner.wins}–${topPartner.losses}, ${formatWinPct(topPartner.winPct)})</span>
        </div>
      `;
    }

    let mostPlayedOpponentHtml = '';
    if (rivals.length > 0) {
      const topRival = rivals[0];
      mostPlayedOpponentHtml = `
        <div class="season-partner-highlight-badge" style="border-color:rgba(124, 58, 237, 0.3); background:rgba(124, 58, 237, 0.08);">
          <span>⚔️ <strong>Most Played Opponent:</strong> ${topRival.opponentName} (${topRival.gp} matches)</span>
        </div>
      `;
    }

    const doublesHistory = (SeasonState.elo && SeasonState.elo.histories && SeasonState.elo.histories[playerId] && SeasonState.elo.histories[playerId].doubles)
      ? SeasonState.elo.histories[playerId].doubles
      : [];

    const singlesHistory = (SeasonState.elo && SeasonState.elo.histories && SeasonState.elo.histories[playerId] && SeasonState.elo.histories[playerId].singles)
      ? SeasonState.elo.histories[playerId].singles
      : [];

    container.innerHTML = `
      <div class="season-profile-wrap">
        
        <!-- Navigation Header -->
        <div class="season-profile-nav">
          <button type="button" class="season-back-btn" onclick="SeasonApp.closePlayerProfile()">
            <span>&larr;</span> <span>Back to Players Roster</span>
          </button>
        </div>

        <!-- Profile Hero Card -->
        <div class="season-profile-hero">
          <div class="season-profile-header-row">
            <div class="season-profile-identity">
              <div class="season-profile-avatar">${initial}</div>
              <div>
                <h2 class="season-profile-name">${player.name}</h2>
                <div class="season-profile-badges">
                  <span class="season-status-pill ${isActive ? 'qualified' : 'provisional'}">
                    ${isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span class="season-status-pill ${qualStatus.qualified ? 'qualified' : 'provisional'}">
                    ${qualStatus.status} ${qualStatus.qualified ? '' : `(${qualStatus.gamesRemaining} GP to Qualify)`}
                  </span>
                </div>
              </div>
            </div>

            <!-- Elo Overview Badges -->
            <div class="season-profile-elo-stack">
              <div class="season-profile-elo-box">
                <span class="season-profile-elo-lbl">👥 DOUBLES ELO</span>
                <span class="season-elo-pill doubles" style="font-size:1.1rem; padding:4px 10px;">${formatElo(doublesElo)}</span>
              </div>
              <div class="season-profile-elo-box">
                <span class="season-profile-elo-lbl">👤 SINGLES ELO</span>
                <span class="season-elo-pill singles" style="font-size:1.1rem; padding:4px 10px;">${formatElo(singlesElo)}</span>
              </div>
            </div>
          </div>

          <!-- Mode Segmented Switcher -->
          <div class="season-profile-mode-bar">
            <div class="season-filter-segmented" role="tablist">
              <button type="button" class="season-filter-btn ${profMode === 'COMBINED' ? 'active' : ''}" onclick="SeasonApp.setPlayerProfileMode('COMBINED')">
                🌐 Combined
              </button>
              <button type="button" class="season-filter-btn ${profMode === 'DOUBLES' ? 'active' : ''}" onclick="SeasonApp.setPlayerProfileMode('DOUBLES')">
                👥 Doubles
              </button>
              <button type="button" class="season-filter-btn ${profMode === 'SINGLES' ? 'active' : ''}" onclick="SeasonApp.setPlayerProfileMode('SINGLES')">
                👤 Singles
              </button>
            </div>
          </div>

          <!-- Quick Stats Grid for Selected Mode -->
          <div class="season-profile-stats-grid">
            <div class="season-stat-box">
              <div class="season-stat-val">${modeBucket.gp}</div>
              <div class="season-stat-lbl">GAMES PLAYED</div>
            </div>
            <div class="season-stat-box">
              <div class="season-stat-val" style="color:var(--win-color, #059669);">${modeBucket.wins} – ${modeBucket.losses}</div>
              <div class="season-stat-lbl">WINS – LOSSES</div>
            </div>
            <div class="season-stat-box">
              <div class="season-stat-val">${formatWinPct(modeBucket.winPct)}</div>
              <div class="season-stat-lbl">WIN PERCENTAGE</div>
            </div>
            <div class="season-stat-box">
              <div class="season-stat-val" style="color:${modeBucket.pointDiff > 0 ? 'var(--win-color, #059669)' : (modeBucket.pointDiff < 0 ? '#dc2626' : 'inherit')};">${formatPointDiff(modeBucket.pointDiff)}</div>
              <div class="season-stat-lbl">POINT DIFF (${formatAvgPointDiff(modeBucket.avgPointDiff)}/G)</div>
            </div>
          </div>

          <!-- Form & Streaks Bar -->
          <div class="season-profile-form-bar">
            <div class="season-profile-form-col">
              <span class="season-profile-section-lbl">RECENT FORM (LAST 5)</span>
              <div>${formatForm(modeBucket.last5)}</div>
            </div>
            <div class="season-profile-form-col">
              <span class="season-profile-section-lbl">CURRENT WIN STREAK</span>
              <span style="font-weight:800; font-family:'Outfit',sans-serif; color:var(--win-color, #059669);">${modeBucket.currentWinStreak}W</span>
            </div>
            <div class="season-profile-form-col">
              <span class="season-profile-section-lbl">BEST WIN STREAK</span>
              <span style="font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">${modeBucket.bestWinStreak}W</span>
            </div>
          </div>
        </div>

        <!-- Elo Progression Chart Section -->
        <div class="season-card" style="margin-bottom:20px;">
          <div class="season-card-header">
            <h3>📈 Elo Evolution &amp; Progression</h3>
          </div>
          <div class="season-card-body">
            ${profMode === 'SINGLES' ? `
              <div class="season-elo-summary-row">
                <div class="season-stat-mini"><span>Start:</span> <strong>${formatElo(singlesSummary.start)}</strong></div>
                <div class="season-stat-mini"><span>Current:</span> <strong>${formatElo(singlesSummary.current)}</strong></div>
                <div class="season-stat-mini"><span>Peak:</span> <strong>${formatElo(singlesSummary.peak)}</strong></div>
                <div class="season-stat-mini"><span>Low:</span> <strong>${formatElo(singlesSummary.low)}</strong></div>
                <div class="season-stat-mini"><span>Net Change:</span> <strong style="color:${singlesSummary.change >= 0 ? 'var(--win-color, #059669)' : '#dc2626'};">${formatEloDelta(singlesSummary.change)}</strong></div>
                <div class="season-stat-mini"><span>Rated Games:</span> <strong>${singlesSummary.games}</strong></div>
              </div>
              ${renderEloSvgChart(singlesHistory, singlesSummary.start, 'SINGLES')}
            ` : `
              <div class="season-elo-summary-row">
                <div class="season-stat-mini"><span>Start:</span> <strong>${formatElo(doublesSummary.start)}</strong></div>
                <div class="season-stat-mini"><span>Current:</span> <strong>${formatElo(doublesSummary.current)}</strong></div>
                <div class="season-stat-mini"><span>Peak:</span> <strong>${formatElo(doublesSummary.peak)}</strong></div>
                <div class="season-stat-mini"><span>Low:</span> <strong>${formatElo(doublesSummary.low)}</strong></div>
                <div class="season-stat-mini"><span>Net Change:</span> <strong style="color:${doublesSummary.change >= 0 ? 'var(--win-color, #059669)' : '#dc2626'};">${formatEloDelta(doublesSummary.change)}</strong></div>
                <div class="season-stat-mini"><span>Rated Games:</span> <strong>${doublesSummary.games}</strong></div>
              </div>
              ${renderEloSvgChart(doublesHistory, doublesSummary.start, 'DOUBLES')}
            `}
          </div>
        </div>

        <div class="season-grid-2col">
          
          <!-- Partner Synergy Section (Doubles only) -->
          ${profMode !== 'SINGLES' ? `
            <div class="season-card">
              <div class="season-card-header">
                <h3>🤝 Doubles Partner Synergy</h3>
                ${bestPartnerHtml}
              </div>
              <div class="season-card-body" style="padding:0;">
                <div class="season-lb-table-responsive">
                  <table class="season-lb-table">
                    <thead>
                      <tr>
                        <th>PARTNER</th>
                        <th style="text-align:center;">GP</th>
                        <th style="text-align:center;">W - L</th>
                        <th style="text-align:right;">WIN %</th>
                        <th style="text-align:right;">+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${partners.length > 0 ? partners.map(p => `
                        <tr>
                          <td>
                            <div style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                              <span>${p.partnerName}</span>
                              ${!p.active ? '<span class="season-tag-pill" style="font-size:0.6rem; padding:1px 4px;">Inactive</span>' : ''}
                            </div>
                          </td>
                          <td style="text-align:center; font-weight:700;">${p.gp}</td>
                          <td style="text-align:center; color:var(--text-secondary);">${p.wins}–${p.losses}</td>
                          <td style="text-align:right; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">${formatWinPct(p.winPct)}</td>
                          <td style="text-align:right; font-weight:700; color:${p.pointDiff > 0 ? 'var(--win-color, #059669)' : (p.pointDiff < 0 ? '#dc2626' : 'inherit')};">${formatPointDiff(p.pointDiff)}</td>
                        </tr>
                      `).join('') : `
                        <tr>
                          <td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">
                            No Doubles partnerships recorded yet.
                          </td>
                        </tr>
                      `}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Head to Head Section -->
          <div class="season-card" ${profMode === 'SINGLES' ? 'style="grid-column: 1 / -1;"' : ''}>
            <div class="season-card-header">
              <h3>⚔️ Head-to-Head Rivalries</h3>
              ${mostPlayedOpponentHtml}
            </div>
            <div class="season-card-body" style="padding:0;">
              <div class="season-lb-table-responsive">
                <table class="season-lb-table">
                  <thead>
                    <tr>
                      <th>OPPONENT</th>
                      <th style="text-align:center;">GP</th>
                      <th style="text-align:center;">W - L</th>
                      <th style="text-align:right;">WIN %</th>
                      <th style="text-align:right;">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rivals.length > 0 ? rivals.map(r => `
                      <tr>
                        <td>
                          <div style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                            <span>${r.opponentName}</span>
                            ${!r.active ? '<span class="season-tag-pill" style="font-size:0.6rem; padding:1px 4px;">Inactive</span>' : ''}
                          </div>
                        </td>
                        <td style="text-align:center; font-weight:700;">${r.gp}</td>
                        <td style="text-align:center; color:var(--text-secondary);">${r.wins}–${r.losses}</td>
                        <td style="text-align:right; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">${formatWinPct(r.winPct)}</td>
                        <td style="text-align:right; font-weight:700; color:${r.pointDiff > 0 ? 'var(--win-color, #059669)' : (r.pointDiff < 0 ? '#dc2626' : 'inherit')};">${formatPointDiff(r.pointDiff)}</td>
                      </tr>
                    `).join('') : `
                      <tr>
                        <td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">
                          No opponent encounters recorded yet.
                        </td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        <!-- Recent Matches Section -->
        <div class="season-card" style="margin-top:20px;">
          <div class="season-card-header">
            <h3>⚡ Recent Matches (${recentMatches.length})</h3>
          </div>
          <div class="season-card-body">
            ${recentMatches.length > 0 ? `
              <div class="season-recent-list">
                ${recentMatches.map(m => {
                  const pSpec = getMatchPerspective(m, playerId);
                  if (!pSpec) return '';
                  const isWin = pSpec.result === 'W';
                  const isDoubles = m.matchType === 'DOUBLES';

                  let teammateStr = '';
                  if (isDoubles && pSpec.partnerIds.length > 0) {
                    teammateStr = ` with <strong>${getPlayerDisplayName(pSpec.partnerIds[0])}</strong>`;
                  }

                  const opponentNames = pSpec.opponentIds.map(getPlayerDisplayName).join(' + ');

                  return `
                    <div class="season-profile-match-row ${isWin ? 'win' : 'loss'}">
                      <div class="season-profile-match-main">
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                          <span class="season-match-type-pill ${isDoubles ? 'doubles' : 'singles'}" style="font-size:0.68rem; padding:1px 6px;">
                            ${isDoubles ? '👥 DOUBLES' : '👤 SINGLES'}
                          </span>
                          <span style="font-size:0.75rem; color:var(--text-muted);">
                            📅 ${formatMatchDate(m.matchDate, m.createdAt)}
                          </span>
                        </div>
                        <div style="font-size:0.88rem; color:var(--text-primary);">
                          <span>${player.name}${teammateStr}</span>
                          <span style="color:var(--text-muted); font-weight:700; margin:0 4px;">vs</span>
                          <span><strong>${opponentNames}</strong></span>
                        </div>
                      </div>

                      <div class="season-profile-match-score">
                        <div class="season-score-display ${isWin ? 'score-win' : 'score-loss'}">
                          ${pSpec.pf} – ${pSpec.pa}
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; justify-content:flex-end;">
                          <span class="season-form-badge ${isWin ? 'win' : 'loss'}">${isWin ? 'W' : 'L'}</span>
                          ${pSpec.eloDelta !== 0 ? `<span class="season-delta-tag ${pSpec.eloDelta >= 0 ? 'pos' : 'neg'}">${formatEloDelta(pSpec.eloDelta)} Elo</span>` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="season-empty-state">
                <span style="font-size:2rem;">🏸</span>
                <p style="font-weight:700; margin:6px 0 2px;">No matches recorded yet</p>
                <p style="font-size:0.8rem; color:var(--text-muted);">Matches involving ${player.name} will appear here chronologically.</p>
              </div>
            `}
          </div>
        </div>

      </div>
    `;
  }

  // 20. Season Administration, Match Corrections, Audit History & Freeze Controls (Phase 8)
  function openEditMatch(matchId) {
    if (!isUserAuthorized()) {
      if (typeof handleOrganizerAuthClick === 'function') handleOrganizerAuthClick();
      else alert('Please sign in as an authorized organizer to correct matches.');
      return;
    }
    if (!isSeasonWritable()) {
      alert('Season is frozen. Match corrections are disabled.');
      return;
    }
    const match = SeasonState.matches[matchId];
    if (!match) {
      alert('Match not found.');
      return;
    }

    SeasonState.editMatchState = {
      matchId: match.id,
      matchType: match.matchType || 'DOUBLES',
      player1: match.teamA ? match.teamA.player1 : (match.playerA || ''),
      player2: match.teamA ? match.teamA.player2 : '',
      player3: match.teamB ? match.teamB.player1 : (match.playerB || ''),
      player4: match.teamB ? match.teamB.player2 : '',
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      matchDate: match.matchDate || '',
      court: match.court || '',
      session: match.session || '',
      notes: match.notes || '',
      loadedRevision: match.revision || 1,
      originalMatch: JSON.parse(JSON.stringify(match))
    };

    const modal = document.getElementById('seasonEditMatchModal');
    if (modal) {
      renderEditMatchModalContent();
      modal.classList.add('open');
    }
  }

  function closeEditMatchModal() {
    const modal = document.getElementById('seasonEditMatchModal');
    if (modal) modal.classList.remove('open');
    SeasonState.editMatchState = null;
  }

  function renderEditMatchModalContent() {
    const body = document.getElementById('seasonEditMatchBody');
    if (!body || !SeasonState.editMatchState) return;

    const state = SeasonState.editMatchState;
    const isDoubles = state.matchType === 'DOUBLES';
    const allPlayers = Object.values(SeasonState.players).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    function renderSelectOptions(selectedId) {
      let options = `<option value="">-- Select Player --</option>`;
      allPlayers.forEach(p => {
        const isSel = p.id === selectedId;
        const activeLabel = p.active === false ? ' (Inactive)' : '';
        options += `<option value="${p.id}" ${isSel ? 'selected' : ''}>${p.name}${activeLabel}</option>`;
      });
      return options;
    }

    body.innerHTML = `
      <form id="seasonEditMatchForm" onsubmit="SeasonApp.saveMatchCorrection(event)">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <span class="season-match-type-pill ${isDoubles ? 'doubles' : 'singles'}">
            ${isDoubles ? '👥 DOUBLES (2v2)' : '👤 SINGLES (1v1)'}
          </span>
          <span class="season-tag-pill" style="background:rgba(245, 158, 11, 0.12); color:#b45309; font-weight:800;">
            Editing Revision ${state.loadedRevision} &rarr; Rev ${state.loadedRevision + 1}
          </span>
        </div>

        <div class="season-match-grid" style="margin-bottom:16px;">
          <!-- TEAM A -->
          <div class="season-team-box">
            <div class="season-team-header">${isDoubles ? 'TEAM A' : 'PLAYER A'}</div>
            <div>
              <select id="seasonEditP1" class="season-select-styled" required onchange="SeasonState.editMatchState.player1 = this.value">
                ${renderSelectOptions(state.player1)}
              </select>
            </div>
            ${isDoubles ? `
              <div>
                <select id="seasonEditP2" class="season-select-styled" required onchange="SeasonState.editMatchState.player2 = this.value">
                  ${renderSelectOptions(state.player2)}
                </select>
              </div>
            ` : ''}
            <div class="season-score-input-wrap">
              <input type="number" id="seasonEditScoreA" class="season-score-input" placeholder="21" min="0" max="99" required value="${state.scoreA}" oninput="SeasonState.editMatchState.scoreA = this.value">
            </div>
          </div>

          <!-- VS DIVIDER -->
          <div class="season-vs-column">
            <span>VS</span>
          </div>

          <!-- TEAM B -->
          <div class="season-team-box">
            <div class="season-team-header">${isDoubles ? 'TEAM B' : 'PLAYER B'}</div>
            <div>
              <select id="seasonEditP3" class="season-select-styled" required onchange="SeasonState.editMatchState.player3 = this.value">
                ${renderSelectOptions(state.player3)}
              </select>
            </div>
            ${isDoubles ? `
              <div>
                <select id="seasonEditP4" class="season-select-styled" required onchange="SeasonState.editMatchState.player4 = this.value">
                  ${renderSelectOptions(state.player4)}
                </select>
              </div>
            ` : ''}
            <div class="season-score-input-wrap">
              <input type="number" id="seasonEditScoreB" class="season-score-input" placeholder="17" min="0" max="99" required value="${state.scoreB}" oninput="SeasonState.editMatchState.scoreB = this.value">
            </div>
          </div>
        </div>

        <div class="season-optional-fields" style="display:grid; margin-bottom:14px;">
          <div class="season-field-group">
            <label for="seasonEditMatchDate">MATCH DATE</label>
            <input type="date" id="seasonEditMatchDate" class="season-search-input" value="${state.matchDate || ''}" onchange="SeasonState.editMatchState.matchDate = this.value">
          </div>
          <div class="season-field-group">
            <label for="seasonEditCourt">COURT</label>
            <input type="text" id="seasonEditCourt" class="season-search-input" placeholder="e.g. Court 1" value="${state.court || ''}" oninput="SeasonState.editMatchState.court = this.value">
          </div>
          <div class="season-field-group">
            <label for="seasonEditSession">SESSION</label>
            <input type="text" id="seasonEditSession" class="season-search-input" placeholder="e.g. Sunday Afternoon" value="${state.session || ''}" oninput="SeasonState.editMatchState.session = this.value">
          </div>
          <div class="season-field-group" style="grid-column: 1 / -1;">
            <label for="seasonEditNotes">CORRECTION NOTES</label>
            <input type="text" id="seasonEditNotes" class="season-search-input" placeholder="e.g. Corrected score entry typo" value="${state.notes || ''}" oninput="SeasonState.editMatchState.notes = this.value">
          </div>
        </div>

        <div id="seasonEditMatchWarn" class="season-modal-warn" style="margin-bottom:12px;"></div>

        <div class="modal-btn-row">
          <button type="button" class="btn-secondary" onclick="SeasonApp.closeEditMatchModal()">Cancel</button>
          <button type="submit" id="seasonSaveCorrectionBtn" class="btn-primary" style="flex:2;">💾 Save Correction &amp; Replay</button>
        </div>
      </form>
    `;
  }

  function validateMatchCorrection(stateOrOriginal = SeasonState.editMatchState, maybePayload = null) {
    let state = stateOrOriginal || SeasonState.editMatchState;
    if (maybePayload && typeof maybePayload === 'object') {
      state = { ...stateOrOriginal, ...maybePayload };
    }
    if (!state || (!state.matchId && !state.id)) {
      return { valid: false, error: 'No match selected for correction.' };
    }
    const sA = parseInt(state.scoreA, 10);
    const sB = parseInt(state.scoreB, 10);

    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0) {
      return { valid: false, error: 'Please enter valid positive scores.' };
    }
    if (sA === sB) {
      return { valid: false, error: 'Matches cannot end in a tie (badminton is decisive).' };
    }

    const mType = state.matchType || state.type || ((state.teamAPlayer2Id || (state.teamA && state.teamA.player2) || state.player2) ? 'DOUBLES' : 'SINGLES');
    const isDoubles = mType === 'DOUBLES';

    const p1 = state.player1 || state.teamAPlayer1Id || (state.teamA && state.teamA.player1) || state.playerA || '';
    const p2 = state.player2 || state.teamAPlayer2Id || (state.teamA && state.teamA.player2) || '';
    const p3 = state.player3 || state.teamBPlayer1Id || (state.teamB && state.teamB.player1) || state.playerB || '';
    const p4 = state.player4 || state.teamBPlayer2Id || (state.teamB && state.teamB.player2) || '';

    if (isDoubles) {
      const players = [p1, p2, p3, p4];
      if (players.some(p => !p)) {
        return { valid: false, error: 'All 4 Doubles players must be selected.' };
      }
      if (new Set(players).size !== 4) {
        return { valid: false, error: 'All 4 players in a Doubles match must be distinct.' };
      }
    } else {
      if (!p1 || !p3 || p1 === p3) {
        return { valid: false, error: 'Both Singles players must be selected and distinct.' };
      }
    }

    const winner = sA > sB ? 'A' : 'B';
    const correctedMatch = {
      ...state,
      scoreA: sA,
      scoreB: sB,
      winner: winner,
      winnerTeam: winner
    };

    return { valid: true, correctedMatch };
  }

  async function saveMatchCorrection(event) {
    if (event && event.preventDefault) event.preventDefault();

    if (!isUserAuthorized()) {
      throw new Error('Sign in as an authorized organizer to correct match scores.');
    }
    if (!isSeasonWritable()) {
      throw new Error('Season is frozen. Match corrections are locked.');
    }

    const state = SeasonState.editMatchState;
    const validation = validateMatchCorrection(state);
    const warn = document.getElementById('seasonEditMatchWarn');
    const submitBtn = document.getElementById('seasonSaveCorrectionBtn');

    if (!validation.valid) {
      if (warn) warn.textContent = `⚠️ ${validation.error}`;
      return;
    }

    const sA = parseInt(state.scoreA, 10);
    const sB = parseInt(state.scoreB, 10);
    const isDoubles = state.matchType === 'DOUBLES';

    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }

    const matchId = state.matchId;
    let remoteMatch = null;

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      const snap = await db.ref(`${getSeasonMatchesPath()}/${matchId}`).once('value');
      remoteMatch = snap.val();
    } else {
      remoteMatch = SeasonState.matches[matchId];
    }

    if (!remoteMatch) {
      throw new Error('Match record not found in database.');
    }

    // Revision conflict detection
    const currentRev = remoteMatch.revision || 1;
    if (currentRev !== state.loadedRevision) {
      if (warn) {
        warn.textContent = `⚠️ Revision conflict: This match was updated to Revision ${currentRev} by another organizer. Please close and reload.`;
      }
      return;
    }

    const newRevision = currentRev + 1;
    const winner = sA > sB ? 'A' : 'B';
    const actorUid = authUser ? authUser.uid : 'organizer';
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const updatedMatch = {
      id: matchId,
      matchType: state.matchType,
      matchDate: state.matchDate || remoteMatch.matchDate || getTodayDateString(),
      enteredByUid: remoteMatch.enteredByUid || actorUid,
      enteredByName: remoteMatch.enteredByName || 'Organizer',
      createdAt: remoteMatch.createdAt || Date.now(),
      scoreA: sA,
      scoreB: sB,
      winner: winner,
      court: state.court || '',
      session: state.session || '',
      notes: state.notes || '',
      revision: newRevision,
      updatedAt: serverTimestamp,
      updatedByUid: actorUid
    };

    if (isDoubles) {
      updatedMatch.teamA = { player1: state.player1, player2: state.player2 };
      updatedMatch.teamB = { player1: state.player3, player2: state.player4 };
    } else {
      updatedMatch.playerA = state.player1;
      updatedMatch.playerB = state.player3;
    }

    const auditId = generateAuditId();
    const auditPayload = {
      action: 'MATCH_UPDATED',
      targetId: matchId,
      revisionBefore: currentRev,
      revisionAfter: newRevision,
      before: remoteMatch,
      after: updatedMatch,
      timestamp: serverTimestamp,
      actorUid: actorUid
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Correction...';
    }

    try {
      if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        const updates = {};
        updates[`${getSeasonMatchesPath()}/${matchId}`] = updatedMatch;
        updates[`${getSeasonAuditPath()}/${auditId}`] = auditPayload;
        await db.ref().update(updates);
      }
      SeasonState.matches[matchId] = updatedMatch;
      SeasonState.audit[auditId] = auditPayload;
      recalculateEntireSeason();

      closeEditMatchModal();
      if (typeof showToast === 'function') {
        showToast(`✓ Match corrected (Revision ${newRevision})`, 'success');
      }
      return { success: true, match: updatedMatch };
    } catch (err) {
      if (warn) warn.textContent = `⚠️ ${err.message}`;
      console.error('[SeasonApp] Match correction error:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Save Correction & Replay';
      }
    }
  }

  // Freeze & Reopen Controls
  function openFreezeModal() {
    if (!isUserAuthorized()) {
      if (typeof handleOrganizerAuthClick === 'function') handleOrganizerAuthClick();
      else alert('Please sign in as an authorized organizer.');
      return;
    }
    const modal = document.getElementById('seasonFreezeModal');
    const warn = document.getElementById('seasonFreezeWarn');
    if (warn) warn.textContent = '';
    if (modal) modal.classList.add('open');
  }

  function closeFreezeModal() {
    const modal = document.getElementById('seasonFreezeModal');
    if (modal) modal.classList.remove('open');
  }

  async function executeFreezeSeason() {
    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }
    if (!authUser && !isUserAuthorized()) {
      throw new Error('Sign in as an authorized organizer to freeze the season.');
    }

    const auditId = generateAuditId();
    const prevStatus = SeasonState.config.status || 'ACTIVE';
    const actorUid = authUser ? authUser.uid : 'organizer';
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const auditPayload = {
      action: 'SEASON_FROZEN',
      targetId: SeasonState.config.seasonId || 'fall2026',
      previousStatus: prevStatus,
      newStatus: 'FROZEN',
      timestamp: serverTimestamp,
      actorUid: actorUid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      const updates = {};
      updates[`${getSeasonConfigPath()}/status`] = 'FROZEN';
      updates[`${getSeasonAuditPath()}/${auditId}`] = auditPayload;
      await db.ref().update(updates);
    }
    SeasonState.config.status = 'FROZEN';
    SeasonState.audit[auditId] = auditPayload;

    closeFreezeModal();
    if (typeof showToast === 'function') {
      showToast('🔒 Season frozen — match entries and edits locked.', 'warn');
    }
    renderSeasonAdmin();
  }

  function openReopenModal() {
    if (!isUserAuthorized()) {
      if (typeof handleOrganizerAuthClick === 'function') handleOrganizerAuthClick();
      else alert('Please sign in as an authorized organizer.');
      return;
    }
    const modal = document.getElementById('seasonReopenModal');
    const warn = document.getElementById('seasonReopenWarn');
    if (warn) warn.textContent = '';
    if (modal) modal.classList.add('open');
  }

  function closeReopenModal() {
    const modal = document.getElementById('seasonReopenModal');
    if (modal) modal.classList.remove('open');
  }

  async function executeReopenSeason() {
    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }
    if (!authUser && !isUserAuthorized()) {
      throw new Error('Sign in as an authorized organizer to reopen the season.');
    }

    const auditId = generateAuditId();
    const prevStatus = SeasonState.config.status || 'FROZEN';
    const actorUid = authUser ? authUser.uid : 'organizer';
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const auditPayload = {
      action: 'SEASON_REOPENED',
      targetId: SeasonState.config.seasonId || 'fall2026',
      previousStatus: prevStatus,
      newStatus: 'ACTIVE',
      timestamp: serverTimestamp,
      actorUid: actorUid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      const updates = {};
      updates[`${getSeasonConfigPath()}/status`] = 'ACTIVE';
      updates[`${getSeasonAuditPath()}/${auditId}`] = auditPayload;
      await db.ref().update(updates);
    }
    SeasonState.config.status = 'ACTIVE';
    SeasonState.audit[auditId] = auditPayload;

    closeReopenModal();
    if (typeof showToast === 'function') {
      showToast('🔓 Season reopened — write access restored.', 'success');
    }
    renderSeasonAdmin();
  }

  // Full Derived Rebuild
  function recalculateEntireSeason() {
    recalculatePlayerStats();
    recalculateElo();
    recalculateAnalytics();

    if (SeasonState.activeTab === 'admin') renderSeasonAdmin();
    if (SeasonState.activeTab === 'home') renderSeasonHome();
    if (SeasonState.activeTab === 'players') renderPlayers();
    if (SeasonState.activeTab === 'leaderboard') renderLeaderboard();
    if (SeasonState.activeTab === 'history') renderMatchHistory();

    const allMatches = Object.values(SeasonState.matches || {});
    const dMatches = allMatches.filter(m => m.matchType === 'DOUBLES').length;
    const sMatches = allMatches.filter(m => m.matchType === 'SINGLES').length;
    const pCount = Object.keys(SeasonState.players || {}).length;
    const mCount = allMatches.length;
    const aCount = Object.keys(SeasonState.audit || {}).length;
    const curStatus = (SeasonState.config && SeasonState.config.status) || 'ACTIVE';

    return {
      playersProcessed: pCount,
      matchesProcessed: mCount,
      doublesMatches: dMatches,
      singlesMatches: sMatches,
      playersCount: pCount,
      matchesCount: mCount,
      doublesCount: dMatches,
      singlesCount: sMatches,
      auditEventsCount: aCount,
      status: curStatus
    };
  }

  function handleAdminRecalculateClick() {
    const result = recalculateEntireSeason();
    const info = document.getElementById('seasonAdminRebuildInfo');
    if (info) {
      info.innerHTML = `
        <div class="season-rebuild-banner" style="margin-top:14px;">
          <div style="display:flex; align-items:center; gap:8px; font-weight:800; color:var(--win-color, #059669); margin-bottom:4px;">
            <span>✓</span> <span>Season Rebuilt Deterministically</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.5;">
            Processed <strong>${result.playersCount}</strong> players, <strong>${result.matchesCount}</strong> matches (<strong>${result.doublesCount}</strong> Doubles, <strong>${result.singlesCount}</strong> Singles), and <strong>${result.auditEventsCount}</strong> audit events with zero database writes.
          </div>
        </div>
      `;
    }
  }

  function setAuditFilter(filter) {
    SeasonState.auditFilter = filter || 'ALL';
    renderSeasonAdmin();
  }

  function renderAuditItemHtml(a) {
    let actionPillClass = 'match-created';
    let actionLabel = a.action || 'AUDIT EVENT';
    let detailHtml = '';

    if (a.action === 'MATCH_CREATED') {
      actionPillClass = 'match-created';
      actionLabel = 'MATCH RECORDED';
      detailHtml = `<span style="font-weight:700; color:var(--text-primary);">Match ID: ${a.targetId}</span>`;
    } else if (a.action === 'MATCH_UPDATED') {
      actionPillClass = 'match-updated';
      actionLabel = 'MATCH CORRECTED';
      const beforeStr = a.before ? (a.before.matchType === 'DOUBLES'
        ? `${getPlayerDisplayName(a.before.teamA ? a.before.teamA.player1 : '')} + ${getPlayerDisplayName(a.before.teamA ? a.before.teamA.player2 : '')} (${a.before.scoreA}–${a.before.scoreB}) ${getPlayerDisplayName(a.before.teamB ? a.before.teamB.player1 : '')} + ${getPlayerDisplayName(a.before.teamB ? a.before.teamB.player2 : '')}`
        : `${getPlayerDisplayName(a.before.playerA)} (${a.before.scoreA}–${a.before.scoreB}) ${getPlayerDisplayName(a.before.playerB)}`) : '';
      const afterStr = a.after ? (a.after.matchType === 'DOUBLES'
        ? `${getPlayerDisplayName(a.after.teamA ? a.after.teamA.player1 : '')} + ${getPlayerDisplayName(a.after.teamA ? a.after.teamA.player2 : '')} (${a.after.scoreA}–${a.after.scoreB}) ${getPlayerDisplayName(a.after.teamB ? a.after.teamB.player1 : '')} + ${getPlayerDisplayName(a.after.teamB ? a.after.teamB.player2 : '')}`
        : `${getPlayerDisplayName(a.after.playerA)} (${a.after.scoreA}–${a.after.scoreB}) ${getPlayerDisplayName(a.after.playerB)}`) : '';

      detailHtml = `
        <div class="season-audit-diff-box">
          <div><span style="color:var(--text-muted); font-weight:700;">Revision:</span> Rev ${a.revisionBefore || 1} &rarr; <strong>Rev ${a.revisionAfter || 2}</strong></div>
          ${beforeStr ? `<div><span style="color:#dc2626; font-weight:700;">Before:</span> <strike>${beforeStr}</strike></div>` : ''}
          ${afterStr ? `<div><span style="color:var(--win-color, #059669); font-weight:700;">After:</span> <strong>${afterStr}</strong></div>` : ''}
        </div>
      `;
    } else if (a.action === 'PLAYER_CREATED') {
      actionPillClass = 'player-created';
      actionLabel = 'PLAYER REGISTERED';
      detailHtml = `<span style="font-weight:700; color:var(--text-primary);">Added: ${a.playerName || a.targetId}</span>`;
    } else if (a.action === 'PLAYER_STATUS_CHANGED') {
      actionPillClass = 'player-status';
      actionLabel = 'PLAYER STATUS';
      const fromStr = a.before ? 'Active' : 'Inactive';
      const toStr = a.after ? 'Active' : 'Inactive';
      detailHtml = `
        <div class="season-audit-diff-box">
          <div><span style="color:var(--text-primary); font-weight:700;">${a.playerName || a.targetId}:</span> ${fromStr} &rarr; <strong>${toStr}</strong></div>
        </div>
      `;
    } else if (a.action === 'SEASON_FROZEN') {
      actionPillClass = 'season-frozen';
      actionLabel = 'SEASON FROZEN';
      detailHtml = `<span style="color:#dc2626; font-weight:700;">Season status changed: ACTIVE &rarr; FROZEN</span>`;
    } else if (a.action === 'SEASON_REOPENED') {
      actionPillClass = 'season-reopened';
      actionLabel = 'SEASON REOPENED';
      detailHtml = `<span style="color:var(--win-color, #059669); font-weight:700;">Season status changed: FROZEN &rarr; ACTIVE</span>`;
    }

    const timeStr = a.timestamp ? formatMatchDate('', a.timestamp) + ' • ' + formatMatchTime(a.timestamp) : 'Recently';

    return `
      <div class="season-audit-item">
        <div class="season-audit-item-top">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="season-audit-pill ${actionPillClass}">${actionLabel}</span>
            <span style="font-size:0.75rem; color:var(--text-muted);">${timeStr}</span>
          </div>
          <span class="season-audit-actor-tag">👤 ${a.actorUid || 'Organizer'}</span>
        </div>
        <div>
          ${detailHtml}
        </div>
      </div>
    `;
  }

  function renderSeasonAdmin() {
    const container = document.getElementById('seasonAdminContainer');
    if (!container) return;

    const isAuthorized = isUserAuthorized();
    if (!isAuthorized) {
      container.innerHTML = `
        <div class="season-placeholder-pane" style="max-width:540px; margin:40px auto;">
          <div class="season-placeholder-icon">🔒</div>
          <h3 class="season-placeholder-title">Organizer Access Required</h3>
          <p class="season-placeholder-desc">
            Sign in with authorized organizer credentials to access Season Administration, match score corrections, deterministic season recalculation, and database freeze controls.
          </p>
          <button type="button" class="btn-primary" onclick="if(typeof handleOrganizerAuthClick === 'function') handleOrganizerAuthClick();" style="padding:10px 20px; font-weight:800; margin-top:12px;">
            🔑 Sign In as Organizer
          </button>
        </div>
      `;
      return;
    }

    const allPlayers = Object.values(SeasonState.players);
    const activePlayers = allPlayers.filter(p => p.active !== false);
    const allMatches = getSortedMatches('DESC');
    const doublesMatches = allMatches.filter(m => m.matchType === 'DOUBLES');
    const singlesMatches = allMatches.filter(m => m.matchType === 'SINGLES');
    const allAudits = Object.values(SeasonState.audit || {});
    const isFrozen = SeasonState.config.status === 'FROZEN';

    const filter = SeasonState.auditFilter || 'ALL';
    const filteredAudits = allAudits.filter(a => {
      if (filter === 'MATCHES' && !['MATCH_CREATED', 'MATCH_UPDATED'].includes(a.action)) return false;
      if (filter === 'PLAYERS' && !['PLAYER_CREATED', 'PLAYER_STATUS_CHANGED'].includes(a.action)) return false;
      if (filter === 'SEASON' && !['SEASON_FROZEN', 'SEASON_REOPENED'].includes(a.action)) return false;
      return true;
    }).sort((a, b) => {
      const tA = typeof a.timestamp === 'number' ? a.timestamp : 0;
      const tB = typeof b.timestamp === 'number' ? b.timestamp : 0;
      return tB - tA;
    });

    container.innerHTML = `
      <div class="season-admin-wrap">
        
        <!-- Status & Operations Hero -->
        <div class="season-admin-hero">
          <div class="season-admin-header-row">
            <div class="season-admin-title-area">
              <h2>⚙️ Season Administration &amp; Controls</h2>
              <p class="season-admin-subtitle">
                ${SeasonState.config.name || 'Sindhi Boys Badminton Season — Fall 2026'} &bull; ${SeasonState.config.startDate || '2026-09-27'} to ${SeasonState.config.endDate || '2026-12-20'}
              </p>
            </div>
            <div>
              <span class="season-admin-status-badge ${isFrozen ? 'frozen' : 'active'}">
                ${isFrozen ? '🔒 SEASON FROZEN' : '● STATUS: ACTIVE'}
              </span>
            </div>
          </div>

          <!-- Summary Counts Grid -->
          <div class="season-admin-counts-grid">
            <div class="season-admin-count-box">
              <span class="season-admin-count-lbl">REGISTERED PLAYERS</span>
              <span class="season-admin-count-val">${allPlayers.length}</span>
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">${activePlayers.length} Active</span>
            </div>
            <div class="season-admin-count-box">
              <span class="season-admin-count-lbl">TOTAL MATCHES</span>
              <span class="season-admin-count-val">${allMatches.length}</span>
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">Raw Ledger</span>
            </div>
            <div class="season-admin-count-box">
              <span class="season-admin-count-lbl">DOUBLES MATCHES</span>
              <span class="season-admin-count-val" style="color:var(--primary);">${doublesMatches.length}</span>
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">2v2</span>
            </div>
            <div class="season-admin-count-box">
              <span class="season-admin-count-lbl">SINGLES MATCHES</span>
              <span class="season-admin-count-val" style="color:#7c3aed;">${singlesMatches.length}</span>
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">1v1</span>
            </div>
            <div class="season-admin-count-box">
              <span class="season-admin-count-lbl">AUDIT EVENTS</span>
              <span class="season-admin-count-val">${allAudits.length}</span>
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">Immutable</span>
            </div>
          </div>

          <!-- Actions Bar -->
          <div class="season-admin-actions-bar">
            ${isFrozen ? `
              <button type="button" class="season-btn-reopen" onclick="SeasonApp.openReopenModal()">
                <span>🔓</span> <span>Reopen Season</span>
              </button>
            ` : `
              <button type="button" class="season-btn-freeze" onclick="SeasonApp.openFreezeModal()">
                <span>🔒</span> <span>Freeze Season</span>
              </button>
            `}
            <button type="button" class="season-btn-recalc" onclick="SeasonApp.handleAdminRecalculateClick()">
              <span>♻</span> <span>Recalculate Entire Season</span>
            </button>
            <button type="button" class="season-btn-sm" onclick="SeasonApp.switchTab('history')" style="margin-left:auto; padding:8px 12px; font-weight:700;">
              <span>📊</span> <span>Go to Match History &rarr;</span>
            </button>
          </div>

          <div id="seasonAdminRebuildInfo"></div>
        </div>

        <!-- Audit History Feed Section -->
        <div class="season-audit-card">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                📜 Immutable Audit History (${filteredAudits.length})
              </h3>
              <p style="margin:2px 0 0; font-size:0.78rem; color:var(--text-muted);">
                Append-only log of all match creations, corrections, player status changes, and freeze events.
              </p>
            </div>
            <div class="season-filter-segmented" role="tablist">
              <button type="button" class="season-filter-btn ${filter === 'ALL' ? 'active' : ''}" onclick="SeasonApp.setAuditFilter('ALL')">All (${allAudits.length})</button>
              <button type="button" class="season-filter-btn ${filter === 'MATCHES' ? 'active' : ''}" onclick="SeasonApp.setAuditFilter('MATCHES')">Matches</button>
              <button type="button" class="season-filter-btn ${filter === 'PLAYERS' ? 'active' : ''}" onclick="SeasonApp.setAuditFilter('PLAYERS')">Players</button>
              <button type="button" class="season-filter-btn ${filter === 'SEASON' ? 'active' : ''}" onclick="SeasonApp.setAuditFilter('SEASON')">Season</button>
            </div>
          </div>

          <div class="season-audit-feed">
            ${filteredAudits.length > 0 ? filteredAudits.map(renderAuditItemHtml).join('') : `
              <div class="season-empty-state" style="padding:28px;">
                <span style="font-size:2rem;">📜</span>
                <p style="font-weight:700; margin:6px 0 2px;">No audit events recorded</p>
                <p style="font-size:0.8rem; color:var(--text-muted);">Audit history is recorded automatically when match creations, corrections, or freeze events occur.</p>
              </div>
            `}
          </div>
        </div>

      </div>
    `;
  }

  // 21. Weekly Analytics & Seasonal Insights Engine (Phase 9)
  function generateSeasonWeeks(config = SeasonState.config) {
    const startStr = (config && config.startDate) || '2026-09-27';
    const totalWeeks = (config && typeof config.totalWeeks === 'number') ? config.totalWeeks : 12;

    const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
    const startDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));

    const weeks = [];
    for (let w = 1; w <= totalWeeks; w++) {
      const wStart = new Date(startDate.getTime() + (w - 1) * 7 * 86400000);
      const wEnd = new Date(wStart.getTime() + 6 * 86400000);

      const fmtDate = (d) => {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const startFormatted = fmtDate(wStart);
      const endFormatted = fmtDate(wEnd);

      weeks.push({
        weekNumber: w,
        startDate: startFormatted,
        endDate: endFormatted,
        label: `Week ${w}`
      });
    }
    return weeks;
  }

  function getSeasonWeekForDate(dateStr, config = SeasonState.config) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const matchD = dateStr.trim();
    const weeks = generateSeasonWeeks(config);
    for (let i = 0; i < weeks.length; i++) {
      const w = weeks[i];
      if (matchD >= w.startDate && matchD <= w.endDate) {
        return w;
      }
    }
    return null; // Out of season
  }

  function getCurrentSeasonWeekNumber(config = SeasonState.config) {
    const todayStr = getTodayDateString();
    const currentWeek = getSeasonWeekForDate(todayStr, config);
    if (currentWeek) return currentWeek.weekNumber;
    const startStr = (config && config.startDate) || '2026-09-27';
    if (todayStr < startStr) return 1;
    return (config && config.totalWeeks) || 12;
  }

  function calculateWeeklyAnalytics(playersMap = {}, matchesMap = {}, config = SeasonState.config, eloState = SeasonState.elo) {
    const weeksList = generateSeasonWeeks(config);
    const minWeeklyGamesHighlight = 3;
    const weeks = {};

    // 1. Initialize week containers
    weeksList.forEach(w => {
      const pActivity = {};
      const pResults = {};
      const eloMov = {};
      const streaks = {};

      Object.values(playersMap || {}).forEach(p => {
        if (p && p.id) {
          pActivity[p.id] = {
            playerId: p.id,
            name: p.name || 'Unknown Player',
            active: p.active !== false,
            gp: 0,
            doublesGp: 0,
            singlesGp: 0
          };
          pResults[p.id] = {
            combined: createEmptyStatBucket(),
            doubles: createEmptyStatBucket(),
            singles: createEmptyStatBucket()
          };
          eloMov[p.id] = {
            playerId: p.id,
            name: p.name || 'Unknown Player',
            active: p.active !== false,
            doublesDelta: 0,
            singlesDelta: 0,
            doublesMatches: 0,
            singlesMatches: 0
          };
          streaks[p.id] = {
            current: 0,
            max: 0
          };
        }
      });

      weeks[w.weekNumber] = {
        weekNumber: w.weekNumber,
        startDate: w.startDate,
        endDate: w.endDate,
        label: w.label,
        totalMatches: 0,
        doublesMatches: 0,
        singlesMatches: 0,
        uniquePlayers: 0,
        participantIds: new Set(),
        playerActivity: pActivity,
        playerResults: pResults,
        eloMovement: eloMov,
        streaks: streaks,
        highlights: {
          mostActive: null,
          topWinPct: null,
          biggestDoublesRiser: null,
          biggestSinglesRiser: null,
          biggestDoublesFaller: null,
          biggestSinglesFaller: null,
          longestWinStreak: null
        }
      };
    });

    // 2. Sort matches chronologically (createdAt ASC, id ASC)
    const validMatches = Object.values(matchesMap || {}).filter(m => isRenderableMatch(m));
    validMatches.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });

    // 3. Replay matches into corresponding weekly buckets
    validMatches.forEach(m => {
      const matchWeek = getSeasonWeekForDate(m.matchDate, config);
      if (!matchWeek) return; // Skip out-of-season matches

      const bucket = weeks[matchWeek.weekNumber];
      if (!bucket) return;

      const sA = m.scoreA;
      const sB = m.scoreB;
      const isWinnerA = m.winner === 'A';
      const mDeltas = (eloState && eloState.matchDeltas && eloState.matchDeltas[m.id]) ? eloState.matchDeltas[m.id].deltas : null;

      bucket.totalMatches++;

      function recordPlayerMatch(pId, isWin, pf, pa, isDoubles) {
        if (!pId) return;
        if (!bucket.playerActivity[pId]) {
          const pRec = playersMap[pId] || { id: pId, name: 'Unknown Player', active: true };
          bucket.playerActivity[pId] = { playerId: pId, name: pRec.name || 'Unknown Player', active: pRec.active !== false, gp: 0, doublesGp: 0, singlesGp: 0 };
          bucket.playerResults[pId] = { combined: createEmptyStatBucket(), doubles: createEmptyStatBucket(), singles: createEmptyStatBucket() };
          bucket.eloMovement[pId] = { playerId: pId, name: pRec.name || 'Unknown Player', active: pRec.active !== false, doublesDelta: 0, singlesDelta: 0, doublesMatches: 0, singlesMatches: 0 };
          bucket.streaks[pId] = { current: 0, max: 0 };
        }

        bucket.participantIds.add(pId);
        const act = bucket.playerActivity[pId];
        const res = bucket.playerResults[pId];
        const stk = bucket.streaks[pId];

        act.gp++;
        if (isDoubles) act.doublesGp++; else act.singlesGp++;

        function updateBucketStats(b) {
          b.gp++;
          if (isWin) {
            b.wins++;
          } else {
            b.losses++;
          }
          b.pf += pf;
          b.pa += pa;
          b.pointDiff = b.pf - b.pa;
          b.winPct = b.gp > 0 ? (b.wins / b.gp) * 100 : 0;
          b.avgPointDiff = b.gp > 0 ? b.pointDiff / b.gp : 0;
        }

        updateBucketStats(res.combined);
        if (isDoubles) {
          updateBucketStats(res.doubles);
        } else {
          updateBucketStats(res.singles);
        }

        // Streak
        if (isWin) {
          stk.current++;
          if (stk.current > stk.max) stk.max = stk.current;
        } else {
          stk.current = 0;
        }

        // Elo Delta
        if (mDeltas && typeof mDeltas[pId] === 'number') {
          const delta = mDeltas[pId];
          if (isDoubles) {
            bucket.eloMovement[pId].doublesDelta += delta;
            bucket.eloMovement[pId].doublesMatches++;
          } else {
            bucket.eloMovement[pId].singlesDelta += delta;
            bucket.eloMovement[pId].singlesMatches++;
          }
        }
      }

      if (m.matchType === 'DOUBLES') {
        bucket.doublesMatches++;
        const p1 = m.teamA ? m.teamA.player1 : null;
        const p2 = m.teamA ? m.teamA.player2 : null;
        const p3 = m.teamB ? m.teamB.player1 : null;
        const p4 = m.teamB ? m.teamB.player2 : null;

        recordPlayerMatch(p1, isWinnerA, sA, sB, true);
        recordPlayerMatch(p2, isWinnerA, sA, sB, true);
        recordPlayerMatch(p3, !isWinnerA, sB, sA, true);
        recordPlayerMatch(p4, !isWinnerA, sB, sA, true);
      } else if (m.matchType === 'SINGLES') {
        bucket.singlesMatches++;
        const pA = m.playerA;
        const pB = m.playerB;

        recordPlayerMatch(pA, isWinnerA, sA, sB, false);
        recordPlayerMatch(pB, !isWinnerA, sB, sA, false);
      }
    });

    // 4. Finalize weekly metrics & calculate highlights
    Object.values(weeks).forEach(bucket => {
      bucket.uniquePlayers = bucket.participantIds.size;

      const pList = Object.values(bucket.playerActivity).filter(p => p.gp > 0);

      if (pList.length > 0) {
        // Most Active
        const mostActiveSorted = [...pList].sort((a, b) => {
          if (a.gp !== b.gp) return b.gp - a.gp;
          return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });
        const topAct = mostActiveSorted[0];
        if (topAct && topAct.gp > 0) {
          bucket.highlights.mostActive = {
            playerId: topAct.playerId,
            name: topAct.name,
            gp: topAct.gp,
            doublesGp: topAct.doublesGp,
            singlesGp: topAct.singlesGp
          };
        }

        // Top Win % (min 3 games, strictly null if no player meets 3 GP)
        const eligibleWinPct = pList.filter(p => p.gp >= minWeeklyGamesHighlight);
        if (eligibleWinPct.length > 0) {
          const winPctSorted = [...eligibleWinPct].sort((a, b) => {
            const resA = bucket.playerResults[a.playerId].combined;
            const resB = bucket.playerResults[b.playerId].combined;
            if (Math.abs(resA.winPct - resB.winPct) > 0.0001) return resB.winPct - resA.winPct;
            if (resA.gp !== resB.gp) return resB.gp - resA.gp;
            if (resA.pointDiff !== resB.pointDiff) return resB.pointDiff - resA.pointDiff;
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
          });
          const topWin = winPctSorted[0];
          if (topWin) {
            const res = bucket.playerResults[topWin.playerId].combined;
            bucket.highlights.topWinPct = {
              playerId: topWin.playerId,
              name: topWin.name,
              gp: res.gp,
              wins: res.wins,
              losses: res.losses,
              winPct: Number(res.winPct.toFixed(1)),
              pointDiff: res.pointDiff
            };
          }
        }

        // Biggest Doubles Riser / Faller
        const doublesEloActive = Object.values(bucket.eloMovement).filter(e => e.doublesMatches > 0);
        if (doublesEloActive.length > 0) {
          const risers = [...doublesEloActive].filter(e => e.doublesDelta > 0).sort((a, b) => {
            if (Math.abs(a.doublesDelta - b.doublesDelta) > 0.0001) return b.doublesDelta - a.doublesDelta;
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
          });
          if (risers.length > 0) {
            bucket.highlights.biggestDoublesRiser = {
              playerId: risers[0].playerId,
              name: risers[0].name,
              delta: risers[0].doublesDelta,
              matches: risers[0].doublesMatches
            };
          }
          const fallers = [...doublesEloActive].filter(e => e.doublesDelta < 0).sort((a, b) => {
            if (Math.abs(a.doublesDelta - b.doublesDelta) > 0.0001) return a.doublesDelta - b.doublesDelta;
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
          });
          if (fallers.length > 0) {
            bucket.highlights.biggestDoublesFaller = {
              playerId: fallers[0].playerId,
              name: fallers[0].name,
              delta: fallers[0].doublesDelta,
              matches: fallers[0].doublesMatches
            };
          }
        }

        // Biggest Singles Riser / Faller
        const singlesEloActive = Object.values(bucket.eloMovement).filter(e => e.singlesMatches > 0);
        if (singlesEloActive.length > 0) {
          const risers = [...singlesEloActive].filter(e => e.singlesDelta > 0).sort((a, b) => {
            if (Math.abs(a.singlesDelta - b.singlesDelta) > 0.0001) return b.singlesDelta - a.singlesDelta;
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
          });
          if (risers.length > 0) {
            bucket.highlights.biggestSinglesRiser = {
              playerId: risers[0].playerId,
              name: risers[0].name,
              delta: risers[0].singlesDelta,
              matches: risers[0].singlesMatches
            };
          }
          const fallers = [...singlesEloActive].filter(e => e.singlesDelta < 0).sort((a, b) => {
            if (Math.abs(a.singlesDelta - b.singlesDelta) > 0.0001) return a.singlesDelta - b.singlesDelta;
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
          });
          if (fallers.length > 0) {
            bucket.highlights.biggestSinglesFaller = {
              playerId: fallers[0].playerId,
              name: fallers[0].name,
              delta: fallers[0].singlesDelta,
              matches: fallers[0].singlesMatches
            };
          }
        }

        // Longest Win Streak
        const streakCandidates = Object.entries(bucket.streaks).filter(([_, s]) => s.max > 0);
        if (streakCandidates.length > 0) {
          streakCandidates.sort(([pAId, sA], [pBId, sB]) => {
            if (sA.max !== sB.max) return sB.max - sA.max;
            const nameA = playersMap[pAId] ? playersMap[pAId].name : '';
            const nameB = playersMap[pBId] ? playersMap[pBId].name : '';
            return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
          });
          const [topStkId, topStk] = streakCandidates[0];
          const pRec = playersMap[topStkId] || { name: 'Unknown' };
          bucket.highlights.longestWinStreak = {
            playerId: topStkId,
            name: pRec.name || 'Unknown',
            streak: topStk.max
          };
        }
      }
    });

    // 5. Build Season-Level Summary & Trends
    const totalWeeks = weeksList.length;
    let totalInSeasonMatches = 0;
    let totalDoubles = 0;
    let totalSingles = 0;
    let maxMatchWeek = null;
    let maxMatchesCount = -1;
    let maxPartWeek = null;
    let maxPartCount = -1;

    const weeklyTrends = weeksList.map(w => {
      const b = weeks[w.weekNumber];
      totalInSeasonMatches += b.totalMatches;
      totalDoubles += b.doublesMatches;
      totalSingles += b.singlesMatches;

      if (b.totalMatches > maxMatchesCount) {
        maxMatchesCount = b.totalMatches;
        maxMatchWeek = b.totalMatches > 0 ? w.weekNumber : null;
      }
      if (b.uniquePlayers > maxPartCount) {
        maxPartCount = b.uniquePlayers;
        maxPartWeek = b.uniquePlayers > 0 ? w.weekNumber : null;
      }

      return {
        weekNumber: w.weekNumber,
        label: w.label,
        startDate: w.startDate,
        endDate: w.endDate,
        totalMatches: b.totalMatches,
        doublesMatches: b.doublesMatches,
        singlesMatches: b.singlesMatches,
        uniquePlayers: b.uniquePlayers
      };
    });

    const seasonSummary = {
      totalWeeks: totalWeeks,
      totalMatches: totalInSeasonMatches,
      doublesMatches: totalDoubles,
      singlesMatches: totalSingles,
      totalPlayers: Object.keys(playersMap || {}).length,
      avgMatchesPerWeek: totalWeeks > 0 ? Number((totalInSeasonMatches / totalWeeks).toFixed(1)) : 0,
      busiestWeek: maxMatchWeek !== null ? { weekNumber: maxMatchWeek, matchCount: maxMatchesCount } : null,
      highestParticipationWeek: maxPartWeek !== null ? { weekNumber: maxPartWeek, playerCount: maxPartCount } : null,
      weeklyTrends: weeklyTrends,
      activeWeeksCount: weeklyTrends.filter(t => t.totalMatches > 0).length
    };

    return {
      weeks,
      seasonSummary,
      trends: weeklyTrends
    };
  }

  function recalculateWeeklyAnalytics() {
    const calculated = calculateWeeklyAnalytics(SeasonState.players, SeasonState.matches, SeasonState.config, SeasonState.elo);
    SeasonState.weeklyAnalytics = calculated;

    if (SeasonState.activeTab === 'weekly') {
      renderWeeklyInsights();
    }
  }

  function getWeeklyPlayerStats(weekNumber = SeasonState.selectedWeek || 1, mode = SeasonState.weeklyMode || 'COMBINED') {
    if (!SeasonState.weeklyAnalytics || !SeasonState.weeklyAnalytics.weeks) return [];
    const bucket = SeasonState.weeklyAnalytics.weeks[weekNumber];
    if (!bucket) return [];

    const cat = (mode || 'COMBINED').toLowerCase();
    const validCat = (cat === 'doubles' || cat === 'singles') ? cat : 'combined';

    const allPlayers = Object.values(SeasonState.players || {});
    const list = allPlayers.map(p => {
      const pId = p.id;
      const act = (bucket.playerActivity && bucket.playerActivity[pId]) || { gp: 0, doublesGp: 0, singlesGp: 0 };
      const res = (bucket.playerResults && bucket.playerResults[pId]) ? bucket.playerResults[pId][validCat] : createEmptyStatBucket();
      const eloMov = (bucket.eloMovement && bucket.eloMovement[pId]) || { doublesDelta: 0, singlesDelta: 0 };

      const gp = (validCat === 'doubles') ? act.doublesGp : (validCat === 'singles' ? act.singlesGp : act.gp);

      return {
        playerId: pId,
        name: p.name || 'Unknown Player',
        active: p.active !== false,
        gp: gp,
        wins: res.wins,
        losses: res.losses,
        winPct: res.winPct,
        pf: res.pf,
        pa: res.pa,
        pointDiff: res.pointDiff,
        doublesEloDelta: eloMov.doublesDelta,
        singlesEloDelta: eloMov.singlesDelta
      };
    }).filter(p => p.gp > 0);

    list.sort((a, b) => {
      if (a.gp !== b.gp) return b.gp - a.gp;
      if (Math.abs(a.winPct - b.winPct) > 0.0001) return b.winPct - a.winPct;
      if (a.pointDiff !== b.pointDiff) return b.pointDiff - a.pointDiff;
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });

    return list;
  }

  function setSelectedWeek(weekNumber) {
    const num = parseInt(weekNumber, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      SeasonState.selectedWeek = num;
      renderWeeklyInsights();
    }
  }

  function setWeeklyMode(mode) {
    const m = (mode || '').toUpperCase();
    const valid = (m === 'SINGLES' || m === 'DOUBLES') ? m : 'COMBINED';
    SeasonState.weeklyMode = valid;
    renderWeeklyInsights();
  }

  function renderWeeklyTrendSvg(trendDataOrSummary, selectedWeek) {
    let trends = [];
    if (Array.isArray(trendDataOrSummary)) {
      trends = trendDataOrSummary;
    } else if (trendDataOrSummary && Array.isArray(trendDataOrSummary.weeklyTrends)) {
      trends = trendDataOrSummary.weeklyTrends;
    } else if (SeasonState.weeklyAnalytics && Array.isArray(SeasonState.weeklyAnalytics.trends)) {
      trends = SeasonState.weeklyAnalytics.trends;
    }
    if (!trends || trends.length === 0) return '';
    const sel = typeof selectedWeek === 'number' ? selectedWeek : (SeasonState.selectedWeek || 1);

    const width = 640;
    const height = 180;
    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const maxMatches = Math.max(10, ...trends.map(t => t.totalMatches));
    const colWidth = chartW / trends.length;
    const barWidth = Math.max(8, colWidth * 0.55);

    let barsHtml = '';
    let labelsHtml = '';

    trends.forEach((t, idx) => {
      const xCenter = padLeft + idx * colWidth + colWidth / 2;
      const xBar = xCenter - barWidth / 2;
      const isSel = t.weekNumber === selectedWeek;

      const totalH = (t.totalMatches / maxMatches) * chartH;
      const doublesH = (t.doublesMatches / maxMatches) * chartH;
      const singlesH = totalH - doublesH;

      const yTotal = padTop + chartH - totalH;
      const yDoubles = padTop + chartH - doublesH;

      const barFill = isSel ? 'var(--primary, #2563eb)' : 'rgba(37, 99, 235, 0.45)';
      const singlesFill = isSel ? '#7c3aed' : 'rgba(124, 58, 237, 0.45)';

      barsHtml += `
        <g class="trend-col-group" style="cursor:pointer;" onclick="SeasonApp.setSelectedWeek(${t.weekNumber})" title="Week ${t.weekNumber}: ${t.totalMatches} matches (${t.doublesMatches} D, ${t.singlesMatches} S), ${t.uniquePlayers} players">
          ${t.doublesMatches > 0 ? `<rect x="${xBar}" y="${yDoubles}" width="${barWidth}" height="${doublesH}" fill="${barFill}" rx="2" />` : ''}
          ${t.singlesMatches > 0 ? `<rect x="${xBar}" y="${yTotal}" width="${barWidth}" height="${singlesH}" fill="${singlesFill}" rx="2" />` : ''}
          ${t.totalMatches > 0 ? `<text x="${xCenter}" y="${Math.max(12, yTotal - 4)}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-secondary, #64748b)">${t.totalMatches}</text>` : ''}
        </g>
      `;

      labelsHtml += `
        <text x="${xCenter}" y="${height - 10}" text-anchor="middle" font-size="10" font-weight="${isSel ? '800' : '600'}" fill="${isSel ? 'var(--primary, #2563eb)' : 'var(--text-muted, #94a3b8)'}">
          W${t.weekNumber}
        </text>
      `;
    });

    return `
      <svg class="season-trend-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <line x1="${padLeft}" y1="${padTop + chartH}" x2="${width - padRight}" y2="${padTop + chartH}" stroke="var(--border-card, #e2e8f0)" stroke-width="1" />
        ${barsHtml}
        ${labelsHtml}
      </svg>
    `;
  }

  function renderWeeklyInsights() {
    const container = document.getElementById('seasonWeeklyContainer');
    if (!container) return;

    if (!SeasonState.weeklyAnalytics || !SeasonState.weeklyAnalytics.weeks) {
      recalculateWeeklyAnalytics();
    }

    const weeklyData = SeasonState.weeklyAnalytics;
    const weeksMap = weeklyData.weeks;
    const seasonSummary = weeklyData.seasonSummary;

    const selWeekNum = SeasonState.selectedWeek || getCurrentSeasonWeekNumber();
    SeasonState.selectedWeek = selWeekNum;

    const curWeekBucket = weeksMap[selWeekNum] || {
      weekNumber: selWeekNum,
      startDate: '—',
      endDate: '—',
      label: `Week ${selWeekNum}`,
      totalMatches: 0,
      doublesMatches: 0,
      singlesMatches: 0,
      uniquePlayers: 0,
      highlights: {}
    };

    const highlights = curWeekBucket.highlights || {};
    const mode = SeasonState.weeklyMode || 'COMBINED';
    const playerEntries = getWeeklyPlayerStats(selWeekNum, mode);

    const isCurrentWeek = selWeekNum === getCurrentSeasonWeekNumber();

    const weeksList = generateSeasonWeeks(SeasonState.config);

    container.innerHTML = `
      <div class="season-weekly-wrap">

        <!-- Season Activity Overview & Trend Chart -->
        <div class="season-trend-card">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                📈 12-Week Season Activity &amp; Participation Trends
              </h3>
              <p style="margin:2px 0 0; font-size:0.78rem; color:var(--text-muted);">
                ${seasonSummary.totalMatches} matches played across ${seasonSummary.totalWeeks} weeks (${seasonSummary.avgMatchesPerWeek} matches/wk avg)
              </p>
            </div>
            <div style="display:flex; gap:12px; font-size:0.75rem; color:var(--text-secondary); font-weight:700;">
              <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:2px; background:var(--primary, #2563eb);"></span> 👥 Doubles</span>
              <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:2px; background:#7c3aed;"></span> 👤 Singles</span>
            </div>
          </div>

          <div class="season-trend-svg-wrap">
            ${renderWeeklyTrendSvg(seasonSummary, selWeekNum)}
          </div>
        </div>

        <!-- Week Selector Bar -->
        <div class="season-week-selector-bar" role="tablist" aria-label="Season Week Selector">
          ${weeksList.map(w => {
            const b = weeksMap[w.weekNumber] || { totalMatches: 0, uniquePlayers: 0 };
            const isSel = w.weekNumber === selWeekNum;
            const isCur = w.weekNumber === getCurrentSeasonWeekNumber();

            return `
              <button type="button" class="season-week-chip ${isSel ? 'active' : ''}" onclick="SeasonApp.setSelectedWeek(${w.weekNumber})" role="tab" aria-selected="${isSel}">
                <span class="season-week-chip-title">${w.label}${isCur ? ' •' : ''}</span>
                <span class="season-week-chip-sub">${w.startDate.substring(5)}</span>
                <span class="season-week-chip-pill">${b.totalMatches} games</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Active Week Hero Card -->
        <div class="season-weekly-hero">
          <div class="season-weekly-header-row">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <h2 style="margin:0; font-size:1.4rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                  📅 ${curWeekBucket.label} Insights
                </h2>
                ${isCurrentWeek ? '<span class="season-admin-status-badge active" style="font-size:0.7rem; padding:2px 8px;">CURRENT WEEK</span>' : ''}
              </div>
              <p style="margin:4px 0 0; font-size:0.82rem; color:var(--text-muted); font-weight:600;">
                ${curWeekBucket.startDate} &rarr; ${curWeekBucket.endDate}
              </p>
            </div>
            <div class="season-roster-chips">
              <span class="season-count-chip active-chip">${curWeekBucket.totalMatches} Matches</span>
              <span class="season-count-chip">${curWeekBucket.uniquePlayers} Active Players</span>
              <span class="season-count-chip" style="color:var(--primary);">👥 ${curWeekBucket.doublesMatches} Dbl</span>
              <span class="season-count-chip" style="color:#7c3aed;">👤 ${curWeekBucket.singlesMatches} Sgl</span>
            </div>
          </div>

          <!-- Weekly Highlights Grid -->
          <div class="season-weekly-highlights-grid">
            <div class="season-highlight-card">
              <div class="season-highlight-header">
                <span>🏃 MOST ACTIVE</span>
                <span>🔥</span>
              </div>
              <div class="season-highlight-val">
                ${highlights.mostActive ? highlights.mostActive.name : '<span style="color:var(--text-muted); font-size:0.9rem;">—</span>'}
              </div>
              <div class="season-highlight-sub">
                ${highlights.mostActive ? `<span>${highlights.mostActive.gp} Games (${highlights.mostActive.doublesGp}D / ${highlights.mostActive.singlesGp}S)</span>` : '<span>No games recorded</span>'}
              </div>
            </div>

            <div class="season-highlight-card">
              <div class="season-highlight-header">
                <span>🎯 TOP WIN RATE</span>
                <span>🥇</span>
              </div>
              <div class="season-highlight-val">
                ${highlights.topWinPct ? highlights.topWinPct.name : '<span style="color:var(--text-muted); font-size:0.9rem;">—</span>'}
              </div>
              <div class="season-highlight-sub">
                ${highlights.topWinPct ? `<span style="color:var(--win-color, #059669); font-weight:800;">${formatWinPct(highlights.topWinPct.winPct)}</span> (${highlights.topWinPct.wins}–${highlights.topWinPct.losses})` : '<span>Min 3 GP required</span>'}
              </div>
            </div>

            <div class="season-highlight-card">
              <div class="season-highlight-header">
                <span>👥 DOUBLES RISER</span>
                <span>📈</span>
              </div>
              <div class="season-highlight-val">
                ${highlights.biggestDoublesRiser ? highlights.biggestDoublesRiser.name : '<span style="color:var(--text-muted); font-size:0.9rem;">—</span>'}
              </div>
              <div class="season-highlight-sub">
                ${highlights.biggestDoublesRiser ? `<span class="season-delta-tag pos">${formatEloDelta(highlights.biggestDoublesRiser.delta)} Elo</span> (${highlights.biggestDoublesRiser.matches} games)` : '<span>No rating gain</span>'}
              </div>
            </div>

            <div class="season-highlight-card">
              <div class="season-highlight-header">
                <span>👤 SINGLES RISER</span>
                <span>📈</span>
              </div>
              <div class="season-highlight-val">
                ${highlights.biggestSinglesRiser ? highlights.biggestSinglesRiser.name : '<span style="color:var(--text-muted); font-size:0.9rem;">—</span>'}
              </div>
              <div class="season-highlight-sub">
                ${highlights.biggestSinglesRiser ? `<span class="season-delta-tag pos">${formatEloDelta(highlights.biggestSinglesRiser.delta)} Elo</span> (${highlights.biggestSinglesRiser.matches} games)` : '<span>No rating gain</span>'}
              </div>
            </div>

            <div class="season-highlight-card">
              <div class="season-highlight-header">
                <span>⚡ LONGEST STREAK</span>
                <span>🏆</span>
              </div>
              <div class="season-highlight-val">
                ${highlights.longestWinStreak ? highlights.longestWinStreak.name : '<span style="color:var(--text-muted); font-size:0.9rem;">—</span>'}
              </div>
              <div class="season-highlight-sub">
                ${highlights.longestWinStreak ? `<span>${highlights.longestWinStreak.streak} Consecutive Wins</span>` : '<span>No active streak</span>'}
              </div>
            </div>
          </div>
        </div>

        <!-- Weekly Performance Table Section -->
        <div class="season-weekly-table-wrap">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                📊 Weekly Performance Table (${playerEntries.length} Active Participants)
              </h3>
              <p style="margin:2px 0 0; font-size:0.78rem; color:var(--text-muted);">
                Performance breakdown and rating movements for matches played within ${curWeekBucket.label}.
              </p>
            </div>
            <div class="season-filter-segmented" role="tablist">
              <button type="button" class="season-filter-btn ${mode === 'COMBINED' ? 'active' : ''}" onclick="SeasonApp.setWeeklyMode('COMBINED')">🌐 Combined</button>
              <button type="button" class="season-filter-btn ${mode === 'DOUBLES' ? 'active' : ''}" onclick="SeasonApp.setWeeklyMode('DOUBLES')">👥 Doubles</button>
              <button type="button" class="season-filter-btn ${mode === 'SINGLES' ? 'active' : ''}" onclick="SeasonApp.setWeeklyMode('SINGLES')">👤 Singles</button>
            </div>
          </div>

          <div style="overflow-x:auto;">
            <table class="season-mini-table">
              <thead>
                <tr>
                  <th style="width:36px; text-align:center;">#</th>
                  <th>Player</th>
                  <th style="text-align:center;">GP</th>
                  <th style="text-align:center;">W–L</th>
                  <th style="text-align:right;">Win %</th>
                  <th style="text-align:right;">+/-</th>
                  <th style="text-align:right;">👥 Dbl Elo Δ</th>
                  <th style="text-align:right;">👤 Sgl Elo Δ</th>
                </tr>
              </thead>
              <tbody>
                ${playerEntries.length > 0 ? playerEntries.map((e, idx) => {
                  const dDelta = e.doublesEloDelta;
                  const sDelta = e.singlesEloDelta;
                  return `
                    <tr onclick="SeasonApp.openPlayerProfile('${e.playerId}')" style="cursor:pointer;">
                      <td style="text-align:center; font-weight:700; color:var(--text-muted);">${idx + 1}</td>
                      <td>
                        <div style="font-weight:700; color:var(--text-primary);">
                          <span>${e.name}</span>
                          ${!e.active ? '<span class="season-tag-pill" style="font-size:0.6rem; padding:1px 4px; margin-left:4px;">Inactive</span>' : ''}
                        </div>
                      </td>
                      <td style="text-align:center; font-weight:700;">${e.gp}</td>
                      <td style="text-align:center; color:var(--text-muted);">${e.wins}–${e.losses}</td>
                      <td style="text-align:right; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">${formatWinPct(e.winPct)}</td>
                      <td style="text-align:right; font-weight:700; color:${e.pointDiff > 0 ? 'var(--win-color, #059669)' : (e.pointDiff < 0 ? 'var(--loss-color, #ef4444)' : 'inherit')};">${formatPointDiff(e.pointDiff)}</td>
                      <td style="text-align:right;">
                        ${dDelta !== 0 ? `<span class="season-delta-tag ${dDelta >= 0 ? 'pos' : 'neg'}">${formatEloDelta(dDelta)}</span>` : '<span style="color:var(--text-muted);">0</span>'}
                      </td>
                      <td style="text-align:right;">
                        ${sDelta !== 0 ? `<span class="season-delta-tag ${sDelta >= 0 ? 'pos' : 'neg'}">${formatEloDelta(sDelta)}</span>` : '<span style="color:var(--text-muted);">0</span>'}
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="8" style="text-align:center; padding:32px; color:var(--text-muted);">
                      <span style="font-size:2rem; display:block; margin-bottom:6px;">🏸</span>
                      <strong>No matches recorded for ${curWeekBucket.label} (${curWeekBucket.startDate} to ${curWeekBucket.endDate})</strong>
                      <p style="font-size:0.75rem; margin:4px 0 0;">Matches dated within this week's date range will automatically populate here.</p>
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

  // ============================================================================
  // 22. Phase 10: Tournament Seeding & Export Engine
  // ============================================================================

  /**
   * Identifies Qualified vs Provisional tournament candidates based on Doubles GP >= minGamesQualified.
   * Deterministic, pure function.
   */
  function getQualifiedTournamentCandidates(playersMap = SeasonState.players, statsMap = SeasonState.playerStats, eloState = SeasonState.elo, config = SeasonState.config) {
    const minGames = (config && typeof config.minGamesQualified === 'number') ? config.minGamesQualified : 15;
    const allPlayers = Object.values(playersMap || {});

    const list = allPlayers.map(p => {
      const pId = p.id;
      const st = (statsMap && statsMap[pId]) ? statsMap[pId] : createEmptyPlayerStats();
      const elo = (eloState && eloState.ratings && eloState.ratings[pId]) ? eloState.ratings[pId] : { doublesElo: 1500, singlesElo: 1500 };
      const dGp = st.doubles ? st.doubles.gp : 0;
      const isQualified = dGp >= minGames;

      return {
        playerId: pId,
        name: p.name || 'Unknown Player',
        active: p.active !== false,
        qualified: isQualified,
        doublesGp: dGp,
        doublesWins: st.doubles ? st.doubles.wins : 0,
        doublesLosses: st.doubles ? st.doubles.losses : 0,
        doublesWinPct: st.doubles ? st.doubles.winPct : 0,
        doublesPointDiff: st.doubles ? st.doubles.pointDiff : 0,
        doublesAvgPointDiff: st.doubles ? st.doubles.avgPointDiff : 0,
        doublesElo: elo.doublesElo !== undefined ? elo.doublesElo : 1500,
        singlesGp: st.singles ? st.singles.gp : 0,
        singlesWins: st.singles ? st.singles.wins : 0,
        singlesLosses: st.singles ? st.singles.losses : 0,
        singlesWinPct: st.singles ? st.singles.winPct : 0,
        singlesPointDiff: st.singles ? st.singles.pointDiff : 0,
        singlesElo: elo.singlesElo !== undefined ? elo.singlesElo : 1500,
        combinedGp: st.combined ? st.combined.gp : 0,
        combinedWins: st.combined ? st.combined.wins : 0,
        combinedLosses: st.combined ? st.combined.losses : 0,
        combinedWinPct: st.combined ? st.combined.winPct : 0,
        combinedPointDiff: st.combined ? st.combined.pointDiff : 0
      };
    });

    function sortCandidates(arr) {
      return [...arr].sort((a, b) => {
        if (Math.abs(a.doublesElo - b.doublesElo) > 0.00001) return b.doublesElo - a.doublesElo;
        if (a.doublesGp !== b.doublesGp) return b.doublesGp - a.doublesGp;
        if (Math.abs(a.doublesWinPct - b.doublesWinPct) > 0.00001) return b.doublesWinPct - a.doublesWinPct;
        if (a.doublesPointDiff !== b.doublesPointDiff) return b.doublesPointDiff - a.doublesPointDiff;
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });
    }

    const qualified = sortCandidates(list.filter(p => p.qualified));
    const provisional = sortCandidates(list.filter(p => !p.qualified));

    return {
      qualified,
      provisional,
      all: sortCandidates(list)
    };
  }

  /**
   * Generates proposed Level 1 / 2 / 3 tiers for a given list of selected candidates.
   * Deterministic, pure function.
   */
  function generateSeedingProposal(selectedCandidates = [], seedingConfig = SeasonState.seeding.config) {
    const l3Count = (seedingConfig && typeof seedingConfig.level3Count === 'number') ? seedingConfig.level3Count : 8;
    const l2Count = (seedingConfig && typeof seedingConfig.level2Count === 'number') ? seedingConfig.level2Count : 10;
    const l1Count = (seedingConfig && typeof seedingConfig.level1Count === 'number') ? seedingConfig.level1Count : 6;

    // Sort selected candidates deterministically
    const sorted = [...selectedCandidates].sort((a, b) => {
      if (Math.abs(a.doublesElo - b.doublesElo) > 0.00001) return b.doublesElo - a.doublesElo;
      if (a.doublesGp !== b.doublesGp) return b.doublesGp - a.doublesGp;
      if (Math.abs(a.doublesWinPct - b.doublesWinPct) > 0.00001) return b.doublesWinPct - a.doublesWinPct;
      if (a.doublesPointDiff !== b.doublesPointDiff) return b.doublesPointDiff - a.doublesPointDiff;
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });

    const proposedList = [];
    const proposedMap = {};

    sorted.forEach((p, idx) => {
      const rank = idx + 1;
      let level = 1;
      if (rank <= l3Count) {
        level = 3;
      } else if (rank <= (l3Count + l2Count)) {
        level = 2;
      } else {
        level = 1;
      }

      const item = {
        ...p,
        rank,
        proposedLevel: level
      };

      proposedList.push(item);
      proposedMap[p.playerId] = level;
    });

    // Identify boundary comparisons
    const boundaries = [];
    if (l3Count > 0 && sorted.length > l3Count) {
      const pAbove = sorted[l3Count - 1];
      const pBelow = sorted[l3Count];
      boundaries.push({
        boundaryName: 'Level 3 / Level 2 Cutoff',
        rankAbove: l3Count,
        playerAbove: pAbove,
        rankBelow: l3Count + 1,
        playerBelow: pBelow,
        eloGap: Number(Math.abs(pAbove.doublesElo - pBelow.doublesElo).toFixed(1))
      });
    }

    const l2BoundaryIdx = l3Count + l2Count;
    if (l2Count > 0 && sorted.length > l2BoundaryIdx) {
      const pAbove = sorted[l2BoundaryIdx - 1];
      const pBelow = sorted[l2BoundaryIdx];
      boundaries.push({
        boundaryName: 'Level 2 / Level 1 Cutoff',
        rankAbove: l2BoundaryIdx,
        playerAbove: pAbove,
        rankBelow: l2BoundaryIdx + 1,
        playerBelow: pBelow,
        eloGap: Number(Math.abs(pAbove.doublesElo - pBelow.doublesElo).toFixed(1))
      });
    }

    return {
      proposedList,
      proposedMap,
      boundaries
    };
  }

  /**
   * Validates manual tier assignments vs target counts.
   */
  function validateTournamentTierDistribution(finalLevelsMap = SeasonState.seeding.finalLevels, selectedPlayerIds = SeasonState.seeding.selectedPlayerIds, seedingConfig = SeasonState.seeding.config) {
    const l3Target = (seedingConfig && typeof seedingConfig.level3Count === 'number') ? seedingConfig.level3Count : 8;
    const l2Target = (seedingConfig && typeof seedingConfig.level2Count === 'number') ? seedingConfig.level2Count : 10;
    const l1Target = (seedingConfig && typeof seedingConfig.level1Count === 'number') ? seedingConfig.level1Count : 6;
    const totalTarget = l3Target + l2Target + l1Target;

    let l3Count = 0;
    let l2Count = 0;
    let l1Count = 0;
    let unassignedCount = 0;

    const errors = [];
    const warnings = [];

    const selectedList = Array.isArray(selectedPlayerIds) ? selectedPlayerIds : [];
    selectedList.forEach(pId => {
      const entry = finalLevelsMap ? finalLevelsMap[pId] : null;
      const lvl = (entry && typeof entry.level === 'number') ? entry.level : (typeof entry === 'number' ? entry : null);
      if (lvl === 3) l3Count++;
      else if (lvl === 2) l2Count++;
      else if (lvl === 1) l1Count++;
      else unassignedCount++;
    });

    const totalSelected = selectedList.length;
    const assignedCount = l3Count + l2Count + l1Count;

    if (totalSelected !== totalTarget) {
      warnings.push(`Selected players (${totalSelected}) differs from configured target roster size (${totalTarget}).`);
    }

    if (unassignedCount > 0) {
      errors.push(`${unassignedCount} selected player(s) do not have a Level assigned.`);
    }

    if (l3Count !== l3Target) {
      errors.push(`Level 3 has ${l3Count} players (target: ${l3Target}).`);
    }

    if (l2Count !== l2Target) {
      errors.push(`Level 2 has ${l2Count} players (target: ${l2Target}).`);
    }

    if (l1Count !== l1Target) {
      errors.push(`Level 1 has ${l1Count} players (target: ${l1Target}).`);
    }

    const valid = errors.length === 0 && assignedCount === totalSelected && totalSelected > 0;

    return {
      valid,
      totalSelected,
      assignedCount,
      l3Assigned: l3Count,
      l2Assigned: l2Count,
      l1Assigned: l1Count,
      l3Target,
      l2Target,
      l1Target,
      totalTarget,
      errors,
      warnings
    };
  }

  /**
   * Detailed evidence calculation for a single player.
   */
  function getTournamentSeedingEvidence(playerId, playersMap = SeasonState.players, matchesMap = SeasonState.matches, statsMap = SeasonState.playerStats, eloState = SeasonState.elo) {
    if (!playerId) return null;
    const p = (playersMap && playersMap[playerId]) ? playersMap[playerId] : { id: playerId, name: 'Unknown' };
    const st = (statsMap && statsMap[playerId]) ? statsMap[playerId] : createEmptyPlayerStats();
    const elo = (eloState && eloState.ratings && eloState.ratings[playerId]) ? eloState.ratings[playerId] : { doublesElo: 1500, singlesElo: 1500 };

    const partnerList = getPartnerStats(playerId);
    const uniquePartners = partnerList.length;

    const h2hList = getHeadToHeadStats(playerId);
    const uniqueOpponents = h2hList.length;

    const recent = getPlayerRecentMatches(playerId, 5);

    const proposedLvl = (SeasonState.seeding.proposedLevels && SeasonState.seeding.proposedLevels[playerId]) ? SeasonState.seeding.proposedLevels[playerId] : null;
    const finalLvlEntry = (SeasonState.seeding.finalLevels && SeasonState.seeding.finalLevels[playerId]) ? SeasonState.seeding.finalLevels[playerId] : null;
    const finalLvl = (finalLvlEntry && typeof finalLvlEntry.level === 'number') ? finalLvlEntry.level : (typeof finalLvlEntry === 'number' ? finalLvlEntry : proposedLvl);

    return {
      playerId,
      name: p.name,
      active: p.active !== false,
      doublesElo: elo.doublesElo !== undefined ? elo.doublesElo : 1500,
      singlesElo: elo.singlesElo !== undefined ? elo.singlesElo : 1500,
      doublesGp: st.doubles ? st.doubles.gp : 0,
      doublesWins: st.doubles ? st.doubles.wins : 0,
      doublesLosses: st.doubles ? st.doubles.losses : 0,
      doublesWinPct: st.doubles ? st.doubles.winPct : 0,
      doublesPointDiff: st.doubles ? st.doubles.pointDiff : 0,
      singlesGp: st.singles ? st.singles.gp : 0,
      singlesWins: st.singles ? st.singles.wins : 0,
      singlesLosses: st.singles ? st.singles.losses : 0,
      singlesWinPct: st.singles ? st.singles.winPct : 0,
      singlesPointDiff: st.singles ? st.singles.pointDiff : 0,
      combinedGp: st.combined ? st.combined.gp : 0,
      uniquePartners,
      uniqueOpponents,
      partnerList: partnerList.slice(0, 5),
      opponentList: h2hList.slice(0, 5),
      recentMatches: recent,
      proposedLevel: proposedLvl,
      finalLevel: finalLvl,
      adjusted: finalLvlEntry ? finalLvlEntry.adjusted === true : false,
      adjustmentReason: finalLvlEntry ? (finalLvlEntry.reason || '') : ''
    };
  }

  function subscribeToSeedingSnapshots() {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const path = getSeasonSeedingSnapshotsPath(SeasonState.config.seasonId);
    firebase.database().ref(path).on('value', snapshot => {
      const val = snapshot.val() || {};
      SeasonState.seeding.snapshots = val;
      if (SeasonState.activeTab === 'seeding') {
        renderTournamentSeeding();
      }
    });
  }

  /**
   * Finalizes the tournament seeding snapshot into Firebase with atomic audit log.
   */
  async function finalizeTournamentSeeding(seasonId = SeasonState.config.seasonId, seedingState = SeasonState.seeding, actorUid = null) {
    if (SeasonState.config.status !== 'FROZEN') {
      throw new Error('Season must be FROZEN before final tournament seeding can be confirmed.');
    }

    const valResult = validateTournamentTierDistribution(seedingState.finalLevels, seedingState.selectedPlayerIds, seedingState.config);
    if (!valResult.valid) {
      throw new Error(`Seeding distribution is invalid: ${valResult.errors.join(' ')}`);
    }

    let uid = actorUid;
    if (!uid && typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      uid = firebase.auth().currentUser.uid;
    }
    if (!uid) {
      uid = 'organizer-seeding-admin';
    }

    const candidateData = getQualifiedTournamentCandidates(SeasonState.players, SeasonState.playerStats, SeasonState.elo, SeasonState.config);
    const candidateMap = {};
    candidateData.all.forEach(c => { candidateMap[c.playerId] = c; });

    const playersSnapshot = {};
    seedingState.selectedPlayerIds.forEach(pId => {
      const cand = candidateMap[pId] || { name: 'Unknown', qualified: false, doublesGp: 0, doublesElo: 1500, singlesGp: 0, singlesElo: 1500, combinedGp: 0, doublesWins: 0, doublesLosses: 0, doublesWinPct: 0, doublesPointDiff: 0 };
      const propLvl = seedingState.proposedLevels[pId] || 1;
      const finalLvlEntry = seedingState.finalLevels[pId];
      const finalLvl = (finalLvlEntry && typeof finalLvlEntry.level === 'number') ? finalLvlEntry.level : (typeof finalLvlEntry === 'number' ? finalLvlEntry : propLvl);
      const isAdjusted = finalLvlEntry ? (finalLvlEntry.adjusted === true || finalLvl !== propLvl) : false;
      const reason = finalLvlEntry ? (finalLvlEntry.reason || '') : '';

      playersSnapshot[pId] = {
        playerId: pId,
        name: cand.name,
        qualified: cand.qualified,
        doublesGp: cand.doublesGp,
        doublesElo: cand.doublesElo,
        doublesWins: cand.doublesWins,
        doublesLosses: cand.doublesLosses,
        doublesWinPct: cand.doublesWinPct,
        doublesPointDiff: cand.doublesPointDiff,
        singlesGp: cand.singlesGp,
        singlesElo: cand.singlesElo,
        combinedGp: cand.combinedGp,
        proposedLevel: propLvl,
        finalLevel: finalLvl,
        adjusted: isAdjusted,
        reason: reason,
        adjustedByUid: isAdjusted ? uid : null,
        adjustedAt: isAdjusted ? Date.now() : null
      };
    });

    const snapshotKey = `seed_${Date.now()}`;
    const snapshotPayload = {
      snapshotId: snapshotKey,
      seasonId: seasonId,
      createdAt: (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue) ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
      createdByUid: uid,
      status: 'FINAL',
      seedingVersion: 1,
      algorithm: 'DOUBLES_ELO_TIER_CUTOFF',
      config: {
        startingElo: SeasonState.config.startingElo || 1500,
        kFactor: SeasonState.config.kFactor || 32,
        minGamesQualified: seedingState.config.minGamesQualified || 15,
        level3Count: seedingState.config.level3Count || 8,
        level2Count: seedingState.config.level2Count || 10,
        level1Count: seedingState.config.level1Count || 6
      },
      summary: {
        totalPlayers: seedingState.selectedPlayerIds.length,
        level3Count: valResult.l3Assigned,
        level2Count: valResult.l2Assigned,
        level1Count: valResult.l1Assigned
      },
      players: playersSnapshot
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const dbRef = firebase.database().ref();
      const auditKey = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const updates = {};
      updates[`seasons/${seasonId}/seedingSnapshots/${snapshotKey}`] = snapshotPayload;
      updates[`seasons/${seasonId}/finalSnapshot`] = snapshotPayload;
      updates[`seasons/${seasonId}/audit/${auditKey}`] = {
        action: 'TOURNAMENT_SEEDING_FINALIZED',
        targetId: seasonId,
        snapshotId: snapshotKey,
        actorUid: uid,
        serverTimestamp: (firebase.database.ServerValue) ? firebase.database.ServerValue.TIMESTAMP : Date.now()
      };
      await dbRef.update(updates);
    }

    if (!SeasonState.seeding.snapshots) SeasonState.seeding.snapshots = {};
    SeasonState.seeding.snapshots[snapshotKey] = snapshotPayload;
    SeasonState.seeding.selectedSnapshotId = snapshotKey;

    return snapshotPayload;
  }

  function exportSeedingCsv(snapshotOrState = null) {
    let players = [];
    if (snapshotOrState && snapshotOrState.players) {
      players = Object.values(snapshotOrState.players);
    } else {
      const candData = getQualifiedTournamentCandidates(SeasonState.players, SeasonState.playerStats, SeasonState.elo, SeasonState.config);
      const candMap = {};
      candData.all.forEach(c => { candMap[c.playerId] = c; });

      players = (SeasonState.seeding.selectedPlayerIds || []).map(pId => {
        const c = candMap[pId] || { name: 'Unknown', doublesElo: 1500, doublesGp: 0, doublesWinPct: 0, doublesPointDiff: 0, singlesElo: 1500, singlesGp: 0 };
        const prop = SeasonState.seeding.proposedLevels[pId] || 1;
        const finalEntry = SeasonState.seeding.finalLevels[pId];
        const fin = (finalEntry && typeof finalEntry.level === 'number') ? finalEntry.level : (typeof finalEntry === 'number' ? finalEntry : prop);
        return {
          name: c.name,
          doublesElo: c.doublesElo,
          doublesGp: c.doublesGp,
          doublesWinPct: c.doublesWinPct,
          doublesPointDiff: c.doublesPointDiff,
          singlesElo: c.singlesElo,
          singlesGp: c.singlesGp,
          proposedLevel: prop,
          finalLevel: fin,
          adjusted: finalEntry ? finalEntry.adjusted === true : false,
          reason: finalEntry ? (finalEntry.reason || '') : ''
        };
      });
    }

    players.sort((a, b) => {
      if (a.finalLevel !== b.finalLevel) return b.finalLevel - a.finalLevel;
      return b.doublesElo - a.doublesElo;
    });

    const rows = [
      ['Player', 'Season Doubles Elo', 'Doubles GP', 'Doubles Win %', 'Doubles +/-', 'Singles Elo', 'Singles GP', 'Proposed Level', 'Final Level', 'Adjusted', 'Reason']
    ];

    players.forEach(p => {
      rows.push([
        `"${(p.name || '').replace(/"/g, '""')}"`,
        formatElo(p.doublesElo),
        p.doublesGp || 0,
        `${formatWinPct(p.doublesWinPct || 0)}%`,
        formatPointDiff(p.doublesPointDiff || 0),
        formatElo(p.singlesElo),
        p.singlesGp || 0,
        p.proposedLevel || 1,
        p.finalLevel || 1,
        p.adjusted ? 'YES' : 'NO',
        `"${(p.reason || '').replace(/"/g, '""')}"`
      ]);
    });

    return rows.map(r => r.join(',')).join('\n');
  }

  function exportSeedingJson(snapshotOrState = null) {
    if (snapshotOrState && snapshotOrState.players) {
      return JSON.stringify(snapshotOrState, null, 2);
    }
    const candData = getQualifiedTournamentCandidates(SeasonState.players, SeasonState.playerStats, SeasonState.elo, SeasonState.config);
    const candMap = {};
    candData.all.forEach(c => { candMap[c.playerId] = c; });

    const exportObj = {
      seasonId: SeasonState.config.seasonId,
      exportedAt: new Date().toISOString(),
      config: SeasonState.seeding.config,
      players: (SeasonState.seeding.selectedPlayerIds || []).map(pId => {
        const c = candMap[pId] || { name: 'Unknown', doublesElo: 1500, doublesGp: 0 };
        const prop = SeasonState.seeding.proposedLevels[pId] || 1;
        const finalEntry = SeasonState.seeding.finalLevels[pId];
        const fin = (finalEntry && typeof finalEntry.level === 'number') ? finalEntry.level : (typeof finalEntry === 'number' ? finalEntry : prop);
        return {
          playerId: pId,
          name: c.name,
          doublesElo: Number(c.doublesElo.toFixed(1)),
          doublesGp: c.doublesGp,
          singlesElo: Number(c.singlesElo.toFixed(1)),
          proposedLevel: prop,
          finalLevel: fin,
          adjusted: finalEntry ? finalEntry.adjusted === true : false,
          reason: finalEntry ? (finalEntry.reason || '') : ''
        };
      })
    };
    return JSON.stringify(exportObj, null, 2);
  }

  function exportSeedingWhatsApp(snapshotOrState = null) {
    let players = [];
    if (snapshotOrState && snapshotOrState.players) {
      players = Object.values(snapshotOrState.players);
    } else {
      const candData = getQualifiedTournamentCandidates(SeasonState.players, SeasonState.playerStats, SeasonState.elo, SeasonState.config);
      const candMap = {};
      candData.all.forEach(c => { candMap[c.playerId] = c; });

      players = (SeasonState.seeding.selectedPlayerIds || []).map(pId => {
        const c = candMap[pId] || { name: 'Unknown', doublesElo: 1500, doublesGp: 0 };
        const prop = SeasonState.seeding.proposedLevels[pId] || 1;
        const finalEntry = SeasonState.seeding.finalLevels[pId];
        const fin = (finalEntry && typeof finalEntry.level === 'number') ? finalEntry.level : (typeof finalEntry === 'number' ? finalEntry : prop);
        return {
          name: c.name,
          doublesElo: c.doublesElo,
          doublesGp: c.doublesGp,
          finalLevel: fin
        };
      });
    }

    const l3 = players.filter(p => p.finalLevel === 3).sort((a, b) => b.doublesElo - a.doublesElo);
    const l2 = players.filter(p => p.finalLevel === 2).sort((a, b) => b.doublesElo - a.doublesElo);
    const l1 = players.filter(p => p.finalLevel === 1).sort((a, b) => b.doublesElo - a.doublesElo);

    let text = `🏸 *COMMUNITY BADMINTON CUP — TOURNAMENT SEEDING TIERS*\n`;
    text += `📅 _Derived from Fall 2026 Season Performance Evidence_\n\n`;

    text += `⭐ *LEVEL 3 — ADVANCED (${l3.length} Players)*\n`;
    l3.forEach((p, i) => {
      text += `${i + 1}. ${p.name} — ${formatElo(p.doublesElo)} Elo (${p.doublesGp} GP)\n`;
    });

    text += `\n🔷 *LEVEL 2 — INTERMEDIATE (${l2.length} Players)*\n`;
    l2.forEach((p, i) => {
      text += `${i + 1}. ${p.name} — ${formatElo(p.doublesElo)} Elo (${p.doublesGp} GP)\n`;
    });

    text += `\n🟢 *LEVEL 1 — DEVELOPING (${l1.length} Players)*\n`;
    l1.forEach((p, i) => {
      text += `${i + 1}. ${p.name} — ${formatElo(p.doublesElo)} Elo (${p.doublesGp} GP)\n`;
    });

    text += `\n📊 _Total Tournament Roster: ${players.length} Players_`;
    return text;
  }

  function setTournamentParticipantSelected(playerId, isSelected) {
    if (!playerId) return;
    const cur = new Set(SeasonState.seeding.selectedPlayerIds || []);
    if (isSelected) {
      cur.add(playerId);
    } else {
      cur.delete(playerId);
    }
    SeasonState.seeding.selectedPlayerIds = Array.from(cur);

    refreshSeedingProposal();
    renderTournamentSeeding();
  }

  function selectAllQualifiedParticipants() {
    const cands = getQualifiedTournamentCandidates(SeasonState.players, SeasonState.playerStats, SeasonState.elo, SeasonState.config);
    SeasonState.seeding.selectedPlayerIds = cands.qualified.map(c => c.playerId);
    refreshSeedingProposal();
    renderTournamentSeeding();
  }

  function clearAllSelectedParticipants() {
    SeasonState.seeding.selectedPlayerIds = [];
    SeasonState.seeding.proposedLevels = {};
    SeasonState.seeding.finalLevels = {};
    renderTournamentSeeding();
  }

  function setPlayerFinalLevel(playerId, level, reason = '') {
    if (!playerId) return;
    const lvlNum = parseInt(level, 10);
    if (isNaN(lvlNum) || lvlNum < 1 || lvlNum > 3) return;

    const prop = SeasonState.seeding.proposedLevels[playerId] || lvlNum;
    const isAdjusted = lvlNum !== prop;

    SeasonState.seeding.finalLevels[playerId] = {
      level: lvlNum,
      adjusted: isAdjusted,
      reason: reason || (isAdjusted ? 'Organizer manual override' : '')
    };

    renderTournamentSeeding();
  }

  function refreshSeedingProposal() {
    const candData = getQualifiedTournamentCandidates(SeasonState.players, SeasonState.playerStats, SeasonState.elo, SeasonState.config);
    const candMap = {};
    candData.all.forEach(c => { candMap[c.playerId] = c; });

    const selectedCands = (SeasonState.seeding.selectedPlayerIds || []).map(pId => candMap[pId]).filter(Boolean);
    const proposal = generateSeedingProposal(selectedCands, SeasonState.seeding.config);

    SeasonState.seeding.proposedLevels = proposal.proposedMap;

    if (!SeasonState.seeding.finalLevels) SeasonState.seeding.finalLevels = {};
    selectedCands.forEach(p => {
      if (!SeasonState.seeding.finalLevels[p.playerId]) {
        SeasonState.seeding.finalLevels[p.playerId] = {
          level: proposal.proposedMap[p.playerId] || 1,
          adjusted: false,
          reason: ''
        };
      }
    });
  }

  function openSeedingEvidenceModal(playerId) {
    SeasonState.seeding.evidencePlayerId = playerId;
    renderSeedingEvidenceModal(playerId);
    const modal = document.getElementById('seasonSeedingEvidenceModal');
    if (modal) modal.classList.add('active');
  }

  function closeSeedingEvidenceModal() {
    const modal = document.getElementById('seasonSeedingEvidenceModal');
    if (modal) modal.classList.remove('active');
  }

  function renderSeedingEvidenceModal(playerId) {
    const body = document.getElementById('seasonSeedingEvidenceBody');
    if (!body) return;
    const ev = getTournamentSeedingEvidence(playerId);
    if (!ev) {
      body.innerHTML = `<p style="color:var(--text-muted);">No player evidence found.</p>`;
      return;
    }

    body.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
        <div>
          <h4 style="margin:0; font-size:1.25rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
            ${ev.name}
          </h4>
          <span style="font-size:0.75rem; color:var(--text-muted);">ID: ${ev.playerId}</span>
        </div>
        <div style="text-align:right;">
          <span class="season-tier-pill level-${ev.finalLevel}" style="font-size:0.85rem; padding:4px 12px; font-weight:800; border-radius:12px;">
            Level ${ev.finalLevel} ${ev.finalLevel === 3 ? 'Advanced' : (ev.finalLevel === 2 ? 'Intermediate' : 'Developing')}
          </span>
          ${ev.adjusted ? `<div style="font-size:0.7rem; color:#f59e0b; font-weight:700; margin-top:2px;">(Manual: Prop L${ev.proposedLevel} &rarr; Final L${ev.finalLevel})</div>` : ''}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
        <div style="background:var(--bg-card-hover,#f8fafc); border:1px solid var(--border-subtle,#e2e8f0); border-radius:10px; padding:10px;">
          <div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">👥 Doubles Elo &amp; Record</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--primary,#2563eb); font-family:'Outfit',sans-serif;">${formatElo(ev.doublesElo)}</div>
          <div style="font-size:0.78rem; color:var(--text-secondary); font-weight:600;">${ev.doublesWins}W – ${ev.doublesLosses}L (${formatWinPct(ev.doublesWinPct)}%) &bull; ${formatPointDiff(ev.doublesPointDiff)}</div>
        </div>

        <div style="background:var(--bg-card-hover,#f8fafc); border:1px solid var(--border-subtle,#e2e8f0); border-radius:10px; padding:10px;">
          <div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">👤 Singles Elo &amp; Record</div>
          <div style="font-size:1.3rem; font-weight:800; color:#7c3aed; font-family:'Outfit',sans-serif;">${formatElo(ev.singlesElo)}</div>
          <div style="font-size:0.78rem; color:var(--text-secondary); font-weight:600;">${ev.singlesWins}W – ${ev.singlesLosses}L (${formatWinPct(ev.singlesWinPct)}%) &bull; ${formatPointDiff(ev.singlesPointDiff)}</div>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">🤝 Partner &amp; Opponent Diversity</div>
        <div style="display:flex; gap:10px; font-size:0.82rem;">
          <span style="background:var(--bg-card-hover,#f8fafc); border:1px solid var(--border-subtle,#e2e8f0); padding:4px 10px; border-radius:6px;"><strong>${ev.uniquePartners}</strong> Unique Partners</span>
          <span style="background:var(--bg-card-hover,#f8fafc); border:1px solid var(--border-subtle,#e2e8f0); padding:4px 10px; border-radius:6px;"><strong>${ev.uniqueOpponents}</strong> Unique Opponents</span>
        </div>
      </div>

      ${ev.adjustmentReason ? `
        <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:8px 12px; margin-bottom:14px; font-size:0.8rem; color:#b45309;">
          <strong>Adjustment Rationale:</strong> ${ev.adjustmentReason}
        </div>
      ` : ''}

      <div style="text-align:right;">
        <button type="button" class="btn-secondary" onclick="SeasonApp.closeSeedingEvidenceModal()">Close</button>
      </div>
    `;
  }

  function openFinalizeSeedingModal() {
    const val = validateTournamentTierDistribution();
    const summaryEl = document.getElementById('seasonFinalizeSeedingSummary');
    const warnEl = document.getElementById('seasonFinalizeSeedingWarn');
    if (warnEl) warnEl.textContent = '';

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Total Selected Players:</span>
          <strong>${val.totalSelected}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#ca8a04;">
          <span>Level 3 (Advanced):</span>
          <strong>${val.l3Assigned} / ${val.l3Target}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#2563eb;">
          <span>Level 2 (Intermediate):</span>
          <strong>${val.l2Assigned} / ${val.l2Target}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#059669;">
          <span>Level 1 (Developing):</span>
          <strong>${val.l1Assigned} / ${val.l1Target}</strong>
        </div>
      `;
    }

    if (SeasonState.config.status !== 'FROZEN') {
      if (warnEl) {
        warnEl.innerHTML = `⚠️ Season is currently ACTIVE. You must freeze the Season in Admin before confirming final seeding.`;
      }
    } else if (!val.valid) {
      if (warnEl) {
        warnEl.innerHTML = `⚠️ ${val.errors.join(' ')}`;
      }
    }

    const modal = document.getElementById('seasonFinalizeSeedingModal');
    if (modal) modal.classList.add('active');
  }

  function closeFinalizeSeedingModal() {
    const modal = document.getElementById('seasonFinalizeSeedingModal');
    if (modal) modal.classList.remove('active');
  }

  async function executeFinalizeTournamentSeeding() {
    const warnEl = document.getElementById('seasonFinalizeSeedingWarn');
    const btn = document.getElementById('seasonConfirmFinalizeSeedingBtn');
    if (warnEl) warnEl.textContent = '';

    if (SeasonState.config.status !== 'FROZEN') {
      if (warnEl) warnEl.textContent = 'Season must be FROZEN first.';
      return;
    }

    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Saving Snapshot...'; }
      await finalizeTournamentSeeding(SeasonState.config.seasonId, SeasonState.seeding);
      closeFinalizeSeedingModal();
      renderTournamentSeeding();
    } catch (err) {
      if (warnEl) warnEl.textContent = err.message || 'Failed to finalize seeding snapshot.';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Finalize Seeding Snapshot'; }
    }
  }

  function openExportTournamentModal() {
    renderExportTournamentModal();
    const modal = document.getElementById('seasonExportTournamentModal');
    if (modal) modal.classList.add('active');
  }

  function closeExportTournamentModal() {
    const modal = document.getElementById('seasonExportTournamentModal');
    if (modal) modal.classList.remove('active');
  }

  function renderExportTournamentModal() {
    const body = document.getElementById('seasonExportTournamentBody');
    if (!body) return;

    const csvText = exportSeedingCsv();
    const jsonText = exportSeedingJson();
    const waText = exportSeedingWhatsApp();

    body.innerHTML = `
      <div class="season-export-tabs" role="tablist">
        <button type="button" class="season-export-tab-btn active" onclick="SeasonApp.switchExportTab('csv', this)">📊 CSV Spreadsheet</button>
        <button type="button" class="season-export-tab-btn" onclick="SeasonApp.switchExportTab('whatsapp', this)">💬 WhatsApp Message</button>
        <button type="button" class="season-export-tab-btn" onclick="SeasonApp.switchExportTab('json', this)">💻 JSON Schema</button>
      </div>

      <div id="seasonExportPane-csv" class="season-export-pane">
        <textarea id="seasonExportText-csv" class="season-export-textarea" readonly>${csvText}</textarea>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
          <span style="font-size:0.75rem; color:var(--text-muted);">Ready to import into Excel, Google Sheets, or Numbers.</span>
          <button type="button" class="btn-primary" onclick="SeasonApp.copyExportContent('seasonExportText-csv', this)">📋 Copy CSV</button>
        </div>
      </div>

      <div id="seasonExportPane-whatsapp" class="season-export-pane hidden" style="display:none;">
        <textarea id="seasonExportText-whatsapp" class="season-export-textarea" readonly>${waText}</textarea>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
          <span style="font-size:0.75rem; color:var(--text-muted);">Pre-formatted markdown for WhatsApp group announcement.</span>
          <button type="button" class="btn-primary" onclick="SeasonApp.copyExportContent('seasonExportText-whatsapp', this)">📋 Copy WhatsApp Text</button>
        </div>
      </div>

      <div id="seasonExportPane-json" class="season-export-pane hidden" style="display:none;">
        <textarea id="seasonExportText-json" class="season-export-textarea" readonly>${jsonText}</textarea>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
          <span style="font-size:0.75rem; color:var(--text-muted);">Structured payload for automated bracket generators and tournament engines.</span>
          <button type="button" class="btn-primary" onclick="SeasonApp.copyExportContent('seasonExportText-json', this)">📋 Copy JSON</button>
        </div>
      </div>
    `;
  }

  function switchExportTab(tabName, btnEl) {
    document.querySelectorAll('.season-export-tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    ['csv', 'whatsapp', 'json'].forEach(t => {
      const pane = document.getElementById(`seasonExportPane-${t}`);
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
  }

  function copyExportContent(elementId, btnEl) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.select();
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(el.value);
      } else {
        document.execCommand('copy');
      }
      if (btnEl) {
        const orig = btnEl.textContent;
        btnEl.textContent = '✓ Copied!';
        setTimeout(() => { btnEl.textContent = orig; }, 2000);
      }
    } catch (e) {
      console.warn('Copy failed', e);
    }
  }

  function openSnapshotDetailModal(snapshotId) {
    const snapshots = SeasonState.seeding.snapshots || {};
    const snap = snapshots[snapshotId];
    if (!snap) return;

    const body = document.getElementById('seasonSnapshotDetailBody');
    if (body) {
      const players = Object.values(snap.players || {}).sort((a, b) => {
        if (a.finalLevel !== b.finalLevel) return b.finalLevel - a.finalLevel;
        return b.doublesElo - a.doublesElo;
      });

      body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <h4 style="margin:0; font-size:1.15rem; font-weight:800; font-family:'Outfit',sans-serif;">Snapshot: ${snap.snapshotId}</h4>
            <span style="font-size:0.75rem; color:var(--text-muted);">Generated: ${typeof snap.createdAt === 'number' ? new Date(snap.createdAt).toLocaleString() : '—'} &bull; By: ${snap.createdByUid}</span>
          </div>
          <div>
            <span class="season-admin-status-badge active" style="font-size:0.75rem;">IMMUTABLE SNAPSHOT</span>
          </div>
        </div>

        <div style="max-height:380px; overflow-y:auto; margin-bottom:14px; border:1px solid var(--border-subtle,#e2e8f0); border-radius:10px;">
          <table class="season-mini-table">
            <thead>
              <tr>
                <th style="width:36px; text-align:center;">#</th>
                <th>Player</th>
                <th style="text-align:right;">Doubles Elo</th>
                <th style="text-align:center;">GP</th>
                <th style="text-align:center;">Tier</th>
                <th>Adjustment</th>
              </tr>
            </thead>
            <tbody>
              ${players.map((p, i) => `
                <tr>
                  <td style="text-align:center; font-weight:700; color:var(--text-muted);">${i + 1}</td>
                  <td style="font-weight:700;">${p.name}</td>
                  <td style="text-align:right; font-family:'Outfit',sans-serif; font-weight:800; color:var(--primary);">${formatElo(p.doublesElo)}</td>
                  <td style="text-align:center;">${p.doublesGp}</td>
                  <td style="text-align:center;">
                    <span class="season-tier-pill level-${p.finalLevel}">Level ${p.finalLevel}</span>
                  </td>
                  <td style="font-size:0.75rem; color:${p.adjusted ? '#f59e0b' : 'var(--text-muted)'};">
                    ${p.adjusted ? `Prop L${p.proposedLevel} &rarr; Final L${p.finalLevel} (${p.reason || 'Manual'})` : 'Auto'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn-secondary" onclick="SeasonApp.closeSnapshotDetailModal()">Close</button>
          <button type="button" class="btn-primary" onclick="SeasonApp.openExportTournamentModal()">📤 Export This Snapshot</button>
        </div>
      `;
    }

    const modal = document.getElementById('seasonSnapshotDetailModal');
    if (modal) modal.classList.add('active');
  }

  function closeSnapshotDetailModal() {
    const modal = document.getElementById('seasonSnapshotDetailModal');
    if (modal) modal.classList.remove('active');
  }

  /**
   * Renders the complete Tournament Seeding UI inside #seasonSeedingContainer.
   */
  function renderTournamentSeeding() {
    const container = document.getElementById('seasonSeedingContainer');
    if (!container) return;

    const isFrozen = SeasonState.config && SeasonState.config.status === 'FROZEN';
    const candidateData = getQualifiedTournamentCandidates(SeasonState.players, SeasonState.playerStats, SeasonState.elo, SeasonState.config);

    // Auto-select qualified players if nothing is selected yet
    if (!SeasonState.seeding.selectedPlayerIds || SeasonState.seeding.selectedPlayerIds.length === 0) {
      SeasonState.seeding.selectedPlayerIds = candidateData.qualified.map(c => c.playerId);
      refreshSeedingProposal();
    }

    const selectedSet = new Set(SeasonState.seeding.selectedPlayerIds || []);
    const candidateMap = {};
    candidateData.all.forEach(c => { candidateMap[c.playerId] = c; });

    const selectedCands = (SeasonState.seeding.selectedPlayerIds || []).map(pId => candidateMap[pId]).filter(Boolean);
    const proposal = generateSeedingProposal(selectedCands, SeasonState.seeding.config);
    const valResult = validateTournamentTierDistribution(SeasonState.seeding.finalLevels, SeasonState.seeding.selectedPlayerIds, SeasonState.seeding.config);

    const snapshotsList = Object.values(SeasonState.seeding.snapshots || {}).sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return timeB - timeA;
    });

    // Group selected players by final level
    const level3Players = [];
    const level2Players = [];
    const level1Players = [];

    proposal.proposedList.forEach(p => {
      const pId = p.playerId;
      const finalEntry = SeasonState.seeding.finalLevels ? SeasonState.seeding.finalLevels[pId] : null;
      const finalLvl = (finalEntry && typeof finalEntry.level === 'number') ? finalEntry.level : (typeof finalEntry === 'number' ? finalEntry : p.proposedLevel);
      const isAdjusted = finalEntry ? (finalEntry.adjusted === true || finalLvl !== p.proposedLevel) : false;
      const reason = finalEntry ? (finalEntry.reason || '') : '';

      const playerRow = {
        ...p,
        finalLevel: finalLvl,
        adjusted: isAdjusted,
        adjustmentReason: reason
      };

      if (finalLvl === 3) level3Players.push(playerRow);
      else if (finalLvl === 2) level2Players.push(playerRow);
      else level1Players.push(playerRow);
    });

    container.innerHTML = `
      <div class="season-seeding-wrap">

        <!-- Season Status Banner -->
        ${!isFrozen ? `
          <div class="season-seeding-banner-preview">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.3rem;">⚠️</span>
              <div>
                <strong>PREVIEW — SEASON NOT FROZEN</strong>
                <p style="margin:2px 0 0; font-size:0.78rem; font-weight:500;">
                  The season is currently ACTIVE. Seeding tiers below are an in-memory preview. Freeze the season in Season Admin to enable permanent finalization.
                </p>
              </div>
            </div>
            <button type="button" class="btn-secondary" style="font-size:0.8rem; padding:6px 12px;" onclick="SeasonApp.switchTab('admin')">Go to Season Admin &rarr;</button>
          </div>
        ` : `
          <div class="season-seeding-banner-frozen">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.3rem;">🔒</span>
              <div>
                <strong>SEASON FROZEN &bull; READY FOR TOURNAMENT FINALIZATION</strong>
                <p style="margin:2px 0 0; font-size:0.78rem; font-weight:500;">
                  The match ledger is sealed. You can adjust skill tiers below and confirm the permanent final snapshot.
                </p>
              </div>
            </div>
          </div>
        `}

        <!-- Seeding Header Card -->
        <div class="season-seeding-header">
          <div>
            <h2 style="margin:0; font-size:1.4rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
              🏸 Tournament Seeding &amp; Skill Tiers
            </h2>
            <p style="margin:4px 0 0; font-size:0.82rem; color:var(--text-muted);">
              Evidence-based Level 1 / 2 / 3 tier allocation informed by 12-week Doubles Elo ratings and match volume.
            </p>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="btn-secondary" onclick="SeasonApp.openExportTournamentModal()">
              📤 Export Seeding
            </button>
            <button type="button" class="btn-primary" style="${!isFrozen ? 'opacity:0.6;' : ''}" onclick="SeasonApp.openFinalizeSeedingModal()">
              ✅ Finalize Seeding Snapshot
            </button>
          </div>
        </div>

        <!-- Tier Configuration & Participant Counts -->
        <div class="season-seeding-config-card">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:10px;">
            <div>
              <h3 style="margin:0; font-size:1.05rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
                ⚙️ Tournament Roster &amp; Tier Distribution
              </h3>
              <p style="margin:2px 0 0; font-size:0.78rem; color:var(--text-muted);">
                ${SeasonState.seeding.selectedPlayerIds.length} players selected (${candidateData.qualified.length} Qualified &bull; ${candidateData.provisional.length} Provisional)
              </p>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="SeasonApp.selectAllQualifiedParticipants()">Select All Qualified (${candidateData.qualified.length})</button>
              <button type="button" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="SeasonApp.clearAllSelectedParticipants()">Clear Selection</button>
            </div>
          </div>

          <div class="season-tier-inputs-row">
            <div class="season-tier-input-group">
              <span style="color:#ca8a04;">⭐ Level 3 (Advanced):</span>
              <input type="number" min="0" max="64" value="${SeasonState.seeding.config.level3Count}" onchange="SeasonState.seeding.config.level3Count = parseInt(this.value,10)||0; SeasonApp.refreshSeedingProposal(); SeasonApp.renderTournamentSeeding();">
              <span style="font-size:0.75rem; color:var(--text-muted);">Assigned: ${valResult.l3Assigned}</span>
            </div>

            <div class="season-tier-input-group">
              <span style="color:#2563eb;">🔷 Level 2 (Intermediate):</span>
              <input type="number" min="0" max="64" value="${SeasonState.seeding.config.level2Count}" onchange="SeasonState.seeding.config.level2Count = parseInt(this.value,10)||0; SeasonApp.refreshSeedingProposal(); SeasonApp.renderTournamentSeeding();">
              <span style="font-size:0.75rem; color:var(--text-muted);">Assigned: ${valResult.l2Assigned}</span>
            </div>

            <div class="season-tier-input-group">
              <span style="color:#059669;">🟢 Level 1 (Developing):</span>
              <input type="number" min="0" max="64" value="${SeasonState.seeding.config.level1Count}" onchange="SeasonState.seeding.config.level1Count = parseInt(this.value,10)||0; SeasonApp.refreshSeedingProposal(); SeasonApp.renderTournamentSeeding();">
              <span style="font-size:0.75rem; color:var(--text-muted);">Assigned: ${valResult.l1Assigned}</span>
            </div>
          </div>

          ${valResult.errors.length > 0 ? `
            <div style="margin-top:12px; font-size:0.8rem; color:var(--loss-color,#dc2626); font-weight:700;">
              ⚠️ ${valResult.errors.join(' &bull; ')}
            </div>
          ` : `
            <div style="margin-top:12px; font-size:0.8rem; color:var(--win-color,#059669); font-weight:700;">
              ✓ Target tier distribution balanced (${valResult.totalSelected} / ${valResult.totalTarget} players).
            </div>
          `}
        </div>

        <!-- Boundary Review Card -->
        ${proposal.boundaries.length > 0 ? `
          <div class="season-boundary-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.82rem; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
                ⚖️ Tier Boundary Gap Analysis
              </span>
              <span style="font-size:0.75rem; color:var(--text-muted);">Review close ratings around tier cutoffs</span>
            </div>
            <div class="season-boundary-items">
              ${proposal.boundaries.map(b => `
                <div class="season-boundary-item">
                  <span>${b.boundaryName}:</span>
                  <span style="color:var(--text-primary);">#${b.rankAbove} ${b.playerAbove.name} (${formatElo(b.playerAbove.doublesElo)})</span>
                  <span style="color:var(--text-muted);">&harr;</span>
                  <span style="color:var(--text-primary);">#${b.rankBelow} ${b.playerBelow.name} (${formatElo(b.playerBelow.doublesElo)})</span>
                  <span class="season-tag-pill" style="font-size:0.7rem; background:rgba(99,102,241,0.15); color:#6366f1;">${b.eloGap} Elo Gap</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 3 Tiers Layout -->
        <div class="season-tiers-layout">

          <!-- LEVEL 3 -->
          <div class="season-tier-card">
            <div class="season-tier-header tier-3">
              <div>
                <div style="font-size:1.1rem;">⭐ Level 3 — Advanced</div>
                <div style="font-size:0.72rem; opacity:0.85; font-weight:600;">Top Doubles Seeds &bull; Target: ${SeasonState.seeding.config.level3Count}</div>
              </div>
              <span class="season-count-chip" style="background:#ca8a04; color:#ffffff;">${level3Players.length}</span>
            </div>
            <div class="season-tier-player-list">
              ${level3Players.length > 0 ? level3Players.map(p => renderTierPlayerRow(p)).join('') : `
                <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.85rem;">No players in Level 3</div>
              `}
            </div>
          </div>

          <!-- LEVEL 2 -->
          <div class="season-tier-card">
            <div class="season-tier-header tier-2">
              <div>
                <div style="font-size:1.1rem;">🔷 Level 2 — Intermediate</div>
                <div style="font-size:0.72rem; opacity:0.85; font-weight:600;">Core Competitive Tier &bull; Target: ${SeasonState.seeding.config.level2Count}</div>
              </div>
              <span class="season-count-chip" style="background:#2563eb; color:#ffffff;">${level2Players.length}</span>
            </div>
            <div class="season-tier-player-list">
              ${level2Players.length > 0 ? level2Players.map(p => renderTierPlayerRow(p)).join('') : `
                <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.85rem;">No players in Level 2</div>
              `}
            </div>
          </div>

          <!-- LEVEL 1 -->
          <div class="season-tier-card">
            <div class="season-tier-header tier-1">
              <div>
                <div style="font-size:1.1rem;">🟢 Level 1 — Developing</div>
                <div style="font-size:0.72rem; opacity:0.85; font-weight:600;">Rising / Developing Tier &bull; Target: ${SeasonState.seeding.config.level1Count}</div>
              </div>
              <span class="season-count-chip" style="background:#059669; color:#ffffff;">${level1Players.length}</span>
            </div>
            <div class="season-tier-player-list">
              ${level1Players.length > 0 ? level1Players.map(p => renderTierPlayerRow(p)).join('') : `
                <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.85rem;">No players in Level 1</div>
              `}
            </div>
          </div>

        </div>

        <!-- Provisional & Unselected Players Section -->
        <div class="season-seeding-config-card">
          <h3 style="margin:0 0 10px 0; font-size:1.05rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
            📋 Roster Availability &amp; Provisional Candidates (${candidateData.all.length} Total Registered)
          </h3>
          <p style="margin:0 0 14px 0; font-size:0.78rem; color:var(--text-muted);">
            Check players to include in the tournament roster. Players with under 15 Doubles GP are flagged Provisional.
          </p>

          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:10px;">
            ${candidateData.all.map(p => {
              const isSel = selectedSet.has(p.playerId);
              return `
                <label style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--bg-card-hover,#f8fafc); border:1px solid var(--border-subtle,#e2e8f0); border-radius:8px; cursor:pointer; font-size:0.85rem;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" ${isSel ? 'checked' : ''} onchange="SeasonApp.setTournamentParticipantSelected('${p.playerId}', this.checked)">
                    <span style="font-weight:700; color:var(--text-primary);">${p.name}</span>
                  </div>
                  <div style="text-align:right;">
                    <span style="font-size:0.75rem; font-weight:800; color:var(--primary);">${formatElo(p.doublesElo)}</span>
                    <span style="font-size:0.7rem; color:${p.qualified ? 'var(--text-muted)' : '#f59e0b'}; display:block;">
                      ${p.qualified ? `${p.doublesGp} GP` : `Prov (${p.doublesGp}/15)`}
                    </span>
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Confirmed Snapshots History Table -->
        ${snapshotsList.length > 0 ? `
          <div class="season-seeding-config-card">
            <h3 style="margin:0 0 10px 0; font-size:1.05rem; font-weight:800; font-family:'Outfit',sans-serif; color:var(--text-primary);">
              📜 Finalized Seeding Snapshots (${snapshotsList.length})
            </h3>
            <div style="overflow-x:auto;">
              <table class="season-snapshots-table">
                <thead>
                  <tr>
                    <th>Snapshot ID</th>
                    <th>Created</th>
                    <th>Created By</th>
                    <th>Roster Size</th>
                    <th>Distribution (L3 / L2 / L1)</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${snapshotsList.map(s => {
                    const sum = s.summary || { totalPlayers: 0, level3Count: 0, level2Count: 0, level1Count: 0 };
                    return `
                      <tr>
                        <td style="font-weight:700; font-family:'Consolas',monospace;">${s.snapshotId}</td>
                        <td style="color:var(--text-muted); font-size:0.8rem;">${typeof s.createdAt === 'number' ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                        <td style="font-size:0.8rem;">${s.createdByUid || 'Admin'}</td>
                        <td style="font-weight:700;">${sum.totalPlayers} Players</td>
                        <td style="font-weight:600;">${sum.level3Count} / ${sum.level2Count} / ${sum.level1Count}</td>
                        <td style="text-align:right;">
                          <button type="button" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="SeasonApp.openSnapshotDetailModal('${s.snapshotId}')">View Details &rarr;</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  function renderTierPlayerRow(p) {
    return `
      <div class="season-tier-player-row ${p.adjusted ? 'adjusted-row' : ''}">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:800; color:var(--text-muted); font-size:0.8rem; width:22px;">#${p.rank}</span>
          <div>
            <div style="font-weight:700; color:var(--text-primary); font-size:0.88rem;">${p.name}</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">
              ${formatElo(p.doublesElo)} Elo &bull; ${p.doublesGp} GP &bull; ${formatWinPct(p.doublesWinPct)}%
              ${p.adjusted ? `<span style="color:#f59e0b; font-weight:700; margin-left:4px;">(Manual override)</span>` : ''}
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn-secondary" style="font-size:0.7rem; padding:3px 8px;" onclick="SeasonApp.openSeedingEvidenceModal('${p.playerId}')">📊 Evidence</button>
          <select class="season-level-select" onchange="SeasonApp.setPlayerFinalLevel('${p.playerId}', this.value)">
            <option value="3" ${p.finalLevel === 3 ? 'selected' : ''}>Level 3</option>
            <option value="2" ${p.finalLevel === 2 ? 'selected' : ''}>Level 2</option>
            <option value="1" ${p.finalLevel === 1 ? 'selected' : ''}>Level 1</option>
          </select>
        </div>
      </div>
    `;
  }

  // 23. Initialization
  function initSeasonApp() {
    if (SeasonState.initialized) return;
    SeasonState.initialized = true;

    subscribeToSeasonConfig();
    subscribeToPlayers();
    subscribeToMatches();
    subscribeToAudit();
    subscribeToSeedingSnapshots();
    recalculatePlayerStats();
    recalculateElo();
    recalculateAnalytics();
    recalculateWeeklyAnalytics();
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
        if (SeasonState.activeTab === 'weekly') {
          renderWeeklyInsights();
        }
        if (SeasonState.activeTab === 'admin') {
          renderSeasonAdmin();
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
    formatForm,

    // Phase 6 Deterministic Elo Engine API
    getStartingElo,
    getKFactor,
    calculateExpectedScore,
    calculateEloDelta,
    createInitialEloState,
    isValidEloMatch,
    calculateEloRatings,
    recalculateElo,
    getPlayerElo,
    getEloLeaderboard,
    formatElo,
    formatEloDelta,
    setLeaderboardView,

    // Phase 7 Player Profiles, Partner Synergy & Head-to-Head API
    calculatePartnerSynergy,
    calculateHeadToHead,
    recalculateAnalytics,
    getEloSummary,
    getPartnerStats,
    getHeadToHeadStats,
    getPlayerRecentMatches,
    getMatchPerspective,
    renderEloSvgChart,
    openPlayerProfile,
    closePlayerProfile,
    setPlayerProfileMode,
    renderPlayerProfile,

    // Phase 8 Season Administration, Corrections & Freeze API
    subscribeToSeasonConfig,
    subscribeToAudit,
    isSeasonWritable,
    openEditMatch,
    closeEditMatchModal,
    renderEditMatchModalContent,
    validateMatchCorrection,
    saveMatchCorrection,
    openFreezeModal,
    closeFreezeModal,
    executeFreezeSeason,
    freezeSeason: executeFreezeSeason,
    openReopenModal,
    closeReopenModal,
    executeReopenSeason,
    reopenSeason: executeReopenSeason,
    recalculateEntireSeason,
    handleAdminRecalculateClick,
    renderSeasonAdmin,
    renderAuditHistory: renderSeasonAdmin,
    setAuditFilter,
    renderAuditItemHtml,

    // Phase 9 Weekly Analytics & Seasonal Insights API
    generateSeasonWeeks,
    getSeasonWeekForDate,
    getCurrentSeasonWeekNumber,
    calculateWeeklyAnalytics,
    recalculateWeeklyAnalytics,
    getWeeklyPlayerStats,
    setSelectedWeek,
    setWeeklyMode,
    renderWeeklyTrendSvg,
    renderWeeklyInsights,

    // Phase 10 Tournament Seeding & Export API
    getSeasonSeedingSnapshotsPath,
    getSeasonFinalSnapshotPath,
    getQualifiedTournamentCandidates,
    generateSeedingProposal,
    validateTournamentTierDistribution,
    getTournamentSeedingEvidence,
    subscribeToSeedingSnapshots,
    finalizeTournamentSeeding,
    exportSeedingCsv,
    exportSeedingJson,
    exportSeedingWhatsApp,
    copySeedingForWhatsApp: exportSeedingWhatsApp,
    setTournamentParticipantSelected,
    selectAllQualifiedParticipants,
    clearAllSelectedParticipants,
    setPlayerFinalLevel,
    refreshSeedingProposal,
    openSeedingEvidenceModal,
    closeSeedingEvidenceModal,
    openFinalizeSeedingModal,
    closeFinalizeSeedingModal,
    executeFinalizeTournamentSeeding,
    openExportTournamentModal,
    closeExportTournamentModal,
    openSnapshotDetailModal,
    closeSnapshotDetailModal,
    renderTournamentSeeding,
    renderSeedingSnapshot: openSnapshotDetailModal,
    switchExportTab,
    copyExportContent
  };

  // Global helper aliases for HTML onclick handlers
  window.setPortalMode = setPortalMode;
  window.switchSeasonTab = switchSeasonTab;

})();

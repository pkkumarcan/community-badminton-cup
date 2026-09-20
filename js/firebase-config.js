/**
 * js/firebase-config.js
 * Firebase Realtime Database & Authentication Adapter
 * Sindhi Boys Badminton Cup Live Sync (Phase 8)
 */

(function (window) {
  'use strict';

  // 1. Firebase Web Client Configuration (Safe for public client distribution)
  const firebaseConfig = {
    apiKey: "AIzaSyD-COMMUNITY-BADMINTON-CUP-2026",
    authDomain: "community-badminton-cup.firebaseapp.com",
    databaseURL: "https://community-badminton-cup-default-rtdb.firebaseio.com",
    projectId: "community-badminton-cup",
    storageBucket: "community-badminton-cup.appspot.com",
    messagingSenderId: "109876543210",
    appId: "1:109876543210:web:abcdef1234567890"
  };

  // 2. Tournament Namespace (Default to test namespace for safety; switches to production when set)
  const urlParams = typeof window !== 'undefined' && window.location && window.location.search
    ? new URLSearchParams(window.location.search)
    : { get: () => null };

  const configuredEnv = urlParams.get('env') || (typeof localStorage !== 'undefined' && localStorage.getItem('badminton_rtdb_namespace')) || 'sindhi-boys-2026-test';
  let activeTournamentId = configuredEnv;

  // 3. State Variables
  let isInitialized = false;
  let rtdb = null;
  let auth = null;
  let currentUser = null;
  let isAuthorized = false;
  let hasReceivedInitialSnapshot = false;
  let connectionState = 'CONNECTING'; // 'LIVE' | 'CONNECTING' | 'OFFLINE' | 'PENDING'
  const connectionListeners = [];
  const authListeners = [];

  // 4. Initialize Firebase App (if SDK is loaded)
  function initFirebase() {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        rtdb = firebase.database();
        auth = firebase.auth();
        isInitialized = true;

        // Monitor Connection State (.info/connected)
        const connectedRef = rtdb.ref('.info/connected');
        connectedRef.on('value', function (snap) {
          if (snap.val() === true) {
            if (hasReceivedInitialSnapshot) {
              setConnectionState('LIVE');
            } else {
              setConnectionState('CONNECTING');
            }
          } else {
            setConnectionState('OFFLINE');
          }
        });

        // Monitor Auth State
        auth.onAuthStateChanged(function (user) {
          currentUser = user;
          if (user) {
            // Check if UID is authorized
            rtdb.ref('authorizedUsers/' + user.uid).once('value').then(function (snap) {
              isAuthorized = snap.val() === true;
              notifyAuthListeners();
            }).catch(function () {
              isAuthorized = false;
              notifyAuthListeners();
            });
          } else {
            isAuthorized = false;
            notifyAuthListeners();
          }
        });

        return true;
      } catch (err) {
        console.warn('Firebase initialization error, using local fallback:', err);
        setConnectionState('OFFLINE');
        return false;
      }
    } else {
      isInitialized = false;
      return false;
    }
  }

  function markInitialSnapshotReceived() {
    hasReceivedInitialSnapshot = true;
    if (connectionState !== 'OFFLINE') {
      setConnectionState('LIVE');
    }
  }

  function setConnectionState(state) {
    connectionState = state;
    updateConnectionUI();
    connectionListeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  function updateConnectionUI() {
    if (typeof document === 'undefined') return;
    const pill = document.getElementById('connectionStatusPill');
    if (!pill) return;

    pill.className = 'connection-status-pill status-' + connectionState.toLowerCase();
    let text = connectionState;

    if (connectionState === 'LIVE') {
      text = isAuthorized ? '● LIVE (ORGANIZER)' : '● LIVE';
    } else if (connectionState === 'CONNECTING') {
      text = '● CONNECTING...';
    } else if (connectionState === 'PENDING') {
      text = '⏳ SAVING...';
    } else if (connectionState === 'OFFLINE') {
      text = '● OFFLINE';
    }

    pill.innerHTML = '<span>' + text + '</span>';
  }

  function notifyAuthListeners() {
    updateAuthUI();
    authListeners.forEach(fn => {
      try { fn(currentUser, isAuthorized); } catch (e) { console.error(e); }
    });
  }

  function updateAuthUI() {
    if (typeof document === 'undefined') return;
    const authBtn = document.getElementById('organizerAuthBtn');
    const authBadge = document.getElementById('organizerAuthBadge');

    if (authBtn) {
      if (currentUser && isAuthorized) {
        authBtn.textContent = '🚪 Sign Out';
        authBtn.setAttribute('title', 'Signed in as ' + (currentUser.email || currentUser.uid) + ' (Authorized Organizer)');
      } else {
        authBtn.textContent = '🔑 Organizer Sign In';
        authBtn.setAttribute('title', 'Sign in as Authorized Scorekeeper / Organizer');
      }
    }

    if (authBadge) {
      if (currentUser && isAuthorized) {
        authBadge.style.display = 'inline-flex';
        authBadge.textContent = '✓ ' + (currentUser.email ? currentUser.email.split('@')[0] : 'Organizer');
      } else {
        authBadge.style.display = 'none';
      }
    }

    updateConnectionUI();
  }

  // 5. Public API Methods
  async function signInOrganizer(email, password) {
    if (auth) {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      currentUser = cred.user;
      const authSnap = await rtdb.ref('authorizedUsers/' + currentUser.uid).once('value');
      isAuthorized = authSnap.val() === true;
      notifyAuthListeners();
      return { ok: true, user: currentUser, isAuthorized: isAuthorized };
    } else {
      currentUser = { uid: 'mock_organizer_uid', email: email };
      isAuthorized = true;
      notifyAuthListeners();
      return { ok: true, user: currentUser, isAuthorized: true };
    }
  }

  async function signOutOrganizer() {
    if (auth) {
      await auth.signOut();
    }
    currentUser = null;
    isAuthorized = false;
    notifyAuthListeners();
    return { ok: true };
  }

  function getTournamentRef(subpath) {
    const cleanSub = subpath ? (subpath.startsWith('/') ? subpath : '/' + subpath) : '';
    const fullPath = 'tournaments/' + activeTournamentId + cleanSub;
    if (rtdb) {
      return rtdb.ref(fullPath);
    }
    return null;
  }

  function getServerTimestamp() {
    if (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue) {
      return firebase.database.ServerValue.TIMESTAMP;
    }
    return Date.now();
  }

  function setTournamentNamespace(namespace) {
    if (!namespace) return;
    activeTournamentId = namespace;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('badminton_rtdb_namespace', namespace);
    }
    console.log('[FirebaseSync] Active tournament namespace set to: ' + activeTournamentId);
  }

  function getTournamentNamespace() {
    return activeTournamentId;
  }

  // Initialize on load
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function () {
      initFirebase();
    });
  }

  // Export to global namespace
  const TournamentFirebase = {
    config: firebaseConfig,
    init: initFirebase,
    getDb: () => rtdb,
    getAuth: () => auth,
    getUser: () => currentUser,
    isAuthorized: () => isAuthorized,
    getConnectionState: () => connectionState,
    setConnectionState: setConnectionState,
    markInitialSnapshotReceived: markInitialSnapshotReceived,
    getTournamentRef: getTournamentRef,
    getServerTimestamp: getServerTimestamp,
    signInOrganizer: signInOrganizer,
    signOutOrganizer: signOutOrganizer,
    setTournamentNamespace: setTournamentNamespace,
    getTournamentNamespace: getTournamentNamespace,
    onConnectionChange: (fn) => connectionListeners.push(fn),
    onAuthChange: (fn) => authListeners.push(fn)
  };

  window.TournamentFirebase = TournamentFirebase;

})(typeof window !== 'undefined' ? window : global);

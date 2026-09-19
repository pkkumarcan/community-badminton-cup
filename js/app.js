/**
 * Community Badminton Cup - Application Logic & State Engine
 * 24 Players · 4 Courts · 12 Rounds · 4-Block Mini-Pod Format
 */

(function () {
  'use strict';

  // ---------- TOURNAMENT ROSTER (24 Players Strict Alphabetical) ----------
const ROSTER = [
  {
    "id": 1,
    "name": "Ajeet"
  },
  {
    "id": 2,
    "name": "Amit"
  },
  {
    "id": 3,
    "name": "Deepak"
  },
  {
    "id": 4,
    "name": "Hira"
  },
  {
    "id": 5,
    "name": "Honey"
  },
  {
    "id": 6,
    "name": "Hrithik"
  },
  {
    "id": 7,
    "name": "Manoj"
  },
  {
    "id": 8,
    "name": "Naresh"
  },
  {
    "id": 9,
    "name": "Om"
  },
  {
    "id": 10,
    "name": "Pardeep"
  },
  {
    "id": 11,
    "name": "Partab"
  },
  {
    "id": 12,
    "name": "Raja"
  },
  {
    "id": 13,
    "name": "Rajesh M."
  },
  {
    "id": 14,
    "name": "Rajesh N."
  },
  {
    "id": 15,
    "name": "Rakesh"
  },
  {
    "id": 16,
    "name": "Ranjeet"
  },
  {
    "id": 17,
    "name": "Rohit"
  },
  {
    "id": 18,
    "name": "Sanjay"
  },
  {
    "id": 19,
    "name": "Sarwan"
  },
  {
    "id": 20,
    "name": "Shashi"
  },
  {
    "id": 21,
    "name": "Sunny"
  },
  {
    "id": 22,
    "name": "Vijay"
  },
  {
    "id": 23,
    "name": "Vinod"
  },
  {
    "id": 24,
    "name": "Wijai"
  }
];

  const PLAYERS = ROSTER.map(p => p.name).sort();

  // Mini-Pod Blocks Definition
  const BLOCKS = {
    1: { num: 1, label: "Block 1: Rounds 1–3 (12:00 PM – 12:30 PM)", desc: "Courts 1, 2, 5, 8 • 6-Player Pods • Zero Inter-Court Movement", icon: "🏸" },
    4: { num: 2, label: "Block 2: Rounds 4–6 (12:30 PM – 1:00 PM)", desc: "Courts 1, 2, 3, 8 • Reshuffle #1 Complete • 6-Player Pods Locked", icon: "🔄" },
    7: { num: 3, label: "Block 3: Rounds 7–9 (1:00 PM – 1:30 PM)", desc: "Courts 1, 2, 3, 8 • Halfway Mark & Reshuffle #2 Complete • 6-Player Pods Locked", icon: "⚡" },
    10: { num: 4, label: "Block 4: Rounds 10–12 (1:30 PM – 2:00 PM)", desc: "Courts 1, 2, 3, 8 • Final Reshuffle #3 Complete • Sprint to Finals", icon: "🔥" }
  };

  // Official 10-Minute Match Time Slots from Tournament Fixture Poster
  const ROUND_TIMES = {
    1: "12:00 PM",
    2: "12:10 PM",
    3: "12:20 PM",
    4: "12:30 PM",
    5: "12:40 PM",
    6: "12:50 PM",
    7: "1:00 PM",
    8: "1:10 PM",
    9: "1:20 PM",
    10: "1:30 PM",
    11: "1:40 PM",
    12: "1:50 PM"
  };

  // Court Venue & Label Info
  const COURT_INFO = {
    1: { name: "Court 1", sub: "" },
    2: { name: "Court 2", sub: "" },
    3: { name: "Court 3", sub: "Blocks 2–4 (12:30 PM onward)" },
    5: { name: "Court 5", sub: "Block 1 (12:00–12:30 PM)" },
    8: { name: "Court 8", sub: "" }
  };

  // Default Stage 1 Template (12 Rounds, 4 Courts, 48 Matches)
  const BASE_FIXTURES = [
  {
    "r": 1,
    "c": 1,
    "t1": [
      "Ajeet",
      "Deepak"
    ],
    "t2": [
      "Hrithik",
      "Hira"
    ],
    "refs": [
      "Honey",
      "Manoj"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 1,
    "c": 2,
    "t1": [
      "Partab",
      "Naresh"
    ],
    "t2": [
      "Rajesh N.",
      "Pardeep"
    ],
    "refs": [
      "Ranjeet",
      "Shashi"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 1,
    "c": 5,
    "t1": [
      "Amit",
      "Rajesh M."
    ],
    "t2": [
      "Om",
      "Rakesh"
    ],
    "refs": [
      "Sunny",
      "Vijay"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 1,
    "c": 8,
    "t1": [
      "Rohit",
      "Sanjay"
    ],
    "t2": [
      "Sarwan",
      "Vinod"
    ],
    "refs": [
      "Wijai",
      "Raja"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 2,
    "c": 1,
    "t1": [
      "Ajeet",
      "Honey"
    ],
    "t2": [
      "Hrithik",
      "Manoj"
    ],
    "refs": [
      "Deepak",
      "Hira"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 2,
    "c": 2,
    "t1": [
      "Partab",
      "Ranjeet"
    ],
    "t2": [
      "Rajesh N.",
      "Shashi"
    ],
    "refs": [
      "Naresh",
      "Pardeep"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 2,
    "c": 5,
    "t1": [
      "Amit",
      "Sunny"
    ],
    "t2": [
      "Om",
      "Vijay"
    ],
    "refs": [
      "Rajesh M.",
      "Rakesh"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 2,
    "c": 8,
    "t1": [
      "Rohit",
      "Wijai"
    ],
    "t2": [
      "Sarwan",
      "Raja"
    ],
    "refs": [
      "Sanjay",
      "Vinod"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 3,
    "c": 1,
    "t1": [
      "Deepak",
      "Honey"
    ],
    "t2": [
      "Hira",
      "Manoj"
    ],
    "refs": [
      "Ajeet",
      "Hrithik"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 3,
    "c": 2,
    "t1": [
      "Naresh",
      "Ranjeet"
    ],
    "t2": [
      "Pardeep",
      "Shashi"
    ],
    "refs": [
      "Partab",
      "Rajesh N."
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 3,
    "c": 5,
    "t1": [
      "Rajesh M.",
      "Sunny"
    ],
    "t2": [
      "Rakesh",
      "Vijay"
    ],
    "refs": [
      "Amit",
      "Om"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 3,
    "c": 8,
    "t1": [
      "Sanjay",
      "Wijai"
    ],
    "t2": [
      "Vinod",
      "Raja"
    ],
    "refs": [
      "Rohit",
      "Sarwan"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 4,
    "c": 1,
    "t1": [
      "Ajeet",
      "Sanjay"
    ],
    "t2": [
      "Amit",
      "Hira"
    ],
    "refs": [
      "Raja",
      "Honey"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 4,
    "c": 2,
    "t1": [
      "Hrithik",
      "Pardeep"
    ],
    "t2": [
      "Sarwan",
      "Rajesh M."
    ],
    "refs": [
      "Sunny",
      "Shashi"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 4,
    "c": 3,
    "t1": [
      "Partab",
      "Deepak"
    ],
    "t2": [
      "Om",
      "Naresh"
    ],
    "refs": [
      "Manoj",
      "Wijai"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 4,
    "c": 8,
    "t1": [
      "Rajesh N.",
      "Vinod"
    ],
    "t2": [
      "Rohit",
      "Rakesh"
    ],
    "refs": [
      "Vijay",
      "Ranjeet"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 5,
    "c": 1,
    "t1": [
      "Ajeet",
      "Raja"
    ],
    "t2": [
      "Amit",
      "Honey"
    ],
    "refs": [
      "Sanjay",
      "Hira"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 5,
    "c": 2,
    "t1": [
      "Hrithik",
      "Sunny"
    ],
    "t2": [
      "Sarwan",
      "Shashi"
    ],
    "refs": [
      "Pardeep",
      "Rajesh M."
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 5,
    "c": 3,
    "t1": [
      "Partab",
      "Manoj"
    ],
    "t2": [
      "Om",
      "Wijai"
    ],
    "refs": [
      "Deepak",
      "Naresh"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 5,
    "c": 8,
    "t1": [
      "Rajesh N.",
      "Vijay"
    ],
    "t2": [
      "Rohit",
      "Ranjeet"
    ],
    "refs": [
      "Vinod",
      "Rakesh"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 6,
    "c": 1,
    "t1": [
      "Sanjay",
      "Raja"
    ],
    "t2": [
      "Hira",
      "Honey"
    ],
    "refs": [
      "Ajeet",
      "Amit"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 6,
    "c": 2,
    "t1": [
      "Pardeep",
      "Sunny"
    ],
    "t2": [
      "Rajesh M.",
      "Shashi"
    ],
    "refs": [
      "Hrithik",
      "Sarwan"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 6,
    "c": 3,
    "t1": [
      "Deepak",
      "Manoj"
    ],
    "t2": [
      "Naresh",
      "Wijai"
    ],
    "refs": [
      "Partab",
      "Om"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 6,
    "c": 8,
    "t1": [
      "Vinod",
      "Vijay"
    ],
    "t2": [
      "Rakesh",
      "Ranjeet"
    ],
    "refs": [
      "Rajesh N.",
      "Rohit"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 7,
    "c": 1,
    "t1": [
      "Hrithik",
      "Sanjay"
    ],
    "t2": [
      "Om",
      "Pardeep"
    ],
    "refs": [
      "Ranjeet",
      "Honey"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 7,
    "c": 2,
    "t1": [
      "Amit",
      "Vinod"
    ],
    "t2": [
      "Sarwan",
      "Hira"
    ],
    "refs": [
      "Manoj",
      "Sunny"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 7,
    "c": 3,
    "t1": [
      "Partab",
      "Rajesh M."
    ],
    "t2": [
      "Rohit",
      "Deepak"
    ],
    "refs": [
      "Wijai",
      "Vijay"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 7,
    "c": 8,
    "t1": [
      "Ajeet",
      "Naresh"
    ],
    "t2": [
      "Rajesh N.",
      "Rakesh"
    ],
    "refs": [
      "Shashi",
      "Raja"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 8,
    "c": 1,
    "t1": [
      "Hrithik",
      "Ranjeet"
    ],
    "t2": [
      "Om",
      "Honey"
    ],
    "refs": [
      "Sanjay",
      "Pardeep"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 8,
    "c": 2,
    "t1": [
      "Amit",
      "Manoj"
    ],
    "t2": [
      "Sarwan",
      "Sunny"
    ],
    "refs": [
      "Vinod",
      "Hira"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 8,
    "c": 3,
    "t1": [
      "Partab",
      "Wijai"
    ],
    "t2": [
      "Rohit",
      "Vijay"
    ],
    "refs": [
      "Rajesh M.",
      "Deepak"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 8,
    "c": 8,
    "t1": [
      "Ajeet",
      "Shashi"
    ],
    "t2": [
      "Rajesh N.",
      "Raja"
    ],
    "refs": [
      "Naresh",
      "Rakesh"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 9,
    "c": 1,
    "t1": [
      "Sanjay",
      "Ranjeet"
    ],
    "t2": [
      "Pardeep",
      "Honey"
    ],
    "refs": [
      "Hrithik",
      "Om"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 9,
    "c": 2,
    "t1": [
      "Vinod",
      "Manoj"
    ],
    "t2": [
      "Hira",
      "Sunny"
    ],
    "refs": [
      "Amit",
      "Sarwan"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 9,
    "c": 3,
    "t1": [
      "Rajesh M.",
      "Wijai"
    ],
    "t2": [
      "Deepak",
      "Vijay"
    ],
    "refs": [
      "Partab",
      "Rohit"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 9,
    "c": 8,
    "t1": [
      "Naresh",
      "Shashi"
    ],
    "t2": [
      "Rakesh",
      "Raja"
    ],
    "refs": [
      "Ajeet",
      "Rajesh N."
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 10,
    "c": 1,
    "t1": [
      "Hrithik",
      "Rajesh M."
    ],
    "t2": [
      "Rajesh N.",
      "Sanjay"
    ],
    "refs": [
      "Raja",
      "Manoj"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 10,
    "c": 2,
    "t1": [
      "Ajeet",
      "Hira"
    ],
    "t2": [
      "Sarwan",
      "Naresh"
    ],
    "refs": [
      "Wijai",
      "Honey"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 10,
    "c": 3,
    "t1": [
      "Om",
      "Deepak"
    ],
    "t2": [
      "Rohit",
      "Vinod"
    ],
    "refs": [
      "Ranjeet",
      "Sunny"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 10,
    "c": 8,
    "t1": [
      "Partab",
      "Rakesh"
    ],
    "t2": [
      "Amit",
      "Pardeep"
    ],
    "refs": [
      "Shashi",
      "Vijay"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 11,
    "c": 1,
    "t1": [
      "Hrithik",
      "Raja"
    ],
    "t2": [
      "Rajesh N.",
      "Manoj"
    ],
    "refs": [
      "Rajesh M.",
      "Sanjay"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 11,
    "c": 2,
    "t1": [
      "Ajeet",
      "Wijai"
    ],
    "t2": [
      "Sarwan",
      "Honey"
    ],
    "refs": [
      "Hira",
      "Naresh"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 11,
    "c": 3,
    "t1": [
      "Om",
      "Ranjeet"
    ],
    "t2": [
      "Rohit",
      "Sunny"
    ],
    "refs": [
      "Deepak",
      "Vinod"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 11,
    "c": 8,
    "t1": [
      "Partab",
      "Shashi"
    ],
    "t2": [
      "Amit",
      "Vijay"
    ],
    "refs": [
      "Rakesh",
      "Pardeep"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 12,
    "c": 1,
    "t1": [
      "Rajesh M.",
      "Raja"
    ],
    "t2": [
      "Sanjay",
      "Manoj"
    ],
    "refs": [
      "Hrithik",
      "Rajesh N."
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 12,
    "c": 2,
    "t1": [
      "Hira",
      "Wijai"
    ],
    "t2": [
      "Naresh",
      "Honey"
    ],
    "refs": [
      "Ajeet",
      "Sarwan"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 12,
    "c": 3,
    "t1": [
      "Deepak",
      "Ranjeet"
    ],
    "t2": [
      "Vinod",
      "Sunny"
    ],
    "refs": [
      "Om",
      "Rohit"
    ],
    "s1": null,
    "s2": null
  },
  {
    "r": 12,
    "c": 8,
    "t1": [
      "Rakesh",
      "Shashi"
    ],
    "t2": [
      "Pardeep",
      "Vijay"
    ],
    "refs": [
      "Partab",
      "Amit"
    ],
    "s1": null,
    "s2": null
  }
];

  // Deep clone to avoid mutating baseline
  let fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));

  // Expose on window for external views (schedule.html, poster.html, console debugging)
  window.BASE_FIXTURES = BASE_FIXTURES;
  window.getFixtures = function() { return fixtures; };
  window.ROSTER = ROSTER;
  window.BLOCKS = BLOCKS;
  window.ROUND_TIMES = ROUND_TIMES;

  let finalsScores = {
    gold:   [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
    silver: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
    bronze: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
    copper: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
  };

  let currentCourtFilter = "all"; // 'all', '1', '2', '3', '4'
  let scheduleViewMode = "table"; // 'table' (single-row table sheet) or 'cards' (card layout)

  // ---------- PERSISTENCE & SAFE MIGRATION ----------
  const STORAGE_KEY = 'badminton_cup_portal_data_v8';
  const LEGACY_STORAGE_KEY = 'badminton_cup_portal_data_v7';

  function saveState() {
    try {
      const payload = {
        fixtures,
        finalsScores,
        selectedPlayer: document.getElementById("playerSelect")?.value || "",
        currentCourtFilter,
        scheduleViewMode,
        theme: document.documentElement.getAttribute('data-theme') || 'light'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("Could not save tournament state to localStorage:", e);
    }
  }
  window.saveState = saveState;

  function loadState() {
    try {
      // Safe non-destructive archival for legacy v6 data
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw && !localStorage.getItem(STORAGE_KEY)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        localStorage.setItem(`badminton_cup_portal_data_v7_archived_${timestamp}`, legacyRaw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        setTimeout(() => {
          showToast("📢 Fresh 24-player tournament loaded! Previous data safely archived.");
        }, 600);
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        saveState(); // Ensure initial state is written immediately
        return;
      }
      const data = JSON.parse(raw);
      if (Array.isArray(data.fixtures) && data.fixtures.length === BASE_FIXTURES.length) {
        fixtures = data.fixtures;
      }
      if (data.finalsScores) {
        finalsScores = {
          gold:   data.finalsScores.gold   || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
          silver: data.finalsScores.silver || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
          bronze: data.finalsScores.bronze || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
          copper: data.finalsScores.copper || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
        };
      }
      if (data.currentCourtFilter) {
        currentCourtFilter = data.currentCourtFilter;
      }
      if (data.scheduleViewMode) {
        scheduleViewMode = data.scheduleViewMode;
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
    setTimeout(() => toast.remove(), 3500);
  }

  // ---------- ADMIN PASSCODE & LOCK MANAGEMENT ----------
  const ADMIN_PIN = "1234";

  function isAdminUnlocked() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("admin") === ADMIN_PIN || urlParams.get("pin") === ADMIN_PIN) {
      return true;
    }
    return sessionStorage.getItem("badminton_admin_unlocked") === "true";
  }

  function updateAdminUI() {
    const isUnlocked = isAdminUnlocked();
    const lockArea = document.getElementById("adminLockArea");
    const viewBadge = document.getElementById("viewModeBadge");
    
    if (viewBadge) {
      if (isUnlocked) {
        viewBadge.innerHTML = "🔓 Admin Mode";
        viewBadge.style.background = "rgba(16, 185, 129, 0.15)";
        viewBadge.style.color = "var(--win-color)";
        viewBadge.style.borderColor = "rgba(16, 185, 129, 0.4)";
      } else {
        viewBadge.innerHTML = "🔒 View Only";
        viewBadge.style.background = "rgba(37, 99, 235, 0.12)";
        viewBadge.style.color = "var(--primary)";
        viewBadge.style.borderColor = "var(--primary-border)";
      }
    }

    if (lockArea) {
      if (isUnlocked) {
        lockArea.innerHTML = `
          <span class="badge" style="background:var(--win-bg); color:var(--win-color); border:1px solid var(--win-color); font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:var(--radius-full);">
            🔓 Admin
          </span>
          <button type="button" class="btn-secondary" onclick="lockAdmin()" style="padding:4px 10px; font-size:0.75rem; border-radius:var(--radius-full);" title="Lock and return to participant view">
            🔒 Lock
          </button>
        `;
      } else {
        lockArea.innerHTML = `
          <button type="button" id="adminLockBtn" class="nav-link-btn" onclick="toggleAdminLock()" style="background:rgba(245, 158, 11, 0.15); color:var(--gold); border:1px solid rgba(245, 158, 11, 0.4); padding:6px 14px; font-size:0.8rem; font-weight:800; border-radius:var(--radius-full); cursor:pointer; display:inline-flex; align-items:center; gap:5px;" title="Enter Organizer PIN (1234) to unlock score editing">
            🔒 Admin Unlock
          </button>
        `;
      }
    }
  }

  window.toggleAdminLock = function () {
    if (isAdminUnlocked()) {
      lockAdmin();
    } else {
      openPinModal();
    }
  };

  window.openPinModal = function () {
    const modal = document.getElementById("pinModal");
    const input = document.getElementById("adminPinInput");
    const error = document.getElementById("pinErrorMsg");
    if (modal) modal.classList.add("open");
    if (error) error.textContent = "";
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 150);
    }
  };

  window.closePinModal = function () {
    const modal = document.getElementById("pinModal");
    if (modal) modal.classList.remove("open");
  };

  window.handlePinSubmit = function (e) {
    if (e) e.preventDefault();
    const input = document.getElementById("adminPinInput");
    const error = document.getElementById("pinErrorMsg");
    const pin = input ? input.value.trim() : "";
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem("badminton_admin_unlocked", "true");
      closePinModal();
      updateAdminUI();
      renderSchedule();
      renderFinals();
      showToast("🔓 Admin Mode unlocked! Score editing enabled.");
    } else {
      if (error) error.textContent = "Incorrect PIN. Please try again.";
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  };

  window.lockAdmin = function () {
    sessionStorage.removeItem("badminton_admin_unlocked");
    const url = new URL(window.location);
    if (url.searchParams.has("admin") || url.searchParams.has("pin")) {
      url.searchParams.delete("admin");
      url.searchParams.delete("pin");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
    updateAdminUI();
    renderSchedule();
    renderFinals();
    showToast("🔒 Locked to View-Only mode.");
  };

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
      const isCurrent = t === tab;
      if (panel) {
        if (isCurrent) {
          panel.classList.remove('hidden');
          panel.style.display = 'block';
        } else {
          panel.classList.add('hidden');
          panel.style.display = 'none';
        }
      }
      if (btn) btn.classList.toggle('active', isCurrent);
    });

    // Only show top filter bar & personalized player hub on the Scoring Sheet (fixtures) tab
    const filterCard = document.querySelector('.filter-card');
    const hubCard = document.getElementById('playerHubCard');
    if (filterCard) {
      filterCard.style.display = (tab === 'fixtures') ? 'block' : 'none';
    }
    if (hubCard) {
      if (tab === 'fixtures') {
        const sel = document.getElementById('playerSelect');
        hubCard.style.display = (sel && sel.value) ? 'block' : 'none';
      } else {
        hubCard.style.display = 'none';
      }
    }

    if (tab === 'leaderboard') renderLeaderboard();
    if (tab === 'finals') renderFinals();
    if (tab === 'fixtures') renderSchedule();

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
      stats[p] = { name: p, gp: 0, wins: 0, pts: 0, ga: 0, pa: 0 };
    });

    fixtures.forEach(f => {
      if (f.s1 == null || f.s2 == null || f.s1 === "" || f.s2 === "") return;
      const s1 = Number(f.s1);
      const s2 = Number(f.s2);
      // Stage 1 sudden death: match is concluded ONLY when one team reaches 15 points (max 15)
      const isConcluded = (s1 === 15 || s2 === 15) && s1 !== s2;
      if (!isConcluded) return;

      const t1win = s1 === 15;

      f.t1.forEach(p => {
        if (!stats[p]) return;
        stats[p].gp++;
        stats[p].pts += s1;
        stats[p].ga += s2;
        stats[p].pa += s2;
        if (t1win) stats[p].wins++;
      });

      f.t2.forEach(p => {
        if (!stats[p]) return;
        stats[p].gp++;
        stats[p].pts += s2;
        stats[p].ga += s1;
        stats[p].pa += s1;
        if (!t1win) stats[p].wins++;
      });
    });

    const list = Object.values(stats).map(s => ({
      ...s,
      diff: s.pts - s.pa
    }));

    // Ranking criteria: 1. Total Wins -> 2. Point Differential -> 3. Points Scored
    list.sort((a, b) => (b.wins - a.wins) || (b.diff - a.diff) || (b.pts - a.pts));

    list.forEach((s, idx) => {
      s.rank = idx + 1;
      if (s.rank <= 6) s.tier = 'Gold';
      else if (s.rank <= 12) s.tier = 'Silver';
      else if (s.rank <= 18) s.tier = 'Bronze';
      else s.tier = 'Copper';
    });

    return list;
  }

  // ---------- TOGGLE SCHEDULE VIEW MODE ----------
  window.setScheduleViewMode = function (mode) {
    scheduleViewMode = mode;
    saveState();
    renderSchedule();
  };

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
      document.getElementById("hubRecord").innerHTML = `<strong>${s.wins}W - ${s.gp - s.wins}L</strong> (${s.gp}/8 Played)`;
      document.getElementById("hubDiff").innerHTML = `Diff: <strong>${s.diff > 0 ? '+' : ''}${s.diff}</strong> (${s.pts} Pts)`;
      const tierBadge = document.getElementById("hubTier");
      tierBadge.textContent = `${s.tier} Pool`;
      tierBadge.className = `tier-badge tier-${s.tier.toLowerCase()}`;

      // Find next upcoming match or duty
      const nextMatch = fixtures.find(f => (f.s1 == null || f.s2 == null) && (f.t1.includes(selected) || f.t2.includes(selected) || f.refs.includes(selected)));
      const nextDetail = document.getElementById("hubNextStatus");
      if (nextMatch) {
        const isRef = nextMatch.refs.includes(selected);
        const cInfo = COURT_INFO[nextMatch.c] || { name: `Court ${nextMatch.c}` };
        if (nextDetail) {
          nextDetail.innerHTML = isRef 
            ? `👀 <strong>Referee Duty</strong>: Round ${nextMatch.r} on ${cInfo.name}` 
            : `🏸 <strong>Next Match</strong>: Round ${nextMatch.r} on ${cInfo.name}`;
        }
      } else {
        if (nextDetail) nextDetail.textContent = "All 8 Stage 1 matches completed! Ready for Finals.";
      }

      // Populate unique partners list
      const partners = [];
      fixtures.forEach(f => {
        if (f.t1.includes(selected)) partners.push(f.t1.find(p => p !== selected));
        if (f.t2.includes(selected)) partners.push(f.t2.find(p => p !== selected));
      });
      const partnersList = document.getElementById("hubPartnersList");
      if (partnersList) {
        partnersList.innerHTML = partners.map(p => `<span class="partner-pill">${p}</span>`).join("");
      }
    } else if (hubCard) {
      hubCard.style.display = "none";
    }

    // Filter fixtures
    const visibleFixtures = [];
    fixtures.forEach((f, idx) => {
      if (currentCourtFilter !== "all" && String(f.c) !== currentCourtFilter) return;
      const isPlayer = selected && (f.t1.includes(selected) || f.t2.includes(selected));
      const isRef = selected && f.refs.includes(selected);
      if (selected && !isPlayer && !isRef) return;
      visibleFixtures.push({ f, idx, isPlayer, isRef });
    });

    // Top Controls Bar (View Switcher + Match count + Link to poster.html)
    const topBar = document.createElement("div");
    topBar.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;";
    topBar.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--text-secondary);">View:</span>
        <div class="view-toggle-wrap">
          <button type="button" class="view-toggle-btn ${scheduleViewMode === 'table' ? 'active' : ''}" onclick="setScheduleViewMode('table')">
            <span>📄</span> Scoring Sheet
          </button>
          <button type="button" class="view-toggle-btn ${scheduleViewMode === 'cards' ? 'active' : ''}" onclick="setScheduleViewMode('cards')">
            <span>🗂️</span> Cards
          </button>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600; margin-right:4px;">
          Showing <strong>${visibleFixtures.length}</strong> of 48 matches
        </span>
        <button type="button" class="pill-btn" onclick="captureSchedulePhoto('schedTableCard')" style="font-size:0.75rem; padding:5px 10px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-card); cursor:pointer;" title="Save all 11 columns as high-resolution PNG image">
          <span>📸</span> Save Photo
        </button>
        <button type="button" class="pill-btn" onclick="window.print()" style="font-size:0.75rem; padding:5px 10px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-card); cursor:pointer;" title="Print / Save PDF (Landscape, all 11 columns fit in 1 row)">
          <span>🖨️</span> Print PDF
        </button>
        <a href="poster.html" class="pill-btn" style="text-decoration:none; font-size:0.75rem; padding:5px 10px; background:var(--primary-light); color:var(--primary); border:1px solid var(--primary-border);" title="View Wallchart Poster">
          <span>🖼️ Wallchart Poster</span>
        </a>
      </div>
    `;
    container.appendChild(topBar);

    if (visibleFixtures.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.cssText = "text-align:center; padding:40px; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-card);";
      emptyDiv.textContent = "No matches found for the selected filter.";
      container.appendChild(emptyDiv);
      return;
    }

    if (scheduleViewMode === "table") {
      // Render Single-Row Tabular Schedule Sheet
      const tableCard = document.createElement("div");
      tableCard.className = "sched-table-card";
      tableCard.id = "schedTableCard";

      const tableWrap = document.createElement("div");
      tableWrap.className = "sched-table-wrap";

      const table = document.createElement("table");
      table.className = "sched-table";
      table.innerHTML = `
        <thead>
          <tr>
            <th>Round</th>
            <th>Time</th>
            <th>Court</th>
            <th style="text-align:left;">Team 1 Pair</th>
            <th>Score 1</th>
            <th>W / L</th>
            <th style="text-align:left;">Team 2 Pair</th>
            <th>Score 2</th>
            <th>W / L</th>
            <th>Diff</th>
            <th style="text-align:left;">Referee Duty</th>
          </tr>
        </thead>
        <tbody id="schedTableBody"></tbody>
      `;
      tableWrap.appendChild(table);
      tableCard.appendChild(tableWrap);
      container.appendChild(tableCard);

      const tbody = table.querySelector("#schedTableBody");
      let lastBlock = 0;

      visibleFixtures.forEach(({ f, idx, isPlayer, isRef }) => {
        // Block divider row
        const blockNum = Math.ceil(f.r / 3);
        if (blockNum !== lastBlock && BLOCKS[f.r] && (currentCourtFilter === "all" || currentCourtFilter === String(f.c))) {
          lastBlock = blockNum;
          const bInfo = BLOCKS[f.r];
          const bRow = document.createElement("tr");
          bRow.className = "block-header-row";
          bRow.innerHTML = `
            <td colspan="11">
              <span class="block-header-title">${bInfo.icon} ${bInfo.label}</span>
              <span class="block-header-sub">${bInfo.desc}</span>
            </td>
          `;
          tbody.appendChild(bRow);
        }

        const s1 = (f.s1 != null && f.s1 !== "") ? Number(f.s1) : null;
        const s2 = (f.s2 != null && f.s2 !== "") ? Number(f.s2) : null;
        const hasScores = s1 != null && s2 != null;
        // Stage 1 sudden death: match is concluded ONLY when one team reaches 15 points (max 15)
        const isConcluded = hasScores && (s1 === 15 || s2 === 15) && s1 !== s2;
        const t1Won = isConcluded && s1 === 15;
        const t2Won = isConcluded && s2 === 15;
        const diff = hasScores ? Math.abs(s1 - s2) : null;

        // Differential Badge
        let diffHtml = '<span class="diff-pill even">-</span>';
        if (hasScores) {
          const diffSign = s1 > s2 ? "+" : (s2 > s1 ? "-" : "");
          diffHtml = `<span class="diff-pill ${s1 > s2 ? 'pos' : (s2 > s1 ? 'neg' : 'even')}">${diffSign}${diff}</span>`;
        }

        let wl1Html = '<span class="wl-pill wl-pending">-</span>';
        let wl2Html = '<span class="wl-pill wl-pending">-</span>';
        if (isConcluded) {
          wl1Html = `<span class="wl-pill ${t1Won ? 'wl-win' : 'wl-loss'}">${t1Won ? 'WIN' : 'LOSS'}</span>`;
          wl2Html = `<span class="wl-pill ${t2Won ? 'wl-win' : 'wl-loss'}">${t2Won ? 'WIN' : 'LOSS'}</span>`;
        } else if (hasScores && (s1 > 0 || s2 > 0)) {
          wl1Html = `<span class="wl-pill wl-pending" style="opacity:0.75;" title="In Progress to 15">Live</span>`;
          wl2Html = `<span class="wl-pill wl-pending" style="opacity:0.75;" title="In Progress to 15">Live</span>`;
        }

        const t1Html = f.t1.map(p => p === selected ? `<span class="player-highlight-text">${p}</span>` : p).join(" & ");
        const t2Html = f.t2.map(p => p === selected ? `<span class="player-highlight-text">${p}</span>` : p).join(" & ");
        const refHtml = f.refs.map(p => p === selected ? `<span class="player-highlight-text">${p}</span>` : p).join(" & ");

        const cInfo = COURT_INFO[f.c] || { name: `Court ${f.c}`, sub: "" };
        const courtBadge = `
          <div class="court-badge-cell">
            <span class="court-badge c${f.c}">${cInfo.name}</span>
            ${cInfo.sub ? `<span class="court-sub-note">${cInfo.sub}</span>` : ""}
          </div>
        `;

        let rowClass = "";
        if (isPlayer) {
          rowClass = "row-highlight-playing";
          if (isConcluded) {
            const won = (f.t1.includes(selected) && t1Won) || (f.t2.includes(selected) && t2Won);
            rowClass += won ? " row-won" : " row-lost";
          }
        } else if (isRef) {
          rowClass = "row-highlight-ref";
        }

        const isAdmin = isAdminUnlocked();
        const score1Html = isAdmin
          ? `<div class="tbl-score-box">
              <button type="button" class="tbl-score-btn" onclick="adjustScore(${idx}, 1, -1)" title="Score Down">-</button>
              <input type="number" class="tbl-score-input" id="tbl-score-${idx}-1" value="${f.s1 ?? ''}" placeholder="0" min="0" max="15" onchange="updateScore(${idx}, 1, this.value)" onkeydown="if(event.key==='Enter') this.blur()">
              <button type="button" class="tbl-score-btn" onclick="adjustScore(${idx}, 1, 1)" title="Score Up">+</button>
            </div>`
          : (hasScores 
              ? `<span class="view-score-box ${isConcluded ? (t1Won ? 'win' : 'loss') : 'live'}">${s1}</span>` 
              : `<span class="view-score-box pending">-</span>`);

        const score2Html = isAdmin
          ? `<div class="tbl-score-box">
              <button type="button" class="tbl-score-btn" onclick="adjustScore(${idx}, 2, -1)" title="Score Down">-</button>
              <input type="number" class="tbl-score-input" id="tbl-score-${idx}-2" value="${f.s2 ?? ''}" placeholder="0" min="0" max="15" onchange="updateScore(${idx}, 2, this.value)" onkeydown="if(event.key==='Enter') this.blur()">
              <button type="button" class="tbl-score-btn" onclick="adjustScore(${idx}, 2, 1)" title="Score Up">+</button>
            </div>`
          : (hasScores 
              ? `<span class="view-score-box ${isConcluded ? (t2Won ? 'win' : 'loss') : 'live'}">${s2}</span>` 
              : `<span class="view-score-box pending">-</span>`);

        const tr = document.createElement("tr");
        tr.className = rowClass;
        tr.innerHTML = `
          <td class="td-round"><span class="round-pill">R${String(f.r).padStart(2, '0')}</span></td>
          <td><span class="time-pill">${ROUND_TIMES[f.r] || ''}</span></td>
          <td>${courtBadge}</td>
          <td class="team-pair-cell">🏸 <strong>${t1Html}</strong></td>
          <td>${score1Html}</td>
          <td>${wl1Html}</td>
          <td class="team-pair-cell team-2">🏸 <strong>${t2Html}</strong></td>
          <td>${score2Html}</td>
          <td>${wl2Html}</td>
          <td>${diffHtml}</td>
          <td class="ref-cell"><span class="ref-icon-badge">👀</span><strong>${refHtml}</strong></td>
        `;
        tbody.appendChild(tr);
      });

    } else {
      // Render Mobile Card View
      let lastRound = 0;
      visibleFixtures.forEach(({ f, idx, isPlayer, isRef }) => {
        if (BLOCKS[f.r] && f.r !== lastRound && (currentCourtFilter === "all" || currentCourtFilter === String(f.c))) {
          const bInfo = BLOCKS[f.r];
          const blockDiv = document.createElement("div");
          blockDiv.className = "block-divider-card";
          blockDiv.innerHTML = `
            <div class="block-title">
              <span>${bInfo.icon}</span>
              <span>${bInfo.label}</span>
            </div>
            <div class="block-subtitle">${bInfo.desc}</div>
          `;
          container.appendChild(blockDiv);
        }

        if (f.r !== lastRound) {
          lastRound = f.r;
          const div = document.createElement("div");
          div.className = "round-divider";
          div.innerHTML = `
            <span class="round-divider-label">Round ${f.r} • ${ROUND_TIMES[f.r] || ''}</span>
            <div class="round-divider-line"></div>
          `;
          container.appendChild(div);
        }

        let cardStatus = "";
        const s1 = (f.s1 != null && f.s1 !== "") ? Number(f.s1) : null;
        const s2 = (f.s2 != null && f.s2 !== "") ? Number(f.s2) : null;
        const hasScores = s1 != null && s2 != null;
        const isConcluded = hasScores && (s1 === 15 || s2 === 15) && s1 !== s2;
        const t1Won = isConcluded && s1 === 15;
        const t2Won = isConcluded && s2 === 15;

        if (isRef) cardStatus = "ref";
        else if (isPlayer) {
          if (isConcluded) {
            const isT1 = f.t1.includes(selected);
            const won = (isT1 && s1 === 15) || (!isT1 && s2 === 15);
            cardStatus = won ? "won" : "lost";
          } else {
            cardStatus = "playing";
          }
        }

        const card = document.createElement("div");
        card.className = `card ${cardStatus}`;

        const t1Html = f.t1.map(p => p === selected ? `<span class="highlight-player">${p}</span>` : p).join(" & ");
        const t2Html = f.t2.map(p => p === selected ? `<span class="highlight-player">${p}</span>` : p).join(" & ");
        const refHtml = f.refs.map(p => p === selected ? `<span class="highlight-player">${p}</span>` : p).join(" & ");

        const cInfo = COURT_INFO[f.c] || { name: `Court ${f.c}`, sub: "" };
        const courtBadge = `<span class="court-badge c${f.c}">${cInfo.name} ${cInfo.sub ? '(' + cInfo.sub + ')' : ''}</span>`;

        const isAdmin = isAdminUnlocked();
        const cardScoreBoxHtml = isAdmin
          ? `<div class="score-stepper">
              <button type="button" class="stepper-btn" onclick="adjustScore(${idx}, 1, -1)" title="Score Down">-</button>
              <input type="number" class="score-input" id="score-${idx}-1" value="${f.s1 ?? ''}" placeholder="0" min="0" max="15" onchange="updateScore(${idx}, 1, this.value)" onkeydown="if(event.key==='Enter') this.blur()">
              <button type="button" class="stepper-btn" onclick="adjustScore(${idx}, 1, 1)" title="Score Up">+</button>
            </div>
            <span style="font-weight:700; color:var(--text-muted);">-</span>
            <div class="score-stepper">
              <button type="button" class="stepper-btn" onclick="adjustScore(${idx}, 2, -1)" title="Score Down">-</button>
              <input type="number" class="score-input" id="score-${idx}-2" value="${f.s2 ?? ''}" placeholder="0" min="0" max="15" onchange="updateScore(${idx}, 2, this.value)" onkeydown="if(event.key==='Enter') this.blur()">
              <button type="button" class="stepper-btn" onclick="adjustScore(${idx}, 2, 1)" title="Score Up">+</button>
            </div>`
          : `<div style="display:flex; align-items:center; gap:8px;">
              <span class="view-score-box ${isConcluded ? (t1Won ? 'win' : 'loss') : (hasScores ? 'live' : 'pending')}">${s1 ?? '-'}</span>
              <span style="font-weight:700; color:var(--text-muted);">:</span>
              <span class="view-score-box ${isConcluded ? (t2Won ? 'win' : 'loss') : (hasScores ? 'live' : 'pending')}">${s2 ?? '-'}</span>
            </div>`;

        card.innerHTML = `
          <div class="card-top">
            <div class="round-badge">
              <span>Round ${f.r} (${ROUND_TIMES[f.r] || ''})</span>
              ${courtBadge}
            </div>
            ${isRef ? `<span class="badge ref-badge">👀 Referee Duty</span>` : ""}
          </div>
          <div class="card-body">
            <div class="match-row">
              <div class="teams-container">
                <div class="team-name">
                  <span>🏸</span> <span>${t1Html}</span>
                </div>
                <span class="vs-badge">VS</span>
                <div class="team-name">
                  <span>🏸</span> <span>${t2Html}</span>
                </div>
              </div>
              <div class="score-box">
                ${cardScoreBoxHtml}
              </div>
            </div>
            <div class="sub-refs-info">
              <span class="ref-callout">👀 Refs:</span>
              <span>${refHtml}</span>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    }
  }

  // ---------- INTERACTIVE SCORE UPDATING ----------
  window.adjustScore = function (fixtureIdx, teamNum, delta) {
    const f = fixtures[fixtureIdx];
    if (!f) return;
    const current = teamNum === 1 ? (f.s1 ?? 0) : (f.s2 ?? 0);
    const next = Math.min(15, Math.max(0, Number(current) + delta));
    if (teamNum === 1) {
      f.s1 = next;
      if (f.s2 == null) f.s2 = 0;
    } else {
      f.s2 = next;
      if (f.s1 == null) f.s1 = 0;
    }

    saveState();
    renderSchedule();
    renderLeaderboard();
  };

  window.updateScore = function (fixtureIdx, teamNum, val) {
    const f = fixtures[fixtureIdx];
    if (!f) return;
    const num = val === "" ? null : Math.min(15, Math.max(0, parseInt(val, 10)));
    if (teamNum === 1) {
      f.s1 = num;
      if (num != null && f.s2 == null) f.s2 = 0;
    } else {
      f.s2 = num;
      if (num != null && f.s1 == null) f.s1 = 0;
    }

    saveState();
    renderSchedule();
    renderLeaderboard();
  };

  // ---------- RENDERING: LEADERBOARD TAB ----------
  function renderLeaderboard() {
    const tbody = document.getElementById("lbBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const select = document.getElementById("playerSelect");
    const selected = select ? select.value : "";

    const standings = computeLeaderboard();

    standings.forEach(s => {
      const tr = document.createElement("tr");
      if (s.name === selected) tr.className = "selected-row";

      const diffClass = s.diff > 0 ? "diff-pos" : (s.diff < 0 ? "diff-neg" : "");
      const diffFormatted = s.diff > 0 ? `+${s.diff}` : s.diff;
      const rankBadgeClass = s.rank === 1 ? "rank-1" : (s.rank === 2 ? "rank-2" : (s.rank === 3 ? "rank-3" : ""));

      tr.innerHTML = `
        <td><span class="rank-badge ${rankBadgeClass}">${s.rank}</span></td>
        <td class="player-cell"><span>🏸</span> ${s.name}</td>
        <td><strong>${s.gp}</strong></td>
        <td><strong style="color:var(--win-color);">${s.wins}</strong></td>
        <td>${s.pts}</td>
        <td>${s.ga}</td>
        <td class="${diffClass}"><strong>${diffFormatted}</strong></td>
        <td><span class="tier-badge tier-${s.tier.toLowerCase()}">${s.tier}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  

  // ---------- FINALS POOLS GENERATOR ----------
  function genPoolMatches(team1, team2, team3, idPrefix, poolKey) {
    const defs = [
      { id: idPrefix + "-M1", t1: team1, t2: team2, refs: team3 },
      { id: idPrefix + "-M2", t1: team1, t2: team3, refs: team2 },
      { id: idPrefix + "-M3", t1: team2, t2: team3, refs: team1 }
    ];
    return defs.map((d, i) => ({
      ...d,
      s1: finalsScores[poolKey][i]?.s1 ?? null,
      s2: finalsScores[poolKey][i]?.s2 ?? null
    }));
  }


  // ---------- BUILD FINALS POOLS (SNAKE SEEDING) ----------
  function buildFinalsPools(leaderboard) {
    const tierSlice = (start) => leaderboard.slice(start, start + 6).map(s => s.name);
    
    // Balanced Snake Pairing:
    // Team 1: #1 & #6 (or #7 & #12, #13 & #18, #19 & #24)
    // Team 2: #2 & #5 (or #8 & #11, #14 & #17, #20 & #23)
    // Team 3: #3 & #4 (or #9 & #10, #15 & #16, #21 & #22)
    const makeTeams = (arr) => [
      [arr[0] || "Rank 1", arr[5] || "Rank 6"],
      [arr[1] || "Rank 2", arr[4] || "Rank 5"],
      [arr[2] || "Rank 3", arr[3] || "Rank 4"]
    ];

    const goldNames = tierSlice(0);
    const silverNames = tierSlice(6);
    const bronzeNames = tierSlice(12);
    const copperNames = tierSlice(18);

    const goldTeams = makeTeams(goldNames);
    const silverTeams = makeTeams(silverNames);
    const bronzeTeams = makeTeams(bronzeNames);
    const copperTeams = makeTeams(copperNames);

    return [
      {
        key: "gold",
        label: "Gold Championship (Court 1)",
        courtNum: 1,
        cls: "tier-gold",
        teams: goldTeams,
        matches: genPoolMatches(goldTeams[0], goldTeams[1], goldTeams[2], "GOLD", "gold")
      },
      {
        key: "silver",
        label: "Silver Plate (Court 2)",
        courtNum: 2,
        cls: "tier-silver",
        teams: silverTeams,
        matches: genPoolMatches(silverTeams[0], silverTeams[1], silverTeams[2], "SILVER", "silver")
      },
      {
        key: "bronze",
        label: "Bronze Shield (Court 3)",
        courtNum: 3,
        cls: "tier-bronze",
        teams: bronzeTeams,
        matches: genPoolMatches(bronzeTeams[0], bronzeTeams[1], bronzeTeams[2], "BRONZE", "bronze")
      },
      {
        key: "copper",
        label: "Copper Cup (Court 8)",
        courtNum: 8,
        cls: "tier-copper",
        teams: copperTeams,
        matches: genPoolMatches(copperTeams[0], copperTeams[1], copperTeams[2], "COPPER", "copper")
      }
    ];
  }

  // ---------- COMPUTE POOL STANDINGS ----------
  function computePoolStandings(pool) {
    const names = [...new Set(pool.matches.flatMap(m => [...m.t1, ...m.t2]))];
    const stats = {};
    names.forEach(n => {
      stats[n] = { name: n, gp: 0, wins: 0, losses: 0, pts: 0, pa: 0, ga: 0 };
    });

    pool.matches.forEach(m => {
      if (m.s1 == null || m.s2 == null || m.s1 === "" || m.s2 === "") return;
      const s1 = Number(m.s1);
      const s2 = Number(m.s2);
      const isConcluded = (s1 === 21 || s2 === 21) && s1 !== s2;
      if (!isConcluded) return;

      const t1win = s1 === 21;
      m.t1.forEach(p => {
        if (!stats[p]) return;
        stats[p].gp++;
        stats[p].pts += s1;
        stats[p].pa += s2;
        stats[p].ga += s2;
        if (t1win) stats[p].wins++;
        else stats[p].losses++;
      });
      m.t2.forEach(p => {
        if (!stats[p]) return;
        stats[p].gp++;
        stats[p].pts += s2;
        stats[p].pa += s1;
        stats[p].ga += s1;
        if (!t1win) stats[p].wins++;
        else stats[p].losses++;
      });
    });

    const list = Object.values(stats).map(s => ({
      ...s,
      diff: s.pts - s.pa
    }));

    list.sort((a, b) => (b.wins - a.wins) || (b.diff - a.diff) || (b.pts - a.pts));
    return list;
  }

  // ---------- RENDERING: FINALS TAB ----------
  function renderFinals() {
    const container = document.getElementById("finalsContainer");
    if (!container) return;
    container.innerHTML = "";

    const leaderboard = computeLeaderboard();
    const pools = buildFinalsPools(leaderboard);

    pools.forEach(pool => {
      const standings = computePoolStandings(pool);
      const isConcluded = pool.matches.every(m => m.s1 != null && m.s2 != null && (Number(m.s1) === 21 || Number(m.s2) === 21) && Number(m.s1) !== Number(m.s2));
      let champName = null;
      if (isConcluded && standings.length >= 2) {
        champName = `${standings[0].name} & ${standings[1].name}`;
      }

      const sec = document.createElement("div");
      sec.className = "finals-pool-section";

      sec.innerHTML = `
        <div class="pool-banner ${pool.cls}">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">🏆</span>
            <div>
              <div style="font-weight:800; font-size:1.05rem;">${pool.label}</div>
              <div style="font-size:0.75rem; opacity:0.9; font-weight:500;">Dedicated Court ${pool.courtNum} • 3 Round-Robin Matches • 21 Pts Sudden Death</div>
            </div>
          </div>
          ${champName ? `<span class="badge" style="background:#fff; color:#0f172a; font-weight:800; padding:4px 10px; border-radius:var(--radius-full); box-shadow:0 2px 4px rgba(0,0,0,0.15);">🥇 Champions: ${champName}</span>` : ""}
        </div>

        <div class="sched-table-card" style="margin-top:10px; margin-bottom:12px;">
          <div class="sched-table-wrap">
            <table class="sched-table">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Court</th>
                  <th style="text-align:left;">Team 1 Pair</th>
                  <th>Score 1</th>
                  <th>W / L</th>
                  <th style="text-align:left;">Team 2 Pair</th>
                  <th>Score 2</th>
                  <th>W / L</th>
                  <th>Diff</th>
                  <th style="text-align:left;">Referee Duty</th>
                </tr>
              </thead>
              <tbody>
                ${pool.matches.map((m, mIdx) => {
                  const s1 = (m.s1 != null && m.s1 !== "") ? Number(m.s1) : null;
                  const s2 = (m.s2 != null && m.s2 !== "") ? Number(m.s2) : null;
                  const hasScores = s1 != null && s2 != null;
                  // Stage 2 Finals: match is concluded ONLY when one team reaches 21 points (max 21)
                  const isConcluded = hasScores && (s1 === 21 || s2 === 21) && s1 !== s2;
                  const t1Won = isConcluded && s1 === 21;
                  const t2Won = isConcluded && s2 === 21;
                  const diff = hasScores ? Math.abs(s1 - s2) : null;
                  let diffHtml = '<span class="diff-pill even">-</span>';
                  if (hasScores) {
                    const diffSign = s1 > s2 ? "+" : (s2 > s1 ? "-" : "");
                    diffHtml = '<span class="diff-pill ' + (s1 > s2 ? 'pos' : (s2 > s1 ? 'neg' : 'even')) + '">' + diffSign + diff + '</span>';
                  }

                  let wl1Html = '<span class="wl-pill wl-pending">-</span>';
                  let wl2Html = '<span class="wl-pill wl-pending">-</span>';
                  if (isConcluded) {
                    wl1Html = '<span class="wl-pill ' + (t1Won ? 'wl-win' : 'wl-loss') + '">' + (t1Won ? 'WIN' : 'LOSS') + '</span>';
                    wl2Html = '<span class="wl-pill ' + (t2Won ? 'wl-win' : 'wl-loss') + '">' + (t2Won ? 'WIN' : 'LOSS') + '</span>';
                  } else if (hasScores && (s1 > 0 || s2 > 0)) {
                    wl1Html = '<span class="wl-pill wl-pending" style="opacity:0.75;" title="In Progress to 21">Live</span>';
                    wl2Html = '<span class="wl-pill wl-pending" style="opacity:0.75;" title="In Progress to 21">Live</span>';
                  }

                  const isAdmin = isAdminUnlocked();
                  const fScore1Html = isAdmin
                    ? `<div class="tbl-score-box">
                        <button type="button" class="tbl-score-btn" onclick="adjustFinalsScore('${pool.key}', ${mIdx}, 1, -1)" title="Score Down">-</button>
                        <input type="number" class="tbl-score-input" value="${m.s1 ?? ''}" placeholder="0" min="0" max="21" onchange="updateFinalsScore('${pool.key}', ${mIdx}, 1, this.value)" onkeydown="if(event.key==='Enter') this.blur()">
                        <button type="button" class="tbl-score-btn" onclick="adjustFinalsScore('${pool.key}', ${mIdx}, 1, 1)" title="Score Up">+</button>
                      </div>`
                    : (hasScores 
                        ? `<span class="view-score-box ${isConcluded ? (t1Won ? 'win' : 'loss') : 'live'}">${s1}</span>` 
                        : `<span class="view-score-box pending">-</span>`);

                  const fScore2Html = isAdmin
                    ? `<div class="tbl-score-box">
                        <button type="button" class="tbl-score-btn" onclick="adjustFinalsScore('${pool.key}', ${mIdx}, 2, -1)" title="Score Down">-</button>
                        <input type="number" class="tbl-score-input" value="${m.s2 ?? ''}" placeholder="0" min="0" max="21" onchange="updateFinalsScore('${pool.key}', ${mIdx}, 2, this.value)" onkeydown="if(event.key==='Enter') this.blur()">
                        <button type="button" class="tbl-score-btn" onclick="adjustFinalsScore('${pool.key}', ${mIdx}, 2, 1)" title="Score Up">+</button>
                      </div>`
                    : (hasScores 
                        ? `<span class="view-score-box ${isConcluded ? (t2Won ? 'win' : 'loss') : 'live'}">${s2}</span>` 
                        : `<span class="view-score-box pending">-</span>`);

                  return `
                    <tr>
                      <td class="td-round"><span class="round-pill">${m.id}</span></td>
                      <td><span class="court-badge c${pool.courtNum}">Court ${pool.courtNum}</span></td>
                      <td class="team-pair-cell">🏸 <strong>${m.t1.join(" & ")}</strong></td>
                      <td>${fScore1Html}</td>
                      <td>${wl1Html}</td>
                      <td class="team-pair-cell team-2">🏸 <strong>${m.t2.join(" & ")}</strong></td>
                      <td>${fScore2Html}</td>
                      <td>${wl2Html}</td>
                      <td>${diffHtml}</td>
                      <td class="ref-cell"><span class="ref-icon-badge">👀</span><strong>${m.refs.join(" & ")}</strong></td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div style="background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-card); overflow:hidden; margin-top:10px;">
          <div style="padding: 8px 14px; background:var(--bg-main); font-size:0.82rem; font-weight:700; color:var(--text-secondary); border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
            <span>📊 ${pool.label.split('(')[0].trim()} Standings</span>
            <span style="font-size:0.75rem; color:var(--text-muted);">Points to 21 • Ranked by Wins &rarr; Diff &rarr; PTS</span>
          </div>
          <table class="lb-table" style="font-size:0.8rem;">
            <thead>
              <tr>
                <th>#</th>
                <th style="text-align:left;">Player</th>
                <th>GP</th>
                <th>W</th>
                <th>L</th>
                <th>PTS</th>
                <th>PA</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              ${standings.map((s, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="player-cell">🏸 ${s.name}</td>
                  <td>${s.gp}</td>
                  <td><strong style="color:var(--win-color);">${s.wins}</strong></td>
                  <td>${s.losses}</td>
                  <td>${s.pts}</td>
                  <td>${s.pa}</td>
                  <td class="${s.diff > 0 ? 'diff-pos' : (s.diff < 0 ? 'diff-neg' : '')}">${s.diff > 0 ? '+' : ''}${s.diff}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;

      container.appendChild(sec);
    });
  }

  window.adjustFinalsScore = function (poolKey, matchIdx, teamNum, delta) {
    const match = finalsScores[poolKey][matchIdx];
    if (!match) return;
    const current = teamNum === 1 ? (match.s1 ?? 0) : (match.s2 ?? 0);
    const next = Math.min(21, Math.max(0, Number(current) + delta));
    if (teamNum === 1) {
      match.s1 = next;
      if (match.s2 == null) match.s2 = 0;
    } else {
      match.s2 = next;
      if (match.s1 == null) match.s1 = 0;
    }

    saveState();
    renderFinals();
  };

  window.updateFinalsScore = function (poolKey, matchIdx, teamNum, val) {
    const match = finalsScores[poolKey][matchIdx];
    if (!match) return;
    const num = val === "" ? null : Math.min(21, Math.max(0, parseInt(val, 10)));
    if (teamNum === 1) {
      match.s1 = num;
      if (num != null && match.s2 == null) match.s2 = 0;
    } else {
      match.s2 = num;
      if (num != null && match.s1 == null) match.s1 = 0;
    }

    saveState();
    renderFinals();
  };

  // ---------- POPULATE PLAYER DROPDOWN ----------
  function populatePlayerSelect() {
    const select = document.getElementById("playerSelect");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- All 24 Players (Full Tournament View) --</option>';

    PLAYERS.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    });

    if (currentVal && PLAYERS.includes(currentVal)) {
      select.value = currentVal;
    }

    select.onchange = function () {
      saveState();
      renderSchedule();
      renderLeaderboard();
    };
  }

  // ---------- ORGANIZER DESK TOOLS ----------
  window.openOrganizerModal = function () {
    if (!isAdminUnlocked()) {
      openPinModal();
      return;
    }
    document.getElementById("organizerModal")?.classList.add("open");
  };

  window.closeOrganizerModal = function () {
    document.getElementById("organizerModal")?.classList.remove("open");
  };

  window.exportDataJSON = function () {
    const data = {
      version: "v7",
      exportDate: new Date().toISOString(),
      fixtures,
      finalsScores
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `badminton_cup_backup_24p_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("💾 Backup JSON exported successfully!");
  };

  window.importDataJSON = function (input) {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed.fixtures)) {
          fixtures = parsed.fixtures;
          if (parsed.finalsScores) finalsScores = parsed.finalsScores;
          saveState();
          renderSchedule();
          renderLeaderboard();
          renderFinals();
          closeOrganizerModal();
          showToast("📥 Tournament data imported successfully!");
        } else {
          alert("Invalid backup file structure.");
        }
      } catch (err) {
        alert("Error parsing backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  window.loadDemoData = function (skipConfirm = false) {
    if (!skipConfirm && !confirm("Load realistic demo scores for all 12 rounds and finals?")) return;

    fixtures.forEach((f, idx) => {
      // Realistic 15-point sudden death scores
      const scoreCombos = [
        [15, 11], [15, 13], [12, 15], [14, 15],
        [15, 9],  [10, 15], [15, 12], [8, 15]
      ];
      const combo = scoreCombos[idx % scoreCombos.length];
      f.s1 = combo[0];
      f.s2 = combo[1];
    });

    // Finals demo scores (21-point sets)
    const finalsCombos = [
      [21, 18], [19, 21], [21, 16]
    ];
    Object.keys(finalsScores).forEach((tier, tIdx) => {
      finalsScores[tier] = [
        { s1: finalsCombos[0][0], s2: finalsCombos[0][1] },
        { s1: finalsCombos[1][0], s2: finalsCombos[1][1] },
        { s1: finalsCombos[2][0], s2: finalsCombos[2][1] }
      ];
    });

    saveState();
    renderSchedule();
    renderLeaderboard();
    renderFinals();
    closeOrganizerModal();
    showToast("🎲 Realistic demo scores loaded for all 48 matches & finals!");
  };

  window.resetTournament = function (skipConfirm = false) {
    if (!skipConfirm && !confirm("⚠️ Are you sure you want to reset ALL scores to blank? This cannot be undone.")) return;

    fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));
    finalsScores = {
      gold:   [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      silver: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      bronze: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      copper: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
    };

    saveState();
    renderSchedule();
    renderLeaderboard();
    renderFinals();
    closeOrganizerModal();
    showToast("⚠️ All tournament scores have been reset to blank.");
  };

  window.printTournament = function () {
    window.print();
  };

  window.captureSchedulePhoto = function (customTargetId) {
    const target = (customTargetId && document.getElementById(customTargetId)) ||
                   document.querySelector('.sched-table-card') ||
                   document.getElementById('scheduleContainer');
    if (!target) {
      window.print();
      return;
    }
    showToast("📸 Capturing high-resolution scoresheet photo...");
    if (typeof html2canvas === 'undefined') {
      window.print();
      return;
    }
    html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#131b2e' : '#ffffff',
      scrollX: 0,
      scrollY: 0
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `badminton_cup_scoresheet_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast("✅ Scoresheet photo downloaded successfully!");
    }).catch(err => {
      console.warn("Screenshot capture error, falling back to print:", err);
      window.print();
    });
  };

  // ---------- TOURNAMENT AI ASSISTANT CONCIERGE ----------
  window.toggleAiChat = function () {
    const drawer = document.getElementById("aiChatDrawer");
    if (!drawer) return;
    const isHidden = drawer.classList.contains("hidden");
    drawer.classList.toggle("hidden", !isHidden);
    if (isHidden) {
      setTimeout(() => document.getElementById("aiChatInput")?.focus(), 100);
    }
  };

  window.askAiPrompt = function (text) {
    const input = document.getElementById("aiChatInput");
    if (input) input.value = text;
    window.handleAiChatSubmit();
  };

  window.handleAiChatSubmit = function (e) {
    if (e) e.preventDefault();
    const input = document.getElementById("aiChatInput");
    const container = document.getElementById("aiChatMessages");
    if (!input || !container) return;
    const query = input.value.trim();
    if (!query) return;

    // Append user message
    const userMsg = document.createElement("div");
    userMsg.className = "ai-msg user";
    userMsg.textContent = query;
    container.appendChild(userMsg);
    input.value = "";

    // Process AI response
    setTimeout(() => {
      const response = processAiQuery(query);
      const botMsg = document.createElement("div");
      botMsg.className = "ai-msg bot";
      botMsg.innerHTML = response;
      container.appendChild(botMsg);
      container.scrollTop = container.scrollHeight;
    }, 180);

    container.scrollTop = container.scrollHeight;
  };

  function processAiQuery(rawQ) {
    const q = rawQ.toLowerCase();
    const selPlayer = document.getElementById("playerSelect")?.value || "";

    // STRICT PRIVACY CHECK: Player levels / ratings / rankings before tournament
    if (
      q.includes("rating") || q.includes("rated") || q.includes("level") ||
      q.includes("skill") || q.includes("strong") || q.includes("junior") ||
      q.includes("intermediate") || q.includes("tier 3") || q.includes("tier 2") ||
      q.includes("tier 1") || q.includes("handicap") || q.includes("seeding level") ||
      q.includes("who is better") || q.includes("who is best") || q.includes("who is strong")
    ) {
      return `🏸 <strong>Player Privacy &amp; Fair Play Policy:</strong><br>
All 24 players in the Sindh Boys Badminton Cup compete in balanced round-robin pods. Individual prior skill ratings or organizer levels are strictly private and not disclosed.<br><br>
All players receive equal playing time (8 matches), and all rankings are determined purely by your performance, wins, and points earned on court today! 🌟`;
    }

    // Knocking / Warm-up
    if (q.includes("knock") || q.includes("warm") || q.includes("warmup")) {
      return `⏱️ <strong>Knocking &amp; Warm-up Rules:</strong><br>
• <strong>Before 12:00 PM:</strong> 15 minutes of free knocking across all courts.<br>
• <strong>Start of Each Block (R1, R4, R7, R10):</strong> Strict 60–90 seconds only.<br>
• <strong>Inside the Block (Matches 2 &amp; 3):</strong> ZERO knocking! Referees step directly onto court as next players.<br>
• <strong>Stage 2 Finals:</strong> 2 minutes warm-up before championship matches.`;
    }

    // Gold Qualification
    if (q.includes("gold") || q.includes("reach gold") || q.includes("qualify")) {
      return `🥇 <strong>How to Reach the Gold Championship:</strong><br>
Finish in the <strong>Top 6 (Ranks 1 through 6)</strong> on the official leaderboard at 2:00 PM.<br><br>
<strong>Ranking Formula:</strong><br>
1. Total Wins (out of 8)<br>
2. Net Point Differential (+/-)<br>
3. Total Points Scored<br><br>
• <strong>6–8 Wins:</strong> Almost guaranteed Gold.<br>
• <strong>5 Wins:</strong> High probability if you win by large point margins! Every rally counts!`;
    }

    // Referee Duties
    if (q.includes("ref") || q.includes("umpire") || q.includes("line judge") || q.includes("duty")) {
      return `👀 <strong>Referee &amp; Line Judge Duties:</strong><br>
• <strong>Ref 1 (Scorekeeper):</strong> Stands near diagonal corner, announces score before each serve, and submits match scores in this portal.<br>
• <strong>Ref 2 (Line Judge):</strong> Positions at the opposite diagonal corner, judging baseline and sideline calls.<br>
• Every player referees exactly <strong>4 matches</strong> during Stage 1.`;
    }

    // Court Availability
    if (q.includes("court") && (q.includes("where") || q.includes("which") || q.includes("available") || q.includes("venue"))) {
      return `🏸 <strong>Court Allocations:</strong><br>
• <strong>Block 1 (12:00–12:30 PM):</strong> Courts 1, 2, 5, 8<br>
• <strong>Blocks 2–4 (12:30–2:00 PM):</strong> Courts 1, 2, 3, 8<br>
• <strong>Stage 2 Finals (2:00–3:00 PM):</strong><br>
  - Gold: Court 1<br>
  - Silver: Court 2<br>
  - Bronze: Court 3<br>
  - Copper: Court 8`;
    }

    // Schedule / Times
    if (q.includes("time") || q.includes("schedule") || q.includes("block")) {
      return `📅 <strong>Tournament Timeline:</strong><br>
• <strong>12:00–12:30 PM:</strong> Stage 1 Block 1 (R01–R03)<br>
• <strong>12:30–1:00 PM:</strong> Stage 1 Block 2 (R04–R06)<br>
• <strong>1:00–1:30 PM:</strong> Stage 1 Block 3 (R07–R09)<br>
• <strong>1:30–2:00 PM:</strong> Stage 1 Block 4 (R10–R12)<br>
• <strong>2:00–3:00 PM:</strong> Stage 2 Championship Finals (Gold, Silver, Bronze, Copper)<br>
• <strong>3:00 PM:</strong> Awards Ceremony &amp; Mug Presentations 🏆`;
    }

    // Check if query mentions a specific player or if user has a player selected
    let targetPlayer = PLAYERS.find(p => q.includes(p.toLowerCase()));
    if (!targetPlayer && selPlayer) {
      targetPlayer = selPlayer;
    }

    // Handle questions about "how many matches I played", "current score", "my rank", "reach gold"
    const asksAboutRecordOrMatches = q.includes("how many match") || q.includes("matches i played") || q.includes("games i played") || q.includes("how many game") || q.includes("my score") || q.includes("current score") || q.includes("my rank") || q.includes("standing") || q.includes("my stat") || q.includes("record");
    const asksAboutGoldChances = q.includes("in the gold") || q.includes("to be in gold") || q.includes("reach gold") || q.includes("qualify for gold") || q.includes("get to gold") || q.includes("make gold");

    if (targetPlayer) {
      const leaderboard = computeLeaderboard();
      const pStats = leaderboard.find(s => s.name === targetPlayer) || { gp: 0, wins: 0, losses: 0, pts: 0, pa: 0, diff: 0, rank: 24, tier: 'Copper' };
      const rank6 = leaderboard[5] || { name: 'Rank 6', wins: 4, diff: 0, pts: 0 };
      const remainingMatches = Math.max(0, 8 - pStats.gp);
      const diffFormatted = pStats.diff > 0 ? `+${pStats.diff}` : `${pStats.diff}`;

      // 1. Specific Query: How much to reach Gold / Can I reach Gold?
      if (asksAboutGoldChances || (q.includes("gold") && (q.includes("how") || q.includes("can i") || q.includes("need")))) {
        if (pStats.rank <= 6) {
          return `🥇 <strong>Gold Status for ${targetPlayer}:</strong><br>
🎉 <strong>You are currently in GOLD position (Rank #${pStats.rank})!</strong><br>
• <strong>Current Record:</strong> ${pStats.wins}W - ${pStats.gp - pStats.wins}L (Diff: <strong>${diffFormatted}</strong>)<br>
• <strong>Remaining Matches:</strong> <strong>${remainingMatches}</strong> match${remainingMatches === 1 ? '' : 'es'} left.<br><br>
💡 <strong>Strategy:</strong> Winning ${remainingMatches > 0 ? (remainingMatches === 1 ? 'your final match' : '1–2 more matches') : 'all matches'} and maintaining a positive differential will lock in your Court 1 Gold Championship spot!`;
        } else {
          const winsBehind = Math.max(0, rank6.wins - pStats.wins);
          return `🎯 <strong>Pathway to Gold for ${targetPlayer}:</strong><br>
• <strong>Current Position:</strong> Rank <strong>#${pStats.rank}</strong> (${pStats.tier} Pool)<br>
• <strong>Your Record:</strong> ${pStats.wins}W - ${pStats.gp - pStats.wins}L (Diff: <strong>${diffFormatted}</strong>, ${pStats.pts} pts)<br>
• <strong>Current 6th Place Cutoff (${rank6.name}):</strong> ${rank6.wins}W, Diff ${rank6.diff > 0 ? '+' : ''}${rank6.diff}<br>
• <strong>Matches Left to Play:</strong> <strong>${remainingMatches}</strong><br><br>
💡 <strong>What you need:</strong> You have ${remainingMatches} matches left. Aim to win ${Math.min(remainingMatches, winsBehind + 1)} matches by high margins (e.g. 15–6, 15–8) to boost your differential into the Top 6! Every rally counts!`;
        }
      }

      // 2. Specific Query: Matches played, current score, standings
      if (asksAboutRecordOrMatches) {
        return `📊 <strong>Live Tournament Stats for ${targetPlayer}:</strong><br>
• <strong>Matches Played:</strong> <strong>${pStats.gp} of 8</strong> (${remainingMatches} remaining)<br>
• <strong>Record:</strong> <strong>${pStats.wins} Wins - ${pStats.gp - pStats.wins} Losses</strong><br>
• <strong>Points Scored:</strong> <strong>${pStats.pts}</strong> (Points Conceded: ${pStats.pa})<br>
• <strong>Net Point Differential:</strong> <strong>${diffFormatted}</strong><br>
• <strong>Official Standing:</strong> <strong>Rank #${pStats.rank}</strong> (${pStats.tier} Pool)<br><br>
<em>Rankings update live after every completed match!</em>`;
      }

      // Find all partners
      const partners = [];
      fixtures.forEach(f => {
        if (f.t1.includes(targetPlayer)) partners.push(f.t1.find(p => p !== targetPlayer));
        if (f.t2.includes(targetPlayer)) partners.push(f.t2.find(p => p !== targetPlayer));
      });

      if (q.includes("partner")) {
        return `👥 <strong>${targetPlayer}'s 8 Unique Partners:</strong><br>${partners.map((p, i) => `• Match ${i+1}: <strong>${p}</strong>`).join("<br>")}<br><br><em>100% unique partners guaranteed across all 8 matches!</em>`;
      }

      // Next match or status
      const nextMatch = fixtures.find(f => (f.s1 == null || f.s2 == null) && (f.t1.includes(targetPlayer) || f.t2.includes(targetPlayer) || f.refs.includes(targetPlayer)));
      if (nextMatch) {
        const isRef = nextMatch.refs.includes(targetPlayer);
        const cInfo = COURT_INFO[nextMatch.c] || { name: `Court ${nextMatch.c}` };
        if (isRef) {
          return `👀 <strong>Next Duty for ${targetPlayer}:</strong><br>Refereeing in <strong>Round ${nextMatch.r} (${ROUND_TIMES[nextMatch.r] || ''})</strong> on <strong>${cInfo.name}</strong> with partner referee.`;
        } else {
          const partner = nextMatch.t1.includes(targetPlayer) 
            ? nextMatch.t1.find(p => p !== targetPlayer) 
            : nextMatch.t2.find(p => p !== targetPlayer);
          const opponents = nextMatch.t1.includes(targetPlayer) ? nextMatch.t2.join(" & ") : nextMatch.t1.join(" & ");
          return `🏸 <strong>Next Match for ${targetPlayer}:</strong><br>• <strong>Round ${nextMatch.r} (${ROUND_TIMES[nextMatch.r] || ''})</strong> on <strong>${cInfo.name}</strong><br>• Partner: <strong>${partner}</strong><br>• Opponents: <strong>${opponents}</strong>`;
        }
      } else {
        // All matches played or general schedule summary
        const pMatches = fixtures.filter(f => f.t1.includes(targetPlayer) || f.t2.includes(targetPlayer));
        return `📋 <strong>${targetPlayer}</strong> plays in Rounds: <strong>${pMatches.map(m => 'R' + String(m.r).padStart(2, '0')).join(', ')}</strong>.<br>Partners: ${partners.slice(0, 4).join(', ')}, etc.<br>Current Record: <strong>${pStats.wins}W - ${pStats.gp - pStats.wins}L</strong> (Rank #${pStats.rank}).`;
      }
    } else if (asksAboutRecordOrMatches || asksAboutGoldChances) {
      return `👤 <strong>Personalized Live Stats:</strong><br>
Please select your name from the <strong>"Filter By Player"</strong> dropdown at the top, or ask with your name (e.g. <em>"What is Ajeet's current score?"</em> or <em>"How can Amit reach Gold?"</em>), and I will calculate your exact live standing and cutoff requirements!`;
    }

    // Generic helpful fallback
    return `🏸 <strong>Tournament Assistant:</strong><br>
I can answer questions about match times, courts, partners, referee duties, or rules.<br><br>
Try asking:<br>
• <em>"When is Ajeet playing?"</em><br>
• <em>"Who are my partners?"</em> (Select your name in the dropdown)<br>
• <em>"How do I qualify for Gold?"</em><br>
• <em>"How much knocking time do we get?"</em>`;
  }

  // ---------- INITIALIZATION ----------
  document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1" || params.get("demo") === "true") {
      sessionStorage.setItem("badminton_admin_unlocked", "true");
      loadDemoData(true);
    } else {
      loadState();
    }

    updateAdminUI();
    populatePlayerSelect();
    renderSchedule();
    renderLeaderboard();
    renderFinals();

    // Set active court filter button
    document.querySelectorAll('.court-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.court === currentCourtFilter);
    });
  });

})();

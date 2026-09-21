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
    1: { num: 1, label: "Block 1 (12:00 PM – 12:30 PM)", desc: "Courts 1, 2, 5, 8 • 6-Player Pods • Zero Inter-Court Movement", icon: "🏸" },
    4: { num: 2, label: "Block 2 (12:30 PM – 1:00 PM)", desc: "Courts 1, 2, 3, 8 • Reshuffle #1 Complete • 6-Player Pods Locked", icon: "🔄" },
    7: { num: 3, label: "Block 3 (1:00 PM – 1:30 PM)", desc: "Courts 1, 2, 3, 8 • Halfway Mark & Reshuffle #2 Complete • 6-Player Pods Locked", icon: "⚡" },
    10: { num: 4, label: "Block 4 (1:30 PM – 2:00 PM)", desc: "Courts 1, 2, 3, 8 • Final Reshuffle #3 Complete • Sprint to Finals", icon: "🔥" }
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
    "m": "M01",
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
    "m": "M02",
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
    "m": "M03",
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
    "m": "M04",
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
    "m": "M05",
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
    "m": "M06",
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
    "m": "M07",
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
    "m": "M08",
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
    "m": "M09",
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
    "m": "M10",
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
    "m": "M11",
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
    "m": "M12",
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
    "m": "M13",
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
    "m": "M14",
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
    "m": "M15",
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
    "m": "M16",
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
    "m": "M17",
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
    "m": "M18",
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
    "m": "M19",
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
    "m": "M20",
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
    "m": "M21",
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
    "m": "M22",
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
    "m": "M23",
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
    "m": "M24",
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
    "m": "M25",
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
    "m": "M26",
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
    "m": "M27",
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
    "m": "M28",
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
    "m": "M29",
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
    "m": "M30",
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
    "m": "M31",
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
    "m": "M32",
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
    "m": "M33",
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
    "m": "M34",
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
    "m": "M35",
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
    "m": "M36",
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
    "m": "M37",
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
    "m": "M38",
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
    "m": "M39",
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
    "m": "M40",
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
    "m": "M41",
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
    "m": "M42",
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
    "m": "M43",
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
    "m": "M44",
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
    "m": "M45",
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
    "m": "M46",
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
    "m": "M47",
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
    "m": "M48",
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

  const RECORDED_STAGE1_SCORES = {
    M01: [15, 12],
    M02: [15, 11],
    M03: [15, 14],
    M04: [10, 15],
    M05: [11, 15],
    M06: [15, 10],
    M07: [15, 14],
    M08: [15, 5],
    M09: [15, 14],
    M10: [15, 7],
    M11: [15, 7],
    M12: [15, 14],
    M13: [15, 4],
    M14: [14, 15],
    M15: [15, 9],
    M16: [11, 15],
    M17: [15, 9],
    M18: [15, 13],
    M19: [15, 7],
    M20: [12, 15],
    M21: [9, 15],
    M22: [15, 6],
    M23: [4, 15],
    M24: [9, 15],
    M25: [7, 15],
    M26: [9, 15],
    M27: [15, 7],
    M28: [15, 11],
    M29: [15, 9],
    M30: [11, 15],
    M31: [15, 7],
    M32: [15, 7],
    M33: [15, 13],
    M34: [15, 7],
    M35: [15, 4],
    M36: [15, 13],
    M37: [15, 9],
    M38: [14, 15],
    M39: [15, 14],
    M40: [15, 13],
    M41: [15, 4],
    M42: [15, 10],
    M43: [15, 6],
    M44: [12, 15],
    M45: [12, 15],
    M46: [13, 15],
    M47: [15, 12],
    M48: [8, 15]
  };
  window.RECORDED_STAGE1_SCORES = RECORDED_STAGE1_SCORES;

  const RECORDED_FINALS_POOLS = [
    {
      key: "gold",
      label: "Gold Championship (Court 1)",
      courtNum: 1,
      cls: "tier-gold",
      teams: [
        ["Ranjeet", "Naresh"],
        ["Partab", "Rajesh M."],
        ["Wijai", "Ajeet"]
      ],
      matches: [
        { id: "G1", matchCode: "G1", poolKey: "gold", court: 1, t1: ["Ranjeet", "Naresh"], t2: ["Partab", "Rajesh M."], refs: ["Wijai", "Ajeet"], t1Id: "A", t2Id: "B", refId: "C" },
        { id: "G2", matchCode: "G2", poolKey: "gold", court: 1, t1: ["Ranjeet", "Naresh"], t2: ["Wijai", "Ajeet"], refs: ["Partab", "Rajesh M."], t1Id: "A", t2Id: "C", refId: "B" },
        { id: "G3", matchCode: "G3", poolKey: "gold", court: 1, t1: ["Partab", "Rajesh M."], t2: ["Wijai", "Ajeet"], refs: ["Ranjeet", "Naresh"], t1Id: "B", t2Id: "C", refId: "A" }
      ]
    },
    {
      key: "silver",
      label: "Silver Plate (Court 2)",
      courtNum: 2,
      cls: "tier-silver",
      teams: [
        ["Hrithik", "Rakesh"],
        ["Sunny", "Manoj"],
        ["Sarwan", "Deepak"]
      ],
      matches: [
        { id: "S1", matchCode: "S1", poolKey: "silver", court: 2, t1: ["Hrithik", "Rakesh"], t2: ["Sunny", "Manoj"], refs: ["Sarwan", "Deepak"], t1Id: "A", t2Id: "B", refId: "C" },
        { id: "S2", matchCode: "S2", poolKey: "silver", court: 2, t1: ["Hrithik", "Rakesh"], t2: ["Sarwan", "Deepak"], refs: ["Sunny", "Manoj"], t1Id: "A", t2Id: "C", refId: "B" },
        { id: "S3", matchCode: "S3", poolKey: "silver", court: 2, t1: ["Sunny", "Manoj"], t2: ["Sarwan", "Deepak"], refs: ["Hrithik", "Rakesh"], t1Id: "B", t2Id: "C", refId: "A" }
      ]
    },
    {
      key: "bronze",
      label: "Bronze Shield (Court 3)",
      courtNum: 3,
      cls: "tier-bronze",
      teams: [
        ["Sanjay", "Rohit"],
        ["Pardeep", "Honey"],
        ["Om", "Raja"]
      ],
      matches: [
        { id: "B1", matchCode: "B1", poolKey: "bronze", court: 3, t1: ["Sanjay", "Rohit"], t2: ["Pardeep", "Honey"], refs: ["Om", "Raja"], t1Id: "A", t2Id: "B", refId: "C" },
        { id: "B2", matchCode: "B2", poolKey: "bronze", court: 3, t1: ["Sanjay", "Rohit"], t2: ["Om", "Raja"], refs: ["Pardeep", "Honey"], t1Id: "A", t2Id: "C", refId: "B" },
        { id: "B3", matchCode: "B3", poolKey: "bronze", court: 3, t1: ["Pardeep", "Honey"], t2: ["Om", "Raja"], refs: ["Sanjay", "Rohit"], t1Id: "B", t2Id: "C", refId: "A" }
      ]
    },
    {
      key: "copper",
      label: "Copper Cup (Court 8)",
      courtNum: 8,
      cls: "tier-copper",
      teams: [
        ["Amit", "Rajesh N."],
        ["Vinod", "Shashi"],
        ["Hira", "Vijay"]
      ],
      matches: [
        { id: "C1", matchCode: "C1", poolKey: "copper", court: 8, t1: ["Amit", "Rajesh N."], t2: ["Vinod", "Shashi"], refs: ["Hira", "Vijay"], t1Id: "A", t2Id: "B", refId: "C" },
        { id: "C2", matchCode: "C2", poolKey: "copper", court: 8, t1: ["Amit", "Rajesh N."], t2: ["Hira", "Vijay"], refs: ["Vinod", "Shashi"], t1Id: "A", t2Id: "C", refId: "B" },
        { id: "C3", matchCode: "C3", poolKey: "copper", court: 8, t1: ["Vinod", "Shashi"], t2: ["Hira", "Vijay"], refs: ["Amit", "Rajesh N."], t1Id: "B", t2Id: "C", refId: "A" }
      ]
    }
  ];
  window.RECORDED_FINALS_POOLS = RECORDED_FINALS_POOLS;

  const RECORDED_FINALS_SCORES = {
    gold:   [ { s1: 12, s2: 21 }, { s1: 11, s2: 21 }, { s1: 9, s2: 21 } ],
    silver: [ { s1: 21, s2: 5 },  { s1: 21, s2: 11 }, { s1: 13, s2: 21 } ],
    bronze: [ { s1: 21, s2: 19 }, { s1: 21, s2: 17 }, { s1: 21, s2: 20 } ],
    copper: [ { s1: 21, s2: 12 }, { s1: 21, s2: 8 },  { s1: 21, s2: 15 } ]
  };
  window.RECORDED_FINALS_SCORES = RECORDED_FINALS_SCORES;

  // Deep clone to avoid mutating baseline
  let fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));

  // Expose on window for external views (schedule.html, poster.html, console debugging)
  window.BASE_FIXTURES = BASE_FIXTURES;
  window.getFixtures = function() { return fixtures; };
  window.ROSTER = ROSTER;
  window.PLAYERS = PLAYERS;
  window.BLOCKS = BLOCKS;
  window.ROUND_TIMES = ROUND_TIMES;

  const FINALS_TARGET_SCORE = 21; // 1 set to 21 points sudden death (established tournament rule)

  let finalsScores = {
    gold:   [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
    silver: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
    bronze: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
    copper: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
  };

  // Phase 7: Array-based playoff structure per pool
  let finalsPlayoffs = {
    gold: [],
    silver: [],
    bronze: [],
    copper: []
  };

  let currentCourtFilter = "all"; // 'all', '1', '2', '3', '5', '8'
  let currentBlockFilter = "all"; // 'all', '1', '2', '3', '4'
  let scheduleViewMode = (typeof window !== 'undefined' && window.innerWidth <= 768) ? "cards" : "table"; // 'table' or 'cards'

  // ---------- PHASE 6: STAGE 1 LOCK STATE ----------
  let stage1Locked = false;             // true after organizer confirms lock
  let stage1LockedAt = null;            // ISO string timestamp of lock
  let officialStage1Rankings = null;    // deep-cloned snapshot of computeLeaderboard() at lock time
  let tieResolutions = {};              // { 'tie-group-id': ['Player A', 'Player B', ...] }
  let officialFinalsPools = null;       // buildFinalsPools(officialStage1Rankings) stored at lock time

  // Phase 7.5: Scorekeeper Mode state
  let skSelectedMatchCode = "";
  let skCourtFilter = "all";
  let skSearchQuery = "";
  let skIsEditing = false;
  let skRecentEntries = [];
  let skIsSaving = false;

  // Phase 7.6: Score Activity Log (Audit trail with timestamps)
  let scoreActivityLog = [];

  window.FINALS_TARGET_SCORE = FINALS_TARGET_SCORE;
  window.isStage1Locked = function () { return stage1Locked; };
  window.getStage1Locked = function () { return stage1Locked; };
  window.getStage1LockedAt = function () { return stage1LockedAt; };
  window.getOfficialStage1Rankings = function () { return officialStage1Rankings; };
  window.getOfficialFinalsPools = function () { return officialFinalsPools; };
  window.getTieResolutions = function () { return tieResolutions; };
  window.getFinalsScores = function () { return finalsScores; };
  window.getFinalsPlayoffs = function () { return finalsPlayoffs; };
  window.getSkRecentEntries = function () { return skRecentEntries; };
  window.getScoreActivityLog = function () { return scoreActivityLog; };
  window.setScoreActivityLog = function (arr) { scoreActivityLog = arr; };

  // ---------- PHASE 8: FIREBASE LIVE SYNCHRONIZATION ENGINE ----------
  let isFirebaseSyncActive = false;
  let skLoadedRevision = 0;

  function initFirebaseSync() {
    if (typeof TournamentFirebase === 'undefined') return;

    const overlay = document.getElementById('loadingOverlay');
    const offlineBanner = document.getElementById('offlineBanner');

    // Show loading skeleton until first snapshot resolves
    if (overlay && !sessionStorage.getItem('badminton_initial_loaded')) {
      overlay.classList.remove('hidden');
    }

    const tRef = TournamentFirebase.getTournamentRef();
    if (!tRef) {
      if (overlay) overlay.classList.add('hidden');
      return;
    }

    isFirebaseSyncActive = true;

    tRef.on('value', function (snap) {
      const data = snap.val();
      if (overlay) {
        overlay.classList.add('hidden');
        sessionStorage.setItem('badminton_initial_loaded', 'true');
      }

      TournamentFirebase.markInitialSnapshotReceived();

      if (!data) {
        // Cloud tournament node is completely empty
        if (TournamentFirebase.isAuthorized()) {
          const initModal = document.getElementById('initCloudModal');
          if (initModal && !sessionStorage.getItem('badminton_cloud_init_dismissed')) {
            initModal.classList.add('open');
          }
        }
        return;
      }

      // Ingest authoritative cloud state
      applyCloudTournamentState(data);
    }, function (err) {
      console.warn('[FirebaseSync] Listener error / offline:', err);
      if (overlay) overlay.classList.add('hidden');
      if (offlineBanner) offlineBanner.style.display = 'flex';
      TournamentFirebase.setConnectionState('OFFLINE');
    });

    // Connection state changes
    TournamentFirebase.onConnectionChange(function (state) {
      if (offlineBanner) {
        offlineBanner.style.display = (state === 'OFFLINE') ? 'flex' : 'none';
      }
    });

    // Auth state changes
    TournamentFirebase.onAuthChange(function () {
      updateAdminUI();
      renderScorekeeperView();
    });
  }
  window.initFirebaseSync = initFirebaseSync;

  function applyCloudTournamentState(cloudState) {
    if (!cloudState) return;

    // 1. Stage 1 Scores & Revisions
    if (cloudState.stage1Scores) {
      fixtures.forEach((f, idx) => {
        const fullMatchCode = f.m || ('M' + String(idx + 1).padStart(2, '0'));
        const mScore = cloudState.stage1Scores[fullMatchCode];
        if (mScore) {
          f.s1 = (mScore.s1 != null && mScore.s1 !== '') ? Number(mScore.s1) : null;
          f.s2 = (mScore.s2 != null && mScore.s2 !== '') ? Number(mScore.s2) : null;
          f.revision = Number(mScore.revision) || 1;
          f.updatedAt = mScore.updatedAt || null;
        } else {
          f.s1 = null;
          f.s2 = null;
          f.revision = 0;
          f.updatedAt = null;
        }
      });
    }

    // 2. Stage 1 Lock State
    if (cloudState.stage1Lock) {
      const lock = cloudState.stage1Lock;
      if (lock.locked === true) {
        stage1Locked = true;
        stage1LockedAt = lock.lockedAt || null;
        officialStage1Rankings = lock.officialStage1Rankings || lock.rankings || null;
        officialFinalsPools = lock.officialFinalsPools || lock.finalsPools || null;
        tieResolutions = lock.tieResolutions || {};
      } else {
        stage1Locked = false;
        stage1LockedAt = null;
        officialStage1Rankings = null;
        officialFinalsPools = null;
        tieResolutions = {};
      }
    }

    // 3. Finals Scores
    if (cloudState.finalsScores) {
      finalsScores = {
        gold: cloudState.finalsScores.gold || [{ s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null }],
        silver: cloudState.finalsScores.silver || [{ s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null }],
        bronze: cloudState.finalsScores.bronze || [{ s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null }],
        copper: cloudState.finalsScores.copper || [{ s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null }]
      };
    }

    // 4. Finals Playoffs
    if (cloudState.finalsPlayoffs) {
      finalsPlayoffs = {
        gold: cloudState.finalsPlayoffs.gold || [],
        silver: cloudState.finalsPlayoffs.silver || [],
        bronze: cloudState.finalsPlayoffs.bronze || [],
        copper: cloudState.finalsPlayoffs.copper || []
      };
    }

    // 5. Score Activity Log
    if (cloudState.scoreActivityLog) {
      const logArray = Array.isArray(cloudState.scoreActivityLog)
        ? cloudState.scoreActivityLog
        : Object.values(cloudState.scoreActivityLog);

      logArray.sort((a, b) => {
        const timeA = a.serverTimestamp || Date.parse(a.timestamp) || 0;
        const timeB = b.serverTimestamp || Date.parse(b.timestamp) || 0;
        return timeB - timeA;
      });
      scoreActivityLog = logArray;
    }

    // Cache locally for offline spectator viewing
    try {
      localStorage.setItem('badminton_cached_cloud_state', JSON.stringify({
        cachedAt: new Date().toISOString(),
        cloudState
      }));
    } catch (e) {}

    // Refresh affected UI views reactively
    renderSchedule();
    renderLeaderboard();
    renderFinals();
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
    renderScorekeeperView();
  }
  window.applyCloudTournamentState = applyCloudTournamentState;

  // ---------- PERSISTENCE & SAFE MIGRATION ----------
  const STORAGE_KEY = 'badminton_cup_portal_data_v11';
  const LEGACY_STORAGE_KEY_V10 = 'badminton_cup_portal_data_v10';
  const LEGACY_STORAGE_KEY_V9 = 'badminton_cup_portal_data_v9';
  const LEGACY_STORAGE_KEY_V8 = 'badminton_cup_portal_data_v8';
  const PLAYER_IDENTITY_KEY = 'badminton_player_identity';

  function getStoredPlayerIdentity() {
    try {
      const stored = localStorage.getItem(PLAYER_IDENTITY_KEY);
      if (stored && PLAYERS.includes(stored)) return stored;
    } catch (e) {
      console.warn("Could not read player identity:", e);
    }
    return null;
  }
  window.getStoredPlayerIdentity = getStoredPlayerIdentity;

  function setPlayerIdentity(playerName) {
    try {
      if (playerName && PLAYERS.includes(playerName)) {
        localStorage.setItem(PLAYER_IDENTITY_KEY, playerName);
        const sel = document.getElementById("playerSelect");
        if (sel) sel.value = playerName;
        const onb = document.getElementById("onboardingSelect");
        if (onb) onb.value = playerName;
      } else {
        localStorage.removeItem(PLAYER_IDENTITY_KEY);
        const sel = document.getElementById("playerSelect");
        if (sel) sel.value = "";
      }
    } catch (e) {
      console.warn("Could not store player identity:", e);
    }
    renderHomeDashboard();
    renderSchedule();
    renderLeaderboard();
  }
  window.setPlayerIdentity = setPlayerIdentity;

  function saveState() {
    try {
      const identity = getStoredPlayerIdentity();
      const payload = {
        fixtures,
        finalsScores,
        finalsPlayoffs,
        selectedPlayer: identity || document.getElementById("playerSelect")?.value || "",
        currentCourtFilter,
        scheduleViewMode,
        theme: (document.documentElement && document.documentElement.getAttribute('data-theme')) || 'light',
        // Phase 6 lock state
        stage1Locked,
        stage1LockedAt,
        officialStage1Rankings,
        tieResolutions,
        officialFinalsPools,
        // Phase 7.5 Scorekeeper entries
        skRecentEntries: skRecentEntries.slice(0, 5),
        // Phase 7.6 Score activity log
        scoreActivityLog: scoreActivityLog.slice(0, 200)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("Could not save tournament state to localStorage:", e);
    }
  }
  window.saveState = saveState;

  function loadState() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Initial clean load of official completed tournament data (Stage 1 + Stage 2 Finals)
        fixtures.forEach(f => {
          if (typeof RECORDED_STAGE1_SCORES !== 'undefined' && RECORDED_STAGE1_SCORES[f.m]) {
            f.s1 = RECORDED_STAGE1_SCORES[f.m][0];
            f.s2 = RECORDED_STAGE1_SCORES[f.m][1];
            f.revision = 1;
            f.updatedAt = new Date().toISOString();
          }
        });
        stage1Locked = true;
        stage1LockedAt = new Date().toISOString();
        officialStage1Rankings = computeLeaderboard();
        if (typeof RECORDED_FINALS_POOLS !== 'undefined') {
          officialFinalsPools = JSON.parse(JSON.stringify(RECORDED_FINALS_POOLS));
        }
        if (typeof RECORDED_FINALS_SCORES !== 'undefined') {
          finalsScores = JSON.parse(JSON.stringify(RECORDED_FINALS_SCORES));
        }
        saveState(); // Ensure initial complete state is written immediately
        return;
      }
      const data = JSON.parse(raw);
      if (Array.isArray(data.fixtures) && data.fixtures.length === BASE_FIXTURES.length) {
        fixtures = data.fixtures;
        fixtures.forEach((f, idx) => {
          if (!f.m) f.m = BASE_FIXTURES[idx]?.m || ('M' + String(idx + 1).padStart(2, '0'));
        });
      }
      if (data.finalsScores) {
        finalsScores = {
          gold:   data.finalsScores.gold   || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
          silver: data.finalsScores.silver || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
          bronze: data.finalsScores.bronze || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
          copper: data.finalsScores.copper || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
        };
      }
      if (data.finalsPlayoffs) {
        finalsPlayoffs = {
          gold:   data.finalsPlayoffs.gold   || [],
          silver: data.finalsPlayoffs.silver || [],
          bronze: data.finalsPlayoffs.bronze || [],
          copper: data.finalsPlayoffs.copper || []
        };
      }
      // Phase 6 lock state restoration
      if (data.stage1Locked === true) {
        stage1Locked = true;
        stage1LockedAt = data.stage1LockedAt || null;
        officialStage1Rankings = data.officialStage1Rankings || null;
        tieResolutions = data.tieResolutions || {};
        officialFinalsPools = data.officialFinalsPools || null;
      }
      // Restore Phase 7.5 Scorekeeper recent entries
      if (Array.isArray(data.skRecentEntries)) {
        skRecentEntries = data.skRecentEntries;
      }
      // Restore Phase 7.6 Score activity log
      if (Array.isArray(data.scoreActivityLog)) {
        scoreActivityLog = data.scoreActivityLog;
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
      // Restore player identity preference
      const storedIdentity = localStorage.getItem(PLAYER_IDENTITY_KEY);
      if (storedIdentity && PLAYERS.includes(storedIdentity)) {
        const select = document.getElementById("playerSelect");
        if (select) select.value = storedIdentity;
      } else if (data && data.selectedPlayer && PLAYERS.includes(data.selectedPlayer)) {
        localStorage.setItem(PLAYER_IDENTITY_KEY, data.selectedPlayer);
        const select = document.getElementById("playerSelect");
        if (select) select.value = data.selectedPlayer;
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
    const authBadge = document.getElementById("organizerAuthBadge");
    const authBtn = document.getElementById("organizerAuthBtn");
    const isAuth = typeof TournamentFirebase !== 'undefined' && TournamentFirebase.isAuthorized();
    const user = typeof TournamentFirebase !== 'undefined' ? TournamentFirebase.getUser() : null;

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

    if (authBadge) {
      if (isAuth) {
        authBadge.textContent = "✓ Authorized (" + (user?.email ? user.email.split('@')[0] : 'Organizer') + ")";
        authBadge.classList.add("authorized");
        authBadge.classList.remove("unauthorized");
        authBadge.style.display = "inline-flex";
      } else if (user) {
        authBadge.textContent = "⚠️ Not Authorized";
        authBadge.classList.add("unauthorized");
        authBadge.classList.remove("authorized");
        authBadge.style.display = "inline-flex";
      } else {
        authBadge.style.display = "none";
      }
    }

    if (authBtn) {
      if (user) {
        authBtn.innerHTML = "<span>🔑</span> <span>Sign Out (" + (user.email ? user.email.split('@')[0] : 'Org') + ")</span>";
        authBtn.onclick = function () {
          if (confirm("Sign out of organizer scorekeeping account?")) {
            TournamentFirebase.signOutOrganizer();
          }
        };
      } else {
        authBtn.innerHTML = "<span>🔑</span> <span>Sign In</span>";
        authBtn.onclick = openAuthModal;
      }
    }

    if (lockArea) {
      if (isUnlocked) {
        lockArea.innerHTML = `
          <button type="button" class="header-pill-btn admin-pill-btn unlocked" onclick="lockAdmin()" title="Lock and return to participant view">
            <span>🔓</span> <span>Lock</span>
          </button>
        `;
      } else {
        lockArea.innerHTML = `
          <button type="button" id="adminLockBtn" class="header-pill-btn admin-pill-btn" onclick="toggleAdminLock()" title="Enter Organizer PIN (1234) to unlock score editing">
            <span>🔒</span> <span>Admin</span>
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

  // ---------- TAB NAVIGATION (Phase 3: Desktop & Mobile Synchronization) ----------
  window.switchTab = function (tab) {
    const tabs = ['home', 'mymatches', 'courts', 'fixtures', 'leaderboard', 'finals', 'scorekeeper', 'rules'];
    tabs.forEach((t) => {
      const panel = document.getElementById('tab-' + t);
      const btn = document.getElementById('tabBtn-' + t);
      const btnMob = document.getElementById('tabBtn-mob-' + t);
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
      if (btn) {
        btn.classList.toggle('active', isCurrent);
        if (isCurrent) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
      }
      if (btnMob) {
        btnMob.classList.toggle('active', isCurrent);
        if (isCurrent) btnMob.setAttribute('aria-current', 'page');
        else btnMob.removeAttribute('aria-current');
      }
    });

    // Close More menu bottom sheet if open
    closeMoreMenu();

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

    if (tab === 'home') renderHomeDashboard();
    if (tab === 'mymatches') renderMyMatches();
    if (tab === 'courts') renderCourtView();
    if (tab === 'leaderboard') renderLeaderboard();
    if (tab === 'finals') renderFinals();
    if (tab === 'fixtures') renderSchedule();
    if (tab === 'scorekeeper') renderScorekeeperView();

    // Phase 7.6: In Scorekeeper Mode, hide Ask AI button so scorekeeper has clean uncluttered entry screen
    const aiToggleBtn = document.getElementById('aiChatToggleBtn');
    if (aiToggleBtn) {
      aiToggleBtn.style.display = (tab === 'scorekeeper') ? 'none' : 'inline-flex';
    }

    // Instant top-of-screen scroll per Requirement 18
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // ---------- COURT & BLOCK FILTERS (Phase 3) ----------
  window.filterByCourt = function (courtVal) {
    currentCourtFilter = courtVal;
    document.querySelectorAll('.court-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.court === courtVal);
    });
    renderSchedule();
    saveState();
  };

  window.filterByBlock = function (blockVal) {
    currentBlockFilter = blockVal;
    document.querySelectorAll('.block-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.block === blockVal);
    });
    renderSchedule();
  };

  window.filterByMine = function () {
    const player = getStoredPlayerIdentity();
    const select = document.getElementById("playerSelect");
    if (!player) {
      openPlayerSelector();
      return;
    }
    if (select) {
      if (select.value === player) {
        select.value = "";
      } else {
        select.value = player;
      }
    }
    saveState();
    renderSchedule();
    renderLeaderboard();
  };

  // ---------- MORE MENU CONTROLS (Phase 3) ----------
  window.openMoreMenu = function () {
    const modal = document.getElementById("moreMenuModal");
    if (!modal) return;
    modal.classList.add("open");
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const moreThemeIcon = document.getElementById("moreThemeIcon");
    if (moreThemeIcon) moreThemeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    const moreAdminTitle = document.getElementById("moreAdminTitle");
    if (moreAdminTitle) moreAdminTitle.textContent = isAdminUnlocked() ? "Admin Lock" : "Admin Unlock";
  };

  window.closeMoreMenu = function () {
    const modal = document.getElementById("moreMenuModal");
    if (modal) modal.classList.remove("open");
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMoreMenu();
      document.getElementById("playerOnboardingModal")?.classList.remove("open");
      closeOrganizerModal();
    }
  });

  // ---------- MATCH CONCLUSION & REUSABLE HELPERS (Phase 2) ----------
  function isMatchConcluded(f) {
    if (!f || f.s1 == null || f.s2 == null || f.s1 === "" || f.s2 === "") return false;
    const s1 = Number(f.s1);
    const s2 = Number(f.s2);
    return (s1 === 15 || s2 === 15) && s1 !== s2;
  }
  window.isMatchConcluded = isMatchConcluded;

  // ---------- COMPUTATIONS: STAGE 1 LEADERBOARD ----------
  function computeLeaderboard() {
    const stats = {};
    PLAYERS.forEach(p => {
      stats[p] = { name: p, gp: 0, wins: 0, pts: 0, ga: 0, pa: 0 };
    });

    fixtures.forEach(f => {
      if (!isMatchConcluded(f)) return;
      const s1 = Number(f.s1);
      const s2 = Number(f.s2);
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
  window.computeLeaderboard = computeLeaderboard;

  // ---------- REUSABLE PLAYER QUERY HELPERS (Requirement 18) ----------
  function getPlayerPlayingMatches(player) {
    if (!player) return [];
    return fixtures.filter(f => f.t1.includes(player) || f.t2.includes(player));
  }
  window.getPlayerPlayingMatches = getPlayerPlayingMatches;

  function getPlayerRefereeDuties(player) {
    if (!player) return [];
    return fixtures.filter(f => f.refs.includes(player));
  }
  window.getPlayerRefereeDuties = getPlayerRefereeDuties;

  function getPlayerAssignments(player) {
    if (!player) return [];
    const assignments = [];
    fixtures.forEach((f, idx) => {
      const isPlaying = f.t1.includes(player) || f.t2.includes(player);
      const isRef = f.refs.includes(player);
      if (!isPlaying && !isRef) return;
      assignments.push({
        type: isPlaying ? 'play' : 'ref',
        fixture: f,
        index: idx,
        isConcluded: isMatchConcluded(f)
      });
    });
    return assignments;
  }
  window.getPlayerAssignments = getPlayerAssignments;

  function getNextPlayerAssignment(player) {
    if (!player) return null;
    const allAssignments = getPlayerAssignments(player);

    const pendingAssignments = allAssignments.filter(a => !a.isConcluded);
    const nextAssignment = pendingAssignments[0] || null;
    const afterThatAssignment = pendingAssignments[1] || null;
    const playingAssignments = allAssignments.filter(a => a.type === 'play');
    const nextPlaying = playingAssignments.find(a => !a.isConcluded) || null;
    const refAssignments = allAssignments.filter(a => a.type === 'ref');
    const nextReferee = refAssignments.find(a => !a.isConcluded) || null;

    return {
      nextAssignment,
      afterThatAssignment,
      nextPlaying,
      nextReferee,
      allPlayerAssignments: allAssignments
    };
  }
  window.getNextPlayerAssignment = getNextPlayerAssignment;

  function getPlayerTournamentSummary(player) {
    if (!player) return null;
    const totalCompleted = fixtures.filter(isMatchConcluded).length;
    // Phase 6: Use official snapshot if locked, else live leaderboard
    const leaderboard = (stage1Locked && officialStage1Rankings) ? officialStage1Rankings : computeLeaderboard();
    const stats = leaderboard.find(s => s.name === player) || { gp: 0, wins: 0, pts: 0, pa: 0, diff: 0, rank: 24, tier: 'Copper' };
    const isStage1Complete = stats.gp === 8;
    const isStage1Locked = stage1Locked; // Phase 6: use the actual lock flag

    return {
      player,
      played: stats.gp,
      wins: stats.wins,
      losses: stats.gp - stats.wins,
      pts: stats.pts,
      pa: stats.pa,
      diff: stats.diff,
      rank: stats.rank,
      tier: stats.tier,
      isStage1Complete,
      isStage1Locked,
      totalTournamentCompleted: totalCompleted
    };
  }
  window.getPlayerTournamentSummary = getPlayerTournamentSummary;

  // ---------- ONBOARDING MODAL CONTROLS ----------
  function populateOnboardingSelect() {
    const select = document.getElementById("onboardingSelect");
    if (!select) return;
    const current = getStoredPlayerIdentity();
    select.innerHTML = '<option value="" disabled selected>-- Choose your name --</option>';
    ROSTER.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.name;
      opt.textContent = item.name;
      if (current === item.name) opt.selected = true;
      select.appendChild(opt);
    });
  }
  window.populateOnboardingSelect = populateOnboardingSelect;

  window.openPlayerSelector = function () {
    populateOnboardingSelect();
    const modal = document.getElementById("playerOnboardingModal");
    if (!modal) return;
    const title = modal.querySelector(".onboarding-title");
    if (title) title.textContent = "CHANGE PLAYER";
    const sub = modal.querySelector(".onboarding-sub");
    if (sub) sub.textContent = "Select your name from the 24-player roster to update your personalized tournament dashboard immediately.";
    const current = getStoredPlayerIdentity();
    const select = document.getElementById("onboardingSelect");
    if (select && current) select.value = current;
    modal.classList.add("open");
  };

  window.confirmPlayerOnboarding = function () {
    const select = document.getElementById("onboardingSelect");
    const chosen = select ? select.value : "";
    if (!chosen || !PLAYERS.includes(chosen)) {
      alert("Please select a valid player name from the list.");
      return;
    }
    setPlayerIdentity(chosen);
    document.getElementById("playerOnboardingModal")?.classList.remove("open");
    switchTab("home");
  };

  window.skipPlayerOnboarding = function () {
    document.getElementById("playerOnboardingModal")?.classList.remove("open");
    switchTab("fixtures");
  };

  // ---------- PHASE 7.6: PLAYER COURT JOURNEY HELPER ----------
  function getPlayerCourtJourney(player) {
    if (!player) return [];
    const blockTimes = {
      1: "12:00–12:30",
      2: "12:30–1:00",
      3: "1:00–1:30",
      4: "1:30–2:00"
    };

    const journey = [];
    for (let b = 1; b <= 4; b++) {
      const rStart = (b - 1) * 3 + 1;
      const rEnd = b * 3;
      const blockMatches = fixtures.filter(f => f.r >= rStart && f.r <= rEnd);
      // Find where player is involved (playing or refereeing)
      const pMatch = blockMatches.find(f => f.t1.includes(player) || f.t2.includes(player) || f.refs.includes(player));
      const court = pMatch ? pMatch.c : null;
      const isPlay = pMatch ? (pMatch.t1.includes(player) || pMatch.t2.includes(player)) : false;
      const isRef = pMatch ? pMatch.refs.includes(player) : false;

      let transition = "";
      if (b > 1 && journey[b - 2] && court != null) {
        const prevCourt = journey[b - 2].court;
        if (prevCourt === court) {
          transition = `STAY ON COURT ${court}`;
        } else {
          transition = `MOVE TO COURT ${court}`;
        }
      }

      journey.push({
        block: b,
        time: blockTimes[b] || "",
        court: court,
        role: isPlay ? 'PLAYING' : (isRef ? 'REFEREE' : 'DUTY'),
        transition: transition
      });
    }
    return journey;
  }
  window.getPlayerCourtJourney = getPlayerCourtJourney;

  // ---------- RENDERING: MY TOURNAMENT DASHBOARD (Phase 2 + Phase 7.6) ----------
  function renderHomeDashboard() {
    const container = document.getElementById("homeDashboardContainer");
    if (!container) return;

    const player = getStoredPlayerIdentity();
    if (!player) {
      container.innerHTML = `
        <div class="home-welcome-card" style="text-align: center; justify-content: center; flex-direction: column; padding: 36px 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🏸</div>
          <h2 style="margin: 0 0 8px; font-weight: 900; color: var(--text-primary);">Who Are You?</h2>
          <p style="color: var(--text-secondary); max-width: 440px; margin: 0 auto 18px; font-size: 0.95rem; line-height: 1.5;">
            Select your name to see your personalized match schedule, court assignments, queue status, and live standings.
          </p>
          <button type="button" class="btn-primary" style="padding: 12px 28px; font-size: 1rem; font-weight: 800; border-radius: var(--radius-full); cursor: pointer;" onclick="openPlayerSelector()">
            Select Your Name &rarr;
          </button>
        </div>
      `;
      return;
    }

    const summary = getPlayerTournamentSummary(player);
    const assignments = getNextPlayerAssignment(player);
    if (!summary || !assignments) return;

    // Active tournament Block calculation
    const activeFixture = fixtures.find(f => !isMatchConcluded(f));
    const currentTournamentBlock = activeFixture ? Math.ceil(activeFixture.r / 3) : 4;

    // Phase 7.6: Big Court Plan Table (Where should I be? Where do I go next?)
    const courtJourney = getPlayerCourtJourney(player);
    const courtPlanRowsHtml = courtJourney.map(j => {
      const isCurrent = j.block === currentTournamentBlock;
      const isNext = j.block === currentTournamentBlock + 1;

      let statusTagText = `BLOCK ${j.block}`;
      if (isCurrent) statusTagText = "YOU SHOULD BE AT";
      else if (isNext) statusTagText = "NEXT";

      let transitionBadge = "";
      if (j.transition) {
        const isStay = j.transition.startsWith("STAY");
        transitionBadge = `<div class="court-plan-transition ${isStay ? 'stay' : 'move'}">${isStay ? '🟢' : '🔄'} ${j.transition}</div>`;
      }

      let focusBtnHtml = "";
      if (isCurrent && j.court) {
        focusBtnHtml = `
          <button type="button" class="court-plan-focus-btn" onclick="focusCourt(${j.court})" title="Focus Court ${j.court}">
            <span>🏟️</span> View Court ${j.court} &rarr;
          </button>
        `;
      }

      return `
        <div class="court-plan-row ${isCurrent ? 'is-current' : (isNext ? 'is-next' : '')}">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
            <span class="court-plan-status-tag">${statusTagText}</span>
            <span class="court-plan-time">${j.time}</span>
          </div>
          <div class="court-plan-court-large">
            <span>COURT ${j.court || 'TBD'}</span>
            ${focusBtnHtml}
          </div>
          ${transitionBadge}
        </div>
      `;
    }).join("");

    const courtPlanHtml = `
      <div class="home-court-plan-card">
        <div class="court-plan-header">
          <div class="court-plan-title-wrap">
            <span class="court-plan-icon">🏟️</span>
            <div>
              <h3 class="court-plan-title">YOUR COURT PLAN</h3>
              <p class="court-plan-subtitle">Your exact assigned court for all 4 tournament blocks</p>
            </div>
          </div>
          <span class="court-plan-badge">STAGE 1 SCHEDULE</span>
        </div>
        <div class="court-plan-grid">
          ${courtPlanRowsHtml}
        </div>
      </div>
    `;

    // Determine current tournament status
    let statusBannerHtml = "";
    let nextDutyAlertHtml = "";

    if (summary.isStage1Complete) {
      statusBannerHtml = `
        <div class="home-status-banner status-complete">
          <span>🎉</span> STAGE 1 PLAY COMPLETE &bull; 8 of 8 Matches Finished &bull; Waiting for Finals Confirmation
        </div>
      `;
    } else if (summary.totalTournamentCompleted === 0) {
      statusBannerHtml = `
        <div class="home-status-banner status-waiting">
          <span>⏳</span> TOURNAMENT READY &bull; Stage 1 Matches Start at 12:00 PM
        </div>
      `;
    } else if (assignments.nextAssignment && assignments.nextAssignment.type === 'ref') {
      const rf = assignments.nextAssignment.fixture;
      statusBannerHtml = `
        <div class="home-status-banner status-ref">
          <span>👀</span> REFEREE DUTY &bull; Match ${rf.m} on Court ${rf.c} (Stage 1 &bull; Block ${Math.ceil(rf.r / 3)})
        </div>
      `;
    } else if (assignments.nextPlaying) {
      const pf = assignments.nextPlaying.fixture;
      const court = pf.c;
      const matchesAhead = fixtures.filter(m => m.c === court && fixtures.indexOf(m) < assignments.nextPlaying.index && !isMatchConcluded(m)).length;
      if (matchesAhead === 0) {
        statusBannerHtml = `
          <div class="home-status-banner status-ready">
            <span>🔥</span> READY / CURRENT &bull; Court ${court} is Up For Your Match!
          </div>
        `;
      } else if (matchesAhead === 1) {
        statusBannerHtml = `
          <div class="home-status-banner status-next">
            <span>⚡</span> UP NEXT &bull; 1 match away on Court ${court}
          </div>
        `;
      } else if (matchesAhead === 2) {
        statusBannerHtml = `
          <div class="home-status-banner status-waiting">
            <span>🕒</span> 2 MATCHES AWAY &bull; Court ${court}
          </div>
        `;
      } else {
        statusBannerHtml = `
          <div class="home-status-banner status-waiting">
            <span>🕒</span> UPCOMING &bull; ${matchesAhead} matches away on Court ${court}
          </div>
        `;
      }
    } else {
      statusBannerHtml = `
        <div class="home-status-banner status-complete">
          <span>✅</span> ALL ASSIGNMENTS COMPLETED
        </div>
      `;
    }

    // Immediate Referee Duty Card if officiating comes before playing
    if (!summary.isStage1Complete && assignments.nextAssignment && assignments.nextAssignment.type === 'ref') {
      const rf = assignments.nextAssignment.fixture;
      const otherRef = rf.refs.find(r => r !== player) || 'Partner Referee';
      nextDutyAlertHtml = `
        <div class="home-sub-card" style="border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.08);">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:#b45309; text-transform:uppercase; letter-spacing:0.5px;">
              ⚠️ NEXT RESPONSIBILITY: REFEREE DUTY
            </div>
            <div style="font-weight:900; font-size:1.05rem; margin-top:3px; color:var(--text-primary);">
              Match ${rf.m} &bull; Court ${rf.c} &bull; Stage 1 &bull; Block ${Math.ceil(rf.r / 3)}
            </div>
            <div style="font-size:0.84rem; color:var(--text-secondary); margin-top:3px;">
              Officiating: <strong>${rf.t1.join(' & ')}</strong> vs <strong>${rf.t2.join(' & ')}</strong>
              &bull; Partner Ref: <strong>${otherRef}</strong>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            <span class="badge" style="background:#f59e0b; color:#fff; font-weight:900; padding:6px 12px; font-size:0.82rem;">REFEREE</span>
            <button type="button" class="court-link-btn" onclick="focusCourt(${rf.c})" title="View Court ${rf.c} Departure Board"><span>🏟️</span> Court ${rf.c} &rarr;</button>
          </div>
        </div>
      `;
    }

    // Hero Match Card (Phase 7: Finals-aware)
    let heroCardHtml = "";
    const nextFinalsAssign = stage1Locked ? getNextPlayerFinalsAssignment(player) : null;
    const playerFinalsAll = stage1Locked ? getPlayerFinalsAssignments(player) : [];
    const isPlayerFinalsComplete = stage1Locked && playerFinalsAll.length > 0 && playerFinalsAll.every(a => a.concluded);

    if (stage1Locked && nextFinalsAssign) {
      if (nextFinalsAssign.duty === 'PLAY') {
        heroCardHtml = `
          <div class="hero-match-card" style="border-color: var(--primary);">
            <div class="hero-match-badge-bar">
              <span class="hero-match-title" style="color: var(--primary);">STAGE 2 FINALS &bull; ${nextFinalsAssign.status}</span>
              <div class="hero-match-badges">
                <span class="badge badge-court">COURT ${nextFinalsAssign.court}</span>
                <span class="badge badge-blue">MATCH ${nextFinalsAssign.id}</span>
                <span class="badge badge-gold">${nextFinalsAssign.poolLabel.split('(')[0].trim().toUpperCase()}</span>
              </div>
            </div>

            <div class="hero-pairing-container">
              <div class="hero-team-box is-you">
                <div class="hero-team-label">Your Team (Team ${nextFinalsAssign.teamLetter})</div>
                <div class="hero-team-names">YOU (${player})<br>+ ${nextFinalsAssign.partner}</div>
              </div>
              <div class="hero-vs-badge">VS</div>
              <div class="hero-team-box">
                <div class="hero-team-label">Opponents</div>
                <div class="hero-team-names">${nextFinalsAssign.opponents ? nextFinalsAssign.opponents[0] + '<br>+ ' + nextFinalsAssign.opponents[1] : 'TBD'}</div>
              </div>
            </div>

            <div class="hero-queue-hint" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div><span>📍</span> Court ${nextFinalsAssign.court} &bull; 21 Pts Sudden Death</div>
              <button type="button" class="court-link-btn" onclick="switchTab('finals')" title="View Finals"><span>🏅</span> View Finals &rarr;</button>
            </div>
          </div>
        `;
      } else {
        heroCardHtml = `
          <div class="hero-match-card" style="border-color: var(--primary);">
            <div class="hero-match-badge-bar">
              <span class="hero-match-title" style="color: var(--primary);">STAGE 2 FINALS &bull; NEXT ASSIGNMENT: REFEREE</span>
              <div class="hero-match-badges">
                <span class="badge badge-court">COURT ${nextFinalsAssign.court}</span>
                <span class="badge badge-ref">MATCH ${nextFinalsAssign.id}</span>
              </div>
            </div>

            <div class="hero-ref-body" style="padding: 12px 0;">
              <div style="font-size:1.05rem; font-weight:900; color:var(--text-primary); margin-bottom:4px;">
                Officiating Match ${nextFinalsAssign.id} on Court ${nextFinalsAssign.court}
              </div>
              <div style="font-size:0.88rem; color:var(--text-secondary);">
                ${nextFinalsAssign.t1.join(' & ')} vs ${nextFinalsAssign.t2.join(' & ')}
              </div>
            </div>

            <div class="hero-queue-hint" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div><span>👀</span> Officiating on Court ${nextFinalsAssign.court}</div>
              <button type="button" class="court-link-btn" onclick="switchTab('finals')" title="View Finals"><span>🏅</span> View Finals &rarr;</button>
            </div>
          </div>
        `;
      }
    } else if (isPlayerFinalsComplete) {
      const pPoolKey = playerFinalsAll[0].poolKey;
      const champInfo = getPoolChampion(pPoolKey);
      const isChamp = champInfo.isComplete && champInfo.championTeam && champInfo.championTeam.players.includes(player);
      heroCardHtml = `
        <div class="hero-match-card" style="border-color: var(--win-color);">
          <div class="hero-match-badge-bar">
            <span class="hero-match-title" style="color: var(--win-color);">🎉 FINALS COMPLETE</span>
            <span class="badge badge-gold">${playerFinalsAll[0].poolLabel.split('(')[0].trim().toUpperCase()}</span>
          </div>
          <h3 style="margin: 8px 0; font-size: 1.3rem; font-weight: 900; color: var(--text-primary);">
            ${isChamp ? `🏆 Congratulations, ${player}! You won the ${playerFinalsAll[0].poolLabel.split('(')[0].trim()}!` : `Great Tournament, ${player}!`}
          </h3>
          <p style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.5; margin: 0 0 16px;">
            All Finals matches in your division have concluded.
          </p>
          <button type="button" class="btn-primary" onclick="openWinnersModal()" style="font-weight:800; padding:8px 16px;">
            🏆 View Division Awards &rarr;
          </button>
        </div>
      `;
    } else if (summary.isStage1Complete) {
      heroCardHtml = `
        <div class="hero-match-card" style="border-color: var(--win-color);">
          <div class="hero-match-badge-bar">
            <span class="hero-match-title" style="color: var(--win-color);">🎉 STAGE 1 PLAY COMPLETE</span>
            <span class="badge badge-gold">8 OF 8 MATCHES PLAYED</span>
          </div>
          <h3 style="margin: 8px 0; font-size: 1.3rem; font-weight: 900; color: var(--text-primary);">Well Played, ${player}!</h3>
          <p style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.5; margin: 0 0 16px;">
            You have completed all 8 Stage 1 matches. Rankings will finalize once all 48 matches in Stage 1 conclude.
          </p>
          <div style="background: var(--bg-main); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
            <div>
              <div style="font-size:0.72rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Provisional Standing</div>
              <div style="font-size:1.25rem; font-weight:900; color:var(--text-primary);">Rank #${summary.rank}</div>
            </div>
            <div>
              <div style="font-size:0.72rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">${summary.isStage1Locked ? 'Official Qualification' : 'Projected Finals Pool'}</div>
              <div style="font-size:1.1rem; font-weight:900; color:var(--primary);">${summary.isStage1Locked ? 'QUALIFIED — ' : 'PROJECTED '}${summary.tier.toUpperCase()}</div>
            </div>
            <div>
              <div style="font-size:0.72rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Final Stage 1 Record</div>
              <div style="font-size:1.1rem; font-weight:900; color:var(--text-primary);">${summary.wins}W - ${summary.losses}L (${summary.diff > 0 ? '+' : ''}${summary.diff})</div>
            </div>
          </div>
          <div class="hero-queue-hint" style="margin-top: 14px;">
            <span>⏳</span> Waiting for Stage 1 completion and Finals confirmation.
          </div>
        </div>
      `;
    } else if (assignments.nextPlaying) {
      const pf = assignments.nextPlaying.fixture;
      const court = pf.c;
      const block = Math.ceil(pf.r / 3);
      const isT1 = pf.t1.includes(player);
      const partner = isT1 ? pf.t1.find(p => p !== player) : pf.t2.find(p => p !== player);
      const opponents = isT1 ? pf.t2 : pf.t1;
      const matchesAhead = fixtures.filter(m => m.c === court && fixtures.indexOf(m) < assignments.nextPlaying.index && !isMatchConcluded(m)).length;

      let queueHint = "";
      let heroTitle = "UP NEXT";
      if (summary.totalTournamentCompleted === 0) {
        heroTitle = "YOUR FIRST MATCH";
        queueHint = `Tournament begins at 12:00 PM &bull; First match on Court ${court}`;
      } else if (matchesAhead === 0) {
        heroTitle = "READY / CURRENT MATCH";
        queueHint = `🔥 This match is currently on or next up on Court ${court}!`;
      } else if (matchesAhead === 1) {
        heroTitle = "UP NEXT";
        queueHint = `⚡ 1 match before yours on Court ${court}`;
      } else {
        heroTitle = `${matchesAhead} MATCHES AWAY`;
        queueHint = `⏳ ${matchesAhead} matches before yours on Court ${court}`;
      }

      heroCardHtml = `
        <div class="hero-match-card">
          <div class="hero-match-badge-bar">
            <span class="hero-match-title">${heroTitle}</span>
            <div class="hero-match-badges">
              <span class="badge badge-court">COURT ${court}</span>
              <span class="badge badge-blue">MATCH ${pf.m}</span>
              <span class="badge badge-gray">STAGE 1 &bull; BLOCK ${block}</span>
            </div>
          </div>

          <div class="hero-pairing-container">
            <div class="hero-team-box is-you">
              <div class="hero-team-label">Your Team</div>
              <div class="hero-team-names">YOU (${player})<br>+ ${partner}</div>
            </div>
            <div class="hero-vs-badge">VS</div>
            <div class="hero-team-box">
              <div class="hero-team-label">Opponents</div>
              <div class="hero-team-names">${opponents[0]}<br>+ ${opponents[1]}</div>
            </div>
          </div>

          <div class="hero-queue-hint" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div><span>📍</span> ${queueHint}</div>
            <button type="button" class="court-link-btn" onclick="focusCourt(${court})" title="View Court ${court} Departure Board"><span>🏟️</span> View Court ${court} &rarr;</button>
          </div>
        </div>
      `;
    }

    // Secondary assignment: next referee duty if not already front-and-center
    let secondaryRefHtml = "";
    if (assignments.nextReferee && (!assignments.nextAssignment || assignments.nextAssignment.type === 'play')) {
      const rf = assignments.nextReferee.fixture;
      const otherRef = rf.refs.find(r => r !== player) || 'Partner Referee';
      secondaryRefHtml = `
        <div class="home-sub-card">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">
              AFTER THIS: NEXT REFEREE DUTY
            </div>
            <div style="font-weight:900; font-size:1rem; margin-top:2px; color:var(--text-primary);">
              Match ${rf.m} &bull; Court ${rf.c} &bull; Stage 1 &bull; Block ${Math.ceil(rf.r / 3)}
            </div>
            <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:2px;">
              Officiating with <strong>${otherRef}</strong> (${rf.t1.join(' & ')} vs ${rf.t2.join(' & ')})
            </div>
          </div>
          <span class="badge" style="background:rgba(37,99,235,0.12); color:var(--primary); font-weight:900;">OFFICIATING</span>
        </div>
      `;
    }

    // Stats Grid
    const rankDisplay = summary.totalTournamentCompleted === 0 ? "NOT STARTED" : `#${summary.rank}`;
    const rankLabel = summary.totalTournamentCompleted === 0 ? "STANDINGS" : (summary.isStage1Locked ? "OFFICIAL RANK" : "PROVISIONAL RANK");
    const POOL_FULL_NAMES = { Gold: 'Gold Championship', Silver: 'Silver Plate', Bronze: 'Bronze Shield', Copper: 'Copper Cup' };
    const poolLabel = summary.isStage1Locked ? "OFFICIAL FINALS POOL" : "PROJECTED POOL";
    const poolVal = summary.totalTournamentCompleted === 0 ? "TBD" : (summary.isStage1Locked
      ? `QUALIFIED — ${POOL_FULL_NAMES[summary.tier] || summary.tier}`
      : `PROJECTED ${summary.tier.toUpperCase()}`);

    const statsGridHtml = `
      <div class="home-stats-grid">
        <div class="home-stat-box">
          <div class="home-stat-label">Played</div>
          <div class="home-stat-val">${summary.played} / 8</div>
        </div>
        <div class="home-stat-box">
          <div class="home-stat-label">Record</div>
          <div class="home-stat-val">${summary.wins}W - ${summary.losses}L</div>
        </div>
        <div class="home-stat-box">
          <div class="home-stat-label">Point Diff</div>
          <div class="home-stat-val" style="color: ${summary.diff > 0 ? 'var(--win-color)' : (summary.diff < 0 ? 'var(--loss-color)' : 'inherit')};">
            ${summary.diff > 0 ? '+' : ''}${summary.diff}
          </div>
        </div>
        <div class="home-stat-box">
          <div class="home-stat-label">${rankLabel}</div>
          <div class="home-stat-val" style="${summary.totalTournamentCompleted === 0 ? 'font-size:0.92rem;' : ''}">${rankDisplay}</div>
        </div>
        <div class="home-stat-box">
          <div class="home-stat-label">${poolLabel}</div>
          <div class="home-stat-val" style="font-size:0.92rem;">${poolVal}</div>
        </div>
      </div>
    `;

    // Personalized Timeline
    const timelineHtml = `
      <div class="home-timeline-card">
        <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-secondary); margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <span>📅 YOUR TOURNAMENT TIMELINE (${assignments.allPlayerAssignments.length} ASSIGNMENTS)</span>
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">8 Matches + Officiating</span>
        </div>
        <div class="timeline-list">
          ${assignments.allPlayerAssignments.map(a => {
            const f = a.fixture;
            const isPlay = a.type === 'play';
            const block = Math.ceil(f.r / 3);
            if (a.isConcluded) {
              if (isPlay) {
                const s1 = Number(f.s1);
                const s2 = Number(f.s2);
                const isT1 = f.t1.includes(player);
                const won = (isT1 && s1 === 15) || (!isT1 && s2 === 15);
                const yourScore = isT1 ? s1 : s2;
                const oppScore = isT1 ? s2 : s1;
                const partner = isT1 ? f.t1.find(p => p !== player) : f.t2.find(p => p !== player);
                return `
                  <div class="timeline-item" style="opacity: 0.75;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <span class="timeline-tag play">PLAY</span>
                      <strong>${f.m}</strong> &bull; Court ${f.c} &bull; Block ${block}
                      <span style="font-size:0.8rem; color:var(--text-muted);">(w/ ${partner})</span>
                    </div>
                    <span class="badge ${won ? 'badge-gold' : 'badge-gray'}">${won ? 'WIN' : 'LOSS'} ${yourScore}–${oppScore}</span>
                  </div>
                `;
              } else {
                return `
                  <div class="timeline-item" style="opacity: 0.75;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <span class="timeline-tag ref">REFEREE</span>
                      <strong>${f.m}</strong> &bull; Court ${f.c} &bull; Block ${block}
                    </div>
                    <span class="badge badge-gray">COMPLETED</span>
                  </div>
                `;
              }
            } else {
              if (isPlay) {
                const isT1 = f.t1.includes(player);
                const partner = isT1 ? f.t1.find(p => p !== player) : f.t2.find(p => p !== player);
                const opps = isT1 ? f.t2.join(' & ') : f.t1.join(' & ');
                return `
                  <div class="timeline-item">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <span class="timeline-tag play">PLAY</span>
                      <strong>${f.m}</strong> &bull; <strong>Court ${f.c}</strong> &bull; Block ${block}
                      <span style="font-size:0.8rem; color:var(--text-secondary);">w/ <strong>${partner}</strong> vs ${opps}</span>
                    </div>
                    <span class="badge badge-blue">UPCOMING</span>
                  </div>
                `;
              } else {
                const otherRef = f.refs.find(r => r !== player) || 'Partner';
                return `
                  <div class="timeline-item">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <span class="timeline-tag ref">REFEREE</span>
                      <strong>${f.m}</strong> &bull; <strong>Court ${f.c}</strong> &bull; Block ${block}
                      <span style="font-size:0.8rem; color:var(--text-secondary);">w/ <strong>${otherRef}</strong></span>
                    </div>
                    <span class="badge" style="background:rgba(245,158,11,0.18); color:#b45309; font-weight:800;">DUTY</span>
                  </div>
                `;
              }
            }
          }).join('')}
        </div>
      </div>
    `;

    container.innerHTML = `
      <!-- A. PLAYER WELCOME & SWITCH -->
      <div class="home-welcome-card">
        <div class="home-welcome-info">
          <div class="home-welcome-name">
            <span>🏸</span> <span>${player}</span>
          </div>
          <div class="home-welcome-stage">
            Stage 1 &bull; Block ${currentTournamentBlock}
          </div>
        </div>
        <button type="button" class="change-player-btn" onclick="openPlayerSelector()" title="Change selected player">
          <span>🔄</span> <span>Change</span>
        </button>
      </div>

      <!-- B. YOUR COURT PLAN (Highest Player Information Priority) -->
      ${courtPlanHtml}

      <!-- C. CURRENT TOURNAMENT STATUS -->
      ${statusBannerHtml}

      <!-- D1. NEXT REFEREE DUTY (If immediate) -->
      ${nextDutyAlertHtml}

      <!-- D2. NEXT MATCH HERO CARD -->
      ${heroCardHtml}

      <!-- D3. NEXT REFEREE DUTY (If playing comes first) -->
      ${secondaryRefHtml}

      <!-- E. COMPACT PERSONAL STATISTICS -->
      ${statsGridHtml}

      <!-- F. UPCOMING PLAYING & REFEREE TIMELINE -->
      ${timelineHtml}
    `;
  }
  window.renderHomeDashboard = renderHomeDashboard;

  // ---------- MY MATCHES STATE & CONTROLS (Phase 4) ----------
  let myMatchesFilter = 'all';
  let myMatchesViewMode = 'cards';

  window.setMyMatchesFilter = function (filter) {
    myMatchesFilter = filter;
    renderMyMatches();
  };

  window.setMyMatchesViewMode = function (mode) {
    myMatchesViewMode = mode;
    renderMyMatches();
  };

  // ---------- RENDERING: MY MATCHES VIEW (Phase 4 Polish) ----------
  function renderMyMatches() {
    const container = document.getElementById("myMatchesContainer");
    if (!container) return;

    const player = getStoredPlayerIdentity();
    if (!player) {
      container.innerHTML = `
        <div class="home-welcome-card" style="text-align:center; justify-content:center; flex-direction:column; padding:36px 20px;">
          <div style="font-size:2.5rem; margin-bottom:8px;">🏸</div>
          <h2 style="margin:0 0 8px; font-weight:900; color:var(--text-primary);">Who Are You?</h2>
          <p style="color:var(--text-secondary); max-width:440px; margin:0 auto 18px; font-size:0.95rem; line-height:1.5;">
            Select your name to see your personal matches and referee duties.
          </p>
          <button type="button" class="btn-primary" style="padding:12px 28px; font-size:1rem; font-weight:800; border-radius:var(--radius-full); cursor:pointer;" onclick="openPlayerSelector()">
            SELECT PLAYER &rarr;
          </button>
        </div>
      `;
      return;
    }

    const assignments = getNextPlayerAssignment(player);
    const summary = getPlayerTournamentSummary(player);
    if (!assignments || !summary) return;

    const playingMatches = getPlayerPlayingMatches(player);
    const refDuties = getPlayerRefereeDuties(player);

    const completedPlays = playingMatches.filter(isMatchConcluded);
    const upcomingPlays = playingMatches.filter(f => !isMatchConcluded(f));
    const completedRefs = refDuties.filter(isMatchConcluded);
    const upcomingRefs = refDuties.filter(f => !isMatchConcluded(f));

    // A. NEXT ASSIGNMENT SECTION (With "AFTER THAT" Preview)
    let nextSectionHtml = "";
    if (assignments.nextAssignment) {
      const na = assignments.nextAssignment;
      const f = na.fixture;
      const isPlay = na.type === 'play';
      const court = f.c;
      const block = Math.ceil(f.r / 3);
      const matchesAhead = fixtures.filter(m => m.c === court && fixtures.indexOf(m) < na.index && !isMatchConcluded(m)).length;

      let queueHint = "";
      if (summary.totalTournamentCompleted === 0) {
        queueHint = `Tournament begins at 12:00 PM &bull; First match on Court ${court}`;
      } else if (matchesAhead === 0) {
        queueHint = `🔥 READY ON COURT &bull; Your assignment is next up on Court ${court}!`;
      } else if (matchesAhead === 1) {
        queueHint = `⚡ UP NEXT &bull; 1 match before yours on Court ${court}`;
      } else {
        const slotsAway = assignments.allPlayerAssignments.findIndex(a => a.index === na.index) - assignments.allPlayerAssignments.filter(a => a.isConcluded).length;
        queueHint = `⏳ ${matchesAhead} matches before yours on Court ${court}${slotsAway > 1 ? ` (${slotsAway} assignments away)` : ''}`;
      }

      // "AFTER THAT" Preview (Requirement 4)
      let afterThatHtml = "";
      if (assignments.afterThatAssignment) {
        const at = assignments.afterThatAssignment;
        const atF = at.fixture;
        const atIsPlay = at.type === 'play';
        const atCourt = atF.c;
        const atBlock = Math.ceil(atF.r / 3);
        if (atIsPlay) {
          const isT1 = atF.t1.includes(player);
          const partner = isT1 ? atF.t1.find(p => p !== player) : atF.t2.find(p => p !== player);
          const opps = isT1 ? atF.t2 : atF.t1;
          afterThatHtml = `
            <div class="after-that-box">
              <div class="after-that-label"><span>➡️</span> AFTER THAT: PLAY</div>
              <div class="after-that-meta">
                <span class="match-pill">${atF.m}</span>
                <span class="block-label">Block ${atBlock}</span>
                <span class="badge badge-court">Court ${atCourt}</span>
              </div>
              <div class="after-that-teams">
                <span class="you-tag">YOU</span> ${player} + ${partner} vs ${opps.join(' & ')}
              </div>
            </div>
          `;
        } else {
          const otherRef = atF.refs.find(r => r !== player) || 'Partner';
          afterThatHtml = `
            <div class="after-that-box">
              <div class="after-that-label"><span>➡️</span> AFTER THAT: REFEREE DUTY</div>
              <div class="after-that-meta">
                <span class="match-pill">${atF.m}</span>
                <span class="block-label">Block ${atBlock}</span>
                <span class="badge badge-court">Court ${atCourt}</span>
                <span class="badge badge-ref">DUTY</span>
              </div>
              <div class="after-that-teams">
                Officiating with <strong>${otherRef}</strong>: ${atF.t1.join(' & ')} vs ${atF.t2.join(' & ')}
              </div>
            </div>
          `;
        }
      }

      if (isPlay) {
        const isT1 = f.t1.includes(player);
        const partner = isT1 ? f.t1.find(p => p !== player) : f.t2.find(p => p !== player);
        const opps = isT1 ? f.t2 : f.t1;
        nextSectionHtml = `
          <div class="my-matches-section">
            <div class="section-title-row">
              <h3 class="section-title">⚡ NEXT ASSIGNMENT &bull; PLAY</h3>
              <span class="badge badge-court">COURT ${court}</span>
            </div>
            <div class="match-card hero-style">
              <div class="card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="match-pill">${f.m}</span>
                  <span class="block-label">Stage 1 &bull; Block ${block}</span>
                </div>
                <span class="badge badge-blue">UP NEXT</span>
              </div>
              <div class="card-pairing-box">
                <div class="team-col is-you">
                  <span class="team-sub-label">Your Team</span>
                  <div class="team-players"><span class="you-tag">YOU</span> ${player}<br>+ ${partner}</div>
                </div>
                <div class="vs-col">VS</div>
                <div class="team-col">
                  <span class="team-sub-label">Opponents</span>
                  <div class="team-players">${opps[0]}<br>+ ${opps[1]}</div>
                </div>
              </div>
              <div class="card-meta">
                <div><span>📍</span> ${queueHint}</div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span>👀 Referees:</span> ${f.refs.join(' & ')}
                  <button type="button" class="court-link-btn" onclick="focusCourt(${court})" title="View Court ${court} Departure Board"><span>🏟️</span> Court ${court} &rarr;</button>
                </div>
              </div>
              ${afterThatHtml}
            </div>
          </div>
        `;
      } else {
        const otherRef = f.refs.find(r => r !== player) || 'Partner Referee';
        const dutyIndex = refDuties.findIndex(rf => rf.m === f.m) + 1;
        nextSectionHtml = `
          <div class="my-matches-section">
            <div class="section-title-row">
              <h3 class="section-title">⚠️ NEXT ASSIGNMENT &bull; REFEREE DUTY</h3>
              <span class="badge badge-ref">DUTY ${dutyIndex} OF 4</span>
            </div>
            <div class="match-card ref-style">
              <div class="card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="match-pill">${f.m}</span>
                  <span class="block-label">Stage 1 &bull; Block ${block}</span>
                  <span class="badge badge-court">Court ${court}</span>
                </div>
                <span class="badge badge-ref">DUTY</span>
              </div>
              <div style="padding:10px 14px; font-size:0.92rem; color:var(--text-primary); font-weight:700;">
                Officiating: <strong>${f.t1.join(' & ')}</strong> vs <strong>${f.t2.join(' & ')}</strong>
              </div>
              <div class="card-meta">
                <div><span>📍</span> ${queueHint}</div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span>Partner Ref:</span> <strong>${otherRef}</strong>
                  <button type="button" class="court-link-btn" onclick="focusCourt(${court})" title="View Court ${court} Departure Board"><span>🏟️</span> Court ${court} &rarr;</button>
                </div>
              </div>
              ${afterThatHtml}
            </div>
          </div>
        `;
      }
    } else {
      nextSectionHtml = `
        <div class="my-matches-section">
          <div class="match-card" style="text-align:center; padding:24px;">
            <div style="font-size:2rem; margin-bottom:6px;">🎉</div>
            <h3 style="font-size:1.15rem; font-weight:900; color:var(--win-color);">All Stage 1 Assignments Completed!</h3>
            <p style="font-size:0.88rem; color:var(--text-muted); margin-top:4px;">You have finished all 8 playing matches and 4 referee duties. Waiting for Finals!</p>
          </div>
        </div>
      `;
    }

    // B. UPCOMING PLAYING MATCHES SECTION
    const upcomingPlaysHtml = upcomingPlays.length === 0
      ? `<div style="font-size:0.85rem; color:var(--text-muted); padding:10px;">No upcoming playing matches remaining in Stage 1.</div>`
      : upcomingPlays.map(f => {
          const court = f.c;
          const block = Math.ceil(f.r / 3);
          const isT1 = f.t1.includes(player);
          const partner = isT1 ? f.t1.find(p => p !== player) : f.t2.find(p => p !== player);
          const opps = isT1 ? f.t2 : f.t1;
          return `
            <div class="match-card">
              <div class="card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="match-pill">${f.m}</span>
                  <span class="block-label">Block ${block}</span>
                  <span class="badge badge-court">Court ${court}</span>
                </div>
                <span class="badge badge-blue">UPCOMING</span>
              </div>
              <div class="card-pairing-box compact">
                <div class="team-col is-you">
                  <span class="team-sub-label">Partner</span>
                  <div class="team-players"><span class="you-tag">YOU</span> ${player} + ${partner}</div>
                </div>
                <div class="vs-col">VS</div>
                <div class="team-col">
                  <span class="team-sub-label">Opponents</span>
                  <div class="team-players">${opps.join(' & ')}</div>
                </div>
              </div>
              <div class="card-meta">
                <div><span>👀 Refs:</span> ${f.refs.join(' & ')}</div>
              </div>
            </div>
          `;
        }).join('');

    // C. REFEREE DUTIES SECTION (With 4-pip Progress Bar)
    const pipsHtml = [1, 2, 3, 4].map(num => {
      const isFilled = num <= completedRefs.length;
      return `<span class="ref-pip ${isFilled ? 'filled' : 'empty'}">${isFilled ? '■' : '□'}</span>`;
    }).join('');

    const refDutiesHtml = refDuties.map((f, idx) => {
      const court = f.c;
      const block = Math.ceil(f.r / 3);
      const isDone = isMatchConcluded(f);
      const otherRef = f.refs.find(r => r !== player) || 'Partner';
      return `
        <div class="match-card ref-style" style="opacity:${isDone ? '0.75' : '1'};">
          <div class="card-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="match-pill">${f.m}</span>
              <span class="block-label">Block ${block}</span>
              <span class="badge badge-court">Court ${court}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge" style="font-size:0.75rem; background:rgba(245,158,11,0.15); color:#b45309; font-weight:800;">Duty ${idx + 1} of 4</span>
              <span class="badge ${isDone ? 'badge-gray' : 'badge-ref'}">${isDone ? 'COMPLETED' : 'UPCOMING'}</span>
            </div>
          </div>
          <div style="padding:8px 12px; font-size:0.86rem; color:var(--text-secondary);">
            Match: <strong>${f.t1.join(' & ')}</strong> vs <strong>${f.t2.join(' & ')}</strong>
          </div>
          <div class="card-meta">
            <div><span>Co-Referee:</span> <strong>${otherRef}</strong></div>
          </div>
        </div>
      `;
    }).join('');

    // D. COMPLETED MATCHES SECTION
    const completedPlaysHtml = completedPlays.length === 0
      ? `<div style="font-size:0.85rem; color:var(--text-muted); padding:10px;">No completed matches recorded yet.</div>`
      : completedPlays.map(f => {
          const court = f.c;
          const block = Math.ceil(f.r / 3);
          const s1 = Number(f.s1);
          const s2 = Number(f.s2);
          const isT1 = f.t1.includes(player);
          const won = (isT1 && s1 === 15) || (!isT1 && s2 === 15);
          const yourScore = isT1 ? s1 : s2;
          const oppScore = isT1 ? s2 : s1;
          const partner = isT1 ? f.t1.find(p => p !== player) : f.t2.find(p => p !== player);
          const opps = isT1 ? f.t2 : f.t1;
          return `
            <div class="match-card ${won ? 'card-won' : 'card-lost'}">
              <div class="card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="match-pill">${f.m}</span>
                  <span class="block-label">Block ${block}</span>
                  <span class="badge badge-court">Court ${court}</span>
                </div>
                <span class="badge ${won ? 'badge-gold' : 'badge-gray'}">${won ? 'WIN ✓' : 'LOSS'}</span>
              </div>
              <div class="match-score-table">
                <div class="score-team-row ${won ? 'is-winner' : ''}">
                  <span><span class="you-tag">YOU</span> ${player} + ${partner}</span>
                  <span class="score-num">${yourScore}</span>
                </div>
                <div class="score-team-row ${!won ? 'is-winner' : ''}">
                  <span>${opps.join(' & ')}</span>
                  <span class="score-num">${oppScore}</span>
                </div>
              </div>
            </div>
          `;
        }).join('');

    // E. CHRONOLOGICAL TIMELINE VIEW (Requirement 8)
    const allAssignments = assignments.allPlayerAssignments;
    const timelineRowsHtml = allAssignments.map(a => {
      const f = a.fixture;
      const isPlay = a.type === 'play';
      const block = Math.ceil(f.r / 3);
      const isConcluded = a.isConcluded;
      const isNext = assignments.nextAssignment && assignments.nextAssignment.index === a.index;

      let statusBadge = "";
      let detailText = "";
      if (isConcluded) {
        if (isPlay) {
          const s1 = Number(f.s1);
          const s2 = Number(f.s2);
          const isT1 = f.t1.includes(player);
          const won = (isT1 && s1 === 15) || (!isT1 && s2 === 15);
          const yourScore = isT1 ? s1 : s2;
          const oppScore = isT1 ? s2 : s1;
          statusBadge = `<span class="badge ${won ? 'badge-gold' : 'badge-gray'}">${won ? 'WIN ✓' : 'LOSS'} ${yourScore}–${oppScore}</span>`;
          const partner = isT1 ? f.t1.find(p => p !== player) : f.t2.find(p => p !== player);
          const opps = isT1 ? f.t2 : f.t1;
          detailText = `w/ ${partner} vs ${opps.join(' & ')}`;
        } else {
          statusBadge = `<span class="badge badge-gray">COMPLETED ✓</span>`;
          detailText = `Officiated: ${f.t1.join(' & ')} vs ${f.t2.join(' & ')}`;
        }
      } else if (isNext) {
        statusBadge = `<span class="badge badge-blue">UP NEXT</span>`;
        if (isPlay) {
          const isT1 = f.t1.includes(player);
          const partner = isT1 ? f.t1.find(p => p !== player) : f.t2.find(p => p !== player);
          const opps = isT1 ? f.t2 : f.t1;
          detailText = `w/ ${partner} vs ${opps.join(' & ')}`;
        } else {
          const otherRef = f.refs.find(r => r !== player) || 'Partner';
          detailText = `Officiating with ${otherRef}`;
        }
      } else {
        statusBadge = `<span class="badge badge-pending">UPCOMING</span>`;
        if (isPlay) {
          const isT1 = f.t1.includes(player);
          const partner = isT1 ? f.t1.find(p => p !== player) : f.t2.find(p => p !== player);
          const opps = isT1 ? f.t2 : f.t1;
          detailText = `w/ ${partner} vs ${opps.join(' & ')}`;
        } else {
          const otherRef = f.refs.find(r => r !== player) || 'Partner';
          detailText = `Officiating with ${otherRef}`;
        }
      }

      return `
        <div class="timeline-row ${isNext ? 'is-next' : ''} ${!isPlay ? 'is-ref' : ''}">
          <div class="timeline-row-left">
            <span class="match-pill">${f.m}</span>
            <span class="badge badge-court">C${f.c}</span>
            <span class="badge ${isPlay ? 'badge-blue' : 'badge-ref'}">${isPlay ? 'PLAY' : 'REF'}</span>
          </div>
          <div class="timeline-row-mid">
            <div class="timeline-row-title">${detailText}</div>
            <div class="timeline-row-sub">Block ${block}</div>
          </div>
          <div class="timeline-row-right">
            ${statusBadge}
          </div>
        </div>
      `;
    }).join('');

    // BUILD FINAL CONTENT BASED ON VIEW MODE & FILTERS
    let mainBodyHtml = "";
    if (myMatchesViewMode === 'timeline') {
      mainBodyHtml = `
        <div class="my-matches-section">
          <div class="section-title-row">
            <h3 class="section-title">⚡ COMPLETE TIMELINE (12 ASSIGNMENTS)</h3>
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">8 Playing + 4 Referee</span>
          </div>
          <div class="timeline-view-table">
            ${timelineRowsHtml}
          </div>
        </div>
      `;
    } else {
      // Cards view with filter support
      if (myMatchesFilter === 'all') {
        mainBodyHtml = `
          <!-- Section A: Next Assignment -->
          ${nextSectionHtml}

          <!-- Section B: Upcoming Matches -->
          <div class="my-matches-section">
            <h3 class="section-title">📅 UPCOMING MATCHES (${upcomingPlays.length})</h3>
            <div class="mobile-card-list">
              ${upcomingPlaysHtml}
            </div>
          </div>

          <!-- Section C: Referee Duties -->
          <div class="my-matches-section">
            <div class="ref-progress-header">
              <h3 class="section-title">👀 REFEREE DUTIES</h3>
              <div class="ref-progress-indicator">
                <span>${completedRefs.length} of 4 completed</span>
                <div class="ref-pips">${pipsHtml}</div>
              </div>
            </div>
            <div class="mobile-card-list">
              ${refDutiesHtml}
            </div>
          </div>

          <!-- Section D: Completed Matches -->
          <div class="my-matches-section">
            <h3 class="section-title">✅ COMPLETED MATCHES (${completedPlays.length})</h3>
            <div class="mobile-card-list">
              ${completedPlaysHtml}
            </div>
          </div>
        `;
      } else if (myMatchesFilter === 'playing') {
        mainBodyHtml = `
          <div class="my-matches-section">
            <h3 class="section-title">📅 ALL PLAYING MATCHES (${playingMatches.length})</h3>
            <div class="mobile-card-list">
              ${upcomingPlaysHtml}
              ${completedPlaysHtml}
            </div>
          </div>
        `;
      } else if (myMatchesFilter === 'referee') {
        mainBodyHtml = `
          <div class="my-matches-section">
            <div class="ref-progress-header">
              <h3 class="section-title">👀 REFEREE DUTIES (${refDuties.length})</h3>
              <div class="ref-progress-indicator">
                <span>${completedRefs.length} of 4 completed</span>
                <div class="ref-pips">${pipsHtml}</div>
              </div>
            </div>
            <div class="mobile-card-list">
              ${refDutiesHtml}
            </div>
          </div>
        `;
      } else if (myMatchesFilter === 'upcoming') {
        mainBodyHtml = `
          ${nextSectionHtml}
          <div class="my-matches-section">
            <h3 class="section-title">📅 UPCOMING PLAYING MATCHES (${upcomingPlays.length})</h3>
            <div class="mobile-card-list">
              ${upcomingPlaysHtml}
            </div>
          </div>
        `;
      } else if (myMatchesFilter === 'completed') {
        mainBodyHtml = `
          <div class="my-matches-section">
            <h3 class="section-title">✅ COMPLETED MATCHES (${completedPlays.length})</h3>
            <div class="mobile-card-list">
              ${completedPlaysHtml}
            </div>
          </div>
        `;
      }
    }

    // Phase 7: Stage 2 Finals Assignments section (cleanly separated from Stage 1)
    let finalsSectionHtml = "";
    if (stage1Locked) {
      const finalsAssigns = getPlayerFinalsAssignments(player);
      if (finalsAssigns.length > 0) {
        finalsSectionHtml = `
          <div class="my-matches-section" style="border: 2px solid var(--primary-border, rgba(37,99,235,0.3)); border-radius: var(--radius-lg); padding: 14px; background: rgba(37,99,235,0.03); margin-bottom: 20px;">
            <div class="section-title-row" style="margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
              <h3 class="section-title" style="color: var(--primary); margin:0;">🏅 STAGE 2 — FINALS (${finalsAssigns[0].poolLabel.split('(')[0].trim().toUpperCase()})</h3>
              <span class="badge badge-court">Court ${finalsAssigns[0].court}</span>
            </div>
            <div class="mobile-card-list">
              ${finalsAssigns.map(a => {
                const isPlay = a.duty === 'PLAY';
                const s1 = (a.s1 != null && a.s1 !== "") ? Number(a.s1) : null;
                const s2 = (a.s2 != null && a.s2 !== "") ? Number(a.s2) : null;
                const hasScore = s1 != null && s2 != null;
                const scoreText = hasScore ? `${s1} : ${s2}` : '-';

                let statusBadge = '<span class="wl-pill wl-pending">UPCOMING</span>';
                if (a.concluded) {
                  if (isPlay) {
                    statusBadge = `<span class="wl-pill ${a.won ? 'wl-win' : 'wl-loss'}">${a.won ? 'WON' : 'LOST'} (${scoreText})</span>`;
                  } else {
                    statusBadge = `<span class="wl-pill wl-win">OFFICIATED (${scoreText})</span>`;
                  }
                } else if (hasScore) {
                  statusBadge = `<span class="wl-pill wl-pending" style="opacity:0.8;">IN PROGRESS (${scoreText})</span>`;
                }

                return `
                  <div class="card ${a.concluded ? (a.won ? 'won' : (isPlay ? 'lost' : 'ref')) : ''} match-card">
                    <div class="card-top">
                      <div class="round-badge">
                        <span class="match-pill">${a.id}</span>
                        <span class="badge ${isPlay ? 'badge-blue' : 'badge-ref'}">${a.duty}</span>
                        <span class="badge badge-court">C${a.court}</span>
                      </div>
                      ${statusBadge}
                    </div>
                    <div class="card-matchup">
                      ${isPlay ? `
                        <div><strong>YOU</strong> (${player}) + ${a.partner}</div>
                        <div class="vs-text">VS</div>
                        <div>${a.opponents ? a.opponents.join(' & ') : 'TBD'}</div>
                      ` : `
                        <div style="font-size:0.85rem; color:var(--text-secondary);">
                          <strong>Officiating:</strong> ${a.t1.join(' & ')} vs ${a.t2.join(' & ')}
                        </div>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <!-- Compact Top Player Header (Requirement 13) -->
      <div class="my-matches-top-bar">
        <div class="my-matches-identity">
          <h2 class="my-matches-player-title"><span>🏸</span> ${player}</h2>
          <div class="my-matches-summary-chips">
            <span class="summary-chip playing">8 Matches (${summary.played} played &bull; ${summary.wins}W-${summary.losses}L)</span>
            <span class="summary-chip referee">4 Ref Duties (${completedRefs.length}/4 completed)</span>
          </div>
        </div>
        <button type="button" class="change-player-btn" onclick="openPlayerSelector()" title="Change Player">
          <span>🔄</span> Change Player
        </button>
      </div>

      <!-- Finals Section when locked -->
      ${finalsSectionHtml}

      <!-- Filters & View Toggle (Requirement 8 & 14) -->
      <div class="my-matches-filter-row">
        <div class="my-matches-filter-pills">
          <button type="button" class="pill-btn ${myMatchesFilter === 'all' ? 'active' : ''}" onclick="setMyMatchesFilter('all')">All</button>
          <button type="button" class="pill-btn ${myMatchesFilter === 'playing' ? 'active' : ''}" onclick="setMyMatchesFilter('playing')">Playing (${playingMatches.length})</button>
          <button type="button" class="pill-btn ${myMatchesFilter === 'referee' ? 'active' : ''}" onclick="setMyMatchesFilter('referee')">Referee (${refDuties.length})</button>
          <button type="button" class="pill-btn ${myMatchesFilter === 'upcoming' ? 'active' : ''}" onclick="setMyMatchesFilter('upcoming')">Upcoming (${upcomingPlays.length})</button>
          <button type="button" class="pill-btn ${myMatchesFilter === 'completed' ? 'active' : ''}" onclick="setMyMatchesFilter('completed')">Completed (${completedPlays.length})</button>
        </div>
        <div class="view-mode-toggle">
          <button type="button" class="pill-btn ${myMatchesViewMode === 'cards' ? 'active' : ''}" onclick="setMyMatchesViewMode('cards')" title="Detailed Cards">📋 Cards</button>
          <button type="button" class="pill-btn ${myMatchesViewMode === 'timeline' ? 'active' : ''}" onclick="setMyMatchesViewMode('timeline')" title="Timeline View">⚡ Timeline</button>
        </div>
      </div>

      ${mainBodyHtml}
    `;
  }
  window.renderMyMatches = renderMyMatches;

  // ---------- COURT QUEUE & VIEW CONTROLS (Phase 5: Gym Readiness) ----------
  let courtViewFilter = 'all';
  let courtViewGymMode = false;

  window.setCourtViewFilter = function (cStr) {
    courtViewFilter = cStr;
    renderCourtView();
  };

  window.toggleGymMode = function () {
    courtViewGymMode = !courtViewGymMode;
    renderCourtView();
  };

  window.focusCourt = function (courtNum) {
    courtViewFilter = String(courtNum);
    switchTab('courts');
    setTimeout(() => {
      const el = document.getElementById(`court-card-${courtNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  function getCourtQueue(courtNumber) {
    const cNum = Number(courtNumber);
    const courtFixtures = fixtures.filter(f => f.c === cNum);
    const completed = courtFixtures.filter(isMatchConcluded);
    const unconcluded = courtFixtures.filter(f => !isMatchConcluded(f));

    const currentMatch = unconcluded[0] || null;
    const upNextMatch = unconcluded[1] || null;
    const afterThatMatch = unconcluded[2] || null;

    const totalCount = courtFixtures.length;
    const completedCount = completed.length;
    const isStage1Complete = unconcluded.length === 0;

    let status = 'WAITING';
    let scoreText = '';

    if (isStage1Complete) {
      status = 'STAGE 1 COMPLETE';
    } else if (currentMatch) {
      const s1 = currentMatch.s1;
      const s2 = currentMatch.s2;
      const hasScores = s1 != null && s2 != null && s1 !== '' && s2 !== '';
      if (hasScores && (Number(s1) > 0 || Number(s2) > 0)) {
        status = 'IN PROGRESS';
        scoreText = `${s1}–${s2}`;
      } else {
        status = 'CURRENT / READY';
      }
    }

    return {
      court: cNum,
      fixtures: courtFixtures,
      completed,
      unconcluded,
      currentMatch,
      upNextMatch,
      afterThatMatch,
      totalCount,
      completedCount,
      isStage1Complete,
      status,
      scoreText
    };
  }
  window.getCourtQueue = getCourtQueue;

  function getVisibleCourtNumbers() {
    if (stage1Locked) {
      return [1, 2, 3, 8];
    }
    // Block 1: Courts 1, 2, 5, 8
    // Blocks 2-4: Courts 1, 2, 3, 8
    // Court 5 exists only in Block 1 (M02, M07, M11).
    // If Court 5 has any remaining unconcluded match, Court 5 is active.
    // Once Court 5 matches conclude, Court 3 is active.
    const court5Matches = fixtures.filter(f => f.c === 5);
    const court5Pending = court5Matches.filter(f => !isMatchConcluded(f)).length;
    if (court5Pending > 0) {
      return [1, 2, 5, 8];
    }
    return [1, 2, 3, 8];
  }
  window.getVisibleCourtNumbers = getVisibleCourtNumbers;

  // ---------- RENDERING: COURT VIEW (Phase 5 + Phase 7 Finals) ----------
  function renderCourtView() {
    const container = document.getElementById("courtsContainer");
    if (!container) return;

    const activePlayer = getStoredPlayerIdentity();
    const totalCompleted = fixtures.filter(isMatchConcluded).length;
    const isStage1AllComplete = totalCompleted === fixtures.length;
    const visibleCourts = getVisibleCourtNumbers();

    container.className = `courts-container ${courtViewGymMode ? 'gym-mode' : ''}`;

    // Shortcut for selected player
    let playerShortcutHtml = "";
    if (activePlayer) {
      if (stage1Locked) {
        const nextFinals = getNextPlayerFinalsAssignment(activePlayer);
        if (nextFinals) {
          const myCourt = nextFinals.court;
          const myRole = nextFinals.duty === 'PLAY' ? 'PLAYING' : 'REFEREE';
          playerShortcutHtml = `
            <div class="court-player-shortcut">
              <div>
                <strong><span>🏸</span> ${activePlayer}'s Next Finals Duty:</strong> Court ${myCourt} &bull; <strong>${myRole}</strong> in Match ${nextFinals.id} (${nextFinals.poolLabel.split('(')[0].trim()})
              </div>
              <button type="button" class="btn-primary" style="padding:4px 12px; font-size:0.8rem; border-radius:var(--radius-full); cursor:pointer;" onclick="setCourtViewFilter('${myCourt}')">
                🎯 Focus Court ${myCourt}
              </button>
            </div>
          `;
        }
      } else {
        const pAssign = getNextPlayerAssignment(activePlayer);
        if (pAssign && pAssign.nextAssignment) {
          const myCourt = pAssign.nextAssignment.fixture.c;
          const myMatch = pAssign.nextAssignment.fixture.m;
          const myRole = pAssign.nextAssignment.type === 'play' ? 'PLAYING' : 'REFEREE';
          playerShortcutHtml = `
            <div class="court-player-shortcut">
              <div>
                <strong><span>🏸</span> ${activePlayer}'s Next Assignment:</strong> Court ${myCourt} &bull; <strong>${myRole}</strong> in Match ${myMatch}
              </div>
              <button type="button" class="btn-primary" style="padding:4px 12px; font-size:0.8rem; border-radius:var(--radius-full); cursor:pointer;" onclick="setCourtViewFilter('${myCourt}')">
                🎯 Focus Court ${myCourt}
              </button>
            </div>
          `;
        }
      }
    }

    // Determine which courts to render
    const courtsToRender = courtViewFilter === 'all' 
      ? visibleCourts 
      : [Number(courtViewFilter)];

    // Build Court Cards
    const courtCardsHtml = courtsToRender.map(cNum => {
      const cInfo = COURT_INFO[cNum] || { name: `Court ${cNum}`, sub: "" };

      // Phase 7: Stage 2 Finals Court Departure Board
      if (stage1Locked) {
        const fq = getFinalsCourtQueue(cNum);
        if (!fq) return "";

        const poolNames = {
          gold:   { label: 'Gold Championship', cls: 'tier-gold', badge: 'badge-gold' },
          silver: { label: 'Silver Plate', cls: 'tier-silver', badge: 'badge-gray' },
          bronze: { label: 'Bronze Shield', cls: 'tier-bronze', badge: 'badge-court' },
          copper: { label: 'Copper Cup', cls: 'tier-copper', badge: 'badge-ref' }
        };
        const pMeta = poolNames[fq.poolKey] || { label: 'Finals Pool', cls: 'tier-gold', badge: 'badge-gold' };

        const hasYou = activePlayer && fq.currentMatch && (
          fq.currentMatch.t1.includes(activePlayer) ||
          fq.currentMatch.t2.includes(activePlayer) ||
          fq.currentMatch.refs.includes(activePlayer)
        );

        let courtBodyHtml = "";
        if (fq.isPoolComplete && fq.championTeam) {
          courtBodyHtml = `
            <div class="court-match-box" style="text-align:center; padding:18px;">
              <div style="font-size:1.6rem; margin-bottom:4px;">🏆</div>
              <div style="font-weight:900; color:var(--win-color); font-size:1.05rem;">${pMeta.label.toUpperCase()} COMPLETE</div>
              <div style="font-size:0.95rem; color:var(--text-primary); margin-top:4px;"><strong>Winner: Team ${fq.championTeam.id} (${fq.championTeam.name})</strong></div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:3px;">All 3 Finals matches concluded.</div>
            </div>
          `;
        } else if (fq.currentMatch) {
          const m = fq.currentMatch;
          const s1 = (m.s1 != null && m.s1 !== "") ? Number(m.s1) : null;
          const s2 = (m.s2 != null && m.s2 !== "") ? Number(m.s2) : null;
          const hasScores = s1 != null && s2 != null && (s1 > 0 || s2 > 0);
          const statusBadge = hasScores 
            ? `<span class="badge badge-gold">IN PROGRESS ${s1}–${s2}</span>` 
            : `<span class="badge badge-blue">CURRENT / READY</span>`;

          const formatCardP = (p) => (p === activePlayer ? `<span class="player-highlight-text"><span class="you-tag">YOU</span> ${p}</span>` : p);

          courtBodyHtml = `
            <div class="court-match-box">
              <div class="court-match-label">
                <span>MATCH ${m.id} &bull; 21 PTS SUDDEN DEATH</span>
                ${statusBadge}
              </div>
              <div class="court-teams-block">
                <div>🏸 <strong>Team ${m.t1Id}:</strong> ${m.t1.map(formatCardP).join(" & ")}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; margin:2px 0 2px 14px;">VS</div>
                <div>🏸 <strong>Team ${m.t2Id}:</strong> ${m.t2.map(formatCardP).join(" & ")}</div>
              </div>
              <div class="court-ref-box">
                <span class="court-ref-label">👀 Refs:</span>
                <div class="court-ref-names"><strong>Team ${m.refId}:</strong> ${m.refs.map(formatCardP).join(" & ")}</div>
              </div>
            </div>
          `;
        }

        // Up Next
        let upNextHtml = "";
        if (fq.upNextMatch) {
          const nm = fq.upNextMatch;
          const formatCardP = (p) => (p === activePlayer ? `<span class="player-highlight-text"><span class="you-tag">YOU</span> ${p}</span>` : p);
          upNextHtml = `
            <div class="court-next-box">
              <div class="court-next-label">⚡ UP NEXT: MATCH ${nm.id}</div>
              <div class="court-next-teams">Team ${nm.t1Id} (${nm.t1.map(formatCardP).join(" & ")}) vs Team ${nm.t2Id} (${nm.t2.map(formatCardP).join(" & ")})</div>
              <div style="font-size:0.76rem; color:var(--text-muted);">Refs: Team ${nm.refId} (${nm.refs.map(formatCardP).join(" & ")})</div>
            </div>
          `;
        }

        // After That
        let afterThatHtml = "";
        if (fq.afterThatMatch) {
          afterThatHtml = `
            <div style="font-size:0.74rem; color:var(--text-muted); margin-top:6px; border-top:1px dotted var(--border-card); padding-top:4px;">
              <span>➡️ Then:</span> Match ${fq.afterThatMatch.id} (Team ${fq.afterThatMatch.t1Id} vs Team ${fq.afterThatMatch.t2Id})
            </div>
          `;
        }

        return `
          <div class="court-card ${hasYou ? 'has-you' : ''}" id="court-card-${cNum}">
            <div class="court-card-header">
              <div class="court-title-box">
                <h2 class="court-main-num" style="margin:0;"><span>🏟️</span> ${cInfo.name}</h2>
                <div class="court-sub-loc">🏆 ${pMeta.label}</div>
              </div>
              <span class="badge ${fq.isPoolComplete ? 'badge-gold' : pMeta.badge}">
                ${fq.isPoolComplete ? '🏆 COMPLETE' : `${fq.completedCount}/${fq.totalCount} Done`}
              </span>
            </div>
            ${courtBodyHtml}
            ${upNextHtml}
            ${afterThatHtml}
          </div>
        `;
      }

      // Stage 1 Court Rendering
      const q = getCourtQueue(cNum);
      const hasYou = activePlayer && q.currentMatch && (
        q.currentMatch.t1.includes(activePlayer) ||
        q.currentMatch.t2.includes(activePlayer) ||
        q.currentMatch.refs.includes(activePlayer)
      );

      let currentMatchHtml = "";
      if (q.isStage1Complete) {
        currentMatchHtml = `
          <div class="court-match-box" style="text-align:center; padding:18px;">
            <div style="font-size:1.5rem; margin-bottom:4px;">✅</div>
            <div style="font-weight:900; color:var(--win-color); font-size:1.05rem;">STAGE 1 COMPLETE ON THIS COURT</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:3px;">All ${q.totalCount} matches finished. Awaiting other courts &amp; Finals.</div>
          </div>
        `;
      } else if (q.currentMatch) {
        const m = q.currentMatch;
        const block = Math.ceil(m.r / 3);
        const formatP = (p) => (p === activePlayer ? `<span class="player-highlight-text"><span class="you-tag">YOU</span> ${p}</span>` : p);
        const t1Html = m.t1.map(formatP).join(" & ");
        const t2Html = m.t2.map(formatP).join(" & ");
        const refHtml = m.refs.map(formatP).join(" & ");

        let statusBadge = "";
        if (q.status === 'IN PROGRESS') {
          statusBadge = `<span class="badge badge-gold">IN PROGRESS ${q.scoreText}</span>`;
        } else if (totalCompleted === 0) {
          statusBadge = `<span class="badge badge-blue">STARTS 12:00 PM</span>`;
        } else {
          statusBadge = `<span class="badge badge-blue">CURRENT / READY</span>`;
        }

        currentMatchHtml = `
          <div class="court-match-box">
            <div class="court-match-label">
              <span>MATCH ${m.m} &bull; BLOCK ${block}</span>
              ${statusBadge}
            </div>
            <div class="court-teams-block">
              <div>🏸 ${t1Html}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; margin:2px 0 2px 14px;">VS</div>
              <div>🏸 ${t2Html}</div>
            </div>
            <div class="court-ref-box">
              <span class="court-ref-label">👀 Refs:</span>
              <div class="court-ref-names">${refHtml}</div>
            </div>
          </div>
        `;
      }

      // Up Next Preview
      let upNextHtml = "";
      if (q.upNextMatch) {
        const nm = q.upNextMatch;
        const nBlock = Math.ceil(nm.r / 3);
        const formatP = (p) => (p === activePlayer ? `<span class="player-highlight-text"><span class="you-tag">YOU</span> ${p}</span>` : p);
        upNextHtml = `
          <div class="court-next-box">
            <div class="court-next-label">⚡ UP NEXT: MATCH ${nm.m} &bull; BLOCK ${nBlock}</div>
            <div class="court-next-teams">${nm.t1.map(formatP).join(" & ")} vs ${nm.t2.map(formatP).join(" & ")}</div>
            <div style="font-size:0.76rem; color:var(--text-muted);">Refs: ${nm.refs.map(formatP).join(" & ")}</div>
          </div>
        `;
      }

      // After That Preview
      let afterThatHtml = "";
      if (q.afterThatMatch) {
        afterThatHtml = `
          <div style="font-size:0.74rem; color:var(--text-muted); margin-top:6px; border-top:1px dotted var(--border-card); padding-top:4px;">
            <span>➡️ Then:</span> Match ${q.afterThatMatch.m} &bull; Block ${Math.ceil(q.afterThatMatch.r / 3)}
          </div>
        `;
      }

      return `
        <div class="court-card ${hasYou ? 'has-you' : ''}" id="court-card-${cNum}">
          <div class="court-card-header">
            <div class="court-title-box">
              <h2 class="court-main-num" style="margin:0;"><span>🏟️</span> ${cInfo.name}</h2>
              <div class="court-sub-loc">${cInfo.sub ? cInfo.sub : 'Physical Badminton Court'}</div>
            </div>
            <span class="badge ${q.isStage1Complete ? 'badge-gray' : (hasYou ? 'badge-gold' : 'badge-court')}">
              ${q.completedCount}/${q.totalCount} Done
            </span>
          </div>
          ${currentMatchHtml}
          ${upNextHtml}
          ${afterThatHtml}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <!-- Top Departure Board Header -->
      <div class="court-summary-bar">
        <div>
          <div class="court-summary-title">
            <span>🏟️</span> 4 Tournament Courts
          </div>
          <div class="court-summary-sub">
            ${stage1Locked ? 'Stage 2 Finals &bull; Live Division Court Departure Board' : `Stage 1 &bull; ${totalCompleted} of 48 matches completed &bull; Live Gym Departure Board`}
          </div>
        </div>
        <button type="button" class="pill-btn" onclick="toggleGymMode()" title="Toggle large text / tablet gym display" style="font-weight:800; padding:6px 12px; font-size:0.8rem; cursor:pointer;">
          ${courtViewGymMode ? '📱 Standard View' : '📺 Gym Mode'}
        </button>
      </div>

      <!-- Lock Status Banner -->
      ${stage1Locked ? `<div class="court-lock-banner locked">🔒 Stage 1 LOCKED — Official Finals teams are active on Courts 1, 2, 3, 8. View the <a href="javascript:void(0)" onclick="switchTab('finals')" style="color:inherit; font-weight:800; text-decoration:underline;">Finals tab</a> for full tables.</div>` : (isStage1AllComplete ? `<div class="court-lock-banner complete">⏳ Stage 1 COMPLETE — Awaiting organizer lock to confirm Finals qualification.</div>` : '')}

      <!-- Player Next Court Shortcut -->
      ${playerShortcutHtml}

      <!-- Court Filters -->
      <div class="court-filter-row">
        <div class="court-filter-pills">
          <button type="button" class="pill-btn ${courtViewFilter === 'all' ? 'active' : ''}" onclick="setCourtViewFilter('all')">All Courts</button>
          <button type="button" class="pill-btn ${courtViewFilter === '1' ? 'active' : ''}" onclick="setCourtViewFilter('1')">Court 1</button>
          <button type="button" class="pill-btn ${courtViewFilter === '2' ? 'active' : ''}" onclick="setCourtViewFilter('2')">Court 2</button>
          <button type="button" class="pill-btn ${courtViewFilter === '3' ? 'active' : ''}" onclick="setCourtViewFilter('3')">Court 3</button>
          ${!stage1Locked ? `<button type="button" class="pill-btn ${courtViewFilter === '5' ? 'active' : ''}" onclick="setCourtViewFilter('5')">Court 5</button>` : ''}
          <button type="button" class="pill-btn ${courtViewFilter === '8' ? 'active' : ''}" onclick="setCourtViewFilter('8')">Court 8</button>
        </div>
      </div>

      <!-- Courts Grid -->
      <div class="courts-grid">
        ${courtCardsHtml}
      </div>
    `;
  }
  window.renderCourtView = renderCourtView;

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
      const nextDetail = document.getElementById("hubNextMatchText") || document.getElementById("hubNextStatus");
      if (nextMatch) {
        const isRef = nextMatch.refs.includes(selected);
        const cInfo = COURT_INFO[nextMatch.c] || { name: `Court ${nextMatch.c}` };
        const matchCode = nextMatch.m || ('M' + String(fixtures.indexOf(nextMatch) + 1).padStart(2, '0'));
        const blockNum = Math.ceil(nextMatch.r / 3);
        if (nextDetail) {
          nextDetail.innerHTML = isRef 
            ? `👀 <strong>Referee Duty: Match ${matchCode}</strong> • Block ${blockNum} on ${cInfo.name}` 
            : `🏸 <strong>Next Match: Match ${matchCode}</strong> • Block ${blockNum} on ${cInfo.name}`;
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
    const activePlayer = selected || getStoredPlayerIdentity();
    const visibleFixtures = [];
    fixtures.forEach((f, idx) => {
      if (currentCourtFilter !== "all" && String(f.c) !== currentCourtFilter) return;
      if (currentBlockFilter !== "all" && String(Math.ceil(f.r / 3)) !== currentBlockFilter) return;
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
        <button type="button" class="pill-btn" onclick="captureSchedulePhoto('schedTableCard')" style="font-size:0.75rem; padding:5px 10px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-card); cursor:pointer;" title="Save all 12 columns as high-resolution PNG image">
          <span>📸</span> Save Photo
        </button>
        <button type="button" class="pill-btn" onclick="window.print()" style="font-size:0.75rem; padding:5px 10px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-card); cursor:pointer;" title="Print / Save PDF (Landscape, all 12 columns fit in 1 row)">
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
            <th>Match</th>
            <th>Block</th>
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
            <td colspan="12">
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
          wl1Html = `<span class="wl-pill wl-pending" style="opacity:0.75;" title="Current / In Progress to 15">CURRENT</span>`;
          wl2Html = `<span class="wl-pill wl-pending" style="opacity:0.75;" title="Current / In Progress to 15">CURRENT</span>`;
        }

        const formatP = (p) => (p === activePlayer ? `<span class="player-highlight-text"><span class="you-tag">YOU</span> ${p}</span>` : p);
        const t1Html = f.t1.map(formatP).join(" & ");
        const t2Html = f.t2.map(formatP).join(" & ");
        const refHtml = f.refs.map(formatP).join(" & ");

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

        const matchCode = f.m || ('M' + String(idx + 1).padStart(2, '0'));
        const tr = document.createElement("tr");
        tr.className = rowClass;
        tr.innerHTML = `
          <td class="td-match"><span class="match-pill">${matchCode}</span></td>
          <td class="td-round"><span class="round-pill">Block ${Math.ceil(f.r / 3)}</span></td>
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
            <span class="round-divider-label">Block ${Math.ceil(f.r / 3)} • ${ROUND_TIMES[f.r] || ''}</span>
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
        card.className = `card ${cardStatus} match-card`;

        const formatCardP = (p) => (p === activePlayer ? `<span class="highlight-player"><span class="you-tag">YOU</span> ${p}</span>` : p);
        const t1Html = f.t1.map(formatCardP).join(" & ");
        const t2Html = f.t2.map(formatCardP).join(" & ");
        const refHtml = f.refs.map(formatCardP).join(" & ");

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

        const matchCode = f.m || ('M' + String(idx + 1).padStart(2, '0'));
        card.innerHTML = `
          <div class="card-top">
            <div class="round-badge">
              <span class="match-pill">${matchCode}</span>
              <span>Block ${Math.ceil(f.r / 3)} • ${ROUND_TIMES[f.r] || ''}</span>
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

    // Keep My Tournament, My Matches & Court View dashboards synchronized whenever schedule/scores change
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
  }

  // ---------- PHASE 6: STAGE 1 SCORE EDIT GUARD ----------
  // Returns true if the edit is allowed. Shows blocking modal and returns false if Stage 1 is locked.
  function checkStage1LockBeforeEdit() {
    if (!stage1Locked) return true;
    document.getElementById('scoreLockBlockModal')?.classList.add('open');
    return false;
  }
  window.checkStage1LockBeforeEdit = checkStage1LockBeforeEdit;

  window.closeScoreLockBlockModal = function () {
    document.getElementById('scoreLockBlockModal')?.classList.remove('open');
  };

  // ---------- INTERACTIVE SCORE UPDATING ----------
  window.adjustScore = function (fixtureIdx, teamNum, delta) {
    if (!checkStage1LockBeforeEdit()) return;
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
    if (!checkStage1LockBeforeEdit()) return;
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

  // ---------- PHASE 6: LOCK VALIDATION ----------
  function validateStage1ForLock() {
    const total = fixtures.length; // 48
    const concluded = fixtures.filter(isMatchConcluded);
    if (concluded.length < total) {
      return { ok: false, reason: 'incomplete', missing: total - concluded.length };
    }
    // Detect ties after official ranking criteria
    const lb = computeLeaderboard();
    const tieGroups = [];
    let i = 0;
    while (i < lb.length) {
      const cur = lb[i];
      // Find all players with identical wins, diff, pts
      let j = i + 1;
      while (j < lb.length && lb[j].wins === cur.wins && lb[j].diff === cur.diff && lb[j].pts === cur.pts) j++;
      if (j - i > 1) {
        const group = lb.slice(i, j);
        const groupId = `tie-${i}-${j-1}`;
        // Check if this group crosses pool boundary (ranks straddle 6, 12, or 18)
        const ranks = group.map(p => p.rank);
        const crossesBoundary = [6, 12, 18].some(b => ranks[0] <= b && ranks[ranks.length-1] > b);
        tieGroups.push({ id: groupId, players: group, crossesBoundary });
      }
      i = j;
    }
    // Only blocking ties are ones that cross pool boundaries or aren't already resolved
    const unresolvedBlockingTies = tieGroups.filter(tg => {
      if (!tg.crossesBoundary) return false; // tie within same pool is fine
      const resolved = tieResolutions[tg.id];
      if (!resolved) return true;
      // Validate resolution completeness
      const resolvedNames = resolved;
      const expectedNames = tg.players.map(p => p.name);
      return !expectedNames.every(n => resolvedNames.includes(n)) || resolvedNames.length !== expectedNames.length;
    });
    if (unresolvedBlockingTies.length > 0) {
      return { ok: false, reason: 'ties', tieGroups: unresolvedBlockingTies };
    }
    return { ok: true, leaderboard: lb };
  }
  window.validateStage1ForLock = validateStage1ForLock;

  // ---------- PHASE 6: LOCK ATTEMPT ----------
  function attemptStage1Lock() {
    if (!isAdminUnlocked()) { openPinModal(); return; }
    const result = validateStage1ForLock();
    if (!result.ok) {
      if (result.reason === 'incomplete') {
        const modal = document.getElementById('stage1LockBlockedModal');
        const msg = document.getElementById('lockBlockedMsg');
        if (msg) msg.textContent = `${result.missing} of 48 Stage 1 matches are not yet complete. All matches must have valid scores (one team reaching 15 points) before Stage 1 can be locked.`;
        if (modal) modal.classList.add('open');
      } else if (result.reason === 'ties') {
        renderTieResolutionModal(result.tieGroups);
        document.getElementById('tieResolutionModal')?.classList.add('open');
      }
      return;
    }
    // All checks pass — show confirmation dialog
    document.getElementById('stage1LockConfirmModal')?.classList.add('open');
  }
  window.attemptStage1Lock = attemptStage1Lock;

  function confirmStage1Lock() {
    const result = validateStage1ForLock();
    if (!result.ok) {
      document.getElementById('stage1LockConfirmModal')?.classList.remove('open');
      attemptStage1Lock();
      return;
    }
    // Apply tieResolutions to re-order if needed
    let lb = result.leaderboard;
    Object.values(tieResolutions).forEach(resolvedOrder => {
      if (!Array.isArray(resolvedOrder) || resolvedOrder.length < 2) return;
      const indices = resolvedOrder.map(name => lb.findIndex(p => p.name === name)).filter(i => i >= 0);
      if (indices.length < 2) return;
      const minIdx = Math.min(...indices);
      const extracted = resolvedOrder.map(name => lb.find(p => p.name === name)).filter(Boolean);
      indices.sort((a, b) => a - b).forEach((origIdx, i) => { lb[origIdx] = extracted[i]; });
    });
    // Re-assign ranks after resolution
    lb.forEach((s, idx) => {
      s.rank = idx + 1;
      if (s.rank <= 6) s.tier = 'Gold';
      else if (s.rank <= 12) s.tier = 'Silver';
      else if (s.rank <= 18) s.tier = 'Bronze';
      else s.tier = 'Copper';
    });
    // Deep clone — immutable snapshot
    officialStage1Rankings = JSON.parse(JSON.stringify(lb));
    // Generate official Finals pools using snapshot only
    officialFinalsPools = JSON.parse(JSON.stringify(buildFinalsPools(officialStage1Rankings)));
    stage1Locked = true;
    stage1LockedAt = new Date().toISOString();

    // Phase 8: Atomic Cloud Synchronization for Stage 1 Lock
    const tRefLock = typeof TournamentFirebase !== 'undefined' ? TournamentFirebase.getTournamentRef() : null;
    if (tRefLock) {
      const pushId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const user = (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getUser()) || null;
      const userLabel = user ? (user.email || user.uid) : 'Organizer';
      const updates = {};
      updates['stage1Lock'] = {
        locked: true,
        lockedAt: stage1LockedAt,
        officialStage1Rankings: officialStage1Rankings,
        officialFinalsPools: officialFinalsPools,
        rankings: officialStage1Rankings,
        finalsPools: officialFinalsPools,
        tieResolutions: tieResolutions || {}
      };
      updates[`scoreActivityLog/${pushId}`] = {
        id: pushId,
        timestamp: stage1LockedAt,
        serverTimestamp: TournamentFirebase.getServerTimestamp(),
        action: 'STAGE1_LOCK',
        stage: 'STAGE_1',
        enteredBy: userLabel
      };
      tRefLock.update(updates).catch(err => console.warn('Cloud lock update error:', err));
    }

    saveState();
    document.getElementById('stage1LockConfirmModal')?.classList.remove('open');
    // Show success banner
    const successModal = document.getElementById('stage1LockSuccessModal');
    if (successModal) {
      const ts = document.getElementById('lockSuccessTimestamp');
      if (ts) ts.textContent = new Date(stage1LockedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      successModal.classList.add('open');
    }
    renderLeaderboard();
    renderFinals();
    renderCourtView();
    renderHomeDashboard();
    renderMyMatches();
    showToast('🔒 Stage 1 LOCKED ✓ — Official Finals teams have been generated!');
  }
  window.confirmStage1Lock = confirmStage1Lock;

  window.closeLockBlockedModal = function () {
    document.getElementById('stage1LockBlockedModal')?.classList.remove('open');
  };
  window.closeLockConfirmModal = function () {
    document.getElementById('stage1LockConfirmModal')?.classList.remove('open');
  };
  window.closeLockSuccessModal = function () {
    document.getElementById('stage1LockSuccessModal')?.classList.remove('open');
  };

  // ---------- PHASE 6: UNLOCK ATTEMPT ----------
  function hasAnyFinalsScores() {
    return Object.values(finalsScores).some(pool =>
      pool.some(m => m.s1 != null || m.s2 != null)
    );
  }

  function attemptStage1Unlock() {
    if (!isAdminUnlocked()) { openPinModal(); return; }
    if (!stage1Locked) return;
    if (hasAnyFinalsScores()) {
      // Block: Finals have started
      document.getElementById('stage1UnlockBlockedModal')?.classList.add('open');
      return;
    }
    // Normal unlock confirmation
    document.getElementById('stage1UnlockConfirmModal')?.classList.add('open');
  }
  window.attemptStage1Unlock = attemptStage1Unlock;

  function confirmStage1Unlock() {
    stage1Locked = false;
    stage1LockedAt = null;
    officialStage1Rankings = null;
    officialFinalsPools = null;
    tieResolutions = {};

    // Phase 8: Atomic Cloud Synchronization for Stage 1 Unlock
    const tRefUnlock = typeof TournamentFirebase !== 'undefined' ? TournamentFirebase.getTournamentRef() : null;
    if (tRefUnlock) {
      const nowIso = new Date().toISOString();
      const pushId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const user = (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getUser()) || null;
      const userLabel = user ? (user.email || user.uid) : 'Organizer';
      const updates = {};
      updates['stage1Lock'] = {
        locked: false,
        lockedAt: null,
        rankings: null,
        finalsPools: null,
        tieResolutions: {}
      };
      updates[`scoreActivityLog/${pushId}`] = {
        id: pushId,
        timestamp: nowIso,
        serverTimestamp: TournamentFirebase.getServerTimestamp(),
        action: 'STAGE1_UNLOCK',
        stage: 'STAGE_1',
        enteredBy: userLabel
      };
      tRefUnlock.update(updates).catch(err => console.warn('Cloud unlock update error:', err));
    }

    saveState();
    document.getElementById('stage1UnlockConfirmModal')?.classList.remove('open');
    renderLeaderboard();
    renderFinals();
    renderCourtView();
    renderHomeDashboard();
    renderMyMatches();
    showToast('🔓 Stage 1 unlocked — Standings returned to provisional status.');
  }
  window.confirmStage1Unlock = confirmStage1Unlock;

  window.closeUnlockConfirmModal = function () {
    document.getElementById('stage1UnlockConfirmModal')?.classList.remove('open');
  };
  window.closeUnlockBlockedModal = function () {
    document.getElementById('stage1UnlockBlockedModal')?.classList.remove('open');
  };

  // ---------- PHASE 6: TIE RESOLUTION ----------
  function renderTieResolutionModal(tieGroups) {
    const container = document.getElementById('tieResolutionContainer');
    if (!container) return;
    container.innerHTML = '';
    tieGroups.forEach(tg => {
      const div = document.createElement('div');
      div.className = 'tie-group';
      const existing = tieResolutions[tg.id] || tg.players.map(p => p.name);
      div.innerHTML = `
        <div class="tie-group-header">⚠️ Ranking Tie at Positions ${tg.players.map(p => p.rank).join(', ')}</div>
        <div class="tie-group-note">These players are fully tied on Wins, Differential, and Points Scored. Drag to resolve order, or use arrows. Only organizer resolution can break this tie.</div>
        <table class="tie-stats-table">
          <thead><tr><th>Order</th><th>Player</th><th>W</th><th>Diff</th><th>PTS</th></tr></thead>
          <tbody id="tie-tbody-${tg.id}">
            ${existing.map((name, i) => {
              const p = tg.players.find(x => x.name === name) || tg.players[i];
              return `<tr draggable="true" data-player="${name}" data-group="${tg.id}">
                <td><strong>#${tg.players[0].rank + i}</strong></td>
                <td>🏸 ${name}</td>
                <td>${p ? p.wins : '?'}</td>
                <td>${p ? (p.diff > 0 ? '+' : '') + p.diff : '?'}</td>
                <td>${p ? p.pts : '?'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
          ${existing.map((name, i) => {
            const canUp = i > 0;
            const canDown = i < existing.length - 1;
            return `<button class="btn-secondary" style="font-size:0.75rem; padding:3px 8px;" onclick="moveTiePlayer('${tg.id}',${i},-1)" ${canUp ? '' : 'disabled'}>↑ ${name}</button>
                    <button class="btn-secondary" style="font-size:0.75rem; padding:3px 8px;" onclick="moveTiePlayer('${tg.id}',${i},1)" ${canDown ? '' : 'disabled'}>↓ ${name}</button>`;
          }).join('')}
        </div>
      `;
      container.appendChild(div);
      // Init stored if not yet set
      if (!tieResolutions[tg.id]) {
        tieResolutions[tg.id] = existing.slice();
      }
    });
  }

  window.moveTiePlayer = function (groupId, fromIdx, direction) {
    const arr = tieResolutions[groupId];
    if (!arr) return;
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= arr.length) return;
    const temp = arr[fromIdx]; arr[fromIdx] = arr[toIdx]; arr[toIdx] = temp;
    // Re-render the tie resolution modal
    const result = validateStage1ForLock();
    if (result.reason === 'ties') renderTieResolutionModal(result.tieGroups);
  };

  window.confirmTieResolutionAndLock = function () {
    document.getElementById('tieResolutionModal')?.classList.remove('open');
    // Attempt lock again — should now pass
    const result = validateStage1ForLock();
    if (!result.ok) {
      attemptStage1Lock();
      return;
    }
    document.getElementById('stage1LockConfirmModal')?.classList.add('open');
  };

  window.closeTieResolutionModal = function () {
    document.getElementById('tieResolutionModal')?.classList.remove('open');
  };

  // ---------- RENDERING: LEADERBOARD TAB (Phase 3 + Phase 6) ----------
  function renderLeaderboard() {
    const tbody = document.getElementById("lbBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const select = document.getElementById("playerSelect");
    const selected = select ? select.value : "";
    const activePlayer = selected || getStoredPlayerIdentity();

    const totalCompleted = fixtures.filter(isMatchConcluded).length;
    const isStarted = totalCompleted > 0;
    const totalMatches = fixtures.length; // 48

    // Phase 6: determine heading based on lock state
    const lbHeaderTitle = document.querySelector(".lb-header h2");
    const lbHeaderSub = document.querySelector(".lb-header p");
    if (lbHeaderTitle) {
      if (stage1Locked) {
        lbHeaderTitle.textContent = 'Final Stage 1 Standings';
      } else if (isStarted) {
        lbHeaderTitle.textContent = 'Stage 1 Provisional Standings';
      } else {
        lbHeaderTitle.textContent = 'Stage 1 Standings • NOT STARTED';
      }
    }
    if (lbHeaderSub) {
      if (stage1Locked) {
        const lockedTime = stage1LockedAt ? new Date(stage1LockedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
        lbHeaderSub.innerHTML = `🔒 Official Rankings Locked${lockedTime ? ' at ' + lockedTime : ''} &bull; Finals qualification confirmed`;
      } else if (isStarted) {
        lbHeaderSub.innerHTML = 'Live Rankings &bull; Top 6 qualify for Gold Championship (Wins &rarr; Net Diff &rarr; Points)';
      } else {
        lbHeaderSub.innerHTML = 'Matches begin at 12:00 PM &bull; Rankings will calculate automatically as scores are recorded';
      }
    }

    // Use official snapshot if locked, otherwise live
    const standings = stage1Locked ? officialStage1Rankings : computeLeaderboard();

    standings.forEach(s => {
      const tr = document.createElement("tr");
      const isSelected = activePlayer && s.name === activePlayer;
      if (isSelected) tr.className = "selected-row";

      const diffClass = s.diff > 0 ? "diff-pos" : (s.diff < 0 ? "diff-neg" : "");
      const diffFormatted = s.diff > 0 ? `+${s.diff}` : s.diff;
      const rankBadgeClass = isStarted ? (s.rank === 1 ? "rank-1" : (s.rank === 2 ? "rank-2" : (s.rank === 3 ? "rank-3" : ""))) : "";
      const rankText = isStarted ? s.rank : "-";
      const poolDisplay = isStarted ? s.tier : "TBD";

      // Phase 6: PROJECTED vs QUALIFIED labels
      let poolBadgeText;
      const POOL_FULL_NAMES = { Gold: 'Gold Championship', Silver: 'Silver Plate', Bronze: 'Bronze Shield', Copper: 'Copper Cup' };
      if (stage1Locked) {
        poolBadgeText = `QUALIFIED — ${POOL_FULL_NAMES[poolDisplay] || poolDisplay}`;
      } else if (isStarted) {
        poolBadgeText = `PROJECTED ${poolDisplay}`;
      } else {
        poolBadgeText = poolDisplay;
      }

      const playerLabel = isSelected
        ? `<span>🏸</span> <strong><span class="you-tag">YOU</span> ${s.name}</strong>`
        : `<span>🏸</span> ${s.name}`;

      tr.innerHTML = `
        <td><span class="rank-badge ${rankBadgeClass}">${rankText}</span></td>
        <td class="player-cell">${playerLabel}</td>
        <td class="col-secondary"><strong>${s.gp}</strong></td>
        <td><strong style="color:var(--win-color);">${s.wins}</strong><span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;"> (${s.gp - s.wins}L)</span></td>
        <td class="col-secondary">${s.pts}</td>
        <td class="col-secondary">${s.ga}</td>
        <td class="${diffClass}"><strong>${diffFormatted}</strong></td>
        <td><span class="tier-badge tier-${poolDisplay.toLowerCase()} ${stage1Locked ? 'locked-badge' : ''}">${poolBadgeText}</span></td>
      `;
      tbody.appendChild(tr);
    });

    // Phase 6: Lock / Unlock buttons (Admin only)
    const lockArea = document.getElementById('lbLockArea');
    if (lockArea) {
      if (!isAdminUnlocked()) {
        lockArea.innerHTML = '';
      } else if (stage1Locked) {
        const lockedTime = stage1LockedAt ? new Date(stage1LockedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
        lockArea.innerHTML = `
          <div class="lock-status-banner locked">
            <span>🔒 Stage 1 LOCKED${lockedTime ? ' at ' + lockedTime : ''} — Official Finals teams active</span>
            <button type="button" class="btn-danger-sm" onclick="attemptStage1Unlock()">🔓 Unlock Stage 1</button>
          </div>
        `;
      } else {
        const remaining = totalMatches - totalCompleted;
        const canLock = remaining === 0;
        lockArea.innerHTML = `
          <div class="lock-status-banner unlocked">
            <div>
              <span>📋 Stage 1: ${totalCompleted}/${totalMatches} matches complete</span>
              ${!canLock ? `<span class="lock-count-note">${remaining} remaining</span>` : ''}
            </div>
            <button type="button" class="btn-lock ${canLock ? '' : 'btn-lock-disabled'}" onclick="attemptStage1Lock()" ${canLock ? '' : ''} title="${canLock ? 'Lock Stage 1 and generate official Finals teams' : remaining + ' matches still remaining'}">
              🔒 Lock Stage 1 &amp; Generate Finals
              ${!canLock ? `<span class="lock-progress-mini">${totalCompleted}/${totalMatches}</span>` : ''}
            </button>
          </div>
        `;
      }
    }
  }

  // ---------- PHASE 7: FINALS ENGINE & VALIDATION ----------

  function isFinalsMatchConcluded(m) {
    if (!m || m.s1 == null || m.s2 == null || m.s1 === "" || m.s2 === "") return false;
    const s1 = Number(m.s1);
    const s2 = Number(m.s2);
    return (s1 === FINALS_TARGET_SCORE || s2 === FINALS_TARGET_SCORE) && s1 !== s2;
  }
  window.isFinalsMatchConcluded = isFinalsMatchConcluded;

  // Stable Finals match generator with referee rotation
  function genPoolMatches(team1, team2, team3, idPrefix, poolKey) {
    const court = poolKey === 'gold' ? 1 : (poolKey === 'silver' ? 2 : (poolKey === 'bronze' ? 3 : 8));
    const defs = [
      { id: idPrefix + "1", matchCode: idPrefix + "1", t1: team1, t2: team2, refs: team3, t1Id: 'A', t2Id: 'B', refId: 'C' },
      { id: idPrefix + "2", matchCode: idPrefix + "2", t1: team1, t2: team3, refs: team2, t1Id: 'A', t2Id: 'C', refId: 'B' },
      { id: idPrefix + "3", matchCode: idPrefix + "3", t1: team2, t2: team3, refs: team1, t1Id: 'B', t2Id: 'C', refId: 'A' }
    ];
    return defs.map((d, i) => ({
      ...d,
      poolKey,
      court,
      s1: finalsScores[poolKey]?.[i]?.s1 ?? null,
      s2: finalsScores[poolKey]?.[i]?.s2 ?? null
    }));
  }

  // ---------- BUILD FINALS POOLS (SNAKE SEEDING) ----------
  function buildFinalsPools(leaderboard) {
    const tierSlice = (start) => (leaderboard || []).slice(start, start + 6).map(s => s.name);
    
    // Balanced Snake Pairing:
    // Team A: #1 & #6 (or #7 & #12, #13 & #18, #19 & #24)
    // Team B: #2 & #5 (or #8 & #11, #14 & #17, #20 & #23)
    // Team C: #3 & #4 (or #9 & #10, #15 & #16, #21 & #22)
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
        matches: genPoolMatches(goldTeams[0], goldTeams[1], goldTeams[2], "G", "gold")
      },
      {
        key: "silver",
        label: "Silver Plate (Court 2)",
        courtNum: 2,
        cls: "tier-silver",
        teams: silverTeams,
        matches: genPoolMatches(silverTeams[0], silverTeams[1], silverTeams[2], "S", "silver")
      },
      {
        key: "bronze",
        label: "Bronze Shield (Court 3)",
        courtNum: 3,
        cls: "tier-bronze",
        teams: bronzeTeams,
        matches: genPoolMatches(bronzeTeams[0], bronzeTeams[1], bronzeTeams[2], "B", "bronze")
      },
      {
        key: "copper",
        label: "Copper Cup (Court 8)",
        courtNum: 8,
        cls: "tier-copper",
        teams: copperTeams,
        matches: genPoolMatches(copperTeams[0], copperTeams[1], copperTeams[2], "C", "copper")
      }
    ];
  }
  window.buildFinalsPools = buildFinalsPools;

  function getEffectiveFinalsPools() {
    if (stage1Locked && officialFinalsPools) {
      return officialFinalsPools;
    }
    if (stage1Locked && officialStage1Rankings) {
      return buildFinalsPools(officialStage1Rankings);
    }
    return buildFinalsPools(computeLeaderboard());
  }
  window.getEffectiveFinalsPools = getEffectiveFinalsPools;

  function getFinalsMatches(poolKey) {
    const pools = getEffectiveFinalsPools();
    const pool = pools.find(p => p.key === poolKey);
    if (!pool) return [];
    return pool.matches.map((m, idx) => ({
      ...m,
      s1: finalsScores[poolKey]?.[idx]?.s1 ?? null,
      s2: finalsScores[poolKey]?.[idx]?.s2 ?? null
    }));
  }
  window.getFinalsMatches = getFinalsMatches;

  // ---------- COMPUTE POOL STANDINGS ----------
  function computePoolStandings(poolKey) {
    const pools = getEffectiveFinalsPools();
    const pool = typeof poolKey === 'object' ? poolKey : pools.find(p => p.key === poolKey);
    if (!pool) return [];
    const pKey = pool.key;

    const seedLabels = {
      gold:   ['#1 & #6', '#2 & #5', '#3 & #4'],
      silver: ['#7 & #12', '#8 & #11', '#9 & #10'],
      bronze: ['#13 & #18', '#14 & #17', '#15 & #16'],
      copper: ['#19 & #24', '#20 & #23', '#21 & #22']
    };

    const teams = [
      { id: 'A', name: pool.teams[0].join(' & '), players: pool.teams[0], seed: seedLabels[pKey]?.[0] || 'Team A' },
      { id: 'B', name: pool.teams[1].join(' & '), players: pool.teams[1], seed: seedLabels[pKey]?.[1] || 'Team B' },
      { id: 'C', name: pool.teams[2].join(' & '), players: pool.teams[2], seed: seedLabels[pKey]?.[2] || 'Team C' }
    ];

    const stats = teams.map(t => ({
      id: t.id,
      name: t.name,
      players: t.players,
      seed: t.seed,
      gp: 0,
      wins: 0,
      losses: 0,
      pts: 0,
      pa: 0,
      diff: 0
    }));

    const matches = getFinalsMatches(pKey);
    const headToHead = {}; // key: 'A-B' -> winnerId

    matches.forEach(m => {
      if (!isFinalsMatchConcluded(m)) return;
      const s1 = Number(m.s1);
      const s2 = Number(m.s2);
      const st1 = stats.find(s => s.id === m.t1Id);
      const st2 = stats.find(s => s.id === m.t2Id);
      if (!st1 || !st2) return;

      st1.gp++;
      st1.pts += s1;
      st1.pa += s2;
      st1.diff = st1.pts - st1.pa;

      st2.gp++;
      st2.pts += s2;
      st2.pa += s1;
      st2.diff = st2.pts - st2.pa;

      if (s1 > s2) {
        st1.wins++;
        st2.losses++;
        headToHead[`${m.t1Id}-${m.t2Id}`] = m.t1Id;
        headToHead[`${m.t2Id}-${m.t1Id}`] = m.t1Id;
      } else {
        st2.wins++;
        st1.losses++;
        headToHead[`${m.t1Id}-${m.t2Id}`] = m.t2Id;
        headToHead[`${m.t2Id}-${m.t1Id}`] = m.t2Id;
      }
    });

    // Check playoff results
    const playoffs = finalsPlayoffs[pKey] || [];
    const playoffWinners = {};
    playoffs.forEach(p => {
      if (p && p.winner) {
        playoffWinners[`${p.t1Id}-${p.t2Id}`] = p.winner;
        playoffWinners[`${p.t2Id}-${p.t1Id}`] = p.winner;
      }
    });

    // Sort order:
    // 1. Wins
    // 2. Diff
    // 3. PTS (PF)
    // 4. Two-team Head-to-Head (only if exactly 2 teams are tied on criteria 1-3)
    // 5. Playoff result if exists
    stats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.diff !== a.diff) return b.diff - a.diff;
      if (b.pts !== a.pts) return b.pts - a.pts;

      // Playoff winner takes precedence if recorded
      const pWin = playoffWinners[`${a.id}-${b.id}`];
      if (pWin === a.id) return -1;
      if (pWin === b.id) return 1;

      // Check if this is part of a 3-way tie across all teams
      const all3Tied = stats.every(s => s.wins === a.wins && s.diff === a.diff && s.pts === a.pts);
      if (!all3Tied) {
        // Exactly 2 teams tied on 1-3 -> evaluate direct head-to-head
        const h2h = headToHead[`${a.id}-${b.id}`];
        if (h2h === a.id) return -1;
        if (h2h === b.id) return 1;
      }

      return 0;
    });

    return stats;
  }
  window.computePoolStandings = computePoolStandings;

  function getPoolChampion(poolKey) {
    const matches = getFinalsMatches(poolKey);
    const allConcluded = matches.length === 3 && matches.every(isFinalsMatchConcluded);
    const standings = computePoolStandings(poolKey);

    if (!allConcluded) {
      const hasAny = matches.some(m => m.s1 != null || m.s2 != null);
      return {
        isComplete: false,
        championTeam: null,
        runnerUpTeam: null,
        thirdTeam: null,
        status: hasAny ? 'IN PROGRESS' : 'READY',
        playoffRequired: false,
        standings
      };
    }

    const t0 = standings[0];
    const t1 = standings[1];
    const t2 = standings[2];

    const is3WayTie = (t0.wins === t1.wins && t1.wins === t2.wins) &&
                      (t0.diff === t1.diff && t1.diff === t2.diff) &&
                      (t0.pts === t1.pts && t1.pts === t2.pts);

    const playoffs = finalsPlayoffs[poolKey] || [];
    const hasPlayoffWinner = playoffs.some(p => p.winner);

    if (is3WayTie && !hasPlayoffWinner) {
      return {
        isComplete: false,
        championTeam: null,
        runnerUpTeam: null,
        thirdTeam: null,
        status: 'THREE-WAY TIE — ORGANIZER DECISION REQUIRED',
        playoffRequired: true,
        tiedTeams: [t0, t1, t2],
        standings
      };
    }

    return {
      isComplete: true,
      championTeam: standings[0],
      runnerUpTeam: standings[1],
      thirdTeam: standings[2],
      status: 'POOL COMPLETE',
      playoffRequired: false,
      standings
    };
  }
  window.getPoolChampion = getPoolChampion;

  function isPoolComplete(poolKey) {
    const champ = getPoolChampion(poolKey);
    return champ.isComplete && champ.championTeam != null;
  }
  window.isPoolComplete = isPoolComplete;

  function isTournamentComplete() {
    if (!stage1Locked) return false;
    return ['gold', 'silver', 'bronze', 'copper'].every(k => isPoolComplete(k));
  }
  window.isTournamentComplete = isTournamentComplete;

  // Shared Finals assignment helpers
  function getPlayerFinalsAssignments(playerName) {
    if (!playerName) return [];
    const pools = getEffectiveFinalsPools();
    for (const pool of pools) {
      const isPlayerInPool = pool.teams.some(t => t.includes(playerName));
      if (isPlayerInPool) {
        const matches = getFinalsMatches(pool.key);
        const teamIdx = pool.teams.findIndex(t => t.includes(playerName));
        const teamLetter = teamIdx === 0 ? 'A' : (teamIdx === 1 ? 'B' : 'C');
        const partner = pool.teams[teamIdx].find(p => p !== playerName) || playerName;

        return matches.map((m, idx) => {
          const isT1 = m.t1.includes(playerName);
          const isT2 = m.t2.includes(playerName);
          const isPlaying = isT1 || isT2;
          const duty = isPlaying ? 'PLAY' : 'REFEREE';
          const opponents = isT1 ? m.t2 : (isT2 ? m.t1 : null);
          const concluded = isFinalsMatchConcluded(m);
          const s1 = (m.s1 != null && m.s1 !== "") ? Number(m.s1) : null;
          const s2 = (m.s2 != null && m.s2 !== "") ? Number(m.s2) : null;
          const hasScores = s1 != null && s2 != null;

          let status = 'UPCOMING';
          if (concluded) {
            status = 'COMPLETED';
          } else if (hasScores && (s1 > 0 || s2 > 0)) {
            status = 'IN PROGRESS';
          }

          return {
            id: m.id,
            matchIndex: idx,
            poolKey: pool.key,
            poolLabel: pool.label,
            court: pool.courtNum,
            duty,
            teamLetter,
            partner,
            opponents,
            t1: m.t1,
            t2: m.t2,
            refs: m.refs,
            s1: m.s1,
            s2: m.s2,
            status,
            concluded,
            won: concluded && isPlaying ? ((isT1 && s1 === FINALS_TARGET_SCORE) || (isT2 && s2 === FINALS_TARGET_SCORE)) : null
          };
        });
      }
    }
    return [];
  }
  window.getPlayerFinalsAssignments = getPlayerFinalsAssignments;

  function getNextPlayerFinalsAssignment(playerName) {
    const assignments = getPlayerFinalsAssignments(playerName);
    if (!assignments || assignments.length === 0) return null;
    return assignments.find(a => !a.concluded) || null;
  }
  window.getNextPlayerFinalsAssignment = getNextPlayerFinalsAssignment;

  function getFinalsCourtQueue(courtNum) {
    const courtMap = { 1: 'gold', 2: 'silver', 3: 'bronze', 8: 'copper' };
    const poolKey = courtMap[courtNum];
    if (!poolKey) return null;
    const matches = getFinalsMatches(poolKey);
    const concluded = matches.filter(isFinalsMatchConcluded);
    const remaining = matches.filter(m => !isFinalsMatchConcluded(m));
    const champ = getPoolChampion(poolKey);

    return {
      poolKey,
      courtNum,
      totalCount: matches.length,
      completedCount: concluded.length,
      isPoolComplete: champ.isComplete,
      championTeam: champ.championTeam,
      currentMatch: remaining[0] || null,
      upNextMatch: remaining[1] || null,
      afterThatMatch: remaining[2] || null
    };
  }
  window.getFinalsCourtQueue = getFinalsCourtQueue;

  // ---------- RENDERING: FINALS TAB (Phase 7: Full Operations & Winners) ----------
  function renderFinals() {
    const container = document.getElementById("finalsContainer");
    if (!container) return;
    container.innerHTML = "";

    const pools = getEffectiveFinalsPools();

    // Grand Tournament Complete Banner (Phase 7)
    if (isTournamentComplete()) {
      const tourneyCompleteDiv = document.createElement('div');
      tourneyCompleteDiv.className = 'tournament-complete-banner';
      tourneyCompleteDiv.innerHTML = `
        <div>
          <h2>🏆 TOURNAMENT COMPLETE!</h2>
          <p>All 4 Stage 2 Finals Divisions have concluded and champions are declared.</p>
        </div>
        <button type="button" class="btn-primary" onclick="openWinnersModal()" style="background:#fff; color:#1e3a8a; font-weight:900; padding:10px 18px; border-radius:var(--radius-full); box-shadow:0 2px 8px rgba(0,0,0,0.2);">
          🏆 View Grand Winners Podium &rarr;
        </button>
      `;
      container.appendChild(tourneyCompleteDiv);
    }

    // Status banner at top of Finals tab
    const totalCompleted = fixtures.filter(isMatchConcluded).length;
    const allStage1Done = totalCompleted === fixtures.length;
    const bannerDiv = document.createElement('div');
    if (stage1Locked) {
      const lockedTime = stage1LockedAt ? new Date(stage1LockedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
      bannerDiv.className = 'finals-status-banner finals-locked';
      bannerDiv.innerHTML = `🔒 <strong>OFFICIAL FINALS QUALIFICATION</strong> — Stage 1 Locked${lockedTime ? ' at ' + lockedTime : ''}. Official team pairings and division courts are active.`;
    } else if (allStage1Done) {
      bannerDiv.className = 'finals-status-banner finals-pending';
      bannerDiv.innerHTML = `⏳ Stage 1 COMPLETE — Awaiting organizer lock to confirm Finals qualification.`;
    } else {
      bannerDiv.className = 'finals-status-banner finals-projected';
      bannerDiv.innerHTML = `📊 <strong>PROJECTED FINALS</strong> — Subject to change until Stage 1 is locked by the organizer.`;
    }
    container.appendChild(bannerDiv);

    pools.forEach(pool => {
      const champ = getPoolChampion(pool.key);
      const standings = champ.standings;
      const isAdmin = isAdminUnlocked();
      const playoffs = finalsPlayoffs[pool.key] || [];

      const sec = document.createElement("div");
      sec.className = "finals-pool-section";

      // Pool Division Banner
      let champBannerHtml = "";
      if (champ.isComplete && champ.championTeam) {
        champBannerHtml = `
          <div class="finals-champ-card">
            <div class="finals-champ-title">
              <span>🏆</span> <span>${pool.label.split('(')[0].trim().toUpperCase()} WINNERS</span>
            </div>
            <div class="finals-champ-names">🏸 ${champ.championTeam.name}</div>
          </div>
        `;
      } else if (champ.playoffRequired) {
        champBannerHtml = `
          <div class="playoff-alert-box">
            <div>
              <div class="playoff-alert-title">⚡ ${champ.status}</div>
              <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">All 3 teams finished 1-1 with identical differential. Organizer playoff or decision required to declare champion.</div>
            </div>
            ${isAdmin ? `<button type="button" class="btn-primary" onclick="openPlayoffModal('${pool.key}')" style="font-size:0.8rem; padding:6px 12px;">⚡ Enter Playoff Result</button>` : ''}
          </div>
        `;
      }

      // Playoff Matches List (if any)
      let playoffMatchesHtml = "";
      if (playoffs.length > 0) {
        playoffMatchesHtml = `
          <div style="margin-top:8px; margin-bottom:12px;">
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Recorded Playoff Matches:</div>
            ${playoffs.map((p, pIdx) => {
              const team1Name = pool.teams[p.t1Id === 'A' ? 0 : (p.t1Id === 'B' ? 1 : 2)].join(' & ');
              const team2Name = pool.teams[p.t2Id === 'A' ? 0 : (p.t2Id === 'B' ? 1 : 2)].join(' & ');
              const winnerTeam = p.winner === p.t1Id ? team1Name : team2Name;
              return `
                <div class="playoff-match-card">
                  <div>
                    <strong>Team ${p.t1Id}</strong> (${team1Name}) <strong>${p.s1} : ${p.s2}</strong> <strong>Team ${p.t2Id}</strong> (${team2Name})
                    <span class="badge" style="background:rgba(16,185,129,0.15); color:#059669; font-weight:800; margin-left:8px;">Winner: ${winnerTeam}</span>
                  </div>
                  ${isAdmin ? `<button type="button" class="btn-danger-sm" onclick="deleteFinalsPlayoff('${pool.key}', ${pIdx})" style="font-size:0.72rem; padding:2px 6px;">Delete</button>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      sec.innerHTML = `
        <div class="pool-banner ${pool.cls}">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">🏆</span>
            <div>
              <div style="font-weight:800; font-size:1.05rem;">${pool.label}</div>
              <div style="font-size:0.75rem; opacity:0.9; font-weight:500;">Dedicated Court ${pool.courtNum} • 3 Round-Robin Matches • 21 Pts Sudden Death</div>
            </div>
          </div>
          <span class="badge" style="background:#fff; color:#0f172a; font-weight:800; padding:4px 10px; border-radius:var(--radius-full); box-shadow:0 2px 4px rgba(0,0,0,0.15);">
            ${champ.status}
          </span>
        </div>

        ${champBannerHtml}
        ${playoffMatchesHtml}

        <!-- Match Schedule Table -->
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
                  const isConcluded = isFinalsMatchConcluded(m);
                  const t1Won = isConcluded && s1 === FINALS_TARGET_SCORE;
                  const t2Won = isConcluded && s2 === FINALS_TARGET_SCORE;
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
                    wl1Html = '<span class="wl-pill wl-pending" style="opacity:0.75;" title="Current / In Progress to 21">IN PROGRESS</span>';
                    wl2Html = '<span class="wl-pill wl-pending" style="opacity:0.75;" title="Current / In Progress to 21">IN PROGRESS</span>';
                  }

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
                      <td class="team-pair-cell">🏸 <strong>Team ${m.t1Id}: ${m.t1.join(" & ")}</strong></td>
                      <td>${fScore1Html}</td>
                      <td>${wl1Html}</td>
                      <td class="team-pair-cell team-2">🏸 <strong>Team ${m.t2Id}: ${m.t2.join(" & ")}</strong></td>
                      <td>${fScore2Html}</td>
                      <td>${wl2Html}</td>
                      <td>${diffHtml}</td>
                      <td class="ref-cell"><span class="ref-icon-badge">👀</span><strong>Team ${m.refId}: ${m.refs.join(" & ")}</strong></td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pool Standings Table (Phase 7 Team Standings) -->
        <div class="finals-standings-card">
          <div class="finals-standings-header">
            <span>📊 ${pool.label.split('(')[0].trim()} Standings</span>
            <span style="font-size:0.75rem; color:var(--text-muted);">Points to 21 • Wins &rarr; Diff &rarr; PTS &rarr; H2H &rarr; Playoff</span>
          </div>
          <table class="finals-standings-table">
            <thead>
              <tr>
                <th style="width:80px;">Place</th>
                <th>Team Pair</th>
                <th>GP</th>
                <th>W</th>
                <th>L</th>
                <th>PF</th>
                <th>PA</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              ${standings.map((s, idx) => {
                const placeCls = idx === 0 ? 'p1' : (idx === 1 ? 'p2' : 'p3');
                const placeLabel = idx === 0 ? '1st' : (idx === 1 ? '2nd' : '3rd');
                return `
                  <tr class="${idx === 0 && champ.isComplete ? 'place-1st' : ''}">
                    <td><span class="place-pill ${placeCls}">${placeLabel}</span></td>
                    <td class="player-cell">
                      <strong>Team ${s.id}</strong> (${s.name})
                      <span class="badge" style="font-size:0.7rem; margin-left:6px; opacity:0.8;">${s.seed}</span>
                    </td>
                    <td>${s.gp}</td>
                    <td><strong style="color:var(--win-color);">${s.wins}</strong></td>
                    <td>${s.losses}</td>
                    <td>${s.pts}</td>
                    <td>${s.pa}</td>
                    <td class="${s.diff > 0 ? 'diff-pos' : (s.diff < 0 ? 'diff-neg' : '')}">${s.diff > 0 ? '+' : ''}${s.diff}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;

      container.appendChild(sec);
    });
  }

  // Interactive Finals Score Updating (with instant reactive recalculation)
  window.adjustFinalsScore = function (poolKey, matchIdx, teamNum, delta) {
    if (!isAdminUnlocked()) { openPinModal(); return; }
    const match = finalsScores[poolKey]?.[matchIdx];
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
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
  };

  window.updateFinalsScore = function (poolKey, matchIdx, teamNum, val) {
    if (!isAdminUnlocked()) { openPinModal(); return; }
    const match = finalsScores[poolKey]?.[matchIdx];
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
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
  };

  // Playoff Modal & Grand Winners Actions
  window.openPlayoffModal = function (poolKey, t1Id = 'A', t2Id = 'B') {
    if (!isAdminUnlocked()) { openPinModal(); return; }
    const pools = getEffectiveFinalsPools();
    const pool = pools.find(p => p.key === poolKey);
    if (!pool) return;
    const teamMap = {
      A: pool.teams[0].join(' & '),
      B: pool.teams[1].join(' & '),
      C: pool.teams[2].join(' & ')
    };
    const title = document.getElementById('playoffModalTitle');
    const sub = document.getElementById('playoffModalSub');
    const body = document.getElementById('playoffModalBody');
    if (title) title.textContent = `⚡ ${pool.label.split('(')[0].trim()} Playoff (First-to-7)`;
    if (sub) sub.textContent = `Enter the sudden-death first-to-7 playoff result between tied teams to resolve division placement.`;
    if (body) {
      body.innerHTML = `
        <div style="background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:14px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px;">
            <div style="flex:1;">
              <label style="font-size:0.75rem; font-weight:800; color:var(--text-muted);">TEAM 1</label>
              <select id="playoffT1Select" class="select-styled" style="width:100%; margin-top:4px;">
                <option value="A" ${t1Id === 'A' ? 'selected' : ''}>Team A: ${teamMap.A}</option>
                <option value="B" ${t1Id === 'B' ? 'selected' : ''}>Team B: ${teamMap.B}</option>
                <option value="C" ${t1Id === 'C' ? 'selected' : ''}>Team C: ${teamMap.C}</option>
              </select>
            </div>
            <div style="font-weight:900; color:var(--text-muted); padding-top:16px;">VS</div>
            <div style="flex:1;">
              <label style="font-size:0.75rem; font-weight:800; color:var(--text-muted);">TEAM 2</label>
              <select id="playoffT2Select" class="select-styled" style="width:100%; margin-top:4px;">
                <option value="A" ${t2Id === 'A' ? 'selected' : ''}>Team A: ${teamMap.A}</option>
                <option value="B" ${t2Id === 'B' ? 'selected' : ''}>Team B: ${teamMap.B}</option>
                <option value="C" ${t2Id === 'C' ? 'selected' : ''}>Team C: ${teamMap.C}</option>
              </select>
            </div>
          </div>
          <div style="display:flex; justify-content:center; align-items:center; gap:16px;">
            <div style="text-align:center;">
              <label style="font-size:0.75rem; font-weight:800; color:var(--text-muted); display:block; margin-bottom:4px;">T1 Score</label>
              <input type="number" id="playoffS1Input" class="tbl-score-input" min="0" max="7" placeholder="0" style="font-size:1.2rem; width:65px; height:45px;">
            </div>
            <span style="font-size:1.4rem; font-weight:900; color:var(--text-muted); padding-top:16px;">:</span>
            <div style="text-align:center;">
              <label style="font-size:0.75rem; font-weight:800; color:var(--text-muted); display:block; margin-bottom:4px;">T2 Score</label>
              <input type="number" id="playoffS2Input" class="tbl-score-input" min="0" max="7" placeholder="0" style="font-size:1.2rem; width:65px; height:45px;">
            </div>
          </div>
        </div>
        <input type="hidden" id="playoffPoolKey" value="${poolKey}">
      `;
    }
    document.getElementById('finalsPlayoffModal')?.classList.add('open');
  };

  window.closePlayoffModal = function () {
    document.getElementById('finalsPlayoffModal')?.classList.remove('open');
  };

  window.submitPlayoffScore = function () {
    const poolKey = document.getElementById('playoffPoolKey')?.value;
    const t1Id = document.getElementById('playoffT1Select')?.value;
    const t2Id = document.getElementById('playoffT2Select')?.value;
    const s1Val = document.getElementById('playoffS1Input')?.value;
    const s2Val = document.getElementById('playoffS2Input')?.value;

    if (!poolKey || !t1Id || !t2Id || t1Id === t2Id) {
      alert("Please select two different teams for the playoff.");
      return;
    }
    const s1 = parseInt(s1Val, 10);
    const s2 = parseInt(s2Val, 10);
    if (isNaN(s1) || isNaN(s2) || (s1 !== 7 && s2 !== 7) || s1 === s2) {
      alert("Playoff match must conclude with one team reaching exactly 7 points (sudden death).");
      return;
    }

    const winnerId = s1 === 7 ? t1Id : t2Id;
    if (!finalsPlayoffs[poolKey]) finalsPlayoffs[poolKey] = [];
    finalsPlayoffs[poolKey].push({
      id: `${poolKey}-playoff-${Date.now()}`,
      pool: poolKey,
      t1Id,
      t2Id,
      s1,
      s2,
      winner: winnerId,
      status: 'COMPLETED'
    });

    saveState();
    closePlayoffModal();
    renderFinals();
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
    showToast(`⚡ Playoff recorded for ${poolKey.toUpperCase()}!`);
  };

  window.deleteFinalsPlayoff = function (poolKey, idx) {
    if (!isAdminUnlocked()) { openPinModal(); return; }
    if (!confirm("Delete this playoff match result?")) return;
    if (finalsPlayoffs[poolKey] && finalsPlayoffs[poolKey][idx]) {
      finalsPlayoffs[poolKey].splice(idx, 1);
      saveState();
      renderFinals();
      renderHomeDashboard();
      renderMyMatches();
      renderCourtView();
      showToast("Playoff result deleted.");
    }
  };

  window.openWinnersModal = function () {
    renderGrandWinners();
    document.getElementById('grandWinnersModal')?.classList.add('open');
  };

  window.closeWinnersModal = function () {
    document.getElementById('grandWinnersModal')?.classList.remove('open');
  };

  function renderGrandWinners() {
    const container = document.getElementById('grandWinnersContainer');
    if (!container) return;

    const divisionMeta = [
      { key: 'gold', name: 'Gold Championship', court: 1, trophy: '🏆', cls: 'tier-gold', label: 'GOLD CHAMPIONSHIP WINNERS' },
      { key: 'silver', name: 'Silver Plate', court: 2, trophy: '🏆', cls: 'tier-silver', label: 'SILVER PLATE WINNERS' },
      { key: 'bronze', name: 'Bronze Shield', court: 3, trophy: '🏆', cls: 'tier-bronze', label: 'BRONZE SHIELD WINNERS' },
      { key: 'copper', name: 'Copper Cup', court: 8, trophy: '🏆', cls: 'tier-copper', label: 'COPPER CUP WINNERS' }
    ];

    container.innerHTML = divisionMeta.map(div => {
      const champ = getPoolChampion(div.key);
      const st = champ.standings;
      const champName = champ.championTeam ? champ.championTeam.name : (st[0] ? st[0].name : 'TBD');
      const p1Name = st[0] ? `Team ${st[0].id}: ${st[0].name}` : 'TBD';
      const p2Name = st[1] ? `Team ${st[1].id}: ${st[1].name}` : 'TBD';
      const p3Name = st[2] ? `Team ${st[2].id}: ${st[2].name}` : 'TBD';

      return `
        <div class="grand-winner-card ${div.cls}">
          <div class="grand-winner-card-title">
            <span>${div.trophy}</span>
            <span>${div.name} (Court ${div.court})</span>
          </div>
          <div class="grand-winner-champ">
            <div class="grand-winner-champ-label">${div.label}</div>
            <div class="grand-winner-champ-names">🏸 ${champName}</div>
          </div>
          <div class="grand-winner-placements">
            <div class="podium-row">
              <span>🥇 1st Place</span>
              <strong>${p1Name}</strong>
            </div>
            <div class="podium-row">
              <span>🥈 2nd Place</span>
              <span>${p2Name}</span>
            </div>
            <div class="podium-row">
              <span>🥉 3rd Place</span>
              <span>${p3Name}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Reset Finals only (preserves Stage 1 lock & scores)
  window.resetFinals = function (skipConfirm = false) {
    if (!skipConfirm && !confirm("🔄 Are you sure you want to reset all Stage 2 Finals scores and playoffs?\n\nThis preserves the Stage 1 lock and official qualification rankings.")) return;

    finalsScores = {
      gold:   [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      silver: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      bronze: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      copper: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
    };
    finalsPlayoffs = {
      gold: [],
      silver: [],
      bronze: [],
      copper: []
    };

    // Phase 7.6: Log RESET_FINALS activity
    const resetFinalsPushId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const resetFinalsIso = new Date().toISOString();
    const userFinals = (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getUser()) || null;
    const userFinalsLabel = userFinals ? (userFinals.email || userFinals.uid) : 'Organizer';

    scoreActivityLog.unshift({
      id: resetFinalsPushId,
      timestamp: resetFinalsIso,
      action: 'RESET_FINALS',
      stage: 'FINALS',
      enteredBy: userFinalsLabel
    });

    // Phase 8: Cloud Update for Reset Finals (if live and authorized)
    const tRefResetFinals = typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getConnectionState() === 'LIVE' && TournamentFirebase.isAuthorized() ? TournamentFirebase.getTournamentRef() : null;
    if (tRefResetFinals) {
      try {
        const updates = {};
        updates['finalsScores/gold'] = finalsScores.gold;
        updates['finalsScores/silver'] = finalsScores.silver;
        updates['finalsScores/bronze'] = finalsScores.bronze;
        updates['finalsScores/copper'] = finalsScores.copper;
        updates['finalsPlayoffs'] = finalsPlayoffs;
        updates[`scoreActivityLog/${resetFinalsPushId}`] = {
          id: resetFinalsPushId,
          timestamp: resetFinalsIso,
          serverTimestamp: TournamentFirebase.getServerTimestamp(),
          action: 'RESET_FINALS',
          stage: 'FINALS',
          enteredBy: userFinalsLabel
        };
        tRefResetFinals.update(updates).catch(err => console.warn('Cloud resetFinals error:', err));
      } catch (e) {
        console.warn('Cloud resetFinals error:', e);
      }
    }

    saveState();
    renderFinals();
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
    closeOrganizerModal();
    showToast("🔄 All Finals scores and playoffs have been reset.");
  };

  // ---------- POPULATE PLAYER DROPDOWN ----------
  function populatePlayerSelect() {
    const select = document.getElementById("playerSelect");
    if (!select) return;
    const currentVal = getStoredPlayerIdentity() || select.value;
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
      setPlayerIdentity(select.value);
      saveState();
      renderSchedule();
      renderLeaderboard();
    };
  }

  // ---------- ORGANIZER DESK TOOLS ----------
  function openOrganizerModal() {
    if (!isAdminUnlocked()) {
      openPinModal();
      return;
    }
    document.getElementById("organizerModal")?.classList.add("open");
  }
  window.openOrganizerModal = openOrganizerModal;

  function closeOrganizerModal() {
    document.getElementById("organizerModal")?.classList.remove("open");
  }
  window.closeOrganizerModal = closeOrganizerModal;

  window.exportDataJSON = function () {
    const data = {
      version: "v9",
      exportDate: new Date().toISOString(),
      fixtures,
      finalsScores,
      finalsPlayoffs,
      // Phase 6 lock state
      stage1Locked,
      stage1LockedAt,
      officialStage1Rankings,
      tieResolutions,
      officialFinalsPools,
      // Phase 7.5 Scorekeeper entries
      skRecentEntries: skRecentEntries.slice(0, 5),
      // Phase 7.6 Score activity log
      scoreActivityLog: scoreActivityLog.slice(0, 200)
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
        if (!Array.isArray(parsed.fixtures)) {
          alert("Invalid backup file structure.");
          return;
        }
        // Phase 6: Warn if current tournament is locked
        if (stage1Locked) {
          const ok = confirm(
            "⚠️ Stage 1 is currently LOCKED with official Finals teams.\n\n" +
            "Importing this backup will REPLACE the current lock state with the imported data.\n\n" +
            "Proceed with import?"
          );
          if (!ok) { input.value = ''; return; }
        }
        fixtures = parsed.fixtures;
        if (parsed.finalsScores) {
          finalsScores = {
            gold:   parsed.finalsScores.gold   || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
            silver: parsed.finalsScores.silver || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
            bronze: parsed.finalsScores.bronze || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
            copper: parsed.finalsScores.copper || [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
          };
        }
        if (parsed.finalsPlayoffs) {
          finalsPlayoffs = {
            gold:   parsed.finalsPlayoffs.gold   || [],
            silver: parsed.finalsPlayoffs.silver || [],
            bronze: parsed.finalsPlayoffs.bronze || [],
            copper: parsed.finalsPlayoffs.copper || []
          };
        }
        // Restore Phase 6 state from backup
        if (parsed.stage1Locked === true) {
          stage1Locked = true;
          stage1LockedAt = parsed.stage1LockedAt || null;
          officialStage1Rankings = parsed.officialStage1Rankings || null;
          tieResolutions = parsed.tieResolutions || {};
          officialFinalsPools = parsed.officialFinalsPools || null;
        } else {
          stage1Locked = false;
          stage1LockedAt = null;
          officialStage1Rankings = null;
          tieResolutions = {};
          officialFinalsPools = null;
        }
        // Restore Phase 7.5 Scorekeeper entries
        if (Array.isArray(parsed.skRecentEntries)) {
          skRecentEntries = parsed.skRecentEntries;
        } else {
          skRecentEntries = [];
        }
        // Restore Phase 7.6 Score activity log
        if (Array.isArray(parsed.scoreActivityLog)) {
          scoreActivityLog = parsed.scoreActivityLog;
        }
        saveState();
        renderSchedule();
        renderLeaderboard();
        renderFinals();
        renderHomeDashboard();
        renderMyMatches();
        renderCourtView();
        closeOrganizerModal();
        showToast("📥 Tournament data imported successfully!");
      } catch (err) {
        alert("Error parsing backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  window.loadRecordedStage1Scores = function (skipConfirm = false) {
    if (!checkStage1LockBeforeEdit()) return;
    if (!skipConfirm && !confirm("Load official referee-recorded scores for all 48 Stage 1 matches?\n\nThis will populate all 48 match scores. You can review the provisional leaderboard before locking Stage 1.")) return;

    fixtures.forEach((f) => {
      if (RECORDED_STAGE1_SCORES[f.m]) {
        f.s1 = RECORDED_STAGE1_SCORES[f.m][0];
        f.s2 = RECORDED_STAGE1_SCORES[f.m][1];
        f.revision = (f.revision || 0) + 1;
        f.updatedAt = new Date().toISOString();
      }
    });

    saveState();
    renderSchedule();
    renderLeaderboard();
    renderFinals();
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
    renderScorekeeperView();
    closeOrganizerModal();
    showToast("📋 48 Recorded Stage 1 scores loaded! Review standings before locking.");
  };

  window.loadRecordedFinalsScores = function (skipConfirm = false) {
    if (!skipConfirm && !confirm("Load official Stage 2 Finals match results and declare division champions?")) return;

    // Ensure Stage 1 is locked with recorded scores
    if (!stage1Locked) {
      loadRecordedStage1Scores(true);
      confirmStage1Lock();
    }

    if (typeof RECORDED_FINALS_POOLS !== 'undefined') {
      officialFinalsPools = JSON.parse(JSON.stringify(RECORDED_FINALS_POOLS));
    }
    if (typeof RECORDED_FINALS_SCORES !== 'undefined') {
      finalsScores = JSON.parse(JSON.stringify(RECORDED_FINALS_SCORES));
    }

    saveState();
    renderFinals();
    renderLeaderboard();
    renderSchedule();
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
    closeOrganizerModal();
    showToast("🏆 Official Stage 2 Finals scores loaded and Champions declared!");
  };

  window.loadDemoData = function (skipConfirm = false) {
    if (stage1Locked) {
      // Stage 1 is locked. Load demo scores for Finals only (Requirement 22)
      if (!skipConfirm && !confirm("Stage 1 is locked.\n\nLoad realistic demo scores for all Stage 2 Finals matches?\n\n(Stage 1 scores, rankings, and official Finals teams will NOT be modified)")) return;
      const finalsCombos = [
        [21, 18], [19, 21], [21, 16]
      ];
      Object.keys(finalsScores).forEach((tier) => {
        finalsScores[tier] = [
          { s1: finalsCombos[0][0], s2: finalsCombos[0][1] },
          { s1: finalsCombos[1][0], s2: finalsCombos[1][1] },
          { s1: finalsCombos[2][0], s2: finalsCombos[2][1] }
        ];
      });
      saveState();
      renderFinals();
      renderHomeDashboard();
      renderMyMatches();
      renderCourtView();
      closeOrganizerModal();
      showToast("🎲 Stage 2 Finals demo scores loaded!");
      return;
    }

    if (!checkStage1LockBeforeEdit()) return;
    if (!skipConfirm && !confirm("Load realistic demo scores for all Stage 1 blocks?\n\nNote: This does NOT automatically lock Stage 1.")) return;

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

    saveState();
    renderSchedule();
    renderLeaderboard();
    renderFinals();
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
    closeOrganizerModal();
    showToast("🎲 Demo Stage 1 scores loaded. Review provisional standings, then LOCK Stage 1 to generate official Finals.");
  };

  window.resetTournament = function (skipConfirm = false, clearLog = true) {
    if (stage1Locked && !skipConfirm) {
      if (!confirm("⚠️ Stage 1 is currently LOCKED with official Finals rankings.\n\nResetting will unlock Stage 1, erase official rankings, and clear all scores.\n\nProceed with full tournament reset?")) return;
    } else if (!skipConfirm && !confirm("⚠️ Are you sure you want to reset ALL scores to blank? This cannot be undone.")) return;

    // 1. Reset fixtures to base clean fixtures
    fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));
    fixtures.forEach((f, idx) => {
      f.s1 = null;
      f.s2 = null;
      f.revision = 0;
      f.updatedAt = null;
    });

    // 2. Reset Finals scores
    finalsScores = {
      gold:   [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      silver: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      bronze: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ],
      copper: [ { s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null } ]
    };

    // 3. Reset Finals playoffs
    finalsPlayoffs = {
      gold: [],
      silver: [],
      bronze: [],
      copper: []
    };

    // 4. Clear all Stage 1 lock state & official snapshots
    stage1Locked = false;
    stage1LockedAt = null;
    officialStage1Rankings = null;
    tieResolutions = {};
    officialFinalsPools = null;

    // 5. Clear Scorekeeper temporary state
    skRecentEntries = [];
    skSelectedMatchCode = "";
    skIsEditing = false;

    // 6. Score activity log reset
    if (clearLog) {
      scoreActivityLog = [];
    } else {
      const resetTournPushId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const resetTournIso = new Date().toISOString();
      const userTourn = (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getUser()) || null;
      const userTournLabel = userTourn ? (userTourn.email || userTourn.uid) : 'Organizer';
      scoreActivityLog.unshift({
        id: resetTournPushId,
        timestamp: resetTournIso,
        action: 'RESET_TOURNAMENT',
        stage: 'TOURNAMENT',
        enteredBy: userTournLabel
      });
    }

    // 7. Cloud Synchronization (if Firebase is LIVE and authorized)
    const tRefResetTourn = typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getConnectionState() === 'LIVE' && TournamentFirebase.isAuthorized() ? TournamentFirebase.getTournamentRef() : null;
    if (tRefResetTourn) {
      try {
        const updates = {};
        BASE_FIXTURES.forEach(f => {
          updates[`stage1Scores/${f.m}`] = {
            s1: null,
            s2: null,
            revision: 0,
            updatedAt: null
          };
        });
        updates['finalsScores/gold'] = finalsScores.gold;
        updates['finalsScores/silver'] = finalsScores.silver;
        updates['finalsScores/bronze'] = finalsScores.bronze;
        updates['finalsScores/copper'] = finalsScores.copper;
        updates['finalsPlayoffs'] = finalsPlayoffs;
        updates['stage1Lock'] = {
          locked: false,
          lockedAt: null,
          rankings: null,
          finalsPools: null,
          tieResolutions: {}
        };
        tRefResetTourn.update(updates).catch(err => console.warn('Cloud resetTournament error:', err));
      } catch (e) {
        console.warn('Cloud reset error:', e);
      }
    }

    // 8. Persist fresh state locally immediately
    saveState();

    // 9. Re-render all views
    renderSchedule();
    renderLeaderboard();
    renderFinals();
    renderHomeDashboard();
    renderMyMatches();
    renderCourtView();
    renderScorekeeperView();
    closeOrganizerModal();
    showToast("✅ TOURNAMENT RESET — READY TO START");
  };

  // ============================================================
  // ---------- PHASE 7.5: SCOREKEEPER MODE (RAPID MOBILE ENTRY) ----------
  // ============================================================

  /**
   * Centralized tournament score save entry point (Phase 8 Firebase Live Sync & Multi-Location Atomic Update).
   * UI and Scorekeeper mode call this single function.
   *
   * @param {string} matchCode - Match ID e.g. "M17", "17", "G1", "S2", "B3", "C1"
   * @param {number|string} score1 - Team 1 score
   * @param {number|string} score2 - Team 2 score
   * @param {boolean} isEditing - Explicit override flag for completed matches
   * @param {number|null} loadedRevision - Optimistic concurrency revision counter
   * @returns {Promise<Object>} { ok: boolean, error?: string, alreadyScored?: boolean, conflict?: boolean, ... }
   */
  async function saveTournamentScore(matchCode, score1, score2, isEditing = false, loadedRevision = null) {
    if (!matchCode) {
      return { ok: false, error: "Please select a valid match." };
    }

    const cleanCode = String(matchCode).trim().toUpperCase();
    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);

    // 1. Stage 2 Finals Match (G1-G3, S1-S3, B1-B3, C1-C3)
    const isFinalsMatch = /^[GSBC][1-3]$/.test(cleanCode);

    if (isFinalsMatch) {
      if (!stage1Locked) {
        return { ok: false, error: "Stage 1 must be locked before Finals matches can be scored." };
      }

      const tierLetter = cleanCode.charAt(0);
      const matchIdx = parseInt(cleanCode.charAt(1), 10) - 1;
      const tierMap = { G: 'gold', S: 'silver', B: 'bronze', C: 'copper' };
      const poolKey = tierMap[tierLetter];

      if (!poolKey || matchIdx < 0 || matchIdx > 2) {
        return { ok: false, error: `Invalid Finals match identifier "${cleanCode}".` };
      }

      // Finals score validation: exactly 21 sudden death, max 21, no ties
      if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 > FINALS_TARGET_SCORE || s2 > FINALS_TARGET_SCORE || s1 === s2 || (s1 !== FINALS_TARGET_SCORE && s2 !== FINALS_TARGET_SCORE)) {
        return { ok: false, error: `Invalid Finals score. One team must reach exactly ${FINALS_TARGET_SCORE} points sudden death (no deuce/ties, max ${FINALS_TARGET_SCORE}).` };
      }

      // Check if already concluded
      const existing = finalsScores[poolKey]?.[matchIdx];
      const wasConcluded = existing && (Number(existing.s1) === FINALS_TARGET_SCORE || Number(existing.s2) === FINALS_TARGET_SCORE) && existing.s1 !== existing.s2;
      if (wasConcluded && !isEditing) {
        return { ok: false, alreadyScored: true, error: `Finals Match ${cleanCode} is already completed (${existing.s1}–${existing.s2}). Explicit edit confirmation required.` };
      }

      // Concurrency check for Finals
      const curRev = existing?.revision || 0;
      if (isEditing && loadedRevision != null && curRev !== loadedRevision) {
        return {
          ok: false,
          conflict: true,
          error: `THIS MATCH WAS UPDATED ON ANOTHER DEVICE (Score: ${existing.s1}–${existing.s2}). Please reload match before editing.`
        };
      }

      // Check Firebase authorization ONLY if cloud sync is LIVE
      if (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getConnectionState() === 'LIVE' && !TournamentFirebase.isAuthorized()) {
        return {
          ok: false,
          unauthorized: true,
          error: "ORGANIZER AUTHENTICATION REQUIRED: Please sign in with an authorized account to record scores to the live cloud."
        };
      }

      const prevS1 = existing?.s1 != null ? Number(existing.s1) : null;
      const prevS2 = existing?.s2 != null ? Number(existing.s2) : null;

      const pools = getEffectiveFinalsPools();
      const poolMeta = pools.find(p => p.key === poolKey);
      const mMeta = poolMeta?.matches?.[matchIdx];
      const courtNum = mMeta?.court || (poolKey === 'gold' ? 1 : (poolKey === 'silver' ? 2 : (poolKey === 'bronze' ? 3 : 8)));
      const t1Name = mMeta?.t1 ? mMeta.t1.join(' & ') : 'Team 1';
      const t2Name = mMeta?.t2 ? mMeta.t2.join(' & ') : 'Team 2';

      const isoNow = new Date().toISOString();
      const pushId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const newRev = (loadedRevision != null ? loadedRevision : curRev) + 1;
      const user = (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getUser()) || null;
      const userLabel = user ? (user.email || user.uid) : 'Organizer';

      // Atomic Cloud Write
      const tRef = typeof TournamentFirebase !== 'undefined' ? TournamentFirebase.getTournamentRef() : null;
      if (tRef) {
        try {
          TournamentFirebase.setConnectionState('PENDING');
          const updates = {};
          updates[`finalsScores/${poolKey}/${matchIdx}`] = {
            s1, s2,
            revision: newRev,
            updatedAt: isoNow,
            serverTimestamp: TournamentFirebase.getServerTimestamp(),
            updatedBy: userLabel
          };
          const activityItem = {
            id: pushId,
            timestamp: isoNow,
            serverTimestamp: TournamentFirebase.getServerTimestamp(),
            action: isEditing ? 'EDIT' : 'SAVE',
            stage: 'FINALS',
            matchId: cleanCode,
            court: courtNum,
            score1: s1,
            score2: s2,
            team1: mMeta?.t1 ? [...mMeta.t1] : ['Team 1'],
            team2: mMeta?.t2 ? [...mMeta.t2] : ['Team 2'],
            enteredBy: userLabel
          };
          if (isEditing && prevS1 != null && prevS2 != null) {
            activityItem.previousScore1 = prevS1;
            activityItem.previousScore2 = prevS2;
          }
          updates[`scoreActivityLog/${pushId}`] = activityItem;
          await tRef.update(updates);
          TournamentFirebase.setConnectionState('LIVE');
        } catch (err) {
          TournamentFirebase.setConnectionState('OFFLINE');
          return { ok: false, error: 'OFFLINE — SCORE NOT SUBMITTED: Cloud write failed. ' + (err.message || '') };
        }
      }

      // Memory state update
      if (!finalsScores[poolKey]) {
        finalsScores[poolKey] = [{ s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null }];
      }
      finalsScores[poolKey][matchIdx] = { s1, s2, revision: newRev, updatedAt: isoNow };

      const auditEvent = {
        id: pushId,
        timestamp: isoNow,
        action: isEditing ? 'EDIT' : 'SAVE',
        stage: 'FINALS',
        matchId: cleanCode,
        court: courtNum,
        score1: s1,
        score2: s2,
        team1: mMeta?.t1 ? [...mMeta.t1] : ['Team 1'],
        team2: mMeta?.t2 ? [...mMeta.t2] : ['Team 2'],
        enteredBy: userLabel
      };
      if (isEditing && prevS1 != null && prevS2 != null) {
        auditEvent.previousScore1 = prevS1;
        auditEvent.previousScore2 = prevS2;
      }
      scoreActivityLog.unshift(auditEvent);

      const auditItem = {
        matchCode: cleanCode,
        score: `${s1}–${s2}`,
        prevScore: (isEditing && prevS1 != null && prevS2 != null) ? `${prevS1}–${prevS2}` : null,
        court: courtNum,
        t1: t1Name,
        t2: t2Name,
        savedAt: isoNow,
        action: isEditing ? 'EDIT' : 'SAVE',
        isFinals: true
      };
      skRecentEntries = [auditItem, ...skRecentEntries.filter(e => e.matchCode !== cleanCode)].slice(0, 5);

      saveState();
      renderSchedule();
      renderLeaderboard();
      renderFinals();
      renderCourtView();
      renderHomeDashboard();
      renderMyMatches();

      return {
        ok: true,
        matchCode: cleanCode,
        score1: s1,
        score2: s2,
        court: courtNum,
        t1: t1Name,
        t2: t2Name,
        action: isEditing ? 'EDIT' : 'SAVE',
        isFinals: true
      };
    }

    // 2. Stage 1 Match (M01-M48 or 1-48)
    const matchNum = parseInt(cleanCode.replace(/^M/, ''), 10);
    if (isNaN(matchNum) || matchNum < 1 || matchNum > fixtures.length) {
      return { ok: false, error: `Invalid match identifier "${cleanCode}". Must be M01–M48 or G1–C3.` };
    }

    const fIdx = matchNum - 1;
    const f = fixtures[fIdx];
    const fullMatchCode = f.m || ('M' + String(matchNum).padStart(2, '0'));

    // Guard: Stage 1 Lock prevents Stage 1 edits
    if (stage1Locked) {
      return {
        ok: false,
        error: "STAGE 1 LOCKED: Official Finals teams have been generated. Stage 1 scores cannot be changed from Scorekeeper Mode."
      };
    }

    // Stage 1 score validation: exactly 15 sudden death, max 15, no ties
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 > 15 || s2 > 15 || s1 === s2 || (s1 !== 15 && s2 !== 15)) {
      return { ok: false, error: "Invalid Stage 1 score. One team must reach exactly 15 points (sudden death, no deuce/ties, max 15)." };
    }

    // Check if already concluded
    const wasConcluded = isMatchConcluded(f);
    if (wasConcluded && !isEditing) {
      return { ok: false, alreadyScored: true, error: `Match ${fullMatchCode} is already completed (${f.s1}–${f.s2}). Explicit edit confirmation required.` };
    }

    // Concurrency check for Stage 1
    const curRev = f.revision || 0;
    if (isEditing && loadedRevision != null && curRev !== loadedRevision) {
      return {
        ok: false,
        conflict: true,
        error: `THIS MATCH WAS UPDATED ON ANOTHER DEVICE (Score: ${f.s1}–${f.s2}). Please reload match before editing.`
      };
    }

    // Check Firebase auth ONLY if cloud sync is LIVE
    if (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getConnectionState() === 'LIVE' && !TournamentFirebase.isAuthorized()) {
      return {
        ok: false,
        unauthorized: true,
        error: "ORGANIZER AUTHENTICATION REQUIRED: Please sign in with an authorized account to record scores to the live cloud."
      };
    }

    const prevS1 = f.s1 != null ? Number(f.s1) : null;
    const prevS2 = f.s2 != null ? Number(f.s2) : null;

    const t1Name = f.t1.join(' & ');
    const t2Name = f.t2.join(' & ');
    const courtNum = f.c;
    const blockNum = Math.ceil(f.r / 3);
    const isoNow = new Date().toISOString();
    const pushId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newRev = (loadedRevision != null ? loadedRevision : curRev) + 1;
    const user = (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getUser()) || null;
    const userLabel = user ? (user.email || user.uid) : 'Organizer';

    // Atomic Cloud Write
    const tRef = typeof TournamentFirebase !== 'undefined' ? TournamentFirebase.getTournamentRef() : null;
    if (tRef) {
      try {
        TournamentFirebase.setConnectionState('PENDING');
        const updates = {};
        updates[`stage1Scores/${fullMatchCode}`] = {
          s1, s2,
          revision: newRev,
          updatedAt: isoNow,
          serverTimestamp: TournamentFirebase.getServerTimestamp(),
          updatedBy: userLabel
        };
        const activityItem = {
          id: pushId,
          timestamp: isoNow,
          serverTimestamp: TournamentFirebase.getServerTimestamp(),
          action: isEditing ? 'EDIT' : 'SAVE',
          stage: 'STAGE_1',
          matchId: fullMatchCode,
          court: courtNum,
          block: blockNum,
          score1: s1,
          score2: s2,
          team1: [...f.t1],
          team2: [...f.t2],
          enteredBy: userLabel
        };
        if (isEditing && prevS1 != null && prevS2 != null) {
          activityItem.previousScore1 = prevS1;
          activityItem.previousScore2 = prevS2;
        }
        updates[`scoreActivityLog/${pushId}`] = activityItem;
        await tRef.update(updates);
        TournamentFirebase.setConnectionState('LIVE');
      } catch (err) {
        TournamentFirebase.setConnectionState('OFFLINE');
        return { ok: false, error: 'OFFLINE — SCORE NOT SUBMITTED: Cloud write failed. ' + (err.message || '') };
      }
    }

    // Save Stage 1 score locally in memory
    f.s1 = s1;
    f.s2 = s2;
    f.revision = newRev;
    f.updatedAt = isoNow;

    const activityEvent = {
      id: pushId,
      timestamp: isoNow,
      action: isEditing ? 'EDIT' : 'SAVE',
      stage: 'STAGE_1',
      matchId: fullMatchCode,
      court: courtNum,
      block: blockNum,
      score1: s1,
      score2: s2,
      team1: [...f.t1],
      team2: [...f.t2],
      enteredBy: userLabel
    };
    if (isEditing && prevS1 != null && prevS2 != null) {
      activityEvent.previousScore1 = prevS1;
      activityEvent.previousScore2 = prevS2;
    }
    scoreActivityLog.unshift(activityEvent);

    const auditItem = {
      matchCode: fullMatchCode,
      score: `${s1}–${s2}`,
      prevScore: (isEditing && prevS1 != null && prevS2 != null) ? `${prevS1}–${prevS2}` : null,
      court: courtNum,
      t1: t1Name,
      t2: t2Name,
      savedAt: isoNow,
      action: isEditing ? 'EDIT' : 'SAVE',
      isFinals: false
    };
    skRecentEntries = [auditItem, ...skRecentEntries.filter(e => e.matchCode !== fullMatchCode)].slice(0, 5);

    saveState();
    renderSchedule();
    renderLeaderboard();
    renderFinals();
    renderCourtView();
    renderHomeDashboard();
    renderMyMatches();

    return {
      ok: true,
      matchCode: fullMatchCode,
      score1: s1,
      score2: s2,
      court: courtNum,
      t1: t1Name,
      t2: t2Name,
      action: isEditing ? 'EDIT' : 'SAVE',
      isFinals: false
    };
  }
  window.saveTournamentScore = saveTournamentScore;

  // ---------- SCOREKEEPER MODE UI HELPERS ----------

  function renderScorekeeperView() {
    populateScorekeeperMatchSelect();
    renderScorekeeperRecentEntries();
    renderScorekeeperMatchDetail(skSelectedMatchCode);
  }
  window.renderScorekeeperView = renderScorekeeperView;

  function filterScorekeeperCourt(court) {
    skCourtFilter = String(court);
    document.querySelectorAll('#skCourtFilterPills .sk-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.court === skCourtFilter);
    });
    populateScorekeeperMatchSelect();
  }
  window.filterScorekeeperCourt = filterScorekeeperCourt;

  function onScorekeeperSearch(query) {
    skSearchQuery = (query || '').trim();
    populateScorekeeperMatchSelect();

    // Auto-select if search query matches a match exactly
    const clean = skSearchQuery.toUpperCase();
    if (/^(M?\d{1,2}|[GSBC][1-3])$/i.test(clean)) {
      let targetCode = clean;
      if (/^\d{1,2}$/.test(clean)) {
        targetCode = 'M' + clean.padStart(2, '0');
      } else if (/^M\d{1,2}$/.test(clean)) {
        targetCode = 'M' + clean.slice(1).padStart(2, '0');
      }
      const select = document.getElementById('skMatchSelect');
      if (select) {
        const matchingOpt = Array.from(select.options).find(o => o.value === targetCode);
        if (matchingOpt) {
          select.value = targetCode;
          onScorekeeperMatchSelect(targetCode);
        }
      }
    }
  }
  window.onScorekeeperSearch = onScorekeeperSearch;

  function populateScorekeeperMatchSelect() {
    const select = document.getElementById('skMatchSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose Match to Score --</option>';

    const query = skSearchQuery.toLowerCase();
    const courtFilter = skCourtFilter;

    // 1. Stage 1 Matches
    const unscoredMatches = [];
    const completedMatches = [];

    fixtures.forEach((f, idx) => {
      const matchCode = f.m || ('M' + String(idx + 1).padStart(2, '0'));
      const numStr = String(idx + 1);

      // Court filter
      if (courtFilter !== 'all' && String(f.c) !== courtFilter) return;

      // Search filter
      if (query) {
        const matchesCode = matchCode.toLowerCase().includes(query) || numStr === query;
        const matchesPlayer = f.t1.some(p => p.toLowerCase().includes(query)) || f.t2.some(p => p.toLowerCase().includes(query));
        if (!matchesCode && !matchesPlayer) return;
      }

      if (isMatchConcluded(f)) {
        completedMatches.push({ f, matchCode, idx });
      } else {
        unscoredMatches.push({ f, matchCode, idx });
      }
    });

    if (unscoredMatches.length > 0) {
      const group = document.createElement('optgroup');
      group.label = `⚡ UNSCORED MATCHES (${unscoredMatches.length})`;
      unscoredMatches.forEach(({ f, matchCode }) => {
        const opt = document.createElement('option');
        opt.value = matchCode;
        opt.textContent = `${matchCode} — Court ${f.c} (Block ${Math.ceil(f.r / 3)}) • ${f.t1.join(' & ')} vs ${f.t2.join(' & ')}`;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }

    if (completedMatches.length > 0) {
      const group = document.createElement('optgroup');
      group.label = `✓ COMPLETED MATCHES (${completedMatches.length})`;
      completedMatches.forEach(({ f, matchCode }) => {
        const opt = document.createElement('option');
        opt.value = matchCode;
        opt.textContent = `✓ ${matchCode} — ${f.s1}–${f.s2} (Court ${f.c}) • ${f.t1.join(' & ')} vs ${f.t2.join(' & ')}`;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }

    // 2. Stage 2 Finals (if Stage 1 is locked)
    if (stage1Locked) {
      const finalsGroup = document.createElement('optgroup');
      finalsGroup.label = '🏆 STAGE 2 — FINALS';
      const pools = getEffectiveFinalsPools();

      pools.forEach(pool => {
        (pool.matches || []).forEach((m, mIdx) => {
          const mCode = m.matchCode || m.id;
          if (courtFilter !== 'all' && String(m.court) !== courtFilter) return;
          if (query && !mCode.toLowerCase().includes(query)) return;

          const fScore = finalsScores[pool.key]?.[mIdx];
          const isDone = fScore && (Number(fScore.s1) === FINALS_TARGET_SCORE || Number(fScore.s2) === FINALS_TARGET_SCORE) && fScore.s1 !== fScore.s2;

          const opt = document.createElement('option');
          opt.value = mCode;
          const poolShort = pool.label.split('(')[0].trim();
          if (isDone) {
            opt.textContent = `✓ ${mCode} — ${fScore.s1}–${fScore.s2} (${poolShort} • Court ${m.court})`;
          } else {
            opt.textContent = `${mCode} — ${poolShort} (Court ${m.court}) • ${m.t1?.join(' & ')} vs ${m.t2?.join(' & ')}`;
          }
          finalsGroup.appendChild(opt);
        });
      });

      if (finalsGroup.children.length > 0) {
        select.appendChild(finalsGroup);
      }
    }

    if (skSelectedMatchCode) {
      select.value = skSelectedMatchCode;
    }
  }
  window.populateScorekeeperMatchSelect = populateScorekeeperMatchSelect;

  function onScorekeeperMatchSelect(matchCode) {
    skSelectedMatchCode = (matchCode || '').trim();
    skIsEditing = false;
    const successArea = document.getElementById('skSuccessArea');
    if (successArea) successArea.innerHTML = '';
    renderScorekeeperMatchDetail(skSelectedMatchCode);
  }
  window.onScorekeeperMatchSelect = onScorekeeperMatchSelect;

  function renderScorekeeperMatchDetail(matchCode) {
    const container = document.getElementById('skMatchDetailContainer');
    if (!container) return;

    if (!matchCode) {
      container.innerHTML = `
        <div style="text-align:center; padding:32px 16px; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-card);">
          <div style="font-size:2.2rem; margin-bottom:8px;">🏸</div>
          <h3 style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin-bottom:4px;">No Match Selected</h3>
          <p style="font-size:0.82rem; margin:0;">Select a match from the dropdown above to enter scores in seconds.</p>
        </div>
      `;
      return;
    }

    const cleanCode = matchCode.toUpperCase();
    const isFinals = /^[GSBC][1-3]$/.test(cleanCode);

    if (isFinals) {
      // Stage 2 Finals Match
      const tierLetter = cleanCode.charAt(0);
      const mIdx = parseInt(cleanCode.charAt(1), 10) - 1;
      const tierMap = { G: 'gold', S: 'silver', B: 'bronze', C: 'copper' };
      const poolKey = tierMap[tierLetter];
      const pools = getEffectiveFinalsPools();
      const pool = pools.find(p => p.key === poolKey);
      const mMeta = pool?.matches?.[mIdx];
      const fScore = finalsScores[poolKey]?.[mIdx];
      const isConcluded = fScore && (Number(fScore.s1) === FINALS_TARGET_SCORE || Number(fScore.s2) === FINALS_TARGET_SCORE) && fScore.s1 !== fScore.s2;

      const t1Name = mMeta?.t1 ? mMeta.t1.join(' & ') : 'Team 1';
      const t2Name = mMeta?.t2 ? mMeta.t2.join(' & ') : 'Team 2';
      const refName = mMeta?.refs ? mMeta.refs.join(' & ') : 'Sitting Team';
      const courtNum = mMeta?.court || (poolKey === 'gold' ? 1 : (poolKey === 'silver' ? 2 : (poolKey === 'bronze' ? 3 : 8)));
      const poolLabel = pool?.label || `${poolKey.toUpperCase()} FINALS`;

      if (isConcluded && !skIsEditing) {
        const s1Num = Number(fScore.s1);
        const s2Num = Number(fScore.s2);
        container.innerHTML = `
          <div class="sk-already-box">
            <div class="sk-already-badge">✓ MATCH ${cleanCode} ALREADY SCORED</div>
            <div class="sk-already-teams">
              <div class="sk-already-team ${s1Num === FINALS_TARGET_SCORE ? 'winner' : ''}">
                <span>${t1Name}</span>
                <strong>${s1Num}</strong>
              </div>
              <div class="sk-already-team ${s2Num === FINALS_TARGET_SCORE ? 'winner' : ''}">
                <span>${t2Name}</span>
                <strong>${s2Num}</strong>
              </div>
            </div>
            <div class="sk-already-meta">Court ${courtNum} &bull; ${poolLabel} &bull; Refs: ${refName}</div>
            <div class="sk-already-actions">
              <button type="button" class="btn-secondary" onclick="resetScorekeeperForm()">Back / Next</button>
              <button type="button" class="btn-primary" onclick="enterScorekeeperEditMode()">✏️ Edit Score</button>
            </div>
          </div>
        `;
        return;
      }

      // Render Editable Finals Entry Card
      skLoadedRevision = fScore?.revision != null ? Number(fScore.revision) : 0;
      container.innerHTML = `
        <form class="sk-entry-card" onsubmit="handleScorekeeperSave(event)">
          <div class="sk-entry-header">
            <div class="sk-entry-badge-row">
              <span class="sk-match-id-badge">${cleanCode}</span>
              <span class="sk-block-badge">${poolLabel.split('(')[0].trim()}</span>
              <span class="sk-court-badge">Court ${courtNum}</span>
              ${skIsEditing ? '<span class="sk-editing-badge">✏️ EDITING</span>' : ''}
            </div>
            <div class="sk-target-rule-note">Target: First to <strong>${FINALS_TARGET_SCORE} points</strong> sudden death (no deuce)</div>
          </div>
          <div class="sk-teams-inputs-wrap">
            <div class="sk-team-block">
              <div class="sk-team-label">TEAM 1</div>
              <div class="sk-team-names">${t1Name}</div>
              <input type="number" id="skScore1" class="sk-score-input-large" inputmode="numeric" min="0" max="${FINALS_TARGET_SCORE}" placeholder="0" value="${skIsEditing && fScore?.s1 != null ? fScore.s1 : ''}" required autocomplete="off">
            </div>
            <div class="sk-vs-divider">VS</div>
            <div class="sk-team-block">
              <div class="sk-team-label">TEAM 2</div>
              <div class="sk-team-names">${t2Name}</div>
              <input type="number" id="skScore2" class="sk-score-input-large" inputmode="numeric" min="0" max="${FINALS_TARGET_SCORE}" placeholder="0" value="${skIsEditing && fScore?.s2 != null ? fScore.s2 : ''}" required autocomplete="off">
            </div>
          </div>
          <div class="sk-refs-info">👀 Referees: <strong>${refName}</strong></div>
          <div id="skErrorBox" class="sk-error-box" style="display:none;"></div>
          <div class="sk-actions-row">
            ${skIsEditing ? '<button type="button" class="btn-secondary" onclick="cancelScorekeeperEditMode()" style="flex:1;">Cancel</button>' : '<button type="button" class="btn-secondary" onclick="resetScorekeeperForm()" style="flex:1;">Reset</button>'}
            <button type="submit" id="skSaveBtn" class="sk-save-btn" style="flex:2;">
              <span>💾</span> ${skIsEditing ? 'SAVE EDITED SCORE' : 'SAVE SCORE'}
            </button>
          </div>
        </form>
      `;

      setTimeout(() => {
        document.getElementById('skScore1')?.focus();
      }, 50);
      return;
    }

    // Stage 1 Match
    const matchNum = parseInt(cleanCode.replace(/^M/, ''), 10);
    const fIdx = matchNum - 1;
    const f = fixtures[fIdx];
    if (!f) {
      container.innerHTML = `<div class="sk-error-box" style="display:block;">Match ${cleanCode} not found in schedule.</div>`;
      return;
    }

    const fullMatchCode = f.m || ('M' + String(matchNum).padStart(2, '0'));
    const t1Name = f.t1.join(' & ');
    const t2Name = f.t2.join(' & ');
    const refName = f.refs.join(' & ');
    const blockNum = Math.ceil(f.r / 3);

    // Stage 1 Lock Guard
    if (stage1Locked) {
      container.innerHTML = `
        <div class="sk-locked-box" style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:var(--radius-lg); padding:20px; text-align:center;">
          <div style="font-size:2rem; margin-bottom:6px;">🔒</div>
          <h3 style="color:var(--loss-color); margin-bottom:6px; font-weight:800;">STAGE 1 LOCKED</h3>
          <p style="font-size:0.84rem; color:var(--text-secondary); margin-bottom:12px;">
            Official Finals teams have been generated. Stage 1 scores cannot be changed from Scorekeeper Mode.
          </p>
          <div style="font-weight:700; font-size:0.9rem; margin-bottom:14px;">
            ${fullMatchCode} Score: ${t1Name} (${f.s1 ?? '-'}) vs ${t2Name} (${f.s2 ?? '-'}) • Court ${f.c}
          </div>
          <button type="button" class="btn-secondary" onclick="resetScorekeeperForm()" style="width:100%; padding:10px;">Select Another Match</button>
        </div>
      `;
      return;
    }

    // Already concluded and not explicitly editing
    if (isMatchConcluded(f) && !skIsEditing) {
      const s1Num = Number(f.s1);
      const s2Num = Number(f.s2);
      container.innerHTML = `
        <div class="sk-already-box">
          <div class="sk-already-badge">✓ MATCH ${fullMatchCode} ALREADY SCORED</div>
          <div class="sk-already-teams">
            <div class="sk-already-team ${s1Num === 15 ? 'winner' : ''}">
              <span>${t1Name}</span>
              <strong>${s1Num}</strong>
            </div>
            <div class="sk-already-team ${s2Num === 15 ? 'winner' : ''}">
              <span>${t2Name}</span>
              <strong>${s2Num}</strong>
            </div>
          </div>
          <div class="sk-already-meta">Court ${f.c} &bull; Block ${blockNum} &bull; Refs: ${refName}</div>
          <div class="sk-already-actions">
            <button type="button" class="btn-secondary" onclick="resetScorekeeperForm()">Back / Next</button>
            <button type="button" class="btn-primary" onclick="enterScorekeeperEditMode()">✏️ Edit Score</button>
          </div>
        </div>
      `;
      return;
    }

    // Unscored OR in Edit Mode
    skLoadedRevision = f.revision != null ? Number(f.revision) : 0;
    container.innerHTML = `
      <form class="sk-entry-card" onsubmit="handleScorekeeperSave(event)">
        <div class="sk-entry-header">
          <div class="sk-entry-badge-row">
            <span class="sk-match-id-badge">${fullMatchCode}</span>
            <span class="sk-block-badge">Block ${blockNum}</span>
            <span class="sk-court-badge">Court ${f.c}</span>
            ${skIsEditing ? '<span class="sk-editing-badge">✏️ EDITING</span>' : ''}
          </div>
          <div class="sk-target-rule-note">Target: First to <strong>15 points</strong> sudden death (no deuce)</div>
        </div>
        <div class="sk-teams-inputs-wrap">
          <div class="sk-team-block">
            <div class="sk-team-label">TEAM 1</div>
            <div class="sk-team-names">${t1Name}</div>
            <input type="number" id="skScore1" class="sk-score-input-large" inputmode="numeric" min="0" max="15" placeholder="0" value="${skIsEditing && f.s1 != null ? f.s1 : ''}" required autocomplete="off">
          </div>
          <div class="sk-vs-divider">VS</div>
          <div class="sk-team-block">
            <div class="sk-team-label">TEAM 2</div>
            <div class="sk-team-names">${t2Name}</div>
            <input type="number" id="skScore2" class="sk-score-input-large" inputmode="numeric" min="0" max="15" placeholder="0" value="${skIsEditing && f.s2 != null ? f.s2 : ''}" required autocomplete="off">
          </div>
        </div>
        <div class="sk-refs-info">👀 Referees: <strong>${refName}</strong></div>
        <div id="skErrorBox" class="sk-error-box" style="display:none;"></div>
        <div class="sk-actions-row">
          ${skIsEditing ? '<button type="button" class="btn-secondary" onclick="cancelScorekeeperEditMode()" style="flex:1;">Cancel</button>' : '<button type="button" class="btn-secondary" onclick="resetScorekeeperForm()" style="flex:1;">Reset</button>'}
          <button type="submit" id="skSaveBtn" class="sk-save-btn" style="flex:2;">
            <span>💾</span> ${skIsEditing ? 'SAVE EDITED SCORE' : 'SAVE SCORE'}
          </button>
        </div>
      </form>
    `;

    setTimeout(() => {
      document.getElementById('skScore1')?.focus();
    }, 50);
  }
  window.renderScorekeeperMatchDetail = renderScorekeeperMatchDetail;

  async function handleScorekeeperSave(e) {
    if (e) e.preventDefault();
    if (skIsSaving) return;

    const s1Input = document.getElementById('skScore1');
    const s2Input = document.getElementById('skScore2');
    const errorBox = document.getElementById('skErrorBox');
    const saveBtn = document.getElementById('skSaveBtn');

    if (!s1Input || !s2Input) return;

    skIsSaving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.6';
      saveBtn.innerHTML = '<span>⏳</span> Saving...';
    }

    const res = await saveTournamentScore(skSelectedMatchCode, s1Input.value, s2Input.value, skIsEditing, skLoadedRevision);

    if (res.ok) {
      // Show Success Banner
      const successArea = document.getElementById('skSuccessArea');
      if (successArea) {
        successArea.innerHTML = `
          <div class="sk-success-box">
            <div class="sk-success-title">✓ ${res.matchCode} SAVED</div>
            <div class="sk-success-summary">
              <div><strong>${res.t1}</strong>: ${res.score1}</div>
              <div><strong>${res.t2}</strong>: ${res.score2}</div>
            </div>
            <div class="sk-success-court">Court ${res.court}</div>
            <button type="button" class="btn-primary" onclick="resetScorekeeperForm()" style="margin-top:12px; width:100%; padding:10px; font-weight:800;">
              ENTER NEXT SCORE &rarr;
            </button>
          </div>
        `;
      }
      skSelectedMatchCode = "";
      skIsEditing = false;
      populateScorekeeperMatchSelect();
      renderScorekeeperRecentEntries();
      renderScorekeeperMatchDetail("");
      showToast(`✅ Match ${res.matchCode} score saved!`);
    } else {
      if (errorBox) {
        errorBox.textContent = res.error || "Failed to save score.";
        errorBox.style.display = "block";
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.innerHTML = `<span>💾</span> ${skIsEditing ? 'SAVE EDITED SCORE' : 'SAVE SCORE'}`;
      }
    }

    skIsSaving = false;
  }
  function enterScorekeeperEditMode() {
    skIsEditing = true;
    renderScorekeeperMatchDetail(skSelectedMatchCode);
  }
  window.enterScorekeeperEditMode = enterScorekeeperEditMode;

  function cancelScorekeeperEditMode() {
    skIsEditing = false;
    renderScorekeeperMatchDetail(skSelectedMatchCode);
  }
  window.cancelScorekeeperEditMode = cancelScorekeeperEditMode;

  function resetScorekeeperForm() {
    skSelectedMatchCode = "";
    skIsEditing = false;
    const successArea = document.getElementById('skSuccessArea');
    if (successArea) successArea.innerHTML = "";
    populateScorekeeperMatchSelect();
    renderScorekeeperMatchDetail("");
  }
  window.resetScorekeeperForm = resetScorekeeperForm;

  function renderScorekeeperRecentEntries() {
    const list = document.getElementById('skRecentEntriesList');
    if (!list) return;

    if (!skRecentEntries || skRecentEntries.length === 0) {
      list.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:12px;">No recent scores recorded on this device yet.</div>`;
      return;
    }

    list.innerHTML = skRecentEntries.map(item => {
      const timeStr = item.savedAt ? new Date(item.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '';
      const scoreDisplay = (item.action === 'EDIT' && item.prevScore) ? `${item.prevScore} &rarr; <strong>${item.score}</strong>` : `<strong>${item.score}</strong>`;
      return `
        <div class="sk-recent-item">
          <div class="sk-recent-item-left">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="sk-recent-badge">✓ ${item.matchCode}</span>
              <span class="sk-recent-score">${scoreDisplay}</span>
              <span class="sk-recent-court">Court ${item.court}</span>
              ${item.action === 'EDIT' ? '<span style="font-size:0.68rem; font-weight:800; background:rgba(245,158,11,0.2); color:var(--gold); padding:2px 6px; border-radius:4px;">EDITED</span>' : ''}
              <span style="font-size:0.72rem; color:var(--text-muted);">${timeStr}</span>
            </div>
            <div class="sk-recent-teams" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
              ${item.t1} vs ${item.t2}
            </div>
          </div>
          <div class="sk-recent-item-right">
            <button type="button" class="btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="loadScorekeeperMatchForEdit('${item.matchCode}')">
              View / Edit
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  window.renderScorekeeperRecentEntries = renderScorekeeperRecentEntries;

  function loadScorekeeperMatchForEdit(matchCode) {
    skSelectedMatchCode = matchCode;
    const select = document.getElementById('skMatchSelect');
    if (select) select.value = matchCode;
    skIsEditing = true;
    renderScorekeeperMatchDetail(matchCode);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.loadScorekeeperMatchForEdit = loadScorekeeperMatchForEdit;
  window.getSkRecentEntries = function () { return skRecentEntries; };
  window.setSkRecentEntries = function (arr) { skRecentEntries = arr; };

  // ---------- PHASE 7.6: SCORE ACTIVITY TIMELINE LOG MODAL & EXPORTS ----------
  function openScoreLogModal() {
    const modal = document.getElementById('scoreLogModal');
    if (modal) {
      modal.classList.add('open');
      renderScoreLogList();
    }
  }
  window.openScoreLogModal = openScoreLogModal;

  function closeScoreLogModal() {
    const modal = document.getElementById('scoreLogModal');
    if (modal) modal.classList.remove('open');
  }
  window.closeScoreLogModal = closeScoreLogModal;

  function renderScoreLogList() {
    const container = document.getElementById('scoreLogList');
    if (!container) return;

    if (!scoreActivityLog || scoreActivityLog.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:28px 16px; color:var(--text-muted); font-size:0.85rem; background:var(--bg-main); border-radius:var(--radius-md);">
          <div style="font-size:1.8rem; margin-bottom:4px;">📜</div>
          <div>No score activity records logged yet.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = scoreActivityLog.map(item => {
      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '';
      const isEdit = item.action === 'EDIT';
      const isReset = item.action.startsWith('RESET');

      if (isReset) {
        return `
          <div class="score-log-item" style="border-left: 3px solid #ef4444;">
            <div class="score-log-item-left">
              <div class="score-log-item-header">
                <span class="score-log-action-badge" style="background:rgba(239,68,68,0.15); color:#ef4444;">${item.action}</span>
                <span style="font-size:0.8rem; color:var(--text-secondary);">${item.stage || 'TOURNAMENT'}</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div class="score-log-time">${timeStr}</div>
            </div>
          </div>
        `;
      }

      const scoreStr = isEdit && (item.previousScore1 != null && item.previousScore2 != null)
        ? `${item.previousScore1}–${item.previousScore2} &rarr; <strong>${item.score1}–${item.score2}</strong>`
        : `<strong>${item.score1}–${item.score2}</strong>`;

      const stageLabel = item.stage === 'FINALS' ? 'Finals' : (item.block ? `Block ${item.block}` : 'Stage 1');
      const t1Str = Array.isArray(item.team1) ? item.team1.join(' & ') : (item.team1 || '');
      const t2Str = Array.isArray(item.team2) ? item.team2.join(' & ') : (item.team2 || '');

      return `
        <div class="score-log-item">
          <div class="score-log-item-left">
            <div class="score-log-item-header">
              <span class="score-log-action-badge ${isEdit ? 'edit' : 'save'}">${item.action}</span>
              <span class="match-pill">${item.matchId}</span>
              <span class="badge badge-court">Court ${item.court}</span>
              <span style="font-size:0.75rem; color:var(--text-secondary);">${stageLabel}</span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
              ${t1Str} vs ${t2Str}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.88rem; color:var(--text-primary);">${scoreStr}</div>
            <div class="score-log-time">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  window.renderScoreLogList = renderScoreLogList;

  function exportScoreLogJSON() {
    if (!scoreActivityLog || scoreActivityLog.length === 0) {
      showToast("⚠️ No activity log records to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scoreActivityLog, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `badminton_cup_score_log_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    showToast("💾 Score activity log exported (JSON)");
  }
  window.exportScoreLogJSON = exportScoreLogJSON;

  function exportScoreLogCSV() {
    if (!scoreActivityLog || scoreActivityLog.length === 0) {
      showToast("⚠️ No activity log records to export.");
      return;
    }
    const headers = ["Timestamp", "Action", "Stage", "MatchId", "Court", "Block", "Score1", "Score2", "PrevScore1", "PrevScore2", "Team1", "Team2"];
    const rows = scoreActivityLog.map(e => [
      `"${e.timestamp || ''}"`,
      `"${e.action || ''}"`,
      `"${e.stage || ''}"`,
      `"${e.matchId || ''}"`,
      `"${e.court || ''}"`,
      `"${e.block || ''}"`,
      `"${e.score1 ?? ''}"`,
      `"${e.score2 ?? ''}"`,
      `"${e.previousScore1 ?? ''}"`,
      `"${e.previousScore2 ?? ''}"`,
      `"${Array.isArray(e.team1) ? e.team1.join(' & ') : (e.team1 || '')}"`,
      `"${Array.isArray(e.team2) ? e.team2.join(' & ') : (e.team2 || '')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `badminton_cup_score_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("📄 Score activity log exported (CSV)");
  }
  window.exportScoreLogCSV = exportScoreLogCSV;

  // ---------- PHASE 8: AUTHENTICATION & CLOUD MODALS ----------
  function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      const errBox = document.getElementById('authErrorBox');
      if (errBox) {
        errBox.textContent = '';
        errBox.style.display = 'none';
      }
      modal.classList.add('open');
      setTimeout(() => document.getElementById('authEmail')?.focus(), 50);
    }
  }
  window.openAuthModal = openAuthModal;

  function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('open');
  }
  window.closeAuthModal = closeAuthModal;

  async function handleOrganizerSignInSubmit(e) {
    if (e) e.preventDefault();
    const emailInput = document.getElementById('authEmail');
    const passInput = document.getElementById('authPassword');
    const errBox = document.getElementById('authErrorBox');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (!emailInput || !passInput) return;
    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      if (errBox) {
        errBox.textContent = 'Please enter both email and password.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳</span> Signing In...';
    }

    try {
      if (typeof TournamentFirebase !== 'undefined') {
        const res = await TournamentFirebase.signInOrganizer(email, password);
        if (res.ok) {
          closeAuthModal();
          showToast('✅ Signed in as authorized organizer (' + email + ')');
          updateAdminUI();
          renderScorekeeperView();
        } else {
          if (errBox) {
            errBox.textContent = res.error || 'Authentication failed.';
            errBox.style.display = 'block';
          }
        }
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message || 'Authentication error.';
        errBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🔑</span> Sign In';
      }
    }
  }
  window.handleOrganizerSignInSubmit = handleOrganizerSignInSubmit;

  function openInitCloudModal() {
    document.getElementById('initCloudModal')?.classList.add('open');
  }
  window.openInitCloudModal = openInitCloudModal;

  function closeInitCloudModal() {
    document.getElementById('initCloudModal')?.classList.remove('open');
  }
  window.closeInitCloudModal = closeInitCloudModal;

  async function initializeCloudTournament() {
    const btn = document.getElementById('initCloudBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Initializing Cloud Tournament...';
    }

    try {
      const tRef = typeof TournamentFirebase !== 'undefined' ? TournamentFirebase.getTournamentRef() : null;
      if (!tRef) {
        alert('Firebase tournament reference not available.');
        return;
      }

      const isoNow = new Date().toISOString();
      const pushId = 'log_' + Date.now() + '_init';
      const user = (typeof TournamentFirebase !== 'undefined' && TournamentFirebase.getUser()) || null;
      const userLabel = user ? (user.email || user.uid) : 'Organizer';

      // Build initial stage 1 scores payload
      const stage1Scores = {};
      BASE_FIXTURES.forEach(f => {
        stage1Scores[f.m] = {
          s1: null,
          s2: null,
          revision: 0,
          updatedAt: null
        };
      });

      const initialPayload = {
        meta: {
          name: "Sindhi Boys Badminton Cup 2026",
          format: "24 Players · 4 Courts · 12 Rounds · 4-Block Mini-Pod Format",
          initializedAt: isoNow,
          initializedBy: userLabel,
          rules: "Sudden Death 15 pts (Stage 1) / 21 pts (Finals)"
        },
        stage1Scores: stage1Scores,
        stage1Lock: {
          locked: false,
          lockedAt: null,
          rankings: null,
          finalsPools: null,
          tieResolutions: {}
        },
        finalsScores: {
          gold: [{ s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }],
          silver: [{ s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }],
          bronze: [{ s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }],
          copper: [{ s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }]
        },
        finalsPlayoffs: {
          gold: [],
          silver: [],
          bronze: [],
          copper: []
        },
        scoreActivityLog: {
          [pushId]: {
            id: pushId,
            timestamp: isoNow,
            serverTimestamp: TournamentFirebase.getServerTimestamp(),
            action: 'INITIALIZE_TOURNAMENT',
            stage: 'SETUP',
            enteredBy: userLabel
          }
        }
      };

      const updates = {};
      updates['meta'] = initialPayload.meta;
      Object.keys(initialPayload.stage1Scores).forEach(mCode => {
        updates[`stage1Scores/${mCode}`] = initialPayload.stage1Scores[mCode];
      });
      updates['stage1Lock'] = initialPayload.stage1Lock;
      updates['finalsScores/gold'] = initialPayload.finalsScores.gold;
      updates['finalsScores/silver'] = initialPayload.finalsScores.silver;
      updates['finalsScores/bronze'] = initialPayload.finalsScores.bronze;
      updates['finalsScores/copper'] = initialPayload.finalsScores.copper;
      updates['finalsPlayoffs'] = initialPayload.finalsPlayoffs;
      updates[`scoreActivityLog/${pushId}`] = initialPayload.scoreActivityLog[pushId];

      await tRef.update(updates);
      closeInitCloudModal();
      sessionStorage.setItem('badminton_cloud_init_dismissed', 'true');
      showToast('🚀 Cloud tournament initialized with standard 48-match schedule!');
    } catch (err) {
      alert('Failed to initialize cloud tournament: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🚀</span> Initialize Blank Cloud Tournament';
      }
    }
  }
  window.initializeCloudTournament = initializeCloudTournament;

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

  // ---------- TOURNAMENT AI ASSISTANT CONCIERGE & VOICE CHAT ----------
  let aiVoiceOutputEnabled = true;
  let speechRecognitionInstance = null;

  window.toggleAiVoiceOutput = function () {
    aiVoiceOutputEnabled = !aiVoiceOutputEnabled;
    const btn = document.getElementById("aiVoiceToggleBtn");
    if (btn) {
      btn.classList.toggle("active", aiVoiceOutputEnabled);
      btn.innerHTML = aiVoiceOutputEnabled ? "🔊 Voice ON" : "🔇 Voice OFF";
      btn.title = aiVoiceOutputEnabled ? "Voice read-aloud is ON" : "Voice read-aloud is OFF";
    }
    if (!aiVoiceOutputEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  window.toggleVoiceInput = function () {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = document.getElementById("aiVoiceBtn");
    const input = document.getElementById("aiChatInput");

    if (!SpeechRecognition) {
      showToast("🎙️ Speech recognition is not supported in this browser. Please type your message.");
      return;
    }

    if (speechRecognitionInstance) {
      speechRecognitionInstance.stop();
      speechRecognitionInstance = null;
      if (micBtn) micBtn.classList.remove("listening");
      if (input) input.placeholder = "Speak or type your question...";
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = function () {
        if (micBtn) micBtn.classList.add("listening");
        if (input) input.placeholder = "Listening... Speak now 🎙️";
        showToast("🎙️ Listening... Ask your question now!");
      };

      recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        if (input) input.value = transcript;
        if (micBtn) micBtn.classList.remove("listening");
        if (input) input.placeholder = "Speak or type your question...";
        speechRecognitionInstance = null;
        window.handleAiChatSubmit();
      };

      recognition.onerror = function (event) {
        console.warn("Speech recognition error:", event.error);
        if (micBtn) micBtn.classList.remove("listening");
        if (input) input.placeholder = "Speak or type your question...";
        speechRecognitionInstance = null;
        if (event.error === "not-allowed") {
          showToast("⚠️ Microphone access was denied. Please allow microphone permissions.");
        } else {
          showToast("🎙️ Could not hear clearly. Please try again or type.");
        }
      };

      recognition.onend = function () {
        if (micBtn) micBtn.classList.remove("listening");
        if (input) input.placeholder = "Speak or type your question...";
        speechRecognitionInstance = null;
      };

      speechRecognitionInstance = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition init error:", err);
      if (micBtn) micBtn.classList.remove("listening");
      showToast("🎙️ Voice input unavailable. Please type your question.");
    }
  };

  function speakTextAloud(textToSpeak) {
    if (!aiVoiceOutputEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel(); // Stop any previous utterance
      // Strip HTML tags and formatting
      const clean = textToSpeak.replace(/<[^>]*>?/gm, "").replace(/[•#*]/g, "").trim();
      if (!clean) return;
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Text-to-speech error:", e);
    }
  }

  window.toggleAiChat = function () {
    const drawer = document.getElementById("aiChatDrawer");
    if (!drawer) return;
    const isHidden = drawer.classList.contains("hidden");
    drawer.classList.toggle("hidden", !isHidden);
    if (isHidden) {
      setTimeout(() => document.getElementById("aiChatInput")?.focus(), 100);
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
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

      // Speak response aloud if voice output is enabled
      speakTextAloud(response);
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

    // Match Number Specific Query (e.g., "M01", "M15", "Match 8", "who is playing in match 3")
    const matchMatch = q.match(/\b(?:match\s*#?|m)(\d{1,2})\b/i);
    if (matchMatch) {
      const matchNum = parseInt(matchMatch[1], 10);
      if (matchNum >= 1 && matchNum <= 48) {
        const f = fixtures[matchNum - 1];
        if (f) {
          const matchCode = f.m || ('M' + String(matchNum).padStart(2, '0'));
          const cInfo = COURT_INFO[f.c] || { name: `Court ${f.c}` };
          const s1 = (f.s1 != null && f.s1 !== '') ? f.s1 : '-';
          const s2 = (f.s2 != null && f.s2 !== '') ? f.s2 : '-';
          const hasScores = f.s1 != null && f.s2 != null && f.s1 !== '' && f.s2 !== '';
          let statusText = 'Pending';
          if (hasScores && (Number(f.s1) === 15 || Number(f.s2) === 15)) {
            const winner = Number(f.s1) === 15 ? f.t1.join(' & ') : f.t2.join(' & ');
            statusText = `Concluded (${winner} won ${f.s1}–${f.s2})`;
          } else if (hasScores && (Number(f.s1) > 0 || Number(f.s2) > 0)) {
            statusText = `In Progress (${s1}–${s2})`;
          }
          return `🏸 <strong>Match ${matchCode} Official Details:</strong><br>
• <strong>Block & Time:</strong> Block ${Math.ceil(f.r / 3)} (${ROUND_TIMES[f.r] || ''})<br>
• <strong>Court:</strong> ${cInfo.name} ${cInfo.sub ? '(' + cInfo.sub + ')' : ''}<br>
• <strong>Team 1:</strong> <strong>${f.t1.join(' & ')}</strong><br>
• <strong>Team 2:</strong> <strong>${f.t2.join(' & ')}</strong><br>
• <strong>Referees:</strong> ${f.refs.join(' & ')}<br>
• <strong>Status:</strong> ${statusText}`;
        }
      }
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
        const matchCode = nextMatch.m || ('M' + String(fixtures.indexOf(nextMatch) + 1).padStart(2, '0'));
        if (isRef) {
          return `👀 <strong>Next Duty for ${targetPlayer}:</strong><br>Refereeing <strong>Match ${matchCode}</strong> in <strong>Block ${Math.ceil(nextMatch.r / 3)} (${ROUND_TIMES[nextMatch.r] || ''})</strong> on <strong>${cInfo.name}</strong> with partner referee.`;
        } else {
          const partner = nextMatch.t1.includes(targetPlayer) 
            ? nextMatch.t1.find(p => p !== targetPlayer) 
            : nextMatch.t2.find(p => p !== targetPlayer);
          const opponents = nextMatch.t1.includes(targetPlayer) ? nextMatch.t2.join(" & ") : nextMatch.t1.join(" & ");
          return `🏸 <strong>Next Match for ${targetPlayer}:</strong><br>• <strong>Match ${matchCode} (Block ${Math.ceil(nextMatch.r / 3)}, ${ROUND_TIMES[nextMatch.r] || ''})</strong> on <strong>${cInfo.name}</strong><br>• Partner: <strong>${partner}</strong><br>• Opponents: <strong>${opponents}</strong>`;
        }
      } else {
        // All matches played or general schedule summary
        const pMatches = fixtures.filter(f => f.t1.includes(targetPlayer) || f.t2.includes(targetPlayer));
        return `📋 <strong>${targetPlayer}</strong> plays in Matches: <strong>${pMatches.map(m => m.m || ('M' + String(fixtures.indexOf(m) + 1).padStart(2, '0'))).join(', ')}</strong> (Blocks ${[...new Set(pMatches.map(m => Math.ceil(m.r / 3)))].join(', ')}).<br>Partners: ${partners.slice(0, 4).join(', ')}, etc.<br>Current Record: <strong>${pStats.wins}W - ${pStats.gp - pStats.wins}L</strong> (Rank #${pStats.rank}).`;
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
    } else if (params.get("recorded") === "1" || params.get("recorded") === "true") {
      loadRecordedStage1Scores(true);
    } else if (params.get("reset") === "1" || params.get("reset") === "true") {
      resetTournament(true);
    } else {
      loadState();
    }

    // Initialize Firebase Realtime Sync Engine (Phase 8)
    initFirebaseSync();

    updateAdminUI();
    populateOnboardingSelect();
    populatePlayerSelect();
    renderSchedule();
    renderLeaderboard();
    renderFinals();

    // Set active court filter button
    document.querySelectorAll('.court-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.court === currentCourtFilter);
    });

    // Check player identity and set initial view mode
    const savedIdentity = getStoredPlayerIdentity();
    if (savedIdentity) {
      switchTab('home');
    } else {
      switchTab('home');
      document.getElementById('playerOnboardingModal')?.classList.add('open');
    }
  });

})();

import * as THREE from 'three';

/* =========================================================
   VOXEL WRECK — 单文件体素拆城
   全部贴图/模型/音效均由代码生成，无任何网络请求
   ========================================================= */

/* ---------------- 世界常量 ---------------- */
const SX = 96, SY = 48, SZ = 96;
const CS = 16;
const CX = SX / CS, CY = SY / CS, CZ = SZ / CS;
const GROUND = 3;          // 地表方块的 y
const ROAD_W = 8;          // 道路宽度
const CELL = 24;           // 街区尺寸
const MAX_DEBRIS = 900;

/* ---------------- 方块定义 ---------------- */
const AIR = 0;
const BLOCK_TILES = {
  1:  [0, 1, 2],   // 草地
  2:  [2, 2, 2],   // 泥土
  3:  [3, 3, 3],   // 石头
  4:  [4, 4, 4],   // 沥青
  5:  [5, 5, 5],   // 路面标线
  6:  [6, 6, 6],   // 混凝土
  7:  [7, 7, 7],   // 玻璃幕墙
  8:  [8, 8, 8],   // 红砖
  9:  [9, 9, 9],   // 木材
  10: [10, 10, 10],// 树叶
  11: [11, 11, 11],// 金属
  12: [12, 12, 12],// 屋顶瓦
  13: [13, 13, 13],// 车漆
  14: [14, 14, 14],// 霓虹
  15: [15, 15, 15],// 深色窗
  16: [16, 16, 16],// 沙子
  17: [17, 17, 17],// 砂岩
  18: [18, 18, 18],// 水
  19: [19, 19, 19],// 大理石
  20: [20, 20, 20],// 石板路
};
const BLOCK_COLOR = {
  1: 0x6fa84c, 2: 0x7a5a3a, 3: 0x8b8f93, 4: 0x44474d, 5: 0xd8d8d0,
  6: 0xb9bcc0, 7: 0x6fb9d6, 8: 0xa8483c, 9: 0x8a5a30, 10: 0x4f8a3a,
  11: 0x565e6b, 12: 0x8e3a3a, 13: 0x2f7fd6, 14: 0x36e0ff, 15: 0x37506b,
  16: 0xd8c294, 17: 0xc4a878, 18: 0x3f8fc4, 19: 0xe4e6ea, 20: 0xa8a294,
};

/* ---------------- 随机数 ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- 程序化贴图图集 ---------------- */
const TILE = 32, ATLAS_N = 5, ATLAS_SIZE = TILE * ATLAS_N;

function buildAtlas() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = ATLAS_SIZE;
  const g = cv.getContext('2d');
  const rnd = mulberry32(20261125);
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const rect = i => [(i % ATLAS_N) * TILE, Math.floor(i / ATLAS_N) * TILE];

  function noise(i, rgb, amp, cell) {
    const [ox, oy] = rect(i);
    for (let y = 0; y < TILE; y += cell) {
      for (let x = 0; x < TILE; x += cell) {
        const n = (rnd() - 0.5) * 2 * amp;
        g.fillStyle = `rgb(${clamp(rgb[0] + n)},${clamp(rgb[1] + n)},${clamp(rgb[2] + n)})`;
        g.fillRect(ox + x, oy + y, cell, cell);
      }
    }
  }
  function overlay(i, draw) {
    const [ox, oy] = rect(i);
    g.save(); g.translate(ox, oy); draw(g, rnd); g.restore();
  }

  // 0 草顶
  noise(0, [104, 158, 70], 26, 2);
  overlay(0, (c, r) => {
    for (let k = 0; k < 26; k++) {
      c.fillStyle = r() < 0.5 ? 'rgba(150,205,105,.55)' : 'rgba(70,115,50,.5)';
      c.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 2);
    }
  });
  // 1 草侧
  noise(1, [122, 92, 62], 18, 2);
  overlay(1, (c, r) => {
    c.fillStyle = '#6b9f45'; c.fillRect(0, 0, TILE, 8);
    for (let x = 0; x < TILE; x += 2) {
      c.fillStyle = r() < 0.5 ? '#7cb050' : '#5d8f3c';
      c.fillRect(x, 0, 2, 7 + Math.floor(r() * 3));
    }
    for (let k = 0; k < 22; k++) {
      c.fillStyle = 'rgba(70,52,34,.45)';
      c.fillRect(Math.floor(r() * 30), 10 + Math.floor(r() * 20), 2, 2);
    }
  });
  // 2 泥土
  noise(2, [122, 92, 62], 22, 2);
  overlay(2, (c, r) => {
    for (let k = 0; k < 20; k++) {
      c.fillStyle = r() < 0.5 ? 'rgba(90,66,44,.5)' : 'rgba(155,120,84,.45)';
      c.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 3, 2);
    }
  });
  // 3 石头
  noise(3, [140, 144, 148], 20, 2);
  overlay(3, (c, r) => {
    for (let k = 0; k < 14; k++) {
      c.strokeStyle = 'rgba(90,95,100,.5)'; c.lineWidth = 1;
      const x = Math.floor(r() * 28), y = Math.floor(r() * 28);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3 + r() * 3, y + 2); c.stroke();
    }
  });
  // 4 沥青
  noise(4, [62, 66, 72], 12, 2);
  overlay(4, (c, r) => {
    for (let k = 0; k < 30; k++) {
      c.fillStyle = r() < 0.5 ? 'rgba(120,126,134,.35)' : 'rgba(30,34,40,.4)';
      c.fillRect(Math.floor(r() * 31), Math.floor(r() * 31), 1, 1);
    }
  });
  // 5 路面标线
  noise(5, [62, 66, 72], 12, 2);
  overlay(5, c => { c.fillStyle = '#e8e4cf'; c.fillRect(13, 0, 6, TILE); });
  // 6 混凝土
  noise(6, [186, 189, 193], 14, 2);
  overlay(6, (c, r) => {
    c.strokeStyle = 'rgba(150,154,160,.7)'; c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    for (let k = 0; k < 10; k++) {
      c.fillStyle = 'rgba(160,164,170,.45)';
      c.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 2);
    }
  });
  // 7 玻璃幕墙
  noise(7, [88, 158, 186], 10, 4);
  overlay(7, (c, r) => {
    c.fillStyle = 'rgba(196,240,255,.28)';
    c.beginPath(); c.moveTo(0, 26); c.lineTo(20, 0); c.lineTo(30, 0); c.lineTo(2, 32); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40,70,90,.85)'; c.lineWidth = 2;
    c.strokeRect(1, 1, TILE - 2, TILE - 2);
    c.beginPath(); c.moveTo(0, 16); c.lineTo(TILE, 16); c.stroke();
    c.beginPath(); c.moveTo(16, 0); c.lineTo(16, TILE); c.stroke();
  });
  // 8 红砖
  noise(8, [168, 72, 60], 14, 2);
  overlay(8, c => {
    c.fillStyle = 'rgba(214,206,192,.9)';
    for (let row = 0; row < 4; row++) {
      c.fillRect(0, row * 8, TILE, 1.5);
      const off = row % 2 ? 8 : 0;
      for (let x = off; x < TILE; x += 16) c.fillRect(x, row * 8, 1.5, 8);
    }
  });
  // 9 木材
  noise(9, [146, 100, 58], 16, 2);
  overlay(9, (c, r) => {
    for (let k = 0; k < 4; k++) {
      c.fillStyle = 'rgba(96,64,34,.6)';
      c.fillRect(0, k * 8 + 6, TILE, 2);
    }
    for (let k = 0; k < 10; k++) {
      c.fillStyle = 'rgba(180,132,82,.4)';
      c.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 4, 1);
    }
  });
  // 10 树叶
  noise(10, [76, 138, 58], 26, 2);
  overlay(10, (c, r) => {
    for (let k = 0; k < 40; k++) {
      c.fillStyle = r() < 0.5 ? 'rgba(48,96,40,.55)' : 'rgba(126,190,84,.5)';
      c.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 3, 3);
    }
  });
  // 11 金属
  noise(11, [96, 104, 116], 10, 2);
  overlay(11, c => {
    c.strokeStyle = 'rgba(60,66,78,.9)'; c.lineWidth = 2;
    c.strokeRect(1, 1, TILE - 2, TILE - 2);
    c.fillStyle = 'rgba(180,190,205,.75)';
    for (let x = 6; x < TILE; x += 10) for (let y = 6; y < TILE; y += 10) c.fillRect(x, y, 2, 2);
  });
  // 12 屋顶瓦
  noise(12, [136, 58, 58], 14, 2);
  overlay(12, c => {
    c.strokeStyle = 'rgba(84,30,30,.75)'; c.lineWidth = 1.5;
    for (let y = 0; y < TILE; y += 8) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(TILE, y); c.stroke();
      for (let x = 0; x < TILE; x += 8) {
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 8); c.stroke();
      }
    }
  });
  // 13 车漆
  noise(13, [56, 132, 214], 8, 4);
  overlay(13, c => {
    c.fillStyle = 'rgba(255,255,255,.22)';
    c.fillRect(0, 2, TILE, 3);
  });
  // 14 霓虹
  noise(14, [40, 220, 240], 8, 4);
  overlay(14, c => {
    const grd = c.createLinearGradient(0, 0, TILE, TILE);
    grd.addColorStop(0, 'rgba(255,255,255,.95)');
    grd.addColorStop(.5, 'rgba(70,240,255,.55)');
    grd.addColorStop(1, 'rgba(255,110,200,.75)');
    c.fillStyle = grd; c.fillRect(0, 0, TILE, TILE);
  });
  // 15 深色窗
  noise(15, [58, 82, 108], 8, 4);
  overlay(15, c => {
    c.fillStyle = 'rgba(150,210,240,.28)';
    c.beginPath(); c.moveTo(2, 22); c.lineTo(22, 2); c.lineTo(30, 2); c.lineTo(2, 30); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(30,44,60,.9)'; c.lineWidth = 2;
    c.strokeRect(1, 1, TILE - 2, TILE - 2);
  });

  // 16 沙子
  noise(16, [216, 194, 148], 16, 2);
  overlay(16, (c, r) => {
    for (let k = 0; k < 24; k++) {
      c.fillStyle = r() < 0.5 ? 'rgba(196,172,124,.55)' : 'rgba(238,220,178,.6)';
      c.fillRect(Math.floor(r() * 31), Math.floor(r() * 31), 2, 1);
    }
  });
  // 17 砂岩
  noise(17, [204, 176, 128], 12, 2);
  overlay(17, c => {
    c.strokeStyle = 'rgba(160,132,88,.55)'; c.lineWidth = 1.5;
    for (let y = 4; y < TILE; y += 8) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(TILE, y); c.stroke();
    }
  });
  // 18 水
  noise(18, [58, 132, 192], 10, 4);
  overlay(18, (c, r) => {
    for (let k = 0; k < 10; k++) {
      c.strokeStyle = 'rgba(150,215,245,.5)'; c.lineWidth = 1.5;
      const y = Math.floor(r() * 30);
      c.beginPath(); c.moveTo(0, y); c.lineTo(TILE, y + 2); c.stroke();
    }
  });
  // 19 大理石
  noise(19, [226, 228, 232], 8, 2);
  overlay(19, (c, r) => {
    c.strokeStyle = 'rgba(178,184,194,.6)'; c.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.moveTo(r() * 32, 0);
      c.lineTo(r() * 32, TILE);
      c.stroke();
    }
  });
  // 20 石板路
  noise(20, [170, 164, 150], 12, 2);
  overlay(20, c => {
    c.strokeStyle = 'rgba(120,114,102,.75)'; c.lineWidth = 2;
    c.strokeRect(1, 1, TILE - 2, TILE - 2);
    c.beginPath(); c.moveTo(TILE / 2, 0); c.lineTo(TILE / 2, TILE); c.stroke();
  });

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/* ---------------- 世界存储 ---------------- */
const world = new Uint8Array(SX * SY * SZ);
const at = (x, y, z) => (y * SZ + z) * SX + x;

function getB(x, y, z) {
  if (x < 0 || x >= SX || y < 0 || y >= SY || z < 0 || z >= SZ) return AIR;
  return world[at(x, y, z)];
}
function setB(x, y, z, v) {
  if (x < 0 || x >= SX || y < 0 || y >= SY || z < 0 || z >= SZ) return;
  world[at(x, y, z)] = v;
}
const isSolid = (x, y, z) => getB(x, y, z) !== AIR;

/* ---------------- 世界生成 ---------------- */
let totalBreakable = 0;
let currentMap = 'city';
let spawnPoint = { x: 4.5, y: GROUND + 1.2, z: 4.5, yaw: -2.36 };

const MAPS = [
  { id: 'city', name: '街区', desc: '高楼街道' },
  { id: 'airport', name: '机场', desc: '跑道塔台' },
  { id: 'park', name: '公园', desc: '树林池塘' },
  { id: 'pyramid', name: '金字塔', desc: '沙漠古迹' },
];

function generateWorld(seed, mapId) {
  world.fill(0);
  currentMap = mapId || currentMap || 'city';
  const rnd = mulberry32(seed);
  if (currentMap === 'airport') buildAirport(rnd);
  else if (currentMap === 'park') buildPark(rnd);
  else if (currentMap === 'pyramid') buildPyramid(rnd);
  else buildCity(rnd);
  countBreakable();
  clearSpawnArea();
}

function countBreakable() {
  totalBreakable = 0;
  for (let y = GROUND + 1; y < SY; y++) {
    for (let z = 0; z < SZ; z++) {
      for (let x = 0; x < SX; x++) {
        if (world[at(x, y, z)]) totalBreakable++;
      }
    }
  }
}

function clearSpawnArea() {
  const sx = Math.floor(spawnPoint.x), sz = Math.floor(spawnPoint.z);
  for (let y = GROUND + 1; y <= GROUND + 5; y++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) setB(sx + dx, y, sz + dz, AIR);
    }
  }
}

function buildCity(rnd) {
  const isRoadX = (x, z) => (z % CELL) < ROAD_W;   // 沿 x 延伸的道路
  const isRoadZ = (x, z) => (x % CELL) < ROAD_W;   // 沿 z 延伸的道路

  // 地面
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      const rx = isRoadX(x, z), rz = isRoadZ(x, z);
      setB(x, 0, z, 3);
      setB(x, 1, z, 2);
      setB(x, 2, z, 2);
      let surface = 1;
      if (rx || rz) {
        surface = 4;
        const lane = (rx && !rz && (x % 10) < 4) || (rz && !rx && (z % 10) < 4);
        if (lane) surface = 5;
      }
      setB(x, GROUND, z, surface);
    }
  }

  const styles = [
    { wall: 8, win: 15, win2: 7, roof: 12 },
    { wall: 6, win: 7, win2: 15, roof: 11 },
    { wall: 11, win: 15, win2: 7, roof: 6 },
    { wall: 6, win: 7, win2: 7, roof: 12 },
  ];

  // 建筑
  function building(x0, z0, w, d, h, st) {
    const base = GROUND + 1, top = base + h;
    for (let y = base; y < top; y++) {
      for (let x = x0; x < x0 + w; x++) {
        for (let z = z0; z < z0 + d; z++) {
          const ex = x === x0 || x === x0 + w - 1;
          const ez = z === z0 || z === z0 + d - 1;
          if (!ex && !ez) {
            if ((y - base) % 4 === 0) setB(x, y, z, 6); // 楼板
            continue;
          }
          const yy = y - base;
          let b = st.wall;
          if (yy === 0) b = rnd() < 0.55 ? 7 : st.wall;             // 底层橱窗
          else if (yy % 3 !== 0 && (x + z) % 2 === 0) b = rnd() < 0.3 ? st.win2 : st.win;
          setB(x, y, z, b);
        }
      }
    }
    // 楼顶
    for (let x = x0; x < x0 + w; x++) {
      for (let z = z0; z < z0 + d; z++) {
        setB(x, top, z, st.roof);
        const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
        if (edge && h > 10) setB(x, top + 1, z, st.wall);
      }
    }
    // 屋顶设备
    if (h > 12 && w > 7 && d > 7) {
      const cx = x0 + ((w / 2) | 0), cz = z0 + ((d / 2) | 0);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        setB(cx + dx, top + 1, cz + dz, 11);
      }
      setB(cx, top + 2, cz, 14);
    }
    // 霓虹招牌
    if (h > 9 && rnd() < 0.45) {
      const side = Math.floor(rnd() * 4);
      const len = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < len; i++) {
        if (side === 0) setB(x0, base + 2 + i, z0 + 1, 14);
        else if (side === 1) setB(x0 + w - 1, base + 2 + i, z0 + d - 2, 14);
        else if (side === 2) setB(x0 + 1, base + 2 + i, z0, 14);
        else setB(x0 + w - 2, base + 2 + i, z0 + d - 1, 14);
      }
    }
  }

  function tree(x, z) {
    const h = 3 + Math.floor(rnd() * 3);
    for (let i = 1; i <= h; i++) setB(x, GROUND + i, z, 9);
    const cy = GROUND + h;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -1; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 3) continue;
          if (rnd() < 0.12) continue;
          if (!getB(x + dx, cy + dy, z + dz)) setB(x + dx, cy + dy, z + dz, 10);
        }
      }
    }
  }

  function car(x, z) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        setB(x + i, GROUND + 1, z + j, 13);
        const roofGlass = (i === 1 || i === 2);
        setB(x + i, GROUND + 2, z + j, roofGlass ? 15 : 13);
      }
    }
    setB(x, GROUND + 3, z, 11);
    setB(x + 3, GROUND + 3, z + 1, 11);
  }

  function lamp(x, z) {
    for (let i = 1; i <= 5; i++) setB(x, GROUND + i, z, 11);
    setB(x, GROUND + 6, z, 14);
  }

  // 街区
  for (let pz = ROAD_W; pz + 16 <= SZ; pz += CELL) {
    for (let px = ROAD_W; px + 16 <= SX; px += CELL) {
      const roll = rnd();
      if (roll < 0.74) {
        const st = styles[Math.floor(rnd() * styles.length)];
        if (rnd() < 0.32) {
          const w1 = 6 + Math.floor(rnd() * 4), d1 = 6 + Math.floor(rnd() * 6);
          building(px + 1, pz + 1, w1, d1, 6 + Math.floor(rnd() * 12), st);
          const w2 = 6 + Math.floor(rnd() * 4), d2 = 6 + Math.floor(rnd() * 6);
          building(px + 15 - w2, pz + 15 - d2, w2, d2, 8 + Math.floor(rnd() * 16), styles[Math.floor(rnd() * styles.length)]);
        } else {
          const w = 9 + Math.floor(rnd() * 5), d = 9 + Math.floor(rnd() * 5);
          const h = 8 + Math.floor(rnd() * 16);
          const ox = Math.floor(rnd() * (16 - w)), oz = Math.floor(rnd() * (16 - d));
          building(px + ox, pz + oz, w, d, h, st);
        }
      } else if (roll < 0.9) {
        for (let i = 0; i < 3; i++) {
          tree(px + 2 + Math.floor(rnd() * 12), pz + 2 + Math.floor(rnd() * 12));
        }
      } else {
        // 集装箱堆场
        for (let i = 0; i < 3; i++) {
          const bx = px + 2 + Math.floor(rnd() * 9), bz = pz + 2 + Math.floor(rnd() * 9);
          const w = 3 + Math.floor(rnd() * 2), hh = 2 + Math.floor(rnd() * 3);
          for (let x = 0; x < w; x++) for (let z = 0; z < 2; z++) for (let y = 1; y <= hh; y++) {
            setB(bx + x, GROUND + y, bz + z, rnd() < 0.15 ? 14 : 11);
          }
        }
      }
    }
  }

  // 路上的车与路灯
  for (let z = 0; z < SZ; z += CELL) {
    for (let x = 0; x < SX; x += CELL) {
      if (rnd() < 0.75 && x + 6 < SX) car(x + 2, z + 3 + Math.floor(rnd() * 2));
      if (rnd() < 0.5 && z + 10 < SZ) lamp(x + 1, z + 11);
    }
  }

  spawnPoint = { x: 4.5, y: GROUND + 1.2, z: 4.5, yaw: -2.36 };
}

/* ---------------- 地图：机场 ---------------- */
function buildAirport(rnd) {
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      setB(x, 0, z, 3);
      setB(x, 1, z, 2);
      setB(x, 2, z, 2);
      setB(x, GROUND, z, 1);
    }
  }

  const inApron = (x, z) => x >= 8 && x <= 88 && z >= 16 && z <= 32;
  const inRunway = (x, z) => x >= 4 && x <= 92 && z >= 38 && z <= 54;
  for (let z = 16; z <= 54; z++) {
    for (let x = 4; x <= 92; x++) {
      if (inRunway(x, z) || inApron(x, z)) setB(x, GROUND, z, 4);
    }
  }
  // 跑道中线与端线
  for (let x = 8; x <= 88; x += 4) setB(x, GROUND, 46, 5);
  for (let z = 39; z <= 53; z++) { setB(6, GROUND, z, 5); setB(90, GROUND, z, 5); }
  for (let z = 17; z <= 31; z++) { setB(10, GROUND, z, 5); }

  // 航站楼
  for (let y = GROUND + 1; y <= GROUND + 8; y++) {
    for (let x = 12; x <= 82; x++) {
      for (let z = 6; z <= 14; z++) {
        const edge = x === 12 || x === 82 || z === 6 || z === 14;
        if (!edge) {
          if (y === GROUND + 1 || y === GROUND + 8) setB(x, y, z, 6);
          continue;
        }
        const b = (y > GROUND + 1 && y < GROUND + 8 && (x + z) % 3 !== 0) ? 7 : 6;
        setB(x, y, z, b);
      }
    }
  }
  for (let x = 11; x <= 83; x++) {
    for (let z = 5; z <= 15; z++) setB(x, GROUND + 9, z, 11);
  }

  // 塔台
  for (let y = GROUND + 1; y <= GROUND + 15; y++) {
    for (let x = 84; x <= 90; x++) {
      for (let z = 18; z <= 24; z++) {
        const edge = x === 84 || x === 90 || z === 18 || z === 24;
        if (!edge) continue;
        setB(x, y, z, y > GROUND + 11 ? 7 : 6);
      }
    }
  }
  for (let x = 83; x <= 91; x++) for (let z = 17; z <= 25; z++) setB(x, GROUND + 16, z, 19);
  setB(87, GROUND + 17, 21, 11);
  setB(87, GROUND + 18, 21, 14);

  // 机库
  for (let y = GROUND + 1; y <= GROUND + 8; y++) {
    for (let x = 16; x <= 34; x++) {
      for (let z = 20; z <= 30; z++) {
        const edge = x === 16 || x === 34 || z === 20 || z === 30;
        if (edge) setB(x, y, z, 11);
      }
    }
  }
  for (let k = 0; k < 3; k++) {
    for (let x = 16 + k; x <= 34 - k; x++) {
      for (let z = 20 + k; z <= 30 - k; z++) setB(x, GROUND + 9, z, k === 2 ? 14 : 11);
    }
  }

  // 客机
  function plane(cx, cz) {
    for (let i = -7; i <= 7; i++) {
      for (let dz = -1; dz <= 1; dz++) {
        setB(cx + i, GROUND + 2, cz + dz, 19);
        setB(cx + i, GROUND + 3, cz + dz, (i >= -2 && i <= 3) ? 7 : 19);
      }
    }
    setB(cx + 8, GROUND + 2, cz, 19);
    setB(cx - 8, GROUND + 2, cz, 19);
    setB(cx - 8, GROUND + 3, cz, 19);
    setB(cx - 8, GROUND + 4, cz, 12);
    for (let dz = -7; dz <= 7; dz++) {
      setB(cx - 1, GROUND + 2, cz + dz, 19);
      setB(cx + 1, GROUND + 2, cz + dz, 19);
    }
    for (const dz of [-4, 4]) {
      setB(cx - 1, GROUND + 1, cz + dz, 11);
      setB(cx + 1, GROUND + 1, cz + dz, 11);
    }
  }
  plane(42, 26);
  plane(68, 26);

  // 跑道灯
  for (let x = 8; x <= 88; x += 12) {
    for (let i = 1; i <= 5; i++) setB(x, GROUND + i, 36, 11);
    setB(x, GROUND + 6, 36, 14);
  }

  spawnPoint = { x: 48.5, y: GROUND + 1.2, z: 34.5, yaw: 0 };
}

/* ---------------- 地图：公园 ---------------- */
function treeAt(x, z, rnd, tall) {
  const h = (tall ? 5 : 3) + Math.floor(rnd() * 3);
  for (let i = 1; i <= h; i++) setB(x, GROUND + i, z, 9);
  const cy = GROUND + h;
  const r = tall ? 3 : 2;
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dy = -1; dy <= 2; dy++) {
        if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > r + 1) continue;
        if (rnd() < 0.12) continue;
        if (!getB(x + dx, cy + dy, z + dz)) setB(x + dx, cy + dy, z + dz, 10);
      }
    }
  }
}

function buildPark(rnd) {
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      setB(x, 0, z, 3);
      setB(x, 1, z, 2);
      setB(x, 2, z, 2);
      setB(x, GROUND, z, 1);
    }
  }

  // 十字石子路
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      if (Math.abs(x - 48) <= 1 || Math.abs(z - 48) <= 1) setB(x, GROUND, z, 20);
    }
  }

  // 池塘
  for (let z = 12; z <= 40; z++) {
    for (let x = 12; x <= 40; x++) {
      const d = Math.hypot(x - 26, z - 26);
      if (d < 9) {
        setB(x, GROUND, z, AIR);
        setB(x, GROUND - 1, z, 18);
        setB(x, GROUND - 2, z, 18);
      } else if (d < 10.5) {
        setB(x, GROUND, z, 20);
      }
    }
  }

  // 凉亭
  for (const [px, pz] of [[68, 22], [74, 22], [68, 28], [74, 28]]) {
    for (let i = 1; i <= 4; i++) setB(px, GROUND + i, pz, 9);
  }
  for (let x = 66; x <= 76; x++) {
    for (let z = 20; z <= 30; z++) setB(x, GROUND + 5, z, 19);
  }
  for (let x = 67; x <= 75; x++) {
    for (let z = 21; z <= 29; z++) setB(x, GROUND + 6, z, 20);
  }

  // 长椅
  function bench(x, z) {
    for (let i = 0; i < 3; i++) {
      setB(x + i, GROUND + 1, z, 9);
      setB(x + i, GROUND + 2, z, 9);
    }
  }
  bench(30, 52); bench(64, 44); bench(44, 62); bench(52, 30);

  // 花坛
  for (let i = 0; i < 6; i++) {
    const bx = 20 + Math.floor(rnd() * 56), bz = 20 + Math.floor(rnd() * 56);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (getB(bx + dx, GROUND, bz + dz) !== 1) continue;
        setB(bx + dx, GROUND + 1, bz + dz, rnd() < 0.5 ? 10 : 14);
      }
    }
  }

  // 树林
  for (let i = 0; i < 70; i++) {
    const x = 3 + Math.floor(rnd() * 90);
    const z = 3 + Math.floor(rnd() * 90);
    if (getB(x, GROUND, z) !== 1) continue;
    if (Math.hypot(x - 26, z - 26) < 12) continue;
    if (x >= 64 && x <= 78 && z >= 18 && z <= 32) continue;
    treeAt(x, z, rnd, rnd() < 0.4);
  }

  spawnPoint = { x: 48.5, y: GROUND + 1.2, z: 84.5, yaw: 0 };
}

/* ---------------- 地图：金字塔 ---------------- */
function buildPyramid(rnd) {
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      setB(x, 0, z, 3);
      setB(x, 1, z, 2);
      setB(x, 2, z, 16);
      setB(x, GROUND, z, 16);
    }
  }

  function pyramid(cx, cz, half, height) {
    for (let i = 0; i < height; i++) {
      const h2 = Math.max(0, Math.round(half * (1 - i / height)));
      const y = GROUND + 1 + i;
      for (let x = cx - h2; x <= cx + h2; x++) {
        for (let z = cz - h2; z <= cz + h2; z++) {
          setB(x, y, z, i % 7 === 4 ? 19 : 17);
        }
      }
    }
    // 塔尖
    setB(cx, GROUND + 1 + height, cz, 14);
  }

  pyramid(48, 48, 20, 24);
  pyramid(16, 16, 8, 10);
  pyramid(80, 76, 10, 12);

  // 方尖碑
  function obelisk(x, z) {
    for (let i = 1; i <= 16; i++) {
      setB(x, GROUND + i, z, 19);
      setB(x + 1, GROUND + i, z, 19);
      setB(x, GROUND + i, z + 1, 19);
      setB(x + 1, GROUND + i, z + 1, 19);
    }
    setB(x, GROUND + 17, z, 14);
    setB(x + 1, GROUND + 17, z + 1, 14);
  }
  obelisk(10, 82);
  obelisk(84, 10);

  // 狮身像（方块版）
  for (let x = 26; x <= 40; x++) {
    for (let z = 72; z <= 78; z++) {
      setB(x, GROUND + 1, z, 17);
      if (x >= 30 && x <= 36) setB(x, GROUND + 2, z, 17);
    }
  }
  for (let x = 33; x <= 38; x++) {
    for (let z = 73; z <= 77; z++) {
      setB(x, GROUND + 3, z, 17);
      setB(x, GROUND + 4, z, 17);
    }
  }
  for (let z = 73; z <= 77; z += 4) setB(38, GROUND + 5, z, 17);

  // 棕榈树
  for (let i = 0; i < 26; i++) {
    const x = 3 + Math.floor(rnd() * 90);
    const z = 3 + Math.floor(rnd() * 90);
    if (getB(x, GROUND, z) !== 16) continue;
    const h = 4 + Math.floor(rnd() * 3);
    for (let y = 1; y <= h; y++) setB(x, GROUND + y, z, 9);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > 3) continue;
        if (!getB(x + dx, GROUND + h + 1, z + dz)) setB(x + dx, GROUND + h + 1, z + dz, 10);
      }
    }
  }

  spawnPoint = { x: 48.5, y: GROUND + 1.2, z: 86.5, yaw: 0 };
}

/* ---------------- 渲染环境 ---------------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const maxRatio = Math.min(window.devicePixelRatio || 1, 1.75);
let ratio = maxRatio;
renderer.setPixelRatio(ratio);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0xcfe6f6, 1);

// 分辨率自适应：只降不升，避免在阈值附近来回切换造成画面"抖动"
let lowFpsStreak = 0;
let qualityCooldown = 0;
function adaptQuality(fps, dt) {
  qualityCooldown = Math.max(0, qualityCooldown - dt);
  if (!locked || ratio <= 0.6) return;
  if (fps < 45) lowFpsStreak++;
  else lowFpsStreak = 0;
  if (qualityCooldown > 0 || lowFpsStreak < 3) return;
  lowFpsStreak = 0;
  qualityCooldown = 2.5;
  ratio = Math.max(0.6, ratio - 0.15);
  renderer.setPixelRatio(ratio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  updateFxScale();
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe6f6, 150, 340);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 600);
camera.rotation.order = 'YXZ';
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xdff0ff, 0xa89a86, 1.45);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xbcd6ee, 0.5);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff6e6, 2.4);
sun.position.set(90, 140, 70);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xa8ccf0, 0.5);
fill.position.set(-90, 60, -70);
scene.add(fill);

// 天空穹顶
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: `
    varying vec3 vDir;
    void main(){
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    varying vec3 vDir;
    void main(){
      float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 hor = vec3(0.86, 0.92, 0.97);
      vec3 mid = vec3(0.50, 0.72, 0.93);
      vec3 top = vec3(0.21, 0.46, 0.82);
      vec3 c = mix(hor, mid, smoothstep(0.47, 0.61, h));
      c = mix(c, top, smoothstep(0.59, 0.93, h));
      vec3 sd = normalize(vec3(0.44, 0.60, 0.66));
      float s = max(dot(normalize(vDir), sd), 0.0);
      c += vec3(1.0, 0.97, 0.9) * pow(s, 900.0) * 2.2;
      c += vec3(1.0, 0.96, 0.86) * pow(s, 14.0) * 0.16;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(340, 32, 20), skyMat);
sky.frustumCulled = false;
sky.renderOrder = -10;
scene.add(sky);

/* ---------------- 区块网格 ---------------- */
const atlas = buildAtlas();
const terrainMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true });

const chunkMeshes = new Array(CX * CY * CZ).fill(null);
const UAXIS = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

const FACE_DEFS = [];
for (let a = 0; a < 3; a++) {
  for (const s of [1, -1]) {
    FACE_DEFS.push({ a, s, u: (a + 1) % 3, v: (a + 2) % 3 });
  }
}
const AO_SHADE = [0.48, 0.66, 0.83, 1.0];
const CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]];
const ORDER_POS = [0, 1, 2, 3];
const ORDER_NEG = [0, 3, 2, 1];

function tileUV(tile) {
  return {
    x0: (tile % ATLAS_N) / ATLAS_N,
    yTop: 1 - Math.floor(tile / ATLAS_N) / ATLAS_N,
    w: 1 / ATLAS_N,
    h: 1 / ATLAS_N,
  };
}

const chunkIndex = (cx, cy, cz) => (cy * CZ + cz) * CX + cx;

function buildChunk(cx, cy, cz) {
  const pos = [], nor = [], uvs = [], col = [], idx = [];
  const bx0 = cx * CS, by0 = cy * CS, bz0 = cz * CS;

  for (let y = by0; y < by0 + CS; y++) {
    for (let z = bz0; z < bz0 + CS; z++) {
      for (let x = bx0; x < bx0 + CS; x++) {
        const b = getB(x, y, z);
        if (!b) continue;
        const tiles = BLOCK_TILES[b];
        for (let fi = 0; fi < FACE_DEFS.length; fi++) {
          const f = FACE_DEFS[fi];
          const nx = x + (f.a === 0 ? f.s : 0);
          const ny = y + (f.a === 1 ? f.s : 0);
          const nz = z + (f.a === 2 ? f.s : 0);
          if (isSolid(nx, ny, nz)) continue;

          const tile = f.a === 1 ? (f.s > 0 ? tiles[0] : tiles[2]) : tiles[1];
          const tu = tileUV(tile);
          const U = UAXIS[f.u], V = UAXIS[f.v], W = UAXIS[f.a];
          const ord = f.s > 0 ? ORDER_POS : ORDER_NEG;
          const nvx = W[0] * f.s, nvy = W[1] * f.s, nvz = W[2] * f.s;
          const ox = f.s > 0 ? W[0] : 0, oy = f.s > 0 ? W[1] : 0, oz = f.s > 0 ? W[2] : 0;
          const base = pos.length / 3;
          idx.push(base, base + 1, base + 2, base, base + 2, base + 3);

          for (let k = 0; k < 4; k++) {
            const c = CORNERS[ord[k]];
            const a = c[0], bb = c[1];

            pos.push(
              x + ox + a * U[0] + bb * V[0],
              y + oy + a * U[1] + bb * V[1],
              z + oz + a * U[2] + bb * V[2]
            );
            nor.push(nvx, nvy, nvz);

            const texU = f.a === 0 ? bb : a;
            const texV = f.a === 0 ? a : bb;
            uvs.push(tu.x0 + texU * tu.w, tu.yTop - (1 - texV) * tu.h);

            const du = a * 2 - 1, dv = bb * 2 - 1;
            const s1 = isSolid(x + nvx + du * U[0], y + nvy + du * U[1], z + nvz + du * U[2]) ? 1 : 0;
            const s2 = isSolid(x + nvx + dv * V[0], y + nvy + dv * V[1], z + nvz + dv * V[2]) ? 1 : 0;
            const sc = isSolid(
              x + nvx + du * U[0] + dv * V[0],
              y + nvy + du * U[1] + dv * V[1],
              z + nvz + du * U[2] + dv * V[2]
            ) ? 1 : 0;
            const ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + sc);
            const sh = AO_SHADE[ao];
            col.push(sh, sh, sh);
          }
        }
      }
    }
  }

  const key = chunkIndex(cx, cy, cz);
  const old = chunkMeshes[key];
  if (old) {
    scene.remove(old);
    old.geometry.dispose();
    chunkMeshes[key] = null;
  }
  if (!pos.length) return;

  const geo = new THREE.BufferGeometry();
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, terrainMat);
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  chunkMeshes[key] = mesh;
}

function buildAllChunks() {
  for (let cy = 0; cy < CY; cy++)
    for (let cz = 0; cz < CZ; cz++)
      for (let cx = 0; cx < CX; cx++)
        buildChunk(cx, cy, cz);
}

/* ---------------- 脏区块管理 ---------------- */
const dirty = new Set();

function markDirty(x, y, z) {
  const cx = x >> 4, cy = y >> 4, cz = z >> 4;
  if (cx >= 0 && cx < CX && cy >= 0 && cy < CY && cz >= 0 && cz < CZ) dirty.add(chunkIndex(cx, cy, cz));
  if ((x & 15) === 0 && cx > 0) dirty.add(chunkIndex(cx - 1, cy, cz));
  if ((x & 15) === 15 && cx < CX - 1) dirty.add(chunkIndex(cx + 1, cy, cz));
  if ((y & 15) === 0 && cy > 0) dirty.add(chunkIndex(cx, cy - 1, cz));
  if ((y & 15) === 15 && cy < CY - 1) dirty.add(chunkIndex(cx, cy + 1, cz));
  if ((z & 15) === 0 && cz > 0) dirty.add(chunkIndex(cx, cy, cz - 1));
  if ((z & 15) === 15 && cz < CZ - 1) dirty.add(chunkIndex(cx, cy, cz + 1));
}

function flushDirty(budget = Infinity) {
  if (!dirty.size) return;
  let n = 0;
  for (const k of dirty) {
    if (n >= budget) break;
    const cx = k % CX;
    const rest = (k - cx) / CX;
    const cz = rest % CZ;
    const cy = (rest - cz) / CZ;
    buildChunk(cx, cy, cz);
    dirty.delete(k);
    n++;
  }
}

/* ---------------- 碎块系统 ---------------- */
const dummy = new THREE.Object3D();
const debrisMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const debrisMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), debrisMat, MAX_DEBRIS);
debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
debrisMesh.frustumCulled = false;
debrisMesh.count = 0;
scene.add(debrisMesh);
for (let i = 0; i < MAX_DEBRIS; i++) debrisMesh.setColorAt(i, new THREE.Color(1, 1, 1));

const parts = [];
const tmpColor = new THREE.Color();

function spawnDebris(x, y, z, colorHex, power = 1) {
  const b = getB(Math.floor(x), Math.floor(y), Math.floor(z));
  const hex = colorHex !== undefined ? colorHex : (BLOCK_COLOR[b] || 0x999999);
  const n = 1;
  for (let i = 0; i < n; i++) {
    if (parts.length >= MAX_DEBRIS) parts.shift();
    tmpColor.setHex(hex);
    tmpColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.22);
    parts.push({
      x: x + (Math.random() - 0.5) * 0.6,
      y: y + (Math.random() - 0.5) * 0.6,
      z: z + (Math.random() - 0.5) * 0.6,
      vx: (Math.random() - 0.5) * 5 * power,
      vy: (Math.random() * 5 + 1.5) * power,
      vz: (Math.random() - 0.5) * 5 * power,
      rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: Math.random() * 6.28,
      sx: (Math.random() - 0.5) * 9, sy: (Math.random() - 0.5) * 9, sz: (Math.random() - 0.5) * 9,
      size: 0.14 + Math.random() * 0.26,
      life: 1.1 + Math.random() * 1.1,
      maxLife: 2.2,
      color: tmpColor.clone(),
    });
  }
}

function burstDebris(x, y, z, hex, count, power) {
  for (let i = 0; i < count; i++) {
    if (parts.length >= MAX_DEBRIS) parts.shift();
    tmpColor.setHex(hex);
    tmpColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.3);
    const ang = Math.random() * Math.PI * 2, up = Math.random();
    const spd = (2 + Math.random() * 9) * power;
    parts.push({
      x: x + (Math.random() - 0.5) * 1.6,
      y: y + (Math.random() - 0.5) * 1.6,
      z: z + (Math.random() - 0.5) * 1.6,
      vx: Math.cos(ang) * spd,
      vy: up * spd * 1.1 + 1,
      vz: Math.sin(ang) * spd,
      rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: Math.random() * 6.28,
      sx: (Math.random() - 0.5) * 12, sy: (Math.random() - 0.5) * 12, sz: (Math.random() - 0.5) * 12,
      size: 0.18 + Math.random() * 0.4,
      life: 1.4 + Math.random() * 1.6,
      maxLife: 3.0,
      color: tmpColor.clone(),
    });
  }
}

function updateDebris(dt) {
  let n = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy -= 30 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.rx += p.sx * dt; p.ry += p.sy * dt; p.rz += p.sz * dt;
    const spd = Math.hypot(p.vx, p.vy, p.vz);
    if (isSolid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) {
      // 高速飞行的碎块砸到东西上会砸出小坑
      if (!p.landed) {
        p.landed = true;
        if (spd > 13 && p.size > 0.2 && debrisHitBudget > 0) {
          debrisHitBudget--;
          damageSphere(p.x, p.y - 0.25, p.z, 0.85, { ragged: true, debris: 0, power: 0.7 });
        }
        spawnFx(p.x, p.y, p.z, 2, { color: 0xdccfb8, speed: 2.6, life: 0.45, size: 0.24, gravity: 10, spread: 0.4, up: 1.2 });
      }
      p.y = Math.floor(p.y) + 1.02;
      p.vy = Math.abs(p.vy) * 0.22;
      p.vx *= 0.55; p.vz *= 0.55;
      p.sx *= 0.5; p.sy *= 0.5; p.sz *= 0.5;
    }
    if (p.y < -4) { parts.splice(i, 1); }
  }
  for (let i = 0; i < parts.length && n < MAX_DEBRIS; i++) {
    const p = parts[i];
    const s = p.size * Math.min(1, p.life / 0.6);
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(p.rx, p.ry, p.rz);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    debrisMesh.setMatrixAt(n, dummy.matrix);
    debrisMesh.setColorAt(n, p.color);
    n++;
  }
  debrisMesh.count = n;
  debrisMesh.instanceMatrix.needsUpdate = true;
  if (debrisMesh.instanceColor) debrisMesh.instanceColor.needsUpdate = true;
}

/* ---------------- 建筑垮塌（失去支撑） ---------------- */
const FALL_MAX = 1400;
const fallMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0xffffff }),
  FALL_MAX
);
fallMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
fallMesh.frustumCulled = false;
fallMesh.count = 0;
scene.add(fallMesh);
for (let i = 0; i < FALL_MAX; i++) fallMesh.setColorAt(i, new THREE.Color(1, 1, 1));

const falling = [];
let collapsePending = null;
let collapseCooldown = 0;

function scheduleCollapse(x, y, z, removed) {
  if (removed < 20) return;
  if (collapseCooldown > 0 || collapsePending) return;
  collapsePending = { x, y, z };
}

function addFallingBlock(x, y, z, block, blast) {
  if (falling.length >= FALL_MAX) return;
  const dx = x + 0.5 - blast.x;
  const dz = z + 0.5 - blast.z;
  const len = Math.hypot(dx, dz) || 1;
  const push = 1.0 + Math.random() * 2.6;
  tmpColor.setHex(BLOCK_COLOR[block] || 0x999999);
  falling.push({
    x: x + 0.5, y: y + 0.5, z: z + 0.5,
    vx: (dx / len) * push, vy: -1.5 - Math.random() * 2.5, vz: (dz / len) * push,
    rx: 0, ry: Math.random() * 3, rz: 0,
    sx: (Math.random() - 0.5) * 3.5, sz: (Math.random() - 0.5) * 3.5,
    life: 7,
    block,
    color: tmpColor.clone(),
  });
}

function runCollapse() {
  if (!collapsePending) return;
  if (collapseCooldown > 0) return;
  const c = collapsePending;
  collapsePending = null;
  collapseCooldown = 1.4;

  const x0 = Math.max(1, Math.floor(c.x) - 20), x1 = Math.min(SX - 2, Math.floor(c.x) + 20);
  const z0 = Math.max(1, Math.floor(c.z) - 20), z1 = Math.min(SZ - 2, Math.floor(c.z) + 20);
  const y0 = GROUND + 1, y1 = SY - 2;

  const seen = new Set();
  const queue = [];
  const key = (x, y, z) => (y * SZ + z) * SX + x;

  // 以"地面层 / 区域边界"为锚点做连通性搜索
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (!world[at(x, y, z)]) continue;
        if (y === y0 || y === y1 || x === x0 || x === x1 || z === z0 || z === z1) {
          seen.add(key(x, y, z));
          queue.push(x, y, z);
        }
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++], y = queue[head++], z = queue[head++];
    const nb = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (let i = 0; i < 6; i++) {
      const nx = x + nb[i][0], ny = y + nb[i][1], nz = z + nb[i][2];
      if (nx < x0 || nx > x1 || ny < y0 || ny > y1 || nz < z0 || nz > z1) continue;
      if (!world[at(nx, ny, nz)]) continue;
      const k = key(nx, ny, nz);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push(nx, ny, nz);
    }
  }

  // 未连通 = 悬空，直接垮掉
  const detached = [];
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (world[at(x, y, z)] && !seen.has(key(x, y, z))) detached.push([x, y, z]);
      }
    }
  }
  if (!detached.length) return;

  const batch = detached.slice(0, 900);
  for (const [x, y, z] of batch) {
    const b = getB(x, y, z);
    setB(x, y, z, AIR);
    markDirty(x, y, z);
    addFallingBlock(x, y, z, b, c);
  }
  flushDirty(8);
  Sfx.crumble();
  if (batch.length > 60) toast('结构失去支撑 · 建筑正在垮塌');
  if (detached.length > batch.length) collapsePending = c;   // 下一帧继续
}

function updateFalling(dt) {
  let n = 0;
  for (let i = falling.length - 1; i >= 0; i--) {
    const b = falling[i];
    b.vy -= 26 * dt;

    const nx = b.x + b.vx * dt;
    if (!isSolid(Math.floor(nx), Math.floor(b.y), Math.floor(b.z))) b.x = nx;
    else b.vx *= -0.15;

    const ny = b.y + b.vy * dt;
    const groundY = Math.floor(ny - 0.55);
    let landed = false;
    if (isSolid(Math.floor(b.x), groundY, Math.floor(b.z))) {
      b.y = groundY + 1.5;
      landed = true;
    } else {
      b.y = ny;
    }

    const nz = b.z + b.vz * dt;
    if (!isSolid(Math.floor(b.x), Math.floor(b.y), Math.floor(nz))) b.z = nz;
    else b.vz *= -0.15;

    b.rx += b.sx * dt;
    b.rz += b.sz * dt;
    b.life -= dt;

    if (landed || b.life <= 0 || b.y < -2) {
      if (landed) {
        // 落地堆成瓦砾
        const bx = Math.floor(b.x), bz = Math.floor(b.z);
        if (Math.random() < 0.6) {
          let top = GROUND + 1;
          for (let yy = SY - 2; yy > GROUND; yy--) {
            if (isSolid(bx, yy, bz)) { top = yy + 1; break; }
          }
          if (top < SY - 1 && !isSolid(bx, top, bz)) {
            setB(bx, top, bz, b.block === 7 || b.block === 15 ? 6 : b.block);
            markDirty(bx, top, bz);
          }
        }
        spawnFx(b.x, b.y - 0.4, b.z, 3, { color: 0xd6c9b2, speed: 3.2, life: 0.55, size: 0.3, gravity: 9, spread: 0.5, up: 1.2 });
      }
      falling.splice(i, 1);
    }
  }

  for (let i = 0; i < falling.length && n < FALL_MAX; i++) {
    const b = falling[i];
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(b.rx, b.ry, b.rz);
    dummy.scale.setScalar(0.94);
    dummy.updateMatrix();
    fallMesh.setMatrixAt(n, dummy.matrix);
    fallMesh.setColorAt(n, b.color);
    n++;
  }
  fallMesh.count = n;
  fallMesh.instanceMatrix.needsUpdate = true;
  if (fallMesh.instanceColor) fallMesh.instanceColor.needsUpdate = true;
}

/* ---------------- 统计与破坏 ---------------- */
let destroyedCount = 0;
let cityCleared = false;
let debrisHitBudget = 3;
const stats = { totalDestroyed: 0 };

function damageSphere(cx, cy, cz, radius, opts = {}) {
  const r2 = radius * radius;
  const yMin = Math.max(2, opts.minY === undefined ? 2 : opts.minY);
  const x0 = Math.max(1, Math.floor(cx - radius)), x1 = Math.min(SX - 2, Math.ceil(cx + radius));
  const y0 = Math.max(yMin, Math.floor(cy - radius)), y1 = Math.min(SY - 2, Math.ceil(cy + radius));
  const z0 = Math.max(1, Math.floor(cz - radius)), z1 = Math.min(SZ - 2, Math.ceil(cz + radius));
  const ragged = !!opts.ragged;
  const debrisChance = opts.debris === undefined ? 0.05 : opts.debris;
  let removed = 0;

  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const b = getB(x, y, z);
        if (!b) continue;
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dz = z + 0.5 - cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > r2) continue;
        if (ragged && d2 > r2 * 0.5 && Math.random() < 0.35) continue;
        setB(x, y, z, AIR);
        markDirty(x, y, z);
        removed++;
        stats.totalDestroyed++;
        if (y > GROUND) destroyedCount++;
        game.money += y > GROUND ? BLOCK_REWARD : Math.round(BLOCK_REWARD * 0.3);
        pendingMoney += y > GROUND ? BLOCK_REWARD : Math.round(BLOCK_REWARD * 0.3);
        if (Math.random() < debrisChance) spawnDebris(x + 0.5, y + 0.5, z + 0.5, BLOCK_COLOR[b], opts.power || 1);
      }
    }
  }
  if (removed) {
    mapDirty = true;
    updateStats();
  }
  return removed;
}

/* ---------------- 射线检测（DDA） ---------------- */
function raycastVoxel(ox, oy, oz, dx, dy, dz, maxDist) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tmx = dx !== 0 ? ((dx > 0 ? x + 1 - ox : ox - x) / Math.abs(dx)) : Infinity;
  let tmy = dy !== 0 ? ((dy > 0 ? y + 1 - oy : oy - y) / Math.abs(dy)) : Infinity;
  let tmz = dz !== 0 ? ((dz > 0 ? z + 1 - oz : oz - z) / Math.abs(dz)) : Infinity;
  let nx = 0, ny = 0, nz = 0;

  if (getB(x, y, z)) return { x, y, z, nx: 0, ny: 1, nz: 0, dist: 0 };

  for (let i = 0; i < 512; i++) {
    if (tmx < tmy && tmx < tmz) {
      if (tmx > maxDist) return null;
      x += stepX; nx = -stepX; ny = 0; nz = 0;
      if (getB(x, y, z)) return { x, y, z, nx, ny, nz, dist: tmx };
      tmx += tdx;
    } else if (tmy < tmz) {
      if (tmy > maxDist) return null;
      y += stepY; nx = 0; ny = -stepY; nz = 0;
      if (y < 0 || y >= SY) return null;
      if (getB(x, y, z)) return { x, y, z, nx, ny, nz, dist: tmy };
      tmy += tdy;
    } else {
      if (tmz > maxDist) return null;
      z += stepZ; nx = 0; ny = 0; nz = -stepZ;
      if (getB(x, y, z)) return { x, y, z, nx, ny, nz, dist: tmz };
      tmz += tdz;
    }
    if (x < 0 || x >= SX || z < 0 || z >= SZ) return null;
  }
  return null;
}

/* ---------------- 粒光 / 冲击波特效 ---------------- */
const effects = [];

function addFlash(pos, intensity = 260) {
  const light = new THREE.PointLight(0xffb066, intensity, 60, 2);
  light.position.copy(pos);
  scene.add(light);
  effects.push({ type: 'light', obj: light, life: 0.24, maxLife: 0.24, peak: intensity });
}

function addShock(pos, radius, opacity = 0.85) {
  const geo = new THREE.SphereGeometry(1, 20, 12);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd9a0, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(pos);
  m.scale.setScalar(0.5);
  scene.add(m);
  effects.push({ type: 'shock', obj: m, life: 0.45, maxLife: 0.45, radius, opacity });
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    const k = Math.max(0, e.life / e.maxLife);
    if (e.type === 'light') {
      e.obj.intensity = e.peak * k * k;
    } else if (e.type === 'beam') {
      e.obj.material.opacity = 0.85 * k;
      e.obj.scale.x = 0.65 + (1 - k) * 0.75;
      e.obj.scale.z = 0.65 + (1 - k) * 0.75;
    } else {
      e.obj.scale.setScalar(0.5 + (1 - k) * e.radius);
      e.obj.material.opacity = (e.opacity === undefined ? 0.85 : e.opacity) * k;
    }
    if (e.life <= 0) {
      scene.remove(e.obj);
      if (e.obj.geometry) e.obj.geometry.dispose();
      if (e.obj.material) e.obj.material.dispose();
      effects.splice(i, 1);
    }
  }
}

/* ---------------- 音效（WebAudio 合成） ---------------- */
const Sfx = (() => {
  let ctx = null, noiseBuf = null;
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function noise(dur, gain, freq, type, sweep) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + dur);
  }
  function tone(freq, dur, gain, type, to) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur);
  }
  return {
    init,
    shoot() { noise(0.08, 0.16, 2400, 'bandpass', -1800); tone(140, 0.08, 0.10, 'square', 60); },
    boom() { noise(0.75, 0.35, 900, 'lowpass', -760); tone(78, 0.65, 0.22, 'sine', 28); },
    hit() { tone(1100, 0.05, 0.035, 'triangle', 1600); },
    dry() { tone(220, 0.05, 0.05, 'square', 140); },
    launch() { noise(0.2, 0.14, 1400, 'highpass', 400); tone(300, 0.18, 0.08, 'sawtooth', 90); },
    reset() { tone(520, 0.12, 0.06, 'sine', 880); },
    drill() { noise(0.06, 0.1, 1500, 'bandpass', -700); tone(95, 0.06, 0.045, 'square', 58); },
    hammer() { noise(0.2, 0.26, 420, 'lowpass', -320); tone(72, 0.18, 0.16, 'sine', 38); },
    hammerWhoosh() { noise(0.3, 0.09, 480, 'bandpass', 1500); },
    hammerSlam() {
      noise(0.5, 0.42, 240, 'lowpass', -170);
      noise(0.09, 0.22, 3200, 'highpass', -1200);
      tone(46, 0.5, 0.3, 'sine', 22);
    },
    crumble() { noise(1.2, 0.24, 520, 'lowpass', -400); tone(50, 1.1, 0.18, 'sine', 24); },
    achieve() { tone(880, 0.12, 0.05, 'triangle', 1180); tone(1320, 0.22, 0.04, 'triangle', 1560); },
    throw() { noise(0.14, 0.1, 1800, 'highpass', 700); },
    pick() { tone(680, 0.06, 0.04, 'triangle', 940); },
    purchase() { tone(660, 0.1, 0.055, 'triangle', 990); tone(990, 0.14, 0.045, 'triangle', 1320); },
    ping() { tone(1180, 0.2, 0.055, 'sine', 1760); },
    beep() { tone(1450, 0.06, 0.045, 'square', 1500); },
    beam() { noise(0.65, 0.26, 2600, 'bandpass', -2200); tone(1400, 0.5, 0.1, 'sawtooth', 180); },
    siren() { tone(480, 0.85, 0.09, 'sawtooth', 980); tone(980, 0.85, 0.07, 'sawtooth', 420); },
    nuke() { noise(2.6, 0.42, 620, 'lowpass', -540); tone(58, 2.2, 0.28, 'sine', 18); },
  };
})();

/* ---------------- 玩家 ---------------- */
const PR = 0.32, PH = 1.75, EYE = 1.62;
const player = {
  pos: new THREE.Vector3(4.5, GROUND + 1, 4.5),
  vel: new THREE.Vector3(),
  yaw: -2.36,
  pitch: -0.05,
  onGround: false,
  bob: 0,
};
let shake = 0, recoil = 0, bobT = 0;

const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };

function blockedAt(x, y, z) {
  const x0 = Math.floor(x - PR), x1 = Math.floor(x + PR);
  const y0 = Math.floor(y + 0.02), y1 = Math.floor(y + PH);
  const z0 = Math.floor(z - PR), z1 = Math.floor(z + PR);
  for (let bx = x0; bx <= x1; bx++)
    for (let by = y0; by <= y1; by++)
      for (let bz = z0; bz <= z1; bz++)
        if (getB(bx, by, bz)) return true;
  return false;
}

function updatePlayer(dt) {
  const sprint = keys.shift;
  const speed = sprint ? 10.5 : 5.8;
  let fx = 0, fz = 0;
  if (keys.w) fz -= 1;
  if (keys.s) fz += 1;
  if (keys.a) fx -= 1;
  if (keys.d) fx += 1;
  const len = Math.hypot(fx, fz);
  if (len > 0) { fx /= len; fz /= len; }

  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  const wx = cos * fx + sin * fz;
  const wz = -sin * fx + cos * fz;

  const accel = player.onGround ? 16 : 5;
  const k = Math.min(1, accel * dt);
  player.vel.x += (wx * speed - player.vel.x) * k;
  player.vel.z += (wz * speed - player.vel.z) * k;

  player.vel.y -= 27 * dt;
  if (keys.space && player.onGround) {
    player.vel.y = 10.4;
    player.onGround = false;
  }

  const p = player.pos;
  const nx = p.x + player.vel.x * dt;
  if (!blockedAt(nx, p.y, p.z)) p.x = nx; else player.vel.x = 0;
  const nz = p.z + player.vel.z * dt;
  if (!blockedAt(p.x, p.y, nz)) p.z = nz; else player.vel.z = 0;
  const ny = p.y + player.vel.y * dt;
  if (blockedAt(p.x, ny, p.z)) {
    if (player.vel.y < 0) {
      p.y = Math.ceil(ny - 0.001);
      player.onGround = true;
    }
    player.vel.y = 0;
  } else {
    p.y = ny;
    player.onGround = false;
  }

  p.x = Math.max(1.4, Math.min(SX - 1.4, p.x));
  p.z = Math.max(1.4, Math.min(SZ - 1.4, p.z));
  if (p.y < -6) respawn();

  // 走路摇晃
  const hspeed = Math.hypot(player.vel.x, player.vel.z);
  bobT += dt * hspeed * (sprint ? 1.35 : 1.1);
  player.bob = player.onGround ? Math.sin(bobT * 2.1) * Math.min(hspeed / 9, 1) * 0.03 : 0;
}

function applyCamera(dt) {
  const p = player.pos;  camera.position.set(p.x, p.y + EYE + player.bob, p.z);
  camera.rotation.set(player.pitch + recoil * 0.03, player.yaw, 0);

  if (shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.13;
    camera.position.y += (Math.random() - 0.5) * shake * 0.13;
    camera.rotation.z += (Math.random() - 0.5) * shake * 0.016;
    shake -= dt * 4.5;
    if (shake < 0.04) shake = 0;   // 收干净，避免残留抖动
  }

  // 重击时的镜头冲击（FOV 一顿）
  fovKick = Math.max(0, fovKick - dt * 6.5);
  const targetFov = 75 + fovKick * 3.6;
  if (Math.abs(camera.fov - targetFov) > 0.02) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }

  recoil *= Math.pow(0.0007, dt);
}

function respawn() {
  player.pos.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
  player.vel.set(0, 0, 0);
  player.yaw = spawnPoint.yaw;
  player.pitch = -0.05;
  toast('已返回出生点');
}

/* ---------------- 粒子系统（火花 / 火焰 / 烟尘） ---------------- */
const FXCAP = 2600;
const fxPos = new Float32Array(FXCAP * 3);
const fxCol = new Float32Array(FXCAP * 3);
const fxSize = new Float32Array(FXCAP);
const fxGeo = new THREE.BufferGeometry();
fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3).setUsage(THREE.DynamicDrawUsage));
fxGeo.setAttribute('pcolor', new THREE.BufferAttribute(fxCol, 3).setUsage(THREE.DynamicDrawUsage));
fxGeo.setAttribute('size', new THREE.BufferAttribute(fxSize, 1).setUsage(THREE.DynamicDrawUsage));
fxGeo.setDrawRange(0, 0);

const fxMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { uScale: { value: window.innerHeight * 0.5 } },
  vertexShader: `
    attribute float size;
    attribute vec3 pcolor;
    uniform float uScale;
    varying vec3 vColor;
    void main(){
      vColor = pcolor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(size * uScale / max(-mv.z, 0.15), 1.0, 260.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vColor;
    void main(){
      vec2 d = gl_PointCoord - vec2(0.5);
      float r2 = dot(d, d);
      if (r2 > 0.25) discard;
      float a = 1.0 - r2 * 4.0;
      a *= a;
      gl_FragColor = vec4(vColor * a, a);
    }`,
});
const fxPoints = new THREE.Points(fxGeo, fxMat);
fxPoints.frustumCulled = false;
fxPoints.renderOrder = 4;
scene.add(fxPoints);

const fxList = [];

function updateFxScale() {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  fxMat.uniforms.uScale.value = size.y * 0.5;
}

function spawnFx(x, y, z, count, o = {}) {
  const col = o.color === undefined ? 0xffb066 : o.color;
  for (let i = 0; i < count; i++) {
    if (fxList.length >= FXCAP) fxList.shift();
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(Math.random() * 2 - 1);
    const sp = (o.speed === undefined ? 3 : o.speed) * (0.35 + Math.random() * 0.95);
    const spread = o.spread === undefined ? 0.4 : o.spread;
    fxList.push({
      x: x + (Math.random() - 0.5) * spread,
      y: y + (Math.random() - 0.5) * spread,
      z: z + (Math.random() - 0.5) * spread,
      vx: Math.sin(b) * Math.cos(a) * sp,
      vy: (o.up === undefined ? 0.8 : o.up) + Math.cos(b) * sp * 0.7,
      vz: Math.sin(b) * Math.sin(a) * sp,
      g: o.gravity === undefined ? 14 : o.gravity,
      drag: o.drag === undefined ? 1.4 : o.drag,
      life: (o.life === undefined ? 0.7 : o.life) * (0.65 + Math.random() * 0.7),
      maxLife: o.life === undefined ? 0.7 : o.life,
      size: (o.size === undefined ? 0.3 : o.size) * (0.6 + Math.random() * 0.8),
      c: new THREE.Color(col),
    });
  }
}

function updateFx(dt) {
  for (let i = fxList.length - 1; i >= 0; i--) {
    const p = fxList[i];
    p.life -= dt;
    if (p.life <= 0) { fxList.splice(i, 1); continue; }
    p.vy -= p.g * dt;
    const damp = Math.max(0, 1 - p.drag * dt);
    p.vx *= damp; p.vy *= damp; p.vz *= damp;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  }
  let n = 0;
  for (let i = 0; i < fxList.length && n < FXCAP; i++) {
    const p = fxList[i];
    const k = Math.max(0, p.life / p.maxLife);
    const fade = k * k;
    fxPos[n * 3] = p.x;
    fxPos[n * 3 + 1] = p.y;
    fxPos[n * 3 + 2] = p.z;
    fxCol[n * 3] = p.c.r * fade;
    fxCol[n * 3 + 1] = p.c.g * fade;
    fxCol[n * 3 + 2] = p.c.b * fade;
    fxSize[n] = p.size * (0.4 + 0.9 * k);
    n++;
  }
  fxGeo.setDrawRange(0, n);
  fxGeo.attributes.position.needsUpdate = true;
  fxGeo.attributes.pcolor.needsUpdate = true;
  fxGeo.attributes.size.needsUpdate = true;
}

/* ---------------- 经济与武器 ---------------- */
const BLOCK_REWARD = 120000;
const game = {
  money: 1000000,
  weapon: 'drill',
  owned: { rocket: false, grenade: false, c4: false, orbital: false, nuke: false },
  ammo: { rocket: 0, grenade: 0, c4: 0, orbital: 0, nuke: 0 },
};
let pendingMoney = 0;

const SHOP_IDS = ['rocket', 'grenade', 'c4', 'orbital', 'nuke'];
const SHOP = {
  rocket: { name: '火箭筒', desc: 'RPG · 一发就能在楼里掏出大洞', price: 6000000, refill: 4000000, pack: 10, max: 30, color: '#ff8a3d' },
  grenade: { name: '手雷', desc: '抛物线投掷 · 落地反弹 · 2.4 秒引爆', price: 2400000, refill: 1600000, pack: 8, max: 24, color: '#7dffa0' },
  c4: { name: '定时炸药', desc: '贴墙安装 · 3 秒后起爆 · 右键一键齐爆', price: 9000000, refill: 6000000, pack: 6, max: 18, color: '#ff5c7a' },
  orbital: { name: '轨道打击', desc: '天基激光 · 从云层直接砸下来', price: 45000000, refill: 45000000, pack: 1, max: 5, color: '#66e0ff' },
  nuke: { name: '核弹', desc: '一发抹平半座城市', price: 200000000, refill: 200000000, pack: 1, max: 3, color: '#ffe066' },
};

const WEAPONS = [
  { id: 'drill', slot: 1, name: '电钻', meta: '左键钻墙 · 无限使用', free: true },
  { id: 'hammer', slot: 2, name: '大锤', meta: '左键抡锤 · 一片墙一口吃掉', free: true },
  { id: 'rocket', slot: 3, name: '火箭筒', meta: '左键发射', free: false },
  { id: 'grenade', slot: 4, name: '手雷', meta: '左键投掷', free: false },
  { id: 'c4', slot: 5, name: '定时炸药', meta: '左键安装 · 右键齐爆', free: false },
  { id: 'orbital', slot: 6, name: '轨道打击', meta: '左键标记 · 1.2 秒后命中', free: false },
  { id: 'nuke', slot: 7, name: '核弹', meta: '左键投放 · 跑', free: false },
];

/* ---------------- 手持武器模型 ---------------- */
const V_MAT = {
  dark: new THREE.MeshLambertMaterial({ color: 0x4b5768, emissive: 0x141b26 }),
  body: new THREE.MeshLambertMaterial({ color: 0x6d7c90, emissive: 0x1a2430 }),
  steel: new THREE.MeshLambertMaterial({ color: 0xa9b6c7, emissive: 0x1d242f }),
  amber: new THREE.MeshLambertMaterial({ color: 0xd9a441, emissive: 0x2a1a05 }),
  green: new THREE.MeshLambertMaterial({ color: 0x516b3f, emissive: 0x121a10 }),
  skin: new THREE.MeshLambertMaterial({ color: 0xd8a179, emissive: 0x33201a }),
  glove: new THREE.MeshLambertMaterial({ color: 0x2f3a48, emissive: 0x0d1218 }),
  sleeve: new THREE.MeshLambertMaterial({ color: 0x41506a, emissive: 0x131a24 }),
  neon: new THREE.MeshBasicMaterial({ color: 0x62ecff }),
  red: new THREE.MeshBasicMaterial({ color: 0xff4d5e }),
};

const vBox = (w, h, d, mat, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
};
const vCyl = (rt, rb, h, mat, x, y, z, rx = Math.PI / 2) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  return m;
};

const viewRoot = new THREE.Group();
viewRoot.position.set(0.27, -0.23, -0.46);
viewRoot.scale.setScalar(0.82);
camera.add(viewRoot);

const models = {};

// 电钻
{
  const g = new THREE.Group();
  g.add(vBox(0.14, 0.15, 0.34, V_MAT.body, 0, 0, -0.02));
  g.add(vBox(0.10, 0.21, 0.12, V_MAT.dark, 0, -0.16, 0.08));
  g.add(vBox(0.12, 0.12, 0.12, V_MAT.amber, 0, 0.0, 0.18));
  g.add(vBox(0.03, 0.03, 0.20, V_MAT.neon, 0.075, 0.07, 0.0));

  // 钻头：绕自身轴（Z）旋转的螺旋钻
  const spin = new THREE.Group();
  spin.position.set(0, 0, -0.20);
  const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.09, 12), V_MAT.steel);
  chuck.rotation.x = Math.PI / 2;
  spin.add(chuck);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.006, 0.38, 10), V_MAT.steel);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.20;
  spin.add(shaft);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const flute = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.30), V_MAT.dark);
    flute.position.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, -0.20);
    flute.rotation.z = 0.55;
    spin.add(flute);
  }
  g.add(spin);
  models.drill = g;
  models.drillBit = spin;
}
// 大锤
{
  const g = new THREE.Group();
  g.add(vBox(0.062, 0.062, 0.62, V_MAT.amber, 0, -0.02, 0.04));
  g.add(vBox(0.078, 0.078, 0.17, V_MAT.dark, 0, -0.02, 0.24));
  g.add(vBox(0.20, 0.22, 0.22, V_MAT.steel, 0, 0.0, -0.30));
  g.add(vBox(0.215, 0.065, 0.235, V_MAT.dark, 0, 0.0, -0.30));
  g.add(vBox(0.05, 0.05, 0.10, V_MAT.neon, 0, -0.02, 0.17));
  models.hammer = g;
}
// 火箭筒
{
  const g = new THREE.Group();
  g.add(vCyl(0.078, 0.078, 0.66, V_MAT.dark, 0, 0.02, -0.18));
  g.add(vCyl(0.098, 0.078, 0.16, V_MAT.body, 0, 0.02, -0.57));
  g.add(vBox(0.06, 0.17, 0.10, V_MAT.dark, 0, -0.13, 0.02));
  g.add(vBox(0.03, 0.09, 0.05, V_MAT.dark, 0, 0.14, -0.14));
  g.add(vBox(0.02, 0.02, 0.22, V_MAT.neon, 0.078, 0.02, -0.2));
  g.add(vCyl(0.10, 0.10, 0.06, V_MAT.amber, 0, 0.02, 0.16));
  models.rocket = g;
}
// 手雷
{
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), V_MAT.green);
  s.position.set(0, -0.02, -0.26);
  g.add(s);
  g.add(vBox(0.05, 0.06, 0.05, V_MAT.steel, 0, 0.10, -0.26));
  g.add(vBox(0.02, 0.02, 0.10, V_MAT.neon, -0.09, 0.02, -0.26));
  models.grenade = g;
}
// 定时炸药
{
  const g = new THREE.Group();
  g.add(vBox(0.24, 0.11, 0.18, V_MAT.dark, 0, -0.04, -0.27));
  g.add(vBox(0.09, 0.035, 0.055, V_MAT.red, 0.06, 0.025, -0.27));
  g.add(vBox(0.03, 0.02, 0.14, V_MAT.neon, -0.07, 0.025, -0.27));
  models.c4 = g;
}
// 轨道打击指示器
{
  const g = new THREE.Group();
  g.add(vBox(0.16, 0.11, 0.30, V_MAT.body, 0, -0.03, -0.28));
  g.add(vBox(0.12, 0.06, 0.05, V_MAT.neon, 0, 0.02, -0.39));
  g.add(vCyl(0.008, 0.008, 0.34, V_MAT.steel, 0.05, 0.18, -0.22, 0));
  models.orbital = g;
  g.scale.setScalar(0.8);
}
// 核弹遥控器
{
  const g = new THREE.Group();
  g.add(vBox(0.28, 0.16, 0.22, V_MAT.amber, 0, -0.06, -0.28));
  g.add(vBox(0.10, 0.09, 0.05, V_MAT.red, 0, -0.05, -0.17));
  g.add(vBox(0.20, 0.03, 0.16, V_MAT.dark, 0, 0.03, -0.28));
  models.nuke = g;
  g.scale.setScalar(0.72);
}

for (const k in models) {
  if (k === 'drillBit') continue;
  models[k].visible = false;
  viewRoot.add(models[k]);
}
models.drill.visible = true;

/* ---------------- 双手模型 ---------------- */
function makeArm() {
  const g = new THREE.Group();
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.128, 0.28), V_MAT.sleeve);
  sleeve.position.set(0, -0.01, 0.26);
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.108, 0.055), V_MAT.glove);
  cuff.position.set(0, 0, 0.105);
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.092, 0.22), V_MAT.skin);
  forearm.position.set(0, 0, 0.0);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.104, 0.14), V_MAT.glove);
  hand.position.set(0, 0.004, -0.10);
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.036, 0.082), V_MAT.glove);
  thumb.position.set(0.047, 0.034, -0.075);
  thumb.rotation.z = 0.35;
  g.add(sleeve, cuff, forearm, hand, thumb);
  return g;
}

const hands = new THREE.Group();
const rightArm = makeArm();
const leftArm = makeArm();
rightArm.scale.setScalar(1.12);
leftArm.scale.setScalar(1.06);
hands.add(rightArm, leftArm);
viewRoot.add(hands);

const HAND_POSE = {
  drill: { r: [0.0, -0.150, 0.10, 0.34, 0.28, 0.06], l: [-0.10, -0.10, -0.10, 0.22, -0.5, -0.16] },
  hammer: { r: [0.0, -0.050, 0.06, 0.34, 0.3, 0.06], l: [-0.02, -0.052, 0.26, 0.3, -0.16, -0.05] },
  rocket: { r: [0.0, -0.130, 0.05, 0.32, 0.28, 0.05], l: [-0.11, -0.055, -0.18, 0.25, -0.55, -0.12] },
  grenade: { r: [0.02, -0.060, -0.14, 0.32, 0.3, 0.06], l: null },
  c4: { r: [0.02, -0.065, -0.15, 0.32, 0.28, 0.05], l: [-0.09, -0.05, -0.20, 0.24, -0.5, -0.1] },
  orbital: { r: [0.02, -0.065, -0.17, 0.32, 0.28, 0.05], l: null },
  nuke: { r: [0.02, -0.075, -0.17, 0.32, 0.28, 0.05], l: null },
};

function applyPose(arm, a) {
  arm.position.set(a[0], a[1], a[2]);
  arm.rotation.set(a[3], a[4], a[5]);
}

function setHandPose(id) {
  const p = HAND_POSE[id] || HAND_POSE.drill;
  applyPose(rightArm, p.r);
  leftArm.visible = !!p.l;
  if (p.l) applyPose(leftArm, p.l);
  hands.rotation.set(0, 0, 0);
}

setHandPose('drill');
models.hammer.position.set(0, 0, 0);

/* ---------------- 大锤：长前摇 · 重砸 ---------------- */
const HAMMER = { windup: 0.38, strike: 0.13, recover: 0.36 };
const HAMMER_TOTAL = HAMMER.windup + HAMMER.strike + HAMMER.recover;
const HAMMER_IMPACT_AT = HAMMER.windup + HAMMER.strike * 0.98;
let swingT = 0;
let swingHit = false;
let fovKick = 0;

// 锤子落点：够得到就砸目标，够不到就砸面前的地面
function hammerPoint() {
  const hit = aimHit(4.6);
  if (hit) {
    return {
      x: hit.x + 0.5 + hit.nx * 0.35,
      y: hit.y + 0.5 + hit.ny * 0.35,
      z: hit.z + 0.5 + hit.nz * 0.35,
    };
  }
  camera.getWorldDirection(camDir);
  const d = 2.4;
  const x = camera.position.x + camDir.x * d;
  const z = camera.position.z + camDir.z * d;
  let y = GROUND + 1;
  for (let yy = SY - 2; yy > GROUND; yy--) {
    if (isSolid(Math.floor(x), yy, Math.floor(z))) { y = yy + 1; break; }
  }
  return { x, y, z };
}

function hammerImpact() {
  const p = hammerPoint();
  const removed = damageSphere(p.x, p.y, p.z, 2.9, { ragged: true, debris: 0.16, power: 1.3, minY: GROUND });
  flushDirty();
  burstDebris(p.x, p.y, p.z, 0xb9a88f, 26, 1.4);

  // 地面尘土向四周炸开
  spawnFx(p.x, p.y + 0.2, p.z, 40, { color: 0xe6d6bb, speed: 11, life: 1.0, size: 0.36, gravity: 9, drag: 2.2, spread: 0.7, up: 1.2 });
  spawnFx(p.x, p.y + 0.15, p.z, 16, { color: 0xfff3dc, speed: 6, life: 0.5, size: 0.26, gravity: 14, spread: 0.5, up: 2.2 });

  Sfx.hammerSlam();
  shake = Math.min(0.34, shake + 0.2);
  recoil = Math.min(1.8, recoil + 1.0);
  fovKick = 1.3;
  scheduleCollapse(p.x, p.y, p.z, removed);
  checkAchievements();
  if (removed === 0) Sfx.dry();
}

function updateHammerSwing(dt) {
  if (swingT <= 0) {
    models.hammer.rotation.set(0, 0, 0);
    models.hammer.position.set(0, 0, 0);
    hands.rotation.x = 0;
    hands.position.set(0, 0, 0);
    return;
  }
  const elapsed = HAMMER_TOTAL - swingT;
  if (!swingHit && elapsed >= HAMMER_IMPACT_AT) {
    swingHit = true;
    hammerImpact();
  }

  let rotX = 0, posZ = 0, posY = 0;
  if (elapsed < HAMMER.windup) {
    // 前摇：双手把锤高高举过头顶，身体后仰
    const k = elapsed / HAMMER.windup;
    const e = 1 - Math.pow(1 - k, 2.2);
    rotX = 1.5 * e;
    posZ = 0.08 * e;
    posY = 0.1 * e;
  } else if (elapsed < HAMMER.windup + HAMMER.strike) {
    // 下砸：加速砸向地面
    const k = (elapsed - HAMMER.windup) / HAMMER.strike;
    const e = k * k * k;
    rotX = 1.5 - 2.8 * e;
    posZ = 0.08 - 0.26 * e;
    posY = 0.1 - 0.26 * e;
  } else {
    // 收招：沉重地把它拉回来
    const k = Math.min(1, (elapsed - HAMMER.windup - HAMMER.strike) / HAMMER.recover);
    const e = 1 - Math.pow(1 - k, 2);
    rotX = -1.3 * (1 - e);
    posZ = -0.18 * (1 - e);
    posY = -0.16 * (1 - e);
  }
  models.hammer.rotation.x = rotX;
  models.hammer.position.set(0, posY, posZ);
  // 手始终黏在锤柄上
  hands.rotation.x = rotX;
  hands.position.set(0, posY, posZ);
  swingT = Math.max(0, swingT - dt);
}

const camDir = new THREE.Vector3();
const tmpV3 = new THREE.Vector3();

/* ---------------- 开火 ---------------- */
let firing = false;
let cd = 0;
const CD = { drill: 0.085, hammer: 0.5, rocket: 0.6, grenade: 0.65, c4: 0.45, orbital: 1.4, nuke: 3.0 };

function aimHit(range) {
  camera.getWorldDirection(camDir);
  return raycastVoxel(camera.position.x, camera.position.y, camera.position.z, camDir.x, camDir.y, camDir.z, range);
}

function aimTarget(range) {
  const hit = aimHit(range);
  if (!hit) return null;
  return new THREE.Vector3(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
}

function dryFire(name) {
  Sfx.dry();
  toast(`${name}已用尽 · 按 B 到黑市补货`);
}

function useWeapon() {
  cd = 0.3; // 兜底冷却，避免空弹时每帧提示
  switch (game.weapon) {
    case 'drill': useDrill(); break;
    case 'hammer': useHammer(); break;
    case 'rocket': useRocket(); break;
    case 'grenade': useGrenade(); break;
    case 'c4': useC4(); break;
    case 'orbital': useOrbital(); break;
    case 'nuke': useNuke(); break;
  }
}

function strikePoint(range, depth) {
  const hit = aimHit(range);
  if (hit) {
    return {
      x: hit.x + 0.5 + hit.nx * 0.3,
      y: hit.y + 0.5 + hit.ny * 0.3,
      z: hit.z + 0.5 + hit.nz * 0.3,
    };
  }
  camera.getWorldDirection(camDir);
  return {
    x: camera.position.x + camDir.x * depth,
    y: camera.position.y + camDir.y * depth,
    z: camera.position.z + camDir.z * depth,
  };
}

function useDrill() {
  cd = CD.drill;
  Sfx.drill();
  shake = Math.min(0.10, shake + 0.004);
  recoil = Math.min(0.6, recoil + 0.05);
  const p = strikePoint(6.0, 1.5);
  spawnFx(p.x, p.y, p.z, 7, { color: 0xffd08a, speed: 5.5, life: 0.42, size: 0.11, gravity: 18, up: 1.2, spread: 0.22 });
  spawnFx(p.x, p.y, p.z, 3, { color: 0x9fe0ff, speed: 3.5, life: 0.3, size: 0.09, gravity: 12, spread: 0.18 });
  damageSphere(p.x, p.y, p.z, 1.5, { ragged: true, debris: 0.14, power: 0.7, minY: GROUND });
  flushDirty();
}

function useHammer() {
  if (swingT > 0) return;   // 挥动中，不能连点
  cd = 0.62;
  swingT = HAMMER_TOTAL;
  swingHit = false;
  Sfx.hammerWhoosh();
}

function useRocket() {
  if (game.ammo.rocket <= 0) { dryFire('火箭弹'); return; }
  game.ammo.rocket--;
  cd = CD.rocket;
  recoil = Math.min(2, recoil + 1.0);
  shake = Math.min(0.2, shake + 0.05);
  updateHotbar();
  updateWeaponUI();
  Sfx.launch();
  fireRocket();
}

function useGrenade() {
  if (game.ammo.grenade <= 0) { dryFire('手雷'); return; }
  game.ammo.grenade--;
  cd = CD.grenade;
  recoil = Math.min(1, recoil + 0.35);
  updateHotbar();
  updateWeaponUI();
  Sfx.throw();

  camera.getWorldDirection(camDir);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), V_MAT.green);
  const pos = camera.position.clone().addScaledVector(camDir, 0.55);
  mesh.position.copy(pos);
  scene.add(mesh);
  grenades.push({
    mesh,
    pos: pos.clone(),
    vel: camDir.clone().multiplyScalar(17).add(new THREE.Vector3(0, 5, 0)),
    fuse: 2.4,
  });
}

function useC4() {
  if (game.ammo.c4 <= 0) { dryFire('定时炸药'); return; }
  const hit = aimHit(8);
  if (!hit) { Sfx.dry(); toast('把炸药贴在方块上再按'); return; }
  game.ammo.c4--;
  cd = CD.c4;
  updateHotbar();
  updateWeaponUI();
  Sfx.beep();

  const g = new THREE.Group();
  g.add(vBox(0.26, 0.12, 0.2, V_MAT.dark, 0, 0, 0));
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.05), new THREE.MeshBasicMaterial({ color: 0xff4d5e }));
  led.position.set(0.06, 0.07, 0.06);
  g.add(led);
  const pos = new THREE.Vector3(
    hit.x + 0.5 + hit.nx * 0.52,
    hit.y + 0.5 + hit.ny * 0.52,
    hit.z + 0.5 + hit.nz * 0.52
  );
  g.position.copy(pos);
  if (hit.nx || hit.nz) g.rotation.y = Math.atan2(hit.nx, hit.nz);
  scene.add(g);
  charges.push({ mesh: g, led, pos: pos.clone(), fuse: 3.0 });
  toast('炸药已安装 · 3 秒后起爆');
}

function useOrbital() {
  if (game.ammo.orbital <= 0) { dryFire('轨道打击'); return; }
  game.ammo.orbital--;
  cd = CD.orbital;
  updateHotbar();
  updateWeaponUI();
  camera.getWorldDirection(camDir);
  const target = aimTarget(240) || camera.position.clone().addScaledVector(camDir, 65);
  strikes.push({ pos: target, t: 1.2, type: 'orbital' });
  toast('轨道打击已锁定 · 1.2 秒后命中');
  Sfx.ping();
}

function useNuke() {
  if (game.ammo.nuke <= 0) { dryFire('核弹'); return; }
  game.ammo.nuke--;
  cd = CD.nuke;
  updateHotbar();
  updateWeaponUI();
  camera.getWorldDirection(camDir);
  const target = aimTarget(240) || camera.position.clone().addScaledVector(camDir, 70);
  strikes.push({ pos: target, t: 2.2, type: 'nuke' });
  toast('核弹已投放 · 快跑！');
  Sfx.siren();
}

/* ---------------- 武器切换 ---------------- */
function selectWeapon(id) {
  const w = WEAPONS.find(x => x.id === id);
  if (!w) return;
  if (!w.free && !game.owned[id]) {
    Sfx.dry();
    toast(`${w.name}未解锁 · 按 B 到黑市购买`);
    return;
  }
  game.weapon = id;
  for (const k in models) {
    if (k === 'drillBit') continue;
    models[k].visible = (k === id);
  }
  setHandPose(id);
  if (id !== 'hammer') swingT = 0;
  firing = false;
  cd = Math.min(cd, 0.12);
  updateWeaponUI();
  updateHotbar();
  Sfx.pick();
}

function cycleWeapon(dir) {
  const idx = WEAPONS.findIndex(w => w.id === game.weapon);
  for (let i = 1; i <= WEAPONS.length; i++) {
    const w = WEAPONS[((idx + dir * i) % WEAPONS.length + WEAPONS.length) % WEAPONS.length];
    if (w.free || game.owned[w.id]) { selectWeapon(w.id); return; }
  }
}

/* ---------------- 爆炸 ---------------- */
function blast(pos, radius, opts = {}) {
  const power = opts.power === undefined ? 1.2 : opts.power;
  const sample = getB(Math.floor(pos.x), Math.floor(pos.y) - 1, Math.floor(pos.z))
    || getB(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)) || 6;
  burstDebris(pos.x, pos.y, pos.z, BLOCK_COLOR[sample] || 0xc9b18f,
    opts.debrisN === undefined ? Math.min(170, 22 + Math.round(radius * 7)) : opts.debrisN, power);

  const before = game.money;
  const removed = damageSphere(pos.x, pos.y, pos.z, radius, { ragged: radius < 10, debris: 0.012, power });
  flushDirty(radius > 12 ? 6 : 20);

  addFlash(pos, 170 + radius * 14);
  addShock(pos, radius * 1.02);
  addFireball(pos, radius);
  Sfx.boom();

  const d = camera.position.distanceTo(pos);
  shake = Math.min(0.5, shake + Math.max(0, (opts.shake === undefined ? 0.3 : opts.shake) * (1 - d / 70)));
  if (d < 30) {
    const away = camera.position.clone().sub(pos).normalize();
    player.vel.addScaledVector(away, (30 - d) * 0.22);
    player.vel.y = Math.max(player.vel.y, (30 - d) * 0.12);
  }
  const earned = game.money - before;
  if (removed > 60) toast(`爆破 ${removed} 块 · +₡ ${earned.toLocaleString('en-US')}`);
  scheduleCollapse(pos.x, pos.y, pos.z, removed);
  checkAchievements();
  return removed;
}

function addFireball(pos, radius) {
  const n = Math.min(190, 18 + Math.round(radius * 8));
  spawnFx(pos.x, pos.y, pos.z, n, { color: 0xff9a3d, speed: radius * 1.7, life: 0.55, size: 0.6, gravity: -2, drag: 2.2, spread: radius * 0.3, up: 2 });
  spawnFx(pos.x, pos.y, pos.z, Math.round(n * 0.45), { color: 0xffe9b0, speed: radius * 2.3, life: 0.34, size: 0.4, gravity: -1, drag: 3, spread: radius * 0.18 });
  spawnFx(pos.x, pos.y + radius * 0.25, pos.z, Math.round(n * 0.7), { color: 0x9c8b78, speed: radius * 1.0, life: 2.1, size: 1.3, gravity: -2.6, drag: 1.0, spread: radius * 0.55, up: radius * 0.5 });
}

function flashScreen(v) {
  el.flash.style.transition = 'none';
  el.flash.style.opacity = v;
  requestAnimationFrame(() => {
    el.flash.style.transition = 'opacity .75s ease-out';
    el.flash.style.opacity = 0;
  });
}

function performOrbital(pos) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 1.0, 170, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x9ff2ff, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  beam.position.set(pos.x, pos.y + 85, pos.z);
  beam.renderOrder = 3;
  scene.add(beam);
  effects.push({ type: 'beam', obj: beam, life: 0.55, maxLife: 0.55 });

  blast(pos, 10, { power: 1.8, shake: 0.32, debrisN: 90 });
  for (let k = 1; k <= 2; k++) {
    strikes.push({
      pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12)),
      t: 0.16 * k,
      type: 'orbital2',
    });
  }
  Sfx.beam();
}

function performNuke(pos) {
  flashScreen(0.95);
  blast(pos, 30, { power: 2.4, shake: 0.7, debrisN: 230 });
  spawnFx(pos.x, pos.y + 2, pos.z, 300, { color: 0xfff0c0, speed: 46, life: 0.95, size: 1.7, gravity: -4, drag: 1.4, spread: 4, up: 10 });
  spawnFx(pos.x, pos.y + 6, pos.z, 200, { color: 0xff8a3d, speed: 28, life: 1.8, size: 2.3, gravity: -6, drag: 1.0, spread: 6 });
  spawnFx(pos.x, pos.y + 14, pos.z, 150, { color: 0x9a8d80, speed: 12, life: 3.4, size: 3.6, gravity: -3.2, drag: 0.8, spread: 10, up: 7 });
  addShock(pos, 42);
  addFlash(pos, 900);
  shake = Math.min(0.85, shake + 0.4);
  Sfx.nuke();
  toast('核爆完成 · 城市已成废墟');
}

/* ---------------- 炸弹 / 火箭 / 打击队列 ---------------- */
const rockets = [];
const grenades = [];
const charges = [];
const strikes = [];

/* ---------------- 火箭弹 ---------------- */
const rocketGeo = new THREE.SphereGeometry(0.16, 8, 8);
const rocketMat = new THREE.MeshBasicMaterial({ color: 0xffb066 });
const rocketGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });

function fireRocket() {
  camera.getWorldDirection(camDir);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(rocketGeo, rocketMat));
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), rocketGlowMat);
  g.add(glow);
  g.position.copy(camera.position).addScaledVector(camDir, 0.7);
  scene.add(g);
  spawnFx(g.position.x, g.position.y, g.position.z, 6, { color: 0xffd9a0, speed: 5, life: 0.18, size: 0.22, gravity: 0, spread: 0.2 });
  rockets.push({ mesh: g, pos: g.position.clone(), vel: camDir.clone().multiplyScalar(62), life: 4 });
}

function updateRockets(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    const speed = r.vel.length();
    const steps = Math.max(1, Math.ceil(speed * dt / 0.35));
    let hit = false;
    for (let s = 0; s < steps; s++) {
      r.pos.addScaledVector(r.vel, dt / steps);
      if (isSolid(Math.floor(r.pos.x), Math.floor(r.pos.y), Math.floor(r.pos.z))) { hit = true; break; }
    }
    r.mesh.position.copy(r.pos);
    r.mesh.children[1].scale.setScalar(1 + Math.sin(performance.now() * 0.04) * 0.18);
    r.life -= dt;

    if (Math.random() < 0.9) {
      spawnFx(r.pos.x, r.pos.y, r.pos.z, 1, { color: 0xff9a4d, speed: 1.2, life: 0.5, size: 0.32, gravity: -2, drag: 2, spread: 0.1 });
    }

    if (hit || r.life <= 0 || r.pos.y < -3) {
      if (hit) blast(r.pos, 6.4, { power: 1.5, shake: 0.3, debrisN: 80 });
      scene.remove(r.mesh);
      rockets.splice(i, 1);
    }
  }
}

function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    g.vel.y -= 24 * dt;

    const nx = g.pos.x + g.vel.x * dt;
    if (isSolid(Math.floor(nx), Math.floor(g.pos.y), Math.floor(g.pos.z))) g.vel.x *= -0.42;
    else g.pos.x = nx;
    const ny = g.pos.y + g.vel.y * dt;
    if (isSolid(Math.floor(g.pos.x), Math.floor(ny), Math.floor(g.pos.z))) {
      g.vel.y *= -0.38; g.vel.x *= 0.72; g.vel.z *= 0.72;
    } else g.pos.y = ny;
    const nz = g.pos.z + g.vel.z * dt;
    if (isSolid(Math.floor(g.pos.x), Math.floor(g.pos.y), Math.floor(nz))) g.vel.z *= -0.42;
    else g.pos.z = nz;

    g.mesh.position.copy(g.pos);
    g.mesh.rotation.x += dt * 7;
    g.mesh.rotation.z += dt * 5;

    if (Math.random() < 0.35) {
      spawnFx(g.pos.x, g.pos.y, g.pos.z, 1, { color: 0xa8ffb0, speed: 0.6, life: 0.4, size: 0.1, gravity: 2, drag: 3, spread: 0.08 });
    }

    g.fuse -= dt;
    if (g.fuse <= 0) {
      blast(g.pos, 5.6, { power: 1.2, shake: 0.25, debrisN: 60 });
      scene.remove(g.mesh);
      grenades.splice(i, 1);
    }
  }
}

function updateCharges(dt) {
  const t = performance.now();
  for (let i = charges.length - 1; i >= 0; i--) {
    const c = charges[i];
    c.fuse -= dt;
    c.led.material.color.setHex(c.fuse > 1 ? (Math.sin(t * 0.02) > 0 ? 0xff4d5e : 0x501018) : (Math.sin(t * 0.05) > 0 ? 0xff2a3a : 0x200006));
    if (c.fuse <= 0) {
      blast(c.pos, 7.5, { power: 1.4, shake: 0.32, debrisN: 80 });
      scene.remove(c.mesh);
      charges.splice(i, 1);
    }
  }
}

function detonateCharges() {
  if (!charges.length) {
    toast('没有已安放的定时炸药');
    Sfx.dry();
    return;
  }
  const list = charges.slice();
  charges.length = 0;
  list.forEach((c, i) => {
    strikes.push({ pos: c.pos, t: 0.05 * i, type: 'charge', mesh: c.mesh });
  });
  toast('全部起爆');
  flashScreen(0.18);
}

function updateStrikes(dt) {
  for (let i = strikes.length - 1; i >= 0; i--) {
    const s = strikes[i];
    s.t -= dt;
    if (s.t > 0) continue;
    if (s.type === 'orbital') performOrbital(s.pos);
    else if (s.type === 'orbital2') blast(s.pos, 5.5, { power: 1.4, shake: 0.2, debrisN: 50 });
    else if (s.type === 'charge') {
      blast(s.pos, 7.5, { power: 1.4, shake: 0.3, debrisN: 70 });
      if (s.mesh) scene.remove(s.mesh);
    } else if (s.type === 'nuke') performNuke(s.pos);
    strikes.splice(i, 1);
  }
}

/* ---------------- HUD ---------------- */
const el = {
  pct: document.getElementById('pct'),
  bar: document.getElementById('bar'),
  blocks: document.getElementById('blocks'),
  left: document.getElementById('left'),
  money: document.getElementById('money'),
  moneyPop: document.getElementById('moneyPop'),
  wName: document.getElementById('wName'),
  wMeta: document.getElementById('wMeta'),
  hotbar: document.getElementById('hotbar'),
  map: document.getElementById('map'),
  fps: document.getElementById('fps'),
  toast: document.getElementById('toast'),
  crosshair: document.getElementById('crosshair'),
  overlay: document.getElementById('overlay'),
  status: document.getElementById('status'),
  start: document.getElementById('start'),
  shop: document.getElementById('shop'),
  shopMoney: document.getElementById('shopMoney'),
  shopList: document.getElementById('shopList'),
  shopClose: document.getElementById('shopClose'),
  ach: document.getElementById('ach'),
  achList: document.getElementById('achList'),
  achCount: document.getElementById('achCount'),
  achTotal: document.getElementById('achTotal'),
  achClose: document.getElementById('achClose'),
  achBtn: document.getElementById('achBtn'),
  mapPicker: document.getElementById('mapPicker'),
  mapName: document.getElementById('mapName'),
  flash: document.getElementById('flash'),
};

const fmt = n => n.toLocaleString('en-US');

function updateMoneyUI() {
  el.money.textContent = fmt(game.money);
  el.shopMoney.textContent = fmt(game.money);
}

function updateWeaponUI() {
  const w = WEAPONS.find(x => x.id === game.weapon);
  if (!w) return;
  el.wName.textContent = w.name;
  if (w.free) {
    el.wMeta.textContent = w.meta;
  } else {
    const unit = w.id === 'orbital' ? '次' : w.id === 'nuke' ? '枚' : '发';
    el.wMeta.textContent = `剩余 ${game.ammo[w.id]} ${unit} · ${w.meta}`;
  }
}

function updateHotbar() {
  el.hotbar.innerHTML = WEAPONS.map(w => {
    const owned = w.free || game.owned[w.id];
    const active = game.weapon === w.id ? ' active' : '';
    const locked = owned ? '' : ' locked';
    let sub;
    if (!owned) sub = '<span class="lk">未解锁</span>';
    else if (w.free) sub = '<span class="am">∞</span>';
    else sub = `<span class="am">${game.ammo[w.id]}</span>`;
    return `<div class="slot${active}${locked}"><b>${w.slot}</b><span class="nm">${w.name}</span>${sub}</div>`;
  }).join('');
}

function renderShop() {
  el.shopMoney.textContent = fmt(game.money);
  el.shopList.innerHTML = SHOP_IDS.map(id => {
    const it = SHOP[id];
    const owned = game.owned[id];
    const maxed = owned && game.ammo[id] + it.pack > it.max;
    const cost = owned ? it.refill : it.price;
    const afford = game.money >= cost && !maxed;
    const btn = maxed ? '已满' : (owned ? `补货 +${it.pack}` : '购买');
    const icon = shopIcons[id];
    const icoStyle = icon ? `background-image:url(${icon});--c:${it.color}` : `--c:${it.color}`;
    return `<div class="item">
      <div class="ico" style="${icoStyle}"></div>
      <div class="meta">
        <div class="nm">${it.name} <i>${owned ? '已解锁' : '未解锁'}</i></div>
        <div class="ds">${it.desc}</div>
        <div class="have">${owned ? `持有 ${game.ammo[id]} · 上限 ${it.max}` : `解锁附赠 ${it.pack}`}</div>
      </div>
      <div class="buy">
        <div class="pr">₡ ${fmt(cost)}</div>
        <button data-buy="${id}" ${afford ? '' : 'disabled'}>${btn}</button>
      </div>
    </div>`;
  }).join('');
}

function buyItem(id) {
  const it = SHOP[id];
  if (!it) return;
  const owned = game.owned[id];
  const cost = owned ? it.refill : it.price;
  if (owned && game.ammo[id] + it.pack > it.max) { toast('弹药已满'); Sfx.dry(); return; }
  if (game.money < cost) { toast('资金不足 · 继续拆吧'); Sfx.dry(); return; }
  game.money -= cost;
  game.owned[id] = true;
  game.ammo[id] = Math.min(it.max, game.ammo[id] + it.pack);
  Sfx.purchase();
  renderShop();
  updateMoneyUI();
  updateHotbar();
  updateWeaponUI();
  checkAchievements();
  toast(`${it.name} ${owned ? '补货' : '已解锁'} +${it.pack}`);
}

let shopOpen = false;

function openShop() {
  if (shopOpen) return;
  shopOpen = true;
  firing = false;
  if (document.pointerLockElement) document.exitPointerLock();
  el.shop.classList.remove('hidden');
  el.overlay.classList.add('hidden');
  renderShop();
}

function closeShop() {
  if (!shopOpen) return;
  shopOpen = false;
  el.shop.classList.add('hidden');
  requestLock();
}

el.shopList.addEventListener('click', e => {
  const btn = e.target.closest('button[data-buy]');
  if (btn) buyItem(btn.dataset.buy);
});
el.shopClose.addEventListener('click', closeShop);

/* ---------------- 武器图标（3D 缩略图） ---------------- */
const shopIcons = {};

function renderShopIcons() {
  try {
    const size = 128;
    const rt = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    rt.setSize(size, size);
    rt.setPixelRatio(1);
    rt.setClearColor(0x000000, 0);
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffffff, 0x556677, 2.4));
    const dl = new THREE.DirectionalLight(0xffffff, 2.6);
    dl.position.set(1.4, 2.2, 1.8);
    s.add(dl);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 30);

    for (const id of SHOP_IDS) {
      const model = models[id].clone(true);
      model.visible = true;
      model.position.set(0, 0, 0);
      model.rotation.set(-0.2, 0.55, 0);
      s.add(model);
      const box = new THREE.Box3().setFromObject(model);
      const c = box.getCenter(new THREE.Vector3());
      const r = Math.max(box.getSize(new THREE.Vector3()).length() * 0.55, 0.4);
      cam.position.set(c.x + r * 0.85, c.y + r * 0.7, c.z + r * 1.25);
      cam.lookAt(c);
      rt.render(s, cam);
      shopIcons[id] = rt.domElement.toDataURL();
      s.remove(model);
    }
    rt.dispose();
    if (rt.forceContextLoss) rt.forceContextLoss();
  } catch (err) {
    console.warn('武器图标生成失败，回退为色块', err);
  }
}

/* ---------------- 成就 ---------------- */
const ACH_LIST = [
  { id: 'b100', name: '初次拆家', desc: '累计破坏 100 块方块', target: 100, cur: () => stats.totalDestroyed },
  { id: 'b1000', name: '专业拆迁', desc: '累计破坏 1,000 块方块', target: 1000, cur: () => stats.totalDestroyed },
  { id: 'b5000', name: '城市清道夫', desc: '累计破坏 5,000 块方块', target: 5000, cur: () => stats.totalDestroyed },
  { id: 'b20000', name: '夷为平地', desc: '累计破坏 20,000 块方块', target: 20000, cur: () => stats.totalDestroyed },
  { id: 'buy_rocket', name: '重火力', desc: '在黑市买下火箭筒', owned: () => game.owned.rocket },
  { id: 'buy_grenade', name: '投掷手', desc: '在黑市买下手雷', owned: () => game.owned.grenade },
  { id: 'buy_c4', name: '爆破工程师', desc: '在黑市买下定时炸药', owned: () => game.owned.c4 },
  { id: 'buy_orbital', name: '天基权限', desc: '在黑市买下轨道打击', owned: () => game.owned.orbital },
  { id: 'buy_nuke', name: '末日按钮', desc: '在黑市买下核弹', owned: () => game.owned.nuke },
];
const achUnlocked = new Set();
let achOpen = false;

function achDone(a) {
  if (a.owned) return a.owned();
  return a.cur() >= a.target;
}

function checkAchievements() {
  let changed = false;
  for (const a of ACH_LIST) {
    if (achUnlocked.has(a.id) || !achDone(a)) continue;
    achUnlocked.add(a.id);
    changed = true;
    toast(`成就解锁 · ${a.name}`);
    Sfx.achieve();
  }
  if (changed) {
    updateAchUI();
    if (achOpen) renderAchievements();
  }
}

function updateAchUI() {
  el.achCount.textContent = achUnlocked.size;
  el.achTotal.textContent = '/' + ACH_LIST.length;
  el.achBtn.textContent = `查看成就（${achUnlocked.size}/${ACH_LIST.length}）`;
}

function renderAchievements() {
  el.achList.innerHTML = ACH_LIST.map((a, i) => {
    const done = achUnlocked.has(a.id);
    let right;
    if (done) right = '<div class="done">已解锁</div>';
    else if (a.target) right = `<div class="todo">${fmt(Math.min(a.cur(), a.target))} / ${fmt(a.target)}</div>`;
    else right = '<div class="todo">未达成</div>';
    return `<div class="item ${done ? '' : 'locked'}">
      <div class="badge">${done ? '★' : (i + 1)}</div>
      <div class="meta">
        <div class="nm">${a.name}</div>
        <div class="ds">${a.desc}</div>
      </div>
      <div class="buy">${right}</div>
    </div>`;
  }).join('');
}

function openAch() {
  if (achOpen) return;
  achOpen = true;
  firing = false;
  if (document.pointerLockElement) document.exitPointerLock();
  el.ach.classList.remove('hidden');
  el.overlay.classList.add('hidden');
  renderAchievements();
}

function closeAch() {
  if (!achOpen) return;
  achOpen = false;
  el.ach.classList.add('hidden');
  requestLock();
}

el.achClose.addEventListener('click', closeAch);
el.achBtn.addEventListener('click', openAch);

/* ---------------- 地图选择 ---------------- */
function syncMapButtons() {
  if (!el.mapPicker) return;
  el.mapPicker.querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', b.dataset.map === currentMap);
  });
}

function renderMapPicker() {
  el.mapPicker.innerHTML = MAPS.map(m =>
    `<button class="mapbtn${m.id === currentMap ? ' active' : ''}" data-map="${m.id}">${m.name}<small>${m.desc}</small></button>`
  ).join('');
}

el.mapPicker.addEventListener('click', e => {
  const btn = e.target.closest('button[data-map]');
  if (!btn) return;
  const id = btn.dataset.map;
  if (id === currentMap) return;
  currentMap = id;
  resetCity(undefined, id);
});
const mapCtx = el.map.getContext('2d');
const mapBase = document.createElement('canvas');
mapBase.width = SX; mapBase.height = SZ;
let mapDirty = true, mapTimer = 0;

function updateStats() {
  const pct = totalBreakable > 0 ? Math.min(100, (destroyedCount / totalBreakable) * 100) : 0;
  el.pct.textContent = pct.toFixed(1);
  el.bar.style.width = pct.toFixed(1) + '%';
  el.blocks.textContent = fmt(destroyedCount);
  el.left.textContent = fmt(Math.max(0, totalBreakable - destroyedCount));
  el.money.textContent = fmt(game.money);
  if (pct >= 99.9 && !cityCleared) {
    cityCleared = true;
    toast('城市已被夷为平地');
  }
  checkAchievements();
}

let moneyPopTimer = 0;
function flushMoneyPop(dt) {
  moneyPopTimer += dt;
  if (moneyPopTimer < 0.35) return;
  moneyPopTimer = 0;
  if (pendingMoney <= 0) return;
  el.moneyPop.textContent = '+₡ ' + fmt(pendingMoney);
  el.moneyPop.classList.remove('show');
  void el.moneyPop.offsetWidth;
  el.moneyPop.classList.add('show');
  el.money.textContent = fmt(game.money);
  pendingMoney = 0;
}

let toastTimer = 0;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  toastTimer = 1.5;
}

function renderMapBase() {
  const ctx = mapBase.getContext('2d');
  const img = ctx.createImageData(SX, SZ);
  const d = img.data;
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      let y = SY - 1;
      while (y >= 0 && !getB(x, y, z)) y--;
      let r = 22, g = 26, b = 38;
      if (y >= 0) {
        const c = BLOCK_COLOR[getB(x, y, z)] || 0x666666;
        const k = 0.55 + Math.min(y, 34) / 46;
        r = ((c >> 16) & 255) * k;
        g = ((c >> 8) & 255) * k;
        b = (c & 255) * k;
      }
      const i = (z * SX + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 235;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawMap() {
  const W = el.map.width, H = el.map.height;
  mapCtx.clearRect(0, 0, W, H);
  mapCtx.imageSmoothingEnabled = false;
  mapCtx.drawImage(mapBase, 0, 0, W, H);

  const s = W / SX;
  const px = player.pos.x * s, pz = player.pos.z * s;
  mapCtx.save();
  mapCtx.translate(px, pz);
  mapCtx.rotate(-player.yaw);
  const grd = mapCtx.createLinearGradient(0, 0, 0, -16);
  grd.addColorStop(0, 'rgba(140,245,255,.55)');
  grd.addColorStop(1, 'rgba(140,245,255,0)');
  mapCtx.fillStyle = grd;
  mapCtx.beginPath();
  mapCtx.moveTo(0, 0);
  mapCtx.lineTo(-9, -17);
  mapCtx.lineTo(9, -17);
  mapCtx.closePath();
  mapCtx.fill();
  mapCtx.restore();

  mapCtx.beginPath();
  mapCtx.arc(px, pz, 3.2, 0, Math.PI * 2);
  mapCtx.fillStyle = '#eafcff';
  mapCtx.fill();
  mapCtx.lineWidth = 1.4;
  mapCtx.strokeStyle = 'rgba(60,230,255,.95)';
  mapCtx.stroke();

  mapCtx.strokeStyle = 'rgba(140,240,255,.35)';
  mapCtx.lineWidth = 1;
  mapCtx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

/* ---------------- 输入 ---------------- */
let locked = false;
let gameStarted = false;

function requestLock() {
  Sfx.init();
  const p = canvas.requestPointerLock();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  const hud = document.getElementById('hud');
  if (shopOpen || achOpen) {
    el.overlay.classList.add('hidden');
    hud.classList.remove('hidden');
  } else {
    el.overlay.classList.toggle('hidden', locked || !gameStarted);
    hud.classList.toggle('hidden', !locked);
  }
  if (!locked) {
    firing = false;
    el.start.textContent = '继续破坏';
    el.status.textContent = '已暂停 · 点击继续';
    keys.w = keys.a = keys.s = keys.d = keys.shift = keys.space = false;
  } else {
    el.status.textContent = '城市已就绪 · 尽情拆吧';
  }
});

el.start.addEventListener('click', () => {
  if (el.start.disabled) return;
  gameStarted = true;
  requestLock();
});
canvas.addEventListener('click', () => {
  if (!locked && !el.start.disabled && !shopOpen && !achOpen) requestLock();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('mousedown', e => {
  if (!locked) return;
  if (e.button === 0) {
    if (game.weapon === 'hammer') useHammer();   // 大锤：一次点击一次挥砸，按住不会连击
    else firing = true;
  }
  if (e.button === 2) detonateCharges();
});
document.addEventListener('mouseup', e => {
  if (e.button === 0) firing = false;
});

document.addEventListener('wheel', e => {
  if (!locked) return;
  e.preventDefault();
  cycleWeapon(e.deltaY > 0 ? 1 : -1);
}, { passive: false });

document.addEventListener('mousemove', e => {
  if (!locked) return;
  const sens = 0.0022;
  player.yaw -= e.movementX * sens;
  player.pitch -= e.movementY * sens;
  player.pitch = Math.max(-1.52, Math.min(1.52, player.pitch));
});

const SLOT_KEYS = {
  Digit1: 'drill', Digit2: 'hammer', Digit3: 'rocket', Digit4: 'grenade',
  Digit5: 'c4', Digit6: 'orbital', Digit7: 'nuke',
};

window.addEventListener('keydown', e => {
  if (e.code === 'KeyB') {
    e.preventDefault();
    if (shopOpen) closeShop(); else openShop();
    return;
  }
  if (e.code === 'KeyV') {
    e.preventDefault();
    if (achOpen) closeAch(); else if (!shopOpen) openAch();
    return;
  }
  if (shopOpen || achOpen) return;
  if (e.code === 'KeyW') keys.w = true;
  if (e.code === 'KeyA') keys.a = true;
  if (e.code === 'KeyS') keys.s = true;
  if (e.code === 'KeyD') keys.d = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = true;
  if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
  if (SLOT_KEYS[e.code]) selectWeapon(SLOT_KEYS[e.code]);
  if (e.code === 'KeyR' && locked) resetCity();
  if (e.code === 'KeyG' && locked) { // 紧急脱困
    const p = player.pos;
    let y = GROUND + 1;
    for (let yy = SY - 2; yy > GROUND; yy--) {
      if (isSolid(Math.floor(p.x), yy, Math.floor(p.z)) && !isSolid(Math.floor(p.x), yy + 1, Math.floor(p.z)) && !isSolid(Math.floor(p.x), yy + 2, Math.floor(p.z))) {
        y = yy + 1; break;
      }
    }
    p.y = y; player.vel.set(0, 0, 0);
    toast('已脱离卡点');
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'KeyW') keys.w = false;
  if (e.code === 'KeyA') keys.a = false;
  if (e.code === 'KeyS') keys.s = false;
  if (e.code === 'KeyD') keys.d = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
  if (e.code === 'Space') keys.space = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  updateFxScale();
});

/* ---------------- 重建城市 ---------------- */
let seed = (Date.now() ^ 0x5f3759df) >>> 0;

function resetCity(newSeed, newMap) {
  seed = newSeed === undefined ? ((seed * 1664525 + 1013904223) >>> 0) : newSeed;
  if (newMap) currentMap = newMap;
  generateWorld(seed, currentMap);
  buildAllChunks();
  dirty.clear();
  destroyedCount = 0;
  cityCleared = false;
  parts.length = 0;
  fxList.length = 0;
  falling.length = 0;
  fallMesh.count = 0;
  collapsePending = null;
  collapseCooldown = 0;
  debrisMesh.count = 0;
  for (let i = rockets.length - 1; i >= 0; i--) { scene.remove(rockets[i].mesh); rockets.splice(i, 1); }
  for (let i = grenades.length - 1; i >= 0; i--) { scene.remove(grenades[i].mesh); grenades.splice(i, 1); }
  for (let i = charges.length - 1; i >= 0; i--) { scene.remove(charges[i].mesh); charges.splice(i, 1); }
  strikes.length = 0;
  respawn();
  updateStats();
  updateWeaponUI();
  updateHotbar();
  updateMoneyUI();
  renderMapBase();
  mapDirty = false;
  syncMapButtons();
  const mapName = (MAPS.find(m => m.id === currentMap) || MAPS[0]).name;
  el.mapName.textContent = `${mapName} · SECTOR 07`;
  toast(`${mapName}已重建 · 武器与资金保留`);
  Sfx.reset();
}

/* ---------------- 主循环 ---------------- */
const clock = new THREE.Clock();
let fpsAcc = 0, fpsFrames = 0;

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  requestAnimationFrame(tick);

  if (locked) updatePlayer(dt);

  if (firing && locked && game.weapon !== 'hammer') {
    cd -= dt;
    if (cd <= 0) useWeapon();
  } else {
    cd = Math.max(0, cd - dt);
  }

  updateRockets(dt);
  updateGrenades(dt);
  updateCharges(dt);
  updateStrikes(dt);
  updateDebris(dt);
  debrisHitBudget = 3;
  updateFalling(dt);
  collapseCooldown = Math.max(0, collapseCooldown - dt);
  if (collapsePending && collapseCooldown === 0) runCollapse();
  updateFx(dt);
  updateEffects(dt);
  applyCamera(dt);
  flushDirty(10);
  flushMoneyPop(dt);

  // 武器姿态 / 后坐 / 呼吸
  viewRoot.position.set(
    0.27 + Math.sin(bobT * 1.05) * 0.012,
    -0.23 + Math.sin(bobT * 2.1) * 0.008 - recoil * 0.02,
    -0.46 + recoil * 0.10
  );
  viewRoot.rotation.set(recoil * 0.5, 0.08, 0.02 + recoil * 0.05);
  if (game.weapon === 'drill') {
    models.drillBit.rotation.z += dt * (firing ? 52 : 8);
  }
  updateHammerSwing(dt);

  // 地图刷新（限频）
  mapTimer += dt;
  if (mapDirty && mapTimer > 0.55) {
    renderMapBase();
    mapDirty = false;
    mapTimer = 0;
  }
  drawMap();

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) el.toast.classList.remove('show');
  }

  fpsAcc += dt; fpsFrames++;
  if (fpsAcc >= 0.5) {
    const fps = fpsFrames / fpsAcc;
    el.fps.textContent = Math.round(fps) + ' FPS';
    fpsAcc = 0; fpsFrames = 0;
    adaptQuality(fps, dt);
  }

  renderer.render(scene, camera);
}

/* ---------------- 启动 ---------------- */
function boot() {
  updateMoneyUI();
  updateWeaponUI();
  updateHotbar();
  updateFxScale();
  renderMapPicker();
  updateAchUI();
  renderShopIcons();
  syncMapButtons();
  el.status.textContent = '正在生成世界…';
  // 先让遮罩绘制出来，再做重活
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const t0 = performance.now();
      generateWorld(seed, currentMap);
      buildAllChunks();
      renderMapBase();
      updateStats();
      const cost = Math.round(performance.now() - t0);
      el.start.disabled = false;
      el.start.textContent = '点击进入战场';
      const mapName = (MAPS.find(m => m.id === currentMap) || MAPS[0]).name;
      el.mapName.textContent = `${mapName} · SECTOR 07`;
      el.status.textContent = `已就绪 · ${fmt(totalBreakable)} 块可破坏 · 生成 ${cost}ms`;
      clock.getDelta();
      tick();
    });
  });
}

boot();

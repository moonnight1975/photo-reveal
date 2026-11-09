import fs from 'fs';
import path from 'path';
import { createGame, createPhoto, updateGameSettings, getAllGames } from './db.js';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Eiffel Tower
const eiffelSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#4c1d95" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="tower" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#sky)"/>
  <circle cx="680" cy="120" r="50" fill="#fef3c7" opacity="0.9"/>
  <!-- Ground -->
  <rect x="0" y="520" width="800" height="80" fill="#1e293b"/>
  <!-- Trees -->
  <ellipse cx="200" cy="530" rx="60" ry="30" fill="#064e3b" opacity="0.8"/>
  <ellipse cx="600" cy="530" rx="80" ry="35" fill="#064e3b" opacity="0.8"/>
  <!-- Eiffel Tower Silhouette -->
  <!-- Legs -->
  <path d="M 280 520 L 360 320 L 440 320 L 520 520 L 470 520 L 430 380 Q 400 360 370 380 L 330 520 Z" fill="url(#tower)"/>
  <!-- Arch -->
  <path d="M 340 520 Q 400 420 460 520 Z" fill="#1e1b4b" opacity="0.7"/>
  <!-- Middle Tier -->
  <rect x="350" y="300" width="100" height="20" rx="4" fill="url(#tower)"/>
  <path d="M 360 300 L 385 180 L 415 180 L 440 300 Z" fill="url(#tower)"/>
  <!-- Top Tier & Spire -->
  <rect x="380" y="165" width="40" height="15" rx="3" fill="url(#tower)"/>
  <polygon points="385,165 400,60 415,165" fill="url(#tower)"/>
  <!-- Spire tip beam -->
  <line x1="400" y1="60" x2="400" y2="30" stroke="#fef08a" stroke-width="4"/>
  <circle cx="400" cy="30" r="8" fill="#fef08a" opacity="0.9"/>
</svg>`;

// 2. Planet Saturn
const saturnSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <radialGradient id="space" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    <linearGradient id="saturnBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="30%" stop-color="#f59e0b" />
      <stop offset="70%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
    <linearGradient id="rings" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.2"/>
      <stop offset="30%" stop-color="#f59e0b" stop-opacity="0.8"/>
      <stop offset="70%" stop-color="#fbbf24" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#fde047" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#space)"/>
  <!-- Stars -->
  <circle cx="100" cy="80" r="2" fill="#fff" opacity="0.8"/>
  <circle cx="250" cy="150" r="1.5" fill="#fff" opacity="0.6"/>
  <circle cx="700" cy="120" r="2.5" fill="#fff" opacity="0.9"/>
  <circle cx="650" cy="450" r="2" fill="#fff" opacity="0.7"/>
  <circle cx="120" cy="480" r="1.5" fill="#fff" opacity="0.5"/>
  <circle cx="400" cy="70" r="2" fill="#fff" opacity="0.8"/>
  <!-- Back Rings -->
  <g transform="rotate(-25 400 300)">
    <ellipse cx="400" cy="300" rx="320" ry="70" fill="none" stroke="url(#rings)" stroke-width="36" opacity="0.75"/>
    <ellipse cx="400" cy="300" rx="350" ry="78" fill="none" stroke="url(#rings)" stroke-width="12" opacity="0.45"/>
  </g>
  <!-- Planet Body -->
  <circle cx="400" cy="300" r="140" fill="url(#saturnBody)"/>
  <!-- Atmospheric bands -->
  <clipPath id="planetClip">
    <circle cx="400" cy="300" r="140"/>
  </clipPath>
  <g clip-path="url(#planetClip)">
    <rect x="250" y="240" width="300" height="20" fill="#b45309" opacity="0.3"/>
    <rect x="250" y="280" width="300" height="35" fill="#78350f" opacity="0.35"/>
    <rect x="250" y="340" width="300" height="15" fill="#d97706" opacity="0.4"/>
  </g>
  <!-- Front Rings -->
  <g transform="rotate(-25 400 300)">
    <path d="M 80 300 A 320 70 0 0 0 720 300" fill="none" stroke="url(#rings)" stroke-width="36" opacity="0.9"/>
    <path d="M 50 300 A 350 78 0 0 0 750 300" fill="none" stroke="url(#rings)" stroke-width="12" opacity="0.6"/>
  </g>
</svg>`;

// 3. Golden Gate Bridge
const bridgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0369a1" />
      <stop offset="40%" stop-color="#f97316" />
      <stop offset="80%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
    <linearGradient id="bay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#sunset)"/>
  <!-- Fog Bank -->
  <ellipse cx="400" cy="400" rx="500" ry="80" fill="#f8fafc" opacity="0.3" filter="blur(20px)"/>
  <!-- Water -->
  <rect x="0" y="440" width="800" height="160" fill="url(#bay)"/>
  <!-- Main Towers (International Orange #c0392b) -->
  <!-- North Tower -->
  <rect x="240" y="160" width="24" height="280" fill="#dc2626"/>
  <rect x="280" y="160" width="24" height="280" fill="#dc2626"/>
  <rect x="230" y="220" width="84" height="14" fill="#b91c1c"/>
  <rect x="230" y="280" width="84" height="14" fill="#b91c1c"/>
  <rect x="230" y="340" width="84" height="14" fill="#b91c1c"/>
  <!-- South Tower -->
  <rect x="520" y="160" width="24" height="280" fill="#dc2626"/>
  <rect x="560" y="160" width="24" height="280" fill="#dc2626"/>
  <rect x="510" y="220" width="84" height="14" fill="#b91c1c"/>
  <rect x="510" y="280" width="84" height="14" fill="#b91c1c"/>
  <rect x="510" y="340" width="84" height="14" fill="#b91c1c"/>
  <!-- Roadway Deck -->
  <rect x="0" y="390" width="800" height="20" fill="#991b1b"/>
  <!-- Main Suspension Cables -->
  <path d="M 0 260 Q 130 380 250 160 Q 390 385 530 160 Q 670 380 800 270" fill="none" stroke="#ef4444" stroke-width="7"/>
  <!-- Vertical suspender ropes -->
  <g stroke="#fca5a5" stroke-width="1.5" opacity="0.7">
    <line x1="100" y1="330" x2="100" y2="390"/>
    <line x1="150" y1="355" x2="150" y2="390"/>
    <line x1="200" y1="330" x2="200" y2="390"/>
    <line x1="330" y1="310" x2="330" y2="390"/>
    <line x1="370" y1="350" x2="370" y2="390"/>
    <line x1="410" y1="365" x2="410" y2="390"/>
    <line x1="450" y1="350" x2="450" y2="390"/>
    <line x1="490" y1="310" x2="490" y2="390"/>
    <line x1="610" y1="320" x2="610" y2="390"/>
    <line x1="660" y1="345" x2="660" y2="390"/>
    <line x1="710" y1="320" x2="710" y2="390"/>
  </g>
</svg>`;

// 4. Lion
const lionSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <radialGradient id="savanna" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#451a03" />
      <stop offset="100%" stop-color="#1c1917" />
    </radialGradient>
    <linearGradient id="mane" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b45309" />
      <stop offset="50%" stop-color="#78350f" />
      <stop offset="100%" stop-color="#451a03" />
    </linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#savanna)"/>
  <!-- Big Majestic Mane -->
  <circle cx="400" cy="300" r="220" fill="url(#mane)"/>
  <!-- Spiky Mane Texture -->
  <polygon points="400,60 430,120 400,100 370,120" fill="#92400e"/>
  <polygon points="580,180 540,220 560,200 520,240" fill="#78350f"/>
  <polygon points="620,300 560,320 580,300 560,280" fill="#92400e"/>
  <polygon points="220,180 260,220 240,200 280,240" fill="#78350f"/>
  <polygon points="180,300 240,320 220,300 240,280" fill="#92400e"/>
  <!-- Ears -->
  <circle cx="280" cy="180" r="35" fill="#f59e0b"/>
  <circle cx="280" cy="180" r="20" fill="#78350f"/>
  <circle cx="520" cy="180" r="35" fill="#f59e0b"/>
  <circle cx="520" cy="180" r="20" fill="#78350f"/>
  <!-- Face -->
  <ellipse cx="400" cy="330" rx="120" ry="140" fill="url(#face)"/>
  <!-- Eyes -->
  <ellipse cx="340" cy="290" rx="22" ry="14" fill="#fef08a"/>
  <ellipse cx="460" cy="290" rx="22" ry="14" fill="#fef08a"/>
  <circle cx="340" cy="290" r="10" fill="#0f172a"/>
  <circle cx="460" cy="290" r="10" fill="#0f172a"/>
  <!-- Snout -->
  <polygon points="400,340 370,390 430,390" fill="#78350f"/>
  <ellipse cx="400" cy="420" rx="45" ry="30" fill="#fef9c3"/>
  <!-- Nose -->
  <polygon points="380,380 420,380 400,405" fill="#1e293b"/>
  <!-- Mouth line -->
  <path d="M 400 405 L 400 425 Q 370 435 360 415 M 400 425 Q 430 435 440 415" fill="none" stroke="#1e293b" stroke-width="4"/>
</svg>`;

export function seedDemoData() {
  // DB is already initialized by the caller
  const existing = getAllGames();
  if (existing.length > 0) {
    console.log(`ℹ️ Database already has ${existing.length} games. Skipping seed.`);
    return existing[0].id;
  }

  console.log('🌱 Seeding demo game and sample photos...');

  // Write demo files
  fs.writeFileSync(path.join(uploadsDir, 'eiffel-tower.svg'), eiffelSvg);
  fs.writeFileSync(path.join(uploadsDir, 'saturn.svg'), saturnSvg);
  fs.writeFileSync(path.join(uploadsDir, 'golden-gate.svg'), bridgeSvg);
  fs.writeFileSync(path.join(uploadsDir, 'lion.svg'), lionSvg);

  const game = createGame('Demo Championship');

  // Configure settings
  updateGameSettings(game.id, {
    revealDuration: 45,
    revealInterval: 3,
    gridRows: 4,
    gridCols: 4,
    revealOrder: 'random',
    revealMode: 'auto',
    hintsEnabled: 1,
    timerEnabled: 1,
    multipleAttempts: 1,
  });

  // Create photos
  createPhoto(
    game.id,
    'Eiffel Tower',
    'Located in the capital of France||Constructed for the 1889 World Fair||Made of wrought iron',
    '/uploads/eiffel-tower.svg',
    'Landmarks'
  );

  createPhoto(
    game.id,
    'Saturn',
    'Sixth planet from the Sun||Famous for its prominent ring system||A gas giant named after a Roman god',
    '/uploads/saturn.svg',
    'Space'
  );

  createPhoto(
    game.id,
    'Golden Gate Bridge',
    'Suspension bridge in California||Painted in International Orange||Spans a famous bay and strait',
    '/uploads/golden-gate.svg',
    'Landmarks'
  );

  createPhoto(
    game.id,
    'Lion',
    'Known as the King of the Jungle||Males possess a large majestic mane||Apex predator native to Africa',
    '/uploads/lion.svg',
    'Animals'
  );

  console.log(`🎉 Demo game created with ID: ${game.id}`);
  return game.id;
}

// Auto seed on direct run
if (process.argv[1]?.endsWith('seed.js')) {
  const { initDb } = await import('./db.js');
  await initDb();
  seedDemoData();
}

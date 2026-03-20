import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// 🌍 CONSTANTES E CONFIGURAÇÕES
// ============================================================================
const WORLD_CENTER = 20000;
const MAX_WORLD_RADIUS = WORLD_CENTER - 500;
const BASE_WORLD_RADIUS = 3000;
const CELL_SIZE = 200;

const QUALITY_SETTINGS = {
  low: { shadows: false, bubbles: false, maxSegments: 60, particleMult: 0.3, preRender: false },
  medium: { shadows: true, bubbles: true, maxSegments: 120, particleMult: 0.6, preRender: false },
  high: { shadows: true, bubbles: true, maxSegments: 200, particleMult: 1.0, preRender: true }
};

const POWERUP_TYPES = [
  { id: 0, name: 'Escudo', color: '#06b6d4', duration: 8000 },
  { id: 1, name: 'Turbo', color: '#fde047', duration: 6000 },
  { id: 2, name: 'Ímã', color: '#a855f7', duration: 10000 },
  { id: 3, name: 'Moeda', color: '#fbbf24', duration: 0 },
  { id: 4, name: 'Ghost', color: '#c7d2fe', duration: 5000 },
];

// Level thresholds — every LEVEL_STEP score = 1 level
const LEVEL_STEP = 500;

// ============================================================================
// 📝 FLOATING TEXT
// ============================================================================
class FloatText {
  constructor(x, y, text, color = '#ffffff', size = 18) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.size = size; this.life = 1.0; this.vy = -80;
  }
  update(dt) { this.y += this.vy * dt; this.vy *= 0.94; this.life -= dt * 1.6; return this.life > 0; }
  draw(ctx) {
    ctx.save(); ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color; ctx.shadowBlur = 8; ctx.shadowColor = this.color;
    ctx.font = `bold ${this.size}px 'Exo 2', sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y); ctx.restore();
  }
}

// ============================================================================
// 🎨 SKINS E ACESSÓRIOS DEFINITIONS
// ============================================================================
const RARITY = { NORMAL: 0, RARE: 1, PREMIUM: 2 };
const SKINS = [
  { id: 'cyclops', name: 'Ciclope', rarity: RARITY.NORMAL, cost: 0, colors: ['#3b82f6', '#1d4ed8'], style: 'default' },
  { id: 'squid', name: 'Lula', rarity: RARITY.NORMAL, cost: 0, colors: ['#ec4899', '#be185d'], style: 'tentacles' },
  { id: 'angler', name: 'Lanterna', rarity: RARITY.NORMAL, cost: 0, colors: ['#1f2937', '#111827'], style: 'angler' },
  { id: 'star', name: 'Estrela', rarity: RARITY.NORMAL, cost: 0, colors: ['#f59e0b', '#b45309'], style: 'spiky' },
  { id: 'mantis', name: 'Louva-deus', rarity: RARITY.NORMAL, cost: 0, colors: ['#10b981', '#047857'], style: 'mantis' },
  { id: 'dolphin', name: 'Golfinho', rarity: RARITY.NORMAL, cost: 0, colors: ['#60a5fa', '#2563eb'], style: 'smooth' },
  { id: 'parrot', name: 'Papagaio', rarity: RARITY.NORMAL, cost: 0, colors: ['#ef4444', '#3b82f6', '#f59e0b'], style: 'multi' },
  { id: 'puffer', name: 'Baiacu', rarity: RARITY.NORMAL, cost: 0, colors: ['#d97706', '#92400e'], style: 'spiky' },
  { id: 'vampire', name: 'Vampiro', rarity: RARITY.NORMAL, cost: 0, colors: ['#991b1b', '#000000'], style: 'cape' },
  { id: 'sponge', name: 'Esponja Marinha', rarity: RARITY.NORMAL, cost: 0, colors: ['#bef264', '#4d7c0f'], style: 'organic_sponge' },
  { id: 'dragon', name: 'Dragão', rarity: RARITY.NORMAL, cost: 0, colors: ['#ef4444', '#b91c1c'], style: 'scales' },
  { id: 'chain', name: 'Corrente', rarity: RARITY.RARE, cost: 50, colors: ['#9ca3af', '#4b5563'], style: 'chain', spacing: 0.6 },
  { id: 'skeleton', name: 'Esqueleto', rarity: RARITY.RARE, cost: 75, colors: ['#f3f4f6', '#9ca3af'], style: 'bone' },
  { id: 'mermaid', name: 'Sereia', rarity: RARITY.RARE, cost: 100, colors: ['#2dd4bf', '#0f766e'], style: 'scales' },
  { id: 'firefly', name: 'Vagalume', rarity: RARITY.RARE, cost: 100, colors: ['#84cc16', '#3f6212'], style: 'glow_butt' },
  { id: 'shark', name: 'Tubarão', rarity: RARITY.PREMIUM, cost: 250, colors: ['#6b7280', '#374151'], style: 'fins' },
  { id: 'hammer', name: 'Martelo', rarity: RARITY.PREMIUM, cost: 300, colors: ['#4b5563', '#1f2937'], style: 'hammer' },
  { id: 'scorpion', name: 'Escorpião', rarity: RARITY.PREMIUM, cost: 350, colors: ['#b91c1c', '#7f1d1d'], style: 'stinger' },
  { id: 'jellyfish', name: 'Medusa', rarity: RARITY.PREMIUM, cost: 400, colors: ['#c084fc', '#7e22ce'], style: 'translucent' },
  { id: 'neondragon', name: 'Neon Dragon', rarity: RARITY.PREMIUM, cost: 500, colors: ['#06b6d4', '#0891b2'], style: 'neon' },
  { id: 'brasil', name: 'Brasil', rarity: RARITY.PREMIUM, cost: 500, colors: ['#22c55e', '#eab308', '#3b82f6'], style: 'multi' },
  { id: 'lich', name: 'Lich Neon', rarity: RARITY.PREMIUM, cost: 800, colors: ['#10b981', '#000000'], style: 'bone_neon' },
];

const HATS = [
  { id: 'none', name: 'Nenhum', rarity: RARITY.NORMAL, cost: 0 },
  { id: 'cap', name: 'Boné', rarity: RARITY.NORMAL, cost: 40 },
  { id: 'hair_blonde', name: 'Cabelo Loiro', rarity: RARITY.RARE, cost: 80 },
  { id: 'mohawk', name: 'Moicano', rarity: RARITY.RARE, cost: 100 },
  { id: 'tophat', name: 'Cartola', rarity: RARITY.PREMIUM, cost: 200 },
  { id: 'pirate', name: 'Pirata', rarity: RARITY.PREMIUM, cost: 300 },
  { id: 'crown_gold', name: 'Coroa Imperial', rarity: RARITY.PREMIUM, cost: 500 },
];

const MUSTACHES = [
  { id: 'none', name: 'Nenhum', rarity: RARITY.NORMAL, cost: 0 },
  { id: 'mustache_thin', name: 'Fino', rarity: RARITY.NORMAL, cost: 30 },
  { id: 'mustache_thick', name: 'Grosso', rarity: RARITY.RARE, cost: 60 },
  { id: 'beard', name: 'Cavanhaque', rarity: RARITY.RARE, cost: 80 },
  { id: 'monocle', name: 'Monóculo', rarity: RARITY.PREMIUM, cost: 150 },
  { id: 'sunglasses', name: 'Óculos Escuros', rarity: RARITY.PREMIUM, cost: 250 },
];

const BOT_NAMES = ["Kraken", "Moby", "Nemo", "Dory", "Bruce", "Ariel", "Poseidon", "Cthulhu", "Leviathan", "Orca", "Pingu", "Aquaman", "Gyarados", "Kyogre", "Wailord", "Lapras", "Tentacruel", "Blastoise", "Squirtle", "Starmie", "Kingdra", "Milotic", "Sharkira", "Fishy", "Bubbles", "Salty", "Captain", "Barnacle", "Coral", "Pearl", "Marina", "Ocean", "River", "Brook", "Lake"];

// ============================================================================
// 🧮 UTILITÁRIOS
// ============================================================================
const lerp = (a, b, t) => a + (b - a) * t;
const distSq = (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2;
const dist = (x1, y1, x2, y2) => Math.sqrt(distSq(x1, y1, x2, y2));
const lerpAngle = (a, b, t) => {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
};
const randomRange = (min, max) => Math.random() * (max - min) + min;

const getUniqueBotName = (activeNames) => {
  const available = BOT_NAMES.filter(n => !activeNames.includes(n));
  return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : `Bot${Math.floor(Math.random() * 1000)}`;
};

// ============================================================================
// 🔊 AUDIO ENGINE
// ============================================================================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.enabledBGM = true;
    this.enabledSFX = true;
    this.bgmTimeout = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.ctx.destination);
      this.bgmGain.gain.value = 0.3;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  playTone(freqStart, freqEnd, type, duration, vol = 1, descend = false) {
    if (!this.ctx || !this.enabledSFX) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(freqStart, now);
    if (descend) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
    else osc.frequency.linearRampToValueAtTime(freqEnd, now + duration * 0.5);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }
  sfxPop() { this.playTone(300, 700, 'sine', 0.15, 0.5); }
  sfxCoin() { this.playTone(880, 1320, 'sine', 0.35, 0.6); }
  sfxDeath() { this.playTone(160, 40, 'sawtooth', 0.9, 0.8, true); }
  sfxPowerup() {
    if (!this.ctx || !this.enabledSFX) return;
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      osc.connect(gain); gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.3);
    });
  }
  sfxShieldBreak() { this.playTone(200, 60, 'square', 0.4, 0.7, true); }
  sfxBoost() { if (Math.random() < 0.12) this.playTone(100, 80, 'sine', 0.1, 0.15); }

  scheduleDrop() {
    if (!this.ctx || !this.enabledBGM) return;
    const freq = Math.random() > 0.5 ? 41 : 65;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this.bgmGain);
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + randomRange(4, 8));
    osc.start(now); osc.stop(now + 8);
    this.bgmTimeout = setTimeout(() => this.scheduleDrop(), randomRange(5000, 14000));
  }
  setBGM(enabled) {
    this.enabledBGM = enabled;
    if (enabled) { if (this.ctx && this.bgmGain) this.bgmGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 1); this.scheduleDrop(); }
    else { if (this.ctx && this.bgmGain) this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5); clearTimeout(this.bgmTimeout); }
  }
  setSFX(enabled) { this.enabledSFX = enabled; }
}
const audio = new AudioEngine();

// ============================================================================
// 🗺️ SPATIAL HASH
// ============================================================================
class SpatialHash {
  constructor(cellSize) { this.cellSize = cellSize; this.grid = new Map(); }
  _hash(x, y) { return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`; }
  insert(client) {
    const key = this._hash(client.x, client.y);
    if (!this.grid.has(key)) this.grid.set(key, new Set());
    this.grid.get(key).add(client);
    client._shKey = key;
  }
  update(client) {
    const newKey = this._hash(client.x, client.y);
    if (client._shKey !== newKey) {
      if (client._shKey && this.grid.has(client._shKey)) this.grid.get(client._shKey).delete(client);
      this.insert(client);
    }
  }
  remove(client) { if (client._shKey && this.grid.has(client._shKey)) this.grid.get(client._shKey).delete(client); }
  getNearby(x, y, radius) {
    const results = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    for (let i = minX; i <= maxX; i++) {
      for (let j = minY; j <= maxY; j++) {
        const key = `${i},${j}`;
        if (this.grid.has(key)) {
          for (let client of this.grid.get(key)) {
            if (distSq(x, y, client.x, client.y) <= radius * radius) results.push(client);
          }
        }
      }
    }
    return results;
  }
  clear() { this.grid.clear(); }
}

// ============================================================================
// 💥 CLASSES DE ENTIDADES
// ============================================================================
class Particle {
  constructor(x, y, color, type = 'solid', isPlayer = false) {
    this.x = x; this.y = y;
    this.color = color;
    this.type = type;
    const angle = Math.random() * Math.PI * 2;
    const speed = randomRange(50, 200) * (isPlayer ? 1.5 : 1);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = randomRange(0.5, 1.5);
    this.size = randomRange(2, 6);
    if (this.type === 'shockwave') { this.decay = 2.0; this.vx = 0; this.vy = 0; this.size = 10; }
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.95; this.vy *= 0.95;
    if (this.type === 'bubble') { this.y -= 40 * dt; this.x += Math.sin(this.life * 10) * 15 * dt; }
    this.life -= this.decay * dt;
    return this.life > 0;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath();
    if (this.type === 'solid') {
      ctx.fillStyle = this.color; ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'bubble') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 1.5;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.stroke();
    } else if (this.type === 'shockwave') {
      ctx.strokeStyle = this.color; ctx.lineWidth = 8 * this.life;
      ctx.arc(this.x, this.y, this.size + (1 - this.life) * 200, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }
}

class Orb {
  constructor(x, y, value = 10, isPowerup = false, puType = -1, color = null) {
    this.x = x; this.y = y;
    this.value = value;
    this.isPowerup = isPowerup; this.puType = puType;
    this.baseSize = isPowerup ? 20 : Math.max(5, Math.min(15, value / 2));
    this.size = this.baseSize;
    this.baseY = y; this.time = Math.random() * 100;
    this.color = color || (isPowerup ? POWERUP_TYPES[puType].color : `hsl(${Math.random() * 360}, 80%, 60%)`);
    this.target = null; this.id = Math.random().toString(36).substr(2, 9);
    this.attractSpeed = 10;
  }

  update(dt, worldRadius) {
    if (this.target) {
      const dx = this.target.x - this.x; const dy = this.target.y - this.y;
      const dSq = dx * dx + dy * dy;
      this.attractSpeed += dt * 45;
      const moveX = (dx / Math.sqrt(dSq)) * this.attractSpeed * 1.5;
      const moveY = (dy / Math.sqrt(dSq)) * this.attractSpeed * 1.5;
      this.x += moveX;
      this.y += moveY;
      if (dSq < 10000) { this.size = lerp(this.size, 0, dt * 10); }
      if (dSq < (this.target.size * 1.2) ** 2 || this.size < 1) return false;
    } else {
      this.time += dt * 3; this.y = this.baseY + Math.sin(this.time) * 5;
    }
    return distSq(this.x, this.y, WORLD_CENTER, WORLD_CENTER) <= worldRadius * worldRadius;
  }

  draw(ctx, quality) {
    if (this.isPowerup) {
      ctx.save(); ctx.translate(this.x, this.y);
      const pulse = Math.sin(this.time * 4) * 8;
      ctx.beginPath(); ctx.arc(0, 0, this.size + 15 + pulse, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(0, 0, this.size, 0, 0, this.size + 15 + pulse);
      grad.addColorStop(0, this.color); grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.fill();
      ctx.save(); ctx.rotate(this.time); ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(0, 0, this.size + 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fillStyle = '#111827'; ctx.fill();
      ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = this.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 16px sans-serif';
      ctx.fillText(['🛡️', '⚡', '🧲', '🪙'][this.puType], 0, 1); ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color; ctx.fill();
      if (quality.shadows) { ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fill(); ctx.shadowBlur = 0; }
    }
  }
}

class SeaCritter {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = type === 'octopus' ? 60 : 30;
    this.time = Math.random() * 100;
    this.color = type === 'octopus' ? '#a855f7' : '#ec4899';
    this.size = type === 'octopus' ? 25 : 35;
    this.fleeing = false;
  }
  update(dt, snakes, worldRadius, particlesArray) {
    this.time += dt;
    let nearest = null; let minDistSq = Infinity;
    for (const s of snakes) {
      if (s.isDead) continue;
      const d = distSq(this.x, this.y, s.x, s.y);
      if (d < minDistSq) { minDistSq = d; nearest = s; }
    }
    if (nearest && minDistSq < 600 * 600) {
      this.fleeing = true;
      const targetAngle = Math.atan2(this.y - nearest.y, this.x - nearest.x);
      this.angle = lerpAngle(this.angle, targetAngle, dt * 6);
      this.speed = lerp(this.speed, this.type === 'octopus' ? 250 : 120, dt * 4);
      if (this.type === 'octopus' && Math.random() < 0.1 && particlesArray) particlesArray.push(new Particle(this.x, this.y, '#c084fc', 'solid'));
    } else {
      this.fleeing = false; this.speed = lerp(this.speed, this.type === 'octopus' ? 60 : 30, dt * 2);
      this.angle += (Math.random() - 0.5) * dt;
    }
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    const dSq = distSq(this.x, this.y, WORLD_CENTER, WORLD_CENTER);
    if (dSq > (worldRadius - 50) ** 2) {
      const angleToCenter = Math.atan2(WORLD_CENTER - this.y, WORLD_CENTER - this.x);
      this.angle = lerpAngle(this.angle, angleToCenter, dt * 5);
      if (dSq > worldRadius ** 2) { this.x += Math.cos(angleToCenter) * this.speed * dt; this.y += Math.sin(angleToCenter) * this.speed * dt; }
    }
    return dSq <= (worldRadius + 200) ** 2;
  }
  draw(ctx, quality) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle - Math.PI / 2);
    if (quality.shadows) { ctx.shadowBlur = this.fleeing ? 30 : 15; ctx.shadowColor = this.color; }
    if (this.type === 'jellyfish') {
      const pulse = 1 + Math.sin(this.time * 4) * 0.15; ctx.scale(pulse, pulse);
      ctx.fillStyle = this.color; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(0, 0, this.size, Math.PI, 0); ctx.quadraticCurveTo(0, this.size * 0.4, -this.size, 0); ctx.fill();
      ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = -15; i <= 15; i += 10) { ctx.moveTo(i, 0); const wave = Math.sin(this.time * 6 + i) * 8; ctx.quadraticCurveTo(i + wave, this.size, i - wave, this.size * 1.8); } ctx.stroke();
    } else if (this.type === 'octopus') {
      ctx.fillStyle = this.color; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(0, -this.size * 0.2, this.size, this.size * 1.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(-8, -this.size * 0.8, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(8, -this.size * 0.8, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(-8, -this.size * 0.9, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(8, -this.size * 0.9, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = this.color; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const xBase = -this.size + (i * (this.size * 2) / 7); const wave = Math.sin(this.time * (this.fleeing ? 12 : 5) + i) * 8;
        ctx.beginPath(); ctx.moveTo(xBase, this.size * 0.5); ctx.quadraticCurveTo(xBase + wave, this.size * 1.5, xBase - wave, this.size * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

class Starfish {
  constructor(x, y) {
    this.x = x; this.y = y; this.baseX = x; this.baseY = y; this.size = 15;
    this.angle = Math.random() * Math.PI * 2; this.time = Math.random() * 100;
    this.value = Math.floor(randomRange(40, 80)); this.color = `hsl(${randomRange(0, 60)}, 100%, 60%)`;
    this.target = null; this.id = Math.random().toString();
  }
  update(dt, worldRadius) {
    if (this.target) {
      const dx = this.target.x - this.x; const dy = this.target.y - this.y;
      const dSq = dx * dx + dy * dy;
      this.x += (dx / Math.sqrt(dSq)) * 12;
      this.y += (dy / Math.sqrt(dSq)) * 12;
      if (dSq < (this.target.size * 1.2) ** 2) return false;
    } else {
      this.time += dt; this.angle += dt * 0.5; this.x = this.baseX + Math.cos(this.time) * 30; this.y = this.baseY + Math.sin(this.time * 0.8) * 30;
    }
    return distSq(this.x, this.y, WORLD_CENTER, WORLD_CENTER) <= worldRadius * worldRadius;
  }
  draw(ctx, quality) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    if (quality.shadows) { ctx.shadowBlur = 15; ctx.shadowColor = this.color; }
    ctx.fillStyle = this.color; ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(Math.cos((18 + i * 72) / 180 * Math.PI) * this.size, -Math.sin((18 + i * 72) / 180 * Math.PI) * this.size);
      ctx.lineTo(Math.cos((54 + i * 72) / 180 * Math.PI) * (this.size / 2), -Math.sin((54 + i * 72) / 180 * Math.PI) * (this.size / 2));
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
}

class Snake {
  constructor(x, y, name, isPlayer, skinId, isGiant = false, hatId = 'none', mustacheId = 'none') {
    this.id = Math.random().toString(); this.name = name; this.isPlayer = isPlayer;
    this.skin = SKINS.find(s => s.id === skinId) || SKINS[0];
    this.hat = hatId; this.mustache = mustacheId;
    this.x = x; this.y = y; this.angle = Math.random() * Math.PI * 2;
    this.score = isGiant ? Math.floor(randomRange(4000, 12000)) : (isPlayer ? 100 : 50);
    this.baseSpeed = 220; this.speed = this.baseSpeed;
    this.isBoosting = false; this.spawnTime = performance.now();
    this.isDead = false; this.kills = 0;
    this.activePowerups = {}; this.history = [{ x, y }]; this.segments = [];
    if (!isPlayer) { this.aiState = 'forage'; this.aiTarget = null; this.aiTimer = 0; }
    this.rank = 0;
  }

  get isInvulnerable() { return performance.now() - this.spawnTime < 3000; }
  get size() { return 15 + Math.sqrt(this.score) * 0.15; }
  get targetLength() { return Math.max(10, Math.floor(this.score / 15)); }

  update(dt, inputTarget, spatialHash, worldRadius, quality) {
    if (this.isDead) return [];
    let spawnedEntities = [];
    const now = performance.now();

    let speedMult = 1;
    if (this.activePowerups[1] && this.activePowerups[1] > now) speedMult = 3.5;

    if (this.isBoosting && this.score > 200 && !this.activePowerups[1]) {
      this.speed = this.baseSpeed * 2.5;
      this.score -= dt * 150;
      if (Math.random() < 0.35) {
        if (this.segments.length > 2) {
          const tail = this.segments[this.segments.length - 1];
          const scaleColor = this.skin.colors[Math.floor(Math.random() * this.skin.colors.length)];
          spawnedEntities.push({ type: 'orb', ent: new Orb(tail.x, tail.y, 8, false, -1, scaleColor) });
        }
      }
      if (quality.bubbles && Math.random() < 0.6) {
        const tail = this.segments.length > 0 ? this.segments[this.segments.length - 1] : this;
        spawnedEntities.push({ type: 'particle', ent: new Particle(tail.x, tail.y, '#ffffff', 'bubble', this.isPlayer) });
      }
      if (this.isPlayer) audio.sfxBoost();
    } else {
      this.speed = this.baseSpeed * speedMult;
    }

    if (inputTarget) {
      const targetAngle = Math.atan2(inputTarget.y - this.y, inputTarget.x - this.x);
      this.angle = lerpAngle(this.angle, targetAngle, dt * (this.isBoosting ? 2.5 : 3.8));
    }

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    if (distSq(this.x, this.y, WORLD_CENTER, WORLD_CENTER) > (worldRadius - this.size) ** 2) this.isDead = true;
    this.history.unshift({ x: this.x, y: this.y });
    const maxHistLen = this.targetLength * 15;
    if (this.history.length > maxHistLen) this.history.length = maxHistLen;
    this.segments = [];
    let distAcc = 0; const spacing = this.size * (this.skin.spacing || 0.35);
    this.segments.push({ x: this.x, y: this.y, angle: this.angle });
    let histIdx = 1; let lastPt = this.history[0];
    for (let i = 1; i < Math.min(this.targetLength, quality.maxSegments); i++) {
      let segmentAdded = false;
      while (histIdx < this.history.length) {
        const nextPt = this.history[histIdx]; const d = dist(lastPt.x, lastPt.y, nextPt.x, nextPt.y);
        if (distAcc + d >= spacing) {
          const t = (spacing - distAcc) / d;
          const nx = lerp(lastPt.x, nextPt.x, t); const ny = lerp(lastPt.y, nextPt.y, t);
          const nang = Math.atan2(lastPt.y - nextPt.y, lastPt.x - nextPt.x);
          this.segments.push({ x: nx, y: ny, angle: nang });
          lastPt = { x: nx, y: ny }; distAcc = 0; segmentAdded = true; break;
        } else { distAcc += d; lastPt = nextPt; histIdx++; }
      }
      if (!segmentAdded) break;
    }
    spatialHash.update(this);
    return spawnedEntities;
  }

  updateAI(dt, spatialHash, worldRadius, globalEvolution) {
    if (this.isPlayer || this.isDead) return;
    this.aiTimer -= dt; const headX = this.x; const headY = this.y;
    let targetX = headX + Math.cos(this.angle) * 100; let targetY = headY + Math.sin(this.angle) * 100;
    this.isBoosting = false;

    // IA Competitiva: Repulsão de Corpos / Desvio de Obstáculos
    let obstacleRepulsionX = 0;
    let obstacleRepulsionY = 0;

    const dCenterSq = distSq(headX, headY, WORLD_CENTER, WORLD_CENTER);
    if (dCenterSq > (worldRadius - 800) ** 2) { targetX = WORLD_CENTER; targetY = WORLD_CENTER; }
    else {
      const visionRadius = 1000 + globalEvolution * 30; const nearby = spatialHash.getNearby(headX, headY, visionRadius);
      let nearestThreat = null; let threatDist = Infinity; let nearestFood = null; let foodDist = Infinity;
      for (const ent of nearby) {
        if (ent === this) continue; const d = distSq(headX, headY, ent.x, ent.y);
        if (ent instanceof Snake && !ent.isInvulnerable) {

          // Desvio Inteligente: se sentir o corpo de uma cobra perto, afasta-se
          if (d < visionRadius * visionRadius) {
            for (let i = 0; i < ent.segments.length; i += 2) {
              const seg = ent.segments[i];
              const dSeg = distSq(headX, headY, seg.x, seg.y);
              if (dSeg < (this.size * 3.5) ** 2) {
                const distVal = Math.sqrt(dSeg);
                obstacleRepulsionX += (headX - seg.x) / distVal;
                obstacleRepulsionY += (headY - seg.y) / distVal;
              }
            }
          }

          if (ent.score > this.score * 1.1) {
            for (let i = 0; i < ent.segments.length; i += 3) {
              const seg = ent.segments[i]; const dSeg = distSq(headX, headY, seg.x, seg.y);
              if (dSeg < threatDist) { threatDist = dSeg; nearestThreat = seg; }
            }
          } else if (ent.score < this.score * 0.9 && this.aiState !== 'flee') {
            if (d < visionRadius * visionRadius && Math.random() < 0.15) { this.aiState = 'hunt'; this.aiTarget = ent; this.aiTimer = 4; }
          }
        } else if (ent instanceof Orb || ent instanceof Starfish) { if (d < foodDist) { foodDist = d; nearestFood = ent; } }
      }

      // Aplicar Repulsão Ativa se estiver perto de corpos
      if (obstacleRepulsionX !== 0 || obstacleRepulsionY !== 0) {
        targetX += obstacleRepulsionX * 300;
        targetY += obstacleRepulsionY * 300;
      } else if (nearestThreat && threatDist < 500 * 500) {
        this.aiState = 'flee'; const angleAway = Math.atan2(headY - nearestThreat.y, headX - nearestThreat.x);
        targetX = headX + Math.cos(angleAway) * 300; targetY = headY + Math.sin(angleAway) * 300;
        if (threatDist < 350 * 350 && this.score > 250) this.isBoosting = true;
      } else if (this.aiState === 'hunt' && this.aiTarget && !this.aiTarget.isDead) {
        // IA Preditiva: tenta cortar o caminho em vez de seguir o rabo
        const distToTarget = dist(headX, headY, this.aiTarget.x, this.aiTarget.y);
        const lookAhead = Math.min(2.0, distToTarget / this.speed);
        targetX = this.aiTarget.x + Math.cos(this.aiTarget.angle) * this.aiTarget.speed * lookAhead;
        targetY = this.aiTarget.y + Math.sin(this.aiTarget.angle) * this.aiTarget.speed * lookAhead;
        if (distToTarget > 150 && distToTarget < 700 && this.score > 400) this.isBoosting = true;
      } else {
        this.aiState = 'forage';
        if (nearestFood) { targetX = nearestFood.x; targetY = nearestFood.y; }
        else { if (this.aiTimer <= 0) { this.aiTimer = randomRange(1, 3); const rAngle = this.angle + randomRange(-Math.PI / 2, Math.PI / 2); targetX = headX + Math.cos(rAngle) * 300; targetY = headY + Math.sin(rAngle) * 300; } }
      }
    }
    return { x: targetX, y: targetY };
  }

  draw(ctx, quality) {
    const isBlinking = this.isInvulnerable && Math.floor(performance.now() / 150) % 2 === 0;
    if (isBlinking) ctx.globalAlpha = 0.4;
    const sz = this.size; const colors = this.skin.colors; const now = performance.now();

    const apply3DVolume = (radius) => {
      if (!quality.shadows) return;
      const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
      grad.addColorStop(0, 'rgba(255,255,255,0.35)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    };

    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i]; const progress = i / this.segments.length; const segSz = sz * (1 - progress * 0.4);
      ctx.save(); ctx.translate(seg.x, seg.y); ctx.rotate(seg.angle);
      if (this.skin.style === 'chain') {
        ctx.fillStyle = i % 2 === 0 ? colors[0] : colors[1];
        if (i % 2 === 0) ctx.fillRect(-segSz / 2, -segSz, segSz, segSz * 2);
        else { ctx.beginPath(); ctx.arc(0, 0, segSz * 0.8, 0, Math.PI * 2); ctx.fill(); apply3DVolume(segSz * 0.8); }
      } else if (this.skin.style === 'bone' || this.skin.style === 'bone_neon') {
        ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.ellipse(0, 0, segSz * 0.4, segSz * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        if (i % 3 === 0) {
          ctx.strokeStyle = colors[0]; ctx.lineWidth = segSz * 0.25; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-segSz * 0.5, -segSz * 1.5, -segSz * 0.2, -segSz * 1.8); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-segSz * 0.5, segSz * 1.5, -segSz * 0.2, segSz * 1.8); ctx.stroke();
        }
        if (this.skin.style === 'bone_neon') { ctx.shadowBlur = 15; ctx.shadowColor = colors[1]; ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; }
      } else if (this.skin.style === 'organic_sponge') {
        ctx.fillStyle = colors[0]; ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { let r = segSz * (0.85 + Math.sin(i * 2.1 + a * 3.4) * 0.15); if (a === 0) ctx.moveTo(r, 0); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); apply3DVolume(segSz); ctx.fillStyle = 'rgba(10, 30, 10, 0.4)';
        const p1R = segSz * 0.2; const p1X = segSz * 0.3 * Math.cos(i); const p1Y = segSz * 0.3 * Math.sin(i);
        ctx.beginPath(); ctx.arc(p1X, p1Y, p1R, 0, Math.PI * 2); ctx.fill();
        if (i % 2 === 0) { const p2R = segSz * 0.15; const p2X = -segSz * 0.4 * Math.cos(i); const p2Y = segSz * 0.2 * Math.sin(i); ctx.beginPath(); ctx.arc(p2X, p2Y, p2R, 0, Math.PI * 2); ctx.fill(); }
      } else {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, segSz); grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1] || colors[0]);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, segSz, 0, Math.PI * 2); ctx.fill(); apply3DVolume(segSz);
        if (this.skin.style === 'spiky' && i % 2 === 0) { ctx.fillStyle = colors[1]; ctx.beginPath(); ctx.moveTo(-segSz * 0.5, -segSz * 0.8); ctx.quadraticCurveTo(0, -segSz * 2.5, segSz * 0.5, -segSz * 0.8); ctx.fill(); ctx.beginPath(); ctx.moveTo(-segSz * 0.5, segSz * 0.8); ctx.quadraticCurveTo(0, segSz * 2.5, segSz * 0.5, segSz * 0.8); ctx.fill(); }
        if (this.skin.style === 'tentacles') { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-segSz * 0.8, -segSz * 0.6, segSz * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-segSz * 0.8, segSz * 0.6, segSz * 0.15, 0, Math.PI * 2); ctx.fill(); }
        if (this.skin.style === 'scales') { ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = segSz * 0.1; ctx.beginPath(); ctx.arc(0, 0, segSz * 0.8, -Math.PI / 4, Math.PI / 4); ctx.stroke(); }
        if ((this.skin.style === 'fins' || this.skin.style === 'smooth') && i === Math.floor(this.segments.length / 3)) { ctx.fillStyle = colors[1] || colors[0]; ctx.beginPath(); ctx.moveTo(-segSz, -segSz * 0.5); ctx.quadraticCurveTo(-segSz * 1.5, -segSz * 3, segSz * 0.5, -segSz); ctx.fill(); ctx.beginPath(); ctx.moveTo(-segSz, segSz * 0.5); ctx.quadraticCurveTo(-segSz * 1.5, segSz * 3, segSz * 0.5, segSz); ctx.fill(); }
        if (this.skin.style === 'glow_butt' && i > this.segments.length - 6) { ctx.shadowBlur = 25; ctx.shadowColor = colors[0]; ctx.fill(); ctx.shadowBlur = 0; }
      }
      ctx.restore();
    }

    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    if (this.skin.style === 'hammer') {
      ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.5); ctx.quadraticCurveTo(0, -sz * 2.5, sz * 0.5, -sz * 2.2); ctx.lineTo(sz, -sz * 2); ctx.quadraticCurveTo(sz * 1.5, 0, sz, sz * 2); ctx.lineTo(sz * 0.5, sz * 2.2); ctx.quadraticCurveTo(0, sz * 2.5, -sz, sz * 0.5); ctx.closePath(); ctx.fill(); apply3DVolume(sz * 1.3);
      const drawHammerEye = (ex, ey) => { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(ex, ey, sz * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, sz * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + sz * 0.05, ey - sz * 0.05, sz * 0.05, 0, Math.PI * 2); ctx.fill(); };
      drawHammerEye(sz * 0.8, -sz * 2.1); drawHammerEye(sz * 0.8, sz * 2.1);
    } else if (this.skin.style === 'organic_sponge') {
      ctx.fillStyle = colors[0]; ctx.beginPath(); for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { let r = sz * (1.1 + Math.sin(a * 4) * 0.1); if (a === 0) ctx.moveTo(r, 0); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); apply3DVolume(sz * 1.1);
    } else {
      ctx.fillStyle = colors[0]; ctx.beginPath(); if (this.skin.style === 'tentacles') ctx.ellipse(0, 0, sz * 1.2, sz * 0.9, 0, 0, Math.PI * 2); else ctx.arc(0, 0, sz * 1.1, 0, Math.PI * 2); ctx.fill(); apply3DVolume(sz * 1.1);
    }

    if (this.skin.style !== 'hammer') {
      const isPredator = ['shark', 'dragon', 'vampire', 'scorpion', 'neondragon'].includes(this.skin.id);
      const isDeepSea = this.skin.style === 'angler' || this.skin.style === 'translucent';
      const drawEye = (ex, ey) => {
        ctx.save(); ctx.translate(ex, ey);
        if (isDeepSea) { ctx.fillStyle = '#e0f2fe'; ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.15, 0, Math.PI * 2); ctx.fill(); }
        else if (isPredator) { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.08, sz * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sz * 0.05, 0, sz * 0.18, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sz * 0.1, -sz * 0.1, sz * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      };
      if (this.skin.id === 'cyclops') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sz * 0.4, 0, sz * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sz * 0.5, 0, sz * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sz * 0.55, -sz * 0.05, sz * 0.08, 0, Math.PI * 2); ctx.fill(); }
      else { drawEye(sz * 0.4, -sz * 0.5); drawEye(sz * 0.4, sz * 0.5); }
    }
    if (this.skin.style === 'angler') {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -sz); ctx.quadraticCurveTo(sz * 2, -sz * 3, sz * 2.8, -sz * 0.5); ctx.stroke();
      ctx.fillStyle = '#fef08a'; ctx.shadowBlur = 25; ctx.shadowColor = '#fef08a'; ctx.beginPath(); ctx.arc(sz * 2.8, -sz * 0.5, sz * 0.4 + Math.sin(now / 200) * 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    if (this.hat !== 'none') {
      ctx.save();
      if (this.hat === 'mohawk') { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = sz * 0.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-sz * 0.8, 0); ctx.lineTo(sz * 0.6, 0); ctx.stroke(); }
      else if (this.hat === 'tophat') { ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.7, sz * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = sz * 0.15; ctx.beginPath(); ctx.arc(-sz * 0.1, 0, sz * 0.5, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.arc(-sz * 0.1, 0, sz * 0.45, 0, Math.PI * 2); ctx.fill(); }
      else if (this.hat === 'crown_gold') { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = sz * 0.25; ctx.setLineDash([sz * 0.4, sz * 0.2]); ctx.beginPath(); ctx.arc(0, 0, sz * 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      else if (this.hat === 'pirate') { ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(0, -sz * 1.2); ctx.quadraticCurveTo(-sz * 0.8, 0, 0, sz * 1.2); ctx.quadraticCurveTo(sz * 0.8, 0, 0, -sz * 1.2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.15, 0, Math.PI * 2); ctx.fill(); }
      else if (this.hat === 'hair_blonde') { ctx.fillStyle = '#fde047'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(-sz * 0.3, 0, sz * 0.8, Math.PI / 2, -Math.PI / 2); ctx.fill(); ctx.beginPath(); ctx.arc(-sz * 0.5, sz * 0.5, sz * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-sz * 0.5, -sz * 0.5, sz * 0.5, 0, Math.PI * 2); ctx.fill(); }
      else if (this.hat === 'cap') { ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(-sz * 0.2, 0, sz * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(sz * 0.3, 0, sz * 0.4, -Math.PI / 2, Math.PI / 2); ctx.fill(); }
      ctx.restore();
    }
    if (this.mustache !== 'none') {
      ctx.save();
      if (this.mustache === 'mustache_thin') { ctx.strokeStyle = '#000'; ctx.lineWidth = sz * 0.12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sz * 0.85, -sz * 0.5); ctx.quadraticCurveTo(sz * 1.15, 0, sz * 0.85, sz * 0.5); ctx.stroke(); }
      else if (this.mustache === 'mustache_thick') { ctx.strokeStyle = '#451a03'; ctx.lineWidth = sz * 0.25; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sz * 0.75, -sz * 0.6); ctx.quadraticCurveTo(sz * 1.1, 0, sz * 0.75, sz * 0.6); ctx.stroke(); }
      else if (this.mustache === 'beard') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(sz * 0.9, -sz * 0.25); ctx.lineTo(sz * 1.25, 0); ctx.lineTo(sz * 0.9, sz * 0.25); ctx.fill(); }
      else if (this.mustache === 'sunglasses') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(sz * 0.2, -sz * 0.7, sz * 0.4, sz * 0.5, sz * 0.1); ctx.fill(); ctx.beginPath(); ctx.roundRect(sz * 0.2, sz * 0.2, sz * 0.4, sz * 0.5, sz * 0.1); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = sz * 0.1; ctx.beginPath(); ctx.moveTo(sz * 0.4, -sz * 0.2); ctx.lineTo(sz * 0.4, sz * 0.2); ctx.stroke(); }
      else if (this.mustache === 'monocle') { ctx.fillStyle = 'rgba(186, 230, 253, 0.4)'; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = sz * 0.1; ctx.beginPath(); ctx.arc(sz * 0.4, sz * 0.5, sz * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sz * 0.4, sz * 0.85); ctx.lineTo(0, sz * 1.2); ctx.stroke(); }
      ctx.restore();
    }
    if (this.activePowerups[0] && this.activePowerups[0] > performance.now()) { ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 4; ctx.shadowBlur = 10; ctx.shadowColor = '#06b6d4'; ctx.beginPath(); ctx.arc(0, 0, sz * 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
    ctx.restore();

    if (quality.shadows || this.isPlayer) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `bold ${Math.max(12, sz * 0.6)}px sans-serif`; ctx.textAlign = 'center'; const nameY = this.y - sz * 1.6; ctx.fillText(this.name, this.x, nameY);
      if (this.rank >= 1 && this.rank <= 3) {
        ctx.save(); ctx.translate(this.x, nameY - sz * 0.8); const crownScale = Math.max(0.6, Math.min(1.4, sz / 20)); ctx.scale(crownScale, crownScale);
        if (this.rank === 1) { ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-15, 10); ctx.lineTo(-22, -12); ctx.lineTo(-7, 0); ctx.lineTo(0, -18); ctx.lineTo(7, 0); ctx.lineTo(22, -12); ctx.lineTo(15, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, -2, 3.5, 0, Math.PI * 2); ctx.fill(); }
        else if (this.rank === 2) { ctx.fillStyle = '#e5e7eb'; ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(-16, -10); ctx.lineTo(-5, 0); ctx.lineTo(0, -14); ctx.lineTo(5, 0); ctx.lineTo(16, -10); ctx.lineTo(12, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        else if (this.rank === 3) { ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 7; i++) { const ang = (i / 7) * Math.PI * 2; const bx = Math.cos(ang) * 14; const by = Math.sin(ang) * 6; ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ang) * 7, by - Math.random() * 6 - 4); } ctx.stroke(); }
        ctx.restore();
      }
    }
    if (isBlinking) ctx.globalAlpha = 1.0;
  }
}

// ============================================================================
// 🎨 SVG HELPERS
// ============================================================================
const HatSVG = ({ hatId }) => {
  switch (hatId) {
    case 'mohawk': return <path d="M 50 15 L 50 85" stroke="#ef4444" strokeWidth="14" strokeLinecap="round" />;
    case 'tophat': return <g><ellipse cx="50" cy="50" rx="35" ry="30" fill="#111827" /><circle cx="50" cy="45" r="22" fill="#374151" /><circle cx="50" cy="45" r="24" fill="none" stroke="#ef4444" strokeWidth="4" /></g>;
    case 'crown_gold': return <circle cx="50" cy="50" r="24" fill="none" stroke="#fbbf24" strokeWidth="10" strokeDasharray="15 10" />;
    case 'pirate': return <g><path d="M 10 50 Q 50 10 90 50 Q 50 90 10 50" fill="#1f2937" /><circle cx="50" cy="50" r="6" fill="#fff" /></g>;
    case 'hair_blonde': return <path d="M 25 70 Q 50 100 75 70 Q 85 50 75 30 Q 50 0 25 30 Q 15 50 25 70" fill="#fde047" opacity="0.9" />;
    case 'cap': return <g><circle cx="50" cy="60" r="20" fill="#3b82f6" /><path d="M 30 60 Q 50 20 70 60" fill="#1d4ed8" /></g>;
    default: return null;
  }
};
const MustacheSVG = ({ mustacheId }) => {
  switch (mustacheId) {
    case 'mustache_thin': return <path d="M 22 22 Q 50 5 78 22" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" />;
    case 'mustache_thick': return <path d="M 25 25 Q 50 10 75 25" fill="none" stroke="#451a03" strokeWidth="9" strokeLinecap="round" />;
    case 'beard': return <path d="M 40 5 L 60 5 L 50 -10 Z" fill="#000" />;
    case 'sunglasses': return <g><rect x="20" y="32" width="22" height="16" rx="4" fill="#000" /><rect x="58" y="32" width="22" height="16" rx="4" fill="#000" /><path d="M 42 39 L 58 39" stroke="#000" strokeWidth="3" /></g>;
    case 'monocle': return <g><circle cx="68" cy="40" r="13" fill="rgba(186, 230, 253, 0.5)" stroke="#fbbf24" strokeWidth="3" /><path d="M 81 40 L 95 65" stroke="#fbbf24" strokeWidth="2" /></g>;
    default: return null;
  }
};

// ============================================================================
// 🎮 COMPONENTE PRINCIPAL
// ============================================================================
export default function App() {
  const [gameState, setGameState] = useState('lobby');
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [settings, setSettings] = useState({ bgm: true, sfx: true, quality: 'medium' });
  const [playerName, setPlayerName] = useState('Player');
  const [lobbyTab, setLobbyTab] = useState('skins');
  const [unlockedSkins, setUnlockedSkins] = useState(['cyclops']);
  const [unlockedHats, setUnlockedHats] = useState(['none']);
  const [unlockedMustaches, setUnlockedMustaches] = useState(['none']);
  const [selectedSkinId, setSelectedSkinId] = useState('cyclops');
  const [selectedHat, setSelectedHat] = useState('none');
  const [selectedMustache, setSelectedMustache] = useState('none');
  const [hud, setHud] = useState({ length: 0, rank: 0, totalPlayers: 0, sessionCoins: 0, top10: [] });
  const [powerupsHUD, setPowerupsHUD] = useState([]);
  const [killCount, setKillCount] = useState(0);
  const [comboState, setComboState] = useState({ count: 0, active: false });
  const [killFeed, setKillFeed] = useState([]);
  const [dangerZone, setDangerZone] = useState(false);
  const [gameOverStats, setGameOverStats] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [frenzyBanner, setFrenzyBanner] = useState(false);
  const [killStreakDisplay, setKillStreakDisplay] = useState({ count: 0, active: false });
  const [levelUpDisplay, setLevelUpDisplay] = useState({ level: 0, show: false });
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const carouselRef = useRef(null);
  const engine = useRef({
    snakes: [], orbs: [], starfish: [], particles: [], critters: [], floatTexts: [], plankton: [],
    player: null, camera: { x: WORLD_CENTER, y: WORLD_CENTER, zoom: 1 },
    worldRadius: BASE_WORLD_RADIUS, spatialHash: new SpatialHash(CELL_SIZE), lastTime: 0,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false },
    joystick: { active: false, x: 0, y: 0, dx: 0, dy: 0 },
    globalAI: { generation: 1, deaths: 0 },
    combo: { count: 0, lastTime: 0, active: false, lastCount: 0 },
    sessionCoins: 0, sessionKills: 0, sessionMaxScore: 0, startTime: 0,
    isPlaying: false, settings: { quality: 'medium' }, highScore: 0,
    isGameOverSequence: false, gameOverTime: 0,
    screenShake: 0, deathFlash: 0, playerLevel: 1,
    frenzyTimer: 90, frenzyActive: false, frenzyDuration: 0,
    killStreak: 0, killStreakTime: 0, killStreakActive: false,
    zoneShrinkTimer: 120, targetWorldRadius: BASE_WORLD_RADIUS,
    bossTimer: 180, bossActive: false
  });

  useEffect(() => { engine.current.settings = settings; }, [settings]);
  useEffect(() => { engine.current.highScore = highScore; }, [highScore]);

  useEffect(() => {
    const sCoins = localStorage.getItem('ocean_coins'); if (sCoins) setCoins(parseInt(sCoins));
    const sHS = localStorage.getItem('ocean_highscore'); if (sHS) setHighScore(parseInt(sHS));
    const sSkins = localStorage.getItem('ocean_unlocked_skins'); if (sSkins) setUnlockedSkins(JSON.parse(sSkins));
    const sHats = localStorage.getItem('ocean_unlocked_hats'); if (sHats) setUnlockedHats(JSON.parse(sHats));
    const sMus = localStorage.getItem('ocean_unlocked_mustaches'); if (sMus) setUnlockedMustaches(JSON.parse(sMus));
    const sSelHat = localStorage.getItem('ocean_sel_hat'); if (sSelHat) setSelectedHat(sSelHat);
    const sSelMus = localStorage.getItem('ocean_sel_mustache'); if (sSelMus) setSelectedMustache(sSelMus);
    const sSelSkin = localStorage.getItem('ocean_sel_skin'); if (sSelSkin) setSelectedSkinId(sSelSkin);
    const sSet = localStorage.getItem('ocean_settings'); if (sSet) { const parsed = JSON.parse(sSet); setSettings(parsed); audio.setBGM(parsed.bgm); audio.setSFX(parsed.sfx); }
  }, []);

  const saveCoin = (amount) => { setCoins(c => { const nc = c + amount; localStorage.setItem('ocean_coins', nc); return nc; }); };
  const unlockItem = (item, type) => {
    if (coins >= item.cost) {
      saveCoin(-item.cost);
      if (type === 'skins') { const ns = [...unlockedSkins, item.id]; setUnlockedSkins(ns); localStorage.setItem('ocean_unlocked_skins', JSON.stringify(ns)); setSelectedSkinId(item.id); localStorage.setItem('ocean_sel_skin', item.id); }
      else if (type === 'hats') { const nh = [...unlockedHats, item.id]; setUnlockedHats(nh); localStorage.setItem('ocean_unlocked_hats', JSON.stringify(nh)); setSelectedHat(item.id); localStorage.setItem('ocean_sel_hat', item.id); }
      else if (type === 'mustaches') { const nm = [...unlockedMustaches, item.id]; setUnlockedMustaches(nm); localStorage.setItem('ocean_unlocked_mustaches', JSON.stringify(nm)); setSelectedMustache(item.id); localStorage.setItem('ocean_sel_mustache', item.id); }
    }
  };
  const selectItem = (item, type) => {
    if (type === 'skins') { setSelectedSkinId(item.id); localStorage.setItem('ocean_sel_skin', item.id); }
    if (type === 'hats') { setSelectedHat(item.id); localStorage.setItem('ocean_sel_hat', item.id); }
    if (type === 'mustaches') { setSelectedMustache(item.id); localStorage.setItem('ocean_sel_mustache', item.id); }
  };
  const updateSettings = (k, v) => { setSettings(s => { const ns = { ...s, [k]: v }; localStorage.setItem('ocean_settings', JSON.stringify(ns)); if (k === 'bgm') audio.setBGM(v); if (k === 'sfx') audio.setSFX(v); return ns; }); };

  const enterFullscreen = () => {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) rfs.call(el).catch(() => {});
  };

  // Evitar gestos nativos que estraguem o joystick
  useEffect(() => {
    const preventDefaultTouch = (e) => {
      if (gameState === 'playing' && e.target.tagName === 'CANVAS') e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefaultTouch, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefaultTouch);
  }, [gameState]);

  useEffect(() => {
    const handleMouseMove = (e) => { engine.current.mouse = { x: e.clientX, y: e.clientY, active: true }; };
    const handleMouseDown = (e) => { if (e.target.tagName === 'CANVAS') { engine.current.mouse.active = true; if (engine.current.player) engine.current.player.isBoosting = true; } };
    const handleMouseUp = (e) => { if (engine.current.player) engine.current.player.isBoosting = false; };
    const handleKeyDown = (e) => { if (e.code === 'Space' && engine.current.player) engine.current.player.isBoosting = true; };
    const handleKeyUp = (e) => { if (e.code === 'Space' && engine.current.player) engine.current.player.isBoosting = false; };
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mousedown', handleMouseDown); window.addEventListener('mouseup', handleMouseUp); window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mousedown', handleMouseDown); window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  const spawnOrbs = (x, y, amount, valuePerOrb, specificColor = null) => { for (let i = 0; i < amount; i++) { const o = new Orb(x + randomRange(-50, 50), y + randomRange(-50, 50), valuePerOrb, false, -1, specificColor); engine.current.orbs.push(o); } };
  const addKillFeed = (name, color) => { const id = Date.now() + Math.random(); setKillFeed(prev => [...prev.slice(-2), { id, name, color }]); setTimeout(() => setKillFeed(prev => prev.filter(k => k.id !== id)), 3000); };

  const startGame = () => {
    audio.init(); if (settings.bgm) audio.setBGM(true);
    if (window.innerWidth < 1024) enterFullscreen();
    const e = engine.current; e.snakes = []; e.orbs = []; e.starfish = []; e.particles = []; e.critters = []; e.spatialHash.clear(); e.worldRadius = BASE_WORLD_RADIUS; e.globalAI = { generation: 1, deaths: 0 }; e.sessionCoins = 0; e.sessionKills = 0; e.sessionMaxScore = 0; e.startTime = performance.now(); e.isPlaying = true; e.isGameOverSequence = false;
    e.screenShake = 0; e.deathFlash = 0; e.playerLevel = 1; e.frenzyTimer = 90; e.frenzyActive = false; e.frenzyDuration = 0;
    e.killStreak = 0; e.killStreakTime = 0; e.killStreakActive = false;
    e.zoneShrinkTimer = 120; e.targetWorldRadius = BASE_WORLD_RADIUS; e.floatTexts = [];
    e.bossTimer = 180; e.bossActive = false;
    // Pre-seed ambient plankton
    e.plankton = [];
    for (let i = 0; i < 200; i++) {
      const a = Math.random() * Math.PI * 2; const r = randomRange(0, BASE_WORLD_RADIUS);
      e.plankton.push({ x: WORLD_CENTER + Math.cos(a) * r, y: WORLD_CENTER + Math.sin(a) * r, vx: randomRange(-8, 8), vy: randomRange(-8, 8), size: randomRange(1.5, 4), life: Math.random(), color: `hsl(${randomRange(160, 220)},70%,${randomRange(50, 80)}%)` });
    }
    e.player = new Snake(WORLD_CENTER, WORLD_CENTER, playerName || 'Player', true, selectedSkinId, false, selectedHat, selectedMustache); e.snakes.push(e.player);
    for (let i = 0; i < 300; i++) e.orbs.push(new Orb(WORLD_CENTER + randomRange(-1500, 1500), WORLD_CENTER + randomRange(-1500, 1500), randomRange(5, 15)));
    for (let i = 0; i < 15; i++) e.starfish.push(new Starfish(WORLD_CENTER + randomRange(-2000, 2000), WORLD_CENTER + randomRange(-2000, 2000)));
    for (let i = 0; i < 8; i++) e.critters.push(new SeaCritter(WORLD_CENTER + randomRange(-1500, 1500), WORLD_CENTER + randomRange(-1500, 1500), Math.random() > 0.5 ? 'jellyfish' : 'octopus'));
    setGameState('playing'); setKillCount(0); e.lastTime = performance.now(); requestAnimationFrame(gameLoop);
  };

  const gameLoop = useCallback((timestamp) => {
    const e = engine.current; if (!e.isPlaying) return;
    const canvas = canvasRef.current; if (!canvas) return requestAnimationFrame(gameLoop);
    const ctx = canvas.getContext('2d'); const p = e.player; const now = performance.now();
    if (e.isGameOverSequence) { if (now - e.gameOverTime > 2500) { e.isPlaying = false; e.isGameOverSequence = false; setGameState('gameover'); return; } }
    let dt = (timestamp - e.lastTime) / 1000; if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0; e.lastTime = timestamp;
    const quality = QUALITY_SETTINGS[e.settings.quality];
    const maxScore = Math.max(...e.snakes.map(s => s.score)); const targetRadius = Math.min(MAX_WORLD_RADIUS, BASE_WORLD_RADIUS + (e.snakes.length * 50) + (maxScore * 0.1));
    e.worldRadius = lerp(e.worldRadius, targetRadius, dt * 0.5);

    // ── Zone Shrink (Battle Royale) ─────────────────────────────────────────
    e.zoneShrinkTimer -= dt;
    if (e.zoneShrinkTimer <= 0) {
      const shrinkAmount = randomRange(200, 500);
      e.targetWorldRadius = Math.max(1200, (e.targetWorldRadius || e.worldRadius) - shrinkAmount);
      e.zoneShrinkTimer = randomRange(45, 75);
    }
    if (e.targetWorldRadius && e.targetWorldRadius < e.worldRadius) {
      e.worldRadius = lerp(e.worldRadius, e.targetWorldRadius, dt * 0.08);
    }

    // ── Food Frenzy Event ──────────────────────────────────────────────────
    e.frenzyTimer -= dt;
    if (e.frenzyTimer <= 0 && !e.frenzyActive) {
      e.frenzyActive = true; e.frenzyDuration = 12;
      setFrenzyBanner(true);
      setTimeout(() => setFrenzyBanner(false), 3000);
      for (let i = 0; i < 200; i++) {
        const a = Math.random() * Math.PI * 2; const r = randomRange(100, e.worldRadius * 0.9);
        e.orbs.push(new Orb(WORLD_CENTER + Math.cos(a) * r, WORLD_CENTER + Math.sin(a) * r, randomRange(15, 40)));
      }
      audio.sfxPowerup();
    }
    if (e.frenzyActive) {
      e.frenzyDuration -= dt;
      if (Math.random() < 0.9) {
        const a = Math.random() * Math.PI * 2; const r = randomRange(0, e.worldRadius * 0.9);
        e.orbs.push(new Orb(WORLD_CENTER + Math.cos(a) * r, WORLD_CENTER + Math.sin(a) * r, randomRange(20, 50)));
      }
      if (e.frenzyDuration <= 0) { e.frenzyActive = false; e.frenzyTimer = randomRange(60, 90); }
    }

    // ── Screen Shake Decay ─────────────────────────────────────────────────
    if (e.screenShake > 0.3) e.screenShake *= 0.82; else e.screenShake = 0;

    // ── Kill Streak Decay ──────────────────────────────────────────────────
    if (e.killStreakActive && now - e.killStreakTime > 8000) {
      e.killStreak = 0; e.killStreakActive = false;
      setKillStreakDisplay({ count: 0, active: false });
    }

    // ── Boss Snake Spawn ───────────────────────────────────────────────────
    e.bossTimer -= dt;
    if (e.bossTimer <= 0 && !e.bossActive) {
      e.bossActive = true;
      e.bossTimer = randomRange(120, 180);
      const bossAngle = Math.random() * Math.PI * 2;
      const bossR = e.worldRadius * 0.6;
      const boss = new Snake(WORLD_CENTER + Math.cos(bossAngle) * bossR, WORLD_CENTER + Math.sin(bossAngle) * bossR, '👑 BOSS', false, SKINS[Math.floor(Math.random() * SKINS.length)].id, true, 'crown_gold', 'none');
      boss.score = 8000 + (e.globalAI.generation * 500);
      boss.baseSpeed = 160;
      boss.isBoss = true;
      e.snakes.push(boss);
      e.floatTexts.push(new FloatText(WORLD_CENTER, WORLD_CENTER - 200, '👑 BOSS APARECEU!', '#fbbf24', 32));
      audio.sfxPowerup();
    }
    // Track if boss still alive
    if (e.bossActive && !e.snakes.some(s => s.isBoss)) e.bossActive = false;

    // ── Ambient Plankton Update ────────────────────────────────────────────
    if (!e.plankton) e.plankton = [];
    for (const pk of e.plankton) {
      pk.x += pk.vx * dt; pk.y += pk.vy * dt;
      pk.vx += (Math.random() - 0.5) * 2 * dt; pk.vy += (Math.random() - 0.5) * 2 * dt;
      pk.vx *= 0.99; pk.vy *= 0.99;
      pk.life = (pk.life + dt * 0.4) % 1;
      // Soft boundary wrap within world
      const dw = distSq(pk.x, pk.y, WORLD_CENTER, WORLD_CENTER);
      if (dw > e.worldRadius * e.worldRadius) { pk.vx += (WORLD_CENTER - pk.x) * 0.0001; pk.vy += (WORLD_CENTER - pk.y) * 0.0001; }
    }

    if (e.snakes.length < 35 && Math.random() < 0.05) {
      const angle = Math.random() * Math.PI * 2; const r = randomRange(0, e.worldRadius * 0.8); const isGiant = Math.random() < 0.15; const randomSkin = SKINS[Math.floor(Math.random() * SKINS.length)].id;
      const randomHat = Math.random() < 0.2 ? HATS[Math.floor(Math.random() * HATS.length)].id : 'none'; const randomMustache = Math.random() < 0.2 ? MUSTACHES[Math.floor(Math.random() * MUSTACHES.length)].id : 'none';
      e.snakes.push(new Snake(WORLD_CENTER + Math.cos(angle) * r, WORLD_CENTER + Math.sin(angle) * r, getUniqueBotName(e.snakes.map(s => s.name)), false, randomSkin, isGiant, randomHat, randomMustache));
    }
    if (e.orbs.length < e.worldRadius / 3) { for (let i = 0; i < 3; i++) { const angle = Math.random() * Math.PI * 2; const r = randomRange(0, e.worldRadius); const isPowerup = Math.random() < 0.005; e.orbs.push(new Orb(WORLD_CENTER + Math.cos(angle) * r, WORLD_CENTER + Math.sin(angle) * r, isPowerup ? 0 : randomRange(5, 20), isPowerup, isPowerup ? Math.floor(Math.random() * 4) : -1)); } }
    if (e.starfish.length < e.worldRadius / 300 && Math.random() < 0.02) { const angle = Math.random() * Math.PI * 2; const r = randomRange(0, e.worldRadius); e.starfish.push(new Starfish(WORLD_CENTER + Math.cos(angle) * r, WORLD_CENTER + Math.sin(angle) * r)); }
    if (e.critters.length < e.worldRadius / 400 && Math.random() < 0.02) { const angle = Math.random() * Math.PI * 2; const r = randomRange(0, e.worldRadius); e.critters.push(new SeaCritter(WORLD_CENTER + Math.cos(angle) * r, WORLD_CENTER + Math.sin(angle) * r, Math.random() > 0.5 ? 'jellyfish' : 'octopus')); }

    let inputTarget = null;
    if (p && !p.isDead) {
      if (e.joystick.active) inputTarget = { x: p.x + e.joystick.dx * 100, y: p.y + e.joystick.dy * 100 };
      else if (e.mouse.active) { const mx = (e.mouse.x - window.innerWidth / 2) / e.camera.zoom + e.camera.x; const my = (e.mouse.y - window.innerHeight / 2) / e.camera.zoom + e.camera.y; inputTarget = { x: mx, y: my }; }
    }

    e.spatialHash.clear();
    for (let i = e.snakes.length - 1; i >= 0; i--) {
      const s = e.snakes[i]; let target = s === p ? inputTarget : s.updateAI(dt, e.spatialHash, e.worldRadius, e.globalAI.generation);
      const spawns = s.update(dt, target, e.spatialHash, e.worldRadius, quality);
      for (const sp of spawns) { if (sp.type === 'orb') e.orbs.push(sp.ent); if (sp.type === 'particle') e.particles.push(sp.ent); }
    }

    for (let i = e.snakes.length - 1; i >= 0; i--) {
      const s = e.snakes[i];
      if (!s.isDead && !s.isInvulnerable) {
        for (const other of e.snakes) {
          if (other === s || other.isDead || other.isInvulnerable) continue;
          // Ghost power-up: skip collision
          if (s.activePowerups[4] && s.activePowerups[4] > now) continue;
          const maxReach = (other.targetLength * other.size) + 800; if (distSq(s.x, s.y, other.x, other.y) > maxReach * maxReach) continue;
          for (let j = 0; j < other.segments.length; j += 2) {
            const seg = other.segments[j]; const colDistSq = (s.size * 0.75 + other.size * 0.75) ** 2;
            if (distSq(s.x, s.y, seg.x, seg.y) < colDistSq) {
              if (s.activePowerups[0] && s.activePowerups[0] > now) { s.activePowerups[0] = 0; s.angle += Math.PI; s.spawnTime = now; audio.sfxShieldBreak(); for (let k = 0; k < 10; k++) e.particles.push(new Particle(s.x, s.y, '#06b6d4')); }
              else {
                s.isDead = true; other.kills++;
                if (other === p) {
                  e.sessionKills++; e.sessionCoins += 5; setKillCount(e.sessionKills); addKillFeed(s.name, s.skin.colors[0]); audio.sfxCoin();
                  e.screenShake = 18;
                  e.killStreak++; e.killStreakTime = now; e.killStreakActive = true;
                  setKillStreakDisplay({ count: e.killStreak, active: true });
                  // Boss kill bonus
                  if (s.isBoss) { e.sessionCoins += 50; e.screenShake = 35; audio.sfxPowerup(); e.floatTexts.push(new FloatText(p.x, p.y - 60, '👑 BOSS MORTO! +50🪙', '#fbbf24', 26)); }
                }
              }
              break;
            }
          }
          if (s.isDead) break;
        }
      }

      if (s.isDead) {
        audio.sfxDeath(); const orbCount = Math.min(100, Math.floor(s.score / 35)); const valPerOrb = s.score / orbCount;
        spawnOrbs(s.x, s.y, orbCount, valPerOrb, s.skin.colors[0]);
        e.particles.push(new Particle(s.x, s.y, '#ffffff', 'shockwave')); e.particles.push(new Particle(s.x, s.y, s.skin.colors[0], 'shockwave'));
        for (let k = 0; k < 40; k++) { const explodeColor = s.skin.colors[k % 2 === 0 ? 0 : (s.skin.colors[1] ? 1 : 0)]; const pt = new Particle(s.x, s.y, explodeColor, 'solid', true); pt.vx *= 2.5; pt.vy *= 2.5; e.particles.push(pt); }
        if (!s.isPlayer) { e.globalAI.deaths++; if (e.globalAI.deaths % 20 === 0) e.globalAI.generation++; }
        else {
          e.deathFlash = 1.0; if (!e.isGameOverSequence) {
            e.isGameOverSequence = true; e.gameOverTime = now; const finalScore = Math.floor(p.score / 10); const isNewRecord = finalScore > e.highScore; if (isNewRecord) { setHighScore(finalScore); localStorage.setItem('ocean_highscore', finalScore); e.highScore = finalScore; }
            const lvl = e.playerLevel || 1;
            const bonusCoins = Math.floor(e.sessionCoins * (1 + lvl * 0.1));
            saveCoin(bonusCoins);
            setGameOverStats({ score: finalScore, coins: bonusCoins, kills: e.sessionKills, time: Math.floor((now - e.startTime) / 1000), newRecord: isNewRecord, level: lvl });
          }
        }
        e.snakes.splice(i, 1);
      }
    }

    if (p && !p.isDead) {
      const magnetRadius = (p.activePowerups[2] && p.activePowerups[2] > now) ? 350 : p.size * 2.2;
      for (let i = e.orbs.length - 1; i >= 0; i--) {
        const o = e.orbs[i];
        if (!o.target) { const dSq = distSq(p.x, p.y, o.x, o.y); if (dSq < magnetRadius * magnetRadius) o.target = p; }
        if (!o.update(dt, e.worldRadius)) {
          if (o.target === p) {
            if (o.isPowerup) {
              audio.sfxPowerup();
              if (o.puType === 3) { e.sessionCoins++; audio.sfxCoin(); e.floatTexts.push(new FloatText(p.x, p.y - p.size * 2, '+🪙', '#fbbf24', 20)); }
              else { p.activePowerups[o.puType] = now + POWERUP_TYPES[o.puType].duration; e.floatTexts.push(new FloatText(p.x, p.y - p.size * 2, POWERUP_TYPES[o.puType].name + '!', POWERUP_TYPES[o.puType].color, 22)); }
            }
            else {
              const prevLevel = Math.floor(p.score / LEVEL_STEP);
              p.score += o.value;
              audio.sfxPop();
              // Floating score
              if (o.value >= 20) e.floatTexts.push(new FloatText(p.x + randomRange(-30, 30), p.y - p.size * 2, `+${Math.round(o.value)}`, '#6ee7b7', 16));
              // Combo bonus
              if (now - e.combo.lastTime < 400) e.combo.count++; else e.combo.count = 1;
              e.combo.lastTime = now;
              if (e.combo.count >= 10) { p.score += o.value; e.floatTexts.push(new FloatText(p.x, p.y - p.size * 3, 'COMBO BONUS!', '#fde047', 22)); }
              // Level up check
              const newLevel = Math.floor(p.score / LEVEL_STEP);
              if (newLevel > prevLevel && newLevel > e.playerLevel) {
                e.playerLevel = newLevel;
                e.screenShake = 12;
                setLevelUpDisplay({ level: newLevel, show: true });
                setTimeout(() => setLevelUpDisplay(l => ({ ...l, show: false })), 2500);
                for (let k = 0; k < 25; k++) e.particles.push(new Particle(p.x, p.y, '#fde047', 'solid', true));
              }
            }
          }
          e.orbs.splice(i, 1);
        }
      }
      // Neon trail while boosting (world-space)
      if (p.isBoosting && quality.bubbles && p.segments.length > 2) {
        const tail = p.segments[p.segments.length - 1];
        if (Math.random() < 0.7) {
          const tc = new Particle(tail.x + randomRange(-6, 6), tail.y + randomRange(-6, 6), p.skin.colors[0], 'solid', true);
          tc.vx *= 0.3; tc.vy *= 0.3; tc.decay = 2.5; tc.size = randomRange(3, 7);
          e.particles.push(tc);
        }
      }
      for (let i = e.starfish.length - 1; i >= 0; i--) {
        const sf = e.starfish[i]; if (!sf.target && distSq(p.x, p.y, sf.x, sf.y) < magnetRadius * magnetRadius) sf.target = p;
        if (!sf.update(dt, e.worldRadius)) { if (sf.target === p) { p.score += sf.value; audio.sfxPop(); for (let k = 0; k < 5; k++) e.particles.push(new Particle(p.x, p.y, sf.color)); e.floatTexts.push(new FloatText(p.x, p.y - p.size * 2, `+${sf.value}⭐`, sf.color, 20)); } e.starfish.splice(i, 1); }
      }
    } else { e.orbs = e.orbs.filter(o => o.update(dt, e.worldRadius)); e.starfish = e.starfish.filter(sf => sf.update(dt, e.worldRadius)); }
    for (let i = e.critters.length - 1; i >= 0; i--) { if (!e.critters[i].update(dt, e.snakes, e.worldRadius, e.particles)) e.critters.splice(i, 1); }
    e.particles = e.particles.filter(p => p.update(dt));
    if (!e.floatTexts) e.floatTexts = [];
    e.floatTexts = e.floatTexts.filter(ft => ft.update(dt));
    // Ghost powerup spawn chance
    if (e.orbs.length < e.worldRadius / 3 && Math.random() < 0.001) {
      const a = Math.random() * Math.PI * 2; const r = randomRange(100, e.worldRadius * 0.9);
      e.orbs.push(new Orb(WORLD_CENTER + Math.cos(a) * r, WORLD_CENTER + Math.sin(a) * r, 0, true, 4));
    }
    // Death flash decay
    if (e.deathFlash > 0) e.deathFlash = Math.max(0, e.deathFlash - dt * 2.5);

    // Suporte a Telas Retina / High DPI (Anti-Blur para Dispositivos Móveis e Tablets)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    if (p && !p.isDead) {
      const baseLookAhead = p.isBoosting ? 300 : 150; const sizeMultiplier = 1 + (p.size / 100); const lookAhead = baseLookAhead * sizeMultiplier;
      let targetCamX = p.x + Math.cos(p.angle) * lookAhead; let targetCamY = p.y + Math.sin(p.angle) * lookAhead;
      let targetZoom = 1.2 - (p.size * 0.006);
      if (window.innerWidth < 768) targetZoom *= 0.7; // Wider view on mobile
      targetZoom = Math.max(0.3, Math.min(1.2, targetZoom));

      if (p.isBoosting) targetZoom *= 0.85;
      let threatFactor = 0; for (const other of e.snakes) { if (other !== p && !other.isDead && other.score > p.score * 1.2) { const dSq = distSq(p.x, p.y, other.x, other.y); if (dSq < 1000 * 1000) { threatFactor = Math.max(threatFactor, 1 - (Math.sqrt(dSq) / 1000)); } } }
      targetZoom *= (1 - (threatFactor * 0.15)); targetZoom = Math.max(0.3, targetZoom); targetZoom += Math.sin(now / 2000) * 0.01;
      e.camera.x = lerp(e.camera.x, targetCamX, dt * 4.0); e.camera.y = lerp(e.camera.y, targetCamY, dt * 4.0); e.camera.zoom = lerp(e.camera.zoom, targetZoom, dt * 2.0);
    } else if (p && p.isDead && e.isGameOverSequence) e.camera.zoom = lerp(e.camera.zoom, 1.3, dt * 0.8);

    ctx.fillStyle = '#020c18'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // Aplicação da resolução Retina/Alta Densidade
    ctx.scale(dpr, dpr);
    const shakeX = e.screenShake > 0 ? (Math.random() - 0.5) * e.screenShake * 2 : 0;
    const shakeY = e.screenShake > 0 ? (Math.random() - 0.5) * e.screenShake * 2 : 0;
    ctx.translate(window.innerWidth / 2 + shakeX, window.innerHeight / 2 + shakeY);
    ctx.scale(e.camera.zoom, e.camera.zoom);
    ctx.translate(-e.camera.x, -e.camera.y);

    const viewW = window.innerWidth / e.camera.zoom; const viewH = window.innerHeight / e.camera.zoom;
    const viewMinX = e.camera.x - viewW / 2 - 200; const viewMaxX = e.camera.x + viewW / 2 + 200;
    const viewMinY = e.camera.y - viewH / 2 - 200; const viewMaxY = e.camera.y + viewH / 2 + 200;
    const inView = (x, y) => x >= viewMinX && x <= viewMaxX && y >= viewMinY && y <= viewMaxY;
    const hexSize = 100; const hexW = Math.sqrt(3) * hexSize; const hexH = 2 * hexSize * 0.75;
    const startCol = Math.floor(viewMinX / hexW) - 1; const endCol = Math.ceil(viewMaxX / hexW) + 1;
    const startRow = Math.floor(viewMinY / hexH) - 1; const endRow = Math.ceil(viewMaxY / hexH) + 1;

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)'; ctx.lineWidth = 2;
    for (let r = startRow; r <= endRow; r++) { for (let c = startCol; c <= endCol; c++) { const x = c * hexW + (r % 2 ? hexW / 2 : 0); const y = r * hexH; if (distSq(x, y, WORLD_CENTER, WORLD_CENTER) < e.worldRadius * e.worldRadius) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const angle_rad = Math.PI / 180 * (60 * i - 30); ctx.lineTo(x + hexSize * Math.cos(angle_rad), y + hexSize * Math.sin(angle_rad)); } ctx.closePath(); ctx.stroke(); } } }
    ctx.beginPath(); ctx.arc(WORLD_CENTER, WORLD_CENTER, e.worldRadius, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; ctx.lineWidth = 10; if (quality.shadows) { ctx.shadowBlur = 30; ctx.shadowColor = 'red'; } ctx.stroke(); ctx.shadowBlur = 0;

    // ── Ambient Plankton ───────────────────────────────────────────────────
    if (e.plankton && quality.bubbles) {
      for (const pk of e.plankton) {
        if (!inView(pk.x, pk.y)) continue;
        const pulse = Math.sin(pk.life * Math.PI);
        ctx.globalAlpha = 0.15 + pulse * 0.25;
        ctx.fillStyle = pk.color;
        ctx.beginPath(); ctx.arc(pk.x, pk.y, pk.size * (0.5 + pulse * 0.5), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const snakesByScore = [...e.snakes].sort((a, b) => b.score - a.score); snakesByScore.forEach((s, idx) => s.rank = idx + 1);

    for (const o of e.orbs) if (inView(o.x, o.y)) o.draw(ctx, quality);
    for (const sf of e.starfish) if (inView(sf.x, sf.y)) sf.draw(ctx, quality);
    for (const c of e.critters) if (inView(c.x, c.y)) c.draw(ctx, quality);
    for (const pt of e.particles) if (inView(pt.x, pt.y)) pt.draw(ctx);
    for (const s of [...snakesByScore].reverse()) { const margin = s.targetLength * s.size + 150; if (s.x > viewMinX - margin && s.x < viewMaxX + margin && s.y > viewMinY - margin && s.y < viewMaxY + margin) s.draw(ctx, quality); }
    // Ghost tint overlay on player
    if (p && !p.isDead && p.activePowerups[4] && p.activePowerups[4] > now) {
      ctx.save(); ctx.globalAlpha = 0.18 + Math.sin(now / 120) * 0.06;
      ctx.fillStyle = '#c7d2fe'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // Floating texts (world space)
    if (e.floatTexts) for (const ft of e.floatTexts) if (inView(ft.x, ft.y)) ft.draw(ctx);
    ctx.restore();

    // ── Death Flash ─────────────────────────────────────────────────────────
    if (e.deathFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${e.deathFlash * 0.85})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    // ── Mini-map ────────────────────────────────────────────────────────────
    if (p && !p.isDead) {
      const mmR = 72;
      const mmX = window.innerWidth - mmR - 18;
      const mmY = window.innerHeight - mmR - 18;
      const mmScale = mmR / e.worldRadius;
      ctx.save();
      ctx.beginPath(); ctx.arc(mmX, mmY, mmR, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(0,10,22,0.85)'; ctx.fill();
      // World shrink ring
      ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mmX, mmY, e.worldRadius * mmScale, 0, Math.PI * 2); ctx.stroke();
      // Bots
      for (const s of e.snakes) {
        if (s === p) continue;
        const mx = mmX + (s.x - WORLD_CENTER) * mmScale;
        const my = mmY + (s.y - WORLD_CENTER) * mmScale;
        if (s.isBoss) {
          ctx.fillStyle = '#fbbf24'; ctx.shadowBlur = 8; ctx.shadowColor = '#fbbf24';
          ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = s.skin.colors[0]; ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Player dot (white, larger)
      const pdx = mmX + (p.x - WORLD_CENTER) * mmScale;
      const pdy = mmY + (p.y - WORLD_CENTER) * mmScale;
      ctx.shadowBlur = 8; ctx.shadowColor = '#fff';
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(pdx, pdy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      // Border ring
      ctx.strokeStyle = 'rgba(6,182,212,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mmX, mmY, mmR, 0, Math.PI * 2); ctx.stroke();
      // Label
      ctx.fillStyle = 'rgba(6,182,212,0.65)'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('MAPA', mmX, mmY + mmR + 11);
    }

    // ── Danger Zone Vignette (canvas) ───────────────────────────────────────
    if (p && !p.isDead && distSq(p.x, p.y, WORLD_CENTER, WORLD_CENTER) > (e.worldRadius * 0.82) ** 2) {
      const alpha = 0.22 + Math.sin(now / 260) * 0.13;
      const vg = ctx.createRadialGradient(window.innerWidth / 2, window.innerHeight / 2, window.innerHeight * 0.18, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight * 0.78);
      vg.addColorStop(0, 'rgba(255,0,0,0)'); vg.addColorStop(1, `rgba(255,30,0,${alpha})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    // ── Food Frenzy Overlay ─────────────────────────────────────────────────
    if (e.frenzyActive) {
      const t = Math.sin(now / 200) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255,215,0,${0.1 + t * 0.12})`;
      ctx.lineWidth = 6; ctx.setLineDash([20, 15]);
      ctx.strokeRect(6, 6, window.innerWidth - 12, window.innerHeight - 12);
      ctx.setLineDash([]);
    }

    if (timestamp % 250 < 20 && p && !p.isDead) {
      e.sessionMaxScore = Math.max(e.sessionMaxScore, p.score); const sortedTop = [...e.snakes].sort((a, b) => b.score - a.score); const pRank = sortedTop.findIndex(s => s === p) + 1;
      const lvl = e.playerLevel || 1; const xpProgress = ((p.score % LEVEL_STEP) / LEVEL_STEP) * 100;
      setHud({ length: Math.floor(p.score / 10), rank: pRank, totalPlayers: e.snakes.length, sessionCoins: e.sessionCoins, top10: sortedTop.slice(0, 10).map(s => ({ name: s.name, score: Math.floor(s.score / 10), color: s.skin.colors[0], isPlayer: s === p })), frenzyActive: e.frenzyActive, frenzyLeft: Math.ceil(e.frenzyDuration), zoneShrinking: e.targetWorldRadius < e.worldRadius - 100, level: lvl, xpProgress });
      const activePus = []; for (let id in p.activePowerups) { if (p.activePowerups[id] > now) activePus.push({ id: parseInt(id), rem: Math.ceil((p.activePowerups[id] - now) / 1000) }); }
      setPowerupsHUD(activePus); setDangerZone(distSq(p.x, p.y, WORLD_CENTER, WORLD_CENTER) > (e.worldRadius * 0.85) ** 2);
    }
    if (now - e.combo.lastTime < 2000 && e.combo.count >= 5) { if (!e.combo.active || e.combo.lastCount !== e.combo.count) { e.combo.active = true; e.combo.lastCount = e.combo.count; setComboState({ count: e.combo.count, active: true }); } }
    else { if (e.combo.active) { e.combo.active = false; setComboState(prev => ({ ...prev, active: false })); } }
    requestAnimationFrame(gameLoop);
  }, []);

  const updateJoystick = (touch) => {
    const base = document.getElementById('joystick-base').getBoundingClientRect();
    const cx = base.left + base.width / 2; const cy = base.top + base.height / 2;
    let dx = touch.clientX - cx; let dy = touch.clientY - cy;
    const d = Math.sqrt(dx * dx + dy * dy); const maxR = base.width / 2;
    if (d > maxR) { dx = (dx / d) * maxR; dy = (dy / d) * maxR; }
    engine.current.joystick = { active: true, x: dx, y: dy, dx: dx / maxR, dy: dy / maxR };
    setJoystickPos({ x: dx, y: dy });
  };

  const ItemPreview = ({ item, active }) => {
    const renderSkin = lobbyTab === 'skins' ? item : SKINS.find(s => s.id === selectedSkinId);
    const renderHat = lobbyTab === 'hats' ? item.id : selectedHat;
    const renderMustache = lobbyTab === 'mustaches' ? item.id : selectedMustache;
    const isUnlocked = lobbyTab === 'skins' ? unlockedSkins.includes(item.id) : lobbyTab === 'hats' ? unlockedHats.includes(item.id) : unlockedMustaches.includes(item.id);
    return (
      <div className={`relative flex items-center justify-center h-32 w-32 rounded-xl transition-all duration-300 ${active ? 'bg-cyan-900/50 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] scale-105 z-10' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/60'}`}>
        <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-xl pointer-events-none" style={{ animation: active ? 'float 3s ease-in-out infinite' : 'none' }}>
          <defs><radialGradient id={`grad-${renderSkin.id}`} cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor={renderSkin.colors[0]} /><stop offset="100%" stopColor={renderSkin.colors[1] || renderSkin.colors[0]} /></radialGradient><radialGradient id="vol3d" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="rgba(255,255,255,0.4)" /><stop offset="50%" stopColor="rgba(0,0,0,0)" /><stop offset="100%" stopColor="rgba(0,0,0,0.65)" /></radialGradient></defs>
          {renderSkin.style === 'chain' ? <g><rect x="25" y="30" width="50" height="15" rx="7" fill="none" stroke={renderSkin.colors[0]} strokeWidth="8" /><rect x="42" y="20" width="15" height="40" rx="7" fill="none" stroke={renderSkin.colors[1]} strokeWidth="8" /><circle cx="50" cy="70" r="20" fill={renderSkin.colors[0]} /><circle cx="50" cy="70" r="20" fill="url(#vol3d)" /></g> : renderSkin.style === 'organic_sponge' ? <g><path d="M 25 35 Q 35 15 50 20 Q 75 15 80 40 Q 85 65 65 75 Q 40 85 20 65 Q 15 45 25 35 Z" fill={`url(#grad-${renderSkin.id})`} /><path d="M 25 35 Q 35 15 50 20 Q 75 15 80 40 Q 85 65 65 75 Q 40 85 20 65 Q 15 45 25 35 Z" fill="url(#vol3d)" /><circle cx="40" cy="35" r="5" fill="rgba(10,40,10,0.4)" /><circle cx="65" cy="45" r="8" fill="rgba(10,40,10,0.4)" /><circle cx="35" cy="60" r="4" fill="rgba(10,40,10,0.4)" /></g> : renderSkin.style === 'hammer' ? <g><path d="M 15 45 Q 50 30 85 45 L 80 30 Q 50 20 20 30 Z" fill={`url(#grad-${renderSkin.id})`} /><path d="M 35 40 L 65 40 L 60 20 L 40 20 Z" fill={renderSkin.colors[1]} /></g> : <g><circle cx="50" cy="50" r="38" fill={`url(#grad-${renderSkin.id})`} /><circle cx="50" cy="50" r="38" fill="url(#vol3d)" /></g>}
          {renderSkin.style === 'tentacles' && <path d="M 25 80 Q 20 100 15 85 M 40 85 Q 35 110 30 90 M 60 85 Q 65 110 70 90 M 75 80 Q 80 100 85 85" stroke={renderSkin.colors[0]} strokeWidth="6" fill="none" strokeLinecap="round" />}
          {renderSkin.style === 'spiky' && <path d="M 12 50 Q 0 45 12 40 M 88 50 Q 100 45 88 40 M 50 12 Q 45 0 55 0 M 25 25 Q 15 15 30 20 M 75 25 Q 85 15 70 20 M 50 88 Q 45 100 55 100" fill="none" stroke={renderSkin.colors[1]} strokeWidth="6" strokeLinecap="round" />}
          {(renderSkin.style === 'fins' || renderSkin.style === 'smooth') && <path d="M 50 12 Q 35 -10 65 0 Z M 12 50 Q -10 35 5 65 Z M 88 50 Q 110 35 95 65 Z" fill={renderSkin.colors[0]} />}
          {renderSkin.style === 'bone' || renderSkin.id === 'skeleton' ? <g><circle cx="35" cy="45" r="10" fill="#111827" /><circle cx="65" cy="45" r="10" fill="#111827" /><path d="M 45 60 L 55 60 L 50 55 Z" fill="#111827" /></g> : <g><circle cx="32" cy="40" r="10" fill="white" /><circle cx="32" cy="40" r="5" fill="#111827" /><circle cx="68" cy="40" r="10" fill="white" /><circle cx="68" cy="40" r="5" fill="#111827" /></g>}
          {renderMustache !== 'none' && <MustacheSVG mustacheId={renderMustache} />}
          {renderHat !== 'none' && <HatSVG hatId={renderHat} />}
        </svg>
        {!isUnlocked && <div className="absolute inset-0 bg-black/65 rounded-xl flex items-center justify-center backdrop-blur-[2px]"><span className="text-4xl">🔒</span></div>}
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen bg-gray-950 overflow-hidden font-sans text-white select-none" style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@400;600&display=swap');
        * { font-family: 'Exo 2', sans-serif; } .font-display { font-family: 'Orbitron', sans-serif; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-danger { 0%, 100% { box-shadow: inset 0 0 20px rgba(255,0,0,0); } 50% { box-shadow: inset 0 0 80px rgba(255,0,0,0.4); } }
        @keyframes pop { 0% { transform: scale(0.8) translateX(-50%); opacity: 0; } 50% { transform: scale(1.15) translateX(-50%); } 100% { transform: scale(1) translateX(-50%); opacity: 1; } }
        @keyframes levelup { 0% { transform: scale(0.5) translateX(-50%); opacity: 0; } 60% { transform: scale(1.2) translateX(-50%); } 100% { transform: scale(1) translateX(-50%); opacity: 1; } }
        .danger-pulse { animation: pulse-danger 2s infinite; border: 2px solid rgba(255,0,0,0.2); }
        .glass-panel { background: rgba(2, 12, 24, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(6, 182, 212, 0.2); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <canvas ref={canvasRef} className={`block w-full h-full ${dangerZone ? 'danger-pulse' : ''}`} />
      {gameState === 'lobby' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#010e1f] to-black z-10 px-4">
          <div className="absolute top-4 right-4 flex gap-4"><div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 font-display text-yellow-400 font-bold">🪙 {coins}</div><button onClick={() => setShowSettings(true)} className="glass-panel p-2 rounded-full hover:bg-cyan-900/50 transition">⚙️</button></div>
          <h1 className="text-5xl md:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 mb-2 tracking-wider text-center">SNAKE OCEAN</h1>
          <p className="text-cyan-400/60 mb-6 uppercase tracking-[0.3em] text-xs md:text-base">Deep Dive Evolution</p>
          <div className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center w-full max-w-4xl">
            <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value.slice(0, 15))} placeholder="Nome do Jogador" className="w-full max-w-lg text-center bg-black/50 border border-cyan-800 rounded-lg py-3 px-4 mb-4 text-xl focus:outline-none focus:border-cyan-400 transition" />
            <div className="flex flex-wrap justify-center gap-1 md:gap-2 mb-4 bg-gray-900/50 p-1 md:p-2 rounded-xl backdrop-blur w-full max-w-2xl">
              {['skins', 'hats', 'mustaches'].map(tab => <button key={tab} onClick={() => setLobbyTab(tab)} className={`flex-1 py-2 px-1 rounded-lg font-bold text-[10px] md:text-sm transition ${lobbyTab === tab ? 'bg-cyan-600' : 'hover:bg-gray-800 text-gray-400'}`}>{tab === 'skins' ? '🐍 Skins' : tab === 'hats' ? '🎩 Chapéu' : '🕶️ Rosto'}</button>)}
            </div>
            <div className="w-full max-w-3xl mb-2 flex justify-between items-center text-sm font-bold text-gray-400 px-4"><span>SELEÇÃO: <span className="text-white uppercase">{(lobbyTab === 'skins' ? SKINS : lobbyTab === 'hats' ? HATS : MUSTACHES).find(s => s.id === (lobbyTab === 'skins' ? selectedSkinId : lobbyTab === 'hats' ? selectedHat : selectedMustache))?.name}</span></span><span className="text-yellow-400">{(lobbyTab === 'skins' ? SKINS : lobbyTab === 'hats' ? HATS : MUSTACHES).find(s => s.id === (lobbyTab === 'skins' ? selectedSkinId : lobbyTab === 'hats' ? selectedHat : selectedMustache))?.cost > 0 ? `🪙 ${(lobbyTab === 'skins' ? SKINS : lobbyTab === 'hats' ? HATS : MUSTACHES).find(s => s.id === (lobbyTab === 'skins' ? selectedSkinId : lobbyTab === 'hats' ? selectedHat : selectedMustache))?.cost}` : 'GRÁTIS'}</span></div>
            <div className="relative w-full max-w-4xl flex items-center group">
              <button onClick={() => carouselRef.current.scrollBy({ left: -180, behavior: 'smooth' })} className="absolute left-0 z-10 w-12 h-12 flex items-center justify-center bg-black/80 rounded-full border border-cyan-500/50 hidden md:flex text-3xl">&#8249;</button>
              <div ref={carouselRef} className="flex gap-4 overflow-x-auto w-full py-4 px-2 md:px-10 snap-x hide-scrollbar scroll-smooth">
                {(lobbyTab === 'skins' ? SKINS : lobbyTab === 'hats' ? HATS : MUSTACHES).map(item => (
                  <div key={item.id} className="snap-center cursor-pointer flex-shrink-0 w-28 md:w-32 flex flex-col items-center" onClick={() => (lobbyTab === 'skins' ? unlockedSkins : lobbyTab === 'hats' ? unlockedHats : unlockedMustaches).includes(item.id) ? selectItem(item, lobbyTab) : null}>
                    <ItemPreview item={item} active={(lobbyTab === 'skins' ? selectedSkinId : lobbyTab === 'hats' ? selectedHat : selectedMustache) === item.id} />
                    <div className="text-center mt-3 text-[10px] md:text-xs font-bold" style={{ color: item.rarity === 2 ? '#fde047' : item.rarity === 1 ? '#a855f7' : '#9ca3af' }}>{item.rarity === 2 ? 'PREMIUM' : item.rarity === 1 ? 'RARO' : 'NORMAL'}</div>
                    {!(lobbyTab === 'skins' ? unlockedSkins : lobbyTab === 'hats' ? unlockedHats : unlockedMustaches).includes(item.id) && <button onClick={(e) => { e.stopPropagation(); unlockItem(item, lobbyTab); }} className={`mt-2 w-full py-1 text-xs rounded ${coins >= item.cost ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500'}`}>{coins >= item.cost ? `DESBLOQUEAR` : `🪙 ${item.cost}`}</button>}
                  </div>
                ))}
              </div>
              <button onClick={() => carouselRef.current.scrollBy({ left: 180, behavior: 'smooth' })} className="absolute right-0 z-10 w-12 h-12 flex items-center justify-center bg-black/80 rounded-full border border-cyan-500/50 hidden md:flex text-3xl">&#8250;</button>
            </div>
            <button onClick={startGame} className="mt-4 md:mt-6 w-full max-w-lg py-3 md:py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-display text-lg md:text-2xl font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.4)]">MERGULHAR</button>
          </div>
        </div>
      )}
      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
          <div className="flex justify-between items-start">
            <div className="glass-panel p-3 rounded-xl min-w-[120px] md:min-w-[150px]">
              <div className="text-gray-400 text-[10px] md:text-xs font-bold uppercase">Comprimento</div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white">{hud.length}</div>
              <div className="text-cyan-400 text-xs md:text-sm mt-1 border-t border-cyan-800/50 pt-1">Rank #{hud.rank} de {hud.totalPlayers}</div>
              <div className="text-yellow-400 text-xs md:text-sm font-bold mt-1">🪙 {hud.sessionCoins}</div>
              {/* XP Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-[9px] md:text-[10px] text-amber-400 font-bold mb-0.5"><span>⭐ Nível {hud.level}</span><span>{Math.round(hud.xpProgress || 0)}%</span></div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all" style={{ width: `${hud.xpProgress || 0}%` }}></div></div>
              </div>
              {hud.frenzyActive && <div className="text-yellow-300 text-[10px] font-bold mt-1 animate-pulse">🍽️ FRENZY {hud.frenzyLeft}s</div>}
              {hud.zoneShrinking && <div className="text-red-400 text-[10px] font-bold mt-1 animate-pulse">⚠️ ZONA ENCOLHENDO</div>}
            </div>
            <div className="glass-panel p-3 rounded-xl min-w-[150px] md:min-w-[200px] flex flex-col gap-1 md:gap-2"><div className="text-center text-[10px] md:text-xs font-bold text-gray-400 tracking-widest mb-1">LEADERBOARD</div>{hud.top10.map((p, i) => <div key={i} className={`flex justify-between items-center text-[10px] md:text-sm ${p.isPlayer ? 'bg-cyan-900/50 rounded px-1' : ''}`}><div className="flex items-center gap-1 md:gap-2 overflow-hidden"><span className="text-gray-500 w-3 md:w-4">{i + 1}.</span><div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div><span className={`truncate w-16 md:w-24 ${p.isPlayer ? 'text-white font-bold' : 'text-gray-300'}`}>{p.name}</span></div><span className="font-display text-cyan-400">{p.score}</span></div>)}</div>
          </div>
          <div className="flex-1 flex justify-between items-end pb-24 md:pb-4"><div className="flex flex-col gap-2">{powerupsHUD.map(pu => <div key={pu.id} className="glass-panel p-2 rounded-lg flex items-center gap-2 md:gap-3"><div className="text-lg md:text-xl">{['🛡️', '⚡', '🧲', '🪙', '👻'][pu.id]}</div><div className="w-12 md:w-16 bg-gray-800 h-2 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${(pu.rem / (POWERUP_TYPES[pu.id].duration / 1000)) * 100}%`, backgroundColor: POWERUP_TYPES[pu.id].color }}></div></div><div className="text-[10px] md:text-xs font-bold w-4 text-right">{pu.rem}s</div></div>)}</div><div className="flex flex-col gap-1 items-end">{killFeed.map(k => <div key={k.id} className="glass-panel px-2 md:px-3 py-1 rounded text-xs md:text-sm flex items-center gap-2"><span>💀</span> <span style={{ color: k.color }}>{k.name}</span></div>)}</div></div>
          {/* Level Up Banner */}
          {levelUpDisplay.show && <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-30" style={{ animation: 'pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)' }}><div className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-500 drop-shadow-[0_0_30px_rgba(250,180,0,0.9)]">LEVEL UP!</div><div className="text-amber-300 text-xl md:text-3xl font-bold tracking-widest mt-1">⭐ Nível {levelUpDisplay.level}</div></div>}
          {/* Food Frenzy Banner */}
          {frenzyBanner && <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20" style={{ animation: 'pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)' }}><div className="text-4xl md:text-6xl font-display font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,200,0,0.8)]">🍽️ FOOD FRENZY!</div><div className="text-yellow-300 text-base md:text-xl font-bold tracking-widest mt-1">ORBES BÔNUS POR 12s!</div></div>}
          {/* Kill Streak Display */}
          {killStreakDisplay.active && killStreakDisplay.count >= 2 && <div className="absolute left-1/2 bottom-36 md:bottom-24 -translate-x-1/2 text-center pointer-events-none z-20"><div className={`text-2xl md:text-4xl font-display font-black italic ${killStreakDisplay.count >= 5 ? 'text-red-400' : 'text-orange-400'}`} style={{ textShadow: `0 0 20px ${killStreakDisplay.count >= 5 ? '#f87171' : '#fb923c'}` }}>{killStreakDisplay.count >= 5 ? '🔥' : '⚡'} {killStreakDisplay.count}x STREAK</div></div>}
          <div className="flex justify-between items-end"><div className="glass-panel px-3 md:px-4 py-2 rounded-xl text-lg md:text-xl font-display font-bold text-red-400">💀 {killCount}</div>{comboState.active && <div className="absolute left-1/2 bottom-32 md:bottom-20 -translate-x-1/2 text-center pointer-events-none" style={{ animation: 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}><div className={`text-4xl md:text-5xl font-display font-black italic ${comboState.count >= 10 ? 'text-yellow-400' : 'text-cyan-400'}`}>{comboState.count >= 10 ? '🔥 ULTRA' : `x${comboState.count}`}</div><div className="text-sm md:text-lg font-bold tracking-widest mt-1">COMBO</div></div>}<div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-cyan-800/50 bg-black/50 backdrop-blur flex items-center justify-center relative overflow-hidden hidden md:flex"><div className="absolute w-2 h-2 bg-white rounded-full"></div>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="absolute w-1 h-1 bg-red-500/50 rounded-full" style={{ top: `${randomRange(20, 80)}%`, left: `${randomRange(20, 80)}%` }}></div>)}</div></div>
        </div>
      )}

      {/* MOBILE & TABLET CONTROLS */}
      {gameState === 'playing' && (
        <div className="xl:hidden">
          <div id="joystick-base" className="absolute bottom-6 left-6 w-28 h-28 rounded-full border-2 border-cyan-500/30 bg-black/20 backdrop-blur z-20 pointer-events-auto"
            onTouchStart={(e) => { e.preventDefault(); const touch = e.touches[0]; engine.current.joystick.active = true; updateJoystick(touch); }}
            onTouchMove={(e) => { e.preventDefault(); updateJoystick(e.touches[0]); }}
            onTouchEnd={(e) => { e.preventDefault(); engine.current.joystick = { active: false, x: 0, y: 0, dx: 0, dy: 0 }; setJoystickPos({ x: 0, y: 0 }); }}>
            <div className="absolute w-10 h-10 bg-cyan-400/50 rounded-full shadow-[0_0_10px_cyan] pointer-events-none transition-transform"
              style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${joystickPos.x}px), calc(-50% + ${joystickPos.y}px))` }}></div>
          </div>
          <div className="absolute bottom-6 right-6 w-20 h-20 rounded-full border-2 border-yellow-500/50 bg-yellow-900/40 backdrop-blur z-20 pointer-events-auto flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(234,179,8,0.3)] active:scale-90 transition-transform"
            onTouchStart={(e) => { e.preventDefault(); if (engine.current.player) engine.current.player.isBoosting = true; }}
            onTouchEnd={(e) => { e.preventDefault(); if (engine.current.player) engine.current.player.isBoosting = false; }}>
            🚀
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"><div className="glass-panel p-6 md:p-8 rounded-2xl w-full max-w-md text-center border-red-500/30 border-t-4 border-t-red-500"><h2 className="text-4xl md:text-5xl font-display font-black text-red-500 mb-2">GAME OVER</h2>{gameOverStats.newRecord && <div className="text-yellow-400 font-bold animate-pulse mb-4 text-lg md:text-xl">🏆 NOVO RECORDE!</div>}<div className="space-y-3 md:space-y-4 my-6 md:my-8 text-base md:text-lg"><div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Comprimento Final</span><span className="font-display font-bold">{gameOverStats.score}</span></div><div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Nível Atingido</span><span className="font-display font-bold text-amber-400">⭐ {gameOverStats.level || 1}</span></div><div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Eliminações</span><span className="font-display font-bold text-red-400">💀 {gameOverStats.kills}</span></div><div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Moedas <span className="text-xs text-green-400">(+{Math.round(((gameOverStats.level || 1) * 10))}% bônus nível)</span></span><span className="font-display font-bold text-yellow-400">🪙 +{gameOverStats.coins}</span></div><div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Tempo</span><span className="font-display font-bold">{Math.floor(gameOverStats.time / 60)}m {gameOverStats.time % 60}s</span></div></div><button onClick={() => setGameState('lobby')} className="w-full py-3 md:py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold uppercase mb-4 transition">Voltar ao Lobby</button><button onClick={startGame} className="w-full py-3 md:py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-display text-lg md:text-xl font-bold uppercase transition hover:scale-105">Jogar Novamente</button></div></div>
      )}
    </div>
  );
}
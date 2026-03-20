import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// 🌍 CONSTANTES E CONFIGURAÇÕES
// ============================================================================
const WORLD_CENTER = 20000;
const MAX_WORLD_RADIUS = WORLD_CENTER - 500;
const BASE_WORLD_RADIUS = 3000;
const CELL_SIZE = 200;

const QUALITY_SETTINGS = {
  low: { id: 'low', shadows: false, bubbles: false, maxSegments: 35, particleMult: 0.3, dprMult: 0.6 },
  medium: { id: 'medium', shadows: false, bubbles: true, maxSegments: 80, particleMult: 0.7, dprMult: 1.0 },
  high: { id: 'high', shadows: true, bubbles: true, maxSegments: 150, particleMult: 1.0, dprMult: 1.0 }
};

const POWERUP_TYPES = [
  { id: 0, name: 'Escudo', color: '#06b6d4', duration: 8000 },
  { id: 1, name: 'Turbo', color: '#fde047', duration: 6000 },
  { id: 2, name: 'Ímã', color: '#a855f7', duration: 10000 },
  { id: 3, name: 'Moeda', color: '#fbbf24', duration: 0 }
];

// 📜 MISSÕES
const QUEST_TEMPLATES = [
  { id: 'eat_orbs', title: 'Comilão', desc: 'Come {target} orbes', targetRange: [50, 200], rewardBase: 10 },
  { id: 'kill_snakes', title: 'Predador', desc: 'Derrota {target} inimigos', targetRange: [2, 7], rewardBase: 25 },
  { id: 'survive_time', title: 'Sobrevivente', desc: 'Sobrevive {target}s', targetRange: [60, 180], rewardBase: 15 },
  { id: 'reach_score', title: 'Gigante', desc: 'Chega a {target} pts', targetRange: [2000, 8000], rewardBase: 20 },
];

// ============================================================================
// 🎨 SKINS E ACESSÓRIOS DEFINITIONS
// ============================================================================
const RARITY = { NORMAL: 0, RARE: 1, PREMIUM: 2, EPIC: 3 };
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
  { id: 'lich', name: 'Lich Neon', rarity: RARITY.EPIC, cost: 800, colors: ['#10b981', '#000000'], style: 'bone_neon' },
  { id: 'galaxy', name: 'Galáxia', rarity: RARITY.EPIC, cost: 1200, colors: ['#6366f1', '#ec4899', '#8b5cf6'], style: 'neon' },
];

const HATS = [
  { id: 'none', name: 'Nenhum', rarity: RARITY.NORMAL, cost: 0 },
  { id: 'cap', name: 'Boné', rarity: RARITY.NORMAL, cost: 40 },
  { id: 'hair_blonde', name: 'Cabelo Loiro', rarity: RARITY.RARE, cost: 80 },
  { id: 'mohawk', name: 'Moicano', rarity: RARITY.RARE, cost: 100 },
  { id: 'tophat', name: 'Cartola', rarity: RARITY.PREMIUM, cost: 200 },
  { id: 'pirate', name: 'Pirata', rarity: RARITY.PREMIUM, cost: 300 },
  { id: 'crown_gold', name: 'Coroa Imperial', rarity: RARITY.PREMIUM, cost: 500 },
  { id: 'halo', name: 'Halo Sagrado', rarity: RARITY.EPIC, cost: 1000 },
];

const MUSTACHES = [
  { id: 'none', name: 'Nenhum', rarity: RARITY.NORMAL, cost: 0 },
  { id: 'mustache_thin', name: 'Fino', rarity: RARITY.NORMAL, cost: 30 },
  { id: 'mustache_thick', name: 'Grosso', rarity: RARITY.RARE, cost: 60 },
  { id: 'beard', name: 'Cavanhaque', rarity: RARITY.RARE, cost: 80 },
  { id: 'monocle', name: 'Monóculo', rarity: RARITY.PREMIUM, cost: 150 },
  { id: 'sunglasses', name: 'Óculos Escuros', rarity: RARITY.PREMIUM, cost: 250 },
];

const MOUTHS = [
  { id: 'none', name: 'Nenhuma', rarity: RARITY.NORMAL, cost: 0 },
  { id: 'smile', name: 'Sorriso', rarity: RARITY.NORMAL, cost: 30 },
  { id: 'fangs', name: 'Presas', rarity: RARITY.RARE, cost: 80 },
  { id: 'sharp', name: 'Dentes Fiados', rarity: RARITY.RARE, cost: 120 },
  { id: 'lips', name: 'Lábios Premium', rarity: RARITY.PREMIUM, cost: 250 },
  { id: 'grillz', name: 'Grillz de Ouro', rarity: RARITY.EPIC, cost: 800 },
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
  sfxQuestComplete() { this.playTone(440, 880, 'sine', 0.5, 0.8); setTimeout(() => this.playTone(880, 1760, 'sine', 0.5, 0.8), 200); }
  sfxMultiKill(level) {
    const freqs = [300, 400, 500, 600, 800];
    this.playTone(freqs[Math.min(level, freqs.length - 1)], freqs[Math.min(level, freqs.length - 1)] * 1.5, 'square', 0.6, 0.8);
  }
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
  constructor(x, y, name, isPlayer, skinId, isGiant = false, hatId = 'none', mustacheId = 'none', mouthId = 'none', isPreview = false) {
    this.id = Math.random().toString(); this.name = name; this.isPlayer = isPlayer;
    this.skin = SKINS.find(s => s.id === skinId) || SKINS[0];
    this.hat = hatId; this.mustache = mustacheId; this.mouth = mouthId;
    this.isPreview = isPreview;
    this.x = x; this.y = y; this.angle = Math.random() * Math.PI * 2;
    this.score = isGiant ? Math.floor(randomRange(4000, 12000)) : (isPlayer ? 200 : 50);
    this.baseSpeed = 220; this.speed = this.baseSpeed;
    this.isBoosting = false; this.spawnTime = performance.now();
    this.isDead = false; this.kills = 0;
    this.activePowerups = {}; this.history = [{ x, y }]; this.segments = [];
    if (!isPlayer) { this.aiState = 'forage'; this.aiTarget = null; this.aiTimer = 0; }
    this.rank = 0;
  }

  get isInvulnerable() { return !this.isPreview && performance.now() - this.spawnTime < 3000; }
  get size() { return 15 + Math.sqrt(this.score) * 0.15; }
  get targetLength() { return Math.max(10, Math.floor(this.score / 15)); }

  update(dt, inputTarget, spatialHash, worldRadius, quality) {
    if (this.isDead) return [];
    let spawnedEntities = [];
    const now = performance.now();

    let speedMult = 1;
    if (this.activePowerups[1] && this.activePowerups[1] > now) speedMult = 3.5;

    const sizeRatio = Math.max(1, this.size / 15);
    const currentBaseSpeed = this.baseSpeed * Math.pow(sizeRatio, 0.85);

    if (this.isBoosting && this.score > 100 && !this.activePowerups[1]) {
      const dynamicBoostMult = 2.4 + (sizeRatio * 0.4);
      this.speed = currentBaseSpeed * dynamicBoostMult;
      this.score -= dt * (120 + this.size * 2.5);

      if (Math.random() < 0.4) {
        if (this.segments.length > 2) {
          const tail = this.segments[this.segments.length - 1];
          const scaleColor = this.skin.colors[Math.floor(Math.random() * this.skin.colors.length)];
          const dropOrb = new Orb(tail.x + randomRange(-15, 15), tail.y + randomRange(-15, 15), 5 + (this.size * 0.1), false, -1, scaleColor);
          dropOrb.droppedBy = this.id;
          dropOrb.dropTime = now;
          spawnedEntities.push({ type: 'orb', ent: dropOrb });
        }
      }
      if (quality.bubbles && Math.random() < 0.8) {
        const tail = this.segments.length > 0 ? this.segments[this.segments.length - 1] : this;
        const bub = new Particle(tail.x + randomRange(-20, 20), tail.y + randomRange(-20, 20), '#ffffff', 'bubble', this.isPlayer);
        bub.size = randomRange(3, 8);
        spawnedEntities.push({ type: 'particle', ent: bub });
      }
      if (this.isPlayer) audio.sfxBoost();
    } else {
      if (this.score <= 100) this.isBoosting = false;
      this.speed = currentBaseSpeed * speedMult;
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
    this.aiTimer -= dt;
    const headX = this.x; const headY = this.y;
    let targetX = headX + Math.cos(this.angle) * 100;
    let targetY = headY + Math.sin(this.angle) * 100;
    this.isBoosting = false;

    let obstacleRepulsionX = 0;
    let obstacleRepulsionY = 0;

    const dCenterSq = distSq(headX, headY, WORLD_CENTER, WORLD_CENTER);
    if (dCenterSq > (worldRadius - 800) ** 2) {
      targetX = WORLD_CENTER; targetY = WORLD_CENTER;
    } else {
      const visionRadius = 1200 + globalEvolution * 40;
      const nearby = spatialHash.getNearby(headX, headY, visionRadius);

      let nearestThreat = null; let threatDist = Infinity;
      let bestFood = null; let bestFoodScore = -Infinity;

      if (this.aiState === 'hunt' && (!this.aiTarget || this.aiTarget.isDead || distSq(headX, headY, this.aiTarget.x, this.aiTarget.y) > visionRadius * visionRadius * 1.5)) {
        this.aiState = 'forage';
        this.aiTarget = null;
      }

      for (const ent of nearby) {
        if (ent === this) continue;
        const dSq = distSq(headX, headY, ent.x, ent.y);

        if (ent instanceof Snake && !ent.isInvulnerable) {
          if (dSq < visionRadius * visionRadius) {
            for (let i = 0; i < ent.segments.length; i += 2) {
              const seg = ent.segments[i];
              const dSeg = distSq(headX, headY, seg.x, seg.y);
              if (dSeg < (this.size * 3.8) ** 2) {
                const distVal = Math.sqrt(dSeg);
                obstacleRepulsionX += (headX - seg.x) / distVal;
                obstacleRepulsionY += (headY - seg.y) / distVal;
              }
            }
          }

          if (ent.score > this.score * 1.3) {
            for (let i = 0; i < ent.segments.length; i += 3) {
              const seg = ent.segments[i]; const dSeg = distSq(headX, headY, seg.x, seg.y);
              if (dSeg < threatDist) { threatDist = dSeg; nearestThreat = ent; }
            }
          } else if (this.aiState !== 'flee' && this.aiTimer <= 0) {
            const huntChance = 0.05 + (globalEvolution * 0.01);
            if (dSq < (visionRadius * 0.8) ** 2 && Math.random() < huntChance) {
              this.aiState = 'hunt';
              this.aiTarget = ent;
              this.aiTimer = randomRange(2, 5);
            }
          }
        } else if (ent instanceof Orb || ent instanceof Starfish) {
          const fScore = ((ent.value || 10) ** 2) / (dSq + 1);
          if (fScore > bestFoodScore) { bestFoodScore = fScore; bestFood = ent; }
        }
      }

      if (obstacleRepulsionX !== 0 || obstacleRepulsionY !== 0) {
        targetX += obstacleRepulsionX * 400;
        targetY += obstacleRepulsionY * 400;
      } else if (nearestThreat && threatDist < 600 * 600) {
        this.aiState = 'flee';
        const angleAway = Math.atan2(headY - nearestThreat.y, headX - nearestThreat.x);
        targetX = headX + Math.cos(angleAway) * 400; targetY = headY + Math.sin(angleAway) * 400;
        if (threatDist < 400 * 400 && this.score > 250) this.isBoosting = true;
      } else if (this.aiState === 'hunt' && this.aiTarget) {
        const tHeadX = this.aiTarget.x; const tHeadY = this.aiTarget.y;
        const distToTarget = dist(headX, headY, tHeadX, tHeadY);
        const lookAhead = Math.min(1.5, distToTarget / this.speed);
        const predictX = tHeadX + Math.cos(this.aiTarget.angle) * this.aiTarget.speed * lookAhead;
        const predictY = tHeadY + Math.sin(this.aiTarget.angle) * this.aiTarget.speed * lookAhead;
        targetX = predictX; targetY = predictY;
        if (distToTarget > 150 && distToTarget < 800 && this.score > 300) {
          const angleToPred = Math.atan2(predictY - headY, predictX - headX);
          let angleDiff = Math.abs(this.angle - angleToPred);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          if (Math.abs(angleDiff) < 0.8) this.isBoosting = true;
        }
      } else {
        this.aiState = 'forage';
        if (bestFood) {
          targetX = bestFood.x; targetY = bestFood.y;
          if (bestFood.value > 12 && distSq(headX, headY, bestFood.x, bestFood.y) < 700 * 700 && this.score > 150) {
            const angleToFood = Math.atan2(bestFood.y - headY, bestFood.x - headX);
            let angleDiff = Math.abs(this.angle - angleToFood);
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (Math.abs(angleDiff) < 1.0) this.isBoosting = true;
          }
        } else if (this.aiTimer <= 0) {
          this.aiTimer = randomRange(1, 3);
          const rAngle = this.angle + randomRange(-Math.PI / 3, Math.PI / 3);
          targetX = headX + Math.cos(rAngle) * 400; targetY = headY + Math.sin(rAngle) * 400;
        }
      }
    }
    return { x: targetX, y: targetY };
  }

  draw(ctx, quality) {
    const isInvuln = this.isInvulnerable;
    const isBlinking = isInvuln && Math.floor(performance.now() / 150) % 2 === 0;
    if (isInvuln) ctx.globalAlpha = isBlinking ? 0.4 : 0.75;

    const sz = this.size; const colors = this.skin.colors; const now = performance.now();
    const isKing = this.rank === 1 && this.score > 500;

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

    if (this.mouth !== 'none') {
      ctx.save();
      if (this.mouth === 'smile') {
        ctx.strokeStyle = '#000'; ctx.lineWidth = sz * 0.08; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(sz * 0.75, 0, sz * 0.35, -Math.PI / 3, Math.PI / 3); ctx.stroke();
      } else if (this.mouth === 'fangs') {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(sz * 0.75, -sz * 0.2); ctx.lineTo(sz * 1.05, -sz * 0.05); ctx.lineTo(sz * 0.75, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sz * 0.75, sz * 0.2); ctx.lineTo(sz * 1.05, sz * 0.05); ctx.lineTo(sz * 0.75, 0); ctx.fill();
      } else if (this.mouth === 'sharp') {
        ctx.fillStyle = '#fff';
        for (let j = -1; j <= 1; j++) {
          ctx.beginPath(); ctx.moveTo(sz * 0.8, j * sz * 0.18); ctx.lineTo(sz * 1.0, j * sz * 0.18 - sz * 0.08); ctx.lineTo(sz * 0.8, j * sz * 0.18 - sz * 0.12); ctx.fill();
        }
      } else if (this.mouth === 'lips') {
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.ellipse(sz * 0.85, 0, sz * 0.12, sz * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#991b1b'; ctx.lineWidth = sz * 0.04; ctx.beginPath(); ctx.moveTo(sz * 0.8, -sz * 0.25); ctx.lineTo(sz * 0.8, sz * 0.25); ctx.stroke();
      } else if (this.mouth === 'grillz') {
        ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = Math.max(1, sz * 0.04);
        ctx.beginPath(); ctx.roundRect(sz * 0.78, -sz * 0.25, sz * 0.12, sz * 0.5, sz * 0.05); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sz * 0.78, 0); ctx.lineTo(sz * 0.9, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sz * 0.84, -sz * 0.25); ctx.lineTo(sz * 0.84, sz * 0.25); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sz * 0.84, -sz * 0.12, sz * 0.04, 0, Math.PI * 2); ctx.fill();
      }
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
    if (this.hat !== 'none') {
      ctx.save();
      if (this.hat === 'mohawk') { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = sz * 0.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-sz * 0.8, 0); ctx.lineTo(sz * 0.6, 0); ctx.stroke(); }
      else if (this.hat === 'tophat') { ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.7, sz * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = sz * 0.15; ctx.beginPath(); ctx.arc(-sz * 0.1, 0, sz * 0.5, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.arc(-sz * 0.1, 0, sz * 0.45, 0, Math.PI * 2); ctx.fill(); }
      else if (this.hat === 'crown_gold') { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = sz * 0.25; ctx.setLineDash([sz * 0.4, sz * 0.2]); ctx.beginPath(); ctx.arc(0, 0, sz * 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      else if (this.hat === 'pirate') { ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(0, -sz * 1.2); ctx.quadraticCurveTo(-sz * 0.8, 0, 0, sz * 1.2); ctx.quadraticCurveTo(sz * 0.8, 0, 0, -sz * 1.2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.15, 0, Math.PI * 2); ctx.fill(); }
      else if (this.hat === 'hair_blonde') { ctx.fillStyle = '#fde047'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(-sz * 0.3, 0, sz * 0.8, Math.PI / 2, -Math.PI / 2); ctx.fill(); ctx.beginPath(); ctx.arc(-sz * 0.5, sz * 0.5, sz * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-sz * 0.5, -sz * 0.5, sz * 0.5, 0, Math.PI * 2); ctx.fill(); }
      else if (this.hat === 'cap') { ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(-sz * 0.2, 0, sz * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(sz * 0.3, 0, sz * 0.4, -Math.PI / 2, Math.PI / 2); ctx.fill(); }
      else if (this.hat === 'halo') { ctx.strokeStyle = '#fde047'; ctx.lineWidth = sz * 0.2; ctx.shadowBlur = 15; ctx.shadowColor = '#fde047'; ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.9, sz * 0.4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
      ctx.restore();
    }

    if (this.activePowerups[0] && this.activePowerups[0] > performance.now()) { ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 4; ctx.shadowBlur = 10; ctx.shadowColor = '#06b6d4'; ctx.beginPath(); ctx.arc(0, 0, sz * 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }

    // Animação do Escudo de Spawn Protection (Invulnerabilidade)
    if (isInvuln) {
      ctx.save();
      ctx.rotate(-this.angle + now / 400);
      ctx.strokeStyle = `rgba(255, 255, 255, ${isBlinking ? 0.9 : 0.4})`;
      ctx.lineWidth = Math.max(2, sz * 0.1);
      ctx.setLineDash([sz * 0.4, sz * 0.4]);
      ctx.beginPath(); ctx.arc(0, 0, sz * 1.6, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    if (quality.shadows || this.isPlayer) {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `bold ${Math.max(12, sz * 0.6)}px sans-serif`; ctx.textAlign = 'center'; const nameY = this.y - sz * 1.6; ctx.fillText(this.name, this.x, nameY);

      const drawJewel = (jx, jy, c1, jr) => {
        ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2); ctx.fill();
      };

      if (isKing) {
        ctx.save(); ctx.translate(this.x, nameY - sz * 1.1); const crownScale = Math.max(1.0, Math.min(2.0, sz / 15)); ctx.scale(crownScale, crownScale);
        if (quality.shadows) { ctx.shadowBlur = 15; ctx.shadowColor = '#fbbf24'; }
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-18, -12); ctx.lineTo(-6, -6); ctx.lineTo(0, -16); ctx.lineTo(6, -6); ctx.lineTo(18, -12); ctx.lineTo(12, 0); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.15)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 3, 0, 0, Math.PI * 2); ctx.stroke();
        drawJewel(0, -16, '#fff', 1.5); drawJewel(-18, -12, '#fff', 1); drawJewel(18, -12, '#fff', 1);
        ctx.restore();
      } else if (this.rank === 2) {
        ctx.save(); ctx.translate(this.x, nameY - sz * 0.8); const crownScale = Math.max(0.8, Math.min(1.5, sz / 18)); ctx.scale(crownScale, crownScale);
        if (quality.shadows) { ctx.shadowBlur = 10; ctx.shadowColor = '#e5e7eb'; }
        ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-14, -8); ctx.lineTo(-5, -4); ctx.lineTo(0, -12); ctx.lineTo(5, -4); ctx.lineTo(14, -8); ctx.lineTo(10, 0); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = 'rgba(243, 244, 246, 0.15)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, 10, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (this.rank === 3) {
        ctx.save(); ctx.translate(this.x, nameY - sz * 0.7); const crownScale = Math.max(0.7, Math.min(1.3, sz / 20)); ctx.scale(crownScale, crownScale);
        if (quality.shadows) { ctx.shadowBlur = 8; ctx.shadowColor = '#f59e0b'; }
        ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 1; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-10, -6); ctx.lineTo(0, -8); ctx.lineTo(10, -6); ctx.lineTo(8, 0); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = 'rgba(252, 211, 77, 0.1)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }
}

// ============================================================================
// 🐍 LIVE PREVIEW RENDERER
// ============================================================================
const LiveSnakePreview = ({ skinId, hatId, mustacheId, mouthId, active, isFaceTab }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const s = new Snake(50, 50, '', false, skinId, false, hatId, mustacheId, mouthId, true);
    s.score = 400;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();

      s.segments = [];
      for (let i = 0; i < 8; i++) {
        s.segments.push({
          x: 50 + Math.sin(now / 250 - i * 0.5) * 6 * (active ? 1 : 0.3),
          y: (isFaceTab ? 65 : 45) + i * 11,
          angle: -Math.PI / 2 + Math.cos(now / 250 - i * 0.5) * 0.15 * (active ? 1 : 0.3)
        });
      }
      s.x = s.segments[0].x;
      s.y = s.segments[0].y;
      s.angle = s.segments[0].angle;

      ctx.save();
      if (isFaceTab) {
        ctx.translate(50, 50);
        ctx.scale(1.45, 1.45);
        ctx.translate(-50, -50);
      }
      s.draw(ctx, { shadows: true, maxSegments: 10 });
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(animationId);
  }, [skinId, hatId, mustacheId, mouthId, active, isFaceTab]);

  return <canvas ref={canvasRef} width={100} height={100} className="w-16 h-16 md:w-24 md:h-24 drop-shadow-2xl pointer-events-none" />;
};

// ============================================================================
// 🎮 COMPONENTE PRINCIPAL
// ============================================================================
export default function App() {
  const [gameState, setGameState] = useState('lobby');
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [settings, setSettings] = useState({ bgm: true, sfx: true, quality: 'medium', autoQuality: true });
  const [playerName, setPlayerName] = useState('Player');

  const [lobbyTab, setLobbyTab] = useState('skins');
  const [unlockedSkins, setUnlockedSkins] = useState(['cyclops']);
  const [unlockedHats, setUnlockedHats] = useState(['none']);
  const [unlockedMustaches, setUnlockedMustaches] = useState(['none']);
  const [unlockedMouths, setUnlockedMouths] = useState(['none']);

  const [selectedSkinId, setSelectedSkinId] = useState('cyclops');
  const [selectedHat, setSelectedHat] = useState('none');
  const [selectedMustache, setSelectedMustache] = useState('none');
  const [selectedMouth, setSelectedMouth] = useState('none');

  const [hud, setHud] = useState({ length: 0, rank: 0, totalPlayers: 0, sessionCoins: 0, top10: [], fps: 60, quality: 'high' });
  const [powerupsHUD, setPowerupsHUD] = useState([]);
  const [killCount, setKillCount] = useState(0);
  const [comboState, setComboState] = useState({ count: 0, active: false });
  const [killFeed, setKillFeed] = useState([]);
  const [dangerZone, setDangerZone] = useState(false);
  const [gameOverStats, setGameOverStats] = useState({});
  const [showSettings, setShowSettings] = useState(false);

  const [activeQuests, setActiveQuests] = useState([]);
  const [completedQuestsQueue, setCompletedQuestsQueue] = useState([]);
  const [streakMessage, setStreakMessage] = useState(null);

  const canvasRef = useRef(null);
  const carouselRef = useRef(null);
  const joystickRef = useRef(null);
  const engine = useRef({
    snakes: [], orbs: [], starfish: [], particles: [], critters: [],
    player: null, camera: { x: WORLD_CENTER, y: WORLD_CENTER, zoom: 1, shake: 0 },
    worldRadius: BASE_WORLD_RADIUS, spatialHash: new SpatialHash(CELL_SIZE), lastTime: 0,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false },
    joystick: { active: false, x: 0, y: 0, dx: 0, dy: 0 },
    globalAI: { generation: 1, deaths: 0 },
    combo: { count: 0, lastTime: 0, active: false, lastCount: 0 },
    quests: [], stats: { orbsEaten: 0 },
    streak: { count: 0, lastKillTime: 0 },
    sessionCoins: 0, sessionKills: 0, sessionMaxScore: 0, startTime: 0,
    isPlaying: false, settings: { quality: 'high', autoQuality: true }, highScore: 0,
    isGameOverSequence: false, gameOverTime: 0,
    fps: { frames: 0, lastTime: performance.now(), value: 60, history: [] }
  });

  useEffect(() => { engine.current.settings.quality = settings.quality; }, [settings]);
  useEffect(() => { engine.current.highScore = highScore; }, [highScore]);

  useEffect(() => {
    const sCoins = localStorage.getItem('ocean_coins'); if (sCoins) setCoins(parseInt(sCoins));
    const sHS = localStorage.getItem('ocean_highscore'); if (sHS) setHighScore(parseInt(sHS));
    const sSkins = localStorage.getItem('ocean_unlocked_skins'); if (sSkins) setUnlockedSkins(JSON.parse(sSkins));
    const sHats = localStorage.getItem('ocean_unlocked_hats'); if (sHats) setUnlockedHats(JSON.parse(sHats));
    const sMus = localStorage.getItem('ocean_unlocked_mustaches'); if (sMus) setUnlockedMustaches(JSON.parse(sMus));
    const sMou = localStorage.getItem('ocean_unlocked_mouths'); if (sMou) setUnlockedMouths(JSON.parse(sMou));
    const sSelHat = localStorage.getItem('ocean_sel_hat'); if (sSelHat) setSelectedHat(sSelHat);
    const sSelMus = localStorage.getItem('ocean_sel_mustache'); if (sSelMus) setSelectedMustache(sSelMus);
    const sSelMou = localStorage.getItem('ocean_sel_mouth'); if (sSelMou) setSelectedMouth(sSelMou);
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
      else if (type === 'mouths') { const nm = [...unlockedMouths, item.id]; setUnlockedMouths(nm); localStorage.setItem('ocean_unlocked_mouths', JSON.stringify(nm)); setSelectedMouth(item.id); localStorage.setItem('ocean_sel_mouth', item.id); }
    }
  };
  const selectItem = (item, type) => {
    if (type === 'skins') { setSelectedSkinId(item.id); localStorage.setItem('ocean_sel_skin', item.id); }
    else if (type === 'hats') { setSelectedHat(item.id); localStorage.setItem('ocean_sel_hat', item.id); }
    else if (type === 'mustaches') { setSelectedMustache(item.id); localStorage.setItem('ocean_sel_mustache', item.id); }
    else if (type === 'mouths') { setSelectedMouth(item.id); localStorage.setItem('ocean_sel_mouth', item.id); }
  };

  useEffect(() => {
    const preventDefaultTouch = (e) => {
      if (gameState === 'playing' && e.target.tagName === 'CANVAS') e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    // JOYSTICK NON-PASSIVE LISTENERS
    const jBase = joystickRef.current;
    if (jBase) {
      const handleTouchStart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        engine.current.joystick.active = true;
        updateJoystick(touch);
      };
      const handleTouchMove = (e) => {
        e.preventDefault();
        updateJoystick(e.touches[0]);
      };
      const handleTouchEnd = (e) => {
        e.preventDefault();
        engine.current.joystick = { active: false, x: 0, y: 0, dx: 0, dy: 0 };
      };
      jBase.addEventListener('touchstart', handleTouchStart, { passive: false });
      jBase.addEventListener('touchmove', handleTouchMove, { passive: false });
      jBase.addEventListener('touchend', handleTouchEnd, { passive: false });
      return () => {
        document.removeEventListener('touchmove', preventDefaultTouch);
        jBase.removeEventListener('touchstart', handleTouchStart);
        jBase.removeEventListener('touchmove', handleTouchMove);
        jBase.removeEventListener('touchend', handleTouchEnd);
      };
    }

    return () => document.removeEventListener('touchmove', preventDefaultTouch);
  }, [gameState]);

  useEffect(() => {
    const handleMouseMove = (e) => { engine.current.mouse = { x: e.clientX, y: e.clientY, active: true }; };
    const handleMouseDown = (e) => {
      if (e.target.tagName === 'BUTTON') return;
      engine.current.mouse.active = true;
      if (engine.current.player) engine.current.player.isBoosting = true;
    };
    const handleMouseUp = (e) => { if (engine.current.player) engine.current.player.isBoosting = false; };
    const handleKeyDown = (e) => { if (e.code === 'Space' && engine.current.player) engine.current.player.isBoosting = true; };
    const handleKeyUp = (e) => { if (e.code === 'Space' && engine.current.player) engine.current.player.isBoosting = false; };
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mousedown', handleMouseDown); window.addEventListener('mouseup', handleMouseUp); window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mousedown', handleMouseDown); window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  const spawnOrbs = (x, y, amount, valuePerOrb, specificColor = null) => { for (let i = 0; i < amount; i++) { const o = new Orb(x + randomRange(-50, 50), y + randomRange(-50, 50), valuePerOrb, false, -1, specificColor); engine.current.orbs.push(o); } };
  const addKillFeed = (name, color, isKing = false) => { const id = Date.now() + Math.random(); setKillFeed(prev => [...prev.slice(-2), { id, name, color, isKing }]); setTimeout(() => setKillFeed(prev => prev.filter(k => k.id !== id)), 3500); };

  const showStreak = (level) => {
    const messages = ['DOUBLE KILL!', 'TRIPLE KILL!!', 'M-M-MONSTER KILL!!', 'RAMPAGE!!!'];
    const msg = messages[Math.min(level - 2, messages.length - 1)];
    setStreakMessage({ text: msg, id: Date.now() });
    setTimeout(() => setStreakMessage(null), 2500);
    audio.sfxMultiKill(level - 2);
  };

  const generateQuests = () => {
    let shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(q => {
      const target = Math.floor(randomRange(q.targetRange[0], q.targetRange[1]));
      return { ...q, target, current: 0, reward: q.rewardBase + Math.floor(target / 10), completed: false };
    });
  };

  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };

  const startGame = () => {
    enterFullscreen();
    audio.init(); if (settings.bgm) audio.setBGM(true);
    const e = engine.current; e.snakes = []; e.orbs = []; e.starfish = []; e.particles = []; e.critters = []; e.spatialHash.clear(); e.worldRadius = BASE_WORLD_RADIUS; e.globalAI = { generation: 1, deaths: 0 }; e.sessionCoins = 0; e.sessionKills = 0; e.sessionMaxScore = 0; e.startTime = performance.now(); e.isPlaying = true; e.isGameOverSequence = false;
    e.camera.shake = 0; e.stats.orbsEaten = 0; e.streak = { count: 0, lastKillTime: 0 };
    e.quests = generateQuests(); setActiveQuests(e.quests); setCompletedQuestsQueue([]);

    e.player = new Snake(WORLD_CENTER, WORLD_CENTER, playerName || 'Player', true, selectedSkinId, false, selectedHat, selectedMustache, selectedMouth); e.snakes.push(e.player);
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

    e.fps.frames++;
    if (now - e.fps.lastTime >= 1000) {
      e.fps.value = e.fps.frames;
      e.fps.history.push(e.fps.value);
      if (e.fps.history.length > 5) e.fps.history.shift();
      e.fps.frames = 0;
      e.fps.lastTime = now;

      if (e.settings.autoQuality) {
        const avgFps = e.fps.history.reduce((a, b) => a + b, 0) / e.fps.history.length;
        if (e.fps.history.length >= 3) {
          if (avgFps < 45 && e.settings.quality !== 'low') {
            e.settings.quality = e.settings.quality === 'high' ? 'medium' : 'low';
            e.fps.history = [];
          } else if (avgFps >= 58 && e.settings.quality !== 'high' && e.fps.history.length >= 5) {
            e.settings.quality = e.settings.quality === 'low' ? 'medium' : 'high';
            e.fps.history = [];
          }
        }
      }
    }

    const quality = QUALITY_SETTINGS[e.settings.quality];
    const maxScore = Math.max(...e.snakes.map(s => s.score)); const targetRadius = Math.min(MAX_WORLD_RADIUS, BASE_WORLD_RADIUS + (e.snakes.length * 50) + (maxScore * 0.1));
    e.worldRadius = lerp(e.worldRadius, targetRadius, dt * 0.5);

    if (e.streak.count > 0 && now - e.streak.lastKillTime > 5000) { e.streak.count = 0; }

    if (p && !p.isDead) {
      let questsUpdated = false;
      e.quests.forEach(q => {
        if (q.completed) return;
        if (q.id === 'eat_orbs' && q.current !== e.stats.orbsEaten) { q.current = e.stats.orbsEaten; questsUpdated = true; }
        if (q.id === 'kill_snakes' && q.current !== e.sessionKills) { q.current = e.sessionKills; questsUpdated = true; }
        if (q.id === 'survive_time') { const secs = Math.floor((now - e.startTime) / 1000); if (q.current !== secs) { q.current = secs; questsUpdated = true; } }
        if (q.id === 'reach_score') { const score = Math.floor(p.score / 10); if (score > q.current) { q.current = score; questsUpdated = true; } }

        if (q.current >= q.target && !q.completed) {
          q.completed = true; questsUpdated = true;
          e.sessionCoins += q.reward; audio.sfxQuestComplete();
          setCompletedQuestsQueue(prev => [...prev, q]);
          setTimeout(() => setCompletedQuestsQueue(prev => prev.filter(cq => cq.id !== q.id)), 4000);
          const pCount = Math.floor(20 * quality.particleMult);
          for (let k = 0; k < pCount; k++) e.particles.push(new Particle(p.x, p.y, '#fbbf24'));
        }
      });
      if (questsUpdated && timestamp % 30 < 10) setActiveQuests([...e.quests]);
    }

    if (e.snakes.length < 35 && Math.random() < 0.05) {
      const angle = Math.random() * Math.PI * 2; const r = randomRange(0, e.worldRadius * 0.8); const isGiant = Math.random() < 0.15; const randomSkin = SKINS[Math.floor(Math.random() * SKINS.length)].id;
      const randomHat = Math.random() < 0.2 ? HATS[Math.floor(Math.random() * HATS.length)].id : 'none';
      const randomMustache = Math.random() < 0.2 ? MUSTACHES[Math.floor(Math.random() * MUSTACHES.length)].id : 'none';
      const randomMouth = Math.random() < 0.2 ? MOUTHS[Math.floor(Math.random() * MOUTHS.length)].id : 'none';
      e.snakes.push(new Snake(WORLD_CENTER + Math.cos(angle) * r, WORLD_CENTER + Math.sin(angle) * r, getUniqueBotName(e.snakes.map(s => s.name)), false, randomSkin, isGiant, randomHat, randomMustache, randomMouth));
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
          const maxReach = (other.targetLength * other.size) + 800; if (distSq(s.x, s.y, other.x, other.y) > maxReach * maxReach) continue;
          for (let j = 0; j < other.segments.length; j += 2) {
            const seg = other.segments[j]; const colDistSq = (s.size * 0.75 + other.size * 0.75) ** 2;
            if (distSq(s.x, s.y, seg.x, seg.y) < colDistSq) {
              if (s.activePowerups[0] && s.activePowerups[0] > now) {
                s.activePowerups[0] = 0; s.angle += Math.PI; s.spawnTime = now; audio.sfxShieldBreak();
                const pCount = Math.floor(10 * quality.particleMult);
                for (let k = 0; k < pCount; k++) e.particles.push(new Particle(s.x, s.y, '#06b6d4'));
                e.camera.shake = 10;
              }
              else {
                s.isDead = true; other.kills++;
                const isKing = s.rank === 1 && s.score > 500;
                if (other === p) {
                  e.sessionKills++; setKillCount(e.sessionKills);

                  e.streak.count++; e.streak.lastKillTime = now;
                  if (e.streak.count >= 2) showStreak(e.streak.count);

                  e.camera.shake = 15;
                  e.sessionCoins += isKing ? 25 : 5;
                  addKillFeed(s.name, s.skin.colors[0], isKing);
                  audio.sfxCoin();
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
        const pCount = Math.floor(40 * quality.particleMult);
        for (let k = 0; k < pCount; k++) { const explodeColor = s.skin.colors[k % 2 === 0 ? 0 : (s.skin.colors[1] ? 1 : 0)]; const pt = new Particle(s.x, s.y, explodeColor, 'solid', true); pt.vx *= 2.5; pt.vy *= 2.5; e.particles.push(pt); }
        if (!s.isPlayer) { e.globalAI.deaths++; if (e.globalAI.deaths % 20 === 0) e.globalAI.generation++; }
        else { if (!e.isGameOverSequence) { e.isGameOverSequence = true; e.camera.shake = 30; e.gameOverTime = now; const finalScore = Math.floor(p.score / 10); const isNewRecord = finalScore > e.highScore; if (isNewRecord) { setHighScore(finalScore); localStorage.setItem('ocean_highscore', finalScore); e.highScore = finalScore; } saveCoin(e.sessionCoins); setGameOverStats({ score: finalScore, coins: e.sessionCoins, kills: e.sessionKills, time: Math.floor((now - e.startTime) / 1000), newRecord: isNewRecord }); } }
        e.snakes.splice(i, 1);
      }
    }

    const playerMagnet = (p && !p.isDead && p.activePowerups[2] && p.activePowerups[2] > now) ? 350 : (p && !p.isDead ? p.size * 2.2 : 0);

    for (let i = e.orbs.length - 1; i >= 0; i--) {
      const o = e.orbs[i];
      if (!o.target) {
        let pCanEat = !(o.droppedBy === p?.id && (now - o.dropTime) < 1500);

        if (pCanEat && p && !p.isDead && distSq(p.x, p.y, o.x, o.y) < playerMagnet * playerMagnet) o.target = p;
        else {
          for (const s of e.snakes) {
            if (s === p || s.isDead) continue;
            let sCanEat = !(o.droppedBy === s.id && (now - o.dropTime) < 1500);
            if (sCanEat && distSq(s.x, s.y, o.x, o.y) < (s.size * 2.2) ** 2) { o.target = s; break; }
          }
        }
      }
      if (!o.update(dt, e.worldRadius)) {
        if (o.target && !o.target.isDead) {
          const s = o.target;
          if (s === p) {
            if (o.isPowerup) { audio.sfxPowerup(); if (o.puType === 3) { e.sessionCoins++; audio.sfxCoin(); } else p.activePowerups[o.puType] = now + POWERUP_TYPES[o.puType].duration; }
            else { e.stats.orbsEaten++; p.score += o.value; audio.sfxPop(); if (now - e.combo.lastTime < 400) e.combo.count++; else e.combo.count = 1; e.combo.lastTime = now; if (e.combo.count >= 10) p.score += o.value; }
          } else {
            if (!o.isPowerup) s.score += o.value;
          }
        }
        e.orbs.splice(i, 1);
      }
    }

    for (let i = e.starfish.length - 1; i >= 0; i--) {
      const sf = e.starfish[i];
      if (!sf.target) {
        if (p && !p.isDead && distSq(p.x, p.y, sf.x, sf.y) < playerMagnet * playerMagnet) sf.target = p;
        else {
          for (const s of e.snakes) {
            if (s === p || s.isDead) continue;
            if (distSq(s.x, s.y, sf.x, sf.y) < (s.size * 2.2) ** 2) { sf.target = s; break; }
          }
        }
      }
      if (!sf.update(dt, e.worldRadius)) {
        if (sf.target && !sf.target.isDead) {
          const s = sf.target;
          s.score += sf.value;
          if (s === p) {
            audio.sfxPop();
            const pCount = Math.floor(5 * quality.particleMult);
            for (let k = 0; k < pCount; k++) e.particles.push(new Particle(p.x, p.y, sf.color));
          }
        }
        e.starfish.splice(i, 1);
      }
    }

    for (let i = e.critters.length - 1; i >= 0; i--) { if (!e.critters[i].update(dt, e.snakes, e.worldRadius, e.particles)) e.critters.splice(i, 1); }
    e.particles = e.particles.filter(p => p.update(dt));

    const baseDpr = window.devicePixelRatio || 1;
    const dpr = Math.min(baseDpr, 2.0) * quality.dprMult;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    if (e.camera.shake > 0) e.camera.shake = Math.max(0, e.camera.shake - dt * 40);

    if (p && !p.isDead) {
      const baseLookAhead = p.isBoosting ? 300 : 150; const sizeMultiplier = 1 + (p.size / 100); const lookAhead = baseLookAhead * sizeMultiplier;
      let targetCamX = p.x + Math.cos(p.angle) * lookAhead; let targetCamY = p.y + Math.sin(p.angle) * lookAhead;
      let targetZoom = 1.2 - (p.size * 0.006); targetZoom = Math.max(0.4, Math.min(1.2, targetZoom));
      if (p.isBoosting) targetZoom *= 0.85;
      let threatFactor = 0; for (const other of e.snakes) { if (other !== p && !other.isDead && other.score > p.score * 1.2) { const dSq = distSq(p.x, p.y, other.x, other.y); if (dSq < 1000 * 1000) { threatFactor = Math.max(threatFactor, 1 - (Math.sqrt(dSq) / 1000)); } } }
      targetZoom *= (1 - (threatFactor * 0.15)); targetZoom = Math.max(0.3, targetZoom); targetZoom += Math.sin(now / 2000) * 0.01;
      e.camera.x = lerp(e.camera.x, targetCamX, dt * 4.0); e.camera.y = lerp(e.camera.y, targetCamY, dt * 4.0); e.camera.zoom = lerp(e.camera.zoom, targetZoom, dt * 2.0);
    } else if (p && p.isDead && e.isGameOverSequence) e.camera.zoom = lerp(e.camera.zoom, 1.3, dt * 0.8);

    ctx.fillStyle = '#020c18'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    let shakeX = 0; let shakeY = 0;
    if (e.camera.shake > 0) { shakeX = (Math.random() - 0.5) * e.camera.shake; shakeY = (Math.random() - 0.5) * e.camera.shake; }

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

    const snakesByScore = [...e.snakes].sort((a, b) => b.score - a.score); snakesByScore.forEach((s, idx) => s.rank = idx + 1);

    for (const o of e.orbs) if (inView(o.x, o.y)) o.draw(ctx, quality);
    for (const sf of e.starfish) if (inView(sf.x, sf.y)) sf.draw(ctx, quality);
    for (const c of e.critters) if (inView(c.x, c.y)) c.draw(ctx, quality);
    for (const pt of e.particles) if (inView(pt.x, pt.y)) pt.draw(ctx);
    for (const s of [...snakesByScore].reverse()) { const margin = s.targetLength * s.size + 150; if (s.x > viewMinX - margin && s.x < viewMaxX + margin && s.y > viewMinY - margin && s.y < viewMaxY + margin) s.draw(ctx, quality); }
    ctx.restore();

    if (timestamp % 250 < 20 && p && !p.isDead) {
      e.sessionMaxScore = Math.max(e.sessionMaxScore, p.score); const sortedTop = [...e.snakes].sort((a, b) => b.score - a.score); const pRank = sortedTop.findIndex(s => s === p) + 1;
      setHud({
        length: Math.floor(p.score / 10), rank: pRank, totalPlayers: e.snakes.length, sessionCoins: e.sessionCoins,
        top10: sortedTop.slice(0, 10).map(s => ({ name: s.name, score: Math.floor(s.score / 10), color: s.skin.colors[0], isPlayer: s === p })),
        fps: e.fps.value, quality: e.settings.quality
      });
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
  };

  const getLobbyData = () => {
    if (lobbyTab === 'skins') return { items: SKINS, unlocked: unlockedSkins, selected: selectedSkinId };
    if (lobbyTab === 'hats') return { items: HATS, unlocked: unlockedHats, selected: selectedHat };
    if (lobbyTab === 'mustaches') return { items: MUSTACHES, unlocked: unlockedMustaches, selected: selectedMustache };
    return { items: MOUTHS, unlocked: unlockedMouths, selected: selectedMouth };
  };

  const ItemPreview = ({ item, active }) => {
    const renderSkin = lobbyTab === 'skins' ? item.id : selectedSkinId;
    const renderHat = lobbyTab === 'hats' ? item.id : selectedHat;
    const renderMustache = lobbyTab === 'mustaches' ? item.id : selectedMustache;
    const renderMouth = lobbyTab === 'mouths' ? item.id : selectedMouth;

    const { unlocked } = getLobbyData();
    const isUnlocked = unlocked.includes(item.id);
    const isFaceTab = lobbyTab === 'hats' || lobbyTab === 'mustaches' || lobbyTab === 'mouths';

    return (
      <div className={`relative flex items-center justify-center w-20 h-20 md:h-32 md:w-32 rounded-xl transition-all duration-300 ${active ? 'bg-cyan-900/50 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] scale-105 z-10' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/60'}`}>
        <LiveSnakePreview
          skinId={renderSkin}
          hatId={renderHat}
          mustacheId={renderMustache}
          mouthId={renderMouth}
          active={active}
          isFaceTab={isFaceTab}
        />
        {!isUnlocked && <div className="absolute inset-0 bg-black/65 rounded-xl flex items-center justify-center backdrop-blur-[2px]"><span className="text-3xl md:text-4xl">🔒</span></div>}
      </div>
    );
  };

  const lobbyData = getLobbyData();

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#020c18] overflow-hidden font-sans text-white select-none" style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@400;600;800&display=swap');
        * { font-family: 'Exo 2', sans-serif; } .font-display { font-family: 'Orbitron', sans-serif; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-danger { 0%, 100% { box-shadow: inset 0 0 20px rgba(255,0,0,0); } 50% { box-shadow: inset 0 0 80px rgba(255,0,0,0.4); } }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideInRight { 0% { transform: translateX(100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes shine { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .danger-pulse { animation: pulse-danger 2s infinite; border: 2px solid rgba(255,0,0,0.2); }
        .glass-panel { background: rgba(2, 12, 24, 0.35); backdrop-filter: blur(4px); border: 1px solid rgba(6, 182, 212, 0.15); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .quest-anim { animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .shine-effect { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); background-size: 200% auto; animation: shine 2s linear infinite; }
      `}</style>

      <canvas ref={canvasRef} className={`absolute inset-0 block w-full h-full ${dangerZone ? 'danger-pulse' : ''}`} />

      {gameState === 'lobby' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm z-10 px-2 sm:px-4 py-4 overflow-hidden">
          <div className="absolute top-4 right-4 flex gap-4"><div className="glass-panel px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-2 font-display text-yellow-400 font-bold text-sm md:text-base">🪙 {coins}</div></div>
          <h1 className="text-3xl md:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 mb-0.5 md:mb-2 tracking-wider text-center">SNAKE OCEAN</h1>
          <p className="text-cyan-400/60 mb-2 md:mb-6 uppercase tracking-[0.3em] text-[10px] md:text-base">Deep Dive Evolution</p>

          <div className="glass-panel p-3 md:p-6 w-full max-w-4xl max-h-[85dvh] overflow-y-auto hide-scrollbar flex flex-col items-center rounded-2xl">
            <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value.slice(0, 15))} placeholder="Nome do Jogador" className="w-full max-w-lg text-center bg-black/50 border border-cyan-800 rounded-lg py-2 px-3 md:py-3 md:px-4 mb-2 md:mb-4 text-base md:text-xl focus:outline-none focus:border-cyan-400 transition" />
            <div className="flex flex-wrap justify-center gap-1 md:gap-2 mb-2 md:mb-4 bg-gray-900/50 p-1 md:p-2 rounded-xl backdrop-blur w-full max-w-2xl">
              {['skins', 'hats', 'mustaches', 'mouths'].map(tab => (
                <button key={tab} onClick={() => setLobbyTab(tab)} className={`flex-1 py-1.5 md:py-2 rounded-lg font-bold text-[10px] md:text-sm transition ${lobbyTab === tab ? 'bg-cyan-600' : 'hover:bg-gray-800 text-gray-400'}`}>
                  {tab === 'skins' ? '🐍 Skins' : tab === 'hats' ? '🎩 Chapéu' : tab === 'mustaches' ? '🕶️ Olhos' : '👄 Boca'}
                </button>
              ))}
            </div>

            <div className="w-full max-w-3xl mb-1 md:mb-2 flex justify-between items-center text-xs md:text-sm font-bold text-gray-400 px-2 md:px-4">
              <span>SELEÇÃO: <span className="text-white uppercase">{lobbyData.items.find(s => s.id === lobbyData.selected)?.name}</span></span>
              <span className="text-yellow-400">{lobbyData.items.find(s => s.id === lobbyData.selected)?.cost > 0 ? `🪙 ${lobbyData.items.find(s => s.id === lobbyData.selected)?.cost}` : 'GRÁTIS'}</span>
            </div>

            <div className="relative w-full max-w-4xl flex items-center group">
              <button onClick={() => carouselRef.current.scrollBy({ left: -150, behavior: 'smooth' })} className="absolute left-0 z-10 w-10 h-10 flex items-center justify-center bg-black/80 rounded-full border border-cyan-500/50 hidden md:flex text-3xl">&#8249;</button>
              <div ref={carouselRef} className="flex gap-2 md:gap-4 overflow-x-auto w-full py-2 md:py-4 px-1 md:px-10 snap-x hide-scrollbar scroll-smooth">
                {lobbyData.items.map(item => (
                  <div key={item.id} className="snap-center cursor-pointer flex-shrink-0 flex flex-col items-center" onClick={() => lobbyData.unlocked.includes(item.id) ? selectItem(item, lobbyTab) : null}>
                    <ItemPreview item={item} active={lobbyData.selected === item.id} />
                    <div className="text-center mt-2 md:mt-3 text-[9px] md:text-xs font-bold" style={{ color: item.rarity === 3 ? '#ec4899' : item.rarity === 2 ? '#fde047' : item.rarity === 1 ? '#a855f7' : '#9ca3af' }}>{item.rarity === 3 ? 'ÉPICO' : item.rarity === 2 ? 'PREMIUM' : item.rarity === 1 ? 'RARO' : 'NORMAL'}</div>
                    {!lobbyData.unlocked.includes(item.id) && <button onClick={(e) => { e.stopPropagation(); unlockItem(item, lobbyTab); }} className={`mt-1 md:mt-2 w-full py-1 text-[9px] md:text-xs font-bold rounded ${coins >= item.cost ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-gray-800 text-gray-500'}`}>{coins >= item.cost ? `DESBLOQUEAR` : `🪙 ${item.cost}`}</button>}
                  </div>
                ))}
              </div>
              <button onClick={() => carouselRef.current.scrollBy({ left: 150, behavior: 'smooth' })} className="absolute right-0 z-10 w-10 h-10 flex items-center justify-center bg-black/80 rounded-full border border-cyan-500/50 hidden md:flex text-3xl">&#8250;</button>
            </div>

            <button onClick={startGame} className="mt-3 md:mt-6 w-full max-w-lg py-3 md:py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-display text-lg md:text-2xl font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform relative overflow-hidden group">
              <div className="absolute inset-0 shine-effect opacity-50"></div>
              MERGULHAR
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none p-2 md:p-4 flex flex-col justify-between z-10">
          <div className="flex justify-between items-start">
            <div className="glass-panel p-2 md:p-3 rounded-xl min-w-[100px] md:min-w-[150px]">
              <div className="flex justify-between items-center mb-1">
                <div className="text-gray-400 text-[9px] md:text-xs font-bold uppercase">Comprimento</div>
                <div className={`text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded ${hud.fps >= 50 ? 'bg-green-900/50 text-green-400' : hud.fps >= 30 ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>
                  {hud.fps} FPS ({hud.quality === 'high' ? 'Alta' : hud.quality === 'medium' ? 'Média' : 'Baixa'})
                </div>
              </div>
              <div className="text-xl md:text-3xl font-display font-bold text-white">{hud.length}</div>
              <div className="text-cyan-400 text-[10px] md:text-sm mt-1 border-t border-cyan-800/50 pt-1">Rank #{hud.rank} de {hud.totalPlayers}</div>
              <div className="text-yellow-400 text-[10px] md:text-sm font-bold mt-1">🪙 {hud.sessionCoins}</div>
            </div>

            <div className="glass-panel p-2 md:p-3 rounded-xl min-w-[120px] md:min-w-[200px] flex flex-col gap-1 md:gap-2">
              <div className="text-center text-[9px] md:text-xs font-bold text-gray-400 tracking-widest mb-1">LEADERBOARD</div>
              {hud.top10.map((p, i) => (
                <div key={i} className={`flex justify-between items-center text-[9px] md:text-sm ${p.isPlayer ? 'bg-cyan-900/50 rounded px-1' : ''}`}>
                  <div className="flex items-center gap-1 md:gap-2 overflow-hidden">
                    <span className="text-gray-500 w-3 md:w-4">{i + 1}.</span>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                    <span className={`truncate w-14 md:w-24 ${p.isPlayer ? 'text-white font-bold' : 'text-gray-300'}`}>{p.name}</span>
                  </div>
                  <span className="font-display text-cyan-400">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex justify-between items-center pb-6 md:pb-4">
            <div className="flex flex-col gap-2 mt-auto self-end">
              {activeQuests.map((q, i) => (
                <div key={i} className={`glass-panel p-2 rounded-lg w-32 md:w-48 transition-all ${q.completed ? 'opacity-50 grayscale' : ''}`}>
                  <div className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase">{q.title}</div>
                  <div className="text-[10px] md:text-xs text-white mb-1">{q.desc.replace('{target}', q.target)}</div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
              {completedQuestsQueue.map((q, i) => (
                <div key={q.id + i} className="absolute left-4 bottom-40 bg-gradient-to-r from-yellow-500 to-orange-500 p-2 md:p-3 rounded-xl quest-anim shadow-[0_0_20px_rgba(252,211,77,0.6)]">
                  <div className="text-[10px] md:text-xs font-black text-black">MISSÃO CUMPRIDA!</div>
                  <div className="text-xs md:text-sm font-bold text-white">{q.title}</div>
                  <div className="text-yellow-100 font-bold mt-1 text-[10px] md:text-xs">🪙 +{q.reward}</div>
                </div>
              ))}
            </div>

            {streakMessage && (
              <div key={streakMessage.id} className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50" style={{ animation: 'pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                <div className="text-4xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] italic tracking-tighter text-center" style={{ WebkitTextStroke: '2px black' }}>
                  {streakMessage.text}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1 items-end mt-auto self-end">
              <div className="flex flex-col gap-1.5 md:gap-2 mb-2 md:mb-4">
                {powerupsHUD.map(pu => (
                  <div key={pu.id} className="glass-panel p-1.5 md:p-2 rounded-lg flex items-center gap-1.5 md:gap-3">
                    <div className="text-base md:text-xl">{['🛡️', '⚡', '🧲'][pu.id]}</div>
                    <div className="w-10 md:w-16 bg-gray-800 h-1.5 md:h-2 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${(pu.rem / (POWERUP_TYPES[pu.id].duration / 1000)) * 100}%`, backgroundColor: POWERUP_TYPES[pu.id].color }}></div>
                    </div>
                    <div className="text-[9px] md:text-xs font-bold w-4 text-right">{pu.rem}s</div>
                  </div>
                ))}
              </div>
              {killFeed.map(k => (
                <div key={k.id} className={`glass-panel px-1.5 md:px-3 py-0.5 md:py-1 rounded text-[10px] md:text-sm flex items-center gap-1 md:gap-2 ${k.isKing ? 'border-yellow-500/50 bg-yellow-900/40' : ''}`}>
                  <span>{k.isKing ? '👑💀' : '💀'}</span>
                  <span style={{ color: k.color, fontWeight: k.isKing ? 'bold' : 'normal' }}>{k.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="glass-panel px-2 md:px-4 py-1.5 md:py-2 rounded-xl text-base md:text-xl font-display font-bold text-red-400">💀 {killCount}</div>
            {comboState.active && (
              <div className="absolute left-1/2 bottom-28 md:bottom-20 -translate-x-1/2 text-center pointer-events-none" style={{ animation: 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                <div className={`text-3xl md:text-5xl font-display font-black italic ${comboState.count >= 10 ? 'text-yellow-400' : 'text-cyan-400'}`}>{comboState.count >= 10 ? '🔥 ULTRA' : `x${comboState.count}`}</div>
                <div className="text-xs md:text-lg font-bold tracking-widest mt-1">COMBO</div>
              </div>
            )}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-cyan-800/50 bg-black/50 backdrop-blur flex items-center justify-center relative overflow-hidden hidden md:flex">
              <div className="absolute w-2 h-2 bg-white rounded-full"></div>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="absolute w-1 h-1 bg-red-500/50 rounded-full" style={{ top: `${randomRange(20, 80)}%`, left: `${randomRange(20, 80)}%` }}></div>)}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE & TABLET CONTROLS */}
      {gameState === 'playing' && (
        <div className="xl:hidden">
          <div ref={joystickRef} id="joystick-base" className="absolute bottom-4 left-4 w-24 h-24 rounded-full border-2 border-cyan-500/30 bg-black/20 backdrop-blur z-20 pointer-events-auto">
            <div className="absolute w-8 h-8 bg-cyan-400/50 rounded-full shadow-[0_0_10px_cyan] pointer-events-none transition-transform"
              style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${engine.current.joystick.x}px), calc(-50% + ${engine.current.joystick.y}px))` }}></div>
          </div>
          <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border-2 border-yellow-500/50 bg-yellow-900/40 backdrop-blur z-20 pointer-events-auto flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(234,179,8,0.3)] active:scale-90 transition-transform"
            onTouchStart={(e) => { e.preventDefault(); if (engine.current.player) engine.current.player.isBoosting = true; }}
            onTouchEnd={(e) => { e.preventDefault(); if (engine.current.player) engine.current.player.isBoosting = false; }}
            onMouseDown={(e) => { if (engine.current.player) engine.current.player.isBoosting = true; }}
            onMouseUp={(e) => { if (engine.current.player) engine.current.player.isBoosting = false; }}>
            🚀
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
          <div className="glass-panel p-4 md:p-8 rounded-2xl w-full max-w-md text-center border-red-500/30 border-t-4 border-t-red-500 max-h-[95dvh] overflow-y-auto hide-scrollbar">
            <h2 className="text-3xl md:text-5xl font-display font-black text-red-500 mb-1 md:mb-2">GAME OVER</h2>
            {gameOverStats.newRecord && <div className="text-yellow-400 font-bold animate-pulse mb-3 md:mb-4 text-base md:text-xl">🏆 NOVO RECORDE!</div>}

            <div className="space-y-2 md:space-y-4 my-4 md:my-8 text-sm md:text-lg">
              <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Comprimento Final</span><span className="font-display font-bold">{gameOverStats.score}</span></div>
              <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Eliminações</span><span className="font-display font-bold text-red-400">💀 {gameOverStats.kills}</span></div>
              <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Moedas</span><span className="font-display font-bold text-yellow-400">🪙 +{gameOverStats.coins}</span></div>
              <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">Tempo</span><span className="font-display font-bold">{Math.floor(gameOverStats.time / 60)}m {gameOverStats.time % 60}s</span></div>
            </div>

            <button onClick={() => setGameState('lobby')} className="w-full py-2.5 md:py-4 bg-gray-800/80 hover:bg-gray-700 rounded-xl font-bold uppercase mb-2 md:mb-4 transition text-sm md:text-base">Voltar ao Lobby</button>
            <button onClick={startGame} className="w-full py-2.5 md:py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-display text-base md:text-xl font-bold uppercase transition hover:scale-105">Jogar Novamente</button>
          </div>
        </div>
      )}
    </div>
  );
}
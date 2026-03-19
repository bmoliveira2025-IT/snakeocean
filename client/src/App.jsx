import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// ==========================================
// CONSTANTS & CONFIG
// ==========================================
const WORLD_CENTER = 3000; // Alinhado com o servidor (0 a 6000)
const BASE_SPEED = 140; 
const BOOST_SPEED = 450;
const TURN_SPEED = 4.0;
const INITIAL_LENGTH = 15;
const COLORS = {
  blue: '#1a6fa8',
  turquoise: '#00b4d8',
  coral: '#e07a5f',
  yellow: '#f4d03f',
  green: '#52b788',
  purple: '#9b59b6',
  white: '#ffffff',
  danger: '#ff4757',
  neonGreen: '#39ff14', 
  neonCyan: '#00ffff', 
  neonPink: '#ff00ff', 
  boneWhite: '#e0e0e0', 
  classicRed: '#ef4444',
  silver: '#9ca3af', // Corrente
  brGreen: '#009c3b', // Cores BR
  brYellow: '#ffdf00',
  brBlue: '#002776'
};

// --- Configurações das Skins (Atualizadas com nomes curtos e raridades) ---
const SKINS = [
  { id: 'classic', name: 'Ciclope', color: '#39ff14', type: 'cyclops', cost: 0, rarity: 'normal' },
  { id: 'lula_red', name: 'Lula', color: '#ef4444', type: 'lula', cost: 0, rarity: 'normal' }, 
  { id: 'blue', name: 'Abissal', color: '#00b4d8', type: 'cyclops', cost: 0, rarity: 'normal' },
  { id: 'star', name: 'Estrela', color: '#facc15', type: 'star', cost: 0, rarity: 'normal' }, 
  { id: 'mantis', name: 'Louva-deus', color: '#10b981', type: 'mantis', cost: 0, rarity: 'normal' },
  { id: 'dolphin', name: 'Golfinho', color: '#38bdf8', type: 'dolphin', cost: 0, rarity: 'normal' }, 
  { id: 'parrotfish', name: 'Papagaio', color: '#22c55e', type: 'parrotfish', cost: 0, rarity: 'normal' },
  { id: 'pufferfish', name: 'Baiacu', color: '#eab308', type: 'pufferfish', cost: 0, rarity: 'normal' },
  { id: 'piranha', name: 'Piranha', color: '#dc2626', type: 'piranha', cost: 0, rarity: 'normal' },
  { id: 'dragon', name: 'Dragão', color: '#1a1a1a', type: 'dragon', cost: 50, rarity: 'normal' },
  { id: 'chain', name: 'Corrente', color: '#9ca3af', type: 'chain', cost: 150, rarity: 'rara' }, 
  { id: 'skeleton', name: 'Esqueleto', color: '#e0e0e0', type: 'skeleton', cost: 150, rarity: 'rara' },
  { id: 'mermaid', name: 'Sereia', color: '#2dd4bf', type: 'mermaid', cost: 150, rarity: 'rara' },
  { id: 'shark', name: 'Tubarão', color: '#64748b', type: 'shark', cost: 400, rarity: 'premio' }, // --- NOVA SKIN: TUBARÃO! ---
  { id: 'scorpion', name: 'Escorpião', color: '#dc2626', type: 'scorpion', cost: 400, rarity: 'premio' }, // --- NOVA SKIN: ESCORPIÃO! ---
  { id: 'medusa', name: 'Medusa', color: '#d946ef', type: 'medusa', cost: 400, rarity: 'premio' }, 
  { id: 'neon_dragon', name: 'Neon', color: '#00ffff', type: 'dragon_neon', cost: 200, rarity: 'premio' },
  { id: 'brazil_seahorse', name: 'Brasil', color: '#009c3b', type: 'seahorse', cost: 300, rarity: 'premio' },
  { id: 'neon_skeleton', name: 'Lich', color: '#ff00ff', type: 'skeleton_neon', cost: 500, rarity: 'premio' }
];

const BOT_NAMES = [
  "Abyss Walker", "Kraken", "Megalodon", "Siren", "Leviathan", 
  "Nemo", "Moby", "Orca", "Tsunami", "Coral Reaper",
  "Aqua", "Deep Blue", "Predator", "Trench", "Vortex",
  "Pelagic", "Benthic", "Sonar", "Tide", "Neptune"
];

// --- NOVO: Configurações de Estilo das Tags (Design Dark Neon Moderno) ---
const RARITY_CONFIG = {
  normal: { 
    label: 'NORMAL', 
    classes: 'bg-[#111827] text-gray-300 border-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.5)]' 
  },
  rara: { 
    label: 'RARA ✨', 
    classes: 'bg-[#1e1b4b] text-fuchsia-400 border-fuchsia-500 animate-glow-rara' 
  },
  premio: { 
    label: 'PREMIUM 👑', 
    classes: 'bg-[#422006] text-yellow-400 border-yellow-400 animate-glow-premio' 
  }
};

// ==========================================
// MATH & UTILS
// ==========================================
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
};
const distSq = (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2;
const randomRange = (min, max) => Math.random() * (max - min) + min;

const getRandPosInCircle = (maxRadius) => {
  const r = maxRadius * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  return { x: WORLD_CENTER + r * Math.cos(theta), y: WORLD_CENTER + r * Math.sin(theta) };
};

const getSafeSpawnPosition = (snakes, currentWorldRadius, margin = 200, minDistance = 800) => {
  const spawnRadius = Math.max(500, currentWorldRadius - margin);
  for (let i = 0; i < 20; i++) {
    const pos = getRandPosInCircle(spawnRadius);
    let isSafe = true;
    for (const snake of snakes) {
      if (distSq(pos.x, pos.y, snake.x, snake.y) < minDistance * minDistance) {
        isSafe = false;
        break;
      }
    }
    if (isSafe) return pos;
  }
  return getRandPosInCircle(spawnRadius);
};

// ==========================================
// PROCEDURAL AUDIO ENGINE (Web Audio API)
// ==========================================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.bgmEnabled = true;
    this.sfxEnabled = true;
    this.bgmGain = null;
  }
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.updateAmbient();
  }

  updateSettings(bgm, sfx) {
    this.bgmEnabled = bgm;
    this.sfxEnabled = sfx;
    this.updateAmbient();
  }

  updateAmbient() {
    if (!this.ctx) return;
    
    if (this.bgmEnabled) {
      if (!this.bgmGain) {
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0; 
        this.bgmGain.connect(this.ctx.destination);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 55; 

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = 110;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 250;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(this.bgmGain);

        osc1.start();
        osc2.start();
        
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15; 
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 150;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
      }
      this.bgmGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.5);
    } else {
      if (this.bgmGain) {
        this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      }
    }
  }

  play(type, volume = 1) {
    if (!this.sfxEnabled || !this.ctx) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (type) {
      case 'pop': 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        gain.gain.setValueAtTime(0.4 * volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      case 'coin': 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t); 
        osc.frequency.setValueAtTime(1318.51, t + 0.1); 
        gain.gain.setValueAtTime(0.3 * volume, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      case 'death':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.8);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.8);
        
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);
        
        gain.gain.setValueAtTime(0.5 * volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        osc.start(t);
        osc.stop(t + 0.8);
        break;
      case 'powerup':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, t);
        osc.frequency.setValueAtTime(659, t + 0.1);
        osc.frequency.setValueAtTime(784, t + 0.2);
        osc.frequency.setValueAtTime(1047, t + 0.3);
        gain.gain.setValueAtTime(0.2 * volume, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
        break;
      case 'shield_break':
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(1000, t + 0.3);
        
        const bpFilter = this.ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.value = 1500;
        
        osc.disconnect();
        osc.connect(bpFilter);
        bpFilter.connect(gain);
        
        gain.gain.setValueAtTime(0.3 * volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      case 'boost':
        if (Math.random() > 0.05) return;
        osc.type = 'square';
        osc.frequency.setValueAtTime(60 + Math.random() * 20, t);
        
        const bpf = this.ctx.createBiquadFilter();
        bpf.type = 'lowpass';
        bpf.frequency.value = 400;
        
        osc.disconnect();
        osc.connect(bpf);
        bpf.connect(gain);
        
        gain.gain.setValueAtTime(0.03 * volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      case 'king': 
        osc.type = 'square';
        osc.frequency.setValueAtTime(392.00, t);        
        osc.frequency.setValueAtTime(523.25, t + 0.15); 
        osc.frequency.setValueAtTime(659.25, t + 0.30); 
        osc.frequency.setValueAtTime(1046.50, t + 0.45); 
        
        const kingFilter = this.ctx.createBiquadFilter();
        kingFilter.type = 'lowpass';
        kingFilter.frequency.value = 2000;
        osc.disconnect();
        osc.connect(kingFilter);
        kingFilter.connect(gain);

        gain.gain.setValueAtTime(0.2 * volume, t);
        gain.gain.setValueAtTime(0.2 * volume, t + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        
        osc.start(t);
        osc.stop(t + 1.2);
        break;
    }
  }
}

// ==========================================
// SPATIAL HASHING (Optimization)
// ==========================================
class SpatialHash {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  hash(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
  insert(obj) {
    const key = this.hash(obj.x, obj.y);
    if (!this.cells.has(key)) this.cells.set(key, new Set());
    this.cells.get(key).add(obj);
    obj._hashKey = key;
  }
  update(obj) {
    const key = this.hash(obj.x, obj.y);
    if (obj._hashKey !== key) {
      if (obj._hashKey && this.cells.has(obj._hashKey)) {
        this.cells.get(obj._hashKey).delete(obj);
      }
      this.insert(obj);
    }
  }
  remove(obj) {
    if (obj._hashKey && this.cells.has(obj._hashKey)) {
      this.cells.get(obj._hashKey).delete(obj);
    }
  }
  getNearby(x, y, radius) {
    const nearby = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        if (this.cells.has(key)) {
          this.cells.get(key).forEach(obj => nearby.push(obj));
        }
      }
    }
    return nearby;
  }
  clear() {
    this.cells.clear();
  }
}

// ==========================================
// GAME ENTITIES
// ==========================================

class Particle {
  constructor(x, y, color, speedMultiplier = 1, type = 'solid') {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = randomRange(50, 200) * speedMultiplier;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = randomRange(0.5, 1.5);
    this.color = color;
    this.size = randomRange(3, 8);
    this.type = type;
    this.friction = 0.92; 
  }
  update(dt) {
    this.vx *= this.friction; 
    this.vy *= this.friction;
    
    if (this.type === 'bubble') {
      this.vy -= 100 * dt; 
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= this.decay * dt;
    
    this.size = Math.max(0, this.size - dt * 2);
  }
  draw(ctx, quality) {
    if (this.size <= 0) return;
    
    if (quality === 'low' && this.type === 'bubble') return;

    ctx.globalAlpha = Math.max(0, this.life);
    
    if (this.type === 'bubble') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

class Orb {
  constructor(x, y, isPowerup = false, type = 0, specificColor = null) {
    this.id = Math.random().toString(36);
    this.x = x;
    this.y = y;
    this.isPowerup = isPowerup;
    this.type = type;
    this.value = isPowerup ? 100 : randomRange(10, 30);
    this.size = isPowerup ? 15 : Math.sqrt(this.value) * 1.5;
    this.bobOffset = Math.random() * Math.PI * 2;
    
    this.vx = randomRange(-15, 15);
    this.vy = randomRange(-15, 15);
    
    if (isPowerup) {
      if (type === 3) this.color = '#ffd700'; 
      else this.color = type === 0 ? COLORS.turquoise : (type === 1 ? COLORS.yellow : COLORS.purple);
    } else {
      if (specificColor) {
        this.color = specificColor;
      } else {
        const colors = [COLORS.green, COLORS.coral, COLORS.blue, COLORS.yellow, COLORS.purple];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
    }
    
    this.absorbedBy = null;
    this.absorbProgress = 0;
  }

  update(dt, worldRadius) {
    this.bobOffset += dt * 3;
    
    if (this.absorbedBy) {
      this.absorbProgress += dt * 6;
      this.x = lerp(this.x, this.absorbedBy.x, this.absorbProgress);
      this.y = lerp(this.y, this.absorbedBy.y, this.absorbProgress);
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      
      const dx = this.x - WORLD_CENTER;
      const dy = this.y - WORLD_CENTER;
      const distToCenter = Math.hypot(dx, dy);
      
      if (distToCenter > worldRadius - this.size) {
        const nx = dx / distToCenter;
        const ny = dy / distToCenter;
        
        const dot = this.vx * nx + this.vy * ny;
        this.vx -= 2 * dot * nx;
        this.vy -= 2 * dot * ny;
        
        this.x = WORLD_CENTER + nx * (worldRadius - this.size - 2);
        this.y = WORLD_CENTER + ny * (worldRadius - this.size - 2);
      }
    }
  }

  draw(ctx, preRenderedCanvases, quality) {
    if (this.absorbProgress >= 1) return;
    
    const pulse = 1 + Math.sin(this.bobOffset) * 0.1;
    const yOffset = Math.sin(this.bobOffset) * 2;
    const scale = this.absorbedBy ? 1 - this.absorbProgress : pulse;
    
    ctx.save();
    ctx.translate(this.x, this.y + yOffset);
    ctx.scale(scale, scale);
    
    if (this.isPowerup) {
      if (quality !== 'low') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
      }
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = this.type === 3 ? 'black' : 'white';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let icon = 'S';
      if (this.type === 1) icon = '⚡';
      if (this.type === 2) icon = '🧲';
      if (this.type === 3) icon = '🪙';
      ctx.fillText(icon, 0, 0);
    } else {
      if (quality === 'low') {
         ctx.fillStyle = this.color;
         ctx.beginPath();
         ctx.arc(0, 0, this.size, 0, Math.PI * 2);
         ctx.fill();
      } else {
         const canvas = preRenderedCanvases[this.color];
         if (canvas) {
           ctx.drawImage(canvas, -this.size * 2, -this.size * 2, this.size * 4, this.size * 4);
         } else {
           ctx.fillStyle = this.color;
           ctx.beginPath();
           ctx.arc(0, 0, this.size, 0, Math.PI * 2);
           ctx.fill();
         }
      }
    }
    ctx.restore();
  }
}

class Snake {
  constructor(x, y, name, isPlayer, skinConfig) {
    this.id = Math.random().toString(36);
    this.name = name;
    this.isPlayer = isPlayer;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.baseSize = 12;
    this.score = 500;
    this.size = this.calculateSize();
    this.color = skinConfig.color;
    this.skinType = skinConfig.type;
    
    this.body = [];
    this.path = []; 
    const len = INITIAL_LENGTH;
    for (let i = 0; i < len; i++) {
      this.body.push({ x: this.x - i * 5, y: this.y - i * 5 });
      this.path.push({ x: this.x - i * 5, y: this.y - i * 5 });
    }
    
    this.isBoosting = false;
    this.boostEnergy = 100;
    this.dead = false;
    this.timeAlive = 0;
    this.sessionCoins = 0;
    this.isKing = false; 
    this.spawnProtectionTimer = 3.0;

    this.shieldTimer = 0;
    this.speedTimer = 0;
    this.magnetTimer = 0;

    this.aggressiveness = Math.random();
    this.caution = Math.random();
    this.aiState = 'forage';
    this.aiTarget = null;
    this.aiOrbitAngle = 0;
  }

  calculateSize() {
    return this.baseSize + Math.sqrt(this.score) * 0.15;
  }

  getLength(quality) {
    const maxRender = quality === 'low' ? 60 : (quality === 'medium' ? 120 : 200);
    return Math.min(maxRender, Math.floor(INITIAL_LENGTH + this.score / 100));
  }

  update(dt, inputTarget, spatialHash, worldRadius, quality) {
    if (this.dead) return;
    this.timeAlive += dt;

    if (this.spawnProtectionTimer > 0) this.spawnProtectionTimer -= dt; 
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.speedTimer > 0) this.speedTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;

    const sizeSpeedBonus = Math.min(1.5, 1 + (this.size - this.baseSize) * 0.015);
    const speedMult = this.speedTimer > 0 ? 3 : (this.isBoosting ? 1.8 : 1);
    const speed = BASE_SPEED * speedMult * sizeSpeedBonus;
    
    const turn = TURN_SPEED * (this.isBoosting ? 0.6 : 1);

    if (!this.isPlayer) {
      this.updateAI(dt, spatialHash, worldRadius); 
      this.score += dt * 15;
    } else if (inputTarget) {
      this.targetAngle = Math.atan2(inputTarget.y - this.y, inputTarget.x - this.x);
    }

    if (this.isBoosting && this.boostEnergy > 0) {
      this.boostEnergy -= dt * 25;
      if (this.score > 150) this.score -= dt * 20; 
      if (this.boostEnergy <= 0) this.isBoosting = false;
    } else {
      this.boostEnergy = Math.min(100, this.boostEnergy + dt * 10);
    }

    this.angle = lerpAngle(this.angle, this.targetAngle, dt * turn);

    this.x += Math.cos(this.angle) * speed * dt;
    this.y += Math.sin(this.angle) * speed * dt;

    const dx = this.x - WORLD_CENTER;
    const dy = this.y - WORLD_CENTER;
    const distToCenter = Math.hypot(dx, dy);

    if (distToCenter > worldRadius - this.size) {
      const angleFromCenter = Math.atan2(dy, dx);
      this.x = WORLD_CENTER + Math.cos(angleFromCenter) * (worldRadius - this.size);
      this.y = WORLD_CENTER + Math.sin(angleFromCenter) * (worldRadius - this.size);
      
      if (this.spawnProtectionTimer > 0) {
        const angleToCenter = Math.atan2(-dy, -dx);
        this.angle = angleToCenter + (Math.random() - 0.5);
        this.targetAngle = this.angle;
      } else {
        this.hitWall = true;
      }
    }

    this.size = this.calculateSize();

    this.path.unshift({ x: this.x, y: this.y });
    
    const spacing = this.skinType === 'chain' ? this.size * 0.6 : this.size * 0.35; 
    let pathIndex = 0;
    let distAccum = 0;
    
    const currentLength = this.getLength(quality);

    while (this.body.length < currentLength) {
      this.body.push({ ...this.body[this.body.length - 1] });
    }
    while (this.body.length > currentLength) {
      this.body.pop();
    }

    this.body[0] = { x: this.x, y: this.y };
    for (let i = 1; i < this.body.length; i++) {
      let targetDist = i * spacing;
      
      while (distAccum < targetDist && pathIndex < this.path.length - 1) {
        let p1 = this.path[pathIndex];
        let p2 = this.path[pathIndex + 1];
        let d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (distAccum + d >= targetDist) {
          let t = (targetDist - distAccum) / d;
          this.body[i] = {
            x: lerp(p1.x, p2.x, t),
            y: lerp(p1.y, p2.y, t)
          };
          break;
        }
        distAccum += d;
        pathIndex++;
      }
      
      if (pathIndex >= this.path.length - 1) {
        this.body[i] = { ...this.path[this.path.length - 1] };
      }
    }

    if (this.path.length > currentLength * 10) {
      this.path.length = currentLength * 10;
    }
  }

  updateAI(dt, spatialHash, worldRadius) {
    if (Math.random() < 0.05) {
      this.isBoosting = false;
      if (this.aiTarget && distSq(this.x, this.y, this.aiTarget.x, this.aiTarget.y) < 1500 * 1500) {
        if (this.aiTarget.size > this.size * 1.2) {
          this.aiState = 'flee';
        } else if (this.aiTarget.size < this.size * 0.8 && this.aggressiveness > 0.3) {
          this.aiState = 'hunt';
          if (Math.random() < 0.3) this.aiState = 'encircle'; 
        } else {
          this.aiState = 'forage';
        }
      } else {
        this.aiState = 'forage';
        this.aiTarget = null;
      }
    }

    if (this.aiState === 'hunt' && this.aiTarget) {
      const predictTime = 1.5;
      const predictX = this.aiTarget.x + Math.cos(this.aiTarget.angle) * BASE_SPEED * predictTime;
      const predictY = this.aiTarget.y + Math.sin(this.aiTarget.angle) * BASE_SPEED * predictTime;
      
      this.targetAngle = Math.atan2(predictY - this.y, predictX - this.x);
      
      if (distSq(this.x, this.y, this.aiTarget.x, this.aiTarget.y) < 400 * 400) {
        this.isBoosting = true;
      }
    } else if (this.aiState === 'encircle' && this.aiTarget) {
      this.aiOrbitAngle += dt * 0.8;
      const radius = this.aiTarget.size * 2 + this.size * 2 + 30; 
      const ox = this.aiTarget.x + Math.cos(this.aiOrbitAngle) * radius;
      const oy = this.aiTarget.y + Math.sin(this.aiOrbitAngle) * radius;
      this.targetAngle = Math.atan2(oy - this.y, ox - this.x);
      this.isBoosting = true; 
    } else if (this.aiState === 'flee' && this.aiTarget) {
      this.targetAngle = Math.atan2(this.y - this.aiTarget.y, this.x - this.aiTarget.x); 
      this.isBoosting = true;
    } else {
      this.targetAngle += (Math.random() - 0.5) * dt * 3;
    }

    if (spatialHash) {
      const lookAhead = this.size * 10; 
      const nearby = spatialHash.getNearby(this.x, this.y, lookAhead);
      let turnForce = 0;

      for (const item of nearby) {
        if (item.isBody && item.parent !== this) {
          const dSq = distSq(this.x, this.y, item.x, item.y);
          if (dSq < lookAhead * lookAhead) {
            const angleToObs = Math.atan2(item.y - this.y, item.x - this.x);
            let angleDiff = angleToObs - this.angle;
            
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) < Math.PI / 1.5) {
              const force = (1 - Math.sqrt(dSq) / lookAhead) * 2; 
              const dir = angleDiff >= 0 ? 1 : -1; 
              turnForce -= dir * force; 
            }
          }
        }
      }
      
      if (Math.abs(turnForce) > 0.1) {
        this.targetAngle += turnForce * dt * 10;
        if (Math.random() < 0.1) this.isBoosting = true; 
      }
    }

    const distToCenter = Math.hypot(this.x - WORLD_CENTER, this.y - WORLD_CENTER);
    const wallMargin = 800;
    if (distToCenter > worldRadius - wallMargin) {
      const angleToCenter = Math.atan2(WORLD_CENTER - this.y, WORLD_CENTER - this.x);
      this.targetAngle = lerpAngle(this.targetAngle, angleToCenter, dt * 3);
    }
  }

  draw(ctx, quality) {
    if (this.dead) return;
    const isLow = quality === 'low';
    
    ctx.save();
    if (this.spawnProtectionTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.timeAlive * 15) * 0.3;
    }

    if (this.shieldTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 2 + Math.sin(this.timeAlive * 10) * 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 180, 216, 0.2)';
      ctx.fill();
      ctx.strokeStyle = COLORS.turquoise;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (this.magnetTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 200, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(155, 89, 182, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = this.body.length - 1; i >= 0; i--) {
      const seg = this.body[i];
      const p = 1 - (i / this.body.length); 
      const s = this.size * (0.4 + 0.6 * p); 
      
      if (this.skinType === 'chain') {
        ctx.save();
        ctx.translate(seg.x, seg.y);
        
        let segAngle = this.angle;
        if (i > 0) {
           const prev = this.body[i-1];
           segAngle = Math.atan2(prev.y - seg.y, prev.x - seg.x);
        }
        ctx.rotate(segAngle);

        const isSideView = i % 2 === 0; 

        const metalGrad = ctx.createLinearGradient(-s, -s, s, s);
        metalGrad.addColorStop(0, '#e5e7eb');
        metalGrad.addColorStop(0.5, '#6b7280');
        metalGrad.addColorStop(1, '#1f2937');

        ctx.fillStyle = metalGrad;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = s * 0.15;

        ctx.beginPath();
        if (isSideView) {
          ctx.ellipse(0, 0, s*1.2, s*0.7, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(0, 0, s*0.6, s*0.25, 0, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fill();
        } else {
          ctx.ellipse(0, 0, s*0.4, s*0.9, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      } 
      else {
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, s, 0, Math.PI * 2);
        
        if (isLow) {
           ctx.fillStyle = this.color;
        } else {
          const grad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, s);
          if (this.speedTimer > 0) {
            grad.addColorStop(0, COLORS.yellow);
            grad.addColorStop(1, '#d35400');
          } else {
            if (this.skinType === 'dragon') {
              grad.addColorStop(0, '#333333');
              grad.addColorStop(0.8, '#111111');
              grad.addColorStop(1, '#8b0000'); 
            } else if (this.skinType === 'star') {
              grad.addColorStop(0, '#fef08a');
              grad.addColorStop(0.6, this.color);
              grad.addColorStop(1, '#ca8a04');
            } else if (this.skinType === 'mantis') {
              grad.addColorStop(0, '#10b981');
              grad.addColorStop(0.5, '#0ea5e9');
              grad.addColorStop(1, '#f59e0b');
            } else if (this.skinType === 'dolphin') {
              grad.addColorStop(0, '#7dd3fc');
              grad.addColorStop(0.6, this.color);
              grad.addColorStop(1, '#0369a1');
            } else if (this.skinType === 'parrotfish') {
              grad.addColorStop(0, '#22c55e');
              grad.addColorStop(0.5, '#06b6d4');
              grad.addColorStop(1, '#eab308');
            } else if (this.skinType === 'pufferfish') {
              grad.addColorStop(0, '#fef08a');
              grad.addColorStop(0.5, '#eab308');
              grad.addColorStop(1, '#b45309');
            } else if (this.skinType === 'shark') {
              // Gradiente de Tubarão
              grad.addColorStop(0, '#cbd5e1');
              grad.addColorStop(0.5, '#64748b');
              grad.addColorStop(1, '#1e293b');
            } else if (this.skinType === 'scorpion') {
              // Gradiente de Escorpião (Armadura vermelha)
              grad.addColorStop(0, '#f87171');
              grad.addColorStop(0.6, '#b91c1c');
              grad.addColorStop(1, '#450a0a');
            } else if (this.skinType === 'piranha') {
              grad.addColorStop(0, '#475569');
              grad.addColorStop(0.5, '#dc2626');
              grad.addColorStop(1, '#7f1d1d');
            } else if (this.skinType === 'mermaid') {
              grad.addColorStop(0, '#fdf4ff'); 
              grad.addColorStop(0.6, this.color); 
              grad.addColorStop(1, '#be185d'); 
            } else if (this.skinType === 'medusa') {
              grad.addColorStop(0, 'rgba(232, 121, 249, 0.9)');
              grad.addColorStop(0.5, 'rgba(192, 38, 211, 0.5)');
              grad.addColorStop(1, 'rgba(192, 38, 211, 0.1)');
            } else if (this.skinType === 'dragon_neon') {
              grad.addColorStop(0, '#111111');
              grad.addColorStop(0.7, '#222222');
              grad.addColorStop(1, this.color); 
            } else if (this.skinType === 'seahorse') {
              const stripe = Math.floor(i / 3) % 3;
              const segColor = stripe === 0 ? COLORS.brGreen : (stripe === 1 ? COLORS.brYellow : COLORS.brBlue);
              grad.addColorStop(0, segColor);
              grad.addColorStop(0.8, segColor);
              grad.addColorStop(1, 'rgba(0,0,0,0.5)');
            } else if (this.skinType.startsWith('skeleton')) {
              grad.addColorStop(0, '#000000'); 
              grad.addColorStop(0.5, '#1a1a1a');
              grad.addColorStop(0.8, this.color); 
              grad.addColorStop(1, '#000000'); 
            } else {
              grad.addColorStop(0, this.color);
              grad.addColorStop(0.8, this.color);
              grad.addColorStop(1, 'rgba(0,0,0,0.4)');
            }
          }
          ctx.fillStyle = grad;
        }
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    if (this.skinType.startsWith('dragon')) {
      const isNeon = this.skinType === 'dragon_neon';
      const hornColor = isNeon ? this.color : '#4a0000';
      const eyeColor = isNeon ? '#ffffff' : '#ff0000';
      const eyeGlow = isNeon ? this.color : '#ff0000';

      ctx.fillStyle = hornColor;
      if (isNeon && !isLow) { ctx.shadowBlur = 10; ctx.shadowColor = this.color; }
      
      ctx.beginPath();
      ctx.moveTo(0, -this.size * 0.4);
      ctx.lineTo(-this.size * 1.5, -this.size * 1.3);
      ctx.lineTo(-this.size * 0.5, -this.size * 0.1);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, this.size * 0.4);
      ctx.lineTo(-this.size * 1.5, this.size * 1.3);
      ctx.lineTo(-this.size * 0.5, this.size * 0.1);
      ctx.fill();
      
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.9, 0, 0, Math.PI * 2);
      
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.1);
      headGrad.addColorStop(0, isNeon ? '#222' : '#444');
      headGrad.addColorStop(1, '#050505');
      ctx.fillStyle = headGrad;
      ctx.fill();

      ctx.fillStyle = eyeColor;
      if (!isLow) { ctx.shadowBlur = 15; ctx.shadowColor = eyeGlow; }
      
      ctx.beginPath();
      ctx.ellipse(this.size * 0.4, -this.size * 0.35, this.size * 0.35, this.size * 0.15, Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.ellipse(this.size * 0.4, this.size * 0.35, this.size * 0.35, this.size * 0.15, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.ellipse(this.size * 0.45, -this.size * 0.35, this.size * 0.05, this.size * 0.12, Math.PI / 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(this.size * 0.45, this.size * 0.35, this.size * 0.05, this.size * 0.12, -Math.PI / 8, 0, Math.PI * 2); ctx.fill();

    } else if (this.skinType.startsWith('skeleton')) {
      const isNeon = this.skinType === 'skeleton_neon';

      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size * 0.85, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      if (isNeon && !isLow) {
         ctx.shadowBlur = 15;
         ctx.shadowColor = this.color;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#050505';
      const eyeOffsetX = this.size * 0.3;
      const eyeSize = this.size * 0.35;
      
      ctx.beginPath(); ctx.arc(eyeOffsetX, -this.size * 0.35, eyeSize, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX, this.size * 0.35, eyeSize, 0, Math.PI * 2); ctx.fill();

      if (isNeon) {
         ctx.fillStyle = '#ffffff';
         if (!isLow) { ctx.shadowBlur = 10; ctx.shadowColor = this.color; }
         ctx.beginPath(); ctx.arc(eyeOffsetX + 2, -this.size * 0.35, eyeSize * 0.3, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(eyeOffsetX + 2, this.size * 0.35, eyeSize * 0.3, 0, Math.PI * 2); ctx.fill();
         ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#050505';
      ctx.beginPath(); 
      ctx.moveTo(this.size * 0.7, 0); 
      ctx.lineTo(this.size * 0.5, -this.size * 0.1); 
      ctx.lineTo(this.size * 0.5, this.size * 0.1); 
      ctx.fill();

    } else if (this.skinType === 'chain') {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.9, 0, 0, Math.PI * 2);
      
      const headGrad = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
      headGrad.addColorStop(0, '#e5e7eb');
      headGrad.addColorStop(0.5, '#6b7280');
      headGrad.addColorStop(1, '#111827');
      ctx.fillStyle = headGrad;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = this.size * 0.1;
      ctx.stroke();

      ctx.fillStyle = '#ff0000';
      if (!isLow) { ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000'; }
      ctx.beginPath();
      ctx.ellipse(this.size * 0.5, 0, this.size * 0.2, this.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (this.skinType === 'seahorse') {
      ctx.fillStyle = COLORS.brBlue;
      ctx.beginPath();
      ctx.moveTo(-this.size * 0.5, -this.size * 0.8);
      ctx.lineTo(-this.size * 0.2, -this.size * 1.5);
      ctx.lineTo(this.size * 0.1, -this.size * 0.8);
      ctx.lineTo(this.size * 0.4, -this.size * 1.4);
      ctx.lineTo(this.size * 0.6, -this.size * 0.7);
      ctx.fill();

      ctx.lineWidth = this.size * 0.7;
      ctx.strokeStyle = COLORS.brYellow;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.size * 1.8, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.1, 0, Math.PI * 2);
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.1);
      headGrad.addColorStop(0, COLORS.brGreen);
      headGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = headGrad;
      ctx.fill();

      const eyeOffsetX = this.size * 0.3;
      const eyeOffsetY = this.size * 0.65;
      const eyeR = this.size * 0.45;
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, -eyeOffsetY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, eyeOffsetY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();

    } else if (this.skinType === 'lula') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      headGrad.addColorStop(0, this.color);
      headGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = headGrad;
      ctx.fill();

      ctx.lineWidth = this.size * 0.45;
      ctx.strokeStyle = this.color;
      ctx.lineCap = 'round';
      
      const eyeLX = this.size * 0.9;
      const eyeLY = -this.size * 0.65;
      const eyeRX = this.size * 0.9;
      const eyeRY = this.size * 0.65;

      ctx.beginPath();
      ctx.moveTo(this.size * 0.2, -this.size * 0.3);
      ctx.lineTo(eyeLX, eyeLY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.size * 0.2, this.size * 0.3);
      ctx.lineTo(eyeRX, eyeRY);
      ctx.stroke();

      const eyeR = this.size * 0.5;
      const pupilR = this.size * 0.22;
      
      ctx.lineWidth = this.size * 0.15;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffffff';

      ctx.beginPath(); ctx.arc(eyeLX, eyeLY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(eyeRX, eyeRY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(eyeLX + eyeR * 0.3, eyeLY, pupilR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeRX + eyeR * 0.3, eyeRY, pupilR, 0, Math.PI * 2); ctx.fill();

    } else if (this.skinType === 'star') {
      const spikes = 5;
      const outerRadius = this.size * 1.4;
      const innerRadius = this.size * 0.65;
      let rot = Math.PI / 2 * 3;
      let x = 0;
      let y = 0;
      let step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(0, -outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = Math.cos(rot) * outerRadius;
        y = Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = Math.cos(rot) * innerRadius;
        y = Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(0, -outerRadius);
      ctx.closePath();
      
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
      headGrad.addColorStop(0, '#fef08a');
      headGrad.addColorStop(1, this.color);
      ctx.fillStyle = headGrad;
      ctx.fill();

      const eyeOffsetX = this.size * 0.25;
      const eyeOffsetY = this.size * 0.35;
      const eyeR = this.size * 0.25;
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, -eyeOffsetY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, eyeOffsetY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();

    } else if (this.skinType === 'mantis') {
      const clawGrad1 = ctx.createRadialGradient(this.size * 0.8, -this.size * 0.7, 0, this.size * 0.8, -this.size * 0.7, this.size * 0.6);
      clawGrad1.addColorStop(0, '#f87171'); clawGrad1.addColorStop(1, '#dc2626');
      ctx.fillStyle = clawGrad1;
      ctx.beginPath(); ctx.ellipse(this.size * 0.8, -this.size * 0.7, this.size * 0.5, this.size * 0.35, -Math.PI / 6, 0, Math.PI * 2); ctx.fill();
      
      const clawGrad2 = ctx.createRadialGradient(this.size * 0.8, this.size * 0.7, 0, this.size * 0.8, this.size * 0.7, this.size * 0.6);
      clawGrad2.addColorStop(0, '#f87171'); clawGrad2.addColorStop(1, '#dc2626');
      ctx.fillStyle = clawGrad2;
      ctx.beginPath(); ctx.ellipse(this.size * 0.8, this.size * 0.7, this.size * 0.5, this.size * 0.35, Math.PI / 6, 0, Math.PI * 2); ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.2, this.size * 0.85, 0, 0, Math.PI * 2);
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.2);
      headGrad.addColorStop(0, '#059669'); headGrad.addColorStop(1, '#10b981');
      ctx.fillStyle = headGrad;
      ctx.fill();
      
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath(); ctx.ellipse(-this.size * 0.2, 0, this.size * 0.2, this.size * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.ellipse(-this.size * 0.5, 0, this.size * 0.15, this.size * 0.4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = this.size * 0.25;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(this.size * 0.8, -this.size * 0.3); ctx.lineTo(this.size * 1.3, -this.size * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.size * 0.8, this.size * 0.3); ctx.lineTo(this.size * 1.3, this.size * 0.5); ctx.stroke();

      ctx.fillStyle = '#0f172a'; 
      ctx.beginPath(); ctx.ellipse(this.size * 1.4, -this.size * 0.6, this.size * 0.4, this.size * 0.25, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(this.size * 1.4, this.size * 0.6, this.size * 0.4, this.size * 0.25, -Math.PI / 6, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.ellipse(this.size * 1.4, -this.size * 0.6, this.size * 0.4, this.size * 0.06, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(this.size * 1.4, this.size * 0.6, this.size * 0.4, this.size * 0.06, -Math.PI / 6, 0, Math.PI * 2); ctx.fill();

    } else if (this.skinType === 'dolphin') {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(this.size * 1.1, 0, this.size * 0.5, this.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#7dd3fc'; 
      ctx.fill();

      const eyeOffsetX = this.size * 0.4;
      const eyeOffsetY = this.size * 0.5;
      const eyeR = this.size * 0.25;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.05, -eyeOffsetY, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.05, eyeOffsetY, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, -eyeOffsetY - this.size*0.05, eyeR * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, eyeOffsetY - this.size*0.05, eyeR * 0.2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.ellipse(-this.size * 0.3, 0, this.size * 0.15, this.size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.skinType === 'parrotfish') {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.color; 
      ctx.fill();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath(); ctx.arc(-this.size * 0.2, -this.size * 0.6, this.size * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-this.size * 0.2, this.size * 0.6, this.size * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(-this.size * 0.6, -this.size * 0.4, this.size * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-this.size * 0.6, this.size * 0.4, this.size * 0.15, 0, Math.PI * 2); ctx.fill();

      ctx.lineWidth = this.size * 0.1;
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(this.size * 0.8, 0);
      ctx.lineTo(this.size * 1.2, this.size * 0.1);
      ctx.quadraticCurveTo(this.size * 1.1, this.size * 0.35, this.size * 0.8, this.size * 0.3);
      ctx.closePath();
      ctx.fillStyle = '#d97706'; 
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.size * 0.8, -this.size * 0.4);
      ctx.quadraticCurveTo(this.size * 1.6, -this.size * 0.4, this.size * 1.6, this.size * 0.3); 
      ctx.quadraticCurveTo(this.size * 1.3, this.size * 0.1, this.size * 0.8, -this.size * 0.05); 
      ctx.closePath();
      ctx.fillStyle = '#f59e0b'; 
      ctx.fill();
      ctx.stroke();

      const eyeOffsetX = this.size * 0.4;
      const eyeOffsetY = this.size * 0.55;
      const eyeR = this.size * 0.25;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.05, -eyeOffsetY, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.05, eyeOffsetY, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();

    } else if (this.skinType === 'pufferfish') {
      ctx.fillStyle = '#b45309';
      for (let i = 0; i < 12; i++) {
         const angle = (i * Math.PI * 2) / 12;
         ctx.beginPath();
         ctx.moveTo(Math.cos(angle - 0.15) * this.size, Math.sin(angle - 0.15) * this.size);
         ctx.lineTo(Math.cos(angle) * this.size * 1.4, Math.sin(angle) * this.size * 1.4);
         ctx.lineTo(Math.cos(angle + 0.15) * this.size, Math.sin(angle + 0.15) * this.size);
         ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = this.color; 
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(this.size * 0.4, -this.size * 0.45, this.size * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.size * 0.4, this.size * 0.45, this.size * 0.25, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(this.size * 0.5, -this.size * 0.45, this.size * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.size * 0.5, this.size * 0.45, this.size * 0.18, 0, Math.PI * 2); ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(this.size * 0.55, -this.size * 0.4, this.size * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.size * 0.55, this.size * 0.5, this.size * 0.08, 0, Math.PI * 2); ctx.fill();

    } else if (this.skinType === 'piranha') {
      const headGrad = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
      headGrad.addColorStop(0, '#475569');
      headGrad.addColorStop(1, '#dc2626');
      
      ctx.beginPath(); 
      ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = headGrad; 
      ctx.fill();

      ctx.fillStyle = '#991b1b';
      ctx.beginPath(); 
      ctx.ellipse(this.size * 0.6, 0, this.size * 0.5, this.size * 0.35, 0, -Math.PI/2, Math.PI/2); 
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(this.size * 0.6, -this.size * 0.3);
      ctx.lineTo(this.size * 0.85, -this.size * 0.15);
      ctx.lineTo(this.size * 0.65, 0);
      ctx.lineTo(this.size * 0.85, this.size * 0.15);
      ctx.lineTo(this.size * 0.6, this.size * 0.3);
      ctx.closePath();
      ctx.fill();

      const eyeX = this.size * 0.2;
      const eyeY = this.size * 0.45;
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeX, -eyeY, this.size * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX, eyeY, this.size * 0.22, 0, Math.PI * 2); ctx.fill();
      
      ctx.fillStyle = '#ef4444'; 
      ctx.beginPath(); ctx.arc(eyeX + this.size*0.05, -eyeY, this.size * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX + this.size*0.05, eyeY, this.size * 0.1, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#000000'; 
      ctx.lineWidth = this.size * 0.08; 
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(eyeX - this.size*0.1, -eyeY - this.size*0.25); ctx.lineTo(eyeX + this.size*0.25, -eyeY - this.size*0.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eyeX - this.size*0.1, eyeY + this.size*0.25); ctx.lineTo(eyeX + this.size*0.25, eyeY + this.size*0.05); ctx.stroke();

    } else if (this.skinType === 'mermaid') {
      ctx.fillStyle = '#db2777';
      ctx.beginPath();
      ctx.arc(-this.size * 0.3, 0, this.size * 1.15, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(-this.size * 0.5, -this.size * 1.1);
      ctx.lineTo(-this.size * 2.2, -this.size * 0.7);
      ctx.lineTo(-this.size * 1.2, 0);
      ctx.lineTo(-this.size * 2.2, this.size * 0.7);
      ctx.lineTo(-this.size * 0.5, this.size * 1.1);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a'; 
      ctx.fill();

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? this.size * 0.45 : this.size * 0.2;
        const angle = (i * Math.PI * 2) / 10;
        const px = -this.size * 0.4 + Math.cos(angle) * r;
        const py = -this.size * 0.8 + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      const eyeOffsetX = this.size * 0.25;
      const eyeOffsetY = this.size * 0.35;
      const eyeR = this.size * 0.28;
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#0ea5e9'; 
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.05, -eyeOffsetY, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.05, eyeOffsetY, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#000000'; 
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, -eyeOffsetY, eyeR * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, eyeOffsetY, eyeR * 0.3, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.beginPath(); ctx.arc(eyeOffsetX - this.size*0.1, -eyeOffsetY - this.size*0.35, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX - this.size*0.1, eyeOffsetY + this.size*0.35, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();

    } else if (this.skinType === 'shark') {
      // --- RENDER DA CABEÇA DO TUBARÃO ---
      // Barbatanas peitorais (laterais)
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.moveTo(-this.size * 0.2, -this.size * 0.6); ctx.lineTo(-this.size * 0.8, -this.size * 1.8); ctx.lineTo(this.size * 0.4, -this.size * 0.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-this.size * 0.2, this.size * 0.6); ctx.lineTo(-this.size * 0.8, this.size * 1.8); ctx.lineTo(this.size * 0.4, this.size * 0.8); ctx.fill();

      // Corpo pontiagudo em forma de torpedo
      ctx.beginPath();
      ctx.moveTo(-this.size * 1.0, -this.size * 0.85);
      ctx.lineTo(this.size * 0.8, -this.size * 0.5);
      ctx.lineTo(this.size * 1.5, 0); // Focinho
      ctx.lineTo(this.size * 0.8, this.size * 0.5);
      ctx.lineTo(-this.size * 1.0, this.size * 0.85);
      ctx.closePath();
      
      const headGrad = ctx.createLinearGradient(-this.size, 0, this.size * 1.5, 0);
      headGrad.addColorStop(0, '#475569'); headGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = headGrad;
      ctx.fill();

      // Olhos ameaçadores
      const eyeX = this.size * 0.8;
      const eyeY = this.size * 0.35;
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(eyeX, -eyeY, this.size * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX, eyeY, this.size * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeX + this.size * 0.05, -eyeY - this.size * 0.05, this.size * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX + this.size * 0.05, eyeY - this.size * 0.05, this.size * 0.05, 0, Math.PI * 2); ctx.fill();

      // Guelras
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = this.size * 0.08;
      ctx.lineCap = 'round';
      for(let g=0; g<3; g++) {
         ctx.beginPath(); ctx.moveTo(this.size * 0.1 - g * this.size * 0.25, -this.size * 0.7); ctx.lineTo(this.size * 0.3 - g * this.size * 0.25, -this.size * 0.4); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(this.size * 0.1 - g * this.size * 0.25, this.size * 0.7); ctx.lineTo(this.size * 0.3 - g * this.size * 0.25, this.size * 0.4); ctx.stroke();
      }

    } else if (this.skinType === 'scorpion') {
      // --- RENDER DA CABEÇA DO ESCORPIÃO ---
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = this.size * 0.15;
      
      // Garra Esquerda com formato de pinça
      ctx.beginPath();
      ctx.moveTo(this.size * 0.2, -this.size * 0.6);
      ctx.quadraticCurveTo(this.size * 0.8, -this.size * 2.0, this.size * 1.6, -this.size * 0.8);
      ctx.lineTo(this.size * 1.3, -this.size * 0.5); // Dente interior
      ctx.lineTo(this.size * 1.5, -this.size * 0.3); // Base da garra
      ctx.quadraticCurveTo(this.size * 0.8, -this.size * 0.2, this.size * 0.2, -this.size * 0.6);
      ctx.fill(); ctx.stroke();

      // Garra Direita com formato de pinça
      ctx.beginPath();
      ctx.moveTo(this.size * 0.2, this.size * 0.6);
      ctx.quadraticCurveTo(this.size * 0.8, this.size * 2.0, this.size * 1.6, this.size * 0.8);
      ctx.lineTo(this.size * 1.3, this.size * 0.5); // Dente interior
      ctx.lineTo(this.size * 1.5, this.size * 0.3); // Base da garra
      ctx.quadraticCurveTo(this.size * 0.8, this.size * 0.2, this.size * 0.2, this.size * 0.6);
      ctx.fill(); ctx.stroke();

      // Carapaça Principal
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.9, 0, 0, Math.PI * 2);
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.1);
      headGrad.addColorStop(0, '#ef4444'); headGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = headGrad;
      ctx.fill();
      
      // Múltiplos olhinhos pretos
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(this.size * 0.75, -this.size * 0.3, this.size * 0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.size * 0.75, this.size * 0.3, this.size * 0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.size * 0.95, -this.size * 0.15, this.size * 0.08, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.size * 0.95, this.size * 0.15, this.size * 0.08, 0, Math.PI*2); ctx.fill();

    } else if (this.skinType === 'medusa') {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.4, this.size * 1.4, 0, -Math.PI/2, Math.PI/2);
      
      const headGrad = ctx.createLinearGradient(0, 0, this.size * 1.4, 0);
      headGrad.addColorStop(0, 'rgba(192, 38, 211, 0.5)');
      headGrad.addColorStop(1, 'rgba(232, 121, 249, 0.9)');
      ctx.fillStyle = headGrad;
      
      if (!isLow) {
         ctx.shadowBlur = 20;
         ctx.shadowColor = '#d946ef';
      }
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, -this.size * 1.4);
      ctx.quadraticCurveTo(this.size * 0.4, -this.size * 0.7, 0, 0);
      ctx.quadraticCurveTo(this.size * 0.4, this.size * 0.7, 0, this.size * 1.4);
      ctx.fillStyle = 'rgba(162, 28, 175, 0.9)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.size * 0.6, 0, this.size * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#fdf4ff';
      if (!isLow) {
         ctx.shadowBlur = 15;
         ctx.shadowColor = '#ffffff';
      }
      ctx.fill();

      ctx.strokeStyle = 'rgba(232, 121, 249, 0.7)';
      ctx.lineWidth = this.size * 0.2;
      ctx.lineCap = 'round';
      for (let t = -1; t <= 1; t++) {
         ctx.beginPath();
         ctx.moveTo(0, t * this.size * 0.8);
         ctx.quadraticCurveTo(-this.size * 1.5, t * this.size * 1.2, -this.size * 2.5, t * this.size * 0.5);
         ctx.stroke();
      }
      ctx.shadowBlur = 0;

    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      headGrad.addColorStop(0, this.color);
      headGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = headGrad;
      ctx.fill();

      const eyeOffsetX = this.size * 0.3;
      const eyeSize = this.size * 0.45;
      
      ctx.fillStyle = '#00b4d8';
      ctx.beginPath(); ctx.arc(eyeOffsetX, 0, eyeSize, 0, Math.PI * 2); ctx.fill();
      
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath(); ctx.arc(eyeOffsetX + 2, 0, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();
    }

    if (this.isKing) {
      ctx.save();
      ctx.translate(-this.size * 0.15, 0);

      const crownGrad = ctx.createLinearGradient(0, -this.size * 0.8, 0, this.size * 0.8);
      crownGrad.addColorStop(0, '#fde047'); 
      crownGrad.addColorStop(0.5, '#fbbf24'); 
      crownGrad.addColorStop(1, '#b45309'); 

      ctx.fillStyle = crownGrad;
      ctx.strokeStyle = '#78350f'; 
      ctx.lineWidth = this.size * 0.15;
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(this.size * 0.2, -this.size * 0.7);
      ctx.lineTo(-this.size * 0.6, -this.size * 0.8); 
      ctx.lineTo(-this.size * 0.1, -this.size * 0.25); 
      ctx.lineTo(-this.size * 0.9, 0); 
      ctx.lineTo(-this.size * 0.1, this.size * 0.25); 
      ctx.lineTo(-this.size * 0.6, this.size * 0.8); 
      ctx.lineTo(this.size * 0.2, this.size * 0.7); 
      
      ctx.quadraticCurveTo(this.size * 0.5, 0, this.size * 0.2, -this.size * 0.7);
      
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444'; 
      ctx.beginPath(); ctx.arc(-this.size * 0.5, -this.size * 0.65, this.size * 0.12, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = '#3b82f6'; 
      ctx.beginPath(); ctx.arc(-this.size * 0.75, 0, this.size * 0.15, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = '#ef4444'; 
      ctx.beginPath(); ctx.arc(-this.size * 0.5, this.size * 0.75, this.size * 0.12, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath(); ctx.arc(-this.size * 0.65, -this.size * 0.1, this.size * 0.08, 0, Math.PI*2); ctx.fill();

      ctx.restore();
    }

    ctx.restore();
    
    if (this.size > 15 && !isLow) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, this.y - this.size - 10);
    }

    ctx.restore(); 
  }
}

// ==========================================
// GAME ENGINE CORE
// ==========================================
export default function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const joystick = useRef({ active: false, x: 0, y: 0, baseX: 0, baseY: 0 }); 
  
  const [isMobile, setIsMobile] = useState(false); 
  const [gameState, setGameState] = useState('START'); 
  const [score, setScore] = useState(0);
  const [playerRank, setPlayerRank] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [selectedSkinIndex, setSelectedSkinIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [powerups, setPowerups] = useState({ shield: 0, speed: 0, magnet: 0 });
  const [showSettings, setShowSettings] = useState(false);

  const [settings, setSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ocean_settings');
      return saved ? JSON.parse(saved) : { bgm: true, sfx: true, quality: 'high' };
    }
    return { bgm: true, sfx: true, quality: 'high' };
  });

  const [coins, setCoins] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('ocean_coins') || '0', 10);
    }
    return 0;
  });

  const [unlockedSkins, setUnlockedSkins] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ocean_unlocked_skins');
      return saved ? JSON.parse(saved) : ['classic', 'blue', 'lula_red'];
    }
    return ['classic', 'blue', 'lula_red'];
  });

  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ocean_highscore');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const state = useRef({
    socket: null,
    playerId: null,
    snakes: [],
    orbs: [],
    particles: [],
    camera: { x: WORLD_CENTER, y: WORLD_CENTER, zoom: 1, baseZoomPulse: 0 }, 
    worldRadius: 2000,
    player: null,
    mouseX: 0,
    mouseY: 0,
    lastTime: 0,
    audio: new AudioEngine(),
    spatialHash: new SpatialHash(200), 
    orbCanvases: {},
    eventQueue: [],
    finalScore: 0,
    earnedCoins: 0,
    lastKingId: null,
    settings: { bgm: true, sfx: true, quality: 'high' } 
  });

  // --- NOVO: Conexão Socket.io para Multijogador ---
  useEffect(() => {
    // Conecta ao servidor (usa o mesmo domínio da página, mas na porta 3001)
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? `http://${window.location.hostname}:3001` 
      : 'http://localhost:3001';
    const socket = io(socketUrl);
    state.current.socket = socket;

    socket.on('connect', () => console.log('Conectado ao servidor multijogador!'));

    socket.on('joined', ({ playerId, orbs, worldSize }) => {
      state.current.playerId = playerId;
      // No servidor, o mundo é 0-6000. No cliente, centralizamos em 3000.
      state.current.worldRadius = worldSize / 2;
      
      // Carregar orbs iniciais do servidor
      state.current.orbs = orbs.map(o => new Orb(o.x, o.y, o.isPowerup, o.type, o.color));
    });

    socket.on('state', ({ snakes, events }) => {
      const s = state.current;
      // Atualiza cobras (simples por enquanto: substitui tudo, ideal seria interpolar)
      s.snakes = snakes.map(dto => {
        // Tenta reaproveitar instância local se existir para manter suavidade
        let snake = s.snakes.find(ls => ls.id === dto.id);
        if (!snake) {
          snake = new Snake(dto.x, dto.y, dto.name, dto.id === s.playerId, { color: dto.color, type: 'cyclops' });
          snake.id = dto.id;
        }
        
        snake.x = dto.x;
        snake.y = dto.y;
        snake.angle = dto.angle;
        snake.score = dto.score;
        snake.isBoosting = dto.isBoosting;
        snake.shieldTimer = dto.shieldTimer;
        snake.speedTimer = dto.speedTimer;
        
        // Atualiza corpo do DTO (o DTO envia apenas alguns segmentos para economizar banda)
        if (dto.body) {
          snake.body = dto.body.map(seg => ({ x: seg[0], y: seg[1] }));
        }
        
        if (snake.isPlayer) s.player = snake;
        return snake;
      });

      // Processa eventos do servidor (mortes, etc)
      events.forEach(ev => {
        if (ev.type === 'death') {
          spawnExplosion(ev.x, ev.y, COLORS.coral, 30);
          if (ev.deadId === s.playerId) {
            setGameState('GAMEOVER');
            if (s.audio) s.audio.play('death');
          }
        }
      });
    });

    socket.on('orbSpawn', (newOrbs) => {
      newOrbs.forEach(o => {
        state.current.orbs.push(new Orb(o.x, o.y, o.isPowerup, o.type, o.color));
      });
    });

    socket.on('orbCollected', ({ orbId }) => {
      state.current.orbs = state.current.orbs.filter(o => o.id !== orbId);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    state.current.settings = settings;
    state.current.audio.updateSettings(settings.bgm, settings.sfx);
    localStorage.setItem('ocean_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 800px)").matches || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const s = state.current;
    s.audio.updateSettings(settings.bgm, settings.sfx);
    
    [COLORS.green, COLORS.coral, COLORS.blue, COLORS.yellow, COLORS.purple, COLORS.danger, COLORS.neonGreen, COLORS.turquoise, COLORS.neonCyan, COLORS.neonPink, COLORS.boneWhite, COLORS.classicRed, COLORS.silver, COLORS.brGreen, COLORS.brYellow, COLORS.brBlue].forEach(color => {
      const oc = document.createElement('canvas');
      oc.width = 40; oc.height = 40;
      const octx = oc.getContext('2d');
      
      octx.shadowBlur = 12;
      octx.shadowColor = color;
      octx.fillStyle = color;
      octx.beginPath();
      octx.arc(20, 20, 6, 0, Math.PI * 2);
      octx.fill();
      
      octx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      octx.shadowBlur = 0;
      octx.beginPath();
      octx.arc(18, 17, 2, 0, Math.PI * 2);
      octx.fill();

      s.orbCanvases[color] = oc;
    });
  }, []);

  const spawnOrb = (x, y, value, isPowerup = false, type = 0, specificColor = null) => {
    const o = new Orb(x, y, isPowerup, type, specificColor);
    o.value = value;
    state.current.orbs.push(o);
    state.current.spatialHash.insert(o);
  };

  const spawnBot = () => {
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const randomSkin = SKINS[Math.floor(Math.random() * SKINS.length)];
    
    const pos = getSafeSpawnPosition(state.current.snakes, state.current.worldRadius);
    const bot = new Snake(pos.x, pos.y, name, false, randomSkin);
    
    const isGiant = Math.random() < 0.15;
    bot.score = isGiant ? randomRange(4000, 12000) : randomRange(300, 2500);
    
    state.current.snakes.push(bot);
  };

  const spawnExplosion = (x, y, color, count) => {
    let multiplier = state.current.settings.quality === 'low' ? 0.2 : (state.current.settings.quality === 'medium' ? 0.6 : 1.0);
    const actualCount = Math.floor(count * multiplier);

    for (let i = 0; i < actualCount; i++) {
      state.current.particles.push(new Particle(x, y, color, 1.5, 'solid'));
    }
  };

  const startGame = () => {
    const s = state.current;
    if (!s.socket) return;
    s.audio.init();
    
    s.snakes = [];
    s.orbs = [];
    s.particles = [];
    s.spatialHash.clear();
    s.eventQueue = [];
    s.lastKingId = null;

    const finalName = playerName.trim() === '' ? 'Anônimo' : playerName.trim();
    const chosenSkin = SKINS[selectedSkinIndex];
    
    // Solicita entrada no servidor multijogador
    s.socket.emit('join', { 
      name: finalName, 
      skinColor: chosenSkin.color,
      roomId: 'global' 
    });

    setGameState('PLAYING');
    setScore(500);
    setPowerups({ shield: 0, speed: 0, magnet: 0 });
    
    s.lastTime = performance.now();
    if (engineRef.current) cancelAnimationFrame(engineRef.current);
    engineRef.current = requestAnimationFrame(gameLoop);
  };

  const handleInput = (e) => {
    if (gameState !== 'PLAYING') return;
    
    if (joystick.current.active && e.touches) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches.length > 0) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }

    if (cx !== undefined && cy !== undefined) {
      state.current.mouseX = cx - rect.left;
      state.current.mouseY = cy - rect.top;
    }
  };

  const handleDown = () => { if (!isMobile && state.current.player) state.current.player.isBoosting = true; };
  const handleUp = () => { if (!isMobile && state.current.player) state.current.player.isBoosting = false; };

  const handleJoystickStart = (e) => {
    e.stopPropagation(); 
    joystick.current.active = true;
    const rect = e.currentTarget.getBoundingClientRect();
    joystick.current.baseX = rect.left + rect.width / 2;
    joystick.current.baseY = rect.top + rect.height / 2;
    handleJoystickMove(e);
  };

  const handleJoystickMove = (e) => {
    e.stopPropagation();
    if (!joystick.current.active) return;
    const touch = e.targetTouches[0];
    if (!touch) return;

    const dx = touch.clientX - joystick.current.baseX;
    const dy = touch.clientY - joystick.current.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 40; 
    const nx = dist > maxDist ? (dx / dist) * maxDist : dx;
    const ny = dist > maxDist ? (dy / dist) * maxDist : dy;

    joystick.current.x = nx;
    joystick.current.y = ny;

    const knob = document.getElementById('joystick-knob');
    if (knob) knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;

    const canvas = canvasRef.current;
    if (canvas) {
       state.current.mouseX = (canvas.width / 2) + nx * 10;
       state.current.mouseY = (canvas.height / 2) + ny * 10;
    }
  };

  const handleJoystickEnd = (e) => {
    e.stopPropagation();
    joystick.current.active = false;
    joystick.current.x = 0;
    joystick.current.y = 0;
    const knob = document.getElementById('joystick-knob');
    if (knob) knob.style.transform = `translate(-50%, -50%)`;
  };

  // ==========================================
  // MAIN UPDATE & RENDER LOOP
  // ==========================================
  const gameLoop = (timestamp) => {
    const s = state.current;
    const dt = Math.min((timestamp - s.lastTime) / 1000, 0.1);
    s.lastTime = timestamp;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let maxScore = 500;
    for (let i = 0; i < s.snakes.length; i++) {
      if (s.snakes[i].score > maxScore) maxScore = s.snakes[i].score;
    }
    
    const targetRadius = Math.max(2000, 1000 + (s.snakes.length * 80) + (maxScore * 0.15));
    const finalTargetRadius = Math.min(targetRadius, WORLD_CENTER - 500); 
    
    s.worldRadius = lerp(s.worldRadius, finalTargetRadius, dt * 0.015);

    // --- MULTIPLAYER UPDATE ---
    // Envia input para o servidor
    if (s.player && s.socket && s.socket.connected) {
      const inputAngle = Math.atan2(s.mouseY - canvas.height / 2, s.mouseX - canvas.width / 2);
      s.socket.emit('input', {
        angle: inputAngle,
        isBoosting: s.player.isBoosting
      });
    }

    // Atualiza partículas locais (efeitos visuais)
    for (let i = s.particles.length - 1; i >= 0; i--) {
      s.particles[i].update(dt);
      if (s.particles[i].life <= 0) s.particles.splice(i, 1);
    }

    // A lógica de orbs e cobras agora vem do servidor via socket.on('state')
    // Apenas atualizamos a câmera para seguir o jogador local
    if (s.player && !s.player.dead) {
      const lookAheadDist = s.player.isBoosting ? 200 : 60;
      const targetCamX = s.player.x + Math.cos(s.player.angle) * lookAheadDist;
      const targetCamY = s.player.y + Math.sin(s.player.angle) * lookAheadDist;

      s.camera.x = lerp(s.camera.x, targetCamX, dt * 3.5);
      s.camera.y = lerp(s.camera.y, targetCamY, dt * 3.5);
      
      let baseZoom = Math.max(0.65, 1.3 * Math.pow(500 / Math.max(500, s.player.score), 0.15));
      if (s.player.isBoosting) baseZoom *= 0.85; 
      s.camera.zoom = lerp(s.camera.zoom, baseZoom, dt * 2.0); 

      setScore(Math.floor(s.player.score));
      setPowerups({
        shield: Math.max(0, s.player.shieldTimer),
        speed: Math.max(0, s.player.speedTimer),
        magnet: 0 
      });
    }

    // O Rei é calculado pelo servidor, mas podemos destacar o maior aqui localmente para o HUD
    const currentKing = [...s.snakes].sort((a,b) => b.score - a.score)[0];
    if (currentKing) {
      s.snakes.forEach(snk => snk.isKing = (snk === currentKing));
    }

    if (s.player && !s.player.dead) {
      s.camera.baseZoomPulse += dt;
      
      const lookAheadDist = s.player.isBoosting ? 200 : 60;
      const targetCamX = s.player.x + Math.cos(s.player.angle) * lookAheadDist;
      const targetCamY = s.player.y + Math.sin(s.player.angle) * lookAheadDist;

      s.camera.x = lerp(s.camera.x, targetCamX, dt * 3.5);
      s.camera.y = lerp(s.camera.y, targetCamY, dt * 3.5);
      
      let baseZoom = Math.max(0.65, 1.3 * Math.pow(500 / Math.max(500, s.player.score), 0.15));
      
      baseZoom += Math.sin(s.camera.baseZoomPulse * 1.5) * 0.02;

      if (s.player.isBoosting) baseZoom *= 0.85; 

      s.camera.zoom = lerp(s.camera.zoom, baseZoom, dt * 2.0); 
    }

    ctx.fillStyle = '#10141d'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(s.camera.zoom, s.camera.zoom);
    ctx.translate(-s.camera.x, -s.camera.y);

    if (s.settings.quality !== 'low') {
      ctx.beginPath();
      ctx.arc(WORLD_CENTER, WORLD_CENTER, s.worldRadius, 0, Math.PI * 2);
      ctx.clip();
    }

    const viewW = canvas.width / s.camera.zoom;
    const viewH = canvas.height / s.camera.zoom;

    const R = 45; 
    const wHex = Math.sqrt(3) * R;
    const hHex = R * 1.5;
    const startCol = Math.floor((s.camera.x - viewW/2) / wHex) - 1;
    const endCol = Math.floor((s.camera.x + viewW/2) / wHex) + 1;
    const startRow = Math.floor((s.camera.y - viewH/2) / hHex) - 1;
    const endRow = Math.floor((s.camera.y + viewH/2) / hHex) + 1;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0a0d14'; 

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        let hx = col * wHex;
        let hy = row * hHex;
        if (row % 2 !== 0) hx += wHex / 2;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 3 * i - Math.PI / 6;
          ctx.lineTo(hx + R * Math.cos(angle), hy + R * Math.sin(angle));
        }
        ctx.closePath();
        
        const grad = ctx.createLinearGradient(hx, hy - R, hx, hy + R);
        grad.addColorStop(0, '#1c2331');
        grad.addColorStop(1, '#0e121a');
        ctx.fillStyle = grad;
        
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(255, 60, 60, 0.4)';
    ctx.lineWidth = 40;
    if (s.settings.quality !== 'low') {
      ctx.shadowBlur = 80;
      ctx.shadowColor = 'red';
    }
    ctx.beginPath();
    ctx.arc(WORLD_CENTER, WORLD_CENTER, s.worldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    s.orbs.forEach(orb => {
      if (Math.abs(orb.x - s.camera.x) < viewW/2 + 50 && Math.abs(orb.y - s.camera.y) < viewH/2 + 50) {
        orb.draw(ctx, s.orbCanvases, s.settings.quality);
      }
    });

    s.particles.forEach(p => p.draw(ctx, s.settings.quality));

    const sortedSnakes = [...s.snakes].sort((a, b) => a.size - b.size);
    sortedSnakes.forEach(snake => snake.draw(ctx, s.settings.quality));

    ctx.restore();

    if (s.player && !s.player.dead) {
      const mmRadius = 60;
      const mmX = canvas.width - mmRadius - 20;
      const mmY = canvas.height - mmRadius - 20;

      ctx.fillStyle = 'rgba(10, 15, 25, 0.6)';
      ctx.beginPath();
      ctx.arc(mmX, mmY, mmRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255, 60, 60, 0.5)'; 
      ctx.lineWidth = 2;
      ctx.stroke();

      s.snakes.forEach(snake => {
        const px = mmX + ((snake.x - WORLD_CENTER) / s.worldRadius) * (mmRadius * 0.95);
        const py = mmY + ((snake.y - WORLD_CENTER) / s.worldRadius) * (mmRadius * 0.95);
        
        ctx.fillStyle = snake.isPlayer ? 'white' : 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(px, py, snake.isPlayer ? 3 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (timestamp % 200 < 20) {
      if (s.player) {
        setScore(Math.floor(s.player.score));
        setPowerups({
          shield: s.player.shieldTimer,
          speed: s.player.speedTimer,
          magnet: s.player.magnetTimer
        });
      }
      
      const allSorted = [...s.snakes].sort((a, b) => b.score - a.score);
      const myRankIndex = allSorted.findIndex(snk => snk.isPlayer);
      setPlayerRank(myRankIndex + 1);
      setTotalPlayers(allSorted.length);

      const leaders = allSorted
        .slice(0, 10)
        .map((snk, i) => ({ 
          name: snk.name, 
          score: Math.floor(snk.score), 
          isMe: snk.isPlayer, 
          rank: i+1,
          color: snk.color 
        }));
      setLeaderboard(leaders);
    }

    engineRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSkinUnlocked = unlockedSkins.includes(SKINS[selectedSkinIndex].id);

  const handleUnlock = () => {
    const currentSkin = SKINS[selectedSkinIndex];
    if (coins >= currentSkin.cost && !isSkinUnlocked) {
      const newCoins = coins - currentSkin.cost;
      setCoins(newCoins);
      localStorage.setItem('ocean_coins', newCoins.toString());
      
      const newUnlocked = [...unlockedSkins, currentSkin.id];
      setUnlockedSkins(newUnlocked);
      localStorage.setItem('ocean_unlocked_skins', JSON.stringify(newUnlocked));
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 select-none touch-none font-sans">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair touch-none"
        onMouseMove={handleInput}
        onTouchMove={handleInput}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
      />

      {gameState === 'PLAYING' && (
        <>
          <div className="absolute top-4 left-4 text-white/80 pointer-events-none drop-shadow-md text-sm leading-tight z-10 bg-black/30 p-3 rounded-xl backdrop-blur-sm border border-white/10">
            <p>Seu comprimento: <b className="text-white text-base">{Math.floor(score / 10)}</b></p>
            <p className="text-white/60 text-xs mt-1">Classificação: <span className="text-yellow-400 font-bold">{playerRank}</span> de {totalPlayers}</p>
            <p className="text-yellow-400 font-bold text-sm mt-1 flex items-center gap-1">🪙 {state.current.player?.sessionCoins || 0}</p>
          </div>

          <div className="absolute top-4 right-6 text-white text-sm pointer-events-none text-right z-10 font-medium bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-white/10 hidden sm:block">
            <h3 className="font-bold text-gray-300 text-lg mb-1 tracking-wide">Líderes</h3>
            <div className="flex flex-col gap-[2px]">
              {leaderboard.map((player) => (
                <div key={player.rank} className={`flex justify-end items-center gap-3 ${player.isMe ? 'font-bold bg-white/10 px-2 rounded' : ''}`}>
                  <span className="text-gray-400 w-4 text-xs">#{player.rank}</span>
                  <span className="w-24 md:w-32 truncate text-left" style={{ color: player.color }}>
                    {player.name}
                  </span>
                  <span className="w-10 text-gray-300 text-xs">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="absolute top-24 left-4 flex flex-col gap-2 pointer-events-none z-10">
            {powerups.shield > 0 && (
              <div className="flex items-center gap-2 bg-blue-500/30 backdrop-blur px-3 py-1 rounded-full border border-blue-400">
                <span className="text-lg">🛡️</span>
                <div className="w-20 md:w-24 h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400" style={{ width: `${(powerups.shield / 8) * 100}%` }} />
                </div>
              </div>
            )}
            {powerups.speed > 0 && (
              <div className="flex items-center gap-2 bg-yellow-500/30 backdrop-blur px-3 py-1 rounded-full border border-yellow-400">
                <span className="text-lg">⚡</span>
                <div className="w-20 md:w-24 h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${(powerups.speed / 6) * 100}%` }} />
                </div>
              </div>
            )}
            {powerups.magnet > 0 && (
              <div className="flex items-center gap-2 bg-purple-500/30 backdrop-blur px-3 py-1 rounded-full border border-purple-400">
                <span className="text-lg">🧲</span>
                <div className="w-20 md:w-24 h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400" style={{ width: `${(powerups.magnet / 10) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {isMobile && (
            <>
              <div
                className="absolute bottom-8 left-8 w-32 h-32 bg-white/10 rounded-full border-2 border-white/20 backdrop-blur-md z-50 pointer-events-auto shadow-[0_0_20px_rgba(255,255,255,0.1)] touch-none"
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div 
                  className="absolute top-1/2 left-1/2 w-14 h-14 bg-white/50 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 border border-white/80 transition-transform duration-75"
                  id="joystick-knob"
                ></div>
              </div>

              <div
                className="absolute bottom-10 right-10 w-[80px] h-[80px] bg-yellow-500/30 rounded-full border-2 border-yellow-400 backdrop-blur-md flex items-center justify-center z-50 shadow-[0_0_20px_rgba(250,204,21,0.4)] pointer-events-auto active:bg-yellow-500/60 active:scale-95 transition-all touch-none"
                onTouchStart={(e) => { e.stopPropagation(); if (state.current.player) state.current.player.isBoosting = true; }}
                onTouchEnd={(e) => { e.stopPropagation(); if (state.current.player) state.current.player.isBoosting = false; }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span className="text-4xl translate-x-[2px] translate-y-[2px]">⚡</span>
              </div>
            </>
          )}

          <button 
            onClick={() => setShowSettings(true)}
            className="absolute top-4 right-4 sm:bottom-4 sm:top-auto bg-black/40 hover:bg-black/60 text-white w-12 h-12 flex items-center justify-center rounded-full backdrop-blur border border-white/20 transition-all text-xl cursor-pointer z-50"
            title="Configurações"
          >
            ⚙️
          </button>
        </>
      )}

      {gameState !== 'PLAYING' && (
        <div className="absolute inset-0 bg-[#161a22] flex flex-col items-center justify-center z-40 font-sans">
          
          <div className="absolute top-4 right-4 bg-black/40 border border-yellow-500/50 px-4 py-2 rounded-full text-yellow-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.3)] flex items-center gap-2">
            🪙 {coins}
          </div>

          <button 
            onClick={() => setShowSettings(true)}
            className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white w-12 h-12 flex items-center justify-center rounded-full backdrop-blur border border-white/20 transition-all text-2xl cursor-pointer z-50"
            title="Configurações"
          >
            ⚙️
          </button>

          {gameState === 'GAMEOVER' && (
            <div className="absolute top-20 text-center animate-fade-in-up px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-red-500 mb-2 drop-shadow-md">VOCÊ FOI DEVORADO</h2>
              <p className="text-white text-lg md:text-xl">Comprimento Final: <span className="font-bold text-yellow-400">{Math.floor(state.current.finalScore/10)}</span></p>
              <p className="text-yellow-400 font-bold text-lg mt-2 flex items-center justify-center gap-2">
                + {state.current.earnedCoins} 🪙
              </p>
            </div>
          )}

          <div className="flex flex-col items-center">
            <h1 
              className="text-6xl md:text-8xl font-black tracking-tighter mb-4 md:mb-6 text-center"
              style={{
                background: 'linear-gradient(to right, #4ade80, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.3))'
              }}
            >
              ocean.io
            </h1>

            <p className="text-[#4b5563] text-xs md:text-sm font-medium mb-6 md:mb-8 px-4 text-center">
              Não deixe sua cabeça tocar em outras criaturas!
            </p>

            {highScore > 0 && (
              <div className="mb-6 bg-black/40 border border-[#8b5cf6]/30 px-6 py-2 rounded-full text-yellow-400 font-bold text-sm md:text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] flex items-center gap-2">
                🏆 Recorde Pessoal: {highScore}
              </div>
            )}

            <div className="flex items-center gap-4 md:gap-6 mb-6">
              <button 
                onClick={() => setSelectedSkinIndex((prev) => (prev === 0 ? SKINS.length - 1 : prev - 1))} 
                className="text-4xl md:text-5xl text-[#7e75a6] hover:text-white transition-colors cursor-pointer pb-2 px-2"
              >
                &lt;
              </button>
              
              <div className="flex flex-col items-center justify-center w-36 md:w-40 relative mt-2">
                
                <div className="relative mb-5 mt-1 group transition-transform duration-300 hover:scale-105">
                  <div 
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden" 
                    style={{ 
                      background: SKINS[selectedSkinIndex].type.startsWith('dragon') ? 'radial-gradient(circle, #333 0%, #000 100%)' : (SKINS[selectedSkinIndex].type === 'chain' ? 'radial-gradient(circle, #4b5563 0%, #111827 100%)' : `radial-gradient(circle, ${SKINS[selectedSkinIndex].color} 0%, rgba(0,0,0,0.8) 100%)`),
                      border: SKINS[selectedSkinIndex].type.startsWith('dragon') ? `2px solid ${SKINS[selectedSkinIndex].color}` : `2px solid ${SKINS[selectedSkinIndex].color}`,
                      boxShadow: SKINS[selectedSkinIndex].id.includes('neon') ? `0 0 20px ${SKINS[selectedSkinIndex].color}` : '0 0 20px rgba(0,0,0,0.5)'
                    }}
                  >
                    {SKINS[selectedSkinIndex].type.startsWith('dragon') && (
                      <div className="absolute flex gap-2 animate-float-avatar">
                        <div className="w-4 h-1 rotate-[20deg] animate-wiggle-fin origin-left" style={{ backgroundColor: SKINS[selectedSkinIndex].color, boxShadow: `0 0 8px ${SKINS[selectedSkinIndex].color}` }}></div>
                        <div className="w-4 h-1 -rotate-[20deg] animate-wiggle-fin origin-left" style={{ backgroundColor: SKINS[selectedSkinIndex].color, boxShadow: `0 0 8px ${SKINS[selectedSkinIndex].color}`, animationDelay: '0.3s' }}></div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type.startsWith('skeleton') && (
                      <div className="absolute flex flex-col items-center justify-center animate-float-avatar">
                        <div className="w-10 h-9 rounded-full relative" style={{ backgroundColor: SKINS[selectedSkinIndex].color, boxShadow: SKINS[selectedSkinIndex].id.includes('neon') ? `0 0 10px ${SKINS[selectedSkinIndex].color}` : 'none' }}>
                          <div className="absolute w-3 h-3 bg-black rounded-full left-1.5 top-2.5"></div>
                          <div className="absolute w-3 h-3 bg-black rounded-full right-1.5 top-2.5"></div>
                          <div className="absolute w-2 h-1.5 bg-black left-4 bottom-1 rounded-sm animate-pulse-avatar"></div>
                        </div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'cyclops' && (
                      <div className="w-6 h-6 bg-[#00b4d8] rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] animate-pulse-avatar">
                        <div className="w-3 h-3 bg-black rounded-full ml-1"></div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'star' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full animate-float-avatar">
                         <div className="absolute w-[85%] h-[85%] scale-110">
                            <div className="w-full h-full bg-[#facc15] shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] animate-spin-slow" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
                         </div>
                         <div className="absolute flex flex-col gap-2 translate-x-3 z-10">
                            <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-end border border-yellow-600"><div className="w-1.5 h-1.5 bg-black rounded-full mr-0.5"></div></div>
                            <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-end border border-yellow-600"><div className="w-1.5 h-1.5 bg-black rounded-full mr-0.5"></div></div>
                         </div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'mantis' && (
                      <div className="absolute flex items-center justify-center w-full h-full scale-90 animate-float-avatar">
                         <div className="absolute flex flex-col justify-between h-[85%] w-[40%] right-2 z-0">
                            <div className="w-8 h-6 bg-gradient-to-b from-red-400 to-red-600 rounded-full shadow-lg transform rotate-[15deg] origin-right animate-punch-top"></div>
                            <div className="w-8 h-6 bg-gradient-to-t from-red-400 to-red-600 rounded-full shadow-lg transform -rotate-[15deg] origin-right animate-punch-bottom"></div>
                         </div>
                         
                         <div className="absolute w-[85%] h-[65%] bg-gradient-to-r from-[#059669] to-[#10b981] rounded-full shadow-[inset_-4px_0_10px_rgba(0,0,0,0.4)] z-10 border border-[#047857]"></div>
                         
                         <div className="absolute flex flex-col justify-between h-[50%] -right-1 z-20 animate-sway-avatar origin-left">
                            <div className="flex items-center transform -rotate-12 translate-x-1">
                               <div className="w-4 h-2 bg-[#10b981] rounded-l-sm"></div>
                               <div className="w-6 h-4 bg-[#0f172a] rounded-full -ml-2 flex flex-col items-center justify-center shadow-md border border-[#1e293b] overflow-hidden">
                                  <div className="w-full h-1 bg-[#facc15] shadow-[0_0_4px_#facc15]"></div>
                               </div>
                            </div>
                            <div className="flex items-center transform rotate-12 translate-x-1">
                               <div className="w-4 h-2 bg-[#10b981] rounded-l-sm"></div>
                               <div className="w-6 h-4 bg-[#0f172a] rounded-full -ml-2 flex flex-col items-center justify-center shadow-md border border-[#1e293b] overflow-hidden">
                                  <div className="w-full h-1 bg-[#facc15] shadow-[0_0_4px_#facc15]"></div>
                               </div>
                            </div>
                         </div>
                         
                         <div className="absolute right-[30%] flex gap-2 z-20 opacity-80 flex-col">
                            <div className="h-8 w-2 bg-[#0ea5e9] rounded-full"></div>
                            <div className="h-6 w-2 bg-[#f59e0b] rounded-full my-auto mx-auto"></div>
                         </div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'dolphin' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full animate-float-avatar">
                         <div className="absolute w-[80%] h-[80%] bg-[#38bdf8] rounded-full shadow-[inset_-2px_-4px_8px_rgba(0,0,0,0.2)] z-10 translate-x-1"></div>
                         <div className="absolute w-[35%] h-[20%] bg-[#7dd3fc] rounded-full z-20 translate-x-8"></div>
                         <div className="absolute w-3.5 h-3.5 bg-white rounded-full z-30 translate-x-3 -translate-y-3 flex items-center justify-end overflow-hidden"><div className="w-2 h-2 bg-black rounded-full mr-0.5"><div className="w-1 h-1 bg-white rounded-full mt-0.5 ml-0.5"></div></div></div>
                         <div className="absolute w-3.5 h-3.5 bg-white rounded-full z-30 translate-x-3 translate-y-3 flex items-center justify-end overflow-hidden"><div className="w-2 h-2 bg-black rounded-full mr-0.5"><div className="w-1 h-1 bg-white rounded-full mt-0.5 ml-0.5"></div></div></div>
                         <div className="absolute w-3 h-1.5 bg-[#0369a1] rounded-full z-20 -translate-x-3 opacity-80 animate-pulse-avatar"></div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'parrotfish' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full animate-float-avatar">
                         <div className="absolute w-[80%] h-[85%] bg-[#22c55e] rounded-full shadow-[inset_-2px_-4px_8px_rgba(0,0,0,0.2)] z-10 translate-x-1 animate-sway-avatar origin-center"></div>
                         <div className="absolute w-3 h-3 bg-[#06b6d4] rounded-full z-10 -translate-x-3 -translate-y-5 animate-pulse-avatar" style={{ animationDelay: '0.1s' }}></div>
                         <div className="absolute w-3 h-3 bg-[#06b6d4] rounded-full z-10 -translate-x-3 translate-y-5 animate-pulse-avatar" style={{ animationDelay: '0.3s' }}></div>
                         <div className="absolute w-2.5 h-2.5 bg-[#eab308] rounded-full z-10 -translate-x-7 -translate-y-3 animate-pulse-avatar" style={{ animationDelay: '0.5s' }}></div>
                         <div className="absolute w-2.5 h-2.5 bg-[#eab308] rounded-full z-10 -translate-x-7 translate-y-3 animate-pulse-avatar" style={{ animationDelay: '0.7s' }}></div>
                         
                         <div className="absolute z-20 translate-x-10 -translate-y-1 flex flex-col">
                            <div className="w-7 h-6 bg-[#f59e0b] border-[2px] border-[#92400e] rounded-tr-[100%] rounded-bl-sm rounded-br-[50%] z-10 relative shadow-sm"></div>
                            <div className="w-5 h-3 bg-[#d97706] border-[2px] border-[#92400e] border-t-0 rounded-br-[100%] rounded-bl-sm -mt-2 relative z-0"></div>
                         </div>

                         <div className="absolute w-3.5 h-3.5 bg-white rounded-full z-30 translate-x-2 -translate-y-4 flex items-center justify-end overflow-hidden"><div className="w-2 h-2 bg-black rounded-full mr-0.5"></div></div>
                         <div className="absolute w-3.5 h-3.5 bg-white rounded-full z-30 translate-x-2 translate-y-4 flex items-center justify-end overflow-hidden"><div className="w-2 h-2 bg-black rounded-full mr-0.5"></div></div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'pufferfish' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full animate-float-avatar">
                         <div className="absolute w-[110%] h-[110%] flex items-center justify-center z-0 animate-spin-slow">
                           <div className="w-1.5 h-[105%] bg-[#b45309] absolute"></div>
                           <div className="w-[105%] h-1.5 bg-[#b45309] absolute"></div>
                           <div className="w-1.5 h-[105%] bg-[#b45309] absolute rotate-45"></div>
                           <div className="w-[105%] h-1.5 bg-[#b45309] absolute rotate-45"></div>
                           <div className="w-1.5 h-[105%] bg-[#b45309] absolute rotate-[22.5deg]"></div>
                           <div className="w-1.5 h-[105%] bg-[#b45309] absolute rotate-[67.5deg]"></div>
                           <div className="w-1.5 h-[105%] bg-[#b45309] absolute rotate-[-22.5deg]"></div>
                           <div className="w-1.5 h-[105%] bg-[#b45309] absolute rotate-[-67.5deg]"></div>
                         </div>
                         <div className="absolute w-[80%] h-[80%] bg-[#eab308] rounded-full shadow-[inset_-2px_-4px_8px_rgba(0,0,0,0.3)] z-10 animate-pulse-avatar"></div>
                         <div className="absolute z-20 flex gap-2 translate-x-3 -translate-y-1">
                            <div className="w-3.5 h-3.5 bg-white rounded-full border border-[#ca8a04] flex items-center justify-end"><div className="w-1.5 h-1.5 bg-black rounded-full translate-y-1 mr-0.5"></div></div>
                            <div className="w-3.5 h-3.5 bg-white rounded-full border border-[#ca8a04] flex items-center justify-end"><div className="w-1.5 h-1.5 bg-black rounded-full translate-y-1 mr-0.5"></div></div>
                         </div>
                         <div className="absolute z-20 w-4 h-4 bg-[#fef08a] rounded-full opacity-80 translate-x-2 -translate-y-4 animate-pulse-avatar" style={{ animationDelay: '0.2s' }}></div>
                         <div className="absolute z-20 w-4 h-4 bg-[#fef08a] rounded-full opacity-80 translate-x-2 translate-y-3 animate-pulse-avatar" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'piranha' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full animate-float-avatar">
                         <div className="absolute w-[85%] h-[80%] bg-gradient-to-r from-[#475569] to-[#dc2626] rounded-full shadow-[inset_-2px_-4px_8px_rgba(0,0,0,0.3)] z-10 translate-x-1"></div>
                         <div className="absolute z-20 translate-x-7">
                           <div className="w-5 h-8 bg-[#991b1b] rounded-full flex items-center justify-center overflow-hidden border border-[#7f1d1d] animate-pulse-avatar">
                             <div className="absolute left-1 flex flex-col gap-[1px]">
                                <div className="w-0 h-0 border-y-[3px] border-y-transparent border-l-[4px] border-l-white"></div>
                                <div className="w-0 h-0 border-y-[3px] border-y-transparent border-l-[4px] border-l-white"></div>
                                <div className="w-0 h-0 border-y-[3px] border-y-transparent border-l-[4px] border-l-white"></div>
                                <div className="w-0 h-0 border-y-[3px] border-y-transparent border-l-[4px] border-l-white"></div>
                             </div>
                           </div>
                         </div>
                         <div className="absolute z-30 translate-x-1 -translate-y-3">
                            <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-end"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-0.5"></div></div>
                            <div className="w-4 h-1 bg-black absolute -top-1 left-0 rotate-12 rounded-full animate-sway-avatar origin-right"></div>
                         </div>
                         <div className="absolute z-30 translate-x-1 translate-y-3">
                            <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-end"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-0.5"></div></div>
                            <div className="w-4 h-1 bg-black absolute -bottom-1 left-0 -rotate-12 rounded-full animate-sway-avatar origin-right" style={{ animationDirection: 'reverse' }}></div>
                         </div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'chain' && (
                      <div className="absolute flex items-center justify-center transform -rotate-45 animate-float-avatar">
                         <div className="w-12 h-6 border-[4px] border-[#9ca3af] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center animate-pulse-avatar">
                            <div className="w-6 h-12 border-[4px] border-[#d1d5db] rounded-full absolute shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></div>
                         </div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'lula' && (
                      <div className="absolute flex flex-col gap-1 translate-x-2 animate-float-avatar">
                        <div className="w-5 h-5 bg-white rounded-full border-[2px] border-black flex items-center justify-end relative -top-1 left-2 animate-wiggle-fin origin-left">
                           <div className="w-2 h-2 bg-black rounded-full mr-0.5"></div>
                        </div>
                        <div className="w-5 h-5 bg-white rounded-full border-[2px] border-black flex items-center justify-end relative top-1 left-2 animate-wiggle-fin origin-left" style={{ animationDelay: '0.2s' }}>
                           <div className="w-2 h-2 bg-black rounded-full mr-0.5"></div>
                        </div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'seahorse' && (
                      <div className="absolute flex flex-col items-center justify-center scale-90 md:scale-100 animate-float-avatar">
                         <div className="absolute w-8 h-8 bg-[#002776] -top-6 rotate-45 rounded-sm animate-wiggle-fin origin-bottom"></div>
                         <div className="absolute w-12 h-4 bg-[#ffdf00] rounded-full left-4"></div>
                         <div className="absolute w-10 h-10 bg-[#009c3b] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"></div>
                         <div className="absolute w-5 h-5 bg-white rounded-full top-1 right-1 flex items-center justify-end border-2 border-transparent">
                            <div className="w-2.5 h-2.5 bg-black rounded-full mr-0.5"></div>
                         </div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'mermaid' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full animate-float-avatar">
                         <div className="absolute w-[95%] h-[105%] bg-[#db2777] rounded-full -translate-x-2 animate-sway-avatar origin-right"></div>
                         <div className="absolute w-5 h-5 bg-[#a855f7] -top-0 left-2 rotate-45 animate-spin-slow" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
                         <div className="absolute w-[65%] h-[65%] bg-[#fef08a] rounded-full shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.2)] flex flex-col justify-center translate-x-2">
                            <div className="flex justify-end pr-2 w-full gap-1 mb-0.5 mt-0.5">
                               <div className="w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center overflow-hidden"><div className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full translate-x-0.5"></div></div>
                               <div className="w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center overflow-hidden"><div className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full translate-x-0.5"></div></div>
                            </div>
                            <div className="flex justify-end pr-3.5 w-full gap-2.5 opacity-50">
                               <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse-avatar"></div>
                               <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse-avatar" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                         </div>
                      </div>
                    )}
                    {/* --- PREVIEW NA UI DO TUBARÃO --- */}
                    {SKINS[selectedSkinIndex].type === 'shark' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full animate-float-avatar">
                         {/* Barbatanas laterais (Peitorais) */}
                         <div className="absolute w-8 h-10 bg-[#334155] rounded-bl-full z-0 bottom-[10%] transform rotate-[60deg] translate-x-2 animate-wiggle-fin origin-top"></div>
                         <div className="absolute w-8 h-10 bg-[#334155] rounded-tl-full z-0 top-[10%] transform -rotate-[60deg] translate-x-2 animate-wiggle-fin origin-bottom" style={{ animationDelay: '0.2s' }}></div>
                         
                         {/* Corpo principal */}
                         <div className="absolute w-[95%] h-[75%] bg-gradient-to-r from-[#94a3b8] to-[#475569] rounded-l-[40px] rounded-r-[100px] shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.3)] z-10 translate-x-1 border-b-2 border-[#334155]"></div>

                         {/* Olhos de Predador */}
                         <div className="absolute z-20 translate-x-7 -translate-y-3 flex items-center">
                            <div className="w-3.5 h-3.5 bg-black rounded-full border-2 border-white relative overflow-hidden"><div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5"></div></div>
                         </div>
                         <div className="absolute z-20 translate-x-7 translate-y-3 flex items-center">
                            <div className="w-3.5 h-3.5 bg-black rounded-full border-2 border-white relative overflow-hidden"><div className="w-1 h-1 bg-white rounded-full absolute bottom-0.5 right-0.5"></div></div>
                         </div>

                         {/* Guelras */}
                         <div className="absolute z-20 -translate-x-2 flex gap-1.5 opacity-40">
                            <div className="w-1.5 h-6 bg-[#0f172a] rounded-full rotate-[15deg]"></div>
                            <div className="w-1.5 h-8 bg-[#0f172a] rounded-full rotate-[15deg]"></div>
                            <div className="w-1.5 h-6 bg-[#0f172a] rounded-full rotate-[15deg]"></div>
                         </div>
                      </div>
                    )}
                    {/* --- PREVIEW NA UI DO ESCORPIÃO --- */}
                    {SKINS[selectedSkinIndex].type === 'scorpion' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full animate-float-avatar">
                         {/* Garras Animadas (Pinças) */}
                         <div className="absolute flex justify-between w-[110%] h-[90%] z-0">
                            <div className="w-14 h-12 bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] rounded-l-full rounded-r-[5px] rounded-tl-sm absolute right-[-5px] -top-3 transform rotate-[25deg] origin-left animate-pincer-top shadow-md border-[2px] border-[#450a0a]">
                               <div className="absolute right-0 top-3 w-4 h-4 bg-transparent border-t-2 border-r-2 border-black rotate-45 rounded-tr-md"></div>
                            </div>
                            <div className="w-14 h-12 bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] rounded-l-full rounded-r-[5px] rounded-bl-sm absolute right-[-5px] -bottom-3 transform -rotate-[25deg] origin-left animate-pincer-bottom shadow-md border-[2px] border-[#450a0a]">
                               <div className="absolute right-0 bottom-3 w-4 h-4 bg-transparent border-b-2 border-r-2 border-black -rotate-45 rounded-br-md"></div>
                            </div>
                         </div>

                         {/* Corpo Carapaça */}
                         <div className="absolute w-[80%] h-[85%] bg-gradient-to-br from-[#ef4444] to-[#b91c1c] rounded-full shadow-[inset_-2px_-2px_12px_rgba(0,0,0,0.6)] z-10 border-2 border-[#7f1d1d] flex items-center justify-center flex-col gap-1.5">
                            <div className="w-[75%] h-1.5 bg-[#450a0a] rounded-full opacity-40"></div>
                            <div className="w-[85%] h-1.5 bg-[#450a0a] rounded-full opacity-40"></div>
                            <div className="w-[75%] h-1.5 bg-[#450a0a] rounded-full opacity-40"></div>
                         </div>

                         {/* Olhinhos Pretos (Múltiplos) */}
                         <div className="absolute z-20 flex gap-2 translate-x-5 -translate-y-3">
                            <div className="w-2.5 h-2.5 bg-black rounded-full shadow-[0_0_2px_#000]"></div>
                         </div>
                         <div className="absolute z-20 flex gap-2 translate-x-5 translate-y-3">
                            <div className="w-2.5 h-2.5 bg-black rounded-full shadow-[0_0_2px_#000]"></div>
                         </div>
                         <div className="absolute z-20 flex gap-2 translate-x-8 -translate-y-1">
                            <div className="w-2 h-2 bg-black rounded-full shadow-[0_0_2px_#000]"></div>
                         </div>
                         <div className="absolute z-20 flex gap-2 translate-x-8 translate-y-1">
                            <div className="w-2 h-2 bg-black rounded-full shadow-[0_0_2px_#000]"></div>
                         </div>
                      </div>
                    )}
                    {SKINS[selectedSkinIndex].type === 'medusa' && (
                      <div className="absolute flex flex-col items-center justify-center w-full h-full mt-2 animate-float-avatar">
                         <div className="absolute w-[75%] h-[45%] bg-gradient-to-b from-[#fdf4ff] to-[#c026d3] rounded-t-[100px] top-[10%] shadow-[0_0_15px_rgba(217,70,239,0.8)] opacity-90 border-b-2 border-fuchsia-300 animate-pulse-avatar origin-bottom"></div>
                         <div className="absolute w-5 h-5 bg-white rounded-full top-[25%] shadow-[0_0_12px_#fff] animate-pulse-avatar"></div>
                         <div className="absolute flex gap-1.5 top-[55%] animate-sway-avatar origin-top">
                            <div className="w-1.5 h-7 bg-fuchsia-400 rounded-full opacity-80 rotate-[-10deg] translate-x-1 animate-wiggle-fin origin-top"></div>
                            <div className="w-1 h-9 bg-fuchsia-300 rounded-full opacity-90 animate-wiggle-fin origin-top" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1.5 h-10 bg-purple-400 rounded-full opacity-80 translate-y-1 animate-wiggle-fin origin-top" style={{ animationDelay: '0.4s' }}></div>
                            <div className="w-1 h-9 bg-fuchsia-300 rounded-full opacity-90 animate-wiggle-fin origin-top" style={{ animationDelay: '0.6s' }}></div>
                            <div className="w-1.5 h-7 bg-fuchsia-400 rounded-full opacity-80 rotate-[10deg] -translate-x-1 animate-wiggle-fin origin-top" style={{ animationDelay: '0.8s' }}></div>
                         </div>
                      </div>
                    )}
                    {!isSkinUnlocked && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="text-3xl drop-shadow-md">🔒</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 z-20">
                    <div className={`px-3 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap animate-float-subtle ${RARITY_CONFIG[SKINS[selectedSkinIndex].rarity].classes}`}>
                      {RARITY_CONFIG[SKINS[selectedSkinIndex].rarity].label}
                    </div>
                  </div>
                </div>

                <span 
                  className="font-bold text-sm md:text-base tracking-widest uppercase transition-colors text-center px-2 w-full whitespace-nowrap overflow-hidden text-ellipsis" 
                  style={{ 
                    color: SKINS[selectedSkinIndex].color === '#1a1a1a' ? '#ff4444' : SKINS[selectedSkinIndex].color,
                    textShadow: SKINS[selectedSkinIndex].id.includes('neon') ? `0 0 8px ${SKINS[selectedSkinIndex].color}` : 'none'
                  }}
                >
                  {SKINS[selectedSkinIndex].name}
                </span>
              </div>

              <button 
                onClick={() => setSelectedSkinIndex((prev) => (prev === SKINS.length - 1 ? 0 : prev + 1))} 
                className="text-4xl md:text-5xl text-[#7e75a6] hover:text-white transition-colors cursor-pointer pb-2 px-2"
              >
                &gt;
              </button>
            </div>

            <div className="relative group mb-4">
              <input 
                type="text" 
                maxLength={16}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Apelido" 
                onKeyDown={(e) => { if (e.key === 'Enter' && isSkinUnlocked) startGame(); }}
                className="bg-[#3b3461] text-white placeholder-[#7e75a6] px-6 py-3 md:py-4 rounded-full text-base md:text-lg w-64 md:w-72 text-center border-2 border-transparent focus:border-[#8b5cf6] outline-none shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)] transition-all"
              />
            </div>

            {isSkinUnlocked ? (
              <button 
                onClick={startGame}
                className="bg-[#4caf50] hover:bg-[#45a049] text-white font-bold py-3 px-12 rounded-full text-xl shadow-[0_5px_0_#2e7d32] active:translate-y-[5px] active:shadow-none transition-all mt-2 w-64 md:w-auto"
              >
                Jogar
              </button>
            ) : (
              <button 
                onClick={handleUnlock}
                disabled={coins < SKINS[selectedSkinIndex].cost}
                className={`font-bold py-3 px-8 md:px-12 rounded-full text-lg md:text-xl transition-all mt-2 w-64 md:w-auto ${
                  coins >= SKINS[selectedSkinIndex].cost 
                    ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-[0_5px_0_#5b21b6] active:translate-y-[5px] active:shadow-none cursor-pointer' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-[0_5px_0_#374151]'
                }`}
              >
                Desbloquear (🪙 {SKINS[selectedSkinIndex].cost})
              </button>
            )}
          </div>

          <div className="absolute bottom-6 text-[#4b5563] text-xs text-center flex flex-col md:flex-row gap-2 md:gap-8">
            <span className="hidden md:inline">🖱️ Siga o Mouse | 👆 Segure para Acelerar</span>
            <span className="md:hidden">🕹️ Use o Joystick Virtual e o Botão de Acelerar</span>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md p-4">
          <div className="bg-[#1e2330] p-6 rounded-2xl border border-white/10 w-full max-w-sm flex flex-col gap-6 shadow-2xl">
            <h2 className="text-white text-2xl font-bold text-center border-b border-white/10 pb-4">Configurações ⚙️</h2>
            
            <div className="flex flex-col gap-4 text-white font-medium">
              <label className="flex items-center justify-between bg-white/5 p-3 rounded-lg cursor-pointer">
                <span>Som de Fundo (BGM) 🌊</span>
                <input 
                  type="checkbox" 
                  checked={settings.bgm}
                  onChange={() => setSettings(prev => ({ ...prev, bgm: !prev.bgm }))}
                  className="w-5 h-5 accent-[#8b5cf6]"
                />
              </label>

              <label className="flex items-center justify-between bg-white/5 p-3 rounded-lg cursor-pointer">
                <span>Efeitos Sonoros (SFX) 💥</span>
                <input 
                  type="checkbox" 
                  checked={settings.sfx}
                  onChange={() => setSettings(prev => ({ ...prev, sfx: !prev.sfx }))}
                  className="w-5 h-5 accent-[#8b5cf6]"
                />
              </label>

              <div className="bg-white/5 p-3 rounded-lg flex flex-col gap-2">
                <span>Qualidade Gráfica 🎮</span>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map(q => (
                    <button
                      key={q}
                      onClick={() => setSettings(prev => ({ ...prev, quality: q }))}
                      className={`flex-1 py-2 rounded capitalize text-sm transition-all ${
                        settings.quality === q ? 'bg-[#8b5cf6] text-white font-bold shadow-md' : 'bg-black/30 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {q === 'low' ? 'Baixa' : (q === 'medium' ? 'Média' : 'Alta')}
                    </button>
                  ))}
                </div>
                {settings.quality === 'low' && <p className="text-xs text-yellow-500 mt-1">Máxima performance (sem sombras/brilhos). Ideal para telemóveis antigos.</p>}
                {settings.quality === 'high' && <p className="text-xs text-green-400 mt-1">Visuais épicos e partículas completas.</p>}
              </div>
            </div>

            <button 
              onClick={() => setShowSettings(false)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-lg transition-colors mt-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 4s ease-out forwards;
        }

        /* --- NOVAS ANIMAÇÕES DAS TAGS --- */
        @keyframes float-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-float-subtle {
          animation: float-subtle 2.5s ease-in-out infinite;
        }
        
        @keyframes glow-rara {
          0%, 100% { box-shadow: 0 0 6px rgba(217,70,239,0.5); }
          50% { box-shadow: 0 0 16px rgba(217,70,239,1); }
        }
        .animate-glow-rara {
          animation: glow-rara 2s ease-in-out infinite;
        }
        
        @keyframes glow-premio {
          0%, 100% { box-shadow: 0 0 8px rgba(250,204,21,0.5); }
          50% { box-shadow: 0 0 20px rgba(250,204,21,1); }
        }
        .animate-glow-premio {
          animation: glow-premio 2s ease-in-out infinite;
        }

        /* --- ANIMAÇÕES DAS SKINS (PREVIEW) --- */
        @keyframes float-avatar {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-avatar { animation: float-avatar 3s ease-in-out infinite; }

        @keyframes sway-avatar {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        .animate-sway-avatar { animation: sway-avatar 4s ease-in-out infinite; }

        @keyframes pulse-avatar {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-avatar { animation: pulse-avatar 2s ease-in-out infinite; }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        
        @keyframes wiggle-fin {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        .animate-wiggle-fin { animation: wiggle-fin 2s ease-in-out infinite; }
        
        /* Novas animações para o Escorpião */
        @keyframes pincer-top {
          0%, 100% { transform: rotate(20deg); }
          50% { transform: rotate(40deg); }
        }
        .animate-pincer-top { animation: pincer-top 1.5s ease-in-out infinite; }

        @keyframes pincer-bottom {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(-40deg); }
        }
        .animate-pincer-bottom { animation: pincer-bottom 1.5s ease-in-out infinite; }

        @keyframes punch-top {
          0%, 100% { transform: rotate(15deg) translateX(0); }
          50% { transform: rotate(15deg) translateX(-4px); }
        }
        .animate-punch-top { animation: punch-top 0.5s ease-in-out infinite; }
        
        @keyframes punch-bottom {
          0%, 100% { transform: rotate(-15deg) translateX(0); }
          50% { transform: rotate(-15deg) translateX(-4px); }
        }
        .animate-punch-bottom { animation: punch-bottom 0.5s ease-in-out infinite 0.25s; }
      `}} />
    </div>
  );
}
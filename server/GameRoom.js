// GameRoom.js – Lógica do servidor de jogo
const WORLD_SIZE_BASE = 40000;
const WORLD_CENTER_COORD = 20000; // Centro fixo solicitado para mapas colossais
const BASE_SPEED = 140;
const BOOST_SPEED = 252;
const TURN_SPEED = 4.0;
const INITIAL_LENGTH = 15;
const TICK_RATE = 20;

const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
};
const distSq = (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2;
const randomRange = (min, max) => Math.random() * (max - min) + min;

const BOT_NAMES = [
  'Abyss Walker', 'Kraken', 'Megalodon', 'Siren', 'Leviathan',
  'Nemo', 'Moby', 'Orca', 'Tsunami', 'Coral Reaper',
  'Aqua', 'Deep Blue', 'Predator', 'Trench', 'Vortex',
];

const ORB_COLORS = ['#52b788', '#e07a5f', '#1a6fa8', '#f4d03f', '#9b59b6'];

class Orb {
  constructor() {
    this.id = Math.random().toString(36).substring(2, 9);
    // Spawn relativo ao centro
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 3000; 
    this.x = WORLD_CENTER_COORD + Math.cos(angle) * r;
    this.y = WORLD_CENTER_COORD + Math.sin(angle) * r;
    this.value = randomRange(10, 30);
    this.size = Math.sqrt(this.value) * 1.5;
    this.color = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
    this.isPowerup = false;
    this.collected = false;
  }
}

class PowerOrb extends Orb {
  constructor(type) {
    super();
    this.isPowerup = true;
    this.type = type; // 0=shield, 1=speed, 2=magnet, 3=coin
    const typeColors = ['#00b4d8', '#f4d03f', '#9b59b6', '#ffd700'];
    this.color = typeColors[type];
    this.value = 100;
    this.size = 15;
  }
}

class Snake {
  constructor(id, name, skinColor, isBot = false) {
    this.id = id;
    this.name = name;
    this.color = skinColor || '#39ff14';
    this.isBot = isBot;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 2000; 
    this.x = WORLD_CENTER_COORD + Math.cos(angle) * r;
    this.y = WORLD_CENTER_COORD + Math.sin(angle) * r;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.score = 500;
    this.dead = false;
    this.spawnProtection = 3.0;
    this.shieldTimer = 0;
    this.speedTimer = 0;
    this.magnetTimer = 0;
    this.isBoosting = false;
    this.boostEnergy = 100;
    this.sessionCoins = 0;
    this.skinType = 'cyclops'; // Valor padrão, pode ser atualizado no join

    // Build initial body
    this.body = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      this.body.push({ x: this.x - i * 5, y: this.y });
    }

    // Bot-specific AI
    if (isBot) {
      this.aggressiveness = Math.random();
      this.aiState = 'forage';
    }
  }

  get size() {
    return 12 + Math.sqrt(this.score) * 0.15;
  }

  get length() {
    return Math.floor(INITIAL_LENGTH + this.score / 100);
  }

  update(dt, input) {
    if (this.dead) return;
    if (this.spawnProtection > 0) this.spawnProtection -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.speedTimer > 0) this.speedTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;

    // Apply input (for real players) or AI
    if (!this.isBot && input) {
      this.targetAngle = input.angle;
      this.isBoosting = input.isBoosting;
    } else {
      this.updateAI(dt);
    }

    if (this.isBoosting && this.boostEnergy > 0) {
      this.boostEnergy -= dt * 25;
      if (this.score > 150) this.score -= dt * 20;
      if (this.boostEnergy <= 0) this.isBoosting = false;
    } else {
      this.boostEnergy = Math.min(100, this.boostEnergy + dt * 10);
    }

    const speedMult = this.speedTimer > 0 ? 3 : (this.isBoosting ? 1.8 : 1);
    const speed = BASE_SPEED * speedMult;
    this.angle = lerpAngle(this.angle, this.targetAngle, dt * TURN_SPEED);
    this.x += Math.cos(this.angle) * speed * dt;
    this.y += Math.sin(this.angle) * speed * dt;

    // Boundary check (circular)
    const dx = this.x - WORLD_CENTER_COORD;
    const dy = this.y - WORLD_CENTER_COORD;
    const distToCenter = Math.sqrt(dx*dx + dy*dy);
    const radiusLimit = WORLD_SIZE_BASE / 2; // Use WORLD_SIZE_BASE for the radius

    if (distToCenter > radiusLimit) {
      if (this.spawnProtection > 0) {
        // If protected, push back towards center
        const angleToCenter = Math.atan2(-dy, -dx);
        this.x = WORLD_CENTER_COORD + Math.cos(angleToCenter) * radiusLimit;
        this.y = WORLD_CENTER_COORD + Math.sin(angleToCenter) * radiusLimit;
        this.angle = angleToCenter; // Turn towards center
        this.targetAngle = angleToCenter;
      } else {
        this.dead = true;
        return;
      }
    }

    // Body update
    this.body.unshift({ x: this.x, y: this.y });
    while (this.body.length > this.length) this.body.pop();

    // Bot score growth
    if (this.isBot) this.score += dt * 10;
  }

  updateAI(dt) {
    // Simple wander + wall avoidance
    this.targetAngle += (Math.random() - 0.5) * dt * 2;
    const wallMargin = 500;
    const radiusLimit = this.worldRadiusLimit || 3000;
    
    const dx = this.x - WORLD_CENTER_COORD;
    const dy = this.y - WORLD_CENTER_COORD;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > radiusLimit - wallMargin) {
      const angleToCenter = Math.atan2(-dy, -dx);
      this.targetAngle = lerpAngle(this.targetAngle, angleToCenter, dt * 3);
    }
  }

  toDTO() {
    // Compact data for network transmission
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      x: Math.round(this.x),
      y: Math.round(this.y),
      angle: this.angle,
      score: Math.floor(this.score),
      size: this.size,
      isBoosting: this.isBoosting,
      shieldTimer: this.shieldTimer,
      speedTimer: this.speedTimer,
      magnetTimer: this.magnetTimer,
      isBot: this.isBot,
      skinType: this.skinType,
      // Send only every 3rd segment to reduce bandwidth
      body: this.body.filter((_, i) => i % 3 === 0).slice(0, 60).map(s => [Math.round(s.x), Math.round(s.y)])
    };
  }
}

class GameRoom {
  constructor(id, io) {
    this.id = id;
    this.io = io;
    this.players = new Map(); // socketId → Snake
    this.inputs = new Map();  // socketId → { angle, isBoosting }
    this.orbs = new Map();
    this.bots = [];
    this.tickInterval = null;
    this.lastTime = Date.now();
    this.events = []; // Events to broadcast this tick (kills, etc.)

    this.worldRadius = 3000;
    this.targetWorldRadius = 3000;

    this._spawnInitialOrbs(1500);
    this._spawnBots(30);
    this._startTick();
  }

  _spawnInitialOrbs(count) {
    for (let i = 0; i < count; i++) {
      const o = new Orb();
      this.orbs.set(o.id, o);
    }
    for (let i = 0; i < 10; i++) {
      const type = Math.floor(Math.random() * 4);
      const p = new PowerOrb(type);
      this.orbs.set(p.id, p);
    }
  }

  _spawnBots(count) {
    for (let i = 0; i < count; i++) {
      const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const colors = ['#00b4d8', '#e07a5f', '#52b788', '#f4d03f', '#9b59b6', '#ff4757'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const bot = new Snake(`bot_${i}_${Date.now()}`, name, color, true);
      bot.score = randomRange(300, 3000);
      this.bots.push(bot);
    }
  }

  _startTick() {
    this.tickInterval = setInterval(() => this._tick(), 1000 / TICK_RATE);
  }

  addPlayer(socketId, name, skinColor, skinType = 'cyclops') {
    const snake = new Snake(socketId, name, skinColor, false);
    snake.skinType = skinType;
    this.players.set(socketId, snake);
    this.inputs.set(socketId, { angle: 0, isBoosting: false });

    // Send initial state (orbs)
    const orbsArray = Array.from(this.orbs.values()).map(o => ({
      id: o.id, x: Math.round(o.x), y: Math.round(o.y),
      color: o.color, size: o.size, isPowerup: o.isPowerup,
      type: o.type
    }));
    return { snake, orbs: orbsArray };
  }

  removePlayer(socketId) {
    const snake = this.players.get(socketId);
    if (snake && !snake.dead) {
      // Drop orbs
      this._dropSnakeOrbs(snake);
    }
    this.players.delete(socketId);
    this.inputs.delete(socketId);
  }

  updateInput(socketId, input) {
    if (this.inputs.has(socketId)) {
      this.inputs.set(socketId, input);
    }
  }

  _tick() {
    const now = Date.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.events = [];

    this._updateWorldSize(dt);

    const allSnakes = [...this.players.values(), ...this.bots];

    // Update snakes
    allSnakes.forEach(snake => {
      if (snake.dead) return;
      const input = this.inputs.get(snake.id);
      // Passa o worldRadius para a cobra atualizar sua IA ou limites
      snake.worldRadiusLimit = this.worldRadius;
      snake.update(dt, input);
    });

    // Collect orbs
    allSnakes.forEach(snake => {
      if (snake.dead) return;
      // Raio de coleta: base + bônus de imã
      let r = snake.size * 1.8;
      if (snake.magnetTimer > 0) r += 180; 
      this.orbs.forEach((orb, orbId) => {
        if (distSq(snake.x, snake.y, orb.x, orb.y) < r * r) {
          snake.score += orb.value;
          if (orb.isPowerup) {
            if (orb.type === 0) snake.shieldTimer = 8;
            else if (orb.type === 1) snake.speedTimer = 6;
            else if (orb.type === 2) snake.magnetTimer = 10;
            else if (orb.type === 3) snake.sessionCoins++;
            this.events.push({ type: 'powerup', playerId: snake.id, orbType: orb.type });
          }
          this.orbs.delete(orbId);
          // Respawn a random orb
          setTimeout(() => {
            if (this.orbs.size < 1500) {
              const newOrb = new Orb();
              // Ajusta o spawn para ser dentro do raio atual
              const angle = Math.random() * Math.PI * 2;
              const r = Math.random() * this.worldRadius;
              newOrb.x = WORLD_CENTER_COORD + Math.cos(angle) * r;
              newOrb.y = WORLD_CENTER_COORD + Math.sin(angle) * r;
              
              this.orbs.set(newOrb.id, newOrb);
              this.io.to(this.id).emit('orbSpawn', [{ id: newOrb.id, x: Math.round(newOrb.x), y: Math.round(newOrb.y), color: newOrb.color, size: newOrb.size, isPowerup: false }]);
            }
          }, 200);
          this.events.push({ type: 'orbCollected', orbId });
        }
      });
    });

    // Collision detection (head vs body)
    allSnakes.forEach(attacker => {
      if (attacker.dead || attacker.spawnProtection > 0) return;
      
      // Limite do mapa circular dinâmico
      const dToCenter = Math.sqrt(distSq(attacker.x, attacker.y, WORLD_CENTER_COORD, WORLD_CENTER_COORD));
      if (dToCenter > this.worldRadius) {
         attacker.dead = true;
         this._dropSnakeOrbs(attacker);
         this.events.push({ type: 'death', deadId: attacker.id, name: attacker.name, killerName: 'Oceano Profundo' });
         return;
      }

      allSnakes.forEach(defender => {
        if (defender === attacker || defender.dead) return;
        defender.body.forEach((seg, i) => {
          if (i < 3) return; // skip head segments
          if (distSq(attacker.x, attacker.y, seg.x, seg.y) < (attacker.size * 0.8) ** 2) {
            if (attacker.shieldTimer > 0) {
              attacker.shieldTimer = 0;
              return;
            }
            attacker.dead = true;
            this._dropSnakeOrbs(attacker);
            this.events.push({ type: 'death', deadId: attacker.id, killerId: defender.id, name: attacker.name, killerName: defender.name });
          }
        });
      });
    });

    // Remove dead snakes and respawn bots
    this.bots = this.bots.filter(bot => {
      if (bot.dead) {
        // Respawn bot after delay
        setTimeout(() => {
          const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          const colors = ['#00b4d8', '#e07a5f', '#52b788', '#f4d03f', '#9b59b6'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const newBot = new Snake(`bot_${Date.now()}`, name, color, true);
          this.bots.push(newBot);
        }, 3000);
        return false;
      }
      return true;
    });

    // Broadcast state to all clients
    const playerDTOs = [...this.players.values()].map(s => s.toDTO());
    const botDTOs = this.bots.filter(b => !b.dead).map(s => s.toDTO());

    this.io.to(this.id).emit('state', {
      snakes: [...playerDTOs, ...botDTOs],
      events: this.events,
      worldRadius: Math.round(this.worldRadius),
      tick: Date.now()
    });
  }

  _updateWorldSize(dt) {
    const playerFactor = this.players.size * 200;
    const allSnakes = [...this.players.values(), ...this.bots];
    const maxScore = allSnakes.length > 0 ? Math.max(...allSnakes.map(s => s.score)) : 500;
    const scoreFactor = Math.sqrt(maxScore) * 15;
    
    // Alvo: Base (2500) + bônus por jogador + bônus pela maior cobra
    this.targetWorldRadius = 2500 + playerFactor + scoreFactor;
    
    // Expansão ultra-suave
    this.worldRadius = lerp(this.worldRadius, this.targetWorldRadius, dt * 0.2);
  }

  _dropSnakeOrbs(snake) {
    const count = Math.min(50, Math.floor(snake.body.length / 2));
    for (let i = 0; i < count; i++) {
      const seg = snake.body[i * 2] || snake.body[snake.body.length - 1];
      const o = new Orb();
      o.x = seg.x + randomRange(-20, 20);
      o.y = seg.y + randomRange(-20, 20);
      o.value = Math.max(10, snake.score / snake.body.length * 2);
      o.color = snake.color;
      o.size = Math.sqrt(o.value) * 1.5;
      this.orbs.set(o.id, o);
    }
    // Notify clients of new orbs
    const newOrbs = Array.from(this.orbs.values()).slice(-count).map(o => ({
      id: o.id, x: Math.round(o.x), y: Math.round(o.y),
      color: o.color, size: o.size, isPowerup: false
    }));
    this.io.to(this.id).emit('orbSpawn', newOrbs);
  }

  get isEmpty() {
    return this.players.size === 0;
  }

  destroy() {
    clearInterval(this.tickInterval);
  }
}

module.exports = { GameRoom };


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameObject, Point, LightningBolt, GameObjectType, Particle, VisualExplosion, DamageInfo, FloatingText, VortexEffect, Upgrades, UpgradeType, GameEvent, GameEventType, GameEventLightningStrike, GameEventObjectDestroyed, GameEventExplosion, GameEventVortex, GameEventSupercharge, GameEventUpgrade } from './types';
import { INITIAL_SPAWN_COUNT, SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, SPAWN_ACCELERATION_RATE, SPAWN_ACCELERATION_INTERVAL, MAX_OBJECTS_LIMIT, BASE_CHAIN_LIGHTNING_RANGE, CHAIN_LIGHTNING_MAX_JUMPS, BASE_LIGHTNING_DAMAGE, LIGHTNING_AOE_RADIUS, BASE_EXPLOSION_RADIUS, EXPLOSION_DAMAGE, EXPLOSIVE_BARREL_HP, RELIC_HP, SUPERCHARGE_DAMAGE_MULTIPLIER, SUPERCHARGE_AOE_MULTIPLIER, VORTEX_CRYSTAL_HP, VORTEX_IMPLOSION_DAMAGE, VORTEX_PULL_DURATION, VORTEX_PULL_RADIUS, BASE_MAX_ENERGY, BASE_ENERGY_REGEN_PER_SECOND, LIGHTNING_STRIKE_COST, CRYSTAL_ENERGY_REWARD } from './constants';
import GameObjectComponent from './components/GameObject';
import LightningBoltComponent from './components/LightningBolt';
import ParticleComponent from './components/Particle';
import ExplosionVisualComponent from './components/ExplosionVisual';
import FloatingTextComponent from './components/FloatingText';
import UpgradePanel from './components/UpgradePanel';
import GameOverModal from './components/GameOverModal';

const INFO_PANEL_WIDTH_BOUND = 500;
const INFO_PANEL_HEIGHT_BOUND = 400;

const initialUpgrades: Upgrades = {
    [UpgradeType.LightningDamage]: { level: 0, cost: 10, name: "번개 위력", description: "번개의 기본 피해량을 증가시킵니다." },
    [UpgradeType.MaxEnergy]: { level: 0, cost: 15, name: "최대 에너지", description: "보유할 수 있는 최대 에너지량을 늘립니다." },
    [UpgradeType.EnergyRegen]: { level: 0, cost: 20, name: "에너지 재생", description: "초당 에너지 회복 속도를 높입니다." },
    [UpgradeType.ChainLightningRange]: { level: 0, cost: 12, name: "연쇄 번개 사거리", description: "연쇄 번개가 더 먼 대상에게 닿습니다." },
    [UpgradeType.ExplosionRadius]: { level: 0, cost: 18, name: "폭발 반경", description: "폭발성 통의 폭발 범위를 넓힙니다." },
};


const generateLightningPath = (start: Point, end: Point): Point[] => {
  const path: Point[] = [start];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  
  const variance = len * 0.15; 
  const numSegments = Math.max(5, Math.ceil(len / (15 + Math.random() * 10)));

  for (let i = 1; i < numSegments; i++) {
    const t = i / numSegments;
    const midX = start.x + dx * t;
    const midY = start.y + dy * t;
    const varianceMultiplier = Math.sin(t * Math.PI);
    const offset = (Math.random() - 0.5) * 2 * variance * varianceMultiplier;
    const newX = midX + Math.cos(angle + Math.PI / 2) * offset;
    const newY = midY + Math.sin(angle + Math.PI / 2) * offset;
    path.push({ x: newX, y: newY });
  }

  path.push(end);
  return path;
};

const generateRandomObjects = (count: number, gameTime: number = 0): GameObject[] => {
  const objects: GameObject[] = [];
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const hpScaling = 1 + Math.floor(gameTime / 20) * 0.15; // Every 20s, HP increases by 15%

  for (let i = 0; i < count; i++) {
    const randomType = Math.random();
    let type: GameObjectType;
    let hp: number;
    let maxHp: number;
    let isConductive: boolean;
    let hasShield: boolean = false;
    let size;

    if (randomType < 0.05) { // 5% chance for a vortex
        type = GameObjectType.Vortex;
        isConductive = false;
        hp = Math.round(VORTEX_CRYSTAL_HP * hpScaling);
        maxHp = hp;
        size = 60;
    } else if (randomType < 0.12) { // 7% chance for a relic
        type = GameObjectType.Relic;
        isConductive = false;
        hp = Math.round(RELIC_HP * hpScaling);
        maxHp = hp;
        size = 45;
    } else if (randomType < 0.27) { // 15% chance for an explosive barrel
        type = GameObjectType.Explosive;
        isConductive = false;
        hp = Math.round(EXPLOSIVE_BARREL_HP * hpScaling);
        maxHp = hp;
        size = 50;
    } else {
        const otherTypes = [GameObjectType.Stone, GameObjectType.Metal, GameObjectType.Crystal, GameObjectType.Stone, GameObjectType.Stone];
        type = otherTypes[Math.floor(Math.random() * otherTypes.length)];
        isConductive = type === GameObjectType.Metal || type === GameObjectType.Crystal;
        const baseHp = 100 + Math.random() * 100;
        const baseMaxHp = 200;
        hp = Math.round(baseHp * hpScaling);
        maxHp = Math.round(baseMaxHp * hpScaling);
        size = Math.random() * 30 + 40;
        if (type === GameObjectType.Stone && Math.random() < 0.4) {
            hasShield = true;
            const shieldHp = Math.round(150 * hpScaling);
            hp = shieldHp;
            maxHp = shieldHp;
        }
    }

    let x = Math.random() * (screenWidth - 100) + 50;
    let y = Math.random() * (screenHeight - 200) + 100;

    // Prevents objects from spawning in the info panel area, avoiding infinite loops on small screens.
    if (x < INFO_PANEL_WIDTH_BOUND && y < INFO_PANEL_HEIGHT_BOUND) {
        const hasSpaceRight = screenWidth > INFO_PANEL_WIDTH_BOUND + 100;
        const hasSpaceBelow = screenHeight > INFO_PANEL_HEIGHT_BOUND + 150;

        if (hasSpaceRight && (!hasSpaceBelow || Math.random() < 0.5)) {
            // Relocate to the right of the panel
            x = INFO_PANEL_WIDTH_BOUND + Math.random() * (screenWidth - INFO_PANEL_WIDTH_BOUND - 50);
        } else if (hasSpaceBelow) {
            // Relocate below the panel
            y = INFO_PANEL_HEIGHT_BOUND + Math.random() * (screenHeight - INFO_PANEL_HEIGHT_BOUND - 100);
        } else {
            // Failsafe for tiny screens: just place it somewhere out of the way.
            x = screenWidth - 60;
            y = screenHeight - 110;
        }
    }


    objects.push({
      id: crypto.randomUUID(),
      type,
      isConductive,
      x: x,
      y: y,
      width: size,
      height: size,
      hp,
      maxHp,
      rotation: type === GameObjectType.Explosive || type === GameObjectType.Relic || type === GameObjectType.Vortex ? 0 : Math.random() * 360,
      hasShield,
    });
  }
  return objects;
};

const App: React.FC = () => {
  const [objects, setObjects] = useState<GameObject[]>(() => generateRandomObjects(INITIAL_SPAWN_COUNT, 0));
  const [lightningBolts, setLightningBolts] = useState<LightningBolt[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visualExplosions, setVisualExplosions] = useState<VisualExplosion[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [hitObjectIds, setHitObjectIds] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [effects, setEffects] = useState({ shake: false, flash: false, flashColor: '', energyBarFlash: false });
  const [isSupercharged, setIsSupercharged] = useState(false);
  const [activeVortex, setActiveVortex] = useState<VortexEffect | null>(null);
  const [energy, setEnergy] = useState(BASE_MAX_ENERGY);
  const [shards, setShards] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrades>(initialUpgrades);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [spawnInterval, setSpawnInterval] = useState(SPAWN_INTERVAL);
  const [gameHistory, setGameHistory] = useState<GameEvent[]>([]);
  const [isFinalGameOver, setIsFinalGameOver] = useState(false);
  const [gameTime, setGameTime] = useState(0);


  const animationFrameId = useRef<number | null>(null);
  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const comboTimeoutRef = useRef<number | null>(null);
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const energyRef = useRef(energy);
  energyRef.current = energy;
  const lastRegenTimeRef = useRef(performance.now());
  const spawnIntervalRef = useRef(spawnInterval);
  spawnIntervalRef.current = spawnInterval;
  const gameTimeRef = useRef(gameTime);
  gameTimeRef.current = gameTime;
  
  const currentMaxEnergy = BASE_MAX_ENERGY + upgrades.maxEnergy.level * 10;
  const currentEnergyRegen = BASE_ENERGY_REGEN_PER_SECOND + upgrades.energyRegen.level * 0.5;
  const currentLightningDamage = BASE_LIGHTNING_DAMAGE + upgrades.lightningDamage.level * 5;
  const currentChainLightningRange = BASE_CHAIN_LIGHTNING_RANGE + upgrades.chainLightningRange.level * 20;
  const currentExplosionRadius = BASE_EXPLOSION_RADIUS + upgrades.explosionRadius.level * 10;

  const addGameEvent = useCallback((event: GameEvent) => {
    setGameHistory(prev => [...prev, event]);
  }, []);
  
  // Game Over condition
  useEffect(() => {
    if (objects.length >= MAX_OBJECTS_LIMIT && !isFinalGameOver) {
        setIsFinalGameOver(true);
    }
  }, [objects, isFinalGameOver]);

  // Spawner acceleration
  useEffect(() => {
    if (isFinalGameOver || isUpgradeModalOpen) return;

    const timer = setInterval(() => {
        setSpawnInterval(prev => Math.max(MIN_SPAWN_INTERVAL, prev - SPAWN_ACCELERATION_RATE));
    }, SPAWN_ACCELERATION_INTERVAL);
    
    return () => clearInterval(timer);
  }, [isFinalGameOver, isUpgradeModalOpen]);

  // Spawner loop
  useEffect(() => {
    if (isFinalGameOver || isUpgradeModalOpen) return;

    let spawnTimeoutId: number;

    const spawnLoop = () => {
        setObjects(prev => {
            if (prev.length < MAX_OBJECTS_LIMIT) {
                return [...prev, ...generateRandomObjects(1, gameTimeRef.current)];
            }
            return prev;
        });
        spawnTimeoutId = window.setTimeout(spawnLoop, spawnIntervalRef.current);
    };

    spawnTimeoutId = window.setTimeout(spawnLoop, spawnIntervalRef.current);

    return () => clearTimeout(spawnTimeoutId);
  }, [isFinalGameOver, isUpgradeModalOpen]);


  useEffect(() => {
    if (isUpgradeModalOpen || isFinalGameOver) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return; // Pause the game
    }

    const gameLoop = () => {
      // Game Time and Energy Regeneration
      const now = performance.now();
      const deltaTime = (now - lastRegenTimeRef.current) / 1000; // in seconds
      setGameTime(t => t + deltaTime);
      if (energyRef.current < currentMaxEnergy) {
        const energyToRegen = currentEnergyRegen * deltaTime;
        setEnergy(e => Math.min(currentMaxEnergy, e + energyToRegen));
      }
      lastRegenTimeRef.current = now;

      let newParticles = particles;
      // Particle physics
      if (particles.length > 0) {
        newParticles = particles
            .map(p => {
              const newLife = p.life - 0.02;
              if (newLife <= 0) return null;
              let newVy = p.vy + (p.type === 'shard' || p.type === 'ember' ? 0.1 : 0); // Gravity
              return { ...p, x: p.x + p.vx, y: p.y + newVy, vy: newVy, life: newLife };
            })
            .filter((p): p is Particle => p !== null)
      }
      
      if (activeVortex) {
          const vortexParticles: Particle[] = [];
          for (let i = 0; i < 2; i++) {
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * VORTEX_PULL_RADIUS;
              const speed = (1 - radius / VORTEX_PULL_RADIUS) * 3 + 1;
              vortexParticles.push({
                  id: crypto.randomUUID(),
                  x: activeVortex.x + Math.cos(angle) * radius,
                  y: activeVortex.y + Math.sin(angle) * radius,
                  vx: Math.sin(angle) * speed,
                  vy: -Math.cos(angle) * speed,
                  life: Math.random() * 0.5 + 0.3,
                  rotation: 0,
                  color: `rgba(167, 139, 250, ${Math.random() * 0.5 + 0.3})`,
                  size: Math.random() * 3 + 1,
                  type: 'vortex',
              });
          }
           newParticles.push(...vortexParticles);
      }

      setParticles(newParticles);
      animationFrameId.current = requestAnimationFrame(gameLoop);
    };
    
    lastRegenTimeRef.current = performance.now();
    animationFrameId.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isUpgradeModalOpen, isFinalGameOver, particles, activeVortex, currentMaxEnergy, currentEnergyRegen]);
  
  const createFloatingText = useCallback((text: string, position: Point, color: string = 'white') => {
      const newText: FloatingText = {
          id: crypto.randomUUID(),
          text,
          x: position.x,
          y: position.y,
          color,
      };
      setFloatingTexts(prev => [...prev, newText]);
      setTimeout(() => {
          setFloatingTexts(prev => prev.filter(t => t.id !== newText.id));
      }, 1500);
  }, []);

  const triggerExplosionVisual = useCallback((object: GameObject, radius: number) => {
    const newExplosion = {
        id: crypto.randomUUID(),
        x: object.x + object.width / 2,
        y: object.y + object.height / 2,
        radius: radius,
    };
    setVisualExplosions(prev => [...prev, newExplosion]);
    setTimeout(() => {
        setVisualExplosions(prev => prev.filter(e => e.id !== newExplosion.id));
    }, 400);
  }, []);

  const generateParticles = useCallback((object: GameObject, particleType: 'destruction' | 'shield_break') => {
    const newParticles: Particle[] = [];
    const center = { x: object.x + object.width / 2, y: object.y + object.height / 2 };
    
    if (particleType === 'shield_break') {
        const count = 20;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 1;
            newParticles.push({
                id: crypto.randomUUID(), x: center.x, y: center.y,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: Math.random() * 0.5 + 0.5, rotation: 0,
                color: `rgba(59, 130, 246, ${Math.random() * 0.5 + 0.5})`,
                type: 'shield',
                size: Math.random() * 4 + 2,
            });
        }
    } else if (particleType === 'destruction') {
        const count = object.type === GameObjectType.Explosive ? 60 : 30;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * (object.type === GameObjectType.Explosive ? 8 : 4) + 1;
          let config: { color: string; type: Particle['type']; size: number; };

          switch (object.type) {
            case GameObjectType.Vortex:
                config = { color: `rgb(${150 + Math.random() * 55}, ${100 + Math.random() * 50}, 255)`, type: 'vortex', size: Math.random() * 8 + 4 };
                break;
            case GameObjectType.Explosive:
                config = {
                    color: i % 2 === 0 ? `rgb(255, ${150 + Math.random() * 100}, 0)` : `rgb(100, 100, 100)`,
                    type: 'ember', size: Math.random() * 8 + 3,
                };
                break;
            case GameObjectType.Relic:
                 config = { color: `rgb(255, ${200 + Math.random() * 55}, ${50 + Math.random() * 50})`, type: 'sparkle', size: Math.random() * 10 + 5 };
                 break;
            case GameObjectType.Metal:
              config = { color: `rgb(255, ${150 + Math.random() * 100}, 0)`, type: 'ember', size: Math.random() * 5 + 3 };
              break;
            case GameObjectType.Crystal:
              config = { color: `rgb(${200 + Math.random() * 55}, ${100 + Math.random() * 50}, 255)`, type: 'sparkle', size: Math.random() * 8 + 4 };
              break;
            case GameObjectType.Stone:
            default:
              config = { color: `rgb(${100 + Math.random() * 20}, ${90 + Math.random() * 20}, ${80 + Math.random() * 20})`, type: 'shard', size: Math.random() * 8 + 4 };
              break;
          }

          newParticles.push({
            id: crypto.randomUUID(), x: center.x, y: center.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (object.type === GameObjectType.Explosive ? 4 : 1),
            life: 1, rotation: Math.random() * 360, ...config,
          });
        }
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const createBolt = useCallback((start: Point, end: Point, glowColor: string = 'rgba(139, 92, 246, 0.7)') => {
    const newBolt: LightningBolt = { id: crypto.randomUUID(), path: generateLightningPath(start, end), glowColor };
    setLightningBolts(prev => [...prev, newBolt]);
    setTimeout(() => setLightningBolts(prev => prev.filter(b => b.id !== newBolt.id)), 300);
  }, []);

  const applyDamage = useCallback((damageQueue: DamageInfo[]) => {
      if (damageQueue.length === 0) return;

      const hitIdsForThisTick = new Set(damageQueue.map(d => d.targetId));

      setObjects(currentObjects => {
          let scoreToAdd = 0;
          let shardsToAdd = 0;
          const objectsMap = new Map(currentObjects.map(o => [o.id, o]));
          const processedIds = new Set<string>();
          const internalDamageQueue = [...damageQueue];

          while (internalDamageQueue.length > 0) {
              const { targetId, damage, source, sourcePosition } = internalDamageQueue.shift()!;
              const currentTarget = objectsMap.get(targetId);

              if (!currentTarget || currentTarget.hp <= 0) continue;
              
              const targetCenter = { x: currentTarget.x + currentTarget.width/2, y: currentTarget.y + currentTarget.height/2 };
              
              if (currentTarget.hasShield) {
                  const shieldBrokenTarget = { ...currentTarget, hasShield: false };
                  objectsMap.set(targetId, shieldBrokenTarget);
                  generateParticles(currentTarget, 'shield_break');
                  createFloatingText("Blocked!", targetCenter, '#60a5fa');

                  if (source === 'lightning') {
                      continue; 
                  }
              }

              const actualDamage = Math.min(currentTarget.hp, damage);
              const damageColor = source === 'explosion' ? '#f97316' : (source === 'implosion' ? '#a78bfa' : '#facc15');
              createFloatingText(String(Math.round(actualDamage)), targetCenter, damageColor);

              const newHp = Math.max(0, currentTarget.hp - damage);
              const updatedTarget = { ...objectsMap.get(targetId)!, hp: newHp };
              objectsMap.set(targetId, updatedTarget);

              if (newHp === 0 && !processedIds.has(targetId)) {
                  processedIds.add(targetId);
                  
                  if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
                  const newCombo = comboRef.current + 1;
                  setCombo(newCombo);
                  const comboBonus = 1 + newCombo * 0.1;
                  scoreToAdd += Math.floor(updatedTarget.maxHp * comboBonus);
                  const newShards = Math.ceil(updatedTarget.maxHp / 10);
                  shardsToAdd += newShards;
                  createFloatingText(`+${newShards} 💎`, {...targetCenter, y: targetCenter.y - 20}, '#06b6d4');
                  
                  addGameEvent({ type: GameEventType.ObjectDestroyed, position: targetCenter, objectType: updatedTarget.type, timestamp: Date.now() });
                  generateParticles(updatedTarget, 'destruction');

                  if (updatedTarget.type === GameObjectType.Crystal) {
                    setEnergy(e => Math.min(currentMaxEnergy, e + CRYSTAL_ENERGY_REWARD));
                    createFloatingText(`+${CRYSTAL_ENERGY_REWARD} 에너지`, targetCenter, '#60a5fa');
                  }
                  
                  if (updatedTarget.type === GameObjectType.Relic) {
                      setIsSupercharged(true);
                      addGameEvent({ type: GameEventType.Supercharge, position: targetCenter, timestamp: Date.now() });
                  }

                  if (updatedTarget.type === GameObjectType.Vortex) {
                      const vortexCenter = { x: updatedTarget.x + updatedTarget.width / 2, y: updatedTarget.y + updatedTarget.height / 2 };
                      addGameEvent({ type: GameEventType.Vortex, position: vortexCenter, radius: VORTEX_PULL_RADIUS, timestamp: Date.now() });
                      const affectedObjectIds = new Set<string>();
                      objectsMap.forEach(obj => {
                          if (obj.hp > 0 && obj.id !== updatedTarget.id) {
                               const objCenter = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
                               const distance = Math.hypot(vortexCenter.x - objCenter.x, vortexCenter.y - objCenter.y);
                               if (distance < VORTEX_PULL_RADIUS) {
                                  affectedObjectIds.add(obj.id);
                               }
                          }
                      });
                      const vortexEffect: VortexEffect = {
                          id: crypto.randomUUID(),
                          ...vortexCenter,
                          radius: VORTEX_PULL_RADIUS,
                          affectedObjectIds,
                      };
                      setActiveVortex(vortexEffect);
                      setTimeout(() => {
                           const implosionDamageQueue: DamageInfo[] = [];
                           affectedObjectIds.forEach(id => {
                               implosionDamageQueue.push({ targetId: id, damage: VORTEX_IMPLOSION_DAMAGE, source: 'implosion', sourcePosition: vortexCenter });
                           });
                           applyDamage(implosionDamageQueue);
                           setActiveVortex(null);
                      }, VORTEX_PULL_DURATION);
                  }

                  if (updatedTarget.type === GameObjectType.Explosive) {
                      triggerExplosionVisual(updatedTarget, currentExplosionRadius);
                      const explosionCenter = { x: updatedTarget.x + updatedTarget.width / 2, y: updatedTarget.y + updatedTarget.height / 2 };
                      addGameEvent({ type: GameEventType.Explosion, position: explosionCenter, radius: currentExplosionRadius, timestamp: Date.now() });
                      
                      objectsMap.forEach(obj => {
                          if (obj.hp > 0 && obj.id !== updatedTarget.id) {
                              const objCenter = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
                              const distance = Math.hypot(explosionCenter.x - objCenter.x, explosionCenter.y - objCenter.y);
                              if (distance < currentExplosionRadius) {
                                  internalDamageQueue.push({ targetId: obj.id, damage: EXPLOSION_DAMAGE, source: 'explosion', sourcePosition: explosionCenter });
                              }
                          }
                      });
                  }
              }
          }
          if (scoreToAdd > 0) setScore(s => s + scoreToAdd);
          if (shardsToAdd > 0) setShards(s => s + shardsToAdd);

          return Array.from(objectsMap.values()).filter(o => o.hp > 0);
      });

      setHitObjectIds(prev => new Set([...prev, ...hitIdsForThisTick]));
      setTimeout(() => {
          setHitObjectIds(prev => {
              const newSet = new Set(prev);
              hitIdsForThisTick.forEach(id => newSet.delete(id));
              return newSet;
          });
      }, 200);
  }, [generateParticles, triggerExplosionVisual, createFloatingText, currentMaxEnergy, currentExplosionRadius, addGameEvent]);

  const triggerChainLightning = useCallback((startObject: GameObject, hitChain: Set<string>) => {
    if (hitChain.size >= CHAIN_LIGHTNING_MAX_JUMPS) return;
    
    let closestTarget: GameObject | null = null;
    let minDistance = currentChainLightningRange;
    const startPoint = { x: startObject.x + startObject.width / 2, y: startObject.y + startObject.height / 2 };

    objectsRef.current.forEach(target => {
      if (target.id !== startObject.id && !hitChain.has(target.id) && target.isConductive && target.hp > 0) {
        const targetPoint = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
        const distance = Math.hypot(startPoint.x - targetPoint.x, startPoint.y - targetPoint.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestTarget = target;
        }
      }
    });

    if (closestTarget) {
      hitChain.add(closestTarget.id);
      const targetPoint = { x: closestTarget.x + closestTarget.width / 2, y: closestTarget.y + closestTarget.height / 2 };
      const glowColor = closestTarget.type === GameObjectType.Crystal ? 'rgba(233, 30, 99, 0.7)' : 'rgba(139, 92, 246, 0.7)';
      createBolt(startPoint, targetPoint, glowColor);
      applyDamage([{ targetId: closestTarget.id, damage: currentLightningDamage, source: 'lightning', sourcePosition: startPoint }]);
      setTimeout(() => triggerChainLightning(closestTarget!, hitChain), 50);
    }
  }, [createBolt, applyDamage, currentChainLightningRange, currentLightningDamage]);

  const handleScreenClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeVortex || isUpgradeModalOpen || isFinalGameOver) return;

    if (energy < LIGHTNING_STRIKE_COST) {
        setEffects(prev => ({ ...prev, energyBarFlash: true }));
        setTimeout(() => setEffects(prev => ({ ...prev, energyBarFlash: false })), 300);
        return;
    }
    setEnergy(e => e - LIGHTNING_STRIKE_COST);

    const clickPoint = { x: e.clientX, y: e.clientY };
    
    const useSupercharge = isSupercharged;
    if (useSupercharge) setIsSupercharged(false);

    addGameEvent({ type: GameEventType.LightningStrike, position: clickPoint, isSupercharged: useSupercharge, timestamp: Date.now() });
    
    const damage = useSupercharge ? currentLightningDamage * SUPERCHARGE_DAMAGE_MULTIPLIER : currentLightningDamage;
    const aoeRadius = useSupercharge ? LIGHTNING_AOE_RADIUS * SUPERCHARGE_AOE_MULTIPLIER : LIGHTNING_AOE_RADIUS;
    const boltColor = useSupercharge ? 'rgba(250, 204, 21, 0.9)' : 'rgba(139, 92, 246, 0.7)';
    const flashColor = useSupercharge ? 'bg-yellow-300/80' : 'bg-white/80';
    
    setEffects({ shake: true, flash: true, flashColor, energyBarFlash: false });
    setTimeout(() => setEffects({ shake: false, flash: false, flashColor: '', energyBarFlash: false }), 200);

    createBolt({ x: e.clientX, y: 0 }, clickPoint, boltColor);

    let initialTarget: GameObject | null = null;
    let minDistance = Infinity;
    const damageQueue: DamageInfo[] = [];

    objects.forEach(obj => {
      if (obj.hp > 0) {
        const objCenter = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
        const distance = Math.hypot(clickPoint.x - objCenter.x, clickPoint.y - objCenter.y);
        
        if (distance < obj.width / 2 + aoeRadius) {
            damageQueue.push({targetId: obj.id, damage: damage, source: 'lightning', sourcePosition: clickPoint});
          if (distance < minDistance) {
            minDistance = distance;
            initialTarget = obj;
          }
        }
      }
    });
    
    if(damageQueue.length > 0) applyDamage(damageQueue);

    if (initialTarget) {
        const struckObjectStillExists = objects.find(o => o.id === initialTarget!.id);
        if (struckObjectStillExists && struckObjectStillExists.isConductive) {
           setTimeout(() => {
            const freshStruckObject = objectsRef.current.find(o => o.id === initialTarget!.id);
            if (freshStruckObject) {
                 triggerChainLightning(freshStruckObject, new Set([initialTarget!.id]));
            }
           }, 50);
        }
    }
  }, [objects, createBolt, applyDamage, triggerChainLightning, isSupercharged, activeVortex, energy, currentLightningDamage, isUpgradeModalOpen, isFinalGameOver, addGameEvent]);

  const handleReset = () => {
    setScore(0);
    setShards(0);
    setUpgrades(initialUpgrades);
    setEnergy(BASE_MAX_ENERGY);
    setIsSupercharged(false);
    setCombo(0);
    if(comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    setActiveVortex(null);
    setObjects(generateRandomObjects(INITIAL_SPAWN_COUNT, 0));
    setLightningBolts([]);
    setParticles([]);
    setVisualExplosions([]);
    setIsUpgradeModalOpen(false);
    setSpawnInterval(SPAWN_INTERVAL);
    setGameHistory([]);
    setIsFinalGameOver(false);
    setGameTime(0);
  };

  const handleUpgrade = useCallback((upgradeType: UpgradeType) => {
      const upgrade = upgrades[upgradeType];
      if (shards < upgrade.cost) return;

      setShards(s => s - upgrade.cost);
      const newLevel = upgrades[upgradeType].level + 1;
      addGameEvent({ type: GameEventType.Upgrade, upgradeType: upgradeType, level: newLevel, timestamp: Date.now() });
      setUpgrades(prev => {
          const newCost = Math.floor(prev[upgradeType].cost * 1.6);
          return {
              ...prev,
              [upgradeType]: { ...prev[upgradeType], level: newLevel, cost: newCost }
          };
      });
  }, [shards, upgrades, addGameEvent]);

  const mainContainerClasses = `relative w-screen h-screen overflow-hidden bg-slate-900 ${isSupercharged ? 'cursor-cell' : 'cursor-crosshair'} ${effects.shake ? 'shake' : ''} ${(activeVortex || energy < LIGHTNING_STRIKE_COST || isUpgradeModalOpen) ? 'cursor-not-allowed' : ''}`;
  const objectCountColor = objects.length > 45 ? 'text-red-400 font-bold animate-pulse' : objects.length > 35 ? 'text-yellow-400' : 'text-slate-300';
  
  return (
    <div className={mainContainerClasses} onClick={handleScreenClick}>
      {effects.flash && <div className={`absolute inset-0 ${effects.flashColor} pointer-events-none z-50`} style={{ animation: 'screen-flash 0.3s ease-out forwards' }}></div>}

      <div className="absolute top-4 left-4 z-30 flex flex-col space-y-4 max-w-md">
        <div className="p-4 bg-black/30 rounded-lg backdrop-blur-sm text-white font-bold">
            <h1 className="text-3xl text-purple-300">라이트닝 스트라이크</h1>
            <p className="text-xl">점수: <span className="text-yellow-300">{score}</span></p>
            <p className="text-lg mt-1">오브젝트: <span className={objectCountColor}>{objects.length} / {MAX_OBJECTS_LIMIT}</span></p>
            <p className="text-xl mt-2">재료: <span className="text-cyan-300">{shards} 💎</span></p>
            
            <div className="mt-3">
              <p className="text-lg">에너지: <span className="font-semibold text-blue-300">{Math.floor(energy)} / {currentMaxEnergy}</span></p>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                  <div 
                      className={`h-2.5 rounded-full transition-all duration-200 ${effects.energyBarFlash ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}
                      style={{ width: `${(Math.floor(energy) / currentMaxEnergy) * 100}%` }}
                  ></div>
              </div>
            </div>

            {isSupercharged && (
                <p className="text-xl font-bold text-yellow-300 animate-pulse mt-2">
                    ⚡ 슈퍼차지! ⚡
                </p>
            )}
            <div className="mt-4 space-y-1 text-sm">
                <p className="text-slate-400">번개를 시전하려면 에너지가 필요합니다.</p>
                <p className="text-slate-400">금속(⚙️)은 전도체입니다.</p>
                <p className="text-purple-300">수정(💎)은 전도체이며 파괴 시 에너지를 방출합니다.</p>
                <p className="text-slate-400">폭탄(💣)은 광역 피해를 입힙니다.</p>
                <p className="text-blue-300">보호막은 번개를 흡수하지만 폭발에는 취약합니다.</p>
                <p className="text-yellow-300">별(⭐)을 파괴하여 다음 공격을 강화하세요.</p>
                <p className="text-violet-300">소용돌이(🌀)를 파괴하여 주변 물체들을 끌어당기세요.</p>
            </div>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 z-30 flex space-x-2">
        <button onClick={(e) => { e.stopPropagation(); setIsUpgradeModalOpen(true); }} disabled={isFinalGameOver} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500">
            업그레이드
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleReset(); }} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            초기화
        </button>
      </div>


      {objects.map(obj => <GameObjectComponent key={obj.id} object={obj} isHit={hitObjectIds.has(obj.id)} activeVortex={activeVortex} />)}
      {particles.map(p => <ParticleComponent key={p.id} particle={p} />)}
      {visualExplosions.map(exp => <ExplosionVisualComponent key={exp.id} explosion={exp} />)}
      {lightningBolts.map(bolt => <LightningBoltComponent key={bolt.id} path={bolt.path} glowColor={bolt.glowColor} />)}
      {floatingTexts.map(ft => <FloatingTextComponent key={ft.id} text={ft} />)}

      {combo > 1 && (
        <div key={combo} className="absolute bottom-10 left-1/2 -translate-x-1/2 text-5xl font-extrabold text-white pointer-events-none z-30" style={{ textShadow: '2px 2px 8px #8b5cf6', animation: 'combo-pop 0.3s ease-out' }}>
          x{combo} COMBO!
        </div>
      )}

      {isUpgradeModalOpen && (
        <div 
          className="absolute inset-0 bg-black/70 flex items-center justify-center z-40"
          onClick={() => setIsUpgradeModalOpen(false)}
        >
            <div 
              className="p-6 bg-slate-800/95 rounded-lg backdrop-blur-sm text-white w-full max-w-lg shadow-2xl border border-purple-500/50"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl text-purple-300 font-bold">업그레이드</h2>
                    <button onClick={() => setIsUpgradeModalOpen(false)} className="text-gray-400 hover:text-white transition-colors text-2xl font-bold">&times;</button>
                </div>
                <UpgradePanel upgrades={upgrades} shards={shards} onUpgrade={handleUpgrade} />
            </div>
        </div>
      )}

      {isFinalGameOver && (
          <GameOverModal score={score} history={gameHistory} onReset={handleReset} />
      )}
    </div>
  );
};

export default App;
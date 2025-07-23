export interface Point {
  x: number;
  y: number;
}

export enum GameObjectType {
  Stone,
  Metal,
  Crystal,
  Explosive,
  Relic,
  Vortex,
}

export interface GameObject {
  id: string;
  type: GameObjectType;
  isConductive: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  rotation: number;
  hasShield?: boolean;
}

export interface LightningBolt {
  id: string;
  path: Point[];
  glowColor: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
  rotation: number;
  type: 'shard' | 'ember' | 'sparkle' | 'shield' | 'vortex';
}

export interface VisualExplosion {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface DamageInfo {
    targetId: string;
    damage: number;
    source: 'lightning' | 'explosion' | 'implosion';
    sourcePosition: Point;
}

export interface FloatingText {
    id:string;
    text: string;
    x: number;
    y: number;
    color: string;
}

export interface VortexEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  affectedObjectIds: Set<string>;
}

export enum UpgradeType {
    LightningDamage = 'lightningDamage',
    MaxEnergy = 'maxEnergy',
    EnergyRegen = 'energyRegen',
    ChainLightningRange = 'chainLightningRange',
    ExplosionRadius = 'explosionRadius',
}

export interface Upgrade {
    level: number;
    cost: number;
    name: string;
    description: string;
}

export type Upgrades = Record<UpgradeType, Upgrade>;

export enum GameEventType {
    LightningStrike = 'lightningStrike',
    ObjectDestroyed = 'objectDestroyed',
    Explosion = 'explosion',
    Vortex = 'vortex',
    Supercharge = 'supercharge',
    Upgrade = 'upgrade',
}

export interface GameEventBase {
    type: GameEventType;
    timestamp: number;
    position: Point;
}

export interface GameEventLightningStrike extends GameEventBase {
    type: GameEventType.LightningStrike;
    isSupercharged: boolean;
}

export interface GameEventObjectDestroyed extends GameEventBase {
    type: GameEventType.ObjectDestroyed;
    objectType: GameObjectType;
}

export interface GameEventExplosion extends GameEventBase {
    type: GameEventType.Explosion;
    radius: number;
}

export interface GameEventVortex extends GameEventBase {
    type: GameEventType.Vortex;
    radius: number;
}

export interface GameEventSupercharge extends GameEventBase {
    type: GameEventType.Supercharge;
}

export interface GameEventUpgrade { // No position
    type: GameEventType.Upgrade;
    timestamp: number;
    upgradeType: UpgradeType;
    level: number;
}

export type GameEvent = GameEventLightningStrike | GameEventObjectDestroyed | GameEventExplosion | GameEventVortex | GameEventSupercharge | GameEventUpgrade;

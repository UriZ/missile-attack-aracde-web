/**
 * upgrade-config.js — Pure data definitions for all weapon upgrade trees.
 *
 * Schema per upgrade:
 *   id:          string   — unique identifier e.g. 'sam_speed_1'
 *   name:        string   — display name e.g. 'Fast Propellant'
 *   description: string   — tooltip text
 *   cost:        number   — cash cost
 *   tier:        number   — 1, 2, or 3
 *   requires:    string|null — prerequisite upgrade id, or null for tier-1 upgrades
 *   effects:     Array<{ stat: string, op: 'add'|'multiply'|'set', value: number|boolean }>
 *   icon:        string   — icon hint for UI renderer: 'speed', 'damage', 'split', etc.
 */

export const UPGRADE_CONFIG = {

  // ─── SAM Launcher ────────────────────────────────────────────────────────────
  sam: {
    id: 'sam',
    label: 'SAM Launcher',
    upgrades: [
      {
        id: 'sam_fast_propellant',
        name: 'Fast Propellant',
        description: 'Missiles travel 20% faster',
        cost: 40,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'missileSpeed', op: 'multiply', value: 1.2 },
        ],
        icon: 'speed',
      },
      {
        id: 'sam_expanded_warhead',
        name: 'Expanded Warhead',
        description: 'Explosion radius increased by 30%',
        cost: 60,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'explosionRadius', op: 'multiply', value: 1.3 },
        ],
        icon: 'damage',
      },
      {
        id: 'sam_cluster_warhead',
        name: 'Cluster Warhead',
        description: 'Missiles split into 3 submunitions on detonation',
        cost: 200,
        tier: 2,
        requires: 'sam_expanded_warhead',
        effects: [
          { stat: 'splitEnabled', op: 'set', value: true },
          { stat: 'splitCount',   op: 'set', value: 3 },
        ],
        icon: 'split',
      },
    ],
  },

  // ─── Heat-Seeker ─────────────────────────────────────────────────────────────
  heatseeker: {
    id: 'heatseeker',
    label: 'Heat-Seeker',
    upgrades: [
      {
        id: 'heatseeker_enhanced_seeker',
        name: 'Enhanced Seeker',
        description: 'Tracking speed increased by 30%',
        cost: 60,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'trackingSpeed', op: 'multiply', value: 1.3 },
        ],
        icon: 'speed',
      },
      {
        id: 'heatseeker_wide_aperture',
        name: 'Wide Aperture',
        description: 'Lock-on radius increased by 50%',
        cost: 50,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'lockRadius', op: 'multiply', value: 1.5 },
        ],
        icon: 'range',
      },
      {
        id: 'heatseeker_mirv_warhead',
        name: 'MIRV Warhead',
        description: 'Missiles split into 3 independently-guided submunitions',
        cost: 250,
        tier: 2,
        requires: 'heatseeker_enhanced_seeker',
        effects: [
          { stat: 'splitEnabled', op: 'set', value: true },
          { stat: 'splitCount',   op: 'set', value: 3 },
        ],
        icon: 'split',
      },
    ],
  },

  // ─── Truck Launcher ──────────────────────────────────────────────────────────
  truck: {
    id: 'truck',
    label: 'Truck Launcher',
    upgrades: [
      {
        id: 'truck_turbo_engine',
        name: 'Turbo Engine',
        description: 'Truck moves 40% faster',
        cost: 40,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'moveSpeed', op: 'multiply', value: 1.4 },
        ],
        icon: 'speed',
      },
      {
        id: 'truck_heavy_payload',
        name: 'Heavy Payload',
        description: 'Explosion radius increased by 25%',
        cost: 60,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'explosionRadius', op: 'multiply', value: 1.25 },
        ],
        icon: 'damage',
      },
      {
        id: 'truck_scatter_rockets',
        name: 'Scatter Rockets',
        description: 'Rockets split into 3 submunitions on detonation',
        cost: 200,
        tier: 2,
        requires: 'truck_heavy_payload',
        effects: [
          { stat: 'splitEnabled', op: 'set', value: true },
          { stat: 'splitCount',   op: 'set', value: 3 },
        ],
        icon: 'split',
      },
    ],
  },

  // ─── Vulkan Cannon ───────────────────────────────────────────────────────────
  vulkan: {
    id: 'vulkan',
    label: 'Vulkan Cannon',
    upgrades: [
      {
        id: 'vulkan_cooling_system',
        name: 'Cooling System I',
        description: 'Barrel cools down 40% faster',
        cost: 50,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'coolRate', op: 'multiply', value: 1.4 },
        ],
        icon: 'cooldown',
      },
      {
        id: 'vulkan_rapid_cycler',
        name: 'Rapid Cycler',
        description: 'Fire rate increased (25% shorter delay between shots)',
        cost: 75,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'fireRate', op: 'multiply', value: 0.75 },
        ],
        icon: 'speed',
      },
      {
        id: 'vulkan_twin_barrels',
        name: 'Twin Barrels',
        description: 'Fires 2 bullets per shot',
        cost: 250,
        tier: 2,
        requires: 'vulkan_rapid_cycler',
        effects: [
          { stat: 'bulletsPerShot', op: 'set', value: 2 },
        ],
        icon: 'split',
      },
      {
        id: 'vulkan_quad_cannons',
        name: 'Quad Cannons',
        description: 'Fires 4 bullets per shot',
        cost: 500,
        tier: 3,
        requires: 'vulkan_twin_barrels',
        effects: [
          { stat: 'bulletsPerShot', op: 'set', value: 4 },
        ],
        icon: 'split',
      },
      {
        id: 'vulkan_auto_tracking',
        name: 'Auto-Tracking',
        description: 'Cannon automatically aims at the nearest enemy',
        cost: 300,
        tier: 2,
        requires: 'vulkan_cooling_system',
        effects: [
          { stat: 'autoAim', op: 'set', value: true },
        ],
        icon: 'targeting',
      },
    ],
  },

  // ─── Drone Pad ───────────────────────────────────────────────────────────────
  drone_pad: {
    id: 'drone_pad',
    label: 'Drone Pad',
    upgrades: [
      {
        id: 'drone_pad_extra_drones',
        name: 'Extra Drones',
        description: 'Drone stock capacity increased by 3',
        cost: 60,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'maxStock', op: 'add', value: 3 },
        ],
        icon: 'ammo',
      },
      {
        id: 'drone_pad_faster_deploy',
        name: 'Faster Deploy',
        description: 'Deploy cooldown reduced by 40%',
        cost: 50,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'deployCooldown', op: 'multiply', value: 0.6 },
        ],
        icon: 'speed',
      },
      {
        id: 'drone_pad_armed_drone',
        name: 'Armed Drone',
        description: 'Drones carry a warhead and explode on impact',
        cost: 200,
        tier: 2,
        requires: 'drone_pad_extra_drones',
        effects: [
          { stat: 'armedDrone', op: 'set', value: true },
        ],
        icon: 'damage',
      },
    ],
  },

  // ─── Laser ───────────────────────────────────────────────────────────────────
  laser: {
    id: 'laser',
    label: 'Laser',
    upgrades: [
      {
        id: 'laser_power_cell',
        name: 'Power Cell I',
        description: 'Max energy increased by 25% and recharge rate increased by 20%',
        cost: 80,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'maxEnergy',    op: 'multiply', value: 1.25 },
          { stat: 'rechargeRate', op: 'multiply', value: 1.2 },
        ],
        icon: 'energy',
      },
      {
        id: 'laser_quick_ignition',
        name: 'Quick Ignition',
        description: 'Warm-up time reduced by 40%',
        cost: 70,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'warmUpTime', op: 'multiply', value: 0.6 },
        ],
        icon: 'speed',
      },
      {
        id: 'laser_chain_lightning',
        name: 'Chain Lightning',
        description: 'Laser chains to 2 additional nearby enemies',
        cost: 400,
        tier: 2,
        requires: 'laser_power_cell',
        effects: [
          { stat: 'chainEnabled', op: 'set', value: true },
          { stat: 'chainCount',   op: 'set', value: 2 },
        ],
        icon: 'split',
      },
    ],
  },

  // ─── Shield ──────────────────────────────────────────────────────────────────
  shield: {
    id: 'shield',
    label: 'Shield',
    upgrades: [
      {
        id: 'shield_extra_charges',
        name: 'Extra Charges',
        description: 'Shield gains 2 bonus charges',
        cost: 100,
        tier: 1,
        requires: null,
        effects: [
          { stat: 'bonusCharges', op: 'add', value: 2 },
        ],
        icon: 'ammo',
      },
      {
        id: 'shield_extended_field',
        name: 'Extended Field',
        description: 'Shield duration increased by 50%',
        cost: 150,
        tier: 2,
        requires: 'shield_extra_charges',
        effects: [
          { stat: 'shieldDuration', op: 'multiply', value: 1.5 },
        ],
        icon: 'duration',
      },
    ],
  },

};

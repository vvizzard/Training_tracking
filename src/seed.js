import { DEFAULT_ZONE, newId, RM_SCHEME, todayISO } from './utils.js'

// Données de départ, issues des programmes HWPO Bodybuilding
// (bloc 6 semaine 3/4 — 3 au 9 août, et bloc 7 semaine 1/4 — 17 au 23 août)
// complétées par les charges relevées en séance.
//
// Chaque variante proposée par les documents (« Pendulum, Belt, or Back Squat »,
// « Landmine or T-Bar Row »…) est un exercice à part entière, et les supersets
// sont éclatés en un exercice par mouvement.
//
// { name, zone, rm, note, sets: [[schéma de reps, charge de départ | null], ...] }
// Le RM devient le format principal de l'exercice, chaque schéma une déclinaison.
const SEED = [
  // ---------- Pectoraux ----------
  { name: 'Bench Press', zone: 'Pectoraux', rm: 95, note: 'barre', sets: [['4x8-10', 45]] },
  {
    name: 'DB Bench Press',
    zone: 'Pectoraux',
    note: 'par haltère',
    sets: [['5x8-10', 17.5], ['4x10', null]],
  },
  {
    name: 'Incline DB Bench Press',
    zone: 'Pectoraux',
    note: 'par haltère',
    sets: [['3x10-12', null], ['1x5', null], ['4x6-8', null]],
  },
  {
    name: 'Incline Bench Press (barre)',
    zone: 'Pectoraux',
    note: 'ou banc plat surélevé sur plateaux',
    sets: [['1x5', null], ['4x6-8', null], ['3x10-12', null]],
  },
  { name: 'Decline Bench Press', zone: 'Pectoraux', note: 'barre, léger déclin', sets: [['3x12', null]] },
  { name: 'Decline DB Bench Press', zone: 'Pectoraux', note: 'par haltère', sets: [['3x12', null]] },
  { name: 'Machine Decline Press', zone: 'Pectoraux', note: 'machine', sets: [['3x12', null]] },
  { name: 'Chest Fly', zone: 'Pectoraux', note: 'haltères', sets: [['4x15-20', 30], ['3x12-15', null]] },
  { name: 'Cable Chest Fly', zone: 'Pectoraux', note: 'poulie', sets: [['4x15-20', null], ['3x12-15', null]] },
  { name: 'Machine Chest Fly', zone: 'Pectoraux', note: 'machine', sets: [['4x15-20', null], ['3x12-15', null]] },
  { name: 'Parallel Bar Dips', zone: 'Pectoraux', note: 'lestés si possible', sets: [['4x6-8', null]] },
  { name: 'Push-Up', zone: 'Pectoraux', note: 'finisher, tempo 2-2', sets: [['8-10-12-10-8', null]] },

  // ---------- Épaules ----------
  { name: 'Upright Row (barre)', zone: 'Épaules', note: 'barre vide', sets: [['5x10', 0]] },
  { name: 'Arnold Press', zone: 'Épaules', note: 'assis ou debout', sets: [['3x12', 7.5], ['4x8-12', null]] },
  { name: 'Seated DB Strict Press', zone: 'Épaules', note: 'assis, dos calé', sets: [['4x8-10', null]] },
  {
    name: 'Lateral Raise',
    zone: 'Épaules',
    note: 'DB, skc',
    sets: [['3x10-12', 2.5], ['4x15', null], ['3x15', null]],
  },
  {
    name: 'Rear Delt Fly',
    zone: 'Épaules',
    note: 'haltères ou machine',
    sets: [['4 x max', 7.5], ['3x10-12', null], ['3x15', null]],
  },

  // ---------- Bras ----------
  {
    name: 'BN DB Triceps Ext',
    zone: 'Bras',
    note: 'behind-the-neck, haltère ou poulie',
    sets: [['5x10', 12.5], ['3x12-15', null]],
  },
  { name: 'DB Skull Crusher', zone: 'Bras', note: 'haltères', sets: [['3x10-15', null], ['3x15', null]] },
  { name: 'Rolling DB Triceps Ext', zone: 'Bras', note: 'finisher tabata', sets: [['Tabata 8x20s', null]] },
  { name: 'Banded Triceps Push Down', zone: 'Bras', note: 'élastique', sets: [['100 reps', null]] },
  {
    name: 'BB Curl',
    zone: 'Bras',
    note: 'barre + 4/4',
    sets: [['5x6', null], ['4x10', null], ['4x10-12', null], ['8-10-12-10-8', null]],
  },
  { name: 'EZ Bar Curl', zone: 'Bras', note: 'barre EZ', sets: [['4x10', null]] },
  { name: 'Empty Bar Curl', zone: 'Bras', note: 'finisher, barre vide', sets: [['4 x 30s', null]] },
  {
    name: 'Hammer Curl',
    zone: 'Bras',
    sets: [['4x12', 7.5], ['4x8', 7.5], ['3x8-12', null], ['3x12-15', null]],
  },
  { name: 'Cross Body Hammer Curl', zone: 'Bras', sets: [['4x12/12', 7.5]] },
  { name: 'Banded Hammer Curl', zone: 'Bras', note: 'élastique, à l’échec', sets: [['4 x max', null]] },
  { name: 'DB Curl', zone: 'Bras', note: 'léger', sets: [['4x10-12', 5]] },
  { name: 'Incline DB Curl', zone: 'Bras', note: 'banc incliné', sets: [['3x12-15', null]] },
  { name: 'Poliquin Curl', zone: 'Bras', note: 'peu de charge, squeeze', sets: [['3x10/10', null]] },

  // ---------- Dos ----------
  {
    name: 'Pull-Ups',
    zone: 'Dos',
    note: 'PU : 36',
    sets: [['4 x max', 36], ['4 x max prise large', null]],
  },
  { name: 'Lat Pull Down', zone: 'Dos', note: 'poulie haute', sets: [['4 x max', null]] },
  { name: 'Bent Over Row', zone: 'Dos', note: 'barre 50', sets: [['5x6', 50], ['4x8-10', null]] },
  { name: 'Seal Row', zone: 'Dos', note: 'buste soutenu', sets: [['5x6', null], ['4x8-10', null]] },
  { name: 'Pendlay Row', zone: 'Dos', note: 'départ au sol', sets: [['5x6', null], ['4x8-10', null]] },
  { name: 'DB Bent Over Row', zone: 'Dos', note: 'par haltère', sets: [['3x8-12', 22.5]] },
  { name: 'Landmine Row', zone: 'Dos', note: 'barre en landmine', sets: [['4x12/12', null]] },
  { name: 'T-Bar Row', zone: 'Dos', note: 'poignée ou sangles', sets: [['4x12/12', null]] },
  { name: 'Seated Cable Row', zone: 'Dos', note: 'poulie basse', sets: [['3x20-30', null]] },
  { name: 'Banded Row', zone: 'Dos', note: 'élastique', sets: [['3x20-30', null]] },
  { name: 'Ring Row', zone: 'Dos', note: 'finisher, anneaux', sets: [['4 x 30s', null]] },
  { name: 'Flexion Row', zone: 'Dos', note: 'barre 30', sets: [['4x10-12', 30]] },
  {
    name: 'Straight Arm Lat Pull Down',
    zone: 'Dos',
    note: 'élastique, serratus',
    sets: [['4x15-20', null]],
  },

  // ---------- Jambes ----------
  {
    name: 'Squat',
    zone: 'Jambes',
    rm: 210,
    note: 'barre, 190-210',
    sets: [['6x4', 190], ['4x8', null], ['4x12', null]],
  },
  {
    name: 'Pendulum Squat',
    zone: 'Jambes',
    note: 'machine',
    sets: [['6x4', null], ['4x8', null], ['4x12', null], ['3x10', null]],
  },
  {
    name: 'Belt Squat',
    zone: 'Jambes',
    note: 'machine',
    sets: [['6x4', null], ['4x8', null], ['4x12', null], ['3x10', null]],
  },
  {
    name: 'Leg Press',
    zone: 'Jambes',
    note: 'machine',
    sets: [['6x4', null], ['4x8', null], ['4x12', null]],
  },
  {
    name: 'Hack Squat',
    zone: 'Jambes',
    note: 'machine',
    sets: [['6x4', null], ['4x8', null], ['4x12', null]],
  },
  { name: 'Front Squat', zone: 'Jambes', note: 'barre devant', sets: [['3x10', null]] },
  { name: 'Safety Squat Bar Squat', zone: 'Jambes', note: 'barre SSB', sets: [['3x10', null]] },
  { name: 'Goblet Squat', zone: 'Jambes', note: '20 modéré / 10 lourd / 20 modéré', sets: [['20-10-20', null]] },
  { name: 'RDL', zone: 'Jambes', note: 'barre', sets: [['5x5', 100]] },
  { name: 'DB RDL', zone: 'Jambes', note: 'par haltère', sets: [['3x12', null]] },
  { name: 'Split Stance DB RDL', zone: 'Jambes', note: 'par haltère', sets: [['4x8-10', null]] },
  { name: 'Sumo DB Deadlift', zone: 'Jambes', note: 'haltère', sets: [['3x6-8', null]] },
  { name: 'Sumo KB Deadlift', zone: 'Jambes', note: 'kettlebell', sets: [['3x6-8', null]] },
  { name: 'Seated Hamstring Curl', zone: 'Jambes', note: 'machine', sets: [['4x8-12', null], ['3x12-15', null]] },
  { name: 'Prone Hamstring Curl', zone: 'Jambes', note: 'machine, allongé', sets: [['4x8-12', null], ['3x12-15', null]] },
  { name: 'Medball Hamstring Curl', zone: 'Jambes', note: 'medecine ball', sets: [['4x8-12', null], ['3x12-15', null]] },
  { name: 'Slider Hamstring Curl', zone: 'Jambes', note: 'sliders', sets: [['4x8-12', null], ['3x12-15', null]] },
  { name: 'Banded Hamstring Curl', zone: 'Jambes', note: 'élastique', sets: [['4x8-12', null], ['3x12-15', null]] },
  { name: 'DB Walking Lunge', zone: 'Jambes', note: 'par haltère', sets: [['3x20', 22.5]] },
  { name: 'Jumping Lunge', zone: 'Jambes', note: 'poids de corps', sets: [['3x20', null]] },
  { name: 'Bulgarian Split Squat', zone: 'Jambes', note: 'drop set, 2 haltères', sets: [['3x8-12', null]] },
  { name: 'Deficit Curtsy Lunge', zone: 'Jambes', note: 'goblet, sur déficit', sets: [['4x6-8/6-8', null]] },
  { name: 'Barbell Box Step Up', zone: 'Jambes', note: 'box 50 cm max', sets: [['3x8/8', null]] },
]

// Au premier lancement : le RM devient le format principal de l'exercice, chaque
// schéma de reps une déclinaison. Les charges connues sont datées du jour.
export function buildSeed() {
  const date = todayISO()
  const point = (load) => (load === null || load === undefined ? [] : [{ date, load }])

  return SEED.map(({ name, zone = DEFAULT_ZONE, rm = null, note = '', sets }) => ({
    id: newId(),
    name,
    zone,
    note,
    variants: [
      { id: newId('v'), scheme: RM_SCHEME, history: point(rm) },
      ...sets.map(([scheme, load]) => ({
        id: newId('v'),
        scheme,
        history: point(load),
      })),
    ],
  }))
}

// Zone d'origine de chaque exercice du jeu de départ, utilisée pour reclasser
// automatiquement des données enregistrées avant l'ajout des zones.
export const ZONE_BY_NAME = Object.fromEntries([
  ...SEED.map(({ name, zone }) => [name, zone]),
  // Noms utilisés par des jeux de départ antérieurs, renommés ou éclatés depuis.
  ['Skull Crusher', 'Bras'],
  ['DB Hammer Curl + Curl', 'Bras'],
  ['Slight Decline Bench', 'Pectoraux'],
  ['Hamstring Curl', 'Jambes'],
])

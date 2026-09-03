import { DEFAULT_ZONE, newId, RM_SCHEME, todayISO } from './utils.js'

// Données de départ, issues des programmes HWPO Bodybuilding
// (bloc 6 semaine 3/4 — 3 au 9 août, et bloc 7 semaine 1/4 — 17 au 23 août)
// complétées par les charges relevées en séance.
//
// Chaque variante proposée par les documents (« Pendulum, Belt, or Back Squat »,
// « Landmine or T-Bar Row »…) est un exercice à part entière, et les supersets
// sont éclatés en un exercice par mouvement.
//
// { name, zone, rm, note, sets: [[schéma de reps, charge | null, RPE], ...] }
// Le RPE reprend celui du programme : « 8 », « 9-10 », ou « Échec » / « Dur »
// pour les séries notées Failure, Tough ou HARD. Vide quand le programme n'en
// donne pas.
const SEED = [
  // ---------- Pectoraux ----------
  { name: 'Bench Press', zone: 'Pectoraux', rm: 95, note: 'barre', sets: [['4x8-10', 45, '8']] },
  {
    name: 'DB Bench Press',
    zone: 'Pectoraux',
    note: 'par haltère',
    sets: [['5x8-10', 17.5, '9'], ['4x10', null, '8']],
  },
  {
    name: 'Incline DB Bench Press',
    zone: 'Pectoraux',
    note: 'par haltère',
    sets: [['3x10-12', null, '9'], ['1x5', null, '8'], ['4x6-8', null, '8']],
  },
  {
    name: 'Incline Bench Press (barre)',
    zone: 'Pectoraux',
    note: 'ou banc plat surélevé sur plateaux',
    sets: [['1x5', null, '8'], ['4x6-8', null, '8'], ['3x10-12', null, '9']],
  },
  { name: 'Decline Bench Press', zone: 'Pectoraux', note: 'barre, léger déclin', sets: [['3x12', null, '7']] },
  { name: 'Decline DB Bench Press', zone: 'Pectoraux', note: 'par haltère', sets: [['3x12', null, '7']] },
  { name: 'Machine Decline Press', zone: 'Pectoraux', note: 'machine', sets: [['3x12', null, '7']] },
  { name: 'Chest Fly', zone: 'Pectoraux', note: 'haltères', sets: [['4x15-20', 30, '8'], ['3x12-15', null, 'Dur']] },
  { name: 'Cable Chest Fly', zone: 'Pectoraux', note: 'poulie', sets: [['4x15-20', null, '8'], ['3x12-15', null, 'Dur']] },
  { name: 'Machine Chest Fly', zone: 'Pectoraux', note: 'machine', sets: [['4x15-20', null, '8'], ['3x12-15', null, 'Dur']] },
  { name: 'Parallel Bar Dips', zone: 'Pectoraux', note: 'lestés si possible', sets: [['4x6-8', null, '8']] },
  { name: 'Push-Up', zone: 'Pectoraux', note: 'finisher, tempo 2-2', sets: [['8-10-12-10-8', null, '']] },

  // ---------- Épaules ----------
  { name: 'Upright Row (barre)', zone: 'Épaules', note: 'barre vide', sets: [['5x10', 0, '8']] },
  { name: 'Arnold Press', zone: 'Épaules', note: 'assis ou debout', sets: [['3x12', 7.5, '9'], ['4x8-12', null, '9']] },
  { name: 'Seated DB Strict Press', zone: 'Épaules', note: 'assis, dos calé', sets: [['4x8-10', null, '9']] },
  {
    name: 'Lateral Raise',
    zone: 'Épaules',
    note: 'DB, skc',
    sets: [['3x10-12', 2.5, 'Échec'], ['4x15', null, 'Échec'], ['3x15', null, 'Échec']],
  },
  {
    name: 'Rear Delt Fly',
    zone: 'Épaules',
    note: 'haltères ou machine',
    sets: [['4 x max', 7.5, ''], ['3x10-12', null, 'Échec'], ['3x15', null, 'Échec']],
  },

  // ---------- Bras ----------
  {
    name: 'BN DB Triceps Ext',
    zone: 'Bras',
    note: 'behind-the-neck, haltère ou poulie',
    sets: [['5x10', 12.5, '9-10'], ['3x12-15', null, 'Échec']],
  },
  { name: 'DB Skull Crusher', zone: 'Bras', note: 'haltères', sets: [['3x10-15', null, 'Échec'], ['3x15', null, 'Échec']] },
  { name: 'Rolling DB Triceps Ext', zone: 'Bras', note: 'finisher tabata', sets: [['Tabata 8x20s', null, '']] },
  { name: 'Banded Triceps Push Down', zone: 'Bras', note: 'élastique', sets: [['100 reps', null, '']] },
  {
    name: 'BB Curl',
    zone: 'Bras',
    note: 'barre + 4/4',
    sets: [['5x6', null, '9'], ['4x10', null, '8'], ['4x10-12', null, '8'], ['8-10-12-10-8', null, '']],
  },
  { name: 'EZ Bar Curl', zone: 'Bras', note: 'barre EZ', sets: [['4x10', null, '8']] },
  { name: 'Empty Bar Curl', zone: 'Bras', note: 'finisher, barre vide', sets: [['4 x 30s', null, '']] },
  {
    name: 'Hammer Curl',
    zone: 'Bras',
    sets: [['4x12', 7.5, ''], ['4x8', 7.5, ''], ['3x8-12', null, 'Échec'], ['3x12-15', null, 'Échec']],
  },
  { name: 'Cross Body Hammer Curl', zone: 'Bras', sets: [['4x12/12', 7.5, '9']] },
  { name: 'Banded Hammer Curl', zone: 'Bras', note: 'élastique, à l’échec', sets: [['4 x max', null, 'Échec']] },
  { name: 'DB Curl', zone: 'Bras', note: 'léger', sets: [['4x10-12', 5, '']] },
  { name: 'Incline DB Curl', zone: 'Bras', note: 'banc incliné', sets: [['3x12-15', null, 'Échec']] },
  { name: 'Poliquin Curl', zone: 'Bras', note: 'peu de charge, squeeze', sets: [['3x10/10', null, '']] },

  // ---------- Dos ----------
  {
    name: 'Pull-Ups',
    zone: 'Dos',
    note: 'PU : 36',
    sets: [['4 x max', 36, ''], ['4 x max prise large', null, '']],
  },
  { name: 'Lat Pull Down', zone: 'Dos', note: 'poulie haute', sets: [['4 x max', null, '']] },
  { name: 'Bent Over Row', zone: 'Dos', note: 'barre 50', sets: [['5x6', 50, '10'], ['4x8-10', null, '8']] },
  { name: 'Seal Row', zone: 'Dos', note: 'buste soutenu', sets: [['5x6', null, '10'], ['4x8-10', null, '8']] },
  { name: 'Pendlay Row', zone: 'Dos', note: 'départ au sol', sets: [['5x6', null, '10'], ['4x8-10', null, '8']] },
  { name: 'DB Bent Over Row', zone: 'Dos', note: 'par haltère', sets: [['3x8-12', 22.5, '']] },
  { name: 'Landmine Row', zone: 'Dos', note: 'barre en landmine', sets: [['4x12/12', null, '8']] },
  { name: 'T-Bar Row', zone: 'Dos', note: 'poignée ou sangles', sets: [['4x12/12', null, '8']] },
  { name: 'Seated Cable Row', zone: 'Dos', note: 'poulie basse', sets: [['3x20-30', null, 'Échec']] },
  { name: 'Banded Row', zone: 'Dos', note: 'élastique', sets: [['3x20-30', null, 'Échec']] },
  { name: 'Ring Row', zone: 'Dos', note: 'finisher, anneaux', sets: [['4 x 30s', null, '']] },
  { name: 'Flexion Row', zone: 'Dos', note: 'barre 30', sets: [['4x10-12', 30, '7']] },
  {
    name: 'Straight Arm Lat Pull Down',
    zone: 'Dos',
    note: 'élastique, serratus',
    sets: [['4x15-20', null, '']],
  },

  // ---------- Jambes ----------
  {
    name: 'Squat',
    zone: 'Jambes',
    rm: 210,
    note: 'barre, 190-210',
    sets: [['6x4', 190, '8-9'], ['4x8', null, '8-9'], ['4x12', null, '8']],
  },
  {
    name: 'Pendulum Squat',
    zone: 'Jambes',
    note: 'machine',
    sets: [['6x4', null, '8-9'], ['4x8', null, '8-9'], ['4x12', null, '8'], ['3x10', null, '8-9']],
  },
  {
    name: 'Belt Squat',
    zone: 'Jambes',
    note: 'machine',
    sets: [['6x4', null, '8-9'], ['4x8', null, '8-9'], ['4x12', null, '8'], ['3x10', null, '8-9']],
  },
  {
    name: 'Leg Press',
    zone: 'Jambes',
    note: 'machine',
    sets: [['6x4', null, '8-9'], ['4x8', null, '8-9'], ['4x12', null, '8']],
  },
  {
    name: 'Hack Squat',
    zone: 'Jambes',
    note: 'machine',
    sets: [['6x4', null, '8-9'], ['4x8', null, '8-9'], ['4x12', null, '8']],
  },
  { name: 'Front Squat', zone: 'Jambes', note: 'barre devant', sets: [['3x10', null, '8-9']] },
  { name: 'Safety Squat Bar Squat', zone: 'Jambes', note: 'barre SSB', sets: [['3x10', null, '8-9']] },
  { name: 'Goblet Squat', zone: 'Jambes', note: '20 modéré / 10 lourd / 20 modéré', sets: [['20-10-20', null, '']] },
  { name: 'RDL', zone: 'Jambes', note: 'barre', sets: [['5x5', 100, '9']] },
  { name: 'DB RDL', zone: 'Jambes', note: 'par haltère', sets: [['3x12', null, '9']] },
  { name: 'Split Stance DB RDL', zone: 'Jambes', note: 'par haltère', sets: [['4x8-10', null, '9']] },
  { name: 'Sumo DB Deadlift', zone: 'Jambes', note: 'haltère', sets: [['3x6-8', null, 'Dur']] },
  { name: 'Sumo KB Deadlift', zone: 'Jambes', note: 'kettlebell', sets: [['3x6-8', null, 'Dur']] },
  { name: 'Seated Hamstring Curl', zone: 'Jambes', note: 'machine', sets: [['4x8-12', null, '8'], ['3x12-15', null, '9']] },
  { name: 'Prone Hamstring Curl', zone: 'Jambes', note: 'machine, allongé', sets: [['4x8-12', null, '8'], ['3x12-15', null, '9']] },
  { name: 'Medball Hamstring Curl', zone: 'Jambes', note: 'medecine ball', sets: [['4x8-12', null, '8'], ['3x12-15', null, '9']] },
  { name: 'Slider Hamstring Curl', zone: 'Jambes', note: 'sliders', sets: [['4x8-12', null, '8'], ['3x12-15', null, '9']] },
  { name: 'Banded Hamstring Curl', zone: 'Jambes', note: 'élastique', sets: [['4x8-12', null, '8'], ['3x12-15', null, '9']] },
  { name: 'DB Walking Lunge', zone: 'Jambes', note: 'par haltère', sets: [['3x20', 22.5, '']] },
  { name: 'Jumping Lunge', zone: 'Jambes', note: 'poids de corps', sets: [['3x20', null, '']] },
  { name: 'Bulgarian Split Squat', zone: 'Jambes', note: 'drop set, 2 haltères', sets: [['3x8-12', null, '8']] },
  { name: 'Deficit Curtsy Lunge', zone: 'Jambes', note: 'goblet, sur déficit', sets: [['4x6-8/6-8', null, '8']] },
  { name: 'Barbell Box Step Up', zone: 'Jambes', note: 'box 50 cm max', sets: [['3x8/8', null, '8']] },
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
      { id: newId('v'), scheme: RM_SCHEME, rpe: '', history: point(rm) },
      ...sets.map(([scheme, load, rpe = '']) => ({
        id: newId('v'),
        scheme,
        rpe,
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

// RPE du programme, indexé par « nom d'exercice|schéma », pour compléter des
// données enregistrées avant l'ajout du RPE.
export const RPE_BY_KEY = Object.fromEntries(
  SEED.flatMap(({ name, sets }) =>
    sets.filter(([, , rpe]) => rpe).map(([scheme, , rpe]) => [`${name}|${scheme}`, rpe])
  )
)

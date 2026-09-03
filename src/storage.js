import { buildSeed, RPE_BY_KEY, ZONE_BY_NAME } from './seed.js'
import { DEFAULT_ZONE, newId, RM_SCHEME, todayISO, ZONES } from './utils.js'

export const STORAGE_KEY = 'suivi_charges_v5'
// v1 : un seul schéma par exercice (scheme + history à la racine).
// v2 : plusieurs formats, mais le RM était une valeur isolée de l'exercice.
// v3 : le RM est devenu le format principal ; pas encore de zone musculaire.
// v4 : zones musculaires, mais pas encore de RPE sur les formats.
const V4_KEY = 'suivi_charges_v4'
const V3_KEY = 'suivi_charges_v3'
const V2_KEY = 'suivi_charges_v2'
const V1_KEY = 'suivi_charges_v1'

function normalizeHistory(history) {
  return Array.isArray(history)
    ? history
        .filter((p) => p && typeof p.date === 'string' && Number.isFinite(p.load))
        .map((p) => ({ date: p.date, load: p.load }))
    : []
}

function normalizeVariant(v, fallbackScheme = '') {
  return {
    id: v && v.id ? v.id : newId('v'),
    scheme: String((v && v.scheme) || fallbackScheme),
    rpe: String((v && v.rpe) || ''),
    history: normalizeHistory(v && v.history),
  }
}

function normalize(list) {
  if (!Array.isArray(list)) return null
  return list.map((e) => {
    const variants = Array.isArray(e.variants) ? e.variants : []
    return {
      id: e.id || newId(),
      name: String(e.name || ''),
      zone: ZONES.includes(e.zone) ? e.zone : DEFAULT_ZONE,
      note: String(e.note || ''),
      // variants[0] est toujours le format principal (le RM).
      variants: [
        normalizeVariant(variants[0], RM_SCHEME),
        ...variants.slice(1).map((v) => normalizeVariant(v)),
      ],
    }
  })
}

// Le schéma unique d'un exercice v1 devient son premier format.
function migrateV1toV2(list) {
  if (!Array.isArray(list)) return null
  return list.map((e) => ({
    id: e.id,
    name: e.name,
    rm: e.rm,
    note: e.note,
    variants: [{ id: newId('v'), scheme: e.scheme, history: e.history }],
  }))
}

// Le RM d'un exercice v2 devient son format principal, daté du jour de la migration.
function migrateV2toV3(list) {
  if (!Array.isArray(list)) return null
  const date = todayISO()
  return list.map((e) => ({
    id: e.id,
    name: e.name,
    note: e.note,
    variants: [
      {
        id: newId('v'),
        scheme: RM_SCHEME,
        history: Number.isFinite(e.rm) ? [{ date, load: e.rm }] : [],
      },
      ...(Array.isArray(e.variants) ? e.variants : []),
    ],
  }))
}

// Les exercices du jeu de départ retrouvent leur zone par leur nom ;
// les exercices créés à la main tombent dans « Autre ».
function migrateV3toV4(list) {
  if (!Array.isArray(list)) return null
  return list.map((e) => ({ ...e, zone: ZONE_BY_NAME[e.name] || DEFAULT_ZONE }))
}

// Les formats du jeu de départ retrouvent le RPE du programme via leur
// couple nom + schéma ; les formats saisis à la main restent sans RPE.
function migrateV4toV5(list) {
  if (!Array.isArray(list)) return null
  return list.map((e) => ({
    ...e,
    variants: (Array.isArray(e.variants) ? e.variants : []).map((v) => ({
      ...v,
      rpe: v.rpe || RPE_BY_KEY[`${e.name}|${v.scheme}`] || '',
    })),
  }))
}

export function loadExercises() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = normalize(JSON.parse(raw))
      if (parsed) return parsed
    }

    const migrations = [
      [V4_KEY, (d) => migrateV4toV5(d)],
      [V3_KEY, (d) => migrateV4toV5(migrateV3toV4(d))],
      [V2_KEY, (d) => migrateV4toV5(migrateV3toV4(migrateV2toV3(d)))],
      [V1_KEY, (d) => migrateV4toV5(migrateV3toV4(migrateV2toV3(migrateV1toV2(d))))],
    ]
    for (const [key, migrate] of migrations) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const migrated = normalize(migrate(JSON.parse(raw)))
      if (migrated) {
        saveExercises(migrated)
        return migrated
      }
    }
  } catch (err) {
    console.warn('Lecture localStorage impossible, réinitialisation.', err)
  }

  const seeded = buildSeed()
  saveExercises(seeded)
  return seeded
}

export function saveExercises(exercises) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises))
  } catch (err) {
    console.warn('Écriture localStorage impossible.', err)
  }
}

// ---------------------------------------------------------------------------
// Choix d'exercices faits sur la page Programme, stockés à part des exercices.
// { "bloc7-s1.d0.b1.m0": "Bench Press", ... }
// ---------------------------------------------------------------------------

export const CHOICES_KEY = 'suivi_programme_choix_v1'

export function loadChoices() {
  try {
    const raw = localStorage.getItem(CHOICES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch (err) {
    console.warn('Lecture des choix de programme impossible.', err)
    return {}
  }
}

export function saveChoices(choices) {
  try {
    localStorage.setItem(CHOICES_KEY, JSON.stringify(choices))
  } catch (err) {
    console.warn('Écriture des choix de programme impossible.', err)
  }
}

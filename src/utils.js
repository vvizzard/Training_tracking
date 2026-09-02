// Parse un nombre saisi par l'utilisateur : accepte la virgule décimale.
// Retourne null si la saisie est vide ou invalide.
export function parseNum(value) {
  if (value === null || value === undefined) return null
  const raw = String(value).trim().replace(',', '.')
  if (raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

// Affiche un nombre sans décimale inutile : 60 -> "60", 17.5 -> "17.5"
export function fmtNum(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return String(Math.round(n * 100) / 100)
}

export function fmtKg(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return fmtNum(n) + 'kg'
}

export function fmtSigned(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  const s = fmtNum(Math.abs(n))
  if (n > 0) return '+' + s
  if (n < 0) return '-' + s
  return '0'
}

export function todayISO() {
  const d = new Date()
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// "2025-03-14" -> "14/03"
export function fmtDateShort(iso) {
  if (!iso || iso.length < 10) return iso || ''
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

// "2025-03-14" -> "14/03/2025"
export function fmtDateLong(iso) {
  if (!iso || iso.length < 10) return iso || ''
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

export function sortHistory(history) {
  return [...(history || [])].sort((a, b) => a.date.localeCompare(b.date))
}

// Charge courante = dernier point de l'historique trié par date.
export function currentLoad(history) {
  const h = sortHistory(history)
  return h.length ? h[h.length - 1].load : null
}

// Delta = dernier point - premier point.
export function loadDelta(history) {
  const h = sortHistory(history)
  if (h.length < 2) return null
  return h[h.length - 1].load - h[0].load
}

// Zones musculaires servant à regrouper la liste d'exercices.
export const ZONES = ['Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Autre']
export const DEFAULT_ZONE = 'Autre'

// Minuscules sans accent, pour une recherche tolérante ("epaule" trouve "Épaules").
export function searchable(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Le premier format d'un exercice est son format principal : le RM.
// Les suivants sont ses déclinaisons (4x8-10, 3x12-15, ...).
export const RM_SCHEME = 'RM'

export function principalVariant(exercise) {
  return exercise.variants[0]
}

export function declinations(exercise) {
  return exercise.variants.slice(1)
}

// Valeur de RM affichée = dernière charge relevée sur le format principal.
export function rmValue(exercise) {
  return currentLoad(principalVariant(exercise).history)
}

// Insère ou remplace le point à cette date (une date = un point).
export function upsertPoint(history, date, load) {
  const rest = (history || []).filter((p) => p.date !== date)
  return sortHistory([...rest, { date, load }])
}

// prefix : 'ex' pour un exercice, 'v' pour un format (variante).
export function newId(prefix = 'ex') {
  return prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36)
}

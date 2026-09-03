import { parseImportData } from './programImport.js'

// Un profil est un fichier JSON servi avec le site : public/programmes/<nom>.json.
// La personne saisit le nom, l'app va chercher le fichier correspondant. Le
// programme vient donc du serveur et non du navigateur : il est le même sur
// n'importe quel appareil, et le mettre à jour se fait en modifiant le fichier
// dans le dépôt.
//
// Ce n'est pas une authentification : les fichiers sont publics et n'importe
// qui connaissant un nom peut ouvrir le profil correspondant.

const ACTIVE_KEY = 'suivi_profil_actif'
const CACHE_PREFIX = 'suivi_profil_cache_'

export function profileSlug(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function profileUrl(slug) {
  return new URL(`programmes/${slug}.json`, document.baseURI).href
}

export function loadActiveProfile() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.slug !== 'string') return null
    return { slug: parsed.slug, label: String(parsed.label || parsed.slug) }
  } catch {
    return null
  }
}

export function saveActiveProfile(profile) {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(profile))
  } catch (err) {
    console.warn('Enregistrement du profil impossible.', err)
  }
}

export function clearActiveProfile() {
  try {
    localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* rien à faire */
  }
}

// Dernière version connue d'un profil, pour rester utilisable hors ligne.
export function loadProfileCache(slug) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + slug)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.programs) ? parsed : null
  } catch {
    return null
  }
}

function saveProfileCache(slug, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify(data))
  } catch (err) {
    console.warn('Mise en cache du profil impossible.', err)
  }
}

// Va chercher le fichier du profil et le valide avec le même schéma que
// l'import manuel. Renvoie { ok, label, programs, errors, offline }.
export async function fetchProfile(slug) {
  if (!slug) return { ok: false, errors: ['Nom de profil vide.'] }

  let response
  try {
    response = await fetch(profileUrl(slug), { cache: 'no-cache' })
  } catch {
    const cached = loadProfileCache(slug)
    if (cached) return { ok: true, ...cached, offline: true, errors: [] }
    return {
      ok: false,
      errors: ['Impossible de joindre le serveur, et aucune version en cache.'],
    }
  }

  if (response.status === 404) {
    return { ok: false, notFound: true, errors: [`Aucun programme au nom de « ${slug} ».`] }
  }
  if (!response.ok) {
    return { ok: false, errors: [`Le serveur a répondu ${response.status}.`] }
  }

  let raw
  try {
    raw = JSON.parse(await response.text())
  } catch (err) {
    return { ok: false, errors: [`Fichier illisible : ${err.message}`] }
  }

  // Le nom doit figurer dans le fichier : renommer le fichier sans mettre son
  // contenu à jour donnerait sinon un profil qui ne s'annonce pas correctement.
  const declared = typeof raw.profile === 'string' ? raw.profile.trim() : ''
  if (!declared) {
    return {
      ok: false,
      errors: ['Le fichier doit contenir un champ "profile" avec le nom du profil.'],
    }
  }
  if (profileSlug(declared) !== slug) {
    return {
      ok: false,
      errors: [
        `Le fichier annonce le profil « ${declared} » alors qu'il est servi sous « ${slug} ».`,
      ],
    }
  }

  const { programs, errors } = parseImportData(raw)
  if (errors.length) return { ok: false, errors }
  if (!programs.length) return { ok: false, errors: ['Aucun programme dans ce fichier.'] }

  const data = { label: declared, programs, fetchedAt: new Date().toISOString() }
  saveProfileCache(slug, data)
  return { ok: true, ...data, errors: [] }
}

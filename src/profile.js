import { parseImportData } from './programImport.js'

// Un profil désigne un programme hébergé en ligne. Deux façons de le désigner :
//
//   - un nom, qui pointe vers un fichier servi avec le site,
//     public/programmes/<nom>.json ;
//   - une URL https complète, vers n'importe quel hébergeur de JSON.
//
// Dans les deux cas le programme vient du réseau et non du navigateur : il est
// donc le même sur tous les appareils, et le modifier chez l'hébergeur suffit à
// le mettre à jour partout.
//
// Sécurité : une app statique ne peut rien garder de secret. Une URL contenant
// une clé aléatoire est indevinable, mais quiconque obtient le lien accède au
// programme. C'est le modèle du lien de partage, pas celui d'un mot de passe.

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

export function looksLikeUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

// Interprète ce qui a été saisi : une URL, ou un nom de profil local.
export function resolveSource(input) {
  const raw = String(input || '').trim()
  if (looksLikeUrl(raw)) return { url: raw }
  const slug = profileSlug(raw)
  return slug ? { slug } : null
}

export function localProfileUrl(slug) {
  return new URL(`programmes/${slug}.json`, document.baseURI).href
}

// Lien d'ouverture directe, à envoyer sur son téléphone ou à mettre en favori.
export function shareLink(source) {
  const base = new URL(document.baseURI)
  base.hash = source.url ? `p=${encodeURIComponent(source.url)}` : `n=${source.slug}`
  return base.href
}

// Source éventuellement passée dans le fragment de l'URL courante.
export function readHashSource() {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const params = new URLSearchParams(hash)
  const url = params.get('p')
  if (url) return { url }
  const slug = params.get('n')
  return slug ? { slug: profileSlug(slug) } : null
}

export function clearHash() {
  const { pathname, search } = window.location
  window.history.replaceState(null, '', pathname + search)
}

export function loadActiveProfile() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.slug !== 'string') return null
    return {
      slug: parsed.slug,
      label: String(parsed.label || parsed.slug),
      url: typeof parsed.url === 'string' ? parsed.url : '',
    }
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

function fail(...errors) {
  return { ok: false, errors }
}

// Va chercher le programme et le valide avec le même schéma que l'import
// manuel. `source` vaut { slug } ou { url }.
export async function fetchProfile(source) {
  if (!source || (!source.slug && !source.url)) return fail('Aucun profil indiqué.')

  const isRemote = Boolean(source.url)
  // Une page servie en https ne peut pas lire une adresse en http : le
  // navigateur bloque le contenu mixte. Autant le dire tout de suite.
  if (
    isRemote &&
    window.location.protocol === 'https:' &&
    !/^https:\/\//i.test(source.url)
  ) {
    return fail(
      'Seules les adresses https sont acceptées ici : le navigateur bloque la lecture d’une adresse http depuis une page https.'
    )
  }

  const target = isRemote ? source.url : localProfileUrl(source.slug)

  let response
  try {
    response = await fetch(target, { cache: 'no-cache' })
  } catch {
    const cached = source.slug ? loadProfileCache(source.slug) : null
    if (cached) return { ok: true, slug: source.slug, ...cached, offline: true, errors: [] }
    return fail(
      isRemote
        ? 'Adresse injoignable. Soit tu es hors ligne, soit l’hébergeur n’autorise pas la lecture depuis un autre site (CORS).'
        : 'Impossible de joindre le serveur, et aucune version en cache.'
    )
  }

  if (response.status === 404) {
    return {
      ...fail(
        isRemote
          ? 'Rien à cette adresse (404).'
          : `Aucun programme au nom de « ${source.slug} ».`
      ),
      notFound: true,
    }
  }
  if (!response.ok) return fail(`Le serveur a répondu ${response.status}.`)

  let raw
  try {
    raw = JSON.parse(await response.text())
  } catch (err) {
    return fail(`Contenu illisible : ${err.message}`)
  }

  // Le nom du profil doit figurer dans le JSON : c'est lui qui sert d'étiquette
  // et qui cloisonne les données, indépendamment de l'endroit où le fichier est
  // hébergé.
  const declared = typeof raw.profile === 'string' ? raw.profile.trim() : ''
  if (!declared) {
    return fail('Le JSON doit contenir un champ "profile" avec le nom du profil.')
  }

  const slug = profileSlug(declared)
  // Pour un fichier servi avec le site, le nom annoncé doit correspondre au nom
  // du fichier : renommer l'un sans l'autre ne passe pas inaperçu.
  if (!isRemote && slug !== source.slug) {
    return fail(
      `Le fichier annonce le profil « ${declared} » alors qu'il est servi sous « ${source.slug} ».`
    )
  }

  const { programs, errors } = parseImportData(raw)
  if (errors.length) return { ok: false, errors }
  if (!programs.length) return fail('Aucun programme dans ce fichier.')

  const data = { label: declared, programs, fetchedAt: new Date().toISOString() }
  saveProfileCache(slug, data)
  return { ok: true, slug, url: isRemote ? source.url : '', ...data, errors: [] }
}

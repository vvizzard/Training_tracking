// Import de programmes au format JSON.
//
// Un programme importé est une liste de journées, chacune datée. C'est ce qui
// permet d'importer indifféremment une journée, une semaine ou un mois : il n'y
// a qu'à mettre autant d'entrées que de jours couverts. Les dates absentes sont
// des jours de repos.
//
// Le format canonique est décrit par EXAMPLE ci-dessous. Quelques raccourcis
// sont tolérés pour que le JSON reste écrivable à la main :
//   - "sets": "4x8-10"                 au lieu de [{ "reps": "4x8-10" }]
//   - "sets": ["1x5", "4x6-8"]         idem, plusieurs séries
//   - "notes": "une seule remarque"    au lieu d'un tableau
//   - "links": ["https://…"]           au lieu de [{ "label", "url" }]
//   - un bloc peut porter directement "exercise" / "choices" / "sets" / "rpe"
//     au lieu d'un tableau "movements" à un seul élément
//   - un mouvement peut être une simple chaîne, prise comme nom d'exercice

export const IMPORT_FORMAT = 'suivi-charges/programme@1'

const KINDS = ['warmup', 'single', 'superset', 'finisher']

export const EXAMPLE = `{
  "format": "${IMPORT_FORMAT}",
  "label": "Bloc 8 · semaine 1/4",
  "focus": "Reprise en volume.",
  "days": [
    {
      "date": "2026-09-07",
      "title": "Séance 1 · Push",
      "focus": "Pectoraux, épaules, triceps",
      "blocks": [
        {
          "kind": "warmup",
          "intro": "3 à 5 min de cardio",
          "lines": ["15 Band Pull Apart", "10/10 étirement des pectoraux"],
          "rounds": "2-3 tours",
          "rest": "1 min"
        },
        {
          "n": 1,
          "exercise": "Bench Press",
          "sets": "4x8-10",
          "rpe": "8",
          "rest": "2-3 min",
          "notes": "Garder 5 kg de réserve.",
          "links": [{ "label": "Démo", "url": "https://youtu.be/xxxx" }]
        },
        {
          "n": 2,
          "choices": ["Squat", "Leg Press", "Hack Squat"],
          "title": "Squat au choix",
          "sets": [{ "reps": "5x5", "rpe": "9" }],
          "rest": "3 min"
        },
        {
          "n": 3,
          "kind": "superset",
          "rounds": "3 tours",
          "rest": "1:30",
          "movements": [
            { "match": "Lateral Raise", "sets": [{ "reps": "12", "scheme": "3x10-12", "rpe": "Échec" }] },
            { "match": "Rear Delt Fly", "sets": [{ "reps": "15", "scheme": "3x15" }] }
          ]
        }
      ]
    },
    { "date": "2026-09-08", "rest": true }
  ]
}`

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(iso) {
  if (!ISO_DATE.test(iso)) return false
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  )
}

function asArray(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

// Accepte une chaîne ou un tableau de chaînes, ignore le reste.
function strList(value) {
  return asArray(value)
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim())
}

function str(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function normSets(raw, rpeFallback, path, errors) {
  const list = asArray(raw)
  const out = []
  list.forEach((s, i) => {
    if (typeof s === 'string' && s.trim()) {
      out.push({ reps: s.trim(), rpe: rpeFallback })
      return
    }
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      const reps = str(s.reps)
      if (!reps) {
        errors.push(`${path}[${i}] : "reps" manquant`)
        return
      }
      out.push({
        reps,
        scheme: str(s.scheme) || undefined,
        rpe: s.rpe == null || s.rpe === '' ? rpeFallback : String(s.rpe).trim(),
        hint: str(s.hint) || undefined,
      })
      return
    }
    errors.push(
      `${path}[${i}] : série invalide, attendu "4x8-10" ou { "reps": "4x8-10" }`
    )
  })
  return out
}

// Seuls http et https sont acceptés : le JSON est une entrée extérieure et ces
// URL finissent dans un href.
function normLinks(raw, path, errors) {
  const out = []
  asArray(raw).forEach((l, i) => {
    const url = typeof l === 'string' ? l.trim() : str(l && l.url)
    if (!url) {
      errors.push(`${path}[${i}] : "url" manquante`)
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      errors.push(`${path}[${i}] : URL refusée « ${url} », seuls http et https sont acceptés`)
      return
    }
    out.push({ label: (typeof l === 'object' && str(l.label)) || 'Vidéo', url })
  })
  return out
}

function normMovement(raw, rpeFallback, path, errors) {
  if (typeof raw === 'string') {
    const name = raw.trim()
    if (!name) {
      errors.push(`${path} : nom d'exercice vide`)
      return null
    }
    return { title: name, match: name, sets: [], notes: [], links: [] }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`${path} : mouvement invalide, attendu un objet ou un nom d'exercice`)
    return null
  }

  const choices = strList(raw.choices)
  const match = str(raw.match) || str(raw.exercise)
  const title = str(raw.title) || match || choices[0]
  if (!title) {
    errors.push(`${path} : il faut au moins "title", "match"/"exercise" ou "choices"`)
    return null
  }

  const mov = {
    title,
    sets: normSets(raw.sets, rpeFallback, `${path}.sets`, errors),
    notes: strList(raw.notes),
    links: normLinks(raw.links, `${path}.links`, errors),
  }
  if (choices.length) mov.choices = choices
  else if (match) mov.match = match
  return mov
}

function normBlock(raw, path, errors) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`${path} : bloc invalide, attendu un objet`)
    return null
  }

  const kind = KINDS.includes(raw.kind) ? raw.kind : 'single'
  const base = {
    kind,
    rounds: str(raw.rounds) || undefined,
    rest: str(raw.rest) || undefined,
    notes: strList(raw.notes),
  }
  if (Number.isFinite(raw.n)) base.n = raw.n

  if (kind === 'warmup') {
    const lines = strList(raw.lines)
    if (!lines.length) errors.push(`${path}.lines : aucune ligne d'échauffement`)
    return {
      ...base,
      title: str(raw.title) || 'Échauffement',
      intro: str(raw.intro) || undefined,
      lines,
    }
  }

  const rpeFallback = raw.rpe == null || raw.rpe === '' ? '' : String(raw.rpe).trim()

  // Raccourci : le bloc décrit directement son mouvement unique. Le titre est
  // alors celui du mouvement, pas celui du bloc, pour ne pas l'afficher deux fois.
  let rawMovements = raw.movements
  let title = str(raw.title) || undefined
  if (rawMovements == null && (raw.exercise || raw.match || raw.choices || raw.sets)) {
    rawMovements = [
      {
        title: raw.title,
        match: raw.match || raw.exercise,
        choices: raw.choices,
        sets: raw.sets,
        notes: raw.movementNotes,
        links: raw.links,
      },
    ]
    title = undefined
  }

  const movements = asArray(rawMovements)
    .map((m, i) => normMovement(m, rpeFallback, `${path}.movements[${i}]`, errors))
    .filter(Boolean)

  if (!movements.length && kind !== 'finisher') {
    errors.push(
      `${path} : aucun mouvement. Utiliser "movements", ou "exercise"/"choices" + "sets".`
    )
  }

  return { ...base, title, movements, links: normLinks(raw.blockLinks, `${path}.blockLinks`, errors) }
}

function normDay(raw, path, errors, seenDates) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`${path} : journée invalide, attendu un objet`)
    return null
  }

  const date = str(raw.date)
  if (!date) {
    errors.push(`${path}.date : date manquante, attendu "AAAA-MM-JJ"`)
    return null
  }
  if (!isValidDate(date)) {
    errors.push(`${path}.date : date invalide « ${date} », attendu "AAAA-MM-JJ"`)
    return null
  }
  if (seenDates.has(date)) {
    errors.push(`${path}.date : « ${date} » apparaît déjà dans cet import`)
    return null
  }
  seenDates.add(date)

  const rawBlocks = asArray(raw.blocks)
  // Pas de bloc, ou "rest": true → jour de repos.
  if (raw.rest === true || !rawBlocks.length) {
    return { date, rest: true }
  }

  const blocks = rawBlocks
    .map((b, i) => normBlock(b, `${path}.blocks[${i}]`, errors))
    .filter(Boolean)

  return {
    date,
    title: str(raw.title) || 'Séance',
    focus: str(raw.focus) || '',
    blocks,
  }
}

function slug(value) {
  return (
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'programme'
  )
}

function normProgram(raw, path, errors) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`${path} : attendu un objet programme`)
    return null
  }
  if (raw.format && raw.format !== IMPORT_FORMAT) {
    errors.push(
      `${path}.format : « ${raw.format} » inconnu, attendu « ${IMPORT_FORMAT} »`
    )
  }

  const rawDays = raw.days
  if (!Array.isArray(rawDays) || !rawDays.length) {
    errors.push(`${path}.days : tableau de journées manquant ou vide`)
    return null
  }

  const seenDates = new Set()
  const days = rawDays
    .map((d, i) => normDay(d, `${path}.days[${i}]`, errors, seenDates))
    .filter(Boolean)

  if (!days.length) return null

  days.sort((a, b) => a.date.localeCompare(b.date))
  const label = str(raw.label) || 'Programme importé'

  return {
    id: str(raw.id) || `import-${slug(label)}-${Date.now().toString(36)}`,
    label,
    focus: str(raw.focus) || '',
    importedAt: new Date().toISOString(),
    start: days[0].date,
    end: days[days.length - 1].date,
    days,
  }
}

// Point d'entrée : accepte un programme, un tableau de programmes,
// ou { "programs": [...] }.
export function parseImport(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch (err) {
    return { programs: [], errors: [`JSON illisible : ${err.message}`] }
  }
  return parseImportData(raw)
}

// Même chose, à partir d'une valeur déjà désérialisée.
export function parseImportData(raw) {
  const errors = []
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw && raw.programs)
      ? raw.programs
      : [raw]

  const programs = list
    .map((p, i) => normProgram(p, list.length > 1 ? `programs[${i}]` : 'programme', errors))
    .filter(Boolean)

  if (!programs.length && !errors.length) {
    errors.push('Aucun programme trouvé dans ce JSON.')
  }
  return { programs, errors }
}

// Vérifie que les exercices visés existent dans la liste ; renvoie les noms
// inconnus, à signaler sans bloquer l'import.
export function unknownExercises(program, exerciseNames) {
  const missing = new Set()
  program.days.forEach((day) => {
    if (day.rest) return
    day.blocks.forEach((block) => {
      ;(block.movements || []).forEach((mov) => {
        const names = mov.choices || (mov.match ? [mov.match] : [])
        names.forEach((n) => {
          if (!exerciseNames.has(n)) missing.add(n)
        })
      })
    })
  })
  return [...missing]
}

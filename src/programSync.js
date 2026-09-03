import { DEFAULT_ZONE, newId, RM_SCHEME } from './utils.js'

// Un programme importé peut citer des exercices ou des schémas de reps qui
// n'existent pas encore dans la liste. Sans eux, la charge n'a nulle part où
// être enregistrée et la séance affiche « — » indéfiniment. On les crée donc à
// l'import : les exercices inconnus arrivent dans « Autre », et les schémas
// manquants deviennent des déclinaisons vides, prêtes à recevoir une charge.

// Relève, pour un ensemble de programmes, tous les couples exercice / schéma
// attendus. Un mouvement à choix multiple compte pour chacune de ses options :
// quelle que soit celle retenue, elle devra pouvoir porter la charge du jour.
function collectWanted(programs) {
  const wanted = new Map()

  for (const program of programs) {
    for (const day of program.days) {
      if (day.rest || !Array.isArray(day.blocks)) continue
      for (const block of day.blocks) {
        for (const mov of block.movements || []) {
          const names = mov.choices || (mov.match ? [mov.match] : [])
          if (!names.length) continue

          const schemes = (mov.sets || [])
            .map((s) => ({ scheme: (s.scheme || s.reps || '').trim(), rpe: s.rpe || '' }))
            .filter((s) => s.scheme && s.scheme !== RM_SCHEME)

          for (const name of names) {
            if (!wanted.has(name)) wanted.set(name, new Map())
            const schemeMap = wanted.get(name)
            for (const s of schemes) {
              if (!schemeMap.has(s.scheme)) schemeMap.set(s.scheme, s.rpe)
            }
          }
        }
      }
    }
  }
  return wanted
}

// Calcule ce qui manque, sans rien modifier : sert à l'aperçu avant import.
export function missingFor(programs, exercises) {
  const wanted = collectWanted(programs)
  const byName = new Map(exercises.map((e) => [e.name, e]))
  const newExercises = []
  const newVariants = []

  for (const [name, schemes] of wanted) {
    const exercise = byName.get(name)
    if (!exercise) {
      newExercises.push(name)
      continue
    }
    const known = new Set(exercise.variants.map((v) => v.scheme))
    for (const scheme of schemes.keys()) {
      if (!known.has(scheme)) newVariants.push({ name, scheme })
    }
  }
  return { newExercises, newVariants }
}

// Renvoie la liste d'exercices complétée. `exercises` n'est pas modifié.
export function ensureExercisesFor(programs, exercises) {
  const wanted = collectWanted(programs)
  const byName = new Map(exercises.map((e) => [e.name, e]))
  const createdExercises = []
  const createdVariants = []
  const next = [...exercises]

  for (const [name, schemes] of wanted) {
    const existing = byName.get(name)

    if (!existing) {
      const exercise = {
        id: newId(),
        name,
        zone: DEFAULT_ZONE,
        note: 'créé à l’import d’un programme',
        variants: [
          { id: newId('v'), scheme: RM_SCHEME, rpe: '', history: [] },
          ...[...schemes].map(([scheme, rpe]) => ({
            id: newId('v'),
            scheme,
            rpe,
            history: [],
          })),
        ],
      }
      next.push(exercise)
      byName.set(name, exercise)
      createdExercises.push(name)
      schemes.forEach((_, scheme) => createdVariants.push({ name, scheme }))
      continue
    }

    const known = new Set(existing.variants.map((v) => v.scheme))
    const added = [...schemes]
      .filter(([scheme]) => !known.has(scheme))
      .map(([scheme, rpe]) => ({ id: newId('v'), scheme, rpe, history: [] }))

    if (!added.length) continue

    const index = next.findIndex((e) => e.id === existing.id)
    next[index] = { ...existing, variants: [...existing.variants, ...added] }
    added.forEach((v) => createdVariants.push({ name, scheme: v.scheme }))
  }

  return { exercises: next, createdExercises, createdVariants }
}

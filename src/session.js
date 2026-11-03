// Lecture d'une journée de programme : quel exercice a été retenu pour chaque
// mouvement, quelle déclinaison porte sa charge, et ce qui a été noté ce
// jour-là. La page Programme s'en sert pour afficher les séries, le résumé de
// fin de séance pour les récapituler.
import { blockKey } from './program.js'
import {
  firstNumber,
  parsePrescribedSets,
  previousPoint,
  setsVolume,
} from './utils.js'

// Résout le nom d'exercice retenu pour un mouvement : le choix enregistré s'il
// est encore proposé, sinon la première option, sinon le mouvement unique.
export function resolveName(mov, key, choices) {
  if (!mov.choices) return mov.match || null
  const saved = choices[key]
  return saved && mov.choices.includes(saved) ? saved : mov.choices[0]
}

// La déclinaison est cherchée sur le schéma indiqué, puis sur les reps
// affichées : un exercice choisi en remplacement d'un autre n'a pas toujours
// le même libellé de série (« 4 x max » contre « 4 x max prise large »).
export function findVariant(exercise, set) {
  if (!exercise) return null
  for (const scheme of [set.scheme, set.reps].filter(Boolean)) {
    const variant = exercise.variants.find((v) => v.scheme === scheme)
    if (variant) return variant
  }
  return null
}

// Une entrée par série prescrite de la journée, échauffement exclu : c'est la
// granularité à laquelle on note une charge.
export function collectSessionEntries({
  day,
  program,
  dayKey,
  choices,
  byName,
  date,
  done = {},
}) {
  const entries = []
  ;(day.blocks || []).forEach((block, blockIndex) => {
    if (block.kind === 'warmup') return
    const key = blockKey(program.id, dayKey, blockIndex)
    const blockDone = Boolean(done[key])
    ;(block.movements || []).forEach((mov, movIndex) => {
      const movKey = `${key}.m${movIndex}`
      const name = resolveName(mov, movKey, choices)
      const exercise = name ? byName.get(name) : null
      ;(mov.sets || []).forEach((set, setIndex) => {
        const variant = findVariant(exercise, set)
        entries.push({
          id: `${movKey}.s${setIndex}`,
          blockIndex,
          n: block.n ?? null,
          blockDone,
          name: name || mov.title || 'Mouvement',
          exerciseId: exercise ? exercise.id : null,
          reps: set.reps,
          rpe: set.rpe || '',
          point: variant ? variant.history.find((p) => p.date === date) || null : null,
          previous: variant ? previousPoint(variant.history, date) : null,
        })
      })
    })
  })
  return entries
}

// Volume d'une entrée. Exact quand le détail série par série est saisi, estimé
// à partir des séries prescrites sinon — l'estimation est signalée, pour ne
// pas faire passer une déduction pour une mesure.
export function entryVolume(entry) {
  if (!entry.point) return { value: 0, estimated: false }
  if (entry.point.sets) {
    return { value: setsVolume(entry.point.sets), estimated: false }
  }
  const { count, reps } = parsePrescribedSets(entry.reps)
  const each = firstNumber(reps)
  if (each === null) return { value: 0, estimated: true }
  return { value: count * each * entry.point.load, estimated: true }
}

// Totaux de la séance, et volume par exercice pour le graphique du résumé.
export function sessionTotals(entries) {
  let volume = 0
  let estimated = false
  let logged = 0
  let setCount = 0
  const byExercise = new Map()

  for (const entry of entries) {
    if (!entry.point) continue
    logged += 1
    const { value, estimated: isEstimate } = entryVolume(entry)
    volume += value
    if (isEstimate) estimated = true
    setCount += entry.point.sets
      ? entry.point.sets.length
      : parsePrescribedSets(entry.reps).count
    byExercise.set(entry.name, (byExercise.get(entry.name) || 0) + value)
  }

  return {
    volume,
    estimated,
    logged,
    setCount,
    total: entries.length,
    perExercise: [...byExercise]
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value),
  }
}

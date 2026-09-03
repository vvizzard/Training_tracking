import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Moon } from 'lucide-react'
import { blockKey, findProgramDay, PROGRAM_END, PROGRAM_START } from '../program.js'
import { addDays, currentLoad, fmtKg, fmtRpe } from '../utils.js'

// Résout le nom d'exercice retenu pour un mouvement : le choix enregistré s'il
// est encore proposé, sinon la première option, sinon le mouvement unique.
function resolveName(mov, key, choices) {
  if (!mov.choices) return mov.match || null
  const saved = choices[key]
  return saved && mov.choices.includes(saved) ? saved : mov.choices[0]
}

// La déclinaison est cherchée sur le schéma indiqué, puis sur les reps
// affichées : un exercice choisi en remplacement d'un autre n'a pas toujours
// le même libellé de série (« 4 x max » contre « 4 x max prise large »).
function findVariant(exercise, set) {
  if (!exercise) return null
  const candidates = [set.scheme, set.reps].filter(Boolean)
  for (const scheme of candidates) {
    const variant = exercise.variants.find((v) => v.scheme === scheme)
    if (variant) return variant
  }
  return null
}

function SetLine({ set, exercise }) {
  const variant = findVariant(exercise, set)
  const load = variant ? currentLoad(variant.history) : null

  return (
    <div className="prog-set">
      <span className="prog-reps">{set.reps}</span>
      {set.rpe && <span className="prog-rpe">{fmtRpe(set.rpe)}</span>}
      {set.hint && <span className="prog-hint">{set.hint}</span>}
      <span className={'prog-load' + (load === null ? ' empty' : '')}>
        {load === null ? '—' : fmtKg(load)}
      </span>
    </div>
  )
}

function Movement({
  mov,
  keyPrefix,
  movIndex,
  hideTitle,
  byName,
  choices,
  onChoice,
  onOpen,
}) {
  const key = `${keyPrefix}.m${movIndex}`
  const name = resolveName(mov, key, choices)
  const exercise = name ? byName.get(name) : null

  return (
    <div className="prog-mov">
      {(!hideTitle || exercise) && (
        <div className="prog-mov-head">
          {/* Titre masqué quand il répète déjà celui du bloc. */}
          {!hideTitle && <span className="prog-mov-title">{mov.title}</span>}
          {exercise && (
            <button
              type="button"
              className="prog-open"
              onClick={() => onOpen(exercise.id)}
            >
              Ouvrir la fiche
            </button>
          )}
        </div>
      )}

      {mov.choices && (
        <label className="prog-choice">
          <span>Choix</span>
          <select
            value={name || ''}
            onChange={(e) => onChoice(key, e.target.value)}
          >
            {mov.choices.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}

      {!mov.choices && name && name !== mov.title && (
        <p className="prog-alias">Suivi sous « {name} »</p>
      )}

      {name && !exercise && (
        <p className="prog-alias warn">
          « {name} » n’est pas dans ta liste d’exercices.
        </p>
      )}

      {mov.sets.map((set, i) => (
        <SetLine key={i} set={set} exercise={exercise} />
      ))}

      {mov.links && mov.links.length > 0 && (
        <div className="prog-links">
          {mov.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
              <ExternalLink size={12} /> {l.label}
            </a>
          ))}
        </div>
      )}

      {mov.notes && mov.notes.length > 0 && (
        <ul className="prog-notes">
          {mov.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WarmupBlock({ block }) {
  return (
    <section className="card prog-block warmup">
      <h3 className="prog-block-title">
        {block.title}
        {block.rounds && <span className="prog-meta">{block.rounds}</span>}
      </h3>
      {block.intro && <p className="prog-intro">{block.intro}</p>}
      <ul className="prog-warmup-list">
        {block.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {block.rest && <p className="prog-rest">Repos {block.rest} entre les tours</p>}
    </section>
  )
}

function Block({ block, blockIndex, programId, dayKey, ...rest }) {
  if (block.kind === 'warmup') return <WarmupBlock block={block} />

  const key = blockKey(programId, dayKey, blockIndex)
  const label =
    block.title || (block.kind === 'superset' ? 'Superset' : null)

  return (
    <section className={'card prog-block ' + block.kind}>
      <h3 className="prog-block-title">
        {block.n != null && <span className="prog-n">{block.n}</span>}
        {label || block.movements[0]?.title || 'Bloc'}
        {block.rounds && <span className="prog-meta">{block.rounds}</span>}
      </h3>

      {block.movements.map((mov, i) => (
        <Movement
          key={i}
          mov={mov}
          keyPrefix={key}
          movIndex={i}
          hideTitle={!label && block.movements.length === 1}
          {...rest}
        />
      ))}

      {block.rest && <p className="prog-rest">Repos {block.rest}</p>}

      {block.notes && block.notes.length > 0 && (
        <ul className="prog-notes">
          {block.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function ProgramView({
  exercises,
  overrides,
  date,
  onDateChange,
  choices,
  onChoice,
  onOpenExercise,
}) {
  const byName = useMemo(
    () => new Map(exercises.map((e) => [e.name, e])),
    [exercises]
  )
  const found = findProgramDay(date, overrides)

  if (!found) {
    return (
      <p className="empty-state">
        Aucun programme pour cette date. Les deux semaines couvertes vont du{' '}
        {PROGRAM_START.slice(8)}/{PROGRAM_START.slice(5, 7)} au{' '}
        {PROGRAM_END.slice(8)}/{PROGRAM_END.slice(5, 7)}.{' '}
        <button
          type="button"
          className="link-btn"
          onClick={() => onDateChange(PROGRAM_START)}
        >
          Aller au début
        </button>
      </p>
    )
  }

  const { program, dayKey, day } = found

  if (!day) {
    return (
      <div className="prog-rest-day card">
        <Moon size={20} />
        <div>
          <p className="prog-rest-title">Repos</p>
          <p className="prog-rest-sub">
            Le programme suggère lundi, mardi, mercredi, vendredi et samedi.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="prog">
      <section className="card prog-head">
        <h2 className="prog-day-title">
          {day.title}
          {program.source === 'profil' && (
            <span className="prog-badge">profil</span>
          )}
          {program.source === 'import' && (
            <span className="prog-badge">importé</span>
          )}
        </h2>
        {day.focus && <p className="prog-day-focus">{day.focus}</p>}
        {program.focus && <p className="prog-program-focus">{program.focus}</p>}
      </section>

      {day.blocks.map((block, i) => (
        <Block
          key={i}
          block={block}
          blockIndex={i}
          programId={program.id}
          dayKey={dayKey}
          byName={byName}
          choices={choices}
          onChoice={onChoice}
          onOpen={onOpenExercise}
        />
      ))}
    </div>
  )
}

// Barre de navigation par date, affichée dans l'en-tête.
export function ProgramDateNav({ date, onDateChange, overrides }) {
  const found = findProgramDay(date, overrides)
  return (
    <div className="date-nav">
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => onDateChange(addDays(date, -1))}
        aria-label="Jour précédent"
      >
        <ChevronLeft size={18} />
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && onDateChange(e.target.value)}
        aria-label="Date du programme"
      />
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => onDateChange(addDays(date, 1))}
        aria-label="Jour suivant"
      >
        <ChevronRight size={18} />
      </button>
      {found && <span className="date-nav-tag">{found.program.label}</span>}
    </div>
  )
}

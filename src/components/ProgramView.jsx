import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Moon,
  RotateCcw,
} from 'lucide-react'
import { blockKey, findProgramDay, PROGRAM_END, PROGRAM_START } from '../program.js'
import {
  addDays,
  fmtKg,
  fmtRpe,
  loadForDate,
  parseNum,
  RM_SCHEME,
} from '../utils.js'

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
  for (const scheme of [set.scheme, set.reps].filter(Boolean)) {
    const variant = exercise.variants.find((v) => v.scheme === scheme)
    if (variant) return variant
  }
  return null
}

// Saisie d'une charge à la date de la séance affichée : c'est ce jour-là qu'on
// soulève, pas celui où l'on consulte.
function LoadEditor({ value, date, onSave, onCancel }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const [error, setError] = useState('')

  function save(e) {
    e.preventDefault()
    const raw = draft.trim()
    if (raw === '') {
      onSave(null)
      return
    }
    const parsed = parseNum(raw)
    if (parsed === null) {
      setError('Charge invalide.')
      return
    }
    onSave(parsed)
  }

  return (
    <form className="load-editor" onSubmit={save}>
      <input
        autoFocus
        inputMode="decimal"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setError('')
        }}
        placeholder="62,5"
        aria-label={`Charge du ${date}`}
      />
      <button type="submit" className="btn btn-accent btn-icon" aria-label="Enregistrer">
        <Check size={16} />
      </button>
      <button type="button" className="btn btn-icon" onClick={onCancel}>
        Annuler
      </button>
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <p className="hint">Enregistré au {date}. Vider le champ efface le point.</p>
      )}
    </form>
  )
}

// Toutes les déclinaisons de l'exercice et leur charge courante, dépliées sous
// la série : c'est là qu'on voit ce qu'on soulève sur les autres formats.
function VariantList({ exercise, activeVariantId, date, editingId, onEdit, onRecord }) {
  return (
    <div className="prog-variants">
      {exercise.variants.map((v) => {
        const { value: load, logged } = loadForDate(v.history, date)
        const isEditing = editingId === v.id
        return (
          <div
            key={v.id}
            className={
              'prog-variant' + (v.id === activeVariantId ? ' current' : '')
            }
          >
            <div className="prog-variant-row">
              <span className="prog-variant-scheme">
                {v.scheme || 'Sans schéma'}
                {v.scheme === RM_SCHEME && <em className="prog-variant-tag">max</em>}
              </span>
              {v.rpe && <span className="prog-rpe">{fmtRpe(v.rpe)}</span>}
              <button
                type="button"
                className={
                  'prog-load' +
                  (load === null ? ' empty' : logged ? ' logged' : ' carry')
                }
                title={logged ? 'Enregistré ce jour-là' : 'Dernière charge connue'}
                onClick={() => onEdit(isEditing ? null : v.id)}
              >
                {load === null ? '—' : fmtKg(load)}
              </button>
            </div>
            {isEditing && (
              <LoadEditor
                value={load}
                date={date}
                onSave={(next) => {
                  onRecord(exercise.id, v.id, next)
                  onEdit(null)
                }}
                onCancel={() => onEdit(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SetLine({ set, exercise, date, open, onToggle, editingId, onEdit, onRecord }) {
  const variant = findVariant(exercise, set)
  const { value: load, logged } = variant
    ? loadForDate(variant.history, date)
    : { value: null, logged: false }
  const isEditing = variant && editingId === variant.id

  return (
    <div className="prog-set-wrap">
      <div className="prog-set">
        <button
          type="button"
          className="prog-set-main"
          onClick={onToggle}
          disabled={!exercise}
          aria-expanded={open}
        >
          <span className="prog-reps">{set.reps}</span>
          {set.rpe && <span className="prog-rpe">{fmtRpe(set.rpe)}</span>}
          {set.hint && <span className="prog-hint">{set.hint}</span>}
          {exercise && (
            <ChevronDown size={14} className={'prog-caret' + (open ? ' open' : '')} />
          )}
        </button>
        <button
          type="button"
          className={
            'prog-load' +
            (load === null ? ' empty' : logged ? ' logged' : ' carry')
          }
          title={logged ? 'Enregistré ce jour-là' : 'Dernière charge connue'}
          onClick={() => variant && onEdit(isEditing ? null : variant.id)}
          disabled={!variant}
        >
          {load === null ? '—' : fmtKg(load)}
        </button>
      </div>

      {isEditing && (
        <LoadEditor
          value={load}
          date={date}
          onSave={(next) => {
            onRecord(exercise.id, variant.id, next)
            onEdit(null)
          }}
          onCancel={() => onEdit(null)}
        />
      )}

      {open && exercise && (
        <VariantList
          exercise={exercise}
          activeVariantId={variant?.id}
          date={date}
          editingId={editingId}
          onEdit={onEdit}
          onRecord={onRecord}
        />
      )}
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
  date,
  onChoice,
  onOpen,
  onRecord,
}) {
  const key = `${keyPrefix}.m${movIndex}`
  const name = resolveName(mov, key, choices)
  const exercise = name ? byName.get(name) : null
  const [openSet, setOpenSet] = useState(null)
  const [editingId, setEditingId] = useState(null)

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
            onChange={(e) => {
              onChoice(key, e.target.value)
              setOpenSet(null)
              setEditingId(null)
            }}
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
        <SetLine
          key={i}
          set={set}
          exercise={exercise}
          date={date}
          open={openSet === i}
          onToggle={() => {
            setOpenSet(openSet === i ? null : i)
            setEditingId(null)
          }}
          editingId={editingId}
          onEdit={setEditingId}
          onRecord={onRecord}
        />
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

function WarmupBlock({ block, done, onToggleDone }) {
  return (
    <section className={'card prog-block warmup' + (done ? ' is-done' : '')}>
      <h3 className="prog-block-title">
        {done && <Check size={15} className="prog-done-check" />}
        {block.title}
        {!done && block.rounds && <span className="prog-meta">{block.rounds}</span>}
        {done && (
          <button type="button" className="prog-reopen" onClick={onToggleDone}>
            <RotateCcw size={13} /> Rouvrir
          </button>
        )}
      </h3>
      {!done && (
        <>
          {block.intro && <p className="prog-intro">{block.intro}</p>}
          <ul className="prog-warmup-list">
            {block.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          {block.rest && <p className="prog-rest">Repos {block.rest} entre les tours</p>}
          <button type="button" className="btn btn-block prog-done" onClick={onToggleDone}>
            <Check size={15} /> C’est fait
          </button>
        </>
      )}
    </section>
  )
}

function Block({ block, blockIndex, programId, dayKey, done, onToggleDone, ...rest }) {
  const key = blockKey(programId, dayKey, blockIndex)
  const isDone = Boolean(done[key])
  const toggle = () => onToggleDone(key)

  if (block.kind === 'warmup') {
    return <WarmupBlock block={block} done={isDone} onToggleDone={toggle} />
  }

  const label = block.title || (block.kind === 'superset' ? 'Superset' : null)

  return (
    <section className={'card prog-block ' + block.kind + (isDone ? ' is-done' : '')}>
      <h3 className="prog-block-title">
        {isDone ? (
          <Check size={15} className="prog-done-check" />
        ) : (
          block.n != null && <span className="prog-n">{block.n}</span>
        )}
        {label || block.movements[0]?.title || 'Bloc'}
        {!isDone && block.rounds && <span className="prog-meta">{block.rounds}</span>}
        {isDone && (
          <button type="button" className="prog-reopen" onClick={toggle}>
            <RotateCcw size={13} /> Rouvrir
          </button>
        )}
      </h3>

      {!isDone && (
        <>
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

          <button type="button" className="btn btn-block prog-done" onClick={toggle}>
            <Check size={15} /> C’est fait
          </button>
        </>
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
  done,
  onToggleDone,
  onRecordLoad,
}) {
  const byName = useMemo(
    () => new Map(exercises.map((e) => [e.name, e])),
    [exercises]
  )
  const found = findProgramDay(date, overrides)

  if (!found) {
    return (
      <p className="empty-state">
        Aucun programme pour cette date. Les deux semaines intégrées vont du{' '}
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
          {program.source === 'profil' && <span className="prog-badge">profil</span>}
          {program.source === 'import' && <span className="prog-badge">importé</span>}
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
          done={done}
          onToggleDone={onToggleDone}
          byName={byName}
          choices={choices}
          date={date}
          onChoice={onChoice}
          onOpen={onOpenExercise}
          onRecord={onRecordLoad}
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

import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FlagTriangleRight,
  ListChecks,
  Moon,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  blockKey,
  dayProgress,
  findProgramDay,
  nearestSessionDate,
} from '../program.js'
import { collectSessionEntries, findVariant, resolveName } from '../session.js'
import SessionSummary from './SessionSummary.jsx'
import {
  addDays,
  firstNumber,
  fmtDateShort,
  fmtKg,
  fmtRpe,
  fmtSigned,
  fmtVolume,
  loadForDate,
  parseNum,
  parsePrescribedSets,
  previousPoint,
  RM_SCHEME,
  setsLoad,
  setsVolume,
  startOfWeek,
  todayISO,
  WEEKDAY_LETTERS,
} from '../utils.js'

// Détail série par série : une ligne par série faite, avec ses reps réelles et
// sa charge. Il se déplie à la demande — la saisie rapide d'une seule charge
// reste le geste par défaut.
function SetSplit({ set, point, date, onSave, onClear }) {
  const prescribed = parsePrescribedSets(set.reps)
  const suggestedReps = firstNumber(prescribed.reps)

  const [rows, setRows] = useState(() => {
    if (point && point.sets) {
      return point.sets.map((s) => ({
        reps: s.reps === null ? '' : String(s.reps),
        load: s.load === null ? '' : String(s.load),
      }))
    }
    // Première ouverture : autant de lignes que de séries prescrites, remplies
    // des reps conseillées et de la charge déjà notée s'il y en a une.
    const load = point && Number.isFinite(point.load) ? String(point.load) : ''
    return Array.from({ length: prescribed.count }, () => ({
      reps: suggestedReps === null ? '' : String(suggestedReps),
      load,
    }))
  })

  // Chaque frappe est enregistrée : en salle, il n'y a pas de bouton de
  // validation à oublier.
  function commit(next) {
    setRows(next)
    const sets = next.map((r) => ({ reps: parseNum(r.reps), load: parseNum(r.load) }))
    const filled = sets.filter((s) => s.reps !== null || s.load !== null)
    if (!filled.length) {
      onClear()
      return
    }
    onSave(setsLoad(sets), sets)
  }

  const edit = (i, field, value) =>
    commit(rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)))

  const sets = rows.map((r) => ({ reps: parseNum(r.reps), load: parseNum(r.load) }))
  const heaviest = setsLoad(sets)
  const volume = setsVolume(sets)

  return (
    <div className="split">
      <div className="split-head">
        <span className="split-col-n">Série</span>
        <span className="split-col">Reps</span>
        <span className="split-col">Charge</span>
        <span className="split-col-x" />
      </div>

      {rows.map((row, i) => (
        <div className="split-row" key={i}>
          <span className="split-n">{i + 1}</span>
          <input
            inputMode="numeric"
            value={row.reps}
            onChange={(e) => edit(i, 'reps', e.target.value)}
            placeholder={suggestedReps === null ? 'reps' : String(suggestedReps)}
            aria-label={`Reps de la série ${i + 1}`}
          />
          <input
            inputMode="decimal"
            value={row.load}
            onChange={(e) => edit(i, 'load', e.target.value)}
            placeholder="kg"
            aria-label={`Charge de la série ${i + 1}`}
          />
          {rows.length > 1 ? (
            <button
              type="button"
              className="split-x"
              onClick={() => commit(rows.filter((_, j) => j !== i))}
              aria-label={`Retirer la série ${i + 1}`}
            >
              <X size={14} />
            </button>
          ) : (
            <span className="split-col-x" />
          )}
        </div>
      ))}

      <div className="split-foot">
        <button
          type="button"
          className="split-add"
          onClick={() =>
            commit([...rows, { reps: '', load: rows[rows.length - 1]?.load || '' }])
          }
        >
          <Plus size={14} /> Série
        </button>
        {heaviest !== null && (
          <span className="split-total">
            {fmtKg(heaviest)} retenu{volume > 0 && ` · ${fmtVolume(volume)}`}
          </span>
        )}
      </div>

      <p className="hint">
        Enregistré au {date}. La charge retenue pour la courbe est la plus lourde
        des séries.
      </p>
    </div>
  )
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

// Repère sous la série : ce qui a été soulevé la fois précédente, et l'écart
// avec la charge du jour quand elle est notée. C'est la seule information qui
// dit si la séance progresse.
function SetReference({ previous, load, logged }) {
  if (!previous) return null
  if (!logged) {
    return (
      <p className="prog-prev">dernière fois le {fmtDateShort(previous.date)}</p>
    )
  }
  const delta = load - previous.load
  const tone = delta > 0 ? ' up' : delta < 0 ? ' down' : ''
  return (
    <p className="prog-prev">
      dernière fois {fmtKg(previous.load)}
      <span className={'prog-delta' + tone}>{fmtSigned(delta)}kg</span>
    </p>
  )
}

function SetLine({ set, exercise, date, open, onToggle, editingId, onEdit, onRecord }) {
  const variant = findVariant(exercise, set)
  const { value: load, logged } = variant
    ? loadForDate(variant.history, date)
    : { value: null, logged: false }
  const previous = variant ? previousPoint(variant.history, date) : null
  const point = variant ? variant.history.find((p) => p.date === date) || null : null
  const isEditing = variant && editingId === variant.id
  const [splitOpen, setSplitOpen] = useState(false)
  const detailed = Boolean(point && point.sets)

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
          /* Une fois le détail saisi, la charge en est déduite : la toucher
             rouvre le détail plutôt qu'un champ qui l'écraserait. */
          onClick={() =>
            detailed
              ? setSplitOpen(!splitOpen)
              : variant && onEdit(isEditing ? null : variant.id)
          }
          disabled={!variant}
        >
          {load === null ? '—' : fmtKg(load)}
        </button>
      </div>

      {!isEditing && (
        <div className="prog-set-foot">
          {variant && (
            <button
              type="button"
              className={'split-toggle' + (detailed ? ' on' : '')}
              onClick={() => {
                setSplitOpen(!splitOpen)
                onEdit(null)
              }}
              aria-expanded={splitOpen}
            >
              <ListChecks size={13} />
              {detailed
                ? `${point.sets.length} série${point.sets.length > 1 ? 's' : ''}`
                : 'Détail'}
            </button>
          )}
          <SetReference previous={previous} load={load} logged={logged} />
        </div>
      )}

      {splitOpen && variant && (
        <SetSplit
          /* Changer de jour ou d'exercice repart du détail de cette date. */
          key={`${variant.id}:${date}`}
          set={set}
          point={point}
          date={date}
          onSave={(next, sets) => onRecord(exercise.id, variant.id, next, sets)}
          onClear={() => onRecord(exercise.id, variant.id, null)}
        />
      )}

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

// Le programme laisse souvent le choix entre plusieurs exercices. Le nom
// retenu tient lieu de titre : le bloc annonce ce qu'on va vraiment faire, et
// non l'intitulé générique du programme.
function ChoiceButton({ name, open, onToggle }) {
  return (
    <button
      type="button"
      className="prog-picker"
      onClick={onToggle}
      aria-expanded={open}
    >
      <span className="prog-picker-name">{name}</span>
      <ChevronDown size={14} className={'prog-caret' + (open ? ' open' : '')} />
    </button>
  )
}

function ChoiceList({ options, name, onPick }) {
  return (
    <div className="prog-picker-list" role="radiogroup" aria-label="Exercice retenu">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === name}
          className={'prog-picker-opt' + (option === name ? ' current' : '')}
          onClick={() => onPick(option)}
        >
          <Check size={14} className="prog-picker-check" />
          {option}
        </button>
      ))}
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
  const [pickerOpen, setPickerOpen] = useState(false)

  // Quand le titre est masqué, c'est le bloc qui porte le sélecteur : il ne
  // faut pas l'afficher deux fois.
  const ownPicker = Boolean(mov.choices) && !hideTitle

  return (
    <div className="prog-mov">
      {(!hideTitle || exercise) && (
        <div className="prog-mov-head">
          {/* Titre masqué quand il répète déjà celui du bloc. */}
          {ownPicker ? (
            <ChoiceButton
              name={name}
              open={pickerOpen}
              onToggle={() => setPickerOpen(!pickerOpen)}
            />
          ) : (
            !hideTitle && <span className="prog-mov-title">{mov.title}</span>
          )}
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

      {ownPicker && pickerOpen && (
        <ChoiceList
          options={mov.choices}
          name={name}
          onPick={(option) => {
            onChoice(key, option)
            setPickerOpen(false)
            setOpenSet(null)
            setEditingId(null)
          }}
        />
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

function Block({
  block,
  blockIndex,
  programId,
  dayKey,
  done,
  onToggleDone,
  choices,
  onChoice,
  ...rest
}) {
  const key = blockKey(programId, dayKey, blockIndex)
  const isDone = Boolean(done[key])
  const toggle = () => onToggleDone(key)
  const [pickerOpen, setPickerOpen] = useState(false)

  if (block.kind === 'warmup') {
    return <WarmupBlock block={block} done={isDone} onToggleDone={toggle} />
  }

  const label = block.title || (block.kind === 'superset' ? 'Superset' : null)
  // Le titre du bloc reprend celui de son mouvement unique : c'est donc lui
  // qui porte le sélecteur, pour n'afficher le nom qu'une fois.
  const hideTitle = !label && block.movements.length === 1
  const pickerMov = hideTitle && block.movements[0].choices ? block.movements[0] : null
  const pickerKey = `${key}.m0`
  const pickerName = pickerMov ? resolveName(pickerMov, pickerKey, choices) : null

  return (
    <section className={'card prog-block ' + block.kind + (isDone ? ' is-done' : '')}>
      <h3 className="prog-block-title">
        {isDone ? (
          <Check size={15} className="prog-done-check" />
        ) : (
          block.n != null && <span className="prog-n">{block.n}</span>
        )}
        {pickerMov && !isDone ? (
          <ChoiceButton
            name={pickerName}
            open={pickerOpen}
            onToggle={() => setPickerOpen(!pickerOpen)}
          />
        ) : (
          pickerName || label || block.movements[0]?.title || 'Bloc'
        )}
        {!isDone && block.rounds && <span className="prog-meta">{block.rounds}</span>}
        {isDone && (
          <button type="button" className="prog-reopen" onClick={toggle}>
            <RotateCcw size={13} /> Rouvrir
          </button>
        )}
      </h3>

      {pickerMov && pickerOpen && !isDone && (
        <ChoiceList
          options={pickerMov.choices}
          name={pickerName}
          onPick={(option) => {
            onChoice(pickerKey, option)
            setPickerOpen(false)
          }}
        />
      )}

      {!isDone && (
        <>
          {block.movements.map((mov, i) => (
            <Movement
              /* La clé inclut le nom retenu : changer d'exercice remonte le
                 mouvement, et remet à zéro sa saisie en cours. */
              key={`${i}:${pickerName || ''}`}
              mov={mov}
              keyPrefix={key}
              movIndex={i}
              hideTitle={hideTitle}
              choices={choices}
              onChoice={onChoice}
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
  session,
  onFinish,
  onReopen,
}) {
  const byName = useMemo(
    () => new Map(exercises.map((e) => [e.name, e])),
    [exercises]
  )
  const found = findProgramDay(date, overrides)

  if (!found) {
    const nearest = nearestSessionDate(date, overrides)
    return (
      <p className="empty-state">
        Aucun programme pour cette date.{' '}
        {nearest && (
          <button
            type="button"
            className="link-btn"
            onClick={() => onDateChange(nearest)}
          >
            Aller à la séance du {fmtDateShort(nearest)}
          </button>
        )}
      </p>
    )
  }

  const { program, dayKey, day } = found
  const progress = dayProgress(found, done)

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

  // Une séance terminée se consulte en résumé ; « Modifier » ramène ici.
  if (session) {
    return (
      <SessionSummary
        day={day}
        date={date}
        finishedAt={session.at}
        progress={progress}
        entries={collectSessionEntries({
          day,
          program,
          dayKey,
          choices,
          byName,
          date,
          done,
        })}
        onEdit={onReopen}
        onOpenExercise={onOpenExercise}
      />
    )
  }

  const remaining = progress ? progress.total - progress.count : 0

  return (
    <div className="prog">
      <section className="card prog-head">
        <h2 className="prog-day-title">
          {day.title}
          {program.source === 'profil' && <span className="prog-badge">profil</span>}
          {program.source === 'import' && <span className="prog-badge">importé</span>}
          {progress && (
            <span
              className={
                'prog-count' + (progress.count === progress.total ? ' full' : '')
              }
            >
              {progress.count}/{progress.total}
            </span>
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

      {/* Terminer n'exige pas d'avoir tout fait : ce qui reste est annoncé,
          pas bloquant, et la séance se rouvre depuis son résumé. */}
      <button type="button" className="btn btn-block prog-finish" onClick={onFinish}>
        <FlagTriangleRight size={16} /> Terminer la séance
        {remaining > 0 && (
          <span className="prog-finish-rest">
            {remaining} bloc{remaining > 1 ? 's' : ''} non fait
            {remaining > 1 ? 's' : ''}
          </span>
        )}
      </button>
    </div>
  )
}

// État d'un jour dans la barre de semaine : rien, repos, séance, séance faite.
// Une séance terminée compte comme faite même si des blocs sont restés ouverts.
function weekDayState(iso, overrides, done, sessions) {
  const found = findProgramDay(iso, overrides)
  if (!found) return 'none'
  if (!found.day) return 'rest'
  if (sessions[iso]) return 'done'
  const progress = dayProgress(found, done)
  return progress && progress.count === progress.total ? 'done' : 'session'
}

// Barre de semaine, affichée dans l'en-tête : les jours d'entraînement, les
// jours de repos et les séances déjà faites se lisent d'un coup d'œil, et on
// change de jour d'un seul geste.
export function ProgramDateNav({
  date,
  onDateChange,
  overrides,
  done = {},
  sessions = {},
}) {
  const monday = startOfWeek(date)
  const today = todayISO()

  return (
    <div className="week-strip">
      <button
        type="button"
        className="btn btn-icon week-arrow"
        onClick={() => onDateChange(addDays(monday, -7))}
        aria-label="Semaine précédente"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="week-days">
        {WEEKDAY_LETTERS.map((letter, i) => {
          const iso = addDays(monday, i)
          const state = weekDayState(iso, overrides, done, sessions)
          return (
            <button
              key={iso}
              type="button"
              className={
                'week-day ' +
                state +
                (iso === date ? ' selected' : '') +
                (iso === today ? ' today' : '')
              }
              onClick={() => onDateChange(iso)}
              aria-current={iso === date ? 'date' : undefined}
              aria-label={iso}
            >
              <span className="week-day-letter">{letter}</span>
              <span className="week-day-num">{Number(iso.slice(8, 10))}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="btn btn-icon week-arrow"
        onClick={() => onDateChange(addDays(monday, 7))}
        aria-label="Semaine suivante"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

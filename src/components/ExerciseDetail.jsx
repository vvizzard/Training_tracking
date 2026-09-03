import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft, Check, Plus, Trash2, X } from 'lucide-react'
import {
  currentLoad,
  declinations,
  fmtDateLong,
  fmtDateShort,
  fmtKg,
  fmtNum,
  fmtRpe,
  fmtSigned,
  loadDelta,
  newId,
  parseNum,
  rmValue,
  sortHistory,
  todayISO,
  upsertPoint,
  ZONES,
} from '../utils.js'

const ACCENT = '#4ade80'
const DIM = '#586070'

function ChartTooltip({ active, payload, label, variants }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="tooltip">
      <div className="tooltip-date">{fmtDateLong(label)}</div>
      {payload.map((p) => {
        const variant = variants.find((v) => v.id === p.dataKey)
        return (
          <div className="tooltip-row" key={p.dataKey}>
            <span className="tooltip-scheme">
              {variant?.scheme || 'Format'}
              {variant?.rpe ? ` · ${fmtRpe(variant.rpe)}` : ''}
            </span>
            <span className="tooltip-load" style={{ color: p.stroke }}>
              {fmtKg(p.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ExerciseDetail({ exercise, onBack, onUpdate, onDelete }) {
  const [activeId, setActiveId] = useState(exercise.variants[0].id)
  const [noteDraft, setNoteDraft] = useState(exercise.note || '')
  const [date, setDate] = useState(todayISO())
  const [load, setLoad] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [newScheme, setNewScheme] = useState('')
  const [newRpe, setNewRpe] = useState('')
  const [newLoad, setNewLoad] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Si on change d'exercice, on resynchronise les brouillons.
  useEffect(() => {
    setActiveId(exercise.variants[0].id)
    setNoteDraft(exercise.note || '')
    setAdding(false)
    setConfirmDelete(false)
  }, [exercise.id])

  const principal = exercise.variants[0]
  const active =
    exercise.variants.find((v) => v.id === activeId) || principal
  const isPrincipal = active.id === principal.id
  const rm = rmValue(exercise)
  const [schemeDraft, setSchemeDraft] = useState(active.scheme)
  const [rpeDraft, setRpeDraft] = useState(active.rpe || '')

  useEffect(() => {
    setSchemeDraft(active.scheme)
    setRpeDraft(active.rpe || '')
  }, [active.id, active.scheme, active.rpe])

  const history = useMemo(() => sortHistory(active.history), [active.history])
  const current = currentLoad(active.history)
  const delta = loadDelta(active.history)

  // Une ligne par format : on fusionne tous les points sur un axe de dates commun.
  const chartData = useMemo(() => {
    const byDate = new Map()
    exercise.variants.forEach((v) => {
      v.history.forEach((p) => {
        if (!byDate.has(p.date)) byDate.set(p.date, { date: p.date })
        byDate.get(p.date)[v.id] = p.load
      })
    })
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [exercise.variants])

  function updateVariant(id, patch) {
    onUpdate({
      variants: exercise.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    })
  }

  function addPoint(e) {
    e.preventDefault()
    const value = parseNum(load)
    if (!date) {
      setError('Choisis une date.')
      return
    }
    if (value === null) {
      setError('Saisis une charge valide.')
      return
    }
    updateVariant(active.id, { history: upsertPoint(active.history, date, value) })
    setLoad('')
    setError('')
  }

  function removePoint(pointDate) {
    updateVariant(active.id, {
      history: active.history.filter((p) => p.date !== pointDate),
    })
  }

  function addVariant(e) {
    e.preventDefault()
    const startLoad = parseNum(newLoad)
    const variant = {
      id: newId('v'),
      scheme: newScheme.trim(),
      rpe: newRpe.trim(),
      history: startLoad === null ? [] : [{ date: todayISO(), load: startLoad }],
    }
    onUpdate({ variants: [...exercise.variants, variant] })
    setActiveId(variant.id)
    setNewScheme('')
    setNewRpe('')
    setNewLoad('')
    setAdding(false)
  }

  function removeVariant() {
    const rest = exercise.variants.filter((v) => v.id !== active.id)
    onUpdate({ variants: rest })
    setActiveId(rest[0].id)
  }

  return (
    <div className="detail">
      <header className="header">
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={onBack}
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="detail-title">
          <h1>{exercise.name}</h1>
          <p className="subtitle">
            {exercise.zone} · RM {rm === null ? '—' : `${fmtNum(rm)} kg`}
            {declinations(exercise).length > 0 &&
              ` · ${declinations(exercise).length} déclinaison${
                declinations(exercise).length > 1 ? 's' : ''
              }`}
          </p>
        </div>
      </header>

      <div className="detail-grid">
        <section className="card span-2">
          <h2 className="card-title">
            Formats{' '}
            <span className="card-title-tag">· principal + déclinaisons</span>
          </h2>

          <div className="variant-bar" role="tablist" aria-label="Formats">
            {exercise.variants.map((v) => {
              const vLoad = currentLoad(v.history)
              const isActive = v.id === active.id
              const isMain = v.id === principal.id
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={isMain ? 'Format principal' : undefined}
                  className={
                    'variant-tab' +
                    (isActive ? ' active' : '') +
                    (isMain ? ' principal' : '')
                  }
                  onClick={() => setActiveId(v.id)}
                >
                  <span className="variant-scheme">
                    {v.scheme || 'Sans schéma'}
                    {v.rpe && <em className="variant-rpe">{fmtRpe(v.rpe)}</em>}
                  </span>
                  <span className="variant-load">
                    {vLoad === null ? '—' : fmtKg(vLoad)}
                  </span>
                </button>
              )
            })}

            <button
              type="button"
              className={'variant-add' + (adding ? ' open' : '')}
              onClick={() => setAdding((v) => !v)}
              aria-label={
                adding ? 'Annuler l’ajout' : 'Ajouter une déclinaison'
              }
            >
              {adding ? <X size={16} /> : <Plus size={16} />}
            </button>
          </div>

          {adding && (
            <form onSubmit={addVariant} className="variant-form">
              <label className="field">
                <span>Schéma de reps</span>
                <input
                  autoFocus
                  value={newScheme}
                  onChange={(e) => setNewScheme(e.target.value)}
                  placeholder="3x12-15"
                />
              </label>
              <label className="field">
                <span>RPE</span>
                <input
                  value={newRpe}
                  onChange={(e) => setNewRpe(e.target.value)}
                  placeholder="8"
                />
              </label>
              <label className="field">
                <span>Charge (kg)</span>
                <input
                  inputMode="decimal"
                  value={newLoad}
                  onChange={(e) => setNewLoad(e.target.value)}
                  placeholder="55"
                />
              </label>
              <button type="submit" className="btn btn-accent">
                Ajouter
              </button>
            </form>
          )}

          <div className="stats">
            <div className="stat">
              <span className="stat-label">Charge actuelle</span>
              <span className="stat-value accent">
                {current === null ? '—' : fmtKg(current)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">RM</span>
              <span className="stat-value">
                {rm === null ? '—' : `${fmtNum(rm)} kg`}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Progression</span>
              <span
                className={
                  'stat-value ' +
                  (delta === null
                    ? ''
                    : delta > 0
                      ? 'accent'
                      : delta < 0
                        ? 'danger'
                        : '')
                }
              >
                {delta === null ? '—' : `${fmtSigned(delta)} kg`}
              </span>
            </div>
          </div>
        </section>

        <section className="card span-2">
          <h2 className="card-title">Évolution</h2>
          {chartData.length === 0 ? (
            <p className="empty-state">Aucune donnée pour le moment.</p>
          ) : (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                >
                  <CartesianGrid stroke="#2a2e37" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDateShort}
                    stroke="#8b9099"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2e37' }}
                  />
                  <YAxis
                    stroke="#8b9099"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2e37' }}
                    width={44}
                    domain={[
                      (min) => Math.max(0, Math.floor(min - 5)),
                      (max) => Math.ceil(max + 5),
                    ]}
                  />
                  <Tooltip
                    cursor={{ stroke: '#2a2e37' }}
                    content={(props) => (
                      <ChartTooltip {...props} variants={exercise.variants} />
                    )}
                  />
                  {/* Format sélectionné en vert, les autres en gris pour rester lisibles. */}
                  {exercise.variants.map((v) => {
                    const isActive = v.id === active.id
                    return (
                      <Line
                        key={v.id}
                        type="monotone"
                        dataKey={v.id}
                        name={v.scheme}
                        stroke={isActive ? ACCENT : DIM}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        dot={
                          isActive ? { r: 3, fill: ACCENT, stroke: ACCENT } : { r: 2 }
                        }
                        activeDot={{ r: 5 }}
                        connectNulls
                        isAnimationActive={false}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">
            Ajouter une charge{' '}
            <span className="card-title-tag">
              · {active.scheme || 'format courant'}
              {active.rpe ? ` ${fmtRpe(active.rpe)}` : ''}
            </span>
          </h2>
          <form onSubmit={addPoint} className="form">
            <div className="field-row">
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Charge (kg)</span>
                <input
                  inputMode="decimal"
                  value={load}
                  onChange={(e) => {
                    setLoad(e.target.value)
                    setError('')
                  }}
                  placeholder="62,5"
                />
              </label>
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn btn-accent btn-block">
              Enregistrer le point
            </button>
            <p className="hint">
              Une date = un point. Ressaisir la même date écrase la valeur.
            </p>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">Réglages</h2>
          <div className="form">
            <label className="field">
              <span>Zone</span>
              <select
                value={exercise.zone}
                onChange={(e) => onUpdate({ zone: e.target.value })}
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Note</span>
              <div className="field-inline">
                <input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="par haltère"
                />
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => onUpdate({ note: noteDraft.trim() })}
                  aria-label="Enregistrer la note"
                >
                  <Check size={16} />
                </button>
              </div>
            </label>

            <label className="field">
              <span>
                {isPrincipal
                  ? 'Libellé du format principal'
                  : 'Schéma et RPE de la déclinaison'}
              </span>
              <div className="field-inline">
                <input
                  value={schemeDraft}
                  onChange={(e) => setSchemeDraft(e.target.value)}
                  placeholder="4x8-10"
                />
                <input
                  className="rpe-input"
                  value={rpeDraft}
                  onChange={(e) => setRpeDraft(e.target.value)}
                  placeholder="RPE 8"
                  aria-label="RPE"
                />
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() =>
                    updateVariant(active.id, {
                      scheme: schemeDraft.trim(),
                      rpe: rpeDraft.trim(),
                    })
                  }
                  aria-label="Enregistrer le schéma et le RPE"
                >
                  <Check size={16} />
                </button>
              </div>
              <p className="hint">
                RPE libre : « 8 », « 9-10 », ou « Échec » / « Dur ».
              </p>
            </label>

            {isPrincipal ? (
              <p className="hint">
                Le RM est le format principal de l&apos;exercice : il ne peut pas être
                supprimé. Mets-le à jour en enregistrant une charge datée.
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-block danger"
                onClick={removeVariant}
              >
                <Trash2 size={15} /> Supprimer cette déclinaison
              </button>
            )}
          </div>
        </section>

        <section className="card span-2">
          <h2 className="card-title">
            Historique{' '}
            <span className="card-title-tag">
              · {active.scheme || 'format courant'}
              {active.rpe ? ` ${fmtRpe(active.rpe)}` : ''}
            </span>
          </h2>
          {history.length === 0 ? (
            <p className="empty-state">Aucun point enregistré.</p>
          ) : (
            <ul className="history">
              {[...history].reverse().map((p) => (
                <li key={p.date} className="history-item">
                  <span className="history-date">{fmtDateLong(p.date)}</span>
                  <span className="history-load">{fmtKg(p.load)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon danger"
                    onClick={() => removePoint(p.date)}
                    aria-label={`Supprimer le point du ${fmtDateLong(p.date)}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card span-2">
          {confirmDelete ? (
            <div className="form">
              <p className="confirm-text">
                Supprimer « {exercise.name} », son RM, ses{' '}
                {declinations(exercise).length} déclinaison
                {declinations(exercise).length > 1 ? 's' : ''} et tout leur
                historique ?
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfirmDelete(false)}
                >
                  Annuler
                </button>
                <button type="button" className="btn btn-danger" onClick={onDelete}>
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-block danger"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} /> Supprimer cet exercice
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

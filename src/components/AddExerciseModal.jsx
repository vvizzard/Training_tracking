import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { DEFAULT_ZONE, newId, parseNum, RM_SCHEME, todayISO, ZONES } from '../utils.js'

export default function AddExerciseModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [rm, setRm] = useState('')
  const [note, setNote] = useState('')
  const [zone, setZone] = useState(DEFAULT_ZONE)
  const [rows, setRows] = useState([{ scheme: '', load: '' }])
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function setRow(index, patch) {
    setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Le nom est requis.')
      return
    }

    const date = todayISO()
    const rmLoad = parseNum(rm)
    // Le RM est le format principal, toujours en tête de liste.
    const principal = {
      id: newId('v'),
      scheme: RM_SCHEME,
      history: rmLoad === null ? [] : [{ date, load: rmLoad }],
    }
    const declinations = rows
      .filter((r) => r.scheme.trim() !== '' || parseNum(r.load) !== null)
      .map((r) => {
        const startLoad = parseNum(r.load)
        return {
          id: newId('v'),
          scheme: r.scheme.trim(),
          history: startLoad === null ? [] : [{ date, load: startLoad }],
        }
      })

    onSubmit({
      name: trimmed,
      zone,
      note: note.trim(),
      variants: [principal, ...declinations],
    })
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter un exercice"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Nouvel exercice</h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="field-row">
            <label className="field">
              <span>Nom *</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="Bench Press"
              />
            </label>
            <label className="field field-narrow">
              <span>RM (kg)</span>
              <input
                inputMode="decimal"
                value={rm}
                onChange={(e) => setRm(e.target.value)}
                placeholder="95"
              />
            </label>
          </div>

          <label className="field">
            <span>Zone</span>
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Déclinaisons (schéma de reps et charge)</span>
            {rows.map((row, i) => (
              <div className="variant-row" key={i}>
                <input
                  value={row.scheme}
                  onChange={(e) => setRow(i, { scheme: e.target.value })}
                  placeholder={i === 0 ? '4x8-10' : '3x12-15'}
                  aria-label={`Schéma de la déclinaison ${i + 1}`}
                />
                <input
                  className="variant-load-input"
                  inputMode="decimal"
                  value={row.load}
                  onChange={(e) => setRow(i, { load: e.target.value })}
                  placeholder={i === 0 ? '60' : '55'}
                  aria-label={`Charge de la déclinaison ${i + 1}`}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon danger"
                  onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                  disabled={rows.length === 1}
                  aria-label={`Retirer la déclinaison ${i + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-block btn-subtle"
              onClick={() => setRows((list) => [...list, { scheme: '', load: '' }])}
            >
              <Plus size={15} /> Ajouter une déclinaison
            </button>
          </div>

          <label className="field">
            <span>Note</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="par haltère"
            />
          </label>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-accent">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

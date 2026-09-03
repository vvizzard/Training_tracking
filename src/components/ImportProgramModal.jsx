import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, FileJson, Trash2, Upload, X } from 'lucide-react'
import { EXAMPLE, parseImport, unknownExercises } from '../programImport.js'
import { fmtDateWeekday } from '../utils.js'

export default function ImportProgramModal({
  exercises,
  imported,
  onClose,
  onImport,
  onRemove,
}) {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [showExample, setShowExample] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const names = useMemo(() => new Set(exercises.map((e) => e.name)), [exercises])

  function check(value) {
    const raw = value.trim()
    if (!raw) {
      setResult(null)
      return
    }
    const parsed = parseImport(raw)
    setResult({
      ...parsed,
      missing: parsed.programs.map((p) => unknownExercises(p, names)),
    })
  }

  function onFile(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      setText(value)
      check(value)
    }
    reader.onerror = () =>
      setResult({ programs: [], errors: ['Lecture du fichier impossible.'], missing: [] })
    reader.readAsText(file)
  }

  const ok = result && result.programs.length > 0 && result.errors.length === 0

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-label="Importer un programme"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Importer un programme</h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="form">
          <p className="hint">
            Une journée par entrée, avec sa date : un seul jour, une semaine ou un
            mois entier s’importent de la même façon. Les dates absentes sont des
            jours de repos.
          </p>

          <div className="import-actions">
            <button
              type="button"
              className="btn btn-subtle"
              onClick={() => fileRef.current?.click()}
            >
              <FileJson size={15} /> Choisir un fichier .json
            </button>
            <button
              type="button"
              className="btn btn-subtle"
              onClick={() => setShowExample((v) => !v)}
            >
              {showExample ? 'Masquer' : 'Voir'} le format attendu
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              hidden
            />
          </div>

          {showExample && (
            <pre className="import-example">{EXAMPLE}</pre>
          )}

          <label className="field">
            <span>Ou coller le JSON</span>
            <textarea
              className="import-textarea"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                check(e.target.value)
              }}
              placeholder='{ "label": "Bloc 8 · semaine 1/4", "days": [ … ] }'
              spellCheck="false"
            />
          </label>

          {result && result.errors.length > 0 && (
            <div className="import-errors">
              <p className="import-errors-title">
                <AlertTriangle size={14} /> {result.errors.length} problème
                {result.errors.length > 1 ? 's' : ''} à corriger
              </p>
              <ul>
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {ok && (
            <div className="import-preview">
              {result.programs.map((p, i) => (
                <div key={p.id} className="import-prog">
                  <p className="import-prog-label">
                    <Check size={14} /> {p.label}
                  </p>
                  <p className="import-prog-meta">
                    {p.days.filter((d) => !d.rest).length} séance
                    {p.days.filter((d) => !d.rest).length > 1 ? 's' : ''} sur{' '}
                    {p.days.length} jour{p.days.length > 1 ? 's' : ''} · du{' '}
                    {fmtDateWeekday(p.start)} au {fmtDateWeekday(p.end)}
                  </p>
                  {result.missing[i].length > 0 && (
                    <p className="import-prog-warn">
                      <AlertTriangle size={13} /> Exercices absents de ta liste,
                      donc sans charge : {result.missing[i].join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn btn-accent btn-block"
            disabled={!ok}
            onClick={() => onImport(result.programs)}
          >
            <Upload size={15} />{' '}
            {ok && result.programs.length > 1
              ? `Importer les ${result.programs.length} programmes`
              : 'Importer'}
          </button>

          {imported.length > 0 && (
            <div className="field">
              <span>Programmes déjà importés</span>
              <ul className="import-list">
                {imported.map((p) => (
                  <li key={p.id}>
                    <div className="import-list-text">
                      <span className="import-list-label">{p.label}</span>
                      <span className="import-list-meta">
                        {p.start} → {p.end} · {p.days.length} jour
                        {p.days.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon danger"
                      onClick={() => onRemove(p.id)}
                      aria-label={`Supprimer ${p.label}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="hint">
                Un programme importé prend la main sur le programme intégré aux
                mêmes dates. Le plus récemment importé gagne en cas de
                chevauchement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

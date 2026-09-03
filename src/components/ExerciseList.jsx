import {
  currentLoad,
  declinations,
  fmtKg,
  fmtNum,
  fmtRpe,
  rmValue,
} from '../utils.js'

function ExerciseRow({ exercise, onSelect }) {
  const rm = rmValue(exercise)
  const others = declinations(exercise)

  return (
    <button type="button" className="row" onClick={() => onSelect(exercise.id)}>
      <div className="row-top">
        <span className="row-name">{exercise.name}</span>
        <span className={'row-rm' + (rm === null ? ' empty' : '')}>
          <span className="rm-label">RM</span>
          <b>{rm === null ? '—' : fmtNum(rm)}</b>
          {rm !== null && <span className="rm-unit">kg</span>}
        </span>
      </div>

      {exercise.note && <p className="row-note">{exercise.note}</p>}

      {others.length > 0 && (
        <div className="row-variants">
          {others.map((v) => {
            const load = currentLoad(v.history)
            return (
              <span className="chip" key={v.id}>
                {v.scheme && <span className="chip-scheme">{v.scheme}</span>}
                {v.rpe && <span className="chip-rpe">{fmtRpe(v.rpe)}</span>}
                {v.scheme && <span className="chip-sep">:</span>}
                <span className={'chip-load' + (load === null ? ' empty' : '')}>
                  {load === null ? '—' : fmtKg(load)}
                </span>
              </span>
            )
          })}
        </div>
      )}
    </button>
  )
}

export default function ExerciseList({ groups, onSelect }) {
  if (!groups.length) {
    return (
      <p className="empty-state">
        Aucun exercice ne correspond. Essaie un autre mot, ou utilise le bouton +
        pour en créer un.
      </p>
    )
  }

  return (
    <div className="zones">
      {groups.map(({ zone, items }) => (
        <section className="zone" key={zone}>
          <h2 className="zone-title">
            {zone}
            <span className="zone-count">{items.length}</span>
          </h2>
          <div className="list">
            {items.map((e) => (
              <ExerciseRow key={e.id} exercise={e} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

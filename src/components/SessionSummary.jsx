import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Pencil } from 'lucide-react'
import { sessionTotals } from '../session.js'
import {
  fmtClock,
  fmtDateWeekday,
  fmtKg,
  fmtNum,
  fmtRpe,
  fmtSigned,
  fmtVolume,
} from '../utils.js'

const ACCENT = '#4ade80'
const DIM = '#2f6b45'

// Le détail série par série, repris tel qu'il a été saisi : « 8 × 60kg ».
function SetChips({ sets }) {
  return (
    <div className="recap-chips">
      {sets.map((s, i) => (
        <span className="recap-chip" key={i}>
          {s.reps === null ? '—' : fmtNum(s.reps)}
          <em>×</em>
          {s.load === null ? '—' : fmtNum(s.load)}
        </span>
      ))}
    </div>
  )
}

function RecapRow({ entry, onOpenExercise }) {
  const delta = entry.previous ? entry.point.load - entry.previous.load : null
  const tone = delta === null ? '' : delta > 0 ? ' up' : delta < 0 ? ' down' : ''

  return (
    <li className="recap-row">
      <div className="recap-row-head">
        <button
          type="button"
          className="recap-name"
          onClick={() => entry.exerciseId && onOpenExercise(entry.exerciseId)}
          disabled={!entry.exerciseId}
        >
          {entry.name}
        </button>
        <span className="recap-load">{fmtKg(entry.point.load)}</span>
      </div>

      <div className="recap-row-meta">
        <span className="recap-reps">{entry.reps}</span>
        {entry.rpe && <span className="prog-rpe">{fmtRpe(entry.rpe)}</span>}
        {delta !== null && (
          <span className={'prog-delta' + tone}>{fmtSigned(delta)}kg</span>
        )}
      </div>

      {entry.point.sets && <SetChips sets={entry.point.sets} />}
    </li>
  )
}

// Résumé d'une séance terminée : ce qui a été soulevé, le volume par exercice,
// et ce qui est resté de côté. « Modifier » ramène à la séance elle-même.
export default function SessionSummary({
  day,
  date,
  finishedAt,
  entries,
  progress,
  onEdit,
  onOpenExercise,
}) {
  const totals = sessionTotals(entries)
  const logged = entries.filter((e) => e.point)
  const skipped = entries.filter((e) => !e.point)
  const chartData = totals.perExercise.slice(0, 8)
  const chartHeight = Math.max(chartData.length * 34 + 16, 80)

  return (
    <div className="prog recap">
      <section className="card recap-head">
        <div className="recap-head-row">
          <CheckCircle2 size={20} className="recap-check" />
          <div className="recap-head-text">
            <h2>Séance terminée</h2>
            <p>
              {day.title} · {fmtDateWeekday(date)}
              {finishedAt && ` · ${fmtClock(finishedAt)}`}
            </p>
          </div>
          <button type="button" className="btn btn-icon" onClick={onEdit}>
            <Pencil size={16} /> Modifier
          </button>
        </div>

        <div className="recap-stats">
          <div className="recap-stat">
            <span className="recap-stat-value">
              {progress ? `${progress.count}/${progress.total}` : '—'}
            </span>
            <span className="recap-stat-label">blocs faits</span>
          </div>
          <div className="recap-stat">
            <span className="recap-stat-value">{totals.setCount}</span>
            <span className="recap-stat-label">
              série{totals.setCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="recap-stat">
            <span className="recap-stat-value">
              {totals.estimated && '≈ '}
              {fmtVolume(totals.volume)}
            </span>
            <span className="recap-stat-label">volume</span>
          </div>
        </div>

        {totals.estimated && (
          <p className="recap-note">
            Le volume est estimé sur les reps prescrites pour les séries notées
            sans détail.
          </p>
        )}
      </section>

      {chartData.length > 0 && (
        <section className="card">
          <h3 className="recap-title">Volume par exercice</h3>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
                barCategoryGap={8}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={116}
                  stroke="#8b9099"
                  tick={{ fontSize: 11, fill: '#8b9099' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 5, 5, 0]}
                  isAnimationActive={false}
                  label={{
                    position: 'right',
                    formatter: fmtVolume,
                    fill: '#8b9099',
                    fontSize: 11,
                  }}
                >
                  {chartData.map((d, i) => (
                    <Cell key={d.name} fill={i === 0 ? ACCENT : DIM} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="recap-title">
          Noté
          <span className="prog-count">
            {logged.length}/{entries.length}
          </span>
        </h3>
        {logged.length === 0 ? (
          <p className="empty-state">Aucune charge notée sur cette séance.</p>
        ) : (
          <ul className="recap-list">
            {logged.map((entry) => (
              <RecapRow
                key={entry.id}
                entry={entry}
                onOpenExercise={onOpenExercise}
              />
            ))}
          </ul>
        )}
      </section>

      {skipped.length > 0 && (
        <section className="card recap-skipped">
          <h3 className="recap-title">Sans charge notée</h3>
          <ul className="recap-skipped-list">
            {skipped.map((entry) => (
              <li key={entry.id}>
                {entry.name}
                <span className="recap-reps">{entry.reps}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

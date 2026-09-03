import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Dumbbell, Plus, Search, X } from 'lucide-react'
import ExerciseList from './components/ExerciseList.jsx'
import ExerciseDetail from './components/ExerciseDetail.jsx'
import AddExerciseModal from './components/AddExerciseModal.jsx'
import ProgramView, { ProgramDateNav } from './components/ProgramView.jsx'
import { findProgramDay } from './program.js'
import {
  loadChoices,
  loadExercises,
  saveChoices,
  saveExercises,
} from './storage.js'
import { fmtDateWeekday, newId, searchable, todayISO, ZONES } from './utils.js'

export default function App() {
  const [exercises, setExercises] = useState(loadExercises)
  const [choices, setChoices] = useState(loadChoices)
  const [view, setView] = useState('exercices')
  const [selectedId, setSelectedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(todayISO)

  // Sauvegarde automatique à chaque changement.
  useEffect(() => {
    saveExercises(exercises)
  }, [exercises])

  useEffect(() => {
    saveChoices(choices)
  }, [choices])

  const selected = useMemo(
    () => exercises.find((e) => e.id === selectedId) || null,
    [exercises, selectedId]
  )

  // Recherche sur le nom, la note, la zone et les schémas de reps.
  const filtered = useMemo(() => {
    const q = searchable(query.trim())
    if (!q) return exercises
    return exercises.filter(
      (e) =>
        searchable(e.name).includes(q) ||
        searchable(e.note).includes(q) ||
        searchable(e.zone).includes(q) ||
        e.variants.some((v) => searchable(v.scheme).includes(q))
    )
  }, [exercises, query])

  // Une section par zone, dans l'ordre de ZONES, sections vides masquées.
  const groups = useMemo(
    () =>
      ZONES.map((zone) => ({
        zone,
        items: filtered.filter((e) => e.zone === zone),
      })).filter((g) => g.items.length > 0),
    [filtered]
  )

  const updateExercise = useCallback((id, patch) => {
    setExercises((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const deleteExercise = useCallback((id) => {
    setExercises((list) => list.filter((e) => e.id !== id))
    setSelectedId(null)
  }, [])

  const addExercise = useCallback((data) => {
    setExercises((list) => [...list, { ...data, id: newId() }])
    setModalOpen(false)
  }, [])

  const setChoice = useCallback((key, name) => {
    setChoices((c) => ({ ...c, [key]: name }))
  }, [])

  // La fiche d'un exercice se superpose à l'onglet courant : le retour ramène
  // donc sur la liste ou sur le programme, selon l'endroit d'où on l'a ouverte.
  if (selected) {
    return (
      <div className="app">
        <ExerciseDetail
          exercise={selected}
          onBack={() => setSelectedId(null)}
          onUpdate={(patch) => updateExercise(selected.id, patch)}
          onDelete={() => deleteExercise(selected.id)}
        />
      </div>
    )
  }

  const isProgram = view === 'programme'
  const programDay = isProgram ? findProgramDay(date) : null

  return (
    <div className="app">
      <header className="header header-list">
        <div className="header-row">
          <div className="header-text">
            <h1>{isProgram ? 'Programme' : 'Suivi des charges'}</h1>
            <p className="subtitle">
              {isProgram
                ? fmtDateWeekday(date) +
                  (programDay?.day ? ` · ${programDay.day.title}` : '')
                : query.trim()
                  ? `${filtered.length} sur ${exercises.length} exercice${
                      exercises.length > 1 ? 's' : ''
                    }`
                  : `${exercises.length} exercice${exercises.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {!isProgram && (
            <button
              type="button"
              className="btn btn-accent btn-icon"
              onClick={() => setModalOpen(true)}
              aria-label="Ajouter un exercice"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        <div className="tabs" role="tablist" aria-label="Vues">
          <button
            type="button"
            role="tab"
            aria-selected={!isProgram}
            className={'tab' + (!isProgram ? ' active' : '')}
            onClick={() => setView('exercices')}
          >
            <Dumbbell size={15} /> Exercices
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isProgram}
            className={'tab' + (isProgram ? ' active' : '')}
            onClick={() => setView('programme')}
          >
            <CalendarDays size={15} /> Programme
          </button>
        </div>

        {isProgram ? (
          <ProgramDateNav date={date} onDateChange={setDate} />
        ) : (
          <div className="search">
            <Search size={16} className="search-icon" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (nom, note, schéma…)"
              aria-label="Rechercher un exercice"
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setQuery('')}
                aria-label="Effacer la recherche"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}
      </header>

      {isProgram ? (
        <ProgramView
          exercises={exercises}
          date={date}
          onDateChange={setDate}
          choices={choices}
          onChoice={setChoice}
          onOpenExercise={setSelectedId}
        />
      ) : (
        <ExerciseList groups={groups} onSelect={setSelectedId} />
      )}

      {modalOpen && (
        <AddExerciseModal
          onClose={() => setModalOpen(false)}
          onSubmit={addExercise}
        />
      )}
    </div>
  )
}

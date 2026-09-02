import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import ExerciseList from './components/ExerciseList.jsx'
import ExerciseDetail from './components/ExerciseDetail.jsx'
import AddExerciseModal from './components/AddExerciseModal.jsx'
import { loadExercises, saveExercises } from './storage.js'
import { newId, searchable, ZONES } from './utils.js'

export default function App() {
  const [exercises, setExercises] = useState(loadExercises)
  const [selectedId, setSelectedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Sauvegarde automatique à chaque changement.
  useEffect(() => {
    saveExercises(exercises)
  }, [exercises])

  const selected = useMemo(
    () => exercises.find((e) => e.id === selectedId) || null,
    [exercises, selectedId]
  )

  // Recherche sur le nom, la note et les schémas de reps.
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

  return (
    <div className="app">
      <header className="header header-list">
        <div className="header-row">
          <div className="header-text">
            <h1>Suivi des charges</h1>
            <p className="subtitle">
              {query.trim()
                ? `${filtered.length} sur ${exercises.length} exercice${
                    exercises.length > 1 ? 's' : ''
                  }`
                : `${exercises.length} exercice${exercises.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-accent btn-icon"
            onClick={() => setModalOpen(true)}
            aria-label="Ajouter un exercice"
          >
            <Plus size={18} />
          </button>
        </div>

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
      </header>

      <ExerciseList groups={groups} onSelect={setSelectedId} />

      {modalOpen && (
        <AddExerciseModal
          onClose={() => setModalOpen(false)}
          onSubmit={addExercise}
        />
      )}
    </div>
  )
}

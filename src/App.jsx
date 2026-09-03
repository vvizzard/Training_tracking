import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Dumbbell, Plus, Search, Upload, UserRound, X } from 'lucide-react'
import ExerciseList from './components/ExerciseList.jsx'
import ExerciseDetail from './components/ExerciseDetail.jsx'
import AddExerciseModal from './components/AddExerciseModal.jsx'
import ProgramView, { ProgramDateNav } from './components/ProgramView.jsx'
import ImportProgramModal from './components/ImportProgramModal.jsx'
import ProfileGate from './components/ProfileGate.jsx'
import { findProgramDay } from './program.js'
import { ensureExercisesFor } from './programSync.js'
import {
  clearActiveProfile,
  fetchProfile,
  loadActiveProfile,
  loadProfileCache,
  saveActiveProfile,
} from './profile.js'
import {
  loadChoices,
  loadExercises,
  loadImportedPrograms,
  markLegacyAdopted,
  saveChoices,
  saveExercises,
  saveImportedPrograms,
  setStorageScope,
} from './storage.js'
import { fmtDateWeekday, newId, searchable, todayISO, ZONES } from './utils.js'

// Le cloisonnement par profil doit être en place avant la première lecture du
// stockage, donc avant le premier rendu.
const initialProfile = loadActiveProfile()
setStorageScope(initialProfile?.slug || '')

export default function App() {
  const [exercises, setExercises] = useState(loadExercises)
  const [profile, setProfile] = useState(initialProfile)
  const [profilePrograms, setProfilePrograms] = useState(
    () => loadProfileCache(initialProfile?.slug)?.programs || []
  )
  const [choices, setChoices] = useState(loadChoices)
  const [imported, setImported] = useState(loadImportedPrograms)
  const [importOpen, setImportOpen] = useState(false)
  const [view, setView] = useState('exercices')
  const [selectedId, setSelectedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(todayISO)

  // La reprise des données d'avant les profils n'a lieu qu'une fois, après les
  // premières lectures du stockage.
  useEffect(() => {
    if (initialProfile?.slug) markLegacyAdopted()
  }, [])

  // Le fichier du profil est relu à chaque ouverture : modifier le JSON dans le
  // dépôt suffit à mettre le programme à jour sur tous les appareils.
  useEffect(() => {
    const slug = profile?.slug
    if (!slug) return
    let cancelled = false
    fetchProfile(slug).then((result) => {
      if (cancelled || !result.ok) return
      setProfilePrograms(result.programs)
      setExercises((list) => ensureExercisesFor(result.programs, list).exercises)
      if (result.label && result.label !== profile.label) {
        const next = { slug, label: result.label }
        saveActiveProfile(next)
        setProfile(next)
      }
    })
    return () => {
      cancelled = true
    }
  }, [profile?.slug])

  // Sauvegarde automatique à chaque changement.
  useEffect(() => {
    saveExercises(exercises)
  }, [exercises])

  useEffect(() => {
    saveChoices(choices)
  }, [choices])

  useEffect(() => {
    saveImportedPrograms(imported)
  }, [imported])

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

  // Un import remplace un programme de même identifiant, sinon s'ajoute à la
  // fin : le plus récent l'emporte en cas de chevauchement de dates.
  const importPrograms = useCallback((programs) => {
    setImported((list) => {
      const ids = new Set(programs.map((p) => p.id))
      return [...list.filter((p) => !ids.has(p.id)), ...programs]
    })
    // Les exercices et déclinaisons cités mais absents sont créés, sans quoi la
    // charge du jour n'aurait nulle part où être enregistrée.
    setExercises((list) => ensureExercisesFor(programs, list).exercises)
    setImportOpen(false)
    setView('programme')
    setDate(programs[0].start)
  }, [])

  const removeImported = useCallback((id) => {
    setImported((list) => list.filter((p) => p.id !== id))
  }, [])

  // Programmes du profil d'abord, imports manuels ensuite : ces derniers
  // l'emportent, pour qu'une action explicite ne soit pas écrasée par la
  // récupération du fichier de profil.
  const overrides = useMemo(
    () => [
      ...profilePrograms.map((p) => ({ ...p, source: 'profil' })),
      ...imported.map((p) => ({ ...p, source: 'import' })),
    ],
    [profilePrograms, imported]
  )

  if (!profile) {
    return (
      <ProfileGate
        onOpen={(next) => {
          saveActiveProfile(next)
          window.location.reload()
        }}
        onSkip={() => {
          saveActiveProfile({ slug: '', label: '' })
          window.location.reload()
        }}
      />
    )
  }

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
  const programDay = isProgram ? findProgramDay(date, overrides) : null

  return (
    <div className="app">
      <header className="header header-list">
        <div className="header-row">
          <div className="header-text">
            <h1>{isProgram ? 'Programme' : 'Suivi des charges'}</h1>
            <p className="subtitle">
              {isProgram
                ? (profile.slug ? `${profile.label} · ` : '') +
                  fmtDateWeekday(date) +
                  (programDay?.day ? ` · ${programDay.day.title}` : '')
                : query.trim()
                  ? `${filtered.length} sur ${exercises.length} exercice${
                      exercises.length > 1 ? 's' : ''
                    }`
                  : `${exercises.length} exercice${exercises.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {isProgram ? (
            <>
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => {
                  clearActiveProfile()
                  window.location.reload()
                }}
                aria-label="Changer de profil"
                title={profile.slug ? `Profil : ${profile.label}` : 'Aucun profil'}
              >
                <UserRound size={18} />
              </button>
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => setImportOpen(true)}
                aria-label="Importer un programme"
              >
                <Upload size={18} />
              </button>
            </>
          ) : (
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
          <ProgramDateNav date={date} onDateChange={setDate} overrides={overrides} />
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
          overrides={overrides}
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

      {importOpen && (
        <ImportProgramModal
          exercises={exercises}
          imported={imported}
          onClose={() => setImportOpen(false)}
          onImport={importPrograms}
          onRemove={removeImported}
        />
      )}
    </div>
  )
}

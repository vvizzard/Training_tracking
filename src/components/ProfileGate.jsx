import { useState } from 'react'
import { AlertTriangle, LogIn } from 'lucide-react'
import { fetchProfile, profileSlug } from '../profile.js'

// Écran d'entrée : la personne saisit le nom de son profil, l'app va chercher
// le fichier correspondant sur le serveur. C'est ce qui rend le programme
// identique d'un appareil à l'autre.
export default function ProfileGate({ onOpen, onSkip }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])

  async function submit(e) {
    e.preventDefault()
    const slug = profileSlug(name)
    if (!slug) {
      setErrors(['Saisis un nom de profil.'])
      return
    }
    setBusy(true)
    setErrors([])
    const result = await fetchProfile(slug)
    setBusy(false)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    onOpen({ slug, label: result.label }, result.programs, result.offline)
  }

  return (
    <div className="gate">
      <div className="gate-card card">
        <h1 className="gate-title">Suivi des charges</h1>
        <p className="gate-sub">
          Saisis le nom de ton profil pour ouvrir ton programme. Il est le même
          sur tous tes appareils.
        </p>

        <form onSubmit={submit} className="form">
          <label className="field">
            <span>Nom du profil</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors([])
              }}
              placeholder="zacharie"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </label>

          {errors.length > 0 && (
            <div className="import-errors">
              <p className="import-errors-title">
                <AlertTriangle size={14} /> Ouverture impossible
              </p>
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="btn btn-accent btn-block" disabled={busy}>
            <LogIn size={15} /> {busy ? 'Ouverture…' : 'Ouvrir mon programme'}
          </button>
        </form>

        <button type="button" className="btn btn-block btn-subtle" onClick={onSkip}>
          Continuer sans profil
        </button>

        <p className="hint">
          Sans profil, tu gardes le programme intégré et tes données restent
          propres à ce navigateur. Un nom de profil n’est pas un mot de passe :
          les fichiers de programme sont publics.
        </p>
      </div>
    </div>
  )
}

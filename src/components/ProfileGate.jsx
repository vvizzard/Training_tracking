import { useState } from 'react'
import { AlertTriangle, Copy, Link2, LogIn } from 'lucide-react'
import { fetchProfile, resolveSource, shareLink } from '../profile.js'

// Écran d'entrée. Un seul champ, qui accepte indifféremment un nom de profil
// (fichier servi avec le site) ou une adresse https vers n'importe quel
// hébergeur de JSON.
export default function ProfileGate({ current, onOpen, onSkip, onCancel }) {
  const [value, setValue] = useState(current?.url || current?.slug || '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])
  const [copied, setCopied] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const source = resolveSource(value)
    if (!source) {
      setErrors(['Saisis un nom de profil ou une adresse https.'])
      return
    }
    setBusy(true)
    setErrors([])
    const result = await fetchProfile(source)
    setBusy(false)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    onOpen(
      { slug: result.slug, label: result.label, url: result.url || '' },
      result.programs
    )
  }

  async function copyLink() {
    const link = shareLink(current.url ? { url: current.url } : { slug: current.slug })
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Presse-papiers refusé : on retombe sur une sélection manuelle.
      window.prompt('Copie ce lien :', link)
    }
  }

  return (
    <div className="gate">
      <div className="gate-card card">
        <h1 className="gate-title">Suivi des charges</h1>
        <p className="gate-sub">
          Ouvre ton programme avec son nom, ou avec le lien de l’endroit où il est
          hébergé. Il sera le même sur tous tes appareils.
        </p>

        <form onSubmit={submit} className="form">
          <label className="field">
            <span>Nom du profil, ou lien https</span>
            <input
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setErrors([])
              }}
              placeholder="zacharie — ou https://api.npoint.io/…"
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

        {current?.slug && (
          <button type="button" className="btn btn-block btn-subtle" onClick={copyLink}>
            {copied ? <Copy size={15} /> : <Link2 size={15} />}{' '}
            {copied ? 'Lien copié' : 'Copier le lien d’ouverture'}
          </button>
        )}

        <div className="gate-actions">
          {current && (
            <button type="button" className="btn" onClick={onCancel}>
              Annuler
            </button>
          )}
          <button type="button" className="btn btn-subtle" onClick={onSkip}>
            Continuer sans profil
          </button>
        </div>

        <p className="hint">
          Un lien d’ouverture donne accès au programme à qui l’a : garde-le pour
          toi, comme un lien de partage. Ce n’est pas un mot de passe. Tes charges,
          elles, ne quittent jamais ton navigateur.
        </p>
      </div>
    </div>
  )
}

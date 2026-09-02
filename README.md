# Suivi des charges

Petite web app de suivi de charges en musculation : liste d'exercices regroupés par zone
musculaire et filtrables, RM, déclinaisons de séries/reps, courbe d'évolution des charges dans
le temps. Aucun backend, tout est stocké dans le `localStorage` du navigateur sous la clé
`suivi_charges_v4`.

Stack : Vite + React (JavaScript), [Recharts](https://recharts.org) pour le graphique,
[lucide-react](https://lucide.dev) pour les icônes.

## Développement

```bash
npm install
npm run dev
```

L'app est servie sur http://localhost:5173.

Au premier lancement, une liste d'exercices de départ est créée automatiquement, avec un
point d'historique daté du jour pour chaque format ayant une charge de départ.

```bash
npm run build     # génère dist/
npm run preview   # sert dist/ en local pour vérifier le build
```

## Déploiement sur GitHub Pages

`vite.config.js` utilise `base: './'` : les assets sont référencés en relatif, donc le build
fonctionne aussi bien à la racine d'un domaine que dans un sous-chemin
`https://<utilisateur>.github.io/<repo>/`. Aucune configuration à changer selon le nom du repo.

### Méthode recommandée : GitHub Actions (automatique)

Le workflow `.github/workflows/deploy.yml` est déjà présent. Il build le projet et publie
`dist/` sur la branche `gh-pages` via `peaceiris/actions-gh-pages` à chaque push sur `main`.

1. Crée un repo sur GitHub et pousse le projet :

   ```bash
   git init
   git add .
   git commit -m "Suivi des charges"
   git branch -M main
   git remote add origin https://github.com/<utilisateur>/<repo>.git
   git push -u origin main
   ```

2. Le workflow se lance tout seul (onglet **Actions**). Au premier passage il crée la branche
   `gh-pages`.

3. Dans **Settings → Pages**, choisis :
   - **Source** : `Deploy from a branch`
   - **Branch** : `gh-pages` / `/ (root)`

4. Le site est en ligne sur `https://<utilisateur>.github.io/<repo>/`. Chaque push sur `main`
   redéploie automatiquement.

> Si l'action échoue avec une erreur de permission, va dans
> **Settings → Actions → General → Workflow permissions** et sélectionne
> **Read and write permissions**.

### Alternative : déploiement manuel

Le script `deploy` fait le build et pousse `dist/` sur la branche `gh-pages` (via le paquet
`gh-pages`, déjà en devDependency) :

```bash
npm run deploy
```

À lancer depuis un repo déjà relié à un remote GitHub. La configuration Pages reste la même :
branche `gh-pages`, dossier `/ (root)`.

## Données

Un exercice porte un nom, une zone musculaire, une note, et une liste de **formats**
(`variants`). Chaque format a son schéma et son propre historique de charges. **Le premier
format est le format principal : c'est le RM.** Les suivants sont ses déclinaisons.

```js
{
  id: "ex_ab12cd34",
  name: "Bench Press",
  zone: "Pectoraux",   // Pectoraux | Dos | Épaules | Bras | Jambes | Autre
  note: "",
  variants: [
    // variants[0] = format principal (le RM), jamais supprimable
    { id: "v_0", scheme: "RM",      history: [{ date: "2026-07-01", load: 90 },
                                              { date: "2026-09-02", load: 95 }] },
    { id: "v_1", scheme: "4x8-10",  history: [{ date: "2026-09-02", load: 60 }] },
    { id: "v_2", scheme: "3x12-15", history: [{ date: "2026-09-02", load: 55 }] }
  ]
}
```

- La **charge courante** d'un format est le dernier point de son `history` trié par date.
- Le **RM affiché** est donc la dernière charge relevée sur `variants[0]` : il se met à jour en
  enregistrant une charge datée sur le format principal, et il a sa propre courbe.
- Le **delta** affiché dans la vue détail est `dernier point - premier point`, pour le format
  sélectionné.
- Une date = un point : ressaisir la même date écrase la valeur existante.
- Une déclinaison peut être supprimée, jamais le format principal.
- La **zone** sert à regrouper la liste en sections ; la recherche porte sur le nom, la note,
  la zone et les schémas de reps, sans tenir compte des accents.
- Les champs numériques acceptent la virgule comme séparateur décimal (`17,5` = `17.5`).

### Migration des versions précédentes

Au premier chargement, les données d'une version antérieure sont converties automatiquement,
puis enregistrées sous `suivi_charges_v3`. Les anciennes clés sont laissées en place comme
sauvegarde.

| Version | Modèle | Conversion |
| --- | --- | --- |
| `suivi_charges_v1` | un seul schéma par exercice (`scheme` + `history` à la racine) | le schéma devient une déclinaison |
| `suivi_charges_v2` | plusieurs formats, RM en valeur isolée de l'exercice | le RM devient le format principal, daté du jour de la migration |
| `suivi_charges_v3` | formats et RM principal, sans zone | la zone est retrouvée par le nom pour les exercices du jeu de départ, sinon « Autre » |

Pour repartir de zéro (et régénérer les données de départ), vide les clés dans le localStorage
du navigateur :

```js
['v1', 'v2', 'v3', 'v4'].forEach((v) => localStorage.removeItem('suivi_charges_' + v))
```

Les données étant locales au navigateur, elles ne sont ni synchronisées entre appareils ni
sauvegardées ailleurs.

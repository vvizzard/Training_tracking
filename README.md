# Suivi des charges

Petite web app de suivi de charges en musculation : liste d'exercices regroupés par zone
musculaire et filtrables, RM, déclinaisons de séries/reps avec leur RPE, courbe d'évolution des
charges dans le temps, et une page **Programme** consultable par date, avec import JSON. Aucun backend, tout est
stocké dans le `localStorage` du navigateur sous la clé `suivi_charges_v5`.

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

**En ligne : https://vvizzard.github.io/Training_tracking/**

`vite.config.js` utilise `base: './'` : les assets sont référencés en relatif, donc le build
fonctionne aussi bien à la racine d'un domaine que dans un sous-chemin
`https://<utilisateur>.github.io/<repo>/`.

Le déploiement est automatique : à chaque push sur `main`, le workflow
`.github/workflows/deploy.yml` build le projet et publie `dist/` sur la branche `gh-pages`
via `peaceiris/actions-gh-pages`. Rien d'autre à faire que pousser.

```bash
git push origin main
```

### Configuration déjà en place

- **Settings → Pages** : source `Deploy from a branch`, branche `gh-pages`, dossier `/ (root)`.
- **Settings → Actions → General → Workflow permissions** : `Read and write permissions`,
  sans quoi l'action ne peut pas créer la branche `gh-pages` (c'est `read` par défaut sur un
  dépôt neuf, et le déploiement échoue).

### Note sur `npm install` en CI

Le workflow utilise `npm install` et non `npm ci`. `fdir`, une dépendance transitive de Vite,
déclare `picomatch` en peer dependency **optionnelle** ; la validation stricte de `npm ci`
refuse la résolution produite sur le runner Linux et échoue avec
`lock file's picomatch@2.3.2 does not satisfy picomatch@4.0.7`, quelle que soit la version de
Node. `npm install` résout correctement.

### Alternative : déploiement manuel

Le script `deploy` fait le build et pousse `dist/` sur `gh-pages` (via le paquet `gh-pages`,
déjà en devDependency), sans passer par l'action :

```bash
npm run deploy
```

## Page Programme

Deux semaines de programme sont reconstituées dans [`src/program.js`](src/program.js) à partir
des documents HWPO Bodybuilding — bloc 6 semaine 3/4 (du 24 au 30 août) et bloc 7 semaine 1/4
(du 31 août au 6 septembre). Les jours d'entraînement suivent la suggestion du programme :
lundi, mardi, mercredi, vendredi, samedi ; jeudi et dimanche sont des jours de repos.

Pour chaque séance, la page affiche l'échauffement, les blocs numérotés, les supersets et le
finisher, avec pour chaque mouvement :

- les **séries conseillées** et leur RPE, et la **charge courante** tirée de la déclinaison
  correspondante de l'exercice ;
- un **sélecteur** quand le programme laisse le choix (« Pendulum, Belt ou Back Squat »,
  « Landmine ou T-Bar Row »…). Le choix est mémorisé sous la clé
  `suivi_programme_choix_v1` ;
- les **liens vidéo** fournis par le programme ;
- les **remarques** du coach, résumées en français.

Un lien « Ouvrir la fiche » mène à la fiche de l'exercice pour y enregistrer la charge du jour ;
le retour ramène sur la même date du programme.

La charge affichée vient de la déclinaison dont le schéma correspond à la série prescrite. Si
l'exercice retenu n'a pas ce schéma exact — cas d'un remplacement, `4 x max prise large` contre
`4 x max` — la recherche retombe sur les reps affichées.

> Le contenu des programmes est une donnée statique du code, pas une donnée utilisateur : il
> n'est pas stocké dans le `localStorage` et n'est pas modifiable depuis l'interface. Les
> remarques sont des résumés en français des notes du coach, pas leur reprise mot pour mot.

## Profils : un programme partagé entre appareils

Le programme peut venir d'un fichier servi avec le site plutôt que du navigateur.
À l'ouverture, l'app demande un **nom de profil** et va chercher
`public/programmes/<nom>.json`. Le programme est donc identique sur n'importe quel
téléphone ou navigateur, et le mettre à jour se fait en modifiant le fichier dans
le dépôt.

```
public/programmes/
├── README.md          ← mode d'emploi, à côté des fichiers
├── zacharie.json      ← s'ouvre en tapant « Zacharie »
└── <autre-nom>.json   ← un fichier par profil
```

Le nom saisi est mis en minuscules sans accent pour former le nom du fichier, et
doit aussi figurer **dans** le fichier, en champ `profile` — sinon l'app refuse
d'ouvrir le profil, ce qui évite qu'un fichier renommé passe inaperçu.

**Pour ajouter ou modifier un programme :** éditer le `.json`, `git push` sur
`main`, attendre le déploiement (environ une minute). La mise à jour apparaît
partout à la prochaine ouverture — le fichier est relu à chaque ouverture, et sa
dernière version est gardée en cache pour rester utilisable hors ligne.

### Héberger le JSON ailleurs que dans le dépôt

Le même champ accepte une **adresse https complète** à la place d'un nom. Le JSON
peut alors vivre chez n'importe quel hébergeur qui renvoie du JSON et autorise la
lecture depuis un autre site (`Access-Control-Allow-Origin`) : npoint.io, qui
s'édite directement dans le navigateur, Cloudflare R2, Netlify Drop…

```
https://api.npoint.io/a7f3c91e4b2d8065
                      └── clé aléatoire, indevinable
```

Modifier le JSON chez l'hébergeur suffit : pas de commit, pas de déploiement, la
mise à jour est visible partout à la prochaine ouverture. L'adresse est
mémorisée, et la dernière version reçue reste en cache pour l'usage hors ligne.

Le bouton **« Copier le lien d'ouverture »**, dans l'écran de profil, fabrique une
adresse `…/#p=<url encodée>` : l'ouvrir sur un autre appareil configure le profil
d'un seul geste, sans rien retaper. Un lien `#n=<nom>` fait de même pour un
fichier du dépôt.

> **Ce que vaut cette sécurité.** Une URL contenant une clé aléatoire est
> indevinable, mais partageable : qui l'obtient accède au programme. C'est le
> modèle du lien de partage, pas celui d'un mot de passe — une app statique ne
> peut rien garder de secret, tout ce qu'elle va chercher est visible dans
> l'onglet réseau. Ne rien y mettre de sensible, ne pas publier le lien, et le
> régénérer chez l'hébergeur s'il a fuité. Une vraie protection par compte
> demanderait un service avec authentification et règles d'accès côté serveur.

Les **données sont cloisonnées par profil** : les clés de `localStorage` sont
suffixées par le nom (`suivi_charges_v5__zacharie`), donc deux profils ouverts sur
le même navigateur gardent chacun leurs charges. Les données enregistrées avant
l'arrivée des profils sont reprises une fois, vers le premier profil ouvert, sans
que l'ancienne clé soit supprimée.

« Continuer sans profil » garde le programme intégré et les clés historiques.
L'icône de profil, dans l'en-tête de la page Programme, permet d'en changer.

> Ce n'est **pas une authentification**. Les fichiers sont publics et n'importe
> qui connaissant un nom de profil peut l'ouvrir. Les charges, elles, ne quittent
> jamais le navigateur.

### Priorité entre programmes

Pour une même date : **import manuel > fichier de profil > programme intégré**.
Une action explicite n'est ainsi jamais écrasée par la relecture du fichier de
profil en arrière-plan. Les journées portent un badge « profil » ou « importé »
selon leur origine.

## Importer un programme (JSON)

Le bouton d'import de la page Programme accepte un fichier `.json` ou du JSON collé. Le
contenu est validé avant enregistrement : tant qu'il reste une erreur, l'import est refusé et
les problèmes sont listés un par un avec leur chemin (`programme.days[2].blocks[0] : …`).

Un programme est **une liste de journées datées**. C'est ce qui permet d'importer
indifféremment **un jour, une semaine ou un mois** : il n'y a qu'à mettre autant d'entrées que
de jours couverts. Une entrée sans bloc, ou avec `"rest": true`, est un jour de repos.

```json
{
  "format": "suivi-charges/programme@1",
  "label": "Bloc 8 · semaine 1/4",
  "focus": "Reprise en volume.",
  "days": [
    {
      "date": "2026-09-07",
      "title": "Séance 1 · Push",
      "focus": "Pectoraux, épaules, triceps",
      "blocks": [
        {
          "kind": "warmup",
          "intro": "3 à 5 min de cardio",
          "lines": ["15 Band Pull Apart"],
          "rounds": "2-3 tours",
          "rest": "1 min"
        },
        {
          "n": 1,
          "exercise": "Bench Press",
          "sets": "4x8-10",
          "rpe": "8",
          "rest": "2-3 min",
          "notes": "Garder 5 kg de réserve.",
          "links": [{ "label": "Démo", "url": "https://youtu.be/xxxx" }]
        },
        {
          "n": 2,
          "title": "Squat au choix",
          "choices": ["Squat", "Leg Press", "Hack Squat"],
          "sets": [{ "reps": "6x4", "rpe": "9" }]
        },
        {
          "n": 3,
          "kind": "superset",
          "rounds": "3 tours",
          "movements": [
            { "match": "Lateral Raise", "sets": [{ "reps": "12", "scheme": "3x10-12", "rpe": "Échec" }] }
          ]
        }
      ]
    },
    { "date": "2026-09-08", "rest": true }
  ]
}
```

| Champ | Rôle |
| --- | --- |
| `label`, `focus` | titre et intention du programme (facultatifs) |
| `days[].date` | **requis**, `AAAA-MM-JJ` ; une date par journée, pas de doublon |
| `days[].rest` | `true` pour un jour de repos (équivalent à ne pas mettre de bloc) |
| `blocks[].kind` | `single` (défaut), `warmup`, `superset`, `finisher` |
| `blocks[].n` | numéro affiché dans la pastille |
| `blocks[].rounds`, `rest`, `notes` | nombre de tours, temps de repos, remarques |
| `movements[].match` | nom **exact** d'un exercice de la liste, d'où vient la charge |
| `movements[].choices` | plusieurs exercices : un sélecteur s'affiche, le choix est mémorisé |
| `sets[].reps` | série affichée (`4x8-10`) |
| `sets[].scheme` | déclinaison à utiliser pour la charge, si son libellé diffère de `reps` |
| `sets[].rpe`, `hint` | RPE (`8`, `9-10`, `Échec`, `Dur`) et précision courte (`lourd`) |
| `links[]` | `{ "label", "url" }` ; seuls `http` et `https` sont acceptés |

Raccourcis tolérés, pour que le JSON reste écrivable à la main :

- `"sets": "4x8-10"` ou `"sets": ["1x5", "4x6-8"]` au lieu d'un tableau d'objets ;
- `"notes": "une seule remarque"` au lieu d'un tableau ;
- `"links": ["https://…"]` au lieu d'objets ;
- un bloc peut porter directement `exercise` / `choices` / `sets` / `rpe` au lieu d'un tableau
  `movements` à un seul élément ;
- un mouvement peut être une simple chaîne, prise comme nom d'exercice ;
- le fichier peut contenir un seul programme, un tableau de programmes, ou
  `{ "programs": [...] }`.

**Les exercices et déclinaisons manquants sont créés à l'import.** Un exercice cité mais absent
de la liste est ajouté dans la zone « Autre » ; un schéma de reps inconnu devient une nouvelle
déclinaison vide, prête à recevoir une charge. Le décompte est annoncé dans l'aperçu avant
validation (« Seront créés : 2 exercices et 2 déclinaisons »). Les fichiers de profil passent
par le même mécanisme à chaque ouverture.

Les programmes importés sont enregistrés sous `suivi_programmes_importes_v1` et **prennent la
main sur les programmes intégrés aux mêmes dates**, le plus récemment importé gagnant en cas de
chevauchement. La liste des imports, avec suppression, est dans la même fenêtre.

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
    { id: "v_0", scheme: "RM",      rpe: "",      history: [{ date: "2026-07-01", load: 90 },
                                                            { date: "2026-09-02", load: 95 }] },
    { id: "v_1", scheme: "4x8-10",  rpe: "8",     history: [{ date: "2026-09-02", load: 60 }] },
    { id: "v_2", scheme: "3x12-15", rpe: "Échec", history: [{ date: "2026-09-02", load: 55 }] }
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
- Le **RPE** est du texte libre, repris du programme : `8`, `9-10`, mais aussi `Échec` (séries
  notées *Failure*) ou `Dur` (*Tough* / *HARD*). Il s'affiche préfixé de « RPE » uniquement
  quand il commence par un chiffre, et reste vide quand le programme n'en donne pas.
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
| `suivi_charges_v4` | zones, mais pas de RPE sur les formats | le RPE est retrouvé par le couple nom + schéma pour les formats du jeu de départ, sinon vide |

Pour repartir de zéro (et régénérer les données de départ), vide les clés dans le localStorage
du navigateur :

```js
['v1', 'v2', 'v3', 'v4', 'v5'].forEach((v) =>
  localStorage.removeItem('suivi_charges_' + v)
)
localStorage.removeItem('suivi_programme_choix_v1')
localStorage.removeItem('suivi_programmes_importes_v1')
// et, si un profil est actif, les mêmes clés suffixées par son nom :
// suivi_charges_v5__zacharie, suivi_programme_choix_v1__zacharie, etc.
```

Les données étant locales au navigateur, elles ne sont ni synchronisées entre appareils ni
sauvegardées ailleurs.

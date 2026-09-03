# Fichiers de profil

Un fichier par profil, nommé d'après le nom saisi à l'ouverture de l'app, en
minuscules et sans accent : `zacharie.json` s'ouvre en tapant `Zacharie`.

Le nom doit aussi figurer **dans** le fichier, en champ `profile`. Si les deux
ne correspondent pas, l'app refuse d'ouvrir le profil : renommer un fichier sans
mettre son contenu à jour ne passe pas inaperçu.

```json
{
  "format": "suivi-charges/programme@1",
  "profile": "Zacharie",
  "programs": [
    {
      "label": "Bloc 8 · semaine 1/4",
      "days": [
        { "date": "2026-09-07", "title": "Séance 1 · Push", "blocks": [ ... ] },
        { "date": "2026-09-08", "rest": true }
      ]
    }
  ]
}
```

Le contenu de `programs` suit exactement le format d'import décrit dans le
[README du projet](../../README.md#importer-un-programme-json).

## Ajouter ou modifier un profil

1. Créer ou éditer `public/programmes/<nom>.json`.
2. `git commit` puis `git push` sur `main`.
3. L'action GitHub reconstruit et publie le site, environ une minute.

La mise à jour est alors visible partout, sur n'importe quel navigateur ou
téléphone, à la prochaine ouverture de l'app : le fichier est relu à chaque
ouverture, et sa dernière version est gardée en cache pour l'usage hors ligne.

## Ce que ce n'est pas

Ce n'est **pas une authentification**. Les fichiers sont publics, et n'importe
qui connaissant un nom de profil peut l'ouvrir. Ne rien y mettre de sensible.

Les charges enregistrées, elles, ne sont pas dans ces fichiers : elles restent
dans le navigateur de chacun, séparées par profil.

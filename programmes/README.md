# Fichiers de profil

Ce dossier est **une des deux façons** d'héberger un programme. L'autre, souvent
plus pratique, est un hébergeur JSON externe avec un lien secret : voir
« Héberger ailleurs qu'ici » plus bas.

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

## Héberger ailleurs qu'ici

L'app accepte aussi une **adresse https complète** à la place d'un nom. Le JSON
peut donc vivre n'importe où, du moment que l'hébergeur renvoie du JSON et
autorise la lecture depuis un autre site (en-tête `Access-Control-Allow-Origin`).

Services qui conviennent, sans compte ou presque : **npoint.io** (édition dans le
navigateur, le plus simple), **Cloudflare R2**, **Netlify Drop**. Vérifie leurs
conditions actuelles, les offres gratuites bougent.

Marche à suivre avec npoint.io :

1. Coller le JSON du programme, avec son champ `profile`.
2. Récupérer l'URL, du type `https://api.npoint.io/a7f3c91e4b2d8065`.
3. Dans l'app, saisir cette URL au lieu d'un nom.
4. Pour mettre à jour : éditer le JSON chez l'hébergeur. Aucun déploiement,
   la modification est visible partout à la prochaine ouverture.

Le bouton « Copier le lien d'ouverture » fabrique une adresse du type
`https://…/Training_tracking/#p=<url encodée>` : l'ouvrir sur un autre appareil
configure le profil d'un seul geste.

### Ce que vaut cette sécurité

Une URL contenant une clé aléatoire est **indevinable**, mais **partageable** :
qui l'obtient accède au programme. C'est le modèle du lien de partage, pas celui
d'un mot de passe. Une app statique ne peut rien garder de secret : tout ce
qu'elle va chercher est visible dans l'onglet réseau du navigateur.

Conséquences pratiques : ne rien mettre de sensible dans ces fichiers, ne pas
publier le lien, et le régénérer chez l'hébergeur s'il a fuité. Pour une vraie
protection par compte et mot de passe, il faudrait un service avec
authentification et règles d'accès côté serveur.

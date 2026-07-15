# Problèmes rencontrés lors de la création de l'installeur Windows

## Contexte

Le build Electron Windows a été tenté via la commande :

```powershell
npm run build:electron:win
```

Le processus a été bloqué par plusieurs problèmes liés à l'environnement Windows et aux droits d'exécution.

## Problèmes observés

### 1. Script shell non compatible avec Windows

Le script de build initial utilisait un script Bash :

- [scripts/build-electron.sh](scripts/build-electron.sh)

Sur Windows, l'exécution de ce script a échoué avec l'erreur :

```text
'.' n’est pas reconnu en tant que commande interne
ou externe, un programme exécutable ou un fichier de commandes.
```

### 2. Absence d'outils de compilation natifs pour Electron

Le packaging Electron tente de reconstruire certains modules natifs. Sur cet environnement Windows, cela a échoué car les outils nécessaires à la compilation ne sont pas disponibles.

Indicateurs observés :

- absence de `cl.exe` (Visual C++ Build Tools)
- absence de `msbuild`
- absence de `vcvarsall.bat`
- `python` n'était pas correctement disponible sur le PATH

### 3. Limitation de droits administrateur

L'installation de Visual Studio Build Tools n'a pas pu être réalisée car l'environnement ne dispose pas des droits administrateur nécessaires.

Erreur obtenue lors de la tentative d'installation :

```text
Échec du programme d’installation avec le code de sortie : 1602
```

### 4. Problème de téléchargement/extraction de `winCodeSign`

Pendant la création de l'installeur, Electron Builder a tenté d'utiliser l'outil `winCodeSign` et a échoué sur l'extraction de ses archives, avec des erreurs de type :

```text
Cannot create symbolic link : Le client ne dispose pas d'un privilège nécessaire.
```

Ce blocage est lié à des privilèges Windows insuffisants pour créer des liens symboliques pendant l'extraction.


## Étapes de contournement testées

### Contournement 1 : utiliser un script Node au lieu du script Bash

Le build a été adapté pour passer par un script Node cross-platform :

- [scripts/build-electron.js](scripts/build-electron.js)
- [package.json](package.json)

### Contournement 2 : éviter la compilation depuis la source

La configuration Electron Builder a été ajustée pour limiter la compilation depuis la source des dépendances natives :

- [packages/bruno-electron/electron-builder-config.js](packages/bruno-electron/electron-builder-config.js)


## Conclusion

Le build de l'installeur Windows est actuellement bloqué par une combinaison de facteurs :

- environnement Windows sans droits administrateur,
- absence d'outils C++ de compilation,
- limitation sur la création de liens symboliques pendant l'extraction de dépendances de code signing,
- artefacts de build précédents encore présents.

## Recommandations

1. Exécuter le build sur un poste Windows avec droits administrateur.
2. Installer Visual Studio Build Tools avec les composants C++ requis.
3. Vérifier que Python est disponible sur le PATH.
4. Si l'objectif est uniquement de tester l'application, privilégier un build non installable ou unpacked.

Bienvenue sur Curly CATS, l'adaptation de Bruno pour CATS.

Après avoir cloné le repo , faites `npm install` pour build le projet.

Une fois les packages téléchargés, on peut lancer `npm run build:packages`.

Il faut ensuite packager les librairies sandbox `npm run sandbox:bundle-libraries --workspace=packages/bruno-js`

Vous pouvez finalement faire `npm run dev` pour démarrer Curly CATS.

Pour faire fonctionner l'assistant AI, il faut modifier le paramètre pour indiquer le fichier proxy pac `https://pacfile-p1-c800.ca-ts.gca/cats.pac`
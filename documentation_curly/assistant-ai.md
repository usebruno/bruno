# Assistant AI — Documentation

## Présentation

L'Assistant AI est un panel intégré à Bruno qui permet de dialoguer avec le LLM de votre entreprise directement depuis l'interface. Il est accessible via le bouton **"Assistant AI"** dans la barre de statut en bas de l'écran, à côté de Search, Cookies et Dev Tools.

Le panel est redimensionnable par glisser-déposer, et s'ouvre/se ferme sans perdre l'historique de la conversation en cours.

---

## Fonctionnement

### Contexte automatique

À chaque message envoyé, l'Assistant AI joint automatiquement le contexte de la requête Bruno active :

- **Méthode HTTP** (GET, POST, PUT, etc.)
- **URL** de la requête
- **Statut de la réponse** (ex: 200, 404, 500)
- **Corps de la réponse** (tronqué à 3 000 caractères)

Le prompt envoyé au LLM commence systématiquement par :

> *"J'utilise l'outil de test API Bruno et je souhaite que tu m'assistes dans ce cadre, voici ma demande :"*

### Streaming

Les réponses du LLM sont affichées en temps réel via streaming (Server-Sent Events / SSE), au format OpenAI-compatible.

---

## Configuration

L'Assistant AI se configure via des **variables d'environnement** à définir avant de lancer Curly CATS.

### Variables d'environnement

#### Authentification IDP (obligatoire)

Le token Bearer est obtenu automatiquement avant chaque appel au LLM via un IDP (flow OAuth 2.0 Client Credentials).

| Variable | Obligatoire | Description | Exemple |
|---|---|---|---|
| `CURLY_XCO_URL` | Oui | URL du endpoint token de l'IDP | `https://idp.monentreprise.com/oauth/token` |
| `CURLY_XCO_CLIENT_ID` | Oui | Client ID pour l'authentification Basic | `mon-client-id` |
| `CURLY_XCO_CLIENT_SECRET` | Oui | Client Secret pour l'authentification Basic | `mon-secret` |

Requête envoyée à l'IDP :
```
POST {CURLY_XCO_URL}
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=openid
```

#### API LLM

| Variable | Obligatoire | Description | Exemple |
|---|---|---|---|
| `CURLY_AI_API_URL` | Oui | URL complète de l'endpoint de l'API LLM | `https://llm.monentreprise.com/v1/chat/completions` |
| `CURLY_AI_MODEL_SUBSCRIPTION_ID` | Non | Nom du modèle à utiliser. Défaut : `gpt-4o` | `mistral-large`, `llama3`, `gpt-4o` |

### Définir les variables

#### Sous PowerShell (session courante)

```powershell
$env:CURLY_XCO_URL           = "https://idp.monentreprise.com/oauth/token"
$env:CURLY_XCO_CLIENT_ID     = "mon-client-id"
$env:CURLY_XCO_CLIENT_SECRET = "mon-secret"
$env:CURLY_AI_API_URL        = "https://llm.monentreprise.com/v1/chat/completions"
$env:CURLY_AI_MODEL_SUBSCRIPTION_ID          = "nom-du-modele"
npm run dev
```

#### Sous PowerShell (persistant pour l'utilisateur)

```powershell
[System.Environment]::SetEnvironmentVariable("CURLY_XCO_URL",           "https://idp.monentreprise.com/oauth/token", "User")
[System.Environment]::SetEnvironmentVariable("CURLY_XCO_CLIENT_ID",     "mon-client-id", "User")
[System.Environment]::SetEnvironmentVariable("CURLY_XCO_CLIENT_SECRET", "mon-secret", "User")
[System.Environment]::SetEnvironmentVariable("CURLY_AI_API_URL",        "https://llm.monentreprise.com/v1/chat/completions", "User")
[System.Environment]::SetEnvironmentVariable("CURLY_AI_MODEL_SUBSCRIPTION_ID",          "nom-du-modele", "User")
```

Redémarrer le terminal après cette commande pour que les variables soient prises en compte.

#### Via un fichier `.env` (recommandé pour le développement)

Créer un fichier `.env` à la racine du projet (non versionné) :

```env
CURLY_XCO_URL=https://idp.monentreprise.com/oauth/token
CURLY_XCO_CLIENT_ID=mon-client-id
CURLY_XCO_CLIENT_SECRET=mon-secret
CURLY_AI_API_URL=https://llm.monentreprise.com/v1/chat/completions
CURLY_AI_MODEL_SUBSCRIPTION_ID=nom-du-modele
```

Puis charger ce fichier avant de lancer Bruno :

```powershell
# PowerShell
Get-Content .env | ForEach-Object {
  if ($_ -match "^([^#][^=]*)=(.*)$") {
    [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
  }
}
npm run dev
```

> **Note :** Ajouter `.env` à `.gitignore` pour ne pas committer les clés d'API.

---

## Format d'API supporté

L'Assistant AI utilise le format **OpenAI-compatible** (standard de facto supporté par la majorité des LLMs du marché : Mistral, LLaMA, Ollama, Azure OpenAI, etc.).

### Format de la requête envoyée

```json
POST {CURLY_AI_API_URL}
Authorization: Bearer {token obtenu via IDP}
Content-Type: application/json

{
  "model": "{CURLY_AI_MODEL_SUBSCRIPTION_ID}",
  "stream": true,
  "messages": [
    {
      "role": "user",
      "content": "J'utilise l'outil de test API Bruno et je souhaite que tu m'assistes dans ce cadre, voici ma demande :\n\n[message utilisateur]\n\n---\nContexte de la requête Bruno :\n- Méthode : GET\n- URL : https://api.exemple.com/users\n- Statut de la réponse : 200\n- Corps de la réponse :\n{...}\n---"
    }
  ]
}
```

### Format de la réponse attendue (SSE)

```
data: {"choices":[{"delta":{"content":"Bonjour"}}]}
data: {"choices":[{"delta":{"content":", voici"}}]}
data: {"choices":[{"delta":{"content":" ma réponse."}}]}
data: [DONE]
```

Si votre API utilise un format différent, le handler IPC est à adapter dans :
`packages/bruno-electron/src/ipc/ai-assistant.js`

---

## Architecture technique

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `packages/bruno-app/src/components/AiAssistant/index.js` | Composant React du panel de chat |
| `packages/bruno-app/src/components/AiAssistant/StyledWrapper.js` | Styles du panel (styled-components) |
| `packages/bruno-electron/src/ipc/ai-assistant.js` | Handler IPC — appel HTTP streaming vers l'API LLM |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `packages/bruno-app/src/providers/ReduxStore/slices/app.js` | Ajout de `isAiAssistantOpen` et `toggleAiAssistant` |
| `packages/bruno-app/src/components/StatusBar/index.js` | Ajout du bouton "Assistant AI" |
| `packages/bruno-app/src/pages/Bruno/index.js` | Intégration du composant `AiAssistant` dans le layout |
| `packages/bruno-electron/src/index.js` | Enregistrement du handler `registerAiAssistantIpc` |

### Flux de données

```
Utilisateur tape un message
        ↓
AiAssistant (React) lit le contexte depuis Redux
(onglet actif → collection → item → request + response)
        ↓
ipcRenderer.invoke('send-ai-message', { messages, context })
        ↓
bruno-electron : ipc/ai-assistant.js
→ construit le prompt avec préfixe + contexte
→ appelle l'API LLM en streaming (axios)
        ↓
Pour chaque chunk SSE :
event.sender.send('ai-response-chunk', contenu)
        ↓
AiAssistant reçoit les chunks via ipcRenderer.on(...)
→ affiche la réponse en temps réel
        ↓
event.sender.send('ai-response-end') quand terminé
```

---

## Dépannage

### Le panel ne s'ouvre pas

Vérifier que Bruno a bien été relancé après les modifications. S'assurer que `npm run dev` démarre sans erreur.

### "CURLY_AI_API_URL non configurée"

La variable d'environnement `CURLY_AI_API_URL` est absente. La définir dans PowerShell **avant** de lancer `npm run dev` (voir section Configuration).

### Pas de réponse / timeout

- Vérifier que l'URL de l'API est accessible depuis la machine
- Vérifier les variables IDP (`CURLY_XCO_URL`, `CURLY_XCO_CLIENT_ID`, `CURLY_XCO_CLIENT_SECRET`)
- Vérifier que l'API supporte bien le streaming SSE (`"stream": true`)

### La réponse ne s'affiche pas en streaming

Si l'API ne renvoie pas du SSE au format OpenAI, adapter le parsing dans `packages/bruno-electron/src/ipc/ai-assistant.js`, fonction `response.data.on('data', ...)`.

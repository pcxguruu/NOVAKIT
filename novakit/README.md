# NOVAKIT

NOVAKIT is a Vite + React productivity workspace with Firebase Authentication and Cloud Firestore sync. The AI Assistant and Gemini backend have been removed; the remaining tools run without a Gemini API or separate Express server.

## Included tools

- Dashboard and local workspace commands
- Analytics
- Notes
- Planner / tasks
- Expense tracking
- Study Mode and focus timer
- Habit Tracker
- QR Tools
- Firebase sign-in and cloud workspace sync
- Local JSON backup and restore

## Requirements

- Node.js 24.12 or newer
- npm
- A Firebase project with Authentication and Cloud Firestore enabled

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   cd YOUR-REPOSITORY
   ```

2. Install packages:

   ```bash
   npm ci
   ```

3. Create your local environment file:

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env.local`.

4. In Firebase Console, create a Web App and copy its configuration values into `.env.local`.
5. Enable the sign-in provider(s) used by the app and create a Firestore database.
6. In Firestore → Rules, publish the rules from the included `firestore.rules` file. These rules allow each signed-in user to access only their own workspace document.
7. Start the development server:

   ```bash
   npm run dev
   ```

8. Create a production build:

   ```bash
   npm run build
   ```

## Deploy to GitHub Pages

This repository includes `.github/workflows/deploy.yml`. It builds and deploys the Vite app whenever you push to the `main` branch.

1. Push this project to a GitHub repository and use `main` as the deployment branch.
2. Open **Repository → Settings → Secrets and variables → Actions**.
3. Add these six **Repository secrets** using the matching values from your Firebase Web App configuration:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
5. Push a commit to `main`, or run the workflow manually from the **Actions** tab.
6. Add your GitHub Pages domain (for example, `YOUR-USERNAME.github.io`) to Firebase Authentication's authorized domains.

The Vite config automatically uses the repository path for GitHub Pages project sites.

## Firebase security checklist

- Keep Firestore Security Rules enabled. The included `firestore.rules` restricts each user to their own `users/{uid}/workspace/{workspaceId}` documents.
- Add only the GitHub Pages domain and local development domains to Firebase Authentication's authorized domains.
- A Firebase web API key is visible in a browser app by design; restrict it to the required Google APIs and configure Firebase/Firestore security rules. Never put service-account private keys in this frontend repository.
- Do not commit `.env.local`, `.env`, `node_modules`, or `dist`.

## Useful commands

```bash
npm run dev      # Start local development
npm run build    # Create production build in dist/
npm run preview  # Preview the production build locally
npm run lint     # Run Oxlint
```

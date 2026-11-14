# Deploying on Azure
This repo uses Azure Static Web Apps for deployment. 
At this time, we are utilizing what Microsoft Provisions for us during creation. In the future, we plan to adopt [this](https://docs.github.com/en/actions/use-cases-and-examples/deploying/deploying-to-azure-static-web-app), to enable a more native OIDC workflow.

## Role Creation
The default GitHub Action proved to be not work well when creating new preview environments and deleting old ones.
This caused us to rewrite this action to use an Azure Federated Identity with static site permissions enabled. 
This is scoped to this specific repo and to this specific resource.
Each non-draft, non-Dependabot PR gets its own environment connected to a shared development backend, since this repo is for frontend development only.
Draft PR updates do not deploy previews or change Azure environment settings.
Dependabot-authored PRs skip all Azure preview jobs because ordinary Actions secrets are unavailable to those runs.
They still receive the deployment-free frontend checks, and merging them retains production deployment on pushes to `azure-release`.
Marking a non-Dependabot PR ready for review triggers the preview deployment.
Closing a non-Dependabot PR triggers preview-environment cleanup only if that environment exists.
An absent preview is a successful no-op; Azure lookup, authorization, and deletion errors still fail the cleanup job.

## Frontend validation
The `Frontend CI` workflow runs for both draft and ready-for-review PRs targeting any branch, including stacked PRs, and for pushes to `azure-release`.
It uses Node.js 22 (at least 22.12), installs the lockfile with `npm ci --ignore-scripts`, runs Jest, ESLint, and TypeScript checking, and compiles the frontend with Vite.
It has read-only repository permissions and does not use Azure credentials, generate deployment configuration, or deploy artifacts.
Compilation and check errors fail the job. Bundler warnings remain visible without failing compilation.

To run the same checks locally:
```bash
npm ci --ignore-scripts --no-audit --no-fund
CI=true npm test -- --watchAll=false --runInBand
npm run check
npm run build:app
```

## Browser and toolchain compatibility
The compatibility job exercises production JavaScript, CSS, SVG imports, 3Dmol rendering with plain and compressed potential data, and PNG and PyMol/UnityMol archive downloads in Chromium.
It also starts the Vite development server over HTTP and HTTPS and checks function-component updates without a page reload.
HTTPS checks cover freshly generated certificates, trusted custom certificates, and rejection of missing certificates or mismatched private keys.
These are application and toolchain compatibility checks, not vulnerability exploit tests.

The harness copies the application into temporary directories and adds isolated CSS/SVG fixtures to exercise production asset handling.
It uses the installed dependency tree, synthetic molecular data, and a local copy of the application's jQuery dependency instead of the public CDN.
External analytics and live cloud requests are blocked.
Original source files, environment configuration, and build artifacts are not modified.
Temporary applications and local servers are cleaned up when each worker finishes.

After installing dependencies with the command above, run:
```bash
npx playwright install chromium
npm run test:compatibility
```
On Linux, use `npx playwright install --with-deps chromium` to install required system libraries.
To run only one group, use `npm run test:compatibility -- --project=production`, `--project=development-http`, `--project=development-https`, or `--project=development-custom-https`.
Failure screenshots and traces are written to the ignored `test-results` directory and uploaded by CI.

## Vite migration and runtime configuration

The migration tracked in [#88](https://github.com/Electrostatics/apbs-web/issues/88) replaces CRA and CRACO without upgrading React or the client-side router.
Jest runs independently with Babel and jsdom. ESLint retains the previous base JSX checks and also rejects undefined JSX components.
TypeScript remains on 4.9; Node declarations stay on major version 22 to match CI and avoid newer declaration syntax incompatible with that compiler.
The React plugin uses the classic JSX runtime, and automatic-runtime dependency optimization is excluded for React 16.13.
JavaScript targets and Autoprefixer use the existing Browserslist policy.

3Dmol 1.6's concatenated UMD bundle does not reliably export its viewer API under CommonJS.
The application loads its packaged no-jQuery browser distribution as a local, hashed Vite asset before importing the router.
Load failures produce a visible startup error. The existing external jQuery script is retained.
No new service worker is installed; the existing unregister behavior is retained.

`npm run generate-env` writes `public/env-config.js` using only keys listed in `env/.env`.
Nonempty environment values override defaults, values are JSON-escaped, and unlisted environment variables are not exported.
All generated values are public browser configuration, not secrets.
The analytics script reads its measurement ID from the same runtime configuration, rather than a build-time HTML placeholder.

The application has no configured CRA API proxy. The old synthetic proxy, webpack loader, and Jest transitive-proxy probes are retired with their dependencies.
If a local backend proxy is needed, configure Vite's `server.proxy` explicitly; CRA's package-level `proxy` and `setupProxy.js` conventions are not supported.
Development HTTPS still accepts `HTTPS`, `SSL_CRT_FILE`, and `SSL_KEY_FILE`; host and port use `HOST` and `PORT`.

## Deployment build and preview verification

Azure Static Web Apps builds the frontend explicitly on Node.js 22 using `npm ci` and `npm run build`, then uploads `build` with `skip_app_build`.
The API build, production/preview backend selection, and preview lifecycle are unchanged.
[public/staticwebapp.config.json](public/staticwebapp.config.json) is copied into `build` and preserves the SPA navigation fallback.
The manual Blob Storage workflow also retains the `build` output path.

Before merging the migration, verify an Azure preview:

- Open and refresh nested routes, including job-status and visualization URLs with query parameters.
- Confirm runtime settings select the development backend.
- Submit PDB2PQR and APBS jobs through the upload API.
- Check logos, announcements, and other static assets.
- Render molecular surfaces with plain and compressed potential data, and export a PNG.
- Export PyMol and UnityMol archives containing the script, structure, and potential files.

Local tests do not establish that cloud credentials, backend connectivity, or deployed routing work.
React/router modernization and unrelated dependency audit findings remain separate work.

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
It uses Node.js 22, installs the lockfile with `npm ci --ignore-scripts`, runs the complete test suite, and compiles the frontend.
It has read-only repository permissions and does not use Azure credentials, generate deployment configuration, or deploy artifacts.
The compile step sets `CI=false` so existing lint and source-map warnings remain warnings; compilation errors still fail the job.
The test step retains the normal CI behavior.

To run the same checks locally:
```bash
npm ci --ignore-scripts --no-audit --no-fund
CI=true npm test -- --watchAll=false --runInBand
CI=false ./node_modules/.bin/react-scripts build
```

## Browser and toolchain compatibility
The compatibility job exercises production JavaScript, CSS, SVG imports, 3Dmol rendering with plain and compressed potential data, and PNG downloads in Chromium.
It also starts the actual Create React App development server over HTTP and HTTPS, checks hot updates without a page reload, and exercises HTTP and SockJS WebSocket proxying.
A separate test exercises the HTTP proxy agent used by Jest's jsdom environment, including a failed upstream request.
These are dependency-update compatibility checks, not vulnerability exploit tests.

The harness copies the application into temporary directories and adds isolated CSS/SVG fixtures so build optimizers are exercised even when application assets don't use every loader.
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
To run only one group, use `npm run test:compatibility -- --project=production`, `--project=development-http`, `--project=development-https`, `--project=jest-proxy`, or `--project=build-loaders`.
Failure screenshots and traces are written to the ignored `test-results` directory and uploaded by CI.

## Dependency overrides
The npm overrides target transitive toolchain packages directly so npm 10 and npm 11 both apply them to hoisted dependencies.
TypeScript stays on major version 4, with a 4.9.5 minimum to satisfy SVGR's optional configuration-loader peer dependency without adding TypeScript 7.
`serialize-javascript` is pinned to 7.1.3, including its nested Workbox consumer.
`sockjs` uses UUID 11.1.1, which retains the CommonJS API its connection code needs.
The Jest environment's HTTP proxy agent uses `@tootallnate/once` 2.0.1.
SVGR's webpack loader is upgraded to 8.1.0 instead of forcing an incompatible SVGO version into SVGR 5.
`resolve-url-loader` is upgraded to 5.0.0 to remove its PostCSS 7 dependency.
The source-map loader test checks rewritten asset paths, query strings, fragments, and preserved source references.
`webpack-dev-middleware` 7.4.6 is pinned and checked with the current development server over HTTP and HTTPS.
Use Node.js 22 as in CI; the updated serializer requires Node.js 20 or newer.

Seven of the original Dependabot alerts remain in the webpack development-server path.
The modern server rejects CRA 5's legacy middleware hooks, and `node-forge` has no listed patched release.
The separate startup/certificate dependency migration is tracked in [#82](https://github.com/Electrostatics/apbs-web/issues/82).
These overrides do not resolve those alerts or unrelated findings from the broader npm audit.

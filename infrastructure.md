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
The `Frontend CI` workflow runs for both draft and ready-for-review PRs targeting `azure-release`, and for pushes to that branch.
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

# Deploying on Azure
This repo uses Azure Static Web Apps for deployment. 
At this time, we are utilizing what Microsoft Provisions for us during creation. In the future, we plan to adopt [this](https://docs.github.com/en/actions/use-cases-and-examples/deploying/deploying-to-azure-static-web-app), to enable a more native OIDC workflow.

## Role Creation
The default GitHub Action proved to be not work well when creating new preview environments and deleting old ones.
This caused us to rewrite this action to use an Azure Federated Identity with static site permissions enabled. 
This is scoped to this specific repo and to this specific resource.
Each PR gets its own environment connected to a shared development backend, since this repo is for frontend development only.

# APBS-Web: A New Interface for the APBS Web Server

This React application uses [Vite](https://vite.dev/) for development and production builds, and standalone Jest for unit tests.

For deployment information, see [here](./infrastructure.md).

## Table of Contents
- [Overview](#overview)
- [Available Scripts](#available-scripts)
    - [npm run dev](#npm-run-dev)
    - [npm test](#npm-test)
    - [npm run build](#npm-run-build)
    - [npm run check](#npm-run-check)
    - [npm run test:compatibility](#npm-run-testcompatibility)
- [Build Container](#available-scripts)
    - [docker build](#docker-build)
- [Reference Documentation](#reference-documentation)

## Overview
This project serves as the web interface for the APBS [web server](http://server.poissonboltzmann.org/).  The backend systems powering the interface and the main repository for this project lives in the [APBS-REST](https://github.com/Electrostatics/apbs-rest) repository.

## Available Scripts

Use Node.js 22 (22.12 or newer), matching CI. Install dependencies with:

```shell
npm ci --ignore-scripts --no-audit --no-fund
```

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

Vite applies source updates while you work. Function components support Fast Refresh; changes to class components can reset component state or reload the page.

Both `npm run dev` and `npm start` generate [public/env-config.js](public/env-config.js) from the public settings listed in [env/.env](env/.env). Nonempty shell values override those defaults. The file is loaded as `window._env_` before the application starts; these values are public, so never put credentials in this file.

`HOST` and `PORT` configure the development server. Use `HTTPS=true npm run dev` for a generated development certificate, or also set `SSL_CRT_FILE` and `SSL_KEY_FILE` for a custom certificate. Invalid or incomplete custom certificates fail startup.

### `npm test`

Launches Jest in interactive watch mode. For a single CI-style run:

```shell
CI=true npm test -- --watchAll=false --runInBand
```

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

`npm run build` generates runtime configuration before bundling. `npm run build:app` only bundles, for deployment-free CI or when configuration has already been prepared. `npm run preview` serves the built files locally; it is not a production server.

The root [index.html](index.html) is the entry point, and [public/](public/) contains files copied unchanged into the build. JSX-bearing source files use `.jsx` or `.tsx`. The existing Browserslist targets are used for JavaScript compilation and CSS prefixing.

See [deployment information](infrastructure.md) for Azure setup and preview verification.

### `npm run check`

Runs ESLint and `tsc --noEmit` explicitly. Vite compilation does not replace these checks. Individual commands are `npm run lint` and `npm run typecheck`.

### `npm run test:compatibility`

Runs Playwright browser checks against isolated production and development applications. Install Chromium first with `npx playwright install chromium`. See the [compatibility guide](infrastructure.md#browser-and-toolchain-compatibility) for details.


## Build Container
If Docker is installed on your machine, you can build this web UI as a container image.

### `docker build`
To build the image, run the following in the project directory:
```shell
docker build -t <TAG>
```
where `<TAG>` is the name you choose for the image.


## Reference Documentation
- [Ant Design](https://ant.design/) - primary component library used in this project
- [React Router](https://reactrouter.com/web/guides/quick-start) - Declarative routing for React
- [React Docs](https://reactjs.org/) - Main documentation for ReactJS

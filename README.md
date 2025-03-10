# APBS-Web: A New Interface for the APBS Web Server

*This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).  As such, this README will lift some of the content available from the original README, which can be found [here](./README_CREATEREACTAPP.md)*

For deployment information, see [here](./infrastructure.md).

## Table of Contents
- [Overview](#overview)
- [Available Scripts](#available-scripts)
    - [npm run dev](#npm-run-dev)
    - [npm test](#npm-test)
    - [npm run build](#npm-run-build)
- [Build Container](#available-scripts)
    - [docker build](#docker-build)
- [Reference Documentation](#reference-documentation)

## Overview
This project serves as the web interface for the APBS [web server](http://server.poissonboltzmann.org/).  The backend systems powering the interface and the main repository for this project lives in the [APBS-REST](https://github.com/Electrostatics/apbs-rest) repository.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

Prior to launching, a script is run to convert the environment variables from [env/.env](env/.env) to variables used by the website.

<!-- ### `npm start`
*Deprecated*
Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console. -->

### `npm test`

Launches the test runner in the interactive watch mode.<br>
See the section about [running tests](README_CREATEREACTAPP.md#running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](README_CREATEREACTAPP.md#deployment) for more information.


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

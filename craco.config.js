const redirectServedPath = require("react-dev-utils/redirectServedPathMiddleware");
const noopServiceWorker = require("react-dev-utils/noopServiceWorkerMiddleware");

module.exports = {
  devServer(config, { paths }) {
    const before = config.onBeforeSetupMiddleware;
    const https = config.https;
    delete config.onBeforeSetupMiddleware;
    delete config.onAfterSetupMiddleware;
    delete config.https;

    config.server = https ? { type: "https", options: https === true ? {} : https } : "http";
    if (Array.isArray(config.allowedHosts)) {
      config.allowedHosts = config.allowedHosts.filter(Boolean);
      if (!config.allowedHosts.length) config.allowedHosts = "auto";
    }
    config.setupExitSignals = false;
    config.setupMiddlewares = (middlewares, server) => {
      // CRA's shutdown handler still calls the removed close() API.
      server.close = () => server.stopCallback();
      before(server);
      middlewares.push(
        { name: "cra-served-path", middleware: redirectServedPath(paths.publicUrlOrPath) },
        { name: "cra-service-worker", middleware: noopServiceWorker(paths.publicUrlOrPath) }
      );
      return middlewares;
    };
    return config;
  },
};

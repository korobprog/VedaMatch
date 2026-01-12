const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  port: 8082,
  // Fix for "Cannot read properties of undefined (reading 'handle')"
  enhanceMiddleware: (middleware, server) => {
    if (!middleware) {
      return (req, res, next) => next();
    }
    return middleware;
  },
};

module.exports = config;

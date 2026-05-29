const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.unstable_allowRequireContext = true;

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
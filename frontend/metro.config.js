const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// SDK 51 needs an explicit watch folder for the shared frontend/backend contract.
config.watchFolders = [path.resolve(projectRoot, '../shared')];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;

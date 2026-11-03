// metro.config.js
// -----------------------------------------------------------------------------
// Configuración de Metro (el bundler de React Native) para que funcione dentro
// del monorepo: observa la raíz del repo y resuelve dependencias tanto locales
// como hoisteadas en el node_modules de la raíz.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1) Observar también la raíz del monorepo.
config.watchFolders = [workspaceRoot];

// 2) Buscar módulos primero en la app, luego en la raíz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;

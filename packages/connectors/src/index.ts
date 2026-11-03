/**
 * index.ts
 * -----------------------------------------------------------------------------
 * Punto de entrada del paquete @on-it/connectors.
 * Re-exporta todo lo que el resto de la app necesita importar.
 */

export * from "./types.js";
export * from "./registry.js";
export { MockConnector } from "./mock/mockConnector.js";
export * from "./instacart/instacart.js";

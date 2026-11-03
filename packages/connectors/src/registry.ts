/**
 * registry.ts
 * -----------------------------------------------------------------------------
 * El "directorio" de comercios disponibles en On It.
 *
 * El backend le pregunta a este registro: "dame el comercio X" o "dame un
 * comercio de categoría Y", y recibe un `MerchantConnector` listo para usar,
 * sin saber ni le importa si es mock o real.
 *
 * Para sumar un comercio real: creás su conector y lo registrás acá. Nada más
 * del sistema cambia.
 */

import type { MerchantCategory, MerchantConnector } from "./types.js";
import { MockConnector } from "./mock/mockConnector.js";
import {
  MC_DONALDS_CATALOG,
  MC_DONALDS_INFO,
  SUPER_CATALOG,
  SUPER_INFO,
} from "./mock/catalogs.js";

export class MerchantRegistry {
  private readonly connectors = new Map<string, MerchantConnector>();

  register(connector: MerchantConnector): void {
    this.connectors.set(connector.info.id, connector);
  }

  /** Devuelve un comercio por su id, o `undefined` si no existe. */
  get(merchantId: string): MerchantConnector | undefined {
    return this.connectors.get(merchantId);
  }

  /** Lista todos los comercios registrados. */
  list(): MerchantConnector[] {
    return [...this.connectors.values()];
  }

  /** Primer comercio de una categoría (ej. el primer fast_food disponible). */
  firstByCategory(category: MerchantCategory): MerchantConnector | undefined {
    return this.list().find((c) => c.info.category === category);
  }
}

/**
 * Crea un registro con los comercios mock cargados. Es lo que usa el backend
 * en desarrollo hasta que tengamos comercios reales.
 */
export function createDefaultRegistry(): MerchantRegistry {
  const registry = new MerchantRegistry();
  registry.register(new MockConnector(MC_DONALDS_INFO, MC_DONALDS_CATALOG));
  registry.register(new MockConnector(SUPER_INFO, SUPER_CATALOG));
  return registry;
}

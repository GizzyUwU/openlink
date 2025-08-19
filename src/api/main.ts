interface EndpointModule {
  default: {
    name: string;
    handler: (...args: any[]) => any;
  };
}

export class EdulinkAPI {
  [key: string]: any;
  ready: Promise<void>;

  constructor() {
    this.ready = this.loadEndpoints();
  }

  private async loadEndpoints() {
    const modules = import.meta.glob("./endpoints/*.ts");
    for (const [path, loader] of Object.entries(modules)) {
      try {
        const mod = (await loader()) as EndpointModule;
        const endpoint = mod.default;
        if (endpoint.name === "template") return;

        if (!endpoint) {
          console.warn(`[WARN] ${path} has no default export`);
          continue;
        }

        if (!endpoint.name || !endpoint.handler) {
          console.warn(`[WARN] ${path} default export is malformed`, endpoint);
          continue;
        }

        Object.defineProperty(this, endpoint.name, {
          value: endpoint.handler,
          writable: false,
          enumerable: false,
        });

        console.log(`[OK] Loaded endpoint: ${endpoint.name}`);
      } catch (err) {
        console.error(`[ERROR] Failed to load ${path}:`, err);
      }
    }
  }
}

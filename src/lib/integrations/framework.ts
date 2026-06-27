export interface ConnectorAction {
  id: string;
  name: string;
  description: string;
  paramsSchema: Record<string, any>;
}

export interface ConnectorTrigger {
  id: string;
  name: string;
  description: string;
}

export interface UniversalConnector {
  id: string;
  name: string;
  category: string;
  description: string;
  logoUrl?: string;
  authType: 'oauth2' | 'api_key' | 'basic';
  supportedActions: ConnectorAction[];
  supportedTriggers: ConnectorTrigger[];

  testConnection(credentials: any): Promise<boolean>;
  syncContext(credentials: any, workspaceId: string): Promise<any>;
  executeAction(actionId: string, credentials: any, params: any): Promise<any>;
  
  registerWebhook?(credentials: any, callbackUrl: string): Promise<string>;
  handleWebhook?(payload: any): Promise<{ triggerId: string; data: any }>;
}

export class ConnectorRegistry {
  private static connectors: Map<string, UniversalConnector> = new Map();

  static register(connector: UniversalConnector) {
    this.connectors.set(connector.id, connector);
    console.log(`[ConnectorRegistry] Registered connector: ${connector.name} (${connector.id})`);
  }

  static get(connectorId: string): UniversalConnector | undefined {
    return this.connectors.get(connectorId);
  }

  static getAll(): UniversalConnector[] {
    return Array.from(this.connectors.values());
  }
}

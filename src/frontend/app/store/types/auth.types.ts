import { ScopeStrings } from '../../core/current-user-permissions.config';

export interface SessionDataEndpoint {
  guid: string;
  name: string;
  version: string;
  user: {
    admin: boolean,
    guid: string,
    name: string,
    scopes: ScopeStrings[];
  };
  type: string;
}
export interface SessionUser {
  admin: boolean;
  guid: string;
  name: string;
  scopes: ScopeStrings[];
}
export interface SessionEndpoints {
  [type: string]: SessionEndpoint;
}
export interface SessionEndpoint {
  [guid: string]: SessionDataEndpoint;
}
export interface SessionData {
  endpoints?: SessionEndpoints;
  user?: SessionUser;
  version?: {
    proxy_version: string,
    database_version: number;
  };
  valid: boolean;
  uaaError?: boolean;
  upgradeInProgress?: boolean;
  sessionExpiresOn: number;
}

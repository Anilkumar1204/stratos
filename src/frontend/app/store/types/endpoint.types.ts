import { RequestSectionKeys, TRequestTypeKeys } from '../reducers/api-request-reducer/types';
import { endpointSchemaKey } from '../helpers/entity-factory';
import { ScopeStrings } from '../../core/current-user-permissions.config';

export interface INewlyConnectedEndpointInfo {
  account: string;
  admin: boolean;
  api_endpoint: IApiEndpointInfo;
  token_expiry: number;
  user: EndpointUser;
}

export const endpointStoreNames: {
  section: TRequestTypeKeys,
  type: string
} = {
    section: RequestSectionKeys.Other,
    type: endpointSchemaKey
  };

export interface IApiEndpointInfo {
  ForceQuery: boolean;
  Fragment: string;
  Host: string;
  Opaque: string;
  Path: string;
  RawPath: string;
  RawQuery: string;
  Scheme: string;
  User: object;
}
export type endpointConnectionStatus = 'connected' | 'disconnected' | 'unknown' | 'checking';
export interface EndpointModel {
  api_endpoint?: IApiEndpointInfo;
  authorization_endpoint?: string;
  cnsi_type?: EndpointType;
  doppler_logging_endpoint?: string;
  guid?: string;
  name: string;
  skip_ssl_validation?: boolean;
  token_endpoint?: string;
  user?: EndpointUser;
  metadata?: {
    metrics: string
  };
  // These are generated client side when we login
  registered?: boolean;
  connectionStatus?: endpointConnectionStatus;
  metricsAvailable: boolean;
  //

}

// Metadata for the user connected to an endpoint
export interface EndpointUser {
  guid: string;
  name: string;
  admin: boolean;
  scopes?: ScopeStrings[];
}

export interface EndpointState {
  loading: boolean;
  error: boolean;
  message: string;
}

// If we support more endpoint types in future, this type should be extended
export type EndpointType = 'cf' | 'metrics';

export interface StateUpdateAction {
  type: string;
  guid: string;
  endpointType?: EndpointType;
}

export type ApiMethod = string;

export type MethodParams<T> = T;

export interface BaseReq<T = any> {
  jsonrpc: string;
  method: ApiMethod;
  params: MethodParams<T>;
  uuid: string | null;
  id: string | null;
}

export interface SchoolApiResponse<T = any> {
  jsonrpc: string;
  result: T & {
    success: boolean;
    error?: string;
  };
  uuid: string | null;
  id: string | null;
}

export interface EdulinkApiResponse<T = any> {
  jsonrpc: string;
  result: T & {
    success: boolean;
    method: string;
    error?: string;
    metrics: {
      elapsed: number;
      timestamp: number;
    };
  };
  uuid: string | null;
  id: string | null;
}

export type ApiRequest<M extends ApiMethod, P> = BaseReq & {
  method: M;
  params: MethodParams<P>;
};

export interface User {
  readonly host: string;
  readonly password: string;
  readonly port: number;
  readonly tls: boolean;
  readonly user: string;
};

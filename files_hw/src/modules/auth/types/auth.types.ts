export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager',
}

export type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  scopes: string[];
};

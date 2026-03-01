export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
  avatarUrl?: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

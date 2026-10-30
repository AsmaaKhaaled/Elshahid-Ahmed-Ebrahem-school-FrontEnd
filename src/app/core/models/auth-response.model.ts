import { User } from './user.model';

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  user: User;
}

export interface LoginCredentials {
  identifier: string; // Email or National ID
  password: string;
  rememberMe?: boolean;
}

// School administration login (separate page, no "remember me")
export interface AdminLoginCredentials {
  identifier: string; // National ID (14 digits) or email
  password: string;
}

export interface SetInitialPasswordRequest {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
  timestamp?: string;
}

export interface TokenPayload {
  sub: string;
  role: string;
  exp: number;
  iat: number;
  mustChangePassword?: boolean;
  [key: string]: any;
}


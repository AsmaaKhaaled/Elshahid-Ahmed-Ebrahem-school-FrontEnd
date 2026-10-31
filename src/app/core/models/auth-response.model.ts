import { User } from './user.model';

export interface LoginResponse {
  status?: 'success' | string;
  requirePasswordChange?: boolean;
  forcePasswordChange?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  tempToken?: string;
  user: User;
}

export interface AuthResponse extends LoginResponse {
  tokenType?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface SetInitialPasswordRequest {
  newPassword: string;
  confirmPassword: string;
  currentPassword?: string;
}

export interface SetInitialPasswordResponse {
  status: 'success' | string;
  message: string;
  token: string;
  user: User;
}

export interface GetMeResponse {
  status: 'success' | string;
  user: User;
}

export interface LoginCredentials {
  identifier: string; // National ID (14 digits) for teachers, Student Code for students, Email for admin
  password: string;
  rememberMe?: boolean;
}

// School administration login (separate page, no "remember me")
export interface AdminLoginCredentials {
  identifier: string; // National ID (14 digits) or email
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
  timestamp?: string;
}

export interface TokenPayload {
  id?: string;
  sub?: string;
  role: string;
  isTemp?: boolean;
  exp: number;
  iat?: number;
  mustChangePassword?: boolean;
  forcePasswordChange?: boolean;
  [key: string]: any;
}


export interface RegisterRequest {
  email: string;
  password: string;
  role: number; // 1=Client, 2=Freelancer
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userId: string;
  role: number;
}

export interface CurrentUser {
  userId: string;
  email: string;
  role: number;
  kycStatus: string;
}
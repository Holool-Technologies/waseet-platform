import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { AuthResponse, CurrentUser, LoginRequest, RegisterRequest } from '../models/auth.models';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem('waseet-token'));
  private _refreshToken = signal<string | null>(localStorage.getItem('waseet-refresh'));

  currentUser = computed<CurrentUser | null>(() => {
    const token = this._token();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role === 'Client' ? 1 : 2,
        kycStatus: decoded.kycStatus
      };
    } catch { return null; }
  });

  isLoggedIn = computed(() => !!this._token());
  isClient = computed(() => this.currentUser()?.role === 1);
  isFreelancer = computed(() => this.currentUser()?.role === 2);
  token = computed(() => this._token());

  constructor(private http: HttpClient, private router: Router) {}

  register(req: RegisterRequest) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, req)
      .pipe(tap(res => this.saveTokens(res)));
  }

  login(req: LoginRequest) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, req)
      .pipe(tap(res => this.saveTokens(res)));
  }

  googleLogin(idToken: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/google`, { idToken })
      .pipe(tap(res => this.saveTokens(res)));
  }

  forgotPassword(email: string) {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${environment.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  refresh() {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, {
      refreshToken: this._refreshToken()
    }).pipe(tap(res => this.saveTokens(res)));
  }

  logout() {
    this.http.post(`${environment.apiUrl}/auth/revoke`, {
      refreshToken: this._refreshToken()
    }).subscribe();
    this.clearTokens();
    this.router.navigate(['/auth/login']);
  }

  private saveTokens(res: AuthResponse) {
    this._token.set(res.accessToken);
    this._refreshToken.set(res.refreshToken);
    localStorage.setItem('waseet-token', res.accessToken);
    localStorage.setItem('waseet-refresh', res.refreshToken);
  }

  private clearTokens() {
    this._token.set(null);
    this._refreshToken.set(null);
    localStorage.removeItem('waseet-token');
    localStorage.removeItem('waseet-refresh');
  }
}
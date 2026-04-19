import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthRequest = req.url.includes('/api/auth/');
      const isRefreshRequest = req.url.includes('/api/auth/refresh');
      const isRevokeRequest = req.url.includes('/api/auth/revoke');

      if (err.status === 401 && !isAuthRequest) {
        return auth.refresh().pipe(
          switchMap(() => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${auth.token()}` }
            });
            return next(retryReq);
          }),
          catchError(refreshErr => {
            auth.logout();
            return throwError(() => refreshErr);
          })
        );
      }

      if (err.status === 401 && (isRefreshRequest || isRevokeRequest)) {
        auth.logout();
      }

      return throwError(() => err);
    })
  );
};
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminRedirectGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.currentUser()?.role === 99)
    return router.createUrlTree(['/admin/dashboard']);
  return true;
};
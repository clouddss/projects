import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ROUTES } from '../../constants/routes.constant';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    const token = this.auth.getToken();
    
    if (!token) {
      // No valid token, redirect to login
      this.router.navigate([ROUTES.LOGIN]);
      return false;
    }

    if (this.auth.isAuthenticated()) {
      return true; // User is already authenticated
    }

    // Token exists but user data not loaded, fetch user profile
    return this.auth.getProfile().pipe(
      tap((response) => {
        if (!response || !(response as any).data?.user) {
          this.router.navigate([ROUTES.LOGIN]); // Redirect if profile is invalid
        }
      }),
      map((response) => !!(response && (response as any).data?.user)) // Convert response to boolean
    );
  }
}

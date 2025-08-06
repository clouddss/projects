import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ROUTES } from '../../constants/routes.constant';

@Injectable({
  providedIn: 'root',
})
export class RedirectAuthenticatedGuard implements CanActivate {
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
      // No token, allow access to login/signup pages
      return true;
    }

    // Check if user data is already loaded
    if (this.auth.isAuthenticated()) {
      // User is authenticated, redirect to posts
      this.router.navigate([ROUTES.POSTS]);
      return false;
    }

    // Try to get user profile to verify token validity
    return this.auth.getProfile().pipe(
      map((response) => {
        if (response && (response as any).data?.user) {
          // Token is valid and user is authenticated, redirect to posts
          this.router.navigate([ROUTES.POSTS]);
          return false;
        }
        // Token is invalid or no user data, allow access to login/signup
        return true;
      }),
      catchError(() => {
        // Error getting profile (token expired/invalid), allow access to login/signup
        return of(true);
      })
    );
  }
}
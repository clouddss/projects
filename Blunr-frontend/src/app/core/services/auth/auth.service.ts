import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, catchError, map, Observable } from 'rxjs';
import { ROUTES } from '../../constants/routes.constant';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly userSubject = new BehaviorSubject<any>(null);
  fcmToken: string = '';
  user$ = this.userSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly toast: ToastrService
  ) {}

  getUserData() {
    return this.userSubject.value;
  }
  setUserData(userData: any) {
    this.userSubject.next(userData);
  }

  setFcmToken(token: string) {
    this.fcmToken = token;
  }

  updateUserProfile(formData: FormData) {
    return this.http.put('/user/update', formData);
  }

  signup(email: string, password: string, username: string, role: string, referralCode?: string) {
    const res = this.http.post(`/auth/register`, {
      email,
      password,
      role,
      username,
      referralCode,
    });
    return res;
  }

  login(email: string, password: string, fcmToken: string, stayLoggedIn?: boolean) {
    const res = this.http.post(`/auth/login`, {
      email,
      password,
      fcmToken,
      stayLoggedIn,
    });
    return res;
  }

  getProfile(): Observable<any> {
    return this.http.get('/user/getProfile').pipe(
      map((user) => {
        this.userSubject.next((user as any).data.user);
        return user;
      }),
      catchError((err) => {
        const errorMsg = err.error.message;
        this.toast.error(errorMsg);
        return this.router.navigate([ROUTES.LOGIN]);
      })
    );
  }
  getToken(): string | null {
    // Check localStorage first for persistent tokens
    const persistentToken = localStorage.getItem('token');
    if (persistentToken) {
      try {
        const tokenData = JSON.parse(persistentToken);
        if (tokenData.persistent && tokenData.expires) {
          const expirationDate = new Date(tokenData.expires);
          if (expirationDate > new Date()) {
            return tokenData.token;
          } else {
            // Token expired, remove it
            localStorage.removeItem('token');
          }
        } else if (tokenData.persistent && !tokenData.expires) {
          // Old format, still valid
          return tokenData.token || persistentToken;
        }
      } catch {
        // Old format, treat as raw token
        return persistentToken;
      }
    }

    // Check sessionStorage for session tokens
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) {
      try {
        const tokenData = JSON.parse(sessionToken);
        return tokenData.token;
      } catch {
        // Old format, treat as raw token
        return sessionToken;
      }
    }

    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.userSubject.value;
  }

  logout() {
    this.userSubject.next(null);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    this.router.navigate([ROUTES.LOGIN]);
  }
}

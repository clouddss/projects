import { HttpInterceptorFn } from '@angular/common/http';
import envs from '../../../../envs';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getStoredToken();
  const isFormData = req.body instanceof FormData;
  
  // Build headers conditionally
  let headers = req.headers.set('Accept', 'application/json');
  
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Only set Content-Type for non-FormData requests
  if (!isFormData) {
    headers = headers.set('Content-Type', 'application/json');
  }

  const clonedReq = req.clone({
    url: `${envs.API_BASE_URL}${req.url}`,
    headers: headers,
    withCredentials: true,
  });

  return next(clonedReq);
};

function getStoredToken(): string | null {
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

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class ForgetPasswordService {
  constructor(
    private http: HttpClient,
  ) {}

  forgotPassword(email: string) {
    return this.http.post('/auth/forgot-password', { email });
  }
  matchOtp(resetData: { email: string; password: string; OTP: string }) {
    return this.http.post('/auth/reset-password', resetData);
  }
}

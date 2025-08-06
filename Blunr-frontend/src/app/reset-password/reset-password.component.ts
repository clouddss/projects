import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ROUTES } from '../core/constants/routes.constant';
import { ForgetPasswordService } from '../core/services/forget-password/forgetPassword.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent {
  private router = inject(Router);
  private fb = inject(FormBuilder);

  resetPasswordForm: FormGroup;
  isLoading = false;

  // Password visibility toggles
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private request: ForgetPasswordService,
    private toast: ToastrService
  ) {
    this.resetPasswordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        OTP: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword
      ? { passwordMismatch: true }
      : null;
  }

  isInvalid(field: string): boolean {
    const control = this.resetPasswordForm.get(field);
    return !!(control?.invalid && (control.dirty || control.touched));
  }

  get confirmPasswordError() {
    const control = this.resetPasswordForm.get('confirmPassword');
    if (!control || !(control.touched || control.dirty)) return null;
    if (control.hasError('required')) return 'Confirm Password is required';
    if (this.resetPasswordForm.hasError('passwordMismatch')) return 'Passwords do not match';
    return null;
  }

  // Toggle password visibility
  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  resetPassword() {
    if (this.resetPasswordForm.valid) {
      this.isLoading = true;
      const { email, OTP, password } = this.resetPasswordForm.value;
      this.request
        .matchOtp({ email: email ?? localStorage.getItem('email'), OTP, password })
        .subscribe({
          next: () => {
            this.toast.success('Password reset successful. You can now log in.');
            localStorage.removeItem('email');
            this.router.navigate([ROUTES.LOGIN]);
          },
          error: (err: any) => {
            this.isLoading = false;
            this.toast.error(err.error.message);
          },
          complete: () => {
            this.isLoading = false;
          },
        });
    } else {
      this.resetPasswordForm.markAllAsTouched();
    }
  }

  backToLogin() {
    this.router.navigate([ROUTES.LOGIN]);
  }
}

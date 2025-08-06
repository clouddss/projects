import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ForgetPasswordService } from '../core/services/forget-password/forgetPassword.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ROUTES } from '../core/constants/routes.constant';

@Component({
  selector: 'app-forget-password',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
})
export class ForgetPasswordComponent {
  forgetPasswordForm: FormGroup;
  isLoading: boolean;

  private activeModal = inject(NgbActiveModal);
  routes = ROUTES;

  constructor(
    private fb: FormBuilder,
    private request: ForgetPasswordService,
    private toast: ToastrService,
    private router: Router
  ) {
    this.forgetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
    this.isLoading = false;
  }

  isInvalid(controlName: string): boolean {
    const control = this.forgetPasswordForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  sendOTP() {
    if (this.forgetPasswordForm.valid) {
      this.isLoading = true;
      const { email } = this.forgetPasswordForm.value;
      this.request.forgotPassword(email).subscribe({
        next: () => {
          this.toast.success('OTP sent successfully to your email.');
          localStorage.setItem('email', email);
          this.closeForgetPasswordModel();
          this.router.navigate([this.routes.RESET_PASSWORD]);
        },
        error: (err) => {
          this.isLoading = false;
          this.toast.error(err.error.message);
        },
        complete: () => {
          this.isLoading = false;
        },
      });
    } else {
      this.forgetPasswordForm.get('email')?.markAsTouched();
    }
  }

  closeForgetPasswordModel() {
    this.activeModal.dismiss();
  }
}

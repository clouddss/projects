import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ROUTES } from '../core/constants/routes.constant';

@Component({
  selector: 'app-sign-up',
  imports: [RouterLink, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss',
})
export class SignUpComponent {
  signupForm: FormGroup;
  isLoading: boolean = false;

  routes = ROUTES;

  private router = inject(Router);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private toast: ToastrService
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      role: ['user', Validators.required],
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.signupForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  signup() {
    this.isLoading = true;
    if (this.signupForm.valid) {
      const { email, password, username, role } = this.signupForm.value;
      this.auth.signup(email, password, username, role).subscribe({
        next: (response) => {
          this.toast.success((response as any).message);
          this.router.navigate([this.routes.LOGIN]);
        },
        error: (err) => {
          this.toast.error(err.error.message);
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        },
      });
    } else {
      this.signupForm.markAllAsTouched();
      this.isLoading = false;
    }
  }
}

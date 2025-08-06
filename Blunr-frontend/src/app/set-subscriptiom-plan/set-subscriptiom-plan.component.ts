import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { UserService } from '../core/services/user/user.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { ROUTES } from '../core/constants/routes.constant';
import { AuthService } from '../core/services/auth/auth.service';

@Component({
  selector: 'app-set-subscriptiom-plan',
  templateUrl: './set-subscriptiom-plan.component.html',
  styleUrls: ['./set-subscriptiom-plan.component.scss'],
  imports: [HomePageAreaComponent, HomeSidebarComponent, FormsModule, ReactiveFormsModule],
})
export class SetSubscriptiomPlanComponent implements OnInit {
  subscriptionForm!: FormGroup;
  isSubmitting = false;
  routes = ROUTES;

  private readonly router = new Router();

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly toast: ToastrService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.subscriptionForm = this.fb.group({
      amount1: ['', [Validators.required, Validators.min(0.01)]],
      amount3: ['', [Validators.required, Validators.min(0.01)]],
      amount6: ['', [Validators.required, Validators.min(0.01)]],
    });

    const subscrptsubscriptionPrice = this.authService.getUserData().subscriptionPrice;

    this.subscriptionForm.setValue({
      amount1: subscrptsubscriptionPrice['1_month'],
      amount3: subscrptsubscriptionPrice['3_months'],
      amount6: subscrptsubscriptionPrice['6_months'],
    });
    console.log('subscription pricing : ', subscrptsubscriptionPrice);
  }

  onSubmit(): void {
    this.isSubmitting = true;
    if (this.subscriptionForm.valid) {
      const formData = this.subscriptionForm.value;

      this.userService
        .setSubscription({
          '1_month': formData.amount1,
          '3_months': formData.amount3,
          '6_months': formData.amount6,
        })
        .subscribe({
          next: (response) => {
            this.toast.success((response as any).message);
            this.router.navigate([this.routes.PROFILE]);
          },
          complete: () => {
            this.isSubmitting = false;
          },
          error: () => {
            this.isSubmitting = false;
            this.toast.error('Failed to set subscription. Please try again.');
          },
        });
    } else {
      this.isSubmitting = false;
      this.toast.warning('Please fill all required fields correctly.');
    }
  }
}

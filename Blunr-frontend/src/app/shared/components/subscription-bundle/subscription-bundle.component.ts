import { Component, inject, Input, OnInit } from '@angular/core';
import { PaymentPageComponent } from '../payment-page/payment-page.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SubscriptionType } from '../../../core/constants/common.constant';
import { JsonPipe, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../../core/services/user/user.service';

@Component({
  selector: 'app-subscription-bundle',
  imports: [NgIf],
  templateUrl: './subscription-bundle.component.html',
  styleUrl: './subscription-bundle.component.scss',
})
export class SubscriptionBundleComponent implements OnInit {
  @Input() toDisplay!: boolean;
  @Input() pricings!: { '1_month': number; '3_months': number; '6_months': number };
  @Input() creatorId!: string;

  actualPricings: { '1_month': number; '3_months': number; '6_months': number } = {
    '1_month': 0,
    '3_months': 0,
    '6_months': 0,
  };

  subscriptions = { '1_month': 0, '3_months': 0, '6_months': 0 };

  private readonly modalService = inject(NgbModal);
  private readonly router = inject(Router);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  ngOnInit(): void {
    console.log('this pricing s  : ', this.pricings);
    if (!this.pricings) {
      const userData = this.authService.getUserData();
      const pricings = userData.subscriptionPrice;
      console.log('this subscriptions : ', pricings);
      this.subscriptions = pricings;
    } else {
      this.subscriptions = this.pricings;
    }
  }

  openSubscriptionModal(amount: string, duration: '1_month' | '3_months' | '6_months') {
    const modalRef = this.modalService.open(PaymentPageComponent);
    modalRef.componentInstance.type = SubscriptionType.BUNDLE;
    modalRef.componentInstance.name = SubscriptionType.BUNDLE;
    modalRef.componentInstance.amount = parseFloat(amount);
    modalRef.componentInstance.currentPageUrl = this.router.url;
    modalRef.componentInstance.subscriptionId = this.creatorId;
    modalRef.componentInstance.subscriptionDuration = duration;
    
    // Subscribe to modal close event to refresh page data
    modalRef.result.then(() => {
      // Payment successful - refresh page to update subscription status
      window.location.reload();
    }).catch(() => {
      // Modal dismissed without payment - no action needed
    });
  }
}

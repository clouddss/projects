import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { PaymentService } from '../../../core/services/payment/payment.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SubscriptionType } from '../../../core/constants/common.constant';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ROUTES } from '../../../core/constants/routes.constant';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-page',
  imports: [ReactiveFormsModule],
  templateUrl: './payment-page.component.html',
  styleUrl: './payment-page.component.scss',
})
export class PaymentPageComponent implements OnInit {
  isLoading = false;
  subscriptionType = SubscriptionType;

  @Input() type: string = '';
  @Input() name: string = '';
  @Input() description: string = '';
  @Input() amount: string = '';
  @Input() currency: string = 'USD';
  @Input() postId: string | null = null;
  @Input() subscriptionId: string | null = null;
  @Input() messageId: string | null = null;
  @Input() recipientId: string | null = null;
  @Input() chatRoomId: string | null = null;
  @Input() senderId: string | null = null;
  @Input() receiverId: string | null = null;
  @Input() subscriptionDuration: string | null = null;
  @Input() currentPageUrl: string = '';
  successUrl: string = '';
  cancelUrl: string = '';

  paymentForm!: FormGroup;
  isEditable: boolean = false;

  @Output() paymentNotificationWindowClosed = new EventEmitter<boolean>(false);

  private readonly paymentService = inject(PaymentService);
  private readonly activeModal = inject(NgbActiveModal);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastrService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.isEditable = this.type === this.subscriptionType.TIP;

    this.paymentForm = this.fb.group({
      amount: [this.amount, [Validators.required, Validators.min(0.01)]],
      note: [''],
      gateway: ['card', Validators.required],
    });

    const redirectParam = `redirectUrl=${encodeURIComponent(this.currentPageUrl)}`;
    this.successUrl = `${window.location.origin}${ROUTES.SUCCESS}?${redirectParam}`;
    this.cancelUrl = `${window.location.origin}${ROUTES.FAILED}?${redirectParam}`;
    console.log('✅ Initial successUrl:', this.successUrl);
    console.log('✅ Initial cancelUrl:', this.cancelUrl);

    if (!this.isEditable) {
      this.paymentForm.get('amount')?.disable();
    }
  }

  payNow() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    // Special logic for TIPs
    if (
      this.type === this.subscriptionType.TIP &&
      this.chatRoomId &&
      this.senderId &&
      this.receiverId
    ) {
      const params = new URLSearchParams({
        chatRoomId: this.chatRoomId,
        senderId: this.senderId,
        receiverId: this.receiverId,
        amount: this.paymentForm.get('amount')?.value,
      });

      const note = this.paymentForm.get('note')?.value;
      if (note) {
        params.append('note', note);
      }

      params.append('redirectUrl', encodeURIComponent(this.currentPageUrl));
      this.successUrl = `${window.location.origin}${ROUTES.SUCCESS}?${params.toString()}`;
      console.log('✅ TIP successUrl:', this.successUrl);
    }

    // Special logic for BUNDLE (subscriptions)
    if (
      this.type === this.subscriptionType.BUNDLE &&
      this.subscriptionId &&
      this.subscriptionDuration
    ) {
      const params = new URLSearchParams({
        subscriptionId: this.subscriptionId,
        subscriptionDuration: this.subscriptionDuration,
        amount: this.paymentForm.get('amount')?.value,
      });

      params.append('redirectUrl', encodeURIComponent(this.currentPageUrl));
      this.successUrl = `${window.location.origin}${ROUTES.SUCCESS}?${params.toString()}`;
      console.log('✅ BUNDLE successUrl:', this.successUrl);
    }

    const formData = {
      type: this.type,
      name: this.name,
      description: this.paymentForm.get('note')?.value || 'Test Transaction',
      amount: this.paymentForm.get('amount')?.value,
      currency: this.currency,
      redirectUrl: this.successUrl,
      cancelUrl: this.cancelUrl,
      postId: this.postId,
      subscriptionId: this.subscriptionId,
      messageId: this.messageId,
      recipientId: this.recipientId,
      gateway: this.paymentForm.get('gateway')?.value || 'card',
    };

    console.log('✅ formData for createCharge:', formData);

    const gateway = this.paymentForm.get('gateway')?.value || 'card';

    // Handle card payment - redirect directly to checkout with parameters
    if (gateway === 'card') {
      const params = new URLSearchParams({
        amount: this.paymentForm.get('amount')?.value,
        currency: this.currency,
        type: this.type,
        successUrl: encodeURIComponent(this.successUrl),
        cancelUrl: encodeURIComponent(this.cancelUrl),
      });

      // Add optional parameters if they exist
      if (this.postId) params.append('postId', this.postId);
      if (this.subscriptionId) params.append('subscriptionId', this.subscriptionId);
      if (this.subscriptionDuration)
        params.append('subscriptionDuration', this.subscriptionDuration);
      if (this.messageId) params.append('messageId', this.messageId);
      if (this.recipientId) params.append('recipientId', this.recipientId);
      if (this.name) params.append('name', this.name);
      if (this.description) params.append('description', this.description);

      // Add note for tip payments
      const note = this.paymentForm.get('note')?.value;
      if (note) params.append('note', note);

      window.location.href = `https://checkout.blunr.com?${params.toString()}`;
      this.isLoading = false;
      return;
    }

    // Handle other payment gateways
    this.paymentService.createCharge(formData).subscribe({
      next: (response) => {
        let paymentUrl = '';

        switch (gateway) {
          case 'nowpayments':
            paymentUrl = response?.charge?.invoice_url;
            break;
          case 'cryptomus':
            paymentUrl = response?.charge?.result?.url || response?.charge?.url;
            break;
          default:
            paymentUrl = response?.charge?.data?.hosted_url;
        }

        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          this.toast.error('Failed to create payment.');
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error during payment creation:', err);
        this.toast.error('Something went wrong while creating payment.');
        this.isLoading = false;
      },
    });
  }

  closePaymentModel() {
    this.activeModal.dismiss();
  }

  handlePaymentWindowClose() {
    this.paymentNotificationWindowClosed.emit(true);
    this.activeModal.dismiss();

    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([this.currentPageUrl]);
    });
  }
}

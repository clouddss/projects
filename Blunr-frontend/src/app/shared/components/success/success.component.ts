import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ChatService } from '../../../core/services/chat/chat.service';
import { UserService } from '../../../core/services/user/user.service';

@Component({
  selector: 'app-success',
  imports: [],
  templateUrl: './success.component.html',
  styleUrls: ['./success.component.scss'],
})
export class SuccessComponent {
  timeLeft: number = 5;
  interval: any;
  redirectUrl: string = window.location.origin;

  private readonly route = inject(ActivatedRoute);
  private readonly chatService = inject(ChatService);
  private readonly toast = inject(ToastrService);
  private readonly userService = inject(UserService);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const chatRoomId = params.get('chatRoomId');
      const senderId = params.get('senderId');
      const receiverId = params.get('receiverId');
      const amount = params.get('amount');
      const note = params.get('note');
      const redirect = params.get('redirectUrl');
      const subscriptionId = params.get('subscriptionId');
      const subscriptionDuration = params.get('subscriptionDuration');

      console.log('✅ Success component query params:', {
        chatRoomId,
        senderId,
        receiverId,
        amount,
        note,
        redirect,
        subscriptionId,
        subscriptionDuration,
      });

      if (redirect) {
        this.redirectUrl = decodeURIComponent(redirect);
      }

      // Handle tip payments
      if (chatRoomId && senderId && receiverId && amount) {
        this.chatService
          .sendTip({
            chatRoom: chatRoomId,
            sender: senderId,
            receiver: receiverId,
            amount: Number(amount),
            note: note || undefined,
          })
          .subscribe({
            next: () => {},
            error: () => {},
          });
      }

      // Handle subscription payments
      if (subscriptionId && subscriptionDuration) {
        this.userService
          .subscribe(subscriptionId, subscriptionDuration as '1_month' | '3_months' | '6_months')
          .subscribe({
            next: () => {
              console.log('✅ Subscription completed successfully');
            },
            error: (err) => {
              console.error('❌ Subscription failed:', err);
            },
          });
      }

      this.toast.success('Payment completed successfully');
      this.startCountdown();
    });
  }

  startCountdown() {
    this.interval = setInterval(() => {
      if (this.timeLeft > 1) {
        this.timeLeft--;
      } else {
        clearInterval(this.interval);
        console.log('🔁 Redirecting to:', this.redirectUrl);
        if (window.opener) {
          window.opener.location.href = this.redirectUrl;
          window.close();
        } else {
          window.location.href = this.redirectUrl;
        }
      }
    }, 1000);
  }

  goBack() {
    if (window.opener) {
      window.opener.location.href = this.redirectUrl;
      window.close();
    } else {
      window.location.href = this.redirectUrl;
    }
  }
}

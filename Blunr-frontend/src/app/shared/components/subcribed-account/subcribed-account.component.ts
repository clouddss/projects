import { Component, inject, Input, OnInit } from '@angular/core';
import { ROUTES } from '../../../core/constants/routes.constant';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PaymentPageComponent } from '../payment-page/payment-page.component';
import { SubscriptionType } from '../../../core/constants/common.constant';
import { ChatService } from '../../../core/services/chat/chat.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ChatSelectionService } from '../chatbot/chat-selection.service';

@Component({
  selector: 'app-subcribed-account',
  imports: [],
  templateUrl: './subcribed-account.component.html',
  styleUrl: './subcribed-account.component.scss',
})
export class SubcribedAccountComponent implements OnInit {
  routes = ROUTES;

  router = inject(Router);

  @Input() creatorData!: {
    _id: string;
    username: string;
    subscriptionPrice: string;
    name: string;
    avatar: string;
  };

  _id = 'xyz';
  username = 'Blunr User';
  subscriptionPrice = '0';
  name = 'Blunr User';
  avatar = '../../../../../../assets/images/avatar.jpeg';

  private readonly modalService = inject(NgbModal);

  ngOnInit(): void {
    // Handle case where creatorData might be null or undefined
    if (this.creatorData) {
      this._id = this.creatorData._id || 'xyz';
      this.username = this.creatorData.username || 'Blunr User';
      this.subscriptionPrice = this.creatorData.subscriptionPrice || '0';
      this.name = this.creatorData.name || 'Blunr User';
      this.avatar = this.creatorData.avatar || '../../../../../../assets/images/avatar.jpeg';
    }
  }

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly toast: ToastrService,
    private readonly chatSelectionService: ChatSelectionService
  ) {}

  openSendTipModel() {
    const currentUserId = this.authService.getUserData()._id;

    this.chatService
      .createChatRoom({ members: [this._id, currentUserId], admin: this._id })
      .subscribe({
        next: (response) => {
          const chatRoomId = (response as any)._id;
          const modalRef = this.modalService.open(PaymentPageComponent);

          modalRef.componentInstance.type = SubscriptionType.TIP;
          modalRef.componentInstance.name = SubscriptionType.TIP;
          modalRef.componentInstance.currentPageUrl = this.router.url;
          modalRef.componentInstance.recipientId = this._id;
          modalRef.componentInstance.chatRoomId = chatRoomId;
          modalRef.componentInstance.senderId = currentUserId;
          modalRef.componentInstance.receiverId = this._id;
        },
        error: () => {
          const modalRef = this.modalService.open(PaymentPageComponent);

          modalRef.componentInstance.type = SubscriptionType.TIP;
          modalRef.componentInstance.name = SubscriptionType.TIP;
          modalRef.componentInstance.currentPageUrl = this.router.url;
          modalRef.componentInstance.recipientId = this._id;
        },
      });
  }

  redirectChatRoom() {
    const currentUserId = this.authService.getUserData()._id;
    this.chatService
      .createChatRoom({ members: [this._id, currentUserId], admin: this._id })
      .subscribe({
        next: (response) => {
          this.toast.success('chat room creation successful');
          this.router.navigate(['/inbox', (response as any)._id]);
        },
        error: (err) => {
          console.log('print chat room error ', err);
        },
      });
  }

  redirectToProfile() {
    const redirection = [ROUTES.PROFILE];
    const currentUserRedirected =
      this.authService.getUserData().username === this.username;

    if (!currentUserRedirected) redirection.push(this.username);
    this.router.navigate(redirection);
  }
}

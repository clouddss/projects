import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  ViewChild,
  OnDestroy,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ChatService } from '../../../core/services/chat/chat.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PaymentPageComponent } from '../payment-page/payment-page.component';
import { SubscriptionType } from '../../../core/constants/common.constant';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { LightgalleryModule } from 'lightgallery/angular';
import lgZoom from 'lightgallery/plugins/zoom';
import lgVideo from 'lightgallery/plugins/video';

import { BeforeSlideDetail } from 'lightgallery/lg-events';
import { ROUTES } from '../../../core/constants/routes.constant';
import { ToastrService } from 'ngx-toastr';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-chatbot',
  imports: [FormsModule, ReactiveFormsModule, NgIf, LightgalleryModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss'],
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly modalService = inject(NgbModal);

  messages: any[] = [];
  messageText: string = '';
  messagePrice: number = 0;
  selectedFile: File | null = null;
  selectedPreview: string | null = null;

  isMessageLocked: boolean = false;

  currentChat: string | null = null;
  currentUser: string | null = null;
  currentReceiver = '';

  currentChatId: string = '';

  messagePollingSubscription?: Subscription;

  isLoading: boolean = false;

  currentRecieverUsername: string = '';
  currentReceiverId: string = '';
  currentSenderId: string = '';

  currentUserAvatar: string = '';

  currentUserUsername: string = '';

  currentRecieverAvatar: string = '';

  emojis: string[] = [
    '😊',
    '👍',
    '🎉',
    '🚀',
    '💡',
    '❤️',
    '🔥',
    '🤣',
    '🙌',
    '👏',
    '😏',
    '🔥',
    '💦',
    '🍑',
    '🍆',
    '👅',
    '🥵',
    '😈',
    '👉',
    '👌',
    '🐱',
    '🍌',
    '🐍',
    '🏀',
    '🍒',
  ];
  cursorPosition: number = 0;

  settings = {
    counter: true,
    plugins: [lgZoom, lgVideo],
  };

  @ViewChild('scrollable') private myScrollContainer!: ElementRef;

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop =
        this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toast: ToastrService
  ) {}

  isUser!: boolean;

  ngAfterViewInit(): void {
    // Ensure chat scrolls to latest message on first load
    setTimeout(() => this.scrollToBottom());
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const currentRoomId = params.get('chatRoomId');

      if (!currentRoomId) return;
      this.currentChatId = currentRoomId;

      this.chatService.getChatRoomById(currentRoomId).subscribe({
        next: (response) => {
          const chatRoom = (response as any).data;
          const currentUser = this.authService.getUserData();
          this.isUser = currentUser.role === 'user';
          this.currentUser = currentUser._id;
          if (currentUser.role === 'user') {
            this.currentRecieverAvatar =
              chatRoom.members[0].avatar || '../../../../assets/images/avatar.jpeg';
            this.currentReceiver = chatRoom.members[0].name;
            this.currentRecieverUsername = chatRoom.members[0].username;
            this.currentReceiverId = chatRoom.members[0]._id;
            this.currentUserAvatar =
              chatRoom.members[1].avatar || '../../../../assets/images/avatar.jpeg';
            this.currentUserUsername = chatRoom.members[1].username;
            this.currentSenderId = chatRoom.members[1]._id;
          } else {
            this.currentRecieverAvatar =
              chatRoom.members[1].avatar || '../../../../assets/images/avatar.jpeg';
            this.currentReceiver = chatRoom.members[1].name;
            this.currentRecieverUsername = chatRoom.members[1].username;
            this.currentReceiverId = chatRoom.members[1]._id;
            this.currentUserAvatar =
              chatRoom.members[0].avatar ?? '../../../../assets/images/avatar.jpeg';
            this.currentUserUsername = chatRoom.members[0].username;
            this.currentSenderId = chatRoom.members[0]._id;
          }

          this.loadMessages(this.currentChatId);
          this.startMessagePolling();
        },
      });
    });
  }

  @Output() goChatBackEvent = new EventEmitter<void>();
  @Output() messageSentEvent = new EventEmitter<void>();

  goChatBack() {
    this.goChatBackEvent.emit();
  }

  openSendTipModel() {
    const modalRef = this.modalService.open(PaymentPageComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.type = SubscriptionType.TIP;
    modalRef.componentInstance.name = SubscriptionType.TIP;
    modalRef.componentInstance.currentPageUrl = this.router.url;
    modalRef.componentInstance.chatRoomId = this.currentChatId;
    modalRef.componentInstance.senderId = this.currentSenderId;
    modalRef.componentInstance.receiverId = this.currentReceiverId;
  }

  loadMessages(chatId: string, append: boolean = false) {
    this.chatService.getRoomMessages(chatId).subscribe({
      next: (data) => {
        const fetched = data as any[];
        if (append && this.messages.length > 0) {
          const currentLength = this.messages.length;
          if (fetched.length > currentLength) {
            this.messages.push(...fetched.slice(currentLength));
          }
        } else {
          this.messages = fetched;
          setTimeout(() => this.scrollToBottom());
        }
      },
      error: (err) => {
        console.error('Error fetching messages:', err);
      },
    });
  }

  startMessagePolling() {
    if (this.messagePollingSubscription) {
      this.messagePollingSubscription.unsubscribe();
    }

    this.messagePollingSubscription = interval(3000).subscribe(() => {
      if (this.currentChatId) {
        this.loadMessages(this.currentChatId, true);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      const fileType = this.selectedFile.type;

      if (fileType.startsWith('image')) {
        // If the file is an image, generate a preview
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.selectedPreview = e.target.result;
        };
        reader.readAsDataURL(this.selectedFile);
      } else if (fileType.startsWith('video')) {
        // If it's a video, use a placeholder image instead of the actual preview
        this.selectedPreview = 'assets/images/video-placeholder.png'; // Replace with your placeholder image path
      }
    } else {
      this.selectedFile = null;
      this.selectedPreview = null;
    }
  }
  formatDate(date: string) {
    if (!date) return '';
    
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMs = now.getTime() - messageDate.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return diffInSeconds <= 1 ? 'just now' : `${diffInSeconds}s ago`;
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      // For messages older than a week, show the date
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
      }).format(messageDate);
    }
  }

  onSubmit(event: Event) {
    event.preventDefault();

    if (!this.messageText.trim() && !this.selectedFile) return;

    const formData = new FormData();

    if (this.selectedFile) {
      formData.append('media', this.selectedFile);
    }

    if (this.messagePrice > 0) {
      this.isMessageLocked = true;
    }

    if (this.isMessageLocked) {
      if (this.messagePrice < 0.01)
        return this.toast.error('Locked chat must have price greater than 0.01');
      formData.append('price', `${this.messagePrice}`);
    }

    formData.append('isLocked', `${this.isMessageLocked}`);

    this.isLoading = true;
    this.chatService
      .sendMessage(this.messageText.trim(), formData, {
        chatRoom: this.currentChatId,
        receiver: this.currentReceiverId,
        sender: this.currentSenderId,
      })
      .subscribe({
        next: (_data) => {
          this.messageText = '';
          this.selectedFile = null;
          this.selectedPreview = null;
          this.isMessageLocked = false;

          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          this.scrollToBottom();
          this.loadMessages(`${this.currentChatId}`);
          this.messagePrice = 0;
          this.isLoading = false;
          
          // Emit event to parent to refresh chat list
          this.messageSentEvent.emit();
        },
        error: (err) => {
          console.error('Error sending message:', err);
          this.messages.pop();
          this.isLoading = false;
        },
      });
    return;
  }

  insertEmoji(emoji: string) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      this.messageText = this.messageText.slice(0, start) + emoji + this.messageText.slice(end);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    }
  }

  saveCursorPosition(event: any) {
    this.cursorPosition = event.target.selectionStart;
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit(event);
    }
  }

  onBeforeSlide = (_detail: BeforeSlideDetail): void => {
    // Handle slide change if needed
  };

  redirectToProfile(userName: string) {
    this.router.navigate([`${ROUTES.PROFILE}/${userName}`]);
  }

  unlockedMedia(amount: string, messageId: string, _recipientId: string) {
    const modalRef = this.modalService.open(PaymentPageComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.type = SubscriptionType.CHAT_PURCHASE;
    modalRef.componentInstance.name = SubscriptionType.CHAT_PURCHASE;
    modalRef.componentInstance.amount = amount;
    modalRef.componentInstance.messageId = messageId;
    modalRef.componentInstance.currentPageUrl = this.router.url;
    modalRef.componentInstance.recipientId = this.currentReceiverId;
  }

  isVideo(url: string): boolean {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg)$/i) !== null;
  }

  ngOnDestroy(): void {
    if (this.messagePollingSubscription) {
      this.messagePollingSubscription.unsubscribe();
    }
  }
}

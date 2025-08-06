import { Component, inject } from '@angular/core';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { ChatbotComponent } from '../shared/components/chatbot/chatbot.component';
import { NgTemplateOutlet } from '@angular/common';
import { ChatService } from '../core/services/chat/chat.service';
import { AuthService } from '../core/services/auth/auth.service';
import { EmptyDataComponent } from '../shared/components/empty-data/empty-data.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ROUTES } from '../core/constants/routes.constant';
import { ChatSelectionService } from '../shared/components/chatbot/chat-selection.service';

@Component({
  selector: 'app-message',
  imports: [
    HomePageAreaComponent,
    HomeSidebarComponent,
    ChatbotComponent,
    NgTemplateOutlet,
    EmptyDataComponent,
  ],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
})
export class MessageComponent {
  isChatisOpened: boolean = false;
  userChatRooms: any[] = [];
  role = 'creator';

  router = inject(Router);

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly chatSelectionService: ChatSelectionService,
    private readonly route: ActivatedRoute
  ) {}

  openChatOfUser(chatId: string) {
    this.isChatisOpened = true;
    this.router.navigate([ROUTES.INBOX, chatId]);
    
    // Mark all messages in this room as read
    this.chatService.markRoomAsRead(chatId).subscribe({
      next: () => {
        // Refresh the chat rooms to update unread counts
        this.loadUserChatRooms();
      },
      error: (err) => {
        console.error('Error marking room as read:', err);
      }
    });
  }

  goChatBack() {
    this.isChatisOpened = false;
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

  ngOnInit() {
    this.authService.user$.subscribe((userData) => {
      this.role = userData.role;
    });
    this.chatSelectionService.isChatSelected$.subscribe((value) => {
      this.isChatisOpened = value ?? false;
    });
    this.route.paramMap.subscribe((params) => {
      const currentRoomId = params.get('chatRoomId');
      if (currentRoomId) this.chatSelectionService.setChatState(true);
      else this.chatSelectionService.setChatState(false);
    });

    this.loadUserChatRooms();
  }

  loadUserChatRooms() {
    this.chatService.getUserChatRooms().subscribe({
      next: (data) => {
        this.userChatRooms = (data as any[]).sort((a, b) => {
          // Sort by most recent message timestamp (fallback frontend sorting)
          const timestampA = new Date(a.lastMessage?.timestamp || 0).getTime();
          const timestampB = new Date(b.lastMessage?.timestamp || 0).getTime();
          return timestampB - timestampA;
        });
      },
      error: (err) => {
        console.error('Error fetching posts:', err);
      },
    });
  }
}

import { Component, inject, OnInit } from '@angular/core';
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
import { CustomNamesService } from '../core/services/custom-names/custom-names.service';

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
export class MessageComponent implements OnInit {
  isChatisOpened: boolean = false;
  userChatRooms: any[] = [];
  role = 'creator';

  router = inject(Router);

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly chatSelectionService: ChatSelectionService,
    private readonly route: ActivatedRoute,
    private readonly customNamesService: CustomNamesService
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
        console.log('Chat rooms data:', data);
        this.userChatRooms = (data as any[]).sort((a, b) => {
          // Sort by most recent message timestamp (fallback frontend sorting)
          const timestampA = new Date(a.lastMessage?.timestamp || 0).getTime();
          const timestampB = new Date(b.lastMessage?.timestamp || 0).getTime();
          return timestampB - timestampA;
        });
        // Log the first room to debug the structure
        if (this.userChatRooms.length > 0) {
          console.log('First room structure:', this.userChatRooms[0]);
          console.log('Members:', this.userChatRooms[0].members);
        }
      },
      error: (err) => {
        console.error('Error fetching posts:', err);
      },
    });
  }

  getAvatarForRoom(room: any): string {
    const defaultAvatar = '../../../../assets/images/avatar.jpeg';
    if (!room || !room.members || !Array.isArray(room.members)) {
      return defaultAvatar;
    }
    
    // Find the other member (not the current user)
    const currentUser = this.authService.getUserData();
    const otherMember = room.members.find((member: any) => member._id !== currentUser?._id);
    
    if (!otherMember) {
      // Fallback to original logic
      const memberIndex = this.role === 'user' ? 0 : 1;
      const member = room.members[memberIndex];
      return member?.avatar || defaultAvatar;
    }
    
    return otherMember?.avatar || defaultAvatar;
  }

  getUsernameForRoom(room: any): string {
    if (!room || !room.members || !Array.isArray(room.members)) {
      return '';
    }
    
    // Find the other member (not the current user)
    const currentUser = this.authService.getUserData();
    const otherMember = room.members.find((member: any) => member._id !== currentUser?._id);
    
    if (!otherMember) {
      // Fallback to original logic
      const memberIndex = this.role === 'user' ? 0 : 1;
      const member = room.members[memberIndex];
      return member?.username || '';
    }
    
    return otherMember?.username || '';
  }

  getNameForRoom(room: any): string {
    if (!room || !room.members || !Array.isArray(room.members)) {
      return '';
    }
    
    const memberIndex = this.role === 'user' ? 0 : 1;
    const member = room.members[memberIndex];
    return member?.name || '';
  }

  /**
   * Get display name for room - includes custom name if set
   */
  getDisplayNameForRoom(room: any): string {
    if (!room || !room.members || !Array.isArray(room.members)) {
      console.log('getDisplayNameForRoom: No room or members');
      return 'Unknown User';
    }
    
    // Find the other member (not the current user)
    const currentUser = this.authService.getUserData();
    const otherMember = room.members.find((member: any) => member._id !== currentUser?._id);
    
    if (!otherMember) {
      console.log('getDisplayNameForRoom: Using fallback logic, current user:', currentUser?._id, 'members:', room.members.map((m: any) => ({ id: m._id, username: m.username })));
      // Fallback to original logic if we can't find by ID comparison
      const memberIndex = this.role === 'user' ? 0 : 1;
      const member = room.members[memberIndex];
      
      if (!member) {
        return 'Unknown User';
      }
      
      return this.customNamesService.getFormattedDisplayName(
        member._id,
        member.username || member.name || 'Unknown User'
      );
    }
    
    const displayName = this.customNamesService.getFormattedDisplayName(
      otherMember._id,
      otherMember.username || otherMember.name || 'Unknown User'
    );
    
    console.log('getDisplayNameForRoom: Found other member:', otherMember.username, 'display name:', displayName);
    return displayName;
  }

  /**
   * Get user ID for room to use with custom names
   */
  getUserIdForRoom(room: any): string {
    if (!room || !room.members || !Array.isArray(room.members)) {
      return '';
    }
    
    const memberIndex = this.role === 'user' ? 0 : 1;
    const member = room.members[memberIndex];
    return member?._id || '';
  }

  /**
   * Show prompt to change display name for a user
   */
  changeDisplayName(room: any, event: Event): void {
    event.stopPropagation(); // Prevent opening the chat
    
    if (!room || !room.members || !Array.isArray(room.members)) {
      return;
    }
    
    // Find the other member (not the current user)
    const currentUser = this.authService.getUserData();
    const otherMember = room.members.find((member: any) => member._id !== currentUser?._id);
    
    let targetMember = otherMember;
    if (!otherMember) {
      // Fallback to original logic
      const memberIndex = this.role === 'user' ? 0 : 1;
      targetMember = room.members[memberIndex];
    }
    
    if (!targetMember) {
      return;
    }
    
    const originalUsername = targetMember.username || targetMember.name || '';
    const currentCustomName = this.customNamesService.getCustomName(targetMember._id);
    const currentDisplayName = currentCustomName ? currentCustomName.customName : originalUsername;
    
    const newName = prompt(
      `Change display name for @${originalUsername}:`,
      currentDisplayName
    );
    
    if (newName !== null) { // null means user cancelled
      if (newName.trim() === '') {
        // Remove custom name if empty
        this.customNamesService.removeCustomName(targetMember._id);
      } else {
        this.customNamesService.setCustomName(targetMember._id, newName.trim(), originalUsername);
      }
    }
  }
}

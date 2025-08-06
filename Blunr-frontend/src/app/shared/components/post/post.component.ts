import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ROUTES } from '../../../core/constants/routes.constant';
import { ReportPostComponent } from '../../../report-post/report-post.component';
import { PaymentPageComponent } from '../payment-page/payment-page.component';
import { SubscriptionType } from '../../../core/constants/common.constant';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ConfirmationDialogService } from '../../../confirmation-dialog/confirmation-dialog.service';
import { PostService } from '../../../core/services/post/post.service';
import { ToastrService } from 'ngx-toastr';
import { routes } from '../../../app.routes';
import { ChatService } from '../../../core/services/chat/chat.service';
import { CommentService } from '../../../core/services/comment/comment.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-post',
  imports: [NgTemplateOutlet, CommonModule, FormsModule],
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss'],
})
export class PostComponent implements OnInit {
  @Input() postData!: any;
  @Input() userSubscriptionStatus?: boolean;

  routes = ROUTES;
  postId: string = '';
  isPostLike: boolean = false;
  isFree = false;
  caption = '';
  isMultiOrSingle = 0;
  creatorName = '';
  creatorHandle = '';
  uploadedAt = '';
  creatorId: string = '';
  likesCount = 0;
  userName = '';
  avatar = '../../../../../../assets/images/avatar.jpeg';
  isReportable: boolean = true;
  isSubscribed: boolean = false;

  // Comment properties
  comments: any[] = [];
  showComments: boolean = false;
  newComment: string = '';
  commentsCount: number = 0;

  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  constructor(
    private readonly authService: AuthService,
    private readonly confirmationService: ConfirmationDialogService,
    private readonly postService: PostService,
    private readonly toast: ToastrService,
    private readonly chatService: ChatService,
    private readonly commentService: CommentService
  ) {}

  ngOnInit(): void {
    this.caption = this.postData?.caption;
    this.isFree = !this.postData?.isLocked;
    this.isSubscribed = this.userSubscriptionStatus !== undefined ? this.userSubscriptionStatus : this.postData.isSubscribed;
    this.isMultiOrSingle = this.postData?.media.length;
    this.creatorName = this.postData?.creator?.name ?? 'Blunr Creator';
    this.creatorHandle = this.postData?.creator?.username;
    this.uploadedAt = this.timeAgo(this.postData?.createdAt);
    this.creatorId = this.postData?.creator?._id;
    this.likesCount = this.postData?.likes.length;
    this.isPostLike = this.postData?.isLikedByUser;
    this.avatar = this.postData?.creator?.avatar ?? '../../../../../../assets/images/avatar.jpeg';
    const currentUser = this.authService.getUserData();
    this.postId = this.postData._id;
    const id = currentUser._id;
    if (this.creatorId === id) this.isReportable = false;
    else this.isReportable = true;
  }

  clickOnLikeButton() {
    this.isPostLike = !this.isPostLike;
    if (this.isPostLike) {
      this.likesCount = this.postData?.likes.length + 1;
    } else {
      this.likesCount = this.postData?.likes.length === 0 ? 0 : this.postData?.likes.length - 1;
    }
    this.postService.likePost(this.postId).subscribe({
      next: (repsonse) => {
        this.likesCount = (repsonse as any).likesCount;
      },
    });
  }

  redirectToProfile(profileId: string) {
    const currentPath = window.location.pathname;

    if (currentPath.includes('/profile/')) {
      window.scrollTo(0, 0);
    }

    const redirection = [ROUTES.PROFILE];
    const currentUserRedirected = this.authService.getUserData().username === profileId;
    if (!currentUserRedirected) redirection.push(profileId);
    this.router.navigate(redirection);
  }

  openSendTipModel(recipientId: string) {
    const currentUserId = this.authService.getUserData()._id;

    this.chatService
      .createChatRoom({ members: [recipientId, currentUserId], admin: recipientId })
      .subscribe({
        next: (response) => {
          const chatRoomId = (response as any)._id;
          const modalRef = this.modalService.open(PaymentPageComponent);
          modalRef.componentInstance.type = SubscriptionType.TIP;
          modalRef.componentInstance.name = SubscriptionType.TIP;
          modalRef.componentInstance.recipientId = recipientId;
          modalRef.componentInstance.currentPageUrl = this.router.url;
          modalRef.componentInstance.chatRoomId = chatRoomId;
          modalRef.componentInstance.senderId = currentUserId;
          modalRef.componentInstance.receiverId = recipientId;
        },
        error: () => {
          const modalRef = this.modalService.open(PaymentPageComponent);
          modalRef.componentInstance.type = SubscriptionType.TIP;
          modalRef.componentInstance.name = SubscriptionType.TIP;
          modalRef.componentInstance.recipientId = recipientId;
          modalRef.componentInstance.currentPageUrl = this.router.url;
        },
      });
  }

  openReportModal() {
    const reportModalRef = this.modalService.open(ReportPostComponent);
    reportModalRef.componentInstance.reportedPostId = this.postData._id;
    reportModalRef.componentInstance.creatorName = this.postData.creator.name ?? 'Blunr Creator';
    reportModalRef.componentInstance.creatorUsername =
      this.postData.creator.username ?? 'Blunr Creator';
    reportModalRef.componentInstance.creatorProfile =
      this.postData.creator.avatar ?? '../../../../assets/images/avatar.jpeg';
  }

  openDeleteModal() {
    this.confirmationService
      .confirm('Delete Post', 'Are you sure you want to delete this post ?')
      .then((confirmed) => {
        if (confirmed)
          this.postService.deletePost(this.postId).subscribe({
            next: (repsonse) => {
              this.toast.success((repsonse as any).message);
            },
          });
      });
  }

  getMediaType(url: string): 'image' | 'video' | 'unknown' {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = pathname.split('.').pop()?.toLowerCase();

      if (extension) {
        if (imageExtensions.includes(extension)) {
          return 'image';
        } else if (videoExtensions.includes(extension)) {
          return 'video';
        }
      }
    } catch (error) {
      console.error('Invalid URL:', url);
    }

    return 'unknown';
  }

  timeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
      return `yesterday`;
    }

    return `${diffInDays} days ago`;
  }

  openPaymentPage(postId: string, recipientId: string) {
    if (!this.isSubscribed) {
      return this.redirectToProfile(this.creatorHandle);
    }
    const modalRef = this.modalService.open(PaymentPageComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.type = SubscriptionType.POST;
    modalRef.componentInstance.name = SubscriptionType.POST;
    modalRef.componentInstance.amount = this.postData?.price;
    modalRef.componentInstance.postId = postId;
    modalRef.componentInstance.recipientId = recipientId;
    modalRef.componentInstance.currentPageUrl = this.router.url;
  }

  // Comment functionality
  toggleComments() {
    this.showComments = !this.showComments;
    if (this.showComments && this.comments.length === 0) {
      this.loadComments();
    }
  }

  loadComments() {
    this.commentService.getPostComments(this.postId).subscribe({
      next: (response) => {
        // Backend returns comments in response.data
        this.comments = response?.data || [];
        this.commentsCount = this.comments.length;
      },
      error: (err) => {
        console.error('Error loading comments:', err);
        this.comments = []; // Ensure comments is always an array
      }
    });
  }

  addComment() {
    if (!this.newComment.trim()) return;

    this.commentService.addComment(this.postId, this.newComment.trim()).subscribe({
      next: (response) => {
        // Ensure comments is initialized as an array
        if (!Array.isArray(this.comments)) {
          this.comments = [];
        }
        this.comments.push(response.comment);
        this.commentsCount = this.comments.length;
        this.newComment = '';
        this.toast.success('Comment added successfully');
      },
      error: (err) => {
        console.error('Error adding comment:', err);
        this.toast.error('Failed to add comment');
      }
    });
  }

  toggleCommentLike(commentId: string) {
    // Optimistic update - immediately toggle the UI
    if (Array.isArray(this.comments)) {
      const commentIndex = this.comments.findIndex(c => c._id === commentId);
      if (commentIndex !== -1) {
        const comment = this.comments[commentIndex];
        const currentUserId = this.authService.getUserData()._id;
        
        // Toggle isLiked immediately
        comment.isLiked = !comment.isLiked;
        
        // Update likes array optimistically
        if (comment.isLiked) {
          // Add current user to likes if not already there
          if (!comment.likes) comment.likes = [];
          if (!comment.likes.includes(currentUserId)) {
            comment.likes.push(currentUserId);
          }
        } else {
          // Remove current user from likes
          if (comment.likes) {
            comment.likes = comment.likes.filter((userId: string) => userId !== currentUserId);
          }
        }
      }
    }

    // Then make the API call
    this.commentService.toggleLikeComment(commentId).subscribe({
      next: (response) => {
        // Update with server response to ensure consistency
        if (Array.isArray(this.comments)) {
          const commentIndex = this.comments.findIndex(c => c._id === commentId);
          if (commentIndex !== -1) {
            // Preserve the isLiked state we set optimistically, but update likes array from server
            const currentUserId = this.authService.getUserData()._id;
            const serverComment = response.comment;
            
            this.comments[commentIndex] = {
              ...serverComment,
              isLiked: serverComment.likes?.includes(currentUserId) || false
            };
          }
        }
      },
      error: (err) => {
        console.error('Error toggling comment like:', err);
        // Revert optimistic update on error
        if (Array.isArray(this.comments)) {
          const commentIndex = this.comments.findIndex(c => c._id === commentId);
          if (commentIndex !== -1) {
            const comment = this.comments[commentIndex];
            const currentUserId = this.authService.getUserData()._id;
            
            // Revert the optimistic changes
            comment.isLiked = !comment.isLiked;
            if (comment.isLiked) {
              if (!comment.likes.includes(currentUserId)) {
                comment.likes.push(currentUserId);
              }
            } else {
              comment.likes = comment.likes.filter((userId: string) => userId !== currentUserId);
            }
          }
        }
      }
    });
  }

  formatCommentDate(date: string): string {
    if (!date) return '';
    
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMs = now.getTime() - commentDate.getTime();
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
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
      }).format(commentDate);
    }
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { PostComponent } from '../shared/components/post/post.component';
import { UserService } from '../core/services/user/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { LightgalleryModule } from 'lightgallery/angular';
import lgZoom from 'lightgallery/plugins/zoom';
import { BeforeSlideDetail } from 'lightgallery/lg-events';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PaymentPageComponent } from '../shared/components/payment-page/payment-page.component';
import { SubscriptionType } from '../core/constants/common.constant';
import { ToastrService } from 'ngx-toastr';
import { ConfirmationDialogService } from '../confirmation-dialog/confirmation-dialog.service';

@Component({
  templateUrl: './static-profile.component.html',
  styleUrls: ['./static-profile.component.scss'],
  imports: [HomePageAreaComponent, HomeSidebarComponent, PostComponent, NgIf, LightgalleryModule],
})
export class StaticProfile implements OnInit {
  isLoading = false;

  constructor(
    private readonly userService: UserService,
    private readonly route: ActivatedRoute,
    private readonly toast: ToastrService,
    private readonly confirmationService: ConfirmationDialogService
  ) { }

  activeTab: string = 'step1';

  private readonly modalService = inject(NgbModal);
  private readonly router = inject(Router);

  toDisplay: boolean = false;

  currentUser: any = {
    name: 'Blunr User',
    username: '',
    bio: 'No Bio',
    banner: '../../../../assets/images/Blunr_Logo_Final-05.png',
    avatar: '../../../../assets/images/avatar.jpeg',
    subscriptionPrices: { '1_month': 0, '3_months': 0, '6_months': 0 },
    myPosts: [],
    galleryData: [],
    isCreator: false,
    _id: '',
  };

  subscriptionData: { expiresAt: string } | null = {
    expiresAt: '0',
  };

  settings = {
    counter: true,
    plugins: [lgZoom],
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const currentUsername = (params as any).params.id;
      if (!currentUsername) return;
      window.scrollTo(0, 0);
      this.fetchUserData(currentUsername);
    });
  }
  isActiveTab(tabId: string): boolean {
    return this.activeTab === tabId;
  }

  formatDate(date: string) {
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
    return formattedDate;
  }

  fetchUserData(username: string): void {
    this.userService.getCreatorByUsername(username).subscribe({
      next: (response) => {
        const { user, posts, subscription } = response as any;
        console.log('log the user and see  : ', user);

        this.currentUser = {
          ...this.currentUser,
          ...user,
          myPosts: posts,
          myMedia: posts.map((post: any) => post.media),
        };
        this.subscriptionData = subscription;
        this.currentUser.isCreator = this.currentUser.role === 'creator';
      },
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }
  async openSubscriptionModal(duration: '1_month' | '3_months' | '6_months') {
    this.isLoading = true;

    const amount = parseFloat(
      this.currentUser.subscriptionPrice[duration]
    );

    if (amount === 0) {
      const result = await this.confirmationService.confirm(
        'Follow this creator?',
        'This will permanently follow this creator for free. You can unfollow at any time.'
      )
      if (!result) return
    }


    this.userService.subscribe(this.currentUser._id, duration).subscribe({
      next: (response) => {

        const status = (response as any).subscription.status

        if (status === 'active') {
          const message = amount === 0 ? 'You are now following this creator!' : 'Subscription activated successfully!';
          this.toast.success(message);
          this.router.navigate(['/subscribed-account']);
          return;
        }

        const modalRef = this.modalService.open(PaymentPageComponent);
        modalRef.componentInstance.type = SubscriptionType.BUNDLE;
        modalRef.componentInstance.name = SubscriptionType.BUNDLE;
        modalRef.componentInstance.amount = parseFloat(
          this.currentUser.subscriptionPrice[duration]
        );
        modalRef.componentInstance.currentPageUrl = this.router.url;
        modalRef.componentInstance.subscriptionId = (response as any).subscription._id;
      },
      error: (err) => {
        const msg = err.error.message;
        this.isLoading = false;
        this.toast.error(msg);
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  onBeforeSlide = (detail: BeforeSlideDetail): void => {
    const { index, prevIndex } = detail;
  };
}

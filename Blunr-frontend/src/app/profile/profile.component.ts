import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { PostComponent } from '../shared/components/post/post.component';
import { SubscriptionBundleComponent } from '../shared/components/subscription-bundle/subscription-bundle.component';
import { LightgalleryModule } from 'lightgallery/angular';
import lgZoom from 'lightgallery/plugins/zoom';
import { BeforeSlideDetail } from 'lightgallery/lg-events';
import { AuthService } from '../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { PostService } from '../core/services/post/post.service';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../core/services/user/user.service';

@Component({
  selector: 'app-profile',
  imports: [
    HomePageAreaComponent,
    HomeSidebarComponent,
    PostComponent,
    SubscriptionBundleComponent,
    LightgalleryModule,
    CommonModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  @ViewChild('coverInput') coverInput!: ElementRef<HTMLInputElement>;
  @ViewChild('profileInput') profileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bioInput') bioInput!: ElementRef<HTMLInputElement>;

  paramUsername: any = {};

  isNameEditable: boolean = false;
  isBioEditable: boolean = false;
  activeTab: string = 'step1';
  galleryData!: any;
  settings = {
    counter: true,
    plugins: [lgZoom],
  };

  currentUser: {
    _id?: string;
    username: string;
    email: string;
    profile: string;
    banner: string;
    avatar: string;
    name: string;
    bio: string;
    role: string;
    subscriptionPrice: {
      '1_month': number;
      '3_months': number;
      '6_months': number;
    };
  } = {
    banner: '../../../../assets/images/Blunr_Logo_Final-05.png',
    email: 'blunruser@email.com',
    profile: '',
    username: 'blunr user',
    avatar: '../../../../assets/images/avatar.jpeg',
    name: 'edit name',
    bio: 'Edit your bio here',
    role: 'user',
    subscriptionPrice: {
      '1_month': 0,
      '3_months': 0,
      '6_months': 0,
    },
  };

  myPosts: any[] = [];
  myMedia: any[] = [];

  isCreator: boolean = false;
  isSubscribed: boolean = false;

  constructor(
    private readonly authService: AuthService,
    private readonly toast: ToastrService,
    private readonly postService: PostService,
    private readonly route: ActivatedRoute,
    private readonly userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.paramUsername = (params as any).params.id;

      if (!this.paramUsername) {
        this.currentUser = { ...this.currentUser, ...this.authService.getUserData() };

        const role = this.currentUser.role;
        this.isCreator = role === 'creator';

        if (this.isCreator) this.loadMyPosts();
        this.loadGalleryData();
      } else {
        this.loadCreatorProfile(this.paramUsername);
      }
    });
  }

  loadCreatorProfile(username: string) {
    this.userService.getCreatorByUsername(username).subscribe({
      next: (response) => {
        const userData = (response as any).user;
        this.currentUser = { ...this.currentUser, ...userData };
        this.myPosts = (response as any).posts;
        this.isSubscribed = (response as any).isSubscribed || false;
      },
    });
  }

  loadMyPosts() {
    this.postService.getMyPosts().subscribe({
      next: (response) => {
        this.myPosts = (response as any).posts;
      },
      error: (err) => {
        console.log('my posts error fetch  : ', err);
      },
    });
  }

  openCoverEditor(): void {
    this.coverInput.nativeElement.click();
  }

  openProfileEditor(): void {
    this.profileInput.nativeElement.click();
  }

  onFileSelected(event: Event, type: 'avatar' | 'banner'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const formData = new FormData();
      formData.append(type, file);

      this.authService.updateUserProfile(formData).subscribe({
        next: (res) => {
          this.authService.getProfile();
          this.currentUser = { ...this.currentUser, ...(res as any).data.user };
          this.authService.setUserData(this.currentUser);
          this.toast.success('Profile updated successfully!');
        },
        error: (err) => console.error('Error uploading image:', err),
      });
    }
  }

  loadGalleryData() {
    this.postService.getMyMedia().subscribe({
      next: (response) => {
        this.galleryData = (response as any).media;
      },
    });
  }

  editUsername() {
    this.isNameEditable = true;

    setTimeout(() => {
      this.nameInput.nativeElement.focus();
    });
  }

  editBio() {
    this.isBioEditable = true;
    setTimeout(() => {
      this.bioInput.nativeElement.focus();
    });
  }

  submitBio() {
    this.isBioEditable = false;
    const newBio = this.bioInput.nativeElement.value;

    if (newBio.length <= 5) {
      this.toast.error('Bio must be 5 characters minimum...');
    } else {
      const formData = new FormData();

      formData.append('bio', newBio);
      this.authService.updateUserProfile(formData).subscribe({
        next: (res) => {
          this.authService.getProfile();
          this.currentUser = { ...this.currentUser, ...(res as any).data.user };
          this.toast.success('Profile updated successfully!');
        },
        error: (err) => console.error('Error uploading image:', err),
      });
    }
  }

  submitUsername() {
    this.isNameEditable = false;
    const newName = this.nameInput.nativeElement.value;

    const formData = new FormData();

    formData.append('name', newName);

    this.authService.updateUserProfile(formData).subscribe({
      next: (res) => {
        this.authService.getProfile();
        this.currentUser = { ...this.currentUser, ...(res as any).data.user };
        this.toast.success('Profile updated successfully!');
      },
      error: (err) => console.error('Error uploading image:', err),
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  isActiveTab(tabId: string): boolean {
    return this.activeTab === tabId;
  }

  onBeforeSlide = (detail: BeforeSlideDetail): void => {
    const { index, prevIndex } = detail;
  };
}

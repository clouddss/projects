import { Component, inject } from '@angular/core';
import { PostComponent } from '../shared/components/post/post.component';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { SuggestionSectionComponent } from '../suggestion-section/suggestion-section.component';
import { HomePageHeaderAreaComponent } from '../shared/components/home-page-header-area/home-page-header-area.component';
import { PostService } from '../core/services/post/post.service';
import { CommonModule } from '@angular/common';
import { SubcribedAccountComponent } from "../shared/components/subcribed-account/subcribed-account.component";
import { UserService } from '../core/services/user/user.service';

@Component({
  selector: 'app-post-section',
  imports: [
    PostComponent,
    HomePageAreaComponent,
    HomeSidebarComponent,
    SuggestionSectionComponent,
    CommonModule,
    HomePageHeaderAreaComponent,
    SubcribedAccountComponent
],
  templateUrl: './post-section.component.html',
  styleUrl: './post-section.component.scss',
})
export class PostSectionComponent {
  posts: any[] = [];
  subsciptions: any[] = [];

  private userService = inject(UserService);

  constructor(private readonly postService: PostService) {}

  ngOnInit() {
    this.loadPosts();
    this.getMySubscribedAccounts();
  }

  loadPosts() {
    this.postService.getAllPosts().subscribe({
      next: (data) => {
        this.posts = data as any[];
      },
      error: (err) => {
        console.error('Error fetching posts:', err);
      },
    });
  }

  getMySubscribedAccounts() {
    this.userService.getMySubscriptions().subscribe((repsonse) => {
      this.subsciptions = (repsonse as any).subscriptions;
    });
  }
}

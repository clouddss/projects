import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ROUTES } from '../../../core/constants/routes.constant';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-small-post-card',
  imports: [],
  templateUrl: './small-post-card.component.html',
  styleUrl: './small-post-card.component.scss',
})
export class SmallPostCardComponent implements OnInit, OnChanges {
  @Input() creatorData!: {
    avatar: string;
    banner: string;
    username: string;
    name: string;
    _id: string;
  };

  avatar: string = '';
  banner: string = '';
  username: string = '';
  name: string = '';
  _id: string = '';

  private readonly router = inject(Router);

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.avatar = this.creatorData?.avatar ?? '../../../../../../assets/images/avatar.jpeg';
    this.banner =
      this.creatorData?.banner ??
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
    console.log('init this banner  : ', this.banner);

    this.username = this.creatorData.username ?? 'Blunrcreator';
    this.name = this.creatorData?.name ?? 'Blunr Creator';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['creatorData']) {
      const update = changes['creatorData'].currentValue;
      this.avatar = update.avatar ?? '../../../../../../assets/images/avatar.jpeg';
      this.banner = update.banner ?? '../../../../assets/images/Blunr_Logo_Final-05.png';
      this.username = update.username ?? 'Blunrcreator';
      this.name = update.name ?? 'Blunr Creator';
    }
  }

  redirectToProfile() {
    const redirection = [ROUTES.PROFILE];
    const currentUserRedirected = this.authService.getUserData().username === this.username;
    if (!currentUserRedirected) redirection.push(this.username);
    this.router.navigate(redirection);
  }
}

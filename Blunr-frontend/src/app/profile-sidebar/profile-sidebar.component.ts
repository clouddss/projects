import { Component, inject } from '@angular/core';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { ROUTES } from '../core/constants/routes.constant';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth/auth.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-profile-sidebar',
  imports: [RouterLinkActive, RouterLink, NgIf],
  templateUrl: './profile-sidebar.component.html',
  styleUrl: './profile-sidebar.component.scss',
})
export class ProfileSidebarComponent {
  routes = ROUTES;

  currentUser: {
    username: string;
    email: string;
    profile: string;
    banner: string;
    avatar: string;
    name: string;
    role: 'creator' | 'user';
  } = {
    banner: '',
    email: 'blunruser@email.com',
    profile: '',
    username: 'blunr user',
    avatar: '../../../../assets/images/avatar.jpeg',
    name: 'blunr user',
    role: 'user',
  };

  isCreator: boolean = false;

  constructor(private readonly authService: AuthService) {}

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.currentUser = { ...this.currentUser, ...user };
      this.isCreator = this.currentUser.role === 'creator';
    });
  }

  private readonly offCanvasService = inject(NgbOffcanvas);

  closeSidebar() {
    this.offCanvasService.dismiss();
  }

  logout() {
    this.offCanvasService.dismiss();
    this.authService.logout();
  }
}

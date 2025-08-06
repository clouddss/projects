import { Component, inject } from '@angular/core';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { ProfileSidebarComponent } from '../../../profile-sidebar/profile-sidebar.component';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ROUTES } from '../../../core/constants/routes.constant';
import { MobileSearchService } from '../../services/mobile-search.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './home-sidebar.component.html',
  styleUrl: './home-sidebar.component.scss',
})
export class HomeSidebarComponent {
  private readonly offcanvasService = inject(NgbOffcanvas);
  private readonly router = inject(Router);
  private readonly mobileSearchService = inject(MobileSearchService);

  username: string = 'blunr user';
  name: string = 'blunr user';
  avatar: string = '../../../../assets/images/avatar.jpeg';
  isCreator: boolean = false;

  constructor(private readonly authService: AuthService) {}

  routes = ROUTES;

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.avatar = user.avatar ?? '../../../../assets/images/avatar.jpeg';
      this.username = user.username;
      this.name = user.name ?? 'Blunr User';

      this.isCreator = user.role === 'creator';
    });
  }

  openOffCanvas() {
    const offcanvasRef = this.offcanvasService.open(ProfileSidebarComponent, { position: 'start' });
  }

  openSearch() {
    this.mobileSearchService.toggleSearchBar();
  }
}

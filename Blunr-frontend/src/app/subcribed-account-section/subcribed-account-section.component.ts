import { Component, OnInit } from '@angular/core';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { HomePageHeaderAreaComponent } from '../shared/components/home-page-header-area/home-page-header-area.component';
import { SubcribedAccountComponent } from '../shared/components/subcribed-account/subcribed-account.component';
import { UserService } from '../core/services/user/user.service';
import { EmptyDataComponent } from "../shared/components/empty-data/empty-data.component";

@Component({
  selector: 'app-subcribed-account-section',
  imports: [
    HomePageAreaComponent,
    HomeSidebarComponent,
    HomePageHeaderAreaComponent,
    SubcribedAccountComponent,
    EmptyDataComponent
],
  templateUrl: './subcribed-account-section.component.html',
  styleUrl: './subcribed-account-section.component.scss',
})
export class SubcribedAccountSectionComponent implements OnInit {
  constructor(private readonly userService: UserService) {}
  subsciptions: any[] = [];

  ngOnInit(): void {
    this.userService.getMySubscriptions().subscribe((repsonse) => {
      this.subsciptions = (repsonse as any).subscriptions;
    });
  }
}

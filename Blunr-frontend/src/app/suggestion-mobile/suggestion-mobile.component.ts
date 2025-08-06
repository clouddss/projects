import { Component } from '@angular/core';
import { HomePageHeaderAreaComponent } from "../shared/components/home-page-header-area/home-page-header-area.component";
import { HomeSidebarComponent } from "../shared/components/home-sidebar/home-sidebar.component";
import { HomePageAreaComponent } from "../shared/components/home-page-area/home-page-area.component";
import { SuggestionSectionComponent } from "../suggestion-section/suggestion-section.component";

@Component({
  selector: 'app-suggestion-mobile',
  imports: [HomePageHeaderAreaComponent, HomeSidebarComponent, HomePageAreaComponent, SuggestionSectionComponent],
  templateUrl: './suggestion-mobile.component.html',
  styleUrl: './suggestion-mobile.component.scss'
})
export class SuggestionMobileComponent {

}

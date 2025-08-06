import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MobileSearchService } from '../../services/mobile-search.service';

@Component({
  selector: 'app-home-page-header-area',
  imports: [],
  templateUrl: './home-page-header-area.component.html',
  styleUrl: './home-page-header-area.component.scss'
})
export class HomePageHeaderAreaComponent implements OnInit, OnDestroy {

  isSearchBarCollapsed!: boolean;
  private searchSubscription!: Subscription;

  private mobileSearchService = inject(MobileSearchService)

  ngOnInit() {
    this.searchSubscription = this.mobileSearchService.isSearchBarCollapsed$.subscribe(
      (status) => this.isSearchBarCollapsed = status
    );
  }

  toggleSearchBar() {
    this.mobileSearchService.toggleSearchBar();
  }

  ngOnDestroy() {
    this.searchSubscription.unsubscribe();
  }
}

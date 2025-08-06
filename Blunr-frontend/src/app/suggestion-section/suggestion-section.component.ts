import { Component, OnInit } from '@angular/core';
import { SmallPostCardComponent } from '../shared/components/small-post-card/small-post-card.component';
import { SearchComponent } from '../shared/components/search/search.component';
import { UserService } from '../core/services/user/user.service';

@Component({
  selector: 'app-suggestion-section',
  imports: [SmallPostCardComponent, SearchComponent],
  templateUrl: './suggestion-section.component.html',
  styleUrl: './suggestion-section.component.scss',
})
export class SuggestionSectionComponent implements OnInit {
  topCreators: any = [];
  isSearced: string = 'Top Creators';

  constructor(private readonly userService: UserService) {}

  ngOnInit(): void {
    this.userService.getTopCreators().subscribe((response) => {
      this.topCreators = (response as any).data;
      this.isSearced = 'Top Creators';
    });

    this.userService.searchedCreators$.subscribe((response) => {
      this.topCreators = response as any;
      this.isSearced = 'Search Results...';
    });
  }
}

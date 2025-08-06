import { Component } from '@angular/core';
import { UserService } from '../../../core/services/user/user.service';

@Component({
  selector: 'app-search',
  imports: [],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent {
  search: string = '';

  constructor(private readonly userService: UserService) {}

  onSearchChange(event: any) {
    this.search = event.target.value;
  }

  onSearchSubmit() {
    this.userService.searchCreators(this.search).subscribe((response) => {
      this.userService.setSearchedCreators((response as any).data);
    });
  }
}

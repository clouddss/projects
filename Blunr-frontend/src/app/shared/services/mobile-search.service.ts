import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MobileSearchService {

  private isSearchBarCollapsedSubject = new BehaviorSubject<boolean>(false);
  isSearchBarCollapsed$ = this.isSearchBarCollapsedSubject.asObservable();

  constructor() { }

  toggleSearchBar() {
    this.isSearchBarCollapsedSubject.next(!this.isSearchBarCollapsedSubject.value);
  }

  getSearchBarToggleStatus() {
    return this.isSearchBarCollapsedSubject.value;
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ChatSelectionService {
  private readonly isChatSelected = new BehaviorSubject<boolean | null>(null);

  isChatSelected$ = this.isChatSelected.asObservable();

  constructor(private readonly authService: AuthService) {}

  setChatState(state: boolean) {
    this.isChatSelected.next(state);
  }
}

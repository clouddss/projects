import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly searchedCreators = new BehaviorSubject<any>(null);
  searchedCreators$ = this.searchedCreators.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService
  ) {}

  getTopCreators() {
    return this.http.get('/user/getTopCreators');
  }

  setSearchedCreators(searched: any[]) {
    this.searchedCreators.next(searched);
  }

  searchCreators(search: string) {
    return this.http.get(`/user/getAllCreators?search=${search}`).pipe(
      map((user) => {
        return user;
      })
    );
  }

  getMySubscriptions() {
    return this.http.get('/subscribe/my');
  }

  setSubscription(subscriptionPrice: {
    '1_month': number;
    '3_months': number;
    '6_months': number;
  }) {
    return this.http.put('/user/setSubscription', { prices: subscriptionPrice });
  }

  getMyTransactions() {
    return this.http.get('/transaction/getAlltransactions');
  }

  getCreatorByUsername(username: string) {
    return this.http.get(`/user/profile/${username}`);
  }

  subscribe(id: string, duration: '1_month' | '3_months' | '6_months') {
    return this.http.post(`/subscribe/${id}`, { duration });
  }

  // getMySubscriptionPlan(){
  //   return this.http.get()
  // }
}

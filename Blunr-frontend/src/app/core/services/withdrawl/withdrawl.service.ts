import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WithDrawlService {
  constructor(private readonly http: HttpClient) {}

  getMyWallet() {
    return this.http.get('/wallet/getWallet');
  }

  raiseWithrawlRequest(data: {
    amount: number;
    currency: string;
    note: string;
    paymentMethod: string;
  }) {
    return this.http.post('/withdrawals/createRequest', data);
  }

  getMyWithDrawlRequests() {
    return this.http.get('/withdrawals/getMyWithdrawls');
  }
}

import { Component, OnInit } from '@angular/core';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { UserService } from '../core/services/user/user.service';
import { EmptyDataComponent } from '../shared/components/empty-data/empty-data.component';
import { DatePipe } from '@angular/common';
import { WithDrawlService } from '../core/services/withdrawl/withdrawl.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-transaction',
  imports: [HomePageAreaComponent, HomeSidebarComponent, EmptyDataComponent, DatePipe],
  templateUrl: './transaction.component.html',
  styleUrl: './transaction.component.scss',
})
export class TransactionComponent implements OnInit {
  transactions!: any;
  walletBalance: number = 0;

  constructor(
    private readonly userService: UserService,
    private readonly withdrawlService: WithDrawlService,
    private readonly toast: ToastrService
  ) {}

  ngOnInit(): void {
    this.withdrawlService.getMyWallet().subscribe({
      next: (response) => {
        const balance = (response as any).balance;
        this.walletBalance = balance;
      },
      error: (err) => {
        const errorMsg: string = err.error.message || 'Failed to fetch wallet balance';
        this.toast.error(errorMsg);
      },
    });

    this.userService.getMyTransactions().subscribe({
      next: (response) => {
        this.transactions = response;
      },
    });
  }
}

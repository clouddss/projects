import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { WithDrawlService } from '../core/services/withdrawl/withdrawl.service';

@Component({
  selector: 'app-my-withdrawls-table',
  templateUrl: './my-withdrawls-table.component.html',
  imports: [CommonModule],
  styles: [],
})
export class MyWithDrawlTable implements OnInit {
  people: any[] = [];

  constructor(private readonly withdrawlService: WithDrawlService) {}

  ngOnInit(): void {
    this.loadWithdrawls();
  }

  loadWithdrawls() {
    this.withdrawlService.getMyWithDrawlRequests().subscribe({
      next: (response) => {
        this.people = (response as any).data;
      },
      error: (err) => {},
    });
  }
}

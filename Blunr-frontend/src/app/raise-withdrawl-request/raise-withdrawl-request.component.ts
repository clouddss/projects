import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { WithDrawlService } from '../core/services/withdrawl/withdrawl.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { MyWithDrawlTable } from '../my-withdrawls-table/my-withdrawls-table.component';

@Component({
  selector: 'app-raise-withdrawl-request',
  standalone: true,
  imports: [
    HomePageAreaComponent,
    HomeSidebarComponent,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MyWithDrawlTable,
  ],
  templateUrl: './raise-withdrawl-request.component.html',
  styleUrl: './raise-withdrawl-request.component.scss',
})
export class RaiseWithdrawlRequestComponent implements OnInit {
  walletBalance: number = 0;
  withdrawForm!: FormGroup;
  isSubmitting: boolean = false;
  loadTable = true;

  constructor(
    private readonly withdrawlService: WithDrawlService,
    private readonly toast: ToastrService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.withdrawlService.getMyWallet().subscribe({
      next: (response: any) => {
        this.walletBalance = response?.balance;
      },
      error: (err) => {
        const errorMsg: string = err.error.message || 'Failed to fetch wallet balance';
        this.toast.error(errorMsg);
      },
    });

    this.withdrawForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      cryptoAddress: ['', [Validators.required]],
      note: [''],
    });
  }

  onSubmit(): void {
    if (this.withdrawForm.invalid) {
      this.toast.error('Please fill all required fields correctly.');
      return;
    }
    
    this.isSubmitting = true;
    const formData = this.withdrawForm.value;

    console.log('Withdrawal Request:', formData);

    this.withdrawlService.raiseWithrawlRequest(formData).subscribe({
      next: (response) => {
        console.log('response', response);

        this.toast.success((response as any).message);
        this.withdrawForm.setValue({
          amount: 0,
          note: '',
          cryptoAddress: '',
        });

        this.loadTable = false;
        setTimeout(() => {
          this.loadTable = true;
        }, 100);
      },
      complete: () => {
        this.isSubmitting = false;
      },
      error: (err) => {
        const errorMsg: string = err.error.message || 'Failed to submit request';
        this.toast.error(errorMsg);
        this.isSubmitting = false
      },
    });
  }
}

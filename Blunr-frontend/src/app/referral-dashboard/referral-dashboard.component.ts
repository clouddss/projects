import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { EmptyDataComponent } from '../shared/components/empty-data/empty-data.component';
import { ReferralService, ReferralStats, ReferralUser, Commission, LeaderboardEntry } from '../core/services/referral/referral.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-referral-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    HomePageAreaComponent,
    HomeSidebarComponent,
    EmptyDataComponent
  ],
  templateUrl: './referral-dashboard.component.html',
  styleUrls: ['./referral-dashboard.component.scss']
})
export class ReferralDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Main dashboard data
  referralStats: ReferralStats | null = null;
  isLoading = true;
  
  // Tab management
  activeTab = 'overview';
  
  // Referred users data
  referredUsers: ReferralUser[] = [];
  referredUsersPage = 1;
  referredUsersLimit = 10;
  referredUsersTotal = 0;
  selectedTier: 1 | 2 | undefined = undefined;
  loadingReferredUsers = false;
  
  // Commission history data
  commissions: Commission[] = [];
  commissionsPage = 1;
  commissionsLimit = 10;
  commissionsTotal = 0;
  selectedCommissionStatus: 'pending' | 'paid' | undefined = undefined;
  loadingCommissions = false;
  
  // Leaderboard data
  leaderboard: LeaderboardEntry[] = [];
  loadingLeaderboard = false;
  
  // Analytics data
  analyticsData: any = null;
  selectedAnalyticsPeriod: 'week' | 'month' | 'year' = 'month';
  loadingAnalytics = false;
  
  // Withdrawal
  withdrawAmount = 0;
  isWithdrawing = false;
  
  // Referral code generation modal
  showCodeModal = false;
  newReferralCode = '';
  isGeneratingCode = false;
  codeError = '';

  constructor(
    private readonly referralService: ReferralService,
    private readonly toast: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadLeaderboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load main dashboard data
   */
  loadDashboardData(): void {
    this.isLoading = true;
    this.referralService.getReferralStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.referralStats = response.data;
          this.referralService.setReferralStats(this.referralStats!);
          this.isLoading = false;
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to load referral stats');
          this.isLoading = false;
        }
      });
  }

  /**
   * Load referred users based on current filters
   */
  loadReferredUsers(reset = false): void {
    if (reset) {
      this.referredUsersPage = 1;
      this.referredUsers = [];
    }
    
    this.loadingReferredUsers = true;
    this.referralService.getReferredUsers(this.referredUsersPage, this.referredUsersLimit, this.selectedTier)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (reset) {
            this.referredUsers = response.data.users;
          } else {
            this.referredUsers.push(...response.data.users);
          }
          this.referredUsersTotal = response.data.total;
          this.loadingReferredUsers = false;
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to load referred users');
          this.loadingReferredUsers = false;
        }
      });
  }

  /**
   * Load commission history based on current filters
   */
  loadCommissions(reset = false): void {
    if (reset) {
      this.commissionsPage = 1;
      this.commissions = [];
    }
    
    this.loadingCommissions = true;
    this.referralService.getCommissionHistory(this.commissionsPage, this.commissionsLimit, this.selectedCommissionStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (reset) {
            this.commissions = response.data.docs || [];
          } else {
            this.commissions.push(...(response.data.docs || []));
          }
          this.commissionsTotal = response.data.totalDocs || 0;
          this.loadingCommissions = false;
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to load commissions');
          this.loadingCommissions = false;
        }
      });
  }

  /**
   * Load leaderboard data
   */
  loadLeaderboard(): void {
    this.loadingLeaderboard = true;
    this.referralService.getLeaderboard(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.leaderboard = response.data;
          this.loadingLeaderboard = false;
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to load leaderboard');
          this.loadingLeaderboard = false;
        }
      });
  }

  /**
   * Load analytics data
   */
  loadAnalytics(): void {
    this.loadingAnalytics = true;
    this.referralService.getReferralAnalytics(this.selectedAnalyticsPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.analyticsData = response.data;
          this.loadingAnalytics = false;
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to load analytics');
          this.loadingAnalytics = false;
        }
      });
  }

  /**
   * Set active tab and load corresponding data
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    switch (tab) {
      case 'referred-users':
        if (this.referredUsers.length === 0) {
          this.loadReferredUsers(true);
        }
        break;
      case 'commissions':
        if (this.commissions.length === 0) {
          this.loadCommissions(true);
        }
        break;
      case 'analytics':
        if (!this.analyticsData) {
          this.loadAnalytics();
        }
        break;
    }
  }

  /**
   * Check if tab is active
   */
  isActiveTab(tab: string): boolean {
    return this.activeTab === tab;
  }

  /**
   * Copy referral link to clipboard
   */
  copyReferralLink(): void {
    if (this.referralStats?.referralLink) {
      this.referralService.copyReferralLink(this.referralStats.referralLink);
    }
  }

  /**
   * Show generate code modal
   */
  showGenerateCodeModal(): void {
    this.showCodeModal = true;
    this.newReferralCode = '';
    this.codeError = '';
  }

  /**
   * Hide generate code modal
   */
  hideCodeModal(): void {
    this.showCodeModal = false;
    this.newReferralCode = '';
    this.codeError = '';
    this.isGeneratingCode = false;
  }

  /**
   * Handle code input validation
   */
  onCodeInput(): void {
    this.codeError = '';
    
    if (this.newReferralCode.length > 0) {
      // Convert to uppercase
      this.newReferralCode = this.newReferralCode.toUpperCase();
      
      // Validate length
      if (this.newReferralCode.length < 6) {
        this.codeError = 'Code must be at least 6 characters';
        return;
      }
      
      if (this.newReferralCode.length > 12) {
        this.codeError = 'Code must be no more than 12 characters';
        return;
      }
      
      // Validate characters (only letters and numbers)
      if (!/^[A-Z0-9]+$/.test(this.newReferralCode)) {
        this.codeError = 'Code can only contain letters and numbers';
        return;
      }
    }
  }

  /**
   * Generate new referral code
   */
  generateNewCode(): void {
    // Validate if custom code is provided
    if (this.newReferralCode.length > 0) {
      if (this.newReferralCode.length < 6 || this.newReferralCode.length > 12) {
        this.codeError = 'Code must be between 6 and 12 characters';
        return;
      }
      
      if (!/^[A-Z0-9]+$/.test(this.newReferralCode)) {
        this.codeError = 'Code can only contain letters and numbers';
        return;
      }
    }

    this.isGeneratingCode = true;
    this.referralService.generateReferralCode(this.newReferralCode || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (this.referralStats) {
            this.referralStats.referralCode = response.data.referralCode;
            this.referralStats.referralLink = response.data.shareUrl;
          }
          this.toast.success('New referral code generated!');
          this.hideCodeModal();
        },
        error: (err) => {
          this.codeError = err.error?.message || 'Failed to generate new code';
          this.isGeneratingCode = false;
        }
      });
  }

  /**
   * Filter referred users by tier
   */
  filterByTier(tier: 1 | 2 | undefined): void {
    this.selectedTier = tier;
    this.loadReferredUsers(true);
  }

  /**
   * Filter commissions by status
   */
  filterCommissionsByStatus(status: 'pending' | 'paid' | undefined): void {
    this.selectedCommissionStatus = status;
    this.loadCommissions(true);
  }

  /**
   * Load more referred users (pagination)
   */
  loadMoreReferredUsers(): void {
    if (!this.loadingReferredUsers && this.referredUsers.length < this.referredUsersTotal) {
      this.referredUsersPage++;
      this.loadReferredUsers();
    }
  }

  /**
   * Load more commissions (pagination)
   */
  loadMoreCommissions(): void {
    if (!this.loadingCommissions && this.commissions.length < this.commissionsTotal) {
      this.commissionsPage++;
      this.loadCommissions();
    }
  }

  /**
   * Change analytics period
   */
  changeAnalyticsPeriod(period: 'week' | 'month' | 'year'): void {
    this.selectedAnalyticsPeriod = period;
    this.loadAnalytics();
  }

  /**
   * Withdraw earnings
   */
  withdrawEarnings(): void {
    if (!this.withdrawAmount || this.withdrawAmount <= 0) {
      this.toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (!this.referralStats || this.withdrawAmount > this.referralStats.commissionSummary.paidCommissions) {
      this.toast.error('Insufficient balance for withdrawal');
      return;
    }

    this.isWithdrawing = true;
    this.referralService.withdrawEarnings(this.withdrawAmount)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.toast.success('Withdrawal request submitted successfully!');
          this.withdrawAmount = 0;
          this.loadDashboardData(); // Refresh stats
          this.isWithdrawing = false;
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to process withdrawal');
          this.isWithdrawing = false;
        }
      });
  }

  /**
   * Get tier badge class
   */
  getTierBadgeClass(tier: 1 | 2): string {
    return tier === 1 ? 'badge-tier1' : 'badge-tier2';
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'active': 'badge-success',
      'inactive': 'badge-secondary',
      'pending': 'badge-warning',
      'paid': 'badge-success'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  /**
   * Format currency display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }
}
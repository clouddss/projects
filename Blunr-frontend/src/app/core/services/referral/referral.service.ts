import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

/**
 * Referral Service for managing referral system functionality
 * 
 * Backend API Endpoints Used:
 * - GET /referral/dashboard - Get user's referral dashboard/statistics
 * - GET /referral/commissions?page=1&limit=10&status=pending - Get commission history 
 * - GET /referral/leaderboard - Get top referrers leaderboard
 * - GET /referral/my-code - Get user's referral code
 * - PUT /referral/update-code - Generate/update referral code
 * - POST /referral/calculate-commission - Calculate potential commission
 */

export interface ReferralStats {
  referralCode: string;
  referralLink?: string;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalCommissionEarned: number;
    tier1CommissionEarned: number;
    tier2CommissionEarned: number;
    lastActivity: string;
  };
  commissionSummary: {
    totalCommissions: number;
    pendingCommissions: number;
    paidCommissions: number;
    tier1Commissions: number;
    tier2Commissions: number;
    totalTransactions: number;
  };
  directReferrals: any[];
  tier1Referrer: any;
  tier2Referrer: any;
  recentCommissions: any[];
  performance: {
    conversionRate: string;
    activeReferrals: number;
    averageEarningsPerReferral: number;
  };
}

export interface ReferralUser {
  _id: string;
  username: string;
  avatar: string;
  joinedAt: Date;
  tier: 1 | 2;
  status: 'active' | 'inactive';
  totalEarnings: number;
}

export interface Commission {
  _id: string;
  fromUser: {
    username: string;
    avatar: string;
  };
  amount: number;
  tier: 1 | 2;
  type: 'subscription' | 'post_purchase' | 'tip';
  status: 'pending' | 'paid';
  createdAt: Date;
}

export interface LeaderboardEntry {
  _id: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  stats: {
    totalReferrals: number;
    totalCommissionEarned: number;
  };
  joinedAt: Date;
  rank: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReferralService {
  private readonly referralStats = new BehaviorSubject<ReferralStats | null>(null);
  referralStats$ = this.referralStats.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService
  ) {}

  /**
   * Get user's referral statistics
   */
  getReferralStats(): Observable<any> {
    return this.http.get('/referral/dashboard');
  }

  /**
   * Set referral stats in the behavior subject
   */
  setReferralStats(stats: ReferralStats): void {
    this.referralStats.next(stats);
  }

  /**
   * Get list of users referred by current user
   */
  getReferredUsers(page = 1, limit = 10, tier?: 1 | 2): Observable<any> {
    let params = `?page=${page}&limit=${limit}`;
    if (tier) {
      params += `&tier=${tier}`;
    }
    return this.http.get(`/referral/referred-users${params}`);
  }

  /**
   * Get commission history
   */
  getCommissionHistory(page = 1, limit = 10, status?: 'pending' | 'paid'): Observable<any> {
    let params = `?page=${page}&limit=${limit}`;
    if (status) {
      params += `&status=${status}`;
    }
    return this.http.get(`/referral/commissions${params}`);
  }

  /**
   * Get referral leaderboard
   */
  getLeaderboard(limit = 10): Observable<any> {
    return this.http.get(`/referral/leaderboard?limit=${limit}`);
  }

  /**
   * Generate or refresh referral code
   */
  generateReferralCode(newCode?: string): Observable<any> {
    const body = newCode ? { newCode } : {};
    return this.http.put('/referral/update-code', body);
  }

  /**
   * Copy referral link to clipboard
   */
  copyReferralLink(referralLink: string): void {
    navigator.clipboard.writeText(referralLink).then(() => {
      this.toast.success('Referral link copied to clipboard!');
    }).catch(() => {
      this.toast.error('Failed to copy referral link');
    });
  }

  /**
   * Get referral analytics for charts
   */
  getReferralAnalytics(period: 'week' | 'month' | 'year' = 'month'): Observable<any> {
    return this.http.get(`/referral/analytics?period=${period}`);
  }

  /**
   * Withdraw referral earnings
   */
  withdrawEarnings(amount: number): Observable<any> {
    return this.http.post('/referral/withdraw', { amount });
  }
}
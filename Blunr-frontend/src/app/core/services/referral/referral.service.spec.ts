import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToastrModule } from 'ngx-toastr';
import { ReferralService } from './referral.service';

describe('ReferralService', () => {
  let service: ReferralService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ToastrModule.forRoot()],
      providers: [ReferralService]
    });
    service = TestBed.inject(ReferralService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get referral stats', () => {
    const mockStats = {
      stats: {
        totalEarnings: 100,
        tier1Earnings: 60,
        tier2Earnings: 40,
        totalReferrals: 10,
        tier1Referrals: 6,
        tier2Referrals: 4,
        pendingEarnings: 20,
        availableBalance: 80,
        referralCode: 'TEST123',
        referralLink: 'https://blunr.com/ref/TEST123'
      }
    };

    service.getReferralStats().subscribe(response => {
      expect(response).toEqual(mockStats);
    });

    const req = httpMock.expectOne('/referral/stats');
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('should get referred users with pagination', () => {
    const mockUsers = {
      users: [],
      total: 0
    };

    service.getReferredUsers(1, 10).subscribe(response => {
      expect(response).toEqual(mockUsers);
    });

    const req = httpMock.expectOne('/referral/referred-users?page=1&limit=10');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('should get referred users with tier filter', () => {
    const mockUsers = {
      users: [],
      total: 0
    };

    service.getReferredUsers(1, 10, 1).subscribe(response => {
      expect(response).toEqual(mockUsers);
    });

    const req = httpMock.expectOne('/referral/referred-users?page=1&limit=10&tier=1');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('should get commission history', () => {
    const mockCommissions = {
      commissions: [],
      total: 0
    };

    service.getCommissionHistory(1, 10).subscribe(response => {
      expect(response).toEqual(mockCommissions);
    });

    const req = httpMock.expectOne('/referral/commissions?page=1&limit=10');
    expect(req.request.method).toBe('GET');
    req.flush(mockCommissions);
  });

  it('should get leaderboard', () => {
    const mockLeaderboard = {
      leaderboard: []
    };

    service.getLeaderboard(10).subscribe(response => {
      expect(response).toEqual(mockLeaderboard);
    });

    const req = httpMock.expectOne('/referral/leaderboard?limit=10');
    expect(req.request.method).toBe('GET');
    req.flush(mockLeaderboard);
  });

  it('should generate referral code', () => {
    const mockResponse = {
      code: 'NEWCODE123',
      link: 'https://blunr.com/ref/NEWCODE123'
    };

    service.generateReferralCode().subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/referral/generate-code');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResponse);
  });

  it('should get referral analytics', () => {
    const mockAnalytics = {
      analytics: {}
    };

    service.getReferralAnalytics('month').subscribe(response => {
      expect(response).toEqual(mockAnalytics);
    });

    const req = httpMock.expectOne('/referral/analytics?period=month');
    expect(req.request.method).toBe('GET');
    req.flush(mockAnalytics);
  });

  it('should withdraw earnings', () => {
    const mockResponse = {
      message: 'Withdrawal request submitted'
    };

    service.withdrawEarnings(50).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/referral/withdraw');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 50 });
    req.flush(mockResponse);
  });

  it('should set referral stats in behavior subject', () => {
    const mockStats = {
      totalEarnings: 100,
      tier1Earnings: 60,
      tier2Earnings: 40,
      totalReferrals: 10,
      tier1Referrals: 6,
      tier2Referrals: 4,
      pendingEarnings: 20,
      availableBalance: 80,
      referralCode: 'TEST123',
      referralLink: 'https://blunr.com/ref/TEST123'
    };

    service.setReferralStats(mockStats);
    
    service.referralStats$.subscribe(stats => {
      expect(stats).toEqual(mockStats);
    });
  });
});
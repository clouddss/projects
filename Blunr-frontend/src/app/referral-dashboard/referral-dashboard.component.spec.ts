import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastrModule } from 'ngx-toastr';
import { ReferralDashboardComponent } from './referral-dashboard.component';
import { ReferralService } from '../core/services/referral/referral.service';
import { of } from 'rxjs';

describe('ReferralDashboardComponent', () => {
  let component: ReferralDashboardComponent;
  let fixture: ComponentFixture<ReferralDashboardComponent>;
  let referralService: jasmine.SpyObj<ReferralService>;

  beforeEach(async () => {
    const referralServiceSpy = jasmine.createSpyObj('ReferralService', [
      'getReferralStats',
      'getReferredUsers', 
      'getCommissionHistory',
      'getLeaderboard',
      'copyReferralLink'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        ReferralDashboardComponent,
        HttpClientTestingModule,
        ToastrModule.forRoot()
      ],
      providers: [
        { provide: ReferralService, useValue: referralServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReferralDashboardComponent);
    component = fixture.componentInstance;
    referralService = TestBed.inject(ReferralService) as jasmine.SpyObj<ReferralService>;

    // Setup default mock responses
    referralService.getReferralStats.and.returnValue(of({
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
    }));

    referralService.getLeaderboard.and.returnValue(of({
      leaderboard: []
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboard data on init', () => {
    component.ngOnInit();
    expect(referralService.getReferralStats).toHaveBeenCalled();
    expect(referralService.getLeaderboard).toHaveBeenCalled();
  });

  it('should set active tab correctly', () => {
    component.setActiveTab('commissions');
    expect(component.activeTab).toBe('commissions');
    expect(component.isActiveTab('commissions')).toBe(true);
    expect(component.isActiveTab('overview')).toBe(false);
  });

  it('should format currency correctly', () => {
    const formatted = component.formatCurrency(123.45);
    expect(formatted).toBe('$123.45');
  });

  it('should get correct tier badge class', () => {
    expect(component.getTierBadgeClass(1)).toBe('badge-tier1');
    expect(component.getTierBadgeClass(2)).toBe('badge-tier2');
  });

  it('should get correct status badge class', () => {
    expect(component.getStatusBadgeClass('active')).toBe('badge-success');
    expect(component.getStatusBadgeClass('pending')).toBe('badge-warning');
    expect(component.getStatusBadgeClass('paid')).toBe('badge-success');
    expect(component.getStatusBadgeClass('inactive')).toBe('badge-secondary');
  });
});
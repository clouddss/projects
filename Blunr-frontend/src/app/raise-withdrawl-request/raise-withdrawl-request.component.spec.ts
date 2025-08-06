import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RaiseWithdrawlRequestComponent } from './raise-withdrawl-request.component';

describe('RaiseWithdrawlRequestComponent', () => {
  let component: RaiseWithdrawlRequestComponent;
  let fixture: ComponentFixture<RaiseWithdrawlRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaiseWithdrawlRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RaiseWithdrawlRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionBundleComponent } from './subscription-bundle.component';

describe('SubscriptionBundleComponent', () => {
  let component: SubscriptionBundleComponent;
  let fixture: ComponentFixture<SubscriptionBundleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionBundleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionBundleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

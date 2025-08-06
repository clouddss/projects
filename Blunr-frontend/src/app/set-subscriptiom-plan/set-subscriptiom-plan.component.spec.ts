import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetSubscriptiomPlanComponent } from './set-subscriptiom-plan.component';

describe('SetSubscriptiomPlanComponent', () => {
  let component: SetSubscriptiomPlanComponent;
  let fixture: ComponentFixture<SetSubscriptiomPlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetSubscriptiomPlanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetSubscriptiomPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

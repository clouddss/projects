import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubcribedAccountSectionComponent } from './subcribed-account-section.component';

describe('SubcribedAccountSectionComponent', () => {
  let component: SubcribedAccountSectionComponent;
  let fixture: ComponentFixture<SubcribedAccountSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubcribedAccountSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubcribedAccountSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

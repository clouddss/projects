import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubcribedAccountComponent } from './subcribed-account.component';

describe('SubcribedAccountComponent', () => {
  let component: SubcribedAccountComponent;
  let fixture: ComponentFixture<SubcribedAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubcribedAccountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubcribedAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

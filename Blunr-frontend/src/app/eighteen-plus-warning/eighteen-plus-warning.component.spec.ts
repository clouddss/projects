import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EighteenPlusWarningComponent } from './eighteen-plus-warning.component';

describe('EighteenPlusWarningComponent', () => {
  let component: EighteenPlusWarningComponent;
  let fixture: ComponentFixture<EighteenPlusWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EighteenPlusWarningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EighteenPlusWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuggestionMobileComponent } from './suggestion-mobile.component';

describe('SuggestionMobileComponent', () => {
  let component: SuggestionMobileComponent;
  let fixture: ComponentFixture<SuggestionMobileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuggestionMobileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuggestionMobileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

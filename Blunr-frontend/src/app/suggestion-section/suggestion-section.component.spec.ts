import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuggestionSectionComponent } from './suggestion-section.component';

describe('SuggestionSectionComponent', () => {
  let component: SuggestionSectionComponent;
  let fixture: ComponentFixture<SuggestionSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuggestionSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuggestionSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

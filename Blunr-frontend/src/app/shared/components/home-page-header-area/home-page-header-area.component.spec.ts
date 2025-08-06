import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePageHeaderAreaComponent } from './home-page-header-area.component';

describe('HomePageHeaderAreaComponent', () => {
  let component: HomePageHeaderAreaComponent;
  let fixture: ComponentFixture<HomePageHeaderAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageHeaderAreaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomePageHeaderAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

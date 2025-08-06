import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePageAreaComponent } from './home-page-area.component';

describe('HomePageAreaComponent', () => {
  let component: HomePageAreaComponent;
  let fixture: ComponentFixture<HomePageAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageAreaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomePageAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

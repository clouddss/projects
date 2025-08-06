import { Component, inject, OnInit } from '@angular/core';
import { BodyComponent } from './body/body.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EighteenPlusWarningComponent } from './eighteen-plus-warning/eighteen-plus-warning.component';

@Component({
  selector: 'app-root',
  imports: [BodyComponent, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private modalService = inject(NgbModal);

  ngOnInit(): void {
    const isAdultConfirmed = localStorage.getItem('isAdultConfirmed');
    if (!isAdultConfirmed) {
      this.openEighteen();
    }
  }

  openEighteen() {
    this.modalService.open(EighteenPlusWarningComponent, {
      centered: true,
      backdropClass: 'custom-backdrop',
      backdrop: 'static',
      keyboard: false,
    });
  }
}

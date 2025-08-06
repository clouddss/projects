import { Component, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-eighteen-plus-warning',
  imports: [],
  templateUrl: './eighteen-plus-warning.component.html',
  styleUrl: './eighteen-plus-warning.component.scss'
})
export class EighteenPlusWarningComponent {

  isDeniedConsent = false;
  
  private modalService = inject(NgbModal);

  confirmAge(): void {
    localStorage.setItem('isAdultConfirmed', 'true');
    this.closeModel();
  }

  exitSite(): void {
    this.isDeniedConsent = true;
  }

  closeModel() {
    this.modalService.dismissAll();
  }
}

import { Component, inject } from '@angular/core';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { HomePageHeaderAreaComponent } from '../shared/components/home-page-header-area/home-page-header-area.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-contact-support',
  imports: [HomePageAreaComponent, HomeSidebarComponent, HomePageHeaderAreaComponent],
  templateUrl: './contact-support.component.html',
  styleUrl: './contact-support.component.scss',
})
export class ContactSupportComponent {
  email: string = 'blunrcom@gmail.com';

  private readonly toast = inject(ToastrService);

  copyToClipboard() {
    navigator.clipboard
      .writeText(this.email)
      .then(() => {
        const button = document.querySelector('.copy-button') as HTMLButtonElement;
        const svg = button.querySelector('.clipboard-icon') as SVGElement;
        svg.style.fill = 'green';

        setTimeout(() => {
          svg.style.fill = '';
        }, 2000);

        this.toast.success('Email copied to clipboard');
      })
      .catch((err) => {
      });
  }
}

import { Component } from '@angular/core';

@Component({
  selector: 'app-failed',
  imports: [],
  templateUrl: './failed.component.html',
  styleUrl: './failed.component.scss',
})
export class FailedComponent {
  timeLeft: number = 5;
  interval: any;
  redirectUrl: string = window.location.origin;

  ngOnInit(): void {
    const queryParams = new URLSearchParams(window.location.search);
    const redirect = queryParams.get('redirectUrl');
    if (redirect) {
      this.redirectUrl = decodeURIComponent(redirect);
    }
    console.log('✅ Failed component redirectUrl:', this.redirectUrl);
    this.startCountdown();
  }

  startCountdown() {
    this.interval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.interval);
        console.log('🔁 Redirecting to:', this.redirectUrl);
        if (window.opener) {
          window.opener.location.href = this.redirectUrl;
          window.close();
        } else {
          window.location.href = this.redirectUrl;
        }
      }
    }, 1000);
  }

  goBack() {
    if (window.opener) {
      window.opener.location.href = this.redirectUrl;
      window.close();
    } else {
      window.location.href = this.redirectUrl;
    }
  }
}

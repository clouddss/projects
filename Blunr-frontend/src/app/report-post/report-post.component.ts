import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReportService } from '../core/services/report/report.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-report-user',
  templateUrl: './report-post.component.html',
  styleUrl: './report-post.component.scss',
  imports: [FormsModule],
})
export class ReportPostComponent {
  @Input() reportedPostId: string = '';
  @Input() creatorName: string = 'blunr creator';
  @Input() creatorUsername: string = 'blunr creator';
  @Input() creatorProfile: string = 'creatorprofile';

  reportReason: string = '';

  private readonly modalService = inject(NgbModal);

  constructor(
    private readonly reportService: ReportService,
    private readonly toast: ToastrService
  ) {}

  onReportReasonChange(event: any) {
    if (!event.target) return;

    this.reportReason = event.target.value;
  }

  closeModal() {
    this.modalService.dismissAll();
  }

  submitReport() {
    this.reportService
      .submitReport({ reason: this.reportReason, reportedPost: this.reportedPostId })
      .subscribe({
        next: () => {
          this.toast.success('Post Reported successfully!');
          this.modalService.dismissAll();
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to report post.');
        },
      });
    this.closeModal();
  }
}

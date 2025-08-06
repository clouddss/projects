import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {


  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService
  ) {}

  createCharge(formData: any): Observable<any> {
      return this.http.post('/transaction/create-charge', formData).pipe(
        catchError((err) => {
          this.toast.error(err.error.message || 'Failed to initiate payment');
          throw err;
        })
      );
    }
}

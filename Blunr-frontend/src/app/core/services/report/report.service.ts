import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(private readonly http: HttpClient) {}

  submitReport(data: { reportedPost: string; reason: string }): Observable<any> {
    return this.http.post('/report/create', data);
  }
}

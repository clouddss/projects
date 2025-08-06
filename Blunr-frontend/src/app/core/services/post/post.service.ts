import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PostService {
  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService
  ) {}

  createPost(formData: FormData): Observable<any> {
    return this.http.post('/post/create', formData).pipe(
      catchError((err) => {
        this.toast.error(err.error.message || 'Failed to create post');
        throw err;
      })
    );
  }
  getAllPosts() {
    return this.http.post('/post/getAllPosts', {});
  }

  getMyPosts() {
    return this.http.get('/post/my-posts');
  }

  getMyMedia() {
    return this.http.get('/post/my-media');
  }

  deletePost(id: string) {
    return this.http.delete(`/post/delete/${id}`);
  }

  likePost(postId: string) {
    return this.http.post(`/post/like/${postId}`, {});
  }
}

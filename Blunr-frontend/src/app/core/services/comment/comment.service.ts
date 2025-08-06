import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Add a comment to a post
   */
  addComment(postId: string, text: string): Observable<any> {
    return this.http.post('/comment/add-comment', {
      postId,
      text,
    });
  }

  /**
   * Get comments for a specific post
   */
  getPostComments(postId: string): Observable<any> {
    return this.http.get(`/comment/getPostsComment/${postId}`);
  }

  /**
   * Toggle like on a comment
   */
  toggleLikeComment(commentId: string): Observable<any> {
    return this.http.put(`/comment/toggle-like/${commentId}`, {});
  }
}
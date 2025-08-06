import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { PostService } from '../core/services/post/post.service';
import { ToastrService } from 'ngx-toastr';
import { HomeSidebarComponent } from '../shared/components/home-sidebar/home-sidebar.component';
import { HomePageAreaComponent } from '../shared/components/home-page-area/home-page-area.component';
import { HomePageHeaderAreaComponent } from '../shared/components/home-page-header-area/home-page-header-area.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [
    HomeSidebarComponent,
    HomePageAreaComponent,
    HomePageHeaderAreaComponent,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.scss',
})
export class CreatePostComponent {
  postForm: FormGroup;
  selectedImages: File[] | null = null;
  imagePreviews: string[] = [];
  isSubmitting = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly postService: PostService,
    private readonly toast: ToastrService,
    private readonly router: Router
  ) {
    this.postForm = this.fb.group({
      caption: ['', [Validators.required, Validators.minLength(5)]],
      image: [],
      contentType: ['free'],
      amount: [0.0],
    });
  }

  get caption() {
    return this.postForm.get('caption');
  }

  onFileChange(event: any) {
    const files = event.target.files;

    if (files.length > 0) {
      if (!this.selectedImages) this.selectedImages = [];
      this.selectedImages = [...files];

      this.imagePreviews = [];

      Array.from(files).forEach((file, index) => {
        const fileType = (file as File).type;

        if (fileType.startsWith('image')) {
          // If the file is an image, generate a preview
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.imagePreviews.push(e.target.result as string);
          };
          reader.readAsDataURL(file as unknown as File);
        } else if (fileType.startsWith('video')) {
          // If it's a video, use a placeholder image instead of the actual preview
          this.imagePreviews.push('assets/images/video-placeholder.png'); // Replace with your placeholder image path
        }
      });
    }
  }

  onSubmit() {
    if (this.postForm.invalid) {
      this.toast.error('Please fill all required fields correctly.');
      return;
    }

    this.isSubmitting = true;
    const { caption, contentType, amount } = this.postForm.value;

    if (contentType !== 'free' && amount <= 0) {
      this.isSubmitting = false;
      return this.toast.error('Amount must be greater than 0 to create a paid post');
    }
    if (contentType !== 'free' && (!this.selectedImages || this.selectedImages.length <= 0)) {
      this.isSubmitting = false;
      return this.toast.error('Media is required for a paid post');
    }

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('isNSFW', 'false');
    formData.append('price', amount.toString());

    formData.append('isLocked', contentType === 'free' ? 'false' : 'true');

    this.selectedImages?.forEach((img) => {
      formData.append('media', img);
    });

    this.postService.createPost(formData).subscribe({
      next: () => {
        this.toast.success('Post created successfully!');
        this.postForm.reset({
          contentType: 'free',
          amount: 0.0,
        });
        this.selectedImages = null;
        this.imagePreviews = [];
        this.isSubmitting = false;
        this.router.navigate(['/posts']);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to create post.');
        this.isSubmitting = false;
      },
      complete: () => (this.isSubmitting = false),
    });
    return;
  }
}

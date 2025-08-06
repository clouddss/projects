import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-data',
  imports: [],
  templateUrl: './empty-data.component.html',
  styleUrl: './empty-data.component.scss'
})
export class EmptyDataComponent {
  @Input() message: string = '';
}

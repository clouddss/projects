import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-ng-select',
  imports: [NgSelectModule, FormsModule],
  templateUrl: './ng-select.component.html',
  styleUrl: './ng-select.component.scss'
})
export class NgSelectComponent {

  @Input() data!: any;
  @Input() selectData!: any
  @Input() isSearchable = true;
}

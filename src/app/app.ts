import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppInput } from './input';
import { NgModelInput } from './ngmodel-input';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, AppInput, NgModelInput],
  template: ` <app-input label="test" name="yay" [formControl]="ctrl" /> {{ ctrl.value }}`,
})
export class App {
  protected readonly title = signal('demo');

  protected readonly ctrl = new FormControl('yay', {
    validators: Validators.required,
  });
}

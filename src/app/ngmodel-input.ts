import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  NgModel,
  Validator,
} from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { onParentSubmit } from './on-parent-submit';

// Personally I find it much easier & more "reactive" to just use signals & ngModel throughout our apps for this. We've now of course switched to signal forms, but this is how we used to do it.
// Of course that may be impossible if you have a lot of FormControl stuff already, please look at input.ts for the full implemimentation that supports both ngModel & FormControl parents.
// The main difference is in the validation logic, where ngModel you simply use toggles such as required = input(false) that add/remove validators as needed. FormControl requires inject(NgControl)
@Component({
  selector: 'app-ngmodel-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormField, MatLabel, MatInput, MatError, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: NgModelInput,
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: NgModelInput,
      multi: true,
    },
  ],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [(ngModel)]="value"
        (ngModelChange)="onChange($event)"
        (blur)="onTouched()"
        [required]="required()"
        [disabled]="disabled()"
      />
      <mat-error>Field is required</mat-error>
    </mat-form-field>
  `,
})
export class NgModelInput implements ControlValueAccessor, Validator {
  // whatever we want to "send up to the parent"
  protected onChange = (next: string | null) => {
    // noop
  };
  protected onTouched = () => {
    // noop
  };
  // re-calls validate function when validators change
  protected onValidatorChange = () => {
    // noop
  };

  readonly label = input<string>('');
  readonly value = model<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute }); // add other validators if/as needed.

  private readonly model = viewChild.required(NgModel);

  constructor() {
    onParentSubmit(() => this.model().control.markAsTouched());

    effect(() => {
      this.disabled();
      this.required();
      // run every time validator inputs change, not really necessary but to be "safe"
      this.onValidatorChange();
    });
  }

  // be careful with CVA components, as angular will always pass in null on form init, so we need to support it either here by mapping this.value.set(value ?? '') or by the value signal supporting null
  writeValue(value: string | null) {
    this.value.set(value);
  }

  registerOnChange(fn: (val: string | null) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // setDisabledState not needed since we're not supporting reactive forms

  // need to support all validator combinations here
  validate() {
    if (this.disabled()) return null; // no need to validate disabled components, unless ya want to.
    if (this.required() && !this.value()) return { required: true };
    // support other errors here
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}

// For both ngModel & FormControl using OnPush requires a separate "handler" that passes the "touched" state thorughout - if you want the forms to propagate .markAllAsTouched correctly. This is due to touched not being an input & .OnPush triggering

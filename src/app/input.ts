import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AsyncValidatorFn,
  ControlValueAccessor,
  FormControl,
  NgControl,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { onParentSubmit } from './on-parent-submit';

// This will support both ngModel & formControl parents, but is not ideal for complex validation usecases as binding is still explicit
@Component({
  selector: 'app-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormField, MatLabel, MatError, MatInput, ReactiveFormsModule],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <input matInput [formControl]="control" [required]="isRequired()" (blur)="onTouched()" />
      <!-- Should add actuall support for all errors -->
      @if (control.hasError('required') ) {
      <mat-error>Field is required</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    :host mat-label:empty {
      display: none /** @if/ngIf doesn't really work well with OnPush and mat-label, so we hide the empty mat-label with css due to appearance outlined looking weird otherwise */
    }
  `,
})
export class AppInput implements ControlValueAccessor, OnInit {
  protected onTouched = () => {
    // noop
  };

  readonly label = input<string>('');

  @Input({
    transform: booleanAttribute,
  })
  set disabled(value: boolean) {
    value ? this.control.disable({ emitEvent: false }) : this.control.enable({ emitEvent: false });
  }

  private readonly ngControl = inject(NgControl, { optional: true, self: true }); // inject own bound FormControl
  protected readonly isRequired = signal(
    this.ngControl?.control?.hasValidator(Validators.required) ?? false
  );
  private readonly destroy = inject(DestroyRef);
  protected readonly control = new FormControl<string | null>(null);

  constructor() {
    onParentSubmit(() => this.control.markAsTouched());

    if (this.ngControl) {
      this.ngControl.valueAccessor = this; // bind ourselves as the value accessor if we have a parent FormControl
    }
  }

  ngOnInit() {
    this.setValidators(this.ngControl?.control?.validator, this.ngControl?.control?.asyncValidator);
  }

  private setValidators(
    validators?: ValidatorFn | null,
    asyncValidators?: AsyncValidatorFn | null
  ) {
    this.control.clearValidators();
    this.control.clearAsyncValidators();
    this.control.setValidators(validators ?? null);
    this.control.setAsyncValidators(asyncValidators ?? null);
    this.control.updateValueAndValidity({ emitEvent: false });

    const ctrl = new FormControl(null, {
      validators,
    });
    ctrl.markAsTouched();
    ctrl.setValue(null);
    this.isRequired.set(!!validators?.(new FormControl(null))?.['required']); // required should be separate to add material * after label
  }

  // be careful with CVA components, as angular will always pass in null on form init, so we need to support it either here by mapping this.value.set(value ?? '') or by the value signal supporting null
  writeValue(value: string | null) {
    this.control.setValue(value, {
      emitEvent: false,
    });
  }

  private changeSub = new Subscription();
  registerOnChange(fn: (val: string | null) => void) {
    this.changeSub.unsubscribe();
    this.changeSub = this.control.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((v) => {
        fn(v);
        console.log(this.control.errors);
      });
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled
      ? this.control.disable({ emitEvent: false })
      : this.control.enable({ emitEvent: false });
  }
}

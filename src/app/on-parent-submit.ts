import { isPlatformServer } from '@angular/common';
import { ChangeDetectorRef, inject, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroupDirective, NgForm, NgModelGroup } from '@angular/forms';
import { first, tap } from 'rxjs/operators';

const bindToParentTouch = (
  fn: () => void,
  cdr: ChangeDetectorRef,
  fgd: FormGroupDirective | NgModelGroup | null
): void => {
  if (!fgd || !fgd.control) return;
  const parentFn = fgd.control.markAllAsTouched.bind(fgd.control);
  fgd.control.markAllAsTouched = (...args: Parameters<typeof fgd.control.markAllAsTouched>) => {
    cdr.markForCheck();
    fn();
    return parentFn(...args);
  };
};

// propagate .markAsTouched / ./markAllAsTouched even in "OnChange" scenarios
export const onParentSubmit = (fn: () => void, skipSelf = true): void => {
  if (isPlatformServer(inject(PLATFORM_ID))) return;
  const cdr = inject(ChangeDetectorRef);
  const fgd = inject(FormGroupDirective, {
    optional: true,
    skipSelf: skipSelf,
  }); // if parent is formgroup bind to that
  const modelGroup = inject(NgModelGroup, {
    optional: true,
    skipSelf: skipSelf,
  }); // if parent is ngmodelgroup bind to that
  const form = inject(NgForm, { optional: true, skipSelf: skipSelf }); // else parent is probably direct ngForm instance

  (fgd || form)?.ngSubmit
    .pipe(
      tap(() => cdr.markForCheck()),
      first(),
      takeUntilDestroyed()
    )
    .subscribe(fn);

  bindToParentTouch(fn, cdr, fgd);

  requestAnimationFrame(() => {
    bindToParentTouch(fn, cdr, modelGroup);
  });
};

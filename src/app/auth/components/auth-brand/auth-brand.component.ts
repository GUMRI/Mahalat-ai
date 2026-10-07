import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

type AuthBrandVariant = 'panel' | 'compact';

@Component({
  selector: 'app-auth-brand',
  templateUrl: './auth-brand.component.html',
  styleUrl: './auth-brand.component.scss',
  imports: [TranslocoPipe],
})
export class AuthBrandComponent {
  readonly variant = input<AuthBrandVariant>('panel');
}

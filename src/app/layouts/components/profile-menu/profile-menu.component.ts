import { Component, computed, inject, input, output } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ellipsisVerticalOutline, logOutOutline, settingsOutline } from 'ionicons/icons';
import { FirebaseAuthService } from '../../../firebase/firebase-auth.service';
import { AppLocale } from '../../../settings/i18n/i18n.config';
import { LangService } from '../../../settings/i18n/i18n.service';

@Component({
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrl: './profile-menu.component.scss',
  imports: [
    IonAvatar,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPopover,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    TranslocoPipe,
  ],
})
export class ProfileMenuComponent {
  private static nextTriggerId = 0;
  private readonly auth = inject(FirebaseAuthService);
  private readonly router = inject(Router);
  readonly lang = inject(LangService);

  readonly triggerId = `workspace-profile-menu-trigger-${ProfileMenuComponent.nextTriggerId++}`;
  readonly isSigningOut = input(false);
  readonly signOutRequested = output<void>();
  readonly user = this.auth.user;
  readonly locales = this.lang.locales;
  readonly menuIcon = ellipsisVerticalOutline;
  readonly signOutIcon = logOutOutline;
  readonly settingsIcon = settingsOutline;
  readonly displayName = computed(() => {
    const user = this.user();
    return user?.displayName?.trim() || user?.email?.split('@')[0] || null;
  });
  readonly avatarInitial = computed(
    () => this.displayName()?.charAt(0).toLocaleUpperCase() || 'م',
  );

  onLocaleChange(event: CustomEvent<{ value: unknown }>): void {
    const value = event.detail.value;
    if (typeof value === 'string' && this.isAppLocale(value)) {
      this.lang.setLocale(value);
    }
  }

  requestSignOut(popover: IonPopover): void {
    this.signOutRequested.emit();
    void popover.dismiss();
  }

  async openSettings(popover: IonPopover): Promise<void> {
    await popover.dismiss();
    await this.router.navigateByUrl('/app/settings');
  }

  private isAppLocale(value: string): value is AppLocale {
    return this.locales.some((locale) => locale.code === value);
  }
}

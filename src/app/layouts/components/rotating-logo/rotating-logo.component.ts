import { Component, computed, effect, input, signal } from '@angular/core';
import { IonAvatar } from '@ionic/angular';

const LOGO_ROTATION_INTERVAL_MS = 30_000;

@Component({
  selector: 'app-rotating-logo',
  templateUrl: './rotating-logo.component.html',
  styleUrl: './rotating-logo.component.scss',
  imports: [IonAvatar],
})
export class RotatingLogoComponent {
  readonly shopName = input<string | null>(null);
  readonly shopLogoUrl = input<string | null>(null);
  readonly showShopLogo = signal(false);
  readonly shopLogoFailed = signal(false);

  constructor() {
    effect((onCleanup) => {
      const shopName = this.shopName()?.trim();
      const shopLogoUrl = this.shopLogoUrl();
      if (!shopName && !shopLogoUrl) return;

      this.showShopLogo.set(false);
      this.shopLogoFailed.set(false);
      const rotationTimer = setInterval(
        () => this.showShopLogo.update((showingShopLogo) => !showingShopLogo),
        LOGO_ROTATION_INTERVAL_MS,
      );
      onCleanup(() => clearInterval(rotationTimer));
    });
  }

  readonly shopInitial = computed(() => this.shopName()?.trim().charAt(0) || 'م');
  readonly logoLabel = computed(() =>
    this.showShopLogo() ? this.shopName()?.trim() || 'Shop logo' : 'Mahalat',
  );
}

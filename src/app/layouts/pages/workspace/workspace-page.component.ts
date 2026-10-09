import { Component, OnInit, inject, signal } from '@angular/core';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { bagHandleOutline, cubeOutline } from 'ionicons/icons';
import { ShopDetails } from '../../../auth/service/shop-registration.service';
import { FirebaseAuthService } from '../../../firebase/firebase-auth.service';
import { AppLocale } from '../../../settings/i18n/i18n.config';
import { LangService } from '../../../settings/i18n/i18n.service';
import { ShopRegistrationService } from '../../../auth/service/shop-registration.service';

export type WorkspaceSection = 'home' | 'workers' | 'settings' | 'pos';

const WORKSPACE_SECTIONS = new Set<WorkspaceSection>(['home', 'workers', 'settings', 'pos']);

@Component({
  selector: 'app-workspace-page',
  templateUrl: './workspace-page.component.html',
  styleUrls: ['./workspace-page.component.scss'],
  imports: [
    IonBadge,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption,
    IonText,
    TranslocoPipe,
  ],
})
export class WorkspacePageComponent implements OnInit {
  readonly section = signal<WorkspaceSection>('home');

  readonly auth = inject(FirebaseAuthService);
  private readonly route = inject(ActivatedRoute);
  readonly lang = inject(LangService);
  private readonly registration = inject(ShopRegistrationService);
  readonly shop = signal<ShopDetails | null>(null);
  readonly shopLoadFailed = signal(false);
  readonly localeOptions = this.lang.locales;
  readonly icons = {
    sale: bagHandleOutline,
    product: cubeOutline,
  };

  async ngOnInit(): Promise<void> {
    const routeSection = this.route.snapshot.data['section'];
    if (typeof routeSection === 'string' && WORKSPACE_SECTIONS.has(routeSection as WorkspaceSection)) {
      this.section.set(routeSection as WorkspaceSection);
    }

    const user = this.auth.user();
    if (!user) {
      this.shopLoadFailed.set(true);
      return;
    }
    try {
      this.shop.set(await this.registration.getShopDetails(user.uid));
    } catch {
      this.shopLoadFailed.set(true);
    }
  }

  setLocaleFromEvent(event: CustomEvent<{ value: unknown }>): void {
    const value = event.detail.value;
    if (typeof value === 'string' && this.isAppLocale(value)) {
      this.lang.setLocale(value);
    }
  }

  private isAppLocale(value: string): value is AppLocale {
    return this.localeOptions.some((locale) => locale.code === value);
  }
}

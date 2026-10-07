import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { bagHandleOutline, cubeOutline } from 'ionicons/icons';
import { ShopDetails } from '../../../auth/service/shop-registration.service';
import { FirebaseAuthService } from '../../../firebase/firebase-auth.service';
import { AppLocale } from '../../../settings/i18n/i18n.config';
import { LangService } from '../../../settings/i18n/i18n.service';
import { ShopRegistrationService } from '../../../auth/service/shop-registration.service';
import { RotatingLogoComponent } from '../../components/rotating-logo/rotating-logo.component';
import { ProfileMenuComponent } from '../../components/profile-menu/profile-menu.component';

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
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption,
    IonText,
    IonTitle,
    IonToolbar,
    TranslocoPipe,
    RotatingLogoComponent,
    ProfileMenuComponent,
  ],
})
export class WorkspacePageComponent implements OnInit {
  readonly section = signal<WorkspaceSection>('home');

  readonly auth = inject(FirebaseAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly lang = inject(LangService);
  private readonly registration = inject(ShopRegistrationService);
  readonly shop = signal<ShopDetails | null>(null);
  readonly shopLoadFailed = signal(false);
  readonly isSigningOut = signal(false);
  readonly signOutFailed = signal(false);
  readonly sectionTitle = computed(() => `app.sections.${this.section()}`);
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

  async signOut(): Promise<void> {
    this.isSigningOut.set(true);
    this.signOutFailed.set(false);
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/');
    } catch {
      this.signOutFailed.set(true);
    } finally {
      this.isSigningOut.set(false);
    }
  }

  private isAppLocale(value: string): value is AppLocale {
    return this.localeOptions.some((locale) => locale.code === value);
  }
}

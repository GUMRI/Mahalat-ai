import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonAlert,
  IonButton,
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonInput,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { flashOutline, logoGoogle } from 'ionicons/icons';
import { FirebaseAuthService } from '../../../firebase/firebase-auth.service';
import { AppLocale } from '../../../settings/i18n/i18n.config';
import { LangService } from '../../../settings/i18n/i18n.service';
import { AuthBrandComponent } from '../../components/auth-brand/auth-brand.component';
import { ShopInvitationScannerComponent } from '../../components/shop-invitation-scanner/shop-invitation-scanner.component';
import {
  BusinessType,
  CountryCode,
  ShopRegistrationService,
} from '../../service/shop-registration.service';

type AuthMode = 'signIn' | 'signUp';
type AuthScreen =
  | 'auth'
  | 'checkingShop'
  | 'loadError'
  | 'chooseShop'
  | 'joinShop'
  | 'setup'
  | 'ready';
type ExtensionKey = 'electronicPayments' | 'advancedReports' | 'eInvoicing';

const BUSINESS_TYPES: BusinessType[] = [
  'grocery',
  'clothing',
  'perfumery',
  'bookstore',
  'cafe',
];

const COUNTRIES: Array<{ code: CountryCode }> = [
  { code: 'TN' },
  { code: 'DZ' },
  { code: 'MA' },
  { code: 'FR' },
  { code: 'US' },
];

const EXTENSION_OPTIONS: ExtensionKey[] = [
  'electronicPayments',
  'advancedReports',
  'eInvoicing',
];

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: [
    './auth.page.scss',
    './auth-form.scss',
    './auth-setup.scss',
    './auth-setup-summary.scss',
  ],
  imports: [
    FormsModule,
    IonAlert,
    IonButton,
    IonBadge,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCheckbox,
    IonContent,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonProgressBar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    TranslocoPipe,
    AuthBrandComponent,
    ShopInvitationScannerComponent,
  ],
})
export class AuthPage {
  readonly googleIcon = logoGoogle;
  readonly demoIcon = flashOutline;
  readonly auth = inject(FirebaseAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly lang = inject(LangService);
  readonly registration = inject(ShopRegistrationService);
  readonly mode = signal<AuthMode>('signIn');
  readonly screen = signal<AuthScreen>('auth');
  readonly email = signal('');
  readonly password = signal('');
  readonly isSubmitting = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly invitationUrl = signal('');

  // Automatic invitation detection alert
  readonly isAutoInviteAlertOpen = signal(false);
  readonly detectedInvite = signal<{
    shopId: string;
    invitationId: string;
    shopName?: string;
    role?: string;
  } | null>(null);
  readonly autoInviteAlertButtons = computed(() => [
    {
      text: this.lang.locale().startsWith('ar') ? 'لاحقاً' : (this.lang.locale().startsWith('fr') ? 'Plus tard' : 'Not Now'),
      role: 'cancel',
      handler: () => {
        this.isAutoInviteAlertOpen.set(false);
      },
    },
    {
      text: this.lang.locale().startsWith('ar') ? 'قبول الدعوة' : (this.lang.locale().startsWith('fr') ? 'Accepter' : 'Accept'),
      role: 'confirm',
      handler: () => {
        void this.acceptDetectedInvitation();
      },
    },
  ]);

  readonly businessTypes = BUSINESS_TYPES;
  readonly countries = COUNTRIES;
  readonly extensionOptions = EXTENSION_OPTIONS;
  readonly setupStep = signal(1);
  readonly shopName = signal('');
  readonly businessType = signal<BusinessType>('grocery');
  readonly countryCode = signal<CountryCode>(this.registration.detectCountry());
  readonly currencyForCountry = computed(() =>
    this.registration.currencyFor(this.countryCode()),
  );
  readonly extensions = signal<Record<ExtensionKey, boolean>>({
    electronicPayments: false,
    advancedReports: false,
    eInvoicing: false,
  });
  readonly selectedExtensions = computed(() =>
    (Object.keys(this.extensions()) as ExtensionKey[]).filter((key) =>
      this.extensions()[key],
    ),
  );
  readonly logo = signal<File | null>(null);
  readonly logoPreview = signal<string | null>(null);

  private shopCheckRequest = 0;

  constructor() {
    effect(() => {
      const loading = this.auth.isLoading();
      const user = this.auth.user();
      if (loading) return;

      const request = ++this.shopCheckRequest;
      this.errorKey.set(null);
      if (!user) {
        this.screen.set('auth');
        return;
      }

      this.screen.set('checkingShop');
      void this.loadShopState(user.uid, request);
    });
  }

  setLocaleFromEvent(event: CustomEvent<{ value: unknown }>): void {
    const value = event.detail.value;
    if (typeof value === 'string' && this.isAppLocale(value)) {
      this.lang.setLocale(value);
    }
  }

  setBusinessTypeFromEvent(event: CustomEvent<{ value: unknown }>): void {
    const value = event.detail.value;
    if (typeof value === 'string' && BUSINESS_TYPES.includes(value as BusinessType)) {
      this.businessType.set(value as BusinessType);
    }
  }

  setCountryFromEvent(event: CustomEvent<{ value: unknown }>): void {
    const value = event.detail.value;
    if (typeof value === 'string' && COUNTRIES.some((country) => country.code === value)) {
      this.countryCode.set(value as CountryCode);
    }
  }

  setExtension(extension: ExtensionKey, event: CustomEvent<{ checked: boolean }>): void {
    this.extensions.update((current) => ({
      ...current,
      [extension]: event.detail.checked,
    }));
  }

  onLogoChange(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0] ?? null;
    this.errorKey.set(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.errorKey.set('auth.setup.invalidLogo');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.errorKey.set('auth.setup.logoTooLarge');
      input.value = '';
      return;
    }

    const previousPreview = this.logoPreview();
    if (previousPreview) URL.revokeObjectURL(previousPreview);
    this.logo.set(file);
    this.logoPreview.set(URL.createObjectURL(file));
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorKey.set(null);
  }

  chooseShopCreation(): void {
    this.errorKey.set(null);
    this.screen.set('setup');
  }

  chooseShopInvitation(): void {
    this.errorKey.set(null);
    this.invitationUrl.set('');
    this.screen.set('joinShop');
  }

  backToShopChoices(): void {
    this.errorKey.set(null);
    this.screen.set('chooseShop');
  }

  onInvitationScanned(value: string): void {
    this.invitationUrl.set(value);
    this.errorKey.set(null);
  }

  async joinShop(): Promise<void> {
    const user = this.auth.user();
    if (!user) {
      this.errorKey.set('auth.errors.generic');
      return;
    }
    await this.runAuthAction(async () => {
      await this.registration.joinWithInvitation(
        user.uid,
        user.email ?? '',
        this.invitationUrl().trim(),
      );
      this.screen.set('ready');
      await this.navigateToWorkspace();
    });
  }

  nextSetupStep(): void {
    if (this.setupStep() < 3) {
      this.errorKey.set(null);
      this.setupStep.update((step) => step + 1);
    }
  }

  previousSetupStep(): void {
    if (this.setupStep() > 1) {
      this.errorKey.set(null);
      this.setupStep.update((step) => step - 1);
    }
  }

  async submitEmail(): Promise<void> {
    await this.runAuthAction(async () => {
      if (this.mode() === 'signUp') {
        await this.auth.signUp(this.email(), this.password());
      } else {
        await this.auth.signIn(this.email(), this.password());
      }
    });
  }

  async submitGoogle(): Promise<void> {
    await this.runAuthAction(() => this.auth.signInWithGoogle());
  }

  async quickDemoLogin(): Promise<void> {
    const demoEmail = 'demo@mahalat.ai';
    const demoPassword = 'Password123!';
    this.email.set(demoEmail);
    this.password.set(demoPassword);
    await this.runAuthAction(async () => {
      try {
        await this.auth.signIn(demoEmail, demoPassword);
      } catch (error: unknown) {
        if (
          error instanceof FirebaseError &&
          (error.code === 'auth/user-not-found' ||
            error.code === 'auth/invalid-credential')
        ) {
          await this.auth.signUp(demoEmail, demoPassword);
          return;
        }
        throw error;
      }
    });
  }

  async submitShopSetup(): Promise<void> {
    const user = this.auth.user();
    if (!user) {
      this.errorKey.set('auth.errors.generic');
      return;
    }

    await this.runAuthAction(async () => {
      await this.registration.register(user.uid, user.email ?? '', {
        name: this.shopName(),
        businessType: this.businessType(),
        countryCode: this.countryCode(),
        currency: this.currencyForCountry(),
        logo: this.logo() ?? undefined,
        extensions: this.extensions(),
      });
      this.screen.set('ready');
      await this.navigateToWorkspace();
    });
  }

  async retryShopCheck(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    this.screen.set('checkingShop');
    const request = ++this.shopCheckRequest;
    this.errorKey.set(null);
    await this.loadShopState(user.uid, request);
  }

  async signOut(): Promise<void> {
    await this.runAuthAction(() => this.auth.signOut());
  }

  async acceptDetectedInvitation(): Promise<void> {
    const invite = this.detectedInvite();
    const user = this.auth.user();
    if (!invite || !user) {
      this.isAutoInviteAlertOpen.set(false);
      return;
    }
    this.isAutoInviteAlertOpen.set(false);
    const invitationUrl = new URL('/', window.location.origin);
    invitationUrl.searchParams.set('shopId', invite.shopId);
    invitationUrl.searchParams.set('invitationId', invite.invitationId);
    this.invitationUrl.set(invitationUrl.toString());

    await this.runAuthAction(async () => {
      await this.registration.joinWithInvitation(
        user.uid,
        user.email ?? '',
        invitationUrl.toString(),
      );
      this.screen.set('ready');
      await this.navigateToWorkspace();
    });
  }

  private async loadShopState(userId: string, request: number): Promise<void> {
    try {
      const accessState = await this.registration.getAccessState(userId);
      if (request !== this.shopCheckRequest) return;
      if (accessState === 'ready') {
        this.screen.set('ready');
        await this.navigateToWorkspace();
        return;
      }
      const shopId = this.route.snapshot.queryParamMap.get('shopId');
      const invitationId = this.route.snapshot.queryParamMap.get('invitationId');
      const user = this.auth.user();

      if (shopId && invitationId) {
        this.invitationUrl.set(window.location.href);
        this.screen.set('joinShop');
        // Fetch invite details and automatically prompt with alert
        const peek = await this.registration.peekInvitationDetails(shopId, invitationId);
        if (request !== this.shopCheckRequest) return;
        this.detectedInvite.set({
          shopId,
          invitationId,
          shopName: peek?.shopName,
          role: peek?.role,
        });
        this.isAutoInviteAlertOpen.set(true);
      } else {
        this.screen.set('chooseShop');
        // Automatically check if an invitation was sent to the user's email
        if (user?.email) {
          try {
            const pending = await this.registration.findPendingInvitationForUser(user.email);
            if (request !== this.shopCheckRequest) return;
            if (pending) {
              const url = new URL('/', window.location.origin);
              url.searchParams.set('shopId', pending.shopId);
              url.searchParams.set('invitationId', pending.invitationId);
              this.invitationUrl.set(url.toString());
              this.detectedInvite.set(pending);
              this.isAutoInviteAlertOpen.set(true);
            }
          } catch {
            // Silently ignore if lookup fails
          }
        }
      }
    } catch {
      if (request !== this.shopCheckRequest) return;
      this.errorKey.set('auth.setup.loadError');
      this.screen.set('loadError');
    }
  }

  private async navigateToWorkspace(): Promise<void> {
    try {
      const navigated = await this.router.navigateByUrl('/app/home');
      if (!navigated) this.errorKey.set('auth.errors.generic');
    } catch {
      this.errorKey.set('auth.errors.generic');
    }
  }

  private async runAuthAction(action: () => Promise<unknown>): Promise<void> {
    this.errorKey.set(null);
    this.isSubmitting.set(true);
    try {
      await action();
    } catch (error: unknown) {
      this.errorKey.set(this.getErrorKey(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private getErrorKey(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return 'auth.errors.generic';
    }

    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'auth.errors.emailInUse';
      case 'auth/invalid-email':
        return 'auth.errors.invalidEmail';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'auth.errors.invalidCredentials';
      case 'auth/weak-password':
        return 'auth.errors.weakPassword';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'auth.errors.googleCancelled';
      case 'auth/popup-blocked':
        return 'auth.errors.popupBlocked';
      case 'auth/unauthorized-domain':
        return 'auth.errors.unauthorizedDomain';
      case 'auth/operation-not-allowed':
        return 'auth.errors.operationNotAllowed';
      case 'shop/invalid-invitation':
        return 'auth.join.errors.invalidInvitation';
      case 'shop/invitation-email-mismatch':
        return 'auth.join.errors.emailMismatch';
      case 'shop/already-member':
      case 'shop/already-linked':
        return 'auth.join.errors.alreadyMember';
      case 'permission-denied':
        return this.screen() === 'joinShop'
          ? 'auth.join.errors.permissionDenied'
          : 'auth.setup.saveError';
      case 'shop/setup-write-failed':
      case 'storage/unauthorized':
        return 'auth.setup.saveError';
      case 'shop/invalid-logo':
        return 'auth.setup.invalidLogo';
      case 'auth/network-request-failed':
        return 'auth.errors.network';
      default:
        return 'auth.errors.generic';
    }
  }

  private isAppLocale(value: string): value is AppLocale {
    return this.lang.locales.some((locale) => locale.code === value);
  }
}

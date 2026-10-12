import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { injectLiveQuery } from '@tanstack/angular-db';
import { ilike } from '@tanstack/db';
import { injectTable, tableFeatures } from '@tanstack/angular-table';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { BrowserQRCodeSvgWriter } from '@zxing/browser';
import {
  checkmarkOutline,
  closeOutline,
  copyOutline,
  mailOutline,
  openOutline,
  peopleOutline,
  personAddOutline,
  qrCodeOutline,
  refreshOutline,
} from 'ionicons/icons';
import { FirebaseAuthService } from '../../../../firebase/firebase-auth.service';
import { ShopRegistrationService } from '../../../../auth/service/shop-registration.service';
import { LocalFirstUsersService } from '../../../../local-first/service/local-first-users.service';
import { PlatformUserService, type PlatformUserProfile } from '../../../../firebase/platform-user.service';
import { BusinessScopeService } from '../../services/business-scope.service';
import type {
  ShopUser,
  ShopUserRole,
} from '../../../../local-first/shared/user-member.model';

const USERS_TABLE_FEATURES = tableFeatures({});
const USERS_TABLE_COLUMNS = [
  { accessorKey: 'avatarUrl', id: 'avatar' },
  { accessorKey: 'displayName', id: 'name' },
  { accessorKey: 'email', id: 'email' },
  { accessorKey: 'role', id: 'role' },
  { accessorKey: 'branchId', id: 'shops' },
  { accessorKey: 'branchId', id: 'branchId' },
];

@Component({
  selector: 'app-business-management-users-page',
  templateUrl: './users.page.html',
  styleUrl: './users.page.scss',
  imports: [
    IonAvatar,
    IonBadge,
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonLabel,
    IonModal,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
    TranslocoPipe,
  ],
})
export class BusinessManagementUsersPage implements OnInit, OnDestroy {
  private readonly auth = inject(FirebaseAuthService);
  private readonly registration = inject(ShopRegistrationService);
  private readonly usersService = inject(LocalFirstUsersService);
  private readonly platformUserService = inject(PlatformUserService);
  readonly scope: BusinessScopeService = inject(BusinessScopeService);
  private invitationQrObjectUrl: string | null = null;

  readonly usersCollection = signal<
    Awaited<ReturnType<LocalFirstUsersService['open']>>['collection'] | null
  >(null);
  private readonly syncStatus = signal<
    Awaited<ReturnType<LocalFirstUsersService['open']>>['syncError'] | null
  >(null);
  readonly syncError = computed(() => this.syncStatus()?.() ?? null);
  readonly loadError = signal(false);
  readonly isLoading = signal(true);
  readonly search = signal('');
  readonly canInvite = signal(false);
  readonly isInviteModalOpen = signal(false);
  readonly inviteMethod = signal<'qr' | 'email' | 'search'>('qr');
  readonly inviteEmail = signal('');
  readonly inviteRole = signal<'cashier' | 'manager' | 'accountant' | 'worker' | 'client'>('cashier');
  readonly inviteEmailError = signal<string | null>(null);
  readonly isCreatingInvitation = signal(false);
  readonly invitationUrl = signal<string | null>(null);
  readonly invitationEmail = signal<string | null>(null);
  readonly invitationRole = signal<ShopUserRole>('cashier');
  readonly invitationQrCode = signal<string | null>(null);
  readonly invitationError = signal<string | null>(null);
  readonly isCopied = signal(false);

  // Platform user search state
  readonly platformSearchQuery = signal('');
  readonly isSearchingPlatform = signal(false);
  readonly platformSearchResults = signal<PlatformUserProfile[]>([]);
  readonly platformSearchInvitedUid = signal<string | null>(null);
  readonly platformSearchSuccess = signal<string | null>(null);

  private readonly queryRetry = signal(0);
  readonly usersQuery = injectLiveQuery({
    params: () => ({
      collection: this.usersCollection(),
      search: this.search().trim(),
      retry: this.queryRetry(),
    }),
    query: ({ params, q }) => {
      if (!params.collection) return undefined;
      return q
        .from({ users: params.collection })
        .where(({ users }) => ilike(users.email, `%${params.search}%`))
        .select(({ users }) => ({
          id: users.id,
          avatarUrl: users.avatarUrl,
          displayName: users.displayName,
          email: users.email,
          role: users.role,
          branchId: users.branchId,
        }));
    },
  });
  readonly table = injectTable(() => ({
    features: USERS_TABLE_FEATURES,
    columns: USERS_TABLE_COLUMNS,
    data: this.usersQuery.data(),
    getRowId: (user: Pick<ShopUser, 'id'>) => user.id,
  }));
  readonly peopleIcon = peopleOutline;
  readonly personAddIcon = personAddOutline;
  readonly qrIcon = qrCodeOutline;
  readonly refreshIcon = refreshOutline;
  readonly mailIcon = mailOutline;
  readonly closeIcon = closeOutline;
  readonly copyIcon = copyOutline;
  readonly checkmarkIcon = checkmarkOutline;
  readonly openIcon = openOutline;

  ngOnInit(): void {
    void this.loadUsers();
  }

  onSearch(value: string | null | undefined): void {
    this.search.set(value ?? '');
  }

  async retry(): Promise<void> {
    this.queryRetry.update((attempt) => attempt + 1);
    this.loadError.set(false);
    this.isLoading.set(true);
    await this.loadUsers();
  }

  getUserDisplayName(row: { getValue: (key: string) => unknown }): string {
    const rawName = row.getValue('name');
    if (typeof rawName === 'string' && rawName.trim()) {
      return rawName.trim();
    }
    const email = row.getValue('email');
    if (typeof email === 'string' && email) {
      const localPart = email.split('@')[0] || '';
      return (
        localPart
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase()) || email
      );
    }
    return '—';
  }

  getUserAvatar(row: { getValue: (key: string) => unknown }): string | null {
    const avatar = row.getValue('avatar');
    return typeof avatar === 'string' && avatar.trim() ? avatar.trim() : null;
  }

  getUserInitial(row: { getValue: (key: string) => unknown }): string {
    const name = this.getUserDisplayName(row);
    return name && name !== '—' ? name.charAt(0).toUpperCase() : 'م';
  }

  roleBadgeColor(role: ShopUserRole): string {
    switch (role) {
      case 'owner':
        return 'primary';
      case 'manager':
        return 'success';
      case 'cashier':
        return 'warning';
      case 'accountant':
        return 'tertiary';
      case 'worker':
        return 'medium';
      case 'client':
        return 'secondary';
      default:
        return 'light';
    }
  }

  roleTranslationKey(role: ShopUserRole): string {
    return `app.businessManagement.pages.users.roles.${role}`;
  }

  branchLabel(branchId: string): string {
    return branchId === 'main'
      ? 'app.businessManagement.pages.users.branches.main'
      : branchId;
  }

  assignedShopLabel(role: ShopUserRole): string {
    if (role === 'owner' || role === 'manager') {
      return 'جميع محلات النشاط (All Shops)';
    }
    const shops = this.scope.shops();
    const currentShop = shops.find((s) => s.id === this.scope.selectedShopId());
    return currentShop ? currentShop.name : 'المحل الرئيسي (Main Shop)';
  }

  openInviteModal(): void {
    this.isInviteModalOpen.set(true);
    this.inviteEmailError.set(null);
    if (!this.invitationUrl()) {
      void this.generateInvitation(
        this.inviteMethod() === 'email' && this.inviteEmail().trim()
          ? this.inviteEmail().trim()
          : undefined,
      );
    }
  }

  closeInviteModal(): void {
    this.isInviteModalOpen.set(false);
    this.platformSearchSuccess.set(null);
  }

  async onInviteMethodChange(event: CustomEvent<{ value?: unknown }>): Promise<void> {
    const method = event.detail.value as 'qr' | 'email' | 'search' | undefined;
    if (method === 'qr' || method === 'email' || method === 'search') {
      this.inviteMethod.set(method);
      if (method === 'qr') {
        // If current invitation was tied to a specific email, regenerate open QR
        if (this.invitationEmail()) {
          await this.generateInvitation();
        } else if (!this.invitationUrl()) {
          await this.generateInvitation();
        }
      } else if (method === 'email') {
        if (this.inviteEmail().trim() && this.invitationEmail() !== this.inviteEmail().trim()) {
          this.inviteEmailError.set(null);
        }
      } else if (method === 'search') {
        this.platformSearchSuccess.set(null);
      }
    }
  }

  async createQrInvitation(): Promise<void> {
    await this.generateInvitation();
  }

  async onRoleChange(event: CustomEvent<{ value?: unknown }>): Promise<void> {
    const role = event.detail.value as 'cashier' | 'manager' | 'accountant' | 'worker' | 'client' | undefined;
    if (role) {
      this.inviteRole.set(role);
      const emailToUse =
        this.inviteMethod() === 'email'
          ? this.invitationEmail() || this.inviteEmail().trim() || undefined
          : undefined;
      await this.generateInvitation(emailToUse);
    }
  }

  async onPlatformSearch(queryText: string): Promise<void> {
    this.platformSearchQuery.set(queryText);
    const trimmed = queryText.trim();
    if (!trimmed) {
      this.platformSearchResults.set([]);
      return;
    }
    this.isSearchingPlatform.set(true);
    try {
      const results = await this.platformUserService.searchUsers(trimmed);
      this.platformSearchResults.set(results);
    } catch {
      this.platformSearchResults.set([]);
    } finally {
      this.isSearchingPlatform.set(false);
    }
  }

  async invitePlatformUser(targetUser: PlatformUserProfile): Promise<void> {
    const user = this.auth.user();
    if (!user || this.isCreatingInvitation()) return;

    this.isCreatingInvitation.set(true);
    this.platformSearchInvitedUid.set(targetUser.uid);
    this.platformSearchSuccess.set(null);

    try {
      await this.registration.createUserInvitation(user.uid, {
        email: targetUser.email,
        recipientUid: targetUser.uid,
        role: this.inviteRole(),
      });
      this.platformSearchSuccess.set(targetUser.displayName || targetUser.email);
    } catch (error) {
      console.warn('Failed to send in-platform invitation:', error);
      this.invitationError.set('app.businessManagement.pages.users.inviteError');
    } finally {
      this.isCreatingInvitation.set(false);
      this.platformSearchInvitedUid.set(null);
    }
  }

  async generateInvitation(email?: string): Promise<void> {
    const user = this.auth.user();
    if (!user || !this.canInvite() || this.isCreatingInvitation()) return;

    this.isCreatingInvitation.set(true);
    this.invitationError.set(null);
    this.isCopied.set(false);
    this.releaseInvitationQrCode();

    try {
      const result = await this.registration.createUserInvitation(user.uid, {
        email: email ? email.trim() : undefined,
        role: this.inviteRole(),
      });
      this.invitationUrl.set(result.url);
      this.invitationEmail.set(result.email);
      this.invitationRole.set(result.role as ShopUserRole);

      const svg = new BrowserQRCodeSvgWriter().write(result.url, 256, 256);
      this.invitationQrObjectUrl = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], {
          type: 'image/svg+xml',
        }),
      );
      this.invitationQrCode.set(this.invitationQrObjectUrl);
    } catch (error) {
      console.warn('Could not create a shop invitation.', error);
      this.invitationError.set('app.businessManagement.pages.users.inviteError');
    } finally {
      this.isCreatingInvitation.set(false);
    }
  }

  async submitEmailInvitation(): Promise<void> {
    const email = this.inviteEmail().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.inviteEmailError.set('app.businessManagement.pages.users.inviteEmailInvalid');
      return;
    }
    this.inviteEmailError.set(null);
    await this.generateInvitation(email);
  }

  async resetEmailForm(): Promise<void> {
    this.inviteEmail.set('');
    this.inviteEmailError.set(null);
    this.invitationEmail.set(null);
    await this.generateInvitation();
  }

  async clearEmailAssignment(): Promise<void> {
    this.inviteEmail.set('');
    this.inviteEmailError.set(null);
    await this.generateInvitation();
  }

  async copyInvitation(): Promise<void> {
    const url = this.invitationUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 3000);
    } catch (error) {
      console.warn('Could not copy the shop invitation link.', error);
      this.invitationError.set('app.businessManagement.pages.users.copyError');
    }
  }

  getMailtoUrl(): string {
    const email = this.invitationEmail() || this.inviteEmail().trim();
    const url = this.invitationUrl();
    if (!url) return '';
    const subject = encodeURIComponent('دعوة للانضمام إلى المتجر');
    const roleKey = this.roleTranslationKey(this.invitationRole());
    const body = encodeURIComponent(
      `مرحبًا،\n\nتمت دعوتك للانضمام إلى فريق عمل المتجر بصلاحية (${this.invitationRole()}).\n\nللانضمام إلى المتجر، اضغط على الرابط التالي:\n${url}\n\nتنتهي صلاحية هذه الدعوة بعد 24 ساعة.`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  dismissInvitation(): void {
    this.invitationUrl.set(null);
    this.invitationEmail.set(null);
    this.invitationQrCode.set(null);
    this.invitationError.set(null);
    this.releaseInvitationQrCode();
    this.isInviteModalOpen.set(false);
  }

  ngOnDestroy(): void {
    this.releaseInvitationQrCode();
  }

  private releaseInvitationQrCode(): void {
    if (!this.invitationQrObjectUrl) return;
    URL.revokeObjectURL(this.invitationQrObjectUrl);
    this.invitationQrObjectUrl = null;
  }

  private async loadUsers(): Promise<void> {
    try {
      await this.auth.waitUntilInitialized();
      const user = this.auth.user();
      if (!user) {
        throw new Error('An authenticated user is required to load shop users.');
      }

      const shopId = await this.registration.getCurrentShopId(user.uid);
      if (!shopId) {
        throw new Error('The authenticated user is not a member of a shop.');
      }
      const role = await this.registration.getCurrentShopRole(user.uid);
      this.canInvite.set(role === 'owner' || role === 'manager');
      const users = await this.usersService.open(shopId);
      this.usersCollection.set(users.collection);
      this.syncStatus.set(users.syncError);
      this.isLoading.set(false);
    } catch (error) {
      console.warn('Could not load shop users.', error);
      this.loadError.set(true);
      this.isLoading.set(false);
    }
  }
}

import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { injectLiveQuery } from '@tanstack/angular-db';
import { ilike } from '@tanstack/db';
import { injectTable, tableFeatures } from '@tanstack/angular-table';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonSearchbar,
  IonSpinner,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { BrowserQRCodeSvgWriter } from '@zxing/browser';
import { peopleOutline } from 'ionicons/icons';
import { FirebaseAuthService } from '../../../../firebase/firebase-auth.service';
import { ShopRegistrationService } from '../../../../auth/service/shop-registration.service';
import { LocalFirstUsersService } from '../../../../local-first/service/local-first-users.service';
import type {
  ShopUser,
  ShopUserRole,
} from '../../../../local-first/shared/user-member.model';

const USERS_TABLE_FEATURES = tableFeatures({});
const USERS_TABLE_COLUMNS = [
  { accessorKey: 'email', id: 'email' },
  { accessorKey: 'role', id: 'role' },
  { accessorKey: 'branchId', id: 'branchId' },
];

@Component({
  selector: 'app-business-management-users-page',
  templateUrl: './users.page.html',
  styleUrl: './users.page.scss',
  imports: [
    IonBadge,
    IonButton,
    IonContent,
    IonIcon,
    IonSearchbar,
    IonSpinner,
    TranslocoPipe,
  ],
})
export class BusinessManagementUsersPage implements OnInit, OnDestroy {
  private readonly auth = inject(FirebaseAuthService);
  private readonly registration = inject(ShopRegistrationService);
  private readonly usersService = inject(LocalFirstUsersService);
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
  readonly isCreatingInvitation = signal(false);
  readonly invitationUrl = signal<string | null>(null);
  readonly invitationQrCode = signal<string | null>(null);
  readonly invitationError = signal<string | null>(null);
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

  roleTranslationKey(role: ShopUserRole): string {
    return `app.businessManagement.pages.users.roles.${role}`;
  }

  branchLabel(branchId: string): string {
    return branchId === 'main'
      ? 'app.businessManagement.pages.users.branches.main'
      : branchId;
  }

  async createInvitation(): Promise<void> {
    const user = this.auth.user();
    if (!user || !this.canInvite()) return;

    this.isCreatingInvitation.set(true);
    this.invitationError.set(null);
    this.invitationUrl.set(null);
    this.invitationQrCode.set(null);
    this.releaseInvitationQrCode();
    try {
      const url = await this.registration.createUserInvitation(user.uid);
      this.invitationUrl.set(url);
      const svg = new BrowserQRCodeSvgWriter().write(url, 256, 256);
      this.invitationQrObjectUrl = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], {
          type: 'image/svg+xml',
        }),
      );
      this.invitationQrCode.set(this.invitationQrObjectUrl);
    } catch (error) {
      console.error('Could not create a shop invitation.', error);
      this.invitationError.set('app.businessManagement.pages.users.inviteError');
    } finally {
      this.isCreatingInvitation.set(false);
    }
  }

  async copyInvitation(): Promise<void> {
    const url = this.invitationUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Could not copy the shop invitation link.', error);
      this.invitationError.set('app.businessManagement.pages.users.copyError');
    }
  }

  dismissInvitation(): void {
    this.invitationUrl.set(null);
    this.invitationQrCode.set(null);
    this.invitationError.set(null);
    this.releaseInvitationQrCode();
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
      console.error('Could not load shop users.', error);
      this.loadError.set(true);
      this.isLoading.set(false);
    }
  }
}

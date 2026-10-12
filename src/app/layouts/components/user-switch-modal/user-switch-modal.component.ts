import { Component, inject, signal, computed } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  closeOutline,
  fingerPrintOutline,
  keypadOutline,
  qrCodeOutline,
  personOutline,
  lockClosedOutline,
  refreshOutline,
} from 'ionicons/icons';
import {
  DeviceSessionService,
  type ActivityUserSession,
} from '../../../local-first/service/device-session.service';

@Component({
  selector: 'app-user-switch-modal',
  templateUrl: './user-switch-modal.component.html',
  styleUrl: './user-switch-modal.component.scss',
  imports: [
    IonAvatar,
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonLabel,
    IonModal,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
  ],
})
export class UserSwitchModalComponent {
  readonly deviceSession = inject(DeviceSessionService);

  readonly isOpen = signal(false);
  readonly selectedUser = signal<ActivityUserSession | null>(null);
  readonly inputPin = signal('');
  readonly pinError = signal<string | null>(null);
  readonly switchMode = signal<'pin' | 'biometric' | 'qr'>('pin');

  readonly closeIcon = closeOutline;
  readonly pinIcon = keypadOutline;
  readonly biometricIcon = fingerPrintOutline;
  readonly qrIcon = qrCodeOutline;
  readonly personIcon = personOutline;
  readonly lockIcon = lockClosedOutline;
  readonly refreshIcon = refreshOutline;

  readonly activeUser = this.deviceSession.activeActivityUser;
  readonly users = this.deviceSession.shopDeviceUsers;
  readonly isLockedOut = this.deviceSession.isLockedOut;
  readonly failedAttempts = this.deviceSession.failedAttempts;

  openModal(): void {
    this.isOpen.set(true);
    this.selectedUser.set(this.users()[0] || null);
    this.inputPin.set('');
    this.pinError.set(null);
  }

  closeModal(): void {
    this.isOpen.set(false);
  }

  onSegmentChange(event: CustomEvent<{ value?: unknown }>): void {
    const val = event.detail.value;
    if (val === 'pin' || val === 'biometric') {
      this.switchMode.set(val);
    }
  }

  selectUser(user: ActivityUserSession): void {
    this.selectedUser.set(user);
    this.inputPin.set('');
    this.pinError.set(null);
  }

  appendPinDigit(digit: string): void {
    if (this.inputPin().length < 4) {
      const next = this.inputPin() + digit;
      this.inputPin.set(next);
      if (next.length === 4) {
        this.submitPin();
      }
    }
  }

  clearPin(): void {
    this.inputPin.set('');
    this.pinError.set(null);
  }

  submitPin(): void {
    const user = this.selectedUser();
    if (!user) return;

    const ok = this.deviceSession.switchUserByPin(user, this.inputPin());
    if (ok) {
      this.closeModal();
    } else {
      this.inputPin.set('');
      if (this.deviceSession.isLockedOut()) {
        this.pinError.set('تم تجاوز عدد المحاولات (5). الحساب مقفل مؤقتاً لمدة 30 ثانية.');
      } else {
        const remaining = 5 - this.deviceSession.failedAttempts();
        this.pinError.set(`رمز PIN غير صحيح. المحاولات المتبقية: ${remaining}`);
      }
    }
  }

  submitBiometric(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.deviceSession.switchUserWithBiometrics(user);
    this.closeModal();
  }
}

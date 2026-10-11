import {
  Component,
  ElementRef,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  alertCircleOutline,
  cameraOutline,
  imageOutline,
  stopOutline,
} from 'ionicons/icons';
import {
  BrowserQRCodeReader,
  type IScannerControls,
} from '@zxing/browser';

@Component({
  selector: 'app-shop-invitation-scanner',
  templateUrl: './shop-invitation-scanner.component.html',
  styleUrl: './shop-invitation-scanner.component.scss',
  imports: [IonButton, IonIcon, IonSpinner, TranslocoPipe],
})
export class ShopInvitationScannerComponent implements OnDestroy {
  readonly scanned = output<string>();
  readonly preview = viewChild.required<ElementRef<HTMLVideoElement>>('preview');
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly scanning = signal(false);
  readonly isProcessingFile = signal(false);
  readonly scanErrorKey = signal<string | null>(null);

  readonly cameraIcon = cameraOutline;
  readonly imageIcon = imageOutline;
  readonly stopIcon = stopOutline;
  readonly alertIcon = alertCircleOutline;

  private readonly reader = new BrowserQRCodeReader();
  private controls: IScannerControls | null = null;
  private destroyed = false;

  async startScanning(): Promise<void> {
    this.scanErrorKey.set(null);
    this.scanning.set(true);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        this.scanErrorKey.set('auth.join.scannerNotFound');
        this.scanning.set(false);
        return;
      }

      const controls = await this.reader.decodeFromVideoDevice(
        undefined,
        this.preview().nativeElement,
        (result) => {
          if (!result) return;
          const value = result.getText();
          this.stopScanning();
          this.scanned.emit(value);
        },
      );

      if (this.scanning() && !this.destroyed) {
        this.controls = controls;
      } else {
        controls.stop();
      }
    } catch (error: unknown) {
      console.warn('QR scanner camera could not be started:', error);
      this.scanning.set(false);

      const err = error as { name?: string; message?: string } | null;
      const errorName = String(err?.name ?? '').toLowerCase();
      const errorMessage = String(err?.message ?? '').toLowerCase();

      if (
        errorName.includes('notallowed') ||
        errorName.includes('permission') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('denied')
      ) {
        this.scanErrorKey.set('auth.join.scannerPermissionDenied');
      } else if (
        errorName.includes('notfound') ||
        errorName.includes('devicesnotfound') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('device')
      ) {
        this.scanErrorKey.set('auth.join.scannerNotFound');
      } else {
        this.scanErrorKey.set('auth.join.scannerError');
      }
    }
  }

  stopScanning(): void {
    this.controls?.stop();
    this.controls = null;
    this.scanning.set(false);
  }

  triggerFileInput(): void {
    this.fileInput()?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.scanErrorKey.set(null);
    this.isProcessingFile.set(true);
    const objectUrl = URL.createObjectURL(file);

    try {
      const result = await this.reader.decodeFromImageUrl(objectUrl);
      if (result) {
        this.scanned.emit(result.getText());
      } else {
        this.scanErrorKey.set('auth.join.scannerFileNoQr');
      }
    } catch {
      this.scanErrorKey.set('auth.join.scannerFileNoQr');
    } finally {
      URL.revokeObjectURL(objectUrl);
      this.isProcessingFile.set(false);
      input.value = '';
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopScanning();
  }
}


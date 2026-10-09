import {
  Component,
  ElementRef,
  OnDestroy,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton, IonSpinner } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BrowserQRCodeReader,
  type IScannerControls,
} from '@zxing/browser';

@Component({
  selector: 'app-shop-invitation-scanner',
  templateUrl: './shop-invitation-scanner.component.html',
  styleUrl: './shop-invitation-scanner.component.scss',
  imports: [IonButton, IonSpinner, TranslocoPipe],
})
export class ShopInvitationScannerComponent implements OnDestroy {
  readonly scanned = output<string>();
  readonly preview = viewChild.required<ElementRef<HTMLVideoElement>>('preview');
  readonly scanning = signal(false);
  readonly scanError = signal(false);

  private readonly reader = new BrowserQRCodeReader();
  private controls: IScannerControls | null = null;
  private destroyed = false;

  async startScanning(): Promise<void> {
    this.scanError.set(false);
    this.scanning.set(true);
    try {
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
    } catch (error) {
      console.error('Could not start the shop invitation QR scanner.', error);
      this.scanning.set(false);
      this.scanError.set(true);
    }
  }

  stopScanning(): void {
    this.controls?.stop();
    this.controls = null;
    this.scanning.set(false);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopScanning();
  }
}

import { TestBed } from '@angular/core/testing';
import { RotatingLogoComponent } from './rotating-logo.component';

describe('RotatingLogoComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('alternates between the Mahalat and shop logos every 30 seconds', async () => {
    await TestBed.configureTestingModule({
      imports: [RotatingLogoComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(RotatingLogoComponent);
    fixture.componentRef.setInput('shopName', 'Corner Market');
    fixture.componentRef.setInput('shopLogoUrl', 'https://storage.example/shop-logo.png');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.logo-flipper--shop')).toBeNull();
    expect(fixture.nativeElement.querySelector('img[src="assets/icon/favicon.png"]')).not.toBeNull();

    vi.advanceTimersByTime(29_999);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.logo-flipper--shop')).toBeNull();

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.logo-flipper--shop')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('img[src="https://storage.example/shop-logo.png"]')).not.toBeNull();

    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.logo-flipper--shop')).toBeNull();

    fixture.destroy();
  });

  it('shows the shop initial when no hosted shop logo is available', async () => {
    await TestBed.configureTestingModule({
      imports: [RotatingLogoComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(RotatingLogoComponent);
    fixture.componentRef.setInput('shopName', 'Corner Market');
    fixture.detectChanges();
    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.shop-initial')?.textContent).toBe('C');
    fixture.destroy();
  });
});

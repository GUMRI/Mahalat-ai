import { Component, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  calculatorOutline,
  chatbubbleEllipsesOutline,
  closeOutline,
  homeOutline,
  bagHandleOutline,
  sparklesOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  imports: [
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonLabel,
    IonModal,
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonTitle,
    IonToolbar,
    TranslocoPipe,
  ],
})
export class AppShellComponent {
  readonly icons = {
    home: homeOutline,
    accounting: calculatorOutline,
    workers: sparklesOutline,
    pos: bagHandleOutline,
    assistant: chatbubbleEllipsesOutline,
    close: closeOutline,
  };
  readonly isAssistantOpen = signal(false);

  closeAssistant(): void {
    this.isAssistantOpen.set(false);
  }
}

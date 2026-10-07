import { Component } from '@angular/core';
import {
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  calculatorOutline,
  homeOutline,
  bagHandleOutline,
  sparklesOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  imports: [
    IonIcon,
    IonLabel,
    IonTabBar,
    IonTabButton,
    IonTabs,
    TranslocoPipe,
  ],
})
export class AppShellComponent {
  readonly icons = {
    home: homeOutline,
    accounting: calculatorOutline,
    workers: sparklesOutline,
    pos: bagHandleOutline,
  };
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  bagHandleOutline,
  cashOutline,
  chevronForwardOutline,
  cubeOutline,
  informationCircleOutline,
  layersOutline,
  peopleOutline,
  personOutline,
  receiptOutline,
  storefrontOutline,
  walletOutline,
} from 'ionicons/icons';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-overview-page',
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
  imports: [BusinessManagementSectionPage, IonButton, IonIcon, RouterLink, TranslocoPipe],
})
export class BusinessManagementOverviewPage {
  readonly icons = {
    bag: bagHandleOutline,
    cash: cashOutline,
    chevron: chevronForwardOutline,
    cube: cubeOutline,
    info: informationCircleOutline,
    inventory: layersOutline,
    people: peopleOutline,
    person: personOutline,
    receipt: receiptOutline,
    shop: storefrontOutline,
    wallet: walletOutline,
  };
}

import { Component } from '@angular/core';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-inventory-page',
  template: '<app-business-management-section-page page="inventory" />',
  imports: [BusinessManagementSectionPage],
})
export class BusinessManagementInventoryPage {}

import { Component } from '@angular/core';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-products-page',
  template: '<app-business-management-section-page page="products" />',
  imports: [BusinessManagementSectionPage],
})
export class BusinessManagementProductsPage {}

import { Component } from '@angular/core';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-invoices-page',
  template: '<app-business-management-section-page page="invoices" />',
  imports: [BusinessManagementSectionPage],
})
export class BusinessManagementInvoicesPage {}

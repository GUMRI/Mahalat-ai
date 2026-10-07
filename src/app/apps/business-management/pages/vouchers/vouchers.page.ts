import { Component } from '@angular/core';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-vouchers-page',
  template: '<app-business-management-section-page page="vouchers" />',
  imports: [BusinessManagementSectionPage],
})
export class BusinessManagementVouchersPage {}

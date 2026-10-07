import { Component } from '@angular/core';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-shifts-page',
  template: '<app-business-management-section-page page="shifts" />',
  imports: [BusinessManagementSectionPage],
})
export class BusinessManagementShiftsPage {}

import { Component } from '@angular/core';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-shops-page',
  template: '<app-business-management-section-page page="shops" />',
  imports: [BusinessManagementSectionPage],
})
export class BusinessManagementShopsPage {}

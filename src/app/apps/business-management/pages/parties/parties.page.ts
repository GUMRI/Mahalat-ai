import { Component } from '@angular/core';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-parties-page',
  template: '<app-business-management-section-page page="parties" />',
  imports: [BusinessManagementSectionPage],
})
export class BusinessManagementPartiesPage {}

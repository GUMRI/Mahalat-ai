import { Component } from '@angular/core';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-users-page',
  template: '<app-business-management-section-page page="users" />',
  imports: [BusinessManagementSectionPage],
})
export class BusinessManagementUsersPage {}

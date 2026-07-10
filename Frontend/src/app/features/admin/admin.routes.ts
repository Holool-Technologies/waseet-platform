import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'tasks', loadComponent: () => import('./tasks/admin-tasks.component').then(m => m.AdminTasksComponent) },
      { path: 'escrow', loadComponent: () => import('./escrow/admin-escrow.component').then(m => m.AdminEscrowComponent) },
      { path: 'chat-logs', loadComponent: () => import('./chat-logs/admin-chat-logs.component').then(m => m.AdminChatLogsComponent) },
      { path: 'portfolio', loadComponent: () => import('./portfolio/admin-portfolio.component').then(m => m.AdminPortfolioComponent) },
      { path: 'task-approval', loadComponent: () => import('./task-approval/admin-task-approval.component').then(m => m.AdminTaskApprovalComponent) },
      { path: 'disputes', loadComponent: () => import('./disputes/admin-disputes.component').then(m => m.AdminDisputesComponent) },
      { path: 'delivery-settings', loadComponent: () => import('./delivery-settings/admin-delivery-settings.component').then(m => m.AdminDeliverySettingsComponent)},
      {path: 'disputes/:disputeId',loadComponent: () => import('./disputes/admin-dispute-case.component').then(m => m.AdminDisputeCaseComponent)}
    ]
  }
];
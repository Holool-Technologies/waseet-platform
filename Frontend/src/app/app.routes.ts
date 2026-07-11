import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'browse', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'browse',
    loadComponent: () =>
      import('./features/tasks/browse/browse.component').then((m) => m.BrowseComponent),
  },
  {
    path: 'tasks/:code',
    loadComponent: () =>
      import('./features/tasks/detail/task-detail/task-detail.component').then(
        (m) => m.TaskDetailComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'post-task',
    loadComponent: () =>
      import('./features/tasks/post/post-task/post-task.component').then(
        (m) => m.PostTaskComponent,
      )
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  // {
  //   path: 'chat/:taskId',
  //   loadComponent: () => import('./features/chat/chat.component').then((m) => m.ChatComponent),
  //   canActivate: [authGuard],
  // },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile/:userId',
    loadComponent: () =>
      import('./features/profile/public-profile.component').then((m) => m.PublicProfileComponent),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'chat/inbox',
    loadComponent: () =>
      import('./features/chat/inbox/chat-inbox.component').then((m) => m.ChatInboxComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'my-tasks',
    loadComponent: () =>
      import('./features/tasks/my-tasks/my-tasks.component').then((m) => m.MyTasksComponent),
    canActivate: [authGuard],
  },
  {
  path: 'my-workspace/:code',
  loadComponent: () => import('./features/workspace/freelancer-workspace.component')
    .then(m => m.FreelancerWorkspaceComponent),
  canActivate: [authGuard]
},
{
  path: 'review/:code',
  loadComponent: () => import('./features/workspace/client-review.component')
    .then(m => m.ClientReviewComponent),
  canActivate: [authGuard]
},
  { path: '**', redirectTo: 'browse' }
];

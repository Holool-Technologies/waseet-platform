import { Routes } from '@angular/router';

export const routes: Routes = [];

// import { Routes } from '@angular/router';
// import { authGuard } from './core/guards/auth.guard';
// import { kycGuard } from './core/guards/kyc.guard';

// export const routes: Routes = [
//   { path: '', redirectTo: 'browse', pathMatch: 'full' },

//   {
//     path: 'auth',
//     loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
//   },
//   {
//     path: 'browse',
//     loadComponent: () => import('./features/tasks/browse/browse.component').then(m => m.BrowseComponent)
//   },
//   {
//     path: 'tasks/:code',
//     loadComponent: () => import('./features/tasks/detail/task-detail.component').then(m => m.TaskDetailComponent),
//     canActivate: [authGuard]
//   },
//   {
//     path: 'post-task',
//     loadComponent: () => import('./features/tasks/post/post-task.component').then(m => m.PostTaskComponent),
//     canActivate: [authGuard, kycGuard]
//   },
//   {
//     path: 'dashboard',
//     loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
//     canActivate: [authGuard]
//   },
//   {
//     path: 'chat/:taskId',
//     loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
//     canActivate: [authGuard]
//   },
//   {
//     path: 'kyc',
//     loadComponent: () => import('./features/kyc/kyc.component').then(m => m.KycComponent),
//     canActivate: [authGuard]
//   },
//   { path: '**', redirectTo: 'browse' }
// ];
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: 'client',
    loadComponent: () =>
      import('./pages/client-hub/client-hub.component').then(m => m.ClientHubComponent),
  },
  {
    path: 'client/add-project',
    loadComponent: () =>
      import('./pages/add-project/add-project.component').then(m => m.AddProjectComponent),
  },
  {
    path: 'client/project/:id',
    loadComponent: () =>
      import('./pages/project-details/project-details.component').then(m => m.ProjectDetailsComponent),
  },
  {
    path: 'freelancer',
    loadComponent: () =>
      import('./pages/freelancer-hub/freelancer-hub.component').then(m => m.FreelancerHubComponent),
  },
  {
    path: 'freelancer/browse',
    loadComponent: () =>
      import('./pages/browse-projects/browse-projects.component').then(m => m.BrowseProjectsComponent),
  },
  {
    path: 'freelancer/submit-proposal/:id',
    loadComponent: () =>
      import('./pages/submit-proposal/submit-proposal.component').then(m => m.SubmitProposalComponent),
  },
  {
    path: 'chat/:id',
    loadComponent: () =>
      import('./pages/chat/chat.component').then(m => m.ChatComponent),
  },
  { path: '**', redirectTo: '' },
];

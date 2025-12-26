import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('../pages/inicio/inicio.page').then((m) => m.InicioPage),
      },
      {
        path: 'cursos',
        loadComponent: () =>
          import('../pages/cursos/cursos.page').then((m) => m.CursosPage),
      },
      {
        path: 'rubricas',
        loadComponent: () =>
          import('../pages/rubricas/rubricas.page').then((m) => m.RubricasPage),
      },
      {
        path: 'calificaciones',
        loadComponent: () =>
          import('../pages/calificaciones/calificaciones.page').then((m) => m.CalificacionesPage),
      },
      {
        path: 'sistema',
        loadComponent: () =>
          import('../pages/sistema/sistema.page').then((m) => m.SistemaPage),
      },
      {
        path: '',
        redirectTo: '/tabs/inicio',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/inicio',
    pathMatch: 'full',
  },
];

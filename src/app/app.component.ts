import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonApp,
  IonRouterOutlet
} from '@ionic/angular/standalone';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    IonApp,
    IonRouterOutlet
  ],
})
export class AppComponent implements OnInit {
  private dataService = inject(DataService);

  async ngOnInit() {
    // 🔧 CRÍTICO: Cargar datos del almacenamiento persistente al iniciar
    await this.dataService.ensureInitialized();
    console.log('✅ [AppComponent] Datos cargados del almacenamiento');
  }
}

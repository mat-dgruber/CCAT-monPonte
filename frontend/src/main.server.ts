// c:\Users\matheus.diniz\Documents\GitHub\CCAT\monPonte\frontend\src\main.server.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component'; // Certifique-se que é AppComponent
import { config } from './app/app.config.server'; // Este arquivo deve ser gerado pelo Angular CLI para SSR

const bootstrap = (context: any) => bootstrapApplication(AppComponent, config);

export default bootstrap;

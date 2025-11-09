import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { firebaseConfig } from '../../../firebaseConfig';
import { LucideAngularModule, PlusCircle, Pencil, Trash2, ArrowUpDown, Search, X, BookOpenText, Menu, CheckCircle2, XCircle, Sun, Moon, Settings, Plus, ArrowLeft, MoreVertical, Star, Bold, Italic, Strikethrough, Pilcrow, List, ListOrdered, Code, Quote, Minus, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link, Youtube, Highlighter, Pin, ChevronUp, ChevronDown, FileText, Bug, Info, Ellipsis, Copy } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    importProvidersFrom(LucideAngularModule.pick({ PlusCircle, Pencil, Trash2, ArrowUpDown, Search, X, BookOpenText, Menu, CheckCircle2, XCircle, Sun, Moon, Settings, Plus, ArrowLeft, MoreVertical, Star, Bold, Italic, Strikethrough, Pilcrow, List, ListOrdered, Code, Quote, Minus, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link, Youtube, Highlighter, Pin, ChevronUp, ChevronDown, FileText, Bug, Info, Ellipsis, Copy })),
  ],
};
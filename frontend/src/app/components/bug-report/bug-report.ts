import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../layout/header/header';
import { FooterComponent } from '../layout/footer/footer';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-bug-report',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent, LucideAngularModule],
  templateUrl: './bug-report.html',
  styleUrls: ['./bug-report.css']
})
export class BugReportComponent {

}

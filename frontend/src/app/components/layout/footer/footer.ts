import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  styleUrl: './footer.css',
  imports: [RouterLink, LucideAngularModule]
})
export class FooterComponent {

}

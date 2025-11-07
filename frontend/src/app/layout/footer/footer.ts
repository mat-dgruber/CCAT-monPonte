import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";
import { ɵɵDir } from "@angular/cdk/scrolling";
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  styleUrl: './footer.css',
  imports: [RouterLink, ɵɵDir, LucideAngularModule]
})
export class FooterComponent {

}

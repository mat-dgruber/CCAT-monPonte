import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../layout/header/header';
import { FooterComponent } from '../layout/footer/footer';


@Component({
  selector: 'app-privacy-policy',
  imports: [RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.css',
  standalone: true,
})
export class PrivacyPolicyComponent {

}

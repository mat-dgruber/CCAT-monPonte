import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../layout/header/header';
import { FooterComponent } from '../layout/footer/footer';


@Component({
  selector: 'app-terms-of-use',
  imports: [RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './terms-of-use.html',
  styleUrl: './terms-of-use.css',
  standalone: true,
})
export class TermsOfUseComponent {

}

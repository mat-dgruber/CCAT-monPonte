
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'htmlToText',
  standalone: true
})
export class HtmlToTextPipe implements PipeTransform {

  transform(value: string): string {
    if (!value) {
      return '';
    }
    // Uma forma simples de remover tags HTML usando uma expressão regular.
    // Para casos mais complexos, uma biblioteca de parsing de DOM seria mais robusta.
    return value.replace(/<[^>]*>?/gm, ' ');
  }

}

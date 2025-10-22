import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {

  private sanitizer = inject(DomSanitizer);

  transform(value: string, searchTerm: string | null): SafeHtml {
    if (!searchTerm || !value) {
      return value;
    }

    const regex = new RegExp(searchTerm, 'gi');
    const highlightedText = value.replace(regex, (match) => `<mark>${match}</mark>`);

    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }
}
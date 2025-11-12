import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string, args: string): SafeHtml {
    if (!args) {
      return this.sanitizer.bypassSecurityTrustHtml(value);
    }
    const re = new RegExp(args, 'gi');
    const highlightedValue = value.replace(re, '<mark>$&</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(highlightedValue);
  }
}
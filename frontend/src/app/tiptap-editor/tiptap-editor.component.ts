import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ClickOutsideDirective } from '../directives/click-outside.directive';

import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import YouTube from '@tiptap/extension-youtube';
import Document from '@tiptap/extension-document';

import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';

@Component({
  selector: 'app-tiptap-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective, LucideAngularModule, ClickOutsideDirective],
  templateUrl: './tiptap-editor.component.html',
  styleUrls: ['./tiptap-editor.component.css'],
})
export class TiptapEditorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() content: string = '';
  @Output() contentChange = new EventEmitter<string>();

  editor: Editor | null = null;

  showHighlightPalette = false;
  predefinedHighlightColors = [
    '#ffff00', // Amarelo
    '#90ee90', // Verde Claro
    '#ffc0cb', // Rosa
    '#add8e6', // Azul Claro
    '#ffa500', // Laranja
    '#d3d3d3'  // Cinza Claro
  ];

  showAlignDropdown = false;

  showListsDropdown = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: false,
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Underline,
        Link,
        YouTube,
        YouTube.configure({
          controls: false,
        }),
        Document,
        Placeholder.configure({
          placeholder: 'Write something…',
        }),
        Highlight.configure({ multicolor: true }),
      ],
      content: this.content,
      onUpdate: ({ editor }) => {
        this.contentChange.emit(editor.getHTML());
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.editor && changes['content']) {
      if (changes['content'].currentValue !== this.editor.getHTML()) {
        this.editor.commands.setContent(changes['content'].currentValue, { emitUpdate: false });
      }
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  setLink() {
    const url = window.prompt('URL');
    if (this.editor && url) {
      this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }

  addYoutubeVideo() {
    const url = window.prompt('URL');
    if (this.editor && url) {
      this.editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }

  closeHighlightPalette() {
    this.showHighlightPalette = false;
  }

  setHighlightColorFromPalette(color: string) {
    this.editor?.chain().focus().setHighlight({ color: color }).run();
    this.showHighlightPalette = false;
  }

  unsetHighlight() {
    this.editor?.chain().focus().unsetHighlight().run();
    this.showHighlightPalette = false;
  }

  getInputValue(event: Event): string {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      return event.target.value;
    }
    return '';
  }

  toggleAlignDropdown() {
    this.showAlignDropdown = !this.showAlignDropdown;
    this.showListsDropdown = false;
  }



  toggleListsDropdown() {
    this.showListsDropdown = !this.showListsDropdown;
    this.showAlignDropdown = false;
  }

  closeAllDropdowns() {
    this.showAlignDropdown = false;
    this.showListsDropdown = false;
  }
}

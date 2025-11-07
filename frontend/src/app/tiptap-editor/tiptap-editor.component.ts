import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import { Node, Mark } from 'prosemirror-model';
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
import { SearchHighlight } from './extensions/search-highlight.extension'; // Import the new extension

@Component({
  selector: 'app-tiptap-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective, LucideAngularModule, ClickOutsideDirective],
  templateUrl: './tiptap-editor.component.html',
  styleUrls: ['./tiptap-editor.component.css'],
})
export class TiptapEditorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() content: string = '';
  @Input() searchTerm: string = '';
  @Output() contentChange = new EventEmitter<string>();

  editor: Editor | null = null;
  private _initialContent: string = ''; // Store initial content

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
    this._initialContent = this.content; // Set initial content
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
        SearchHighlight, // Add the new extension here
      ],
      content: this.content,
      onUpdate: ({ editor }) => {
        editor.commands.clearSearchHighlights();
        const cleanHTML = editor.getHTML();
        this.contentChange.emit(cleanHTML);
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) return;

    if (changes['content']) {
      const newContent = changes['content'].currentValue;
      if (this.editor.getHTML() !== newContent) {
        this.editor.commands.setContent(newContent, { emitUpdate: false });
        this._initialContent = newContent; // Update initial content when input content changes
      }
    }

    if (changes['searchTerm']) {
      this.editor.commands.clearSearchHighlights();
      if (this.searchTerm) {
        this.applySearchHighlight(this.searchTerm);
      }
    }
  }

  ngOnDestroy(): void {
    // Emit any unsaved changes before destroying the editor, only if content has actually changed
    if (this.editor && this.editor.getHTML() !== this._initialContent) {
      this.contentChange.emit(this.editor.getHTML());
    }
    this.editor?.commands.clearSearchHighlights();
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

  private applySearchHighlight(term: string): void {
    if (!this.editor) return;

    if (!term) return;

    const text = this.editor.getText();
    const regex = new RegExp(term, 'gi');
    let match;

    // Create a new transaction
    let tr = this.editor.state.tr;
    const markType = this.editor.schema.marks['searchHighlight'];

    if (!markType) {
      console.warn('SearchHighlight mark type not found in schema.');
      return;
    }

    while ((match = regex.exec(text)) !== null) {
      const from = match.index;
      const to = match.index + match[0].length;
      tr.addMark(from, to, markType.create());
    }

    // Dispatch the transaction once after all marks have been added
    tr.setMeta('addToHistory', false); // Don't add to history for search highlights
    this.editor.view.dispatch(tr);
  }
}

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
        SearchHighlight, // Add the new extension here
      ],
      content: this.content,
      onUpdate: ({ editor }) => {
        this.contentChange.emit(editor.getHTML());
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) return;

    // Always clear search highlights when content or search term changes
    // to prevent highlights from previous notes or searches from persisting.
    if (changes['content'] || changes['searchTerm']) {
      this.editor.commands.clearSearchHighlights();
    }

    if (changes['content']) {
      const newContent = changes['content'].currentValue;
      const oldContentInput = changes['content'].previousValue; // This is the content of the *previous* note as per input

      // If it's not the first change and the editor's current content is different from the old input content,
      // it means the user made changes to the previous note that haven't been saved yet.
      if (oldContentInput !== undefined && this.editor.getHTML() !== oldContentInput) {
        this.contentChange.emit(this.editor.getHTML());
      }

      // Only update the editor if the new content is different from what's currently in the editor
      if (this.editor.getHTML() !== newContent) {
        this.editor.commands.setContent(newContent, { emitUpdate: false });
      }
    }

    // Apply new highlights if a search term is present
    if (changes['searchTerm'] && changes['searchTerm'].currentValue) {
      this.applySearchHighlight(changes['searchTerm'].currentValue);
    } else if (changes['searchTerm'] && !changes['searchTerm'].currentValue) {
      // If searchTerm becomes empty, ensure highlights are cleared (already handled by clearSearchHighlights above)
      // No need to call applySearchHighlight with an empty term, as it would just clear.
    }
  }

  ngOnDestroy(): void {
    // Emit any unsaved changes before destroying the editor
    if (this.editor && this.editor.getHTML() !== this.content) {
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

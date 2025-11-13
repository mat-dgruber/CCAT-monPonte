import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';

import StarterKit from '@tiptap/starter-kit';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ClickOutsideDirective } from '../directives/click-outside.directive';

import TextAlign from '@tiptap/extension-text-align';
import YouTube from '@tiptap/extension-youtube';

import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { SearchSelection } from './extensions/search-selection.extension';

@Component({
  selector: 'app-tiptap-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective, LucideAngularModule, ClickOutsideDirective],
  templateUrl: './tiptap-editor.component.html',
  styleUrls: ['./tiptap-editor.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class TiptapEditorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() content: string = '';
  @Input() searchTerm: string = '';
  @Input() matchIndex: number = 0;
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
          bulletList: {
            keepMarks: true,
            keepAttributes: true,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: true,
          },
        }),
            TextAlign.configure({
              types: ['heading', 'paragraph'],
            }),
        YouTube.configure({
          controls: false,
        }),
        Placeholder.configure({
          placeholder: 'Write something…',
        }),
        Highlight.configure({ multicolor: true }),
        SearchSelection,
      ],
      content: this.content,
      onUpdate: ({ editor }) => {
        editor.commands.clearSearchSelection();
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

    if (changes['searchTerm'] || changes['matchIndex']) {
      this.editor.commands.clearSearchSelection();
      if (this.searchTerm) {
        this.applySearchSelection(this.searchTerm, this.matchIndex);
      }
    }
  }

  ngOnDestroy(): void {
    // Emit any unsaved changes before destroying the editor, only if content has actually changed
    if (this.editor && this.editor.getHTML() !== this._initialContent) {
      this.contentChange.emit(this.editor.getHTML());
    }
    this.editor?.commands.clearSearchSelection();
    this.editor?.destroy();
  }

  toggleLink() {
    if (!this.editor) {
      return;
    }

    if (this.editor.isActive('link')) {
      this.editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('URL');
      if (url) {
        this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
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

  private applySearchSelection(term: string, matchIndex: number): void {
    if (!this.editor) return;

    if (!term) return;

    const text = this.editor.getText();
    const regex = new RegExp(term, 'gi');
    const matches = [...text.matchAll(regex)];

    if (matches.length > 0 && matchIndex < matches.length) {
      const match = matches[matchIndex];
      const from = match.index! + 1;
      const to = from + match[0].length;
      this.editor.commands.setSearchSelection({ from, to });
    }
  }
}

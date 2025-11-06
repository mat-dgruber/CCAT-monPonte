import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import YouTube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';
import Document from '@tiptap/extension-document';

import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { FontSize } from './font-size.extension';

@Component({
  selector: 'app-tiptap-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective, LucideAngularModule],
  templateUrl: './tiptap-editor.component.html',
  styleUrls: ['./tiptap-editor.component.css'],
})
export class TiptapEditorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() content: string = '';
  @Output() contentChange = new EventEmitter<string>();

  editor: Editor | null = null;

  constructor() {}

  ngOnInit(): void {
    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Highlight,
        Color,
        Underline,
        Link,
        YouTube,
        Image,
        Document,
        Placeholder.configure({
          placeholder: 'Write something…',
        }),
        TextStyle,
        FontFamily,
        FontSize,
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

  addImage() {
    const url = window.prompt('URL');
    if (this.editor && url) {
      this.editor.chain().focus().setImage({ src: url }).run();
    }
  }

  addYoutubeVideo() {
    const url = window.prompt('URL');
    if (this.editor && url) {
      this.editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }

  getInputValue(event: Event): string {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      return event.target.value;
    }
    return '';
  }

  setColorValue(event: Event) {
    const color = this.getInputValue(event);
    this.editor?.chain().focus().setColor(color).run();
  }

  setFontFamilyValue(event: Event) {
    const fontFamily = this.getInputValue(event);
    this.editor?.chain().focus().setFontFamily(fontFamily).run();
  }

  setFontSizeValue(event: Event) {
    const fontSize = this.getInputValue(event);
    this.editor?.chain().focus().setFontSize(fontSize + 'px').run();
  }
}

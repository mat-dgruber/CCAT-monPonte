import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

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
        StarterKit,
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
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TiptapEditorComponent } from './tiptap-editor.component';
import { Editor } from '@tiptap/core';

describe('TiptapEditorComponent', () => {
  let component: TiptapEditorComponent;
  let fixture: ComponentFixture<TiptapEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiptapEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TiptapEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle bullet list when button is clicked', () => {
    // Ensure editor is initialized
    expect(component.editor).toBeInstanceOf(Editor);

    const initialContent = '<p>Hello</p>';
    component.editor?.commands.setContent(initialContent, { emitUpdate: false });

    // Show the dropdown
    component.showListsDropdown = true;
    fixture.detectChanges();

    const bulletListButton = fixture.nativeElement.querySelector('button[title="Bullet List"]');
    expect(bulletListButton).toBeTruthy();

    bulletListButton.click();
    fixture.detectChanges();

    const content = component.editor?.getHTML();
    expect(content).toContain('<ul><li><p>Hello</p></li></ul>');

    // Toggle it off
    bulletListButton.click();
    fixture.detectChanges();

    const newContent = component.editor?.getHTML();
    expect(newContent).toBe('<p>Hello</p>');
  });

  it('should toggle ordered list when button is clicked', () => {
    // Ensure editor is initialized
    expect(component.editor).toBeInstanceOf(Editor);

    const initialContent = '<p>Hello</p>';
    component.editor?.commands.setContent(initialContent, { emitUpdate: false });

    // Show the dropdown
    component.showListsDropdown = true;
    fixture.detectChanges();

    const orderedListButton = fixture.nativeElement.querySelector('button[title="Ordered List"]');
    expect(orderedListButton).toBeTruthy();

    orderedListButton.click();
    fixture.detectChanges();

    const content = component.editor?.getHTML();
    expect(content).toContain('<ol><li><p>Hello</p></li></ol>');

    // Toggle it off
    orderedListButton.click();
    fixture.detectChanges();

    const newContent = component.editor?.getHTML();
    expect(newContent).toBe('<p>Hello</p>');
  });

  it('should apply "is-active" class to bullet list button when active', () => {
    // Ensure editor is initialized
    expect(component.editor).toBeInstanceOf(Editor);

    // Show the dropdown
    component.showListsDropdown = true;
    fixture.detectChanges();

    const bulletListButton = fixture.nativeElement.querySelector('button[title="Bullet List"]');
    expect(bulletListButton.classList.contains('is-active')).toBeFalsy();

    component.editor?.chain().focus().toggleBulletList().run();
    fixture.detectChanges();

    expect(component.editor?.isActive('bulletList')).toBeTrue();
    expect(bulletListButton.classList.contains('is-active')).toBeTruthy();
  });

  it('should apply "is-active" class to ordered list button when active', () => {
    // Ensure editor is initialized
    expect(component.editor).toBeInstanceOf(Editor);

    // Show the dropdown
    component.showListsDropdown = true;
    fixture.detectChanges();

    const orderedListButton = fixture.nativeElement.querySelector('button[title="Ordered List"]');
    expect(orderedListButton.classList.contains('is-active')).toBeFalsy();

    component.editor?.chain().focus().toggleOrderedList().run();
    fixture.detectChanges();

    expect(component.editor?.isActive('orderedList')).toBeTrue();
    expect(orderedListButton.classList.contains('is-active')).toBeTruthy();
  });
});

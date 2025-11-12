import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteColumn } from './note-column';

describe('NoteColumn', () => {
  let component: NoteColumn;
  let fixture: ComponentFixture<NoteColumn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteColumn]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteColumn);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

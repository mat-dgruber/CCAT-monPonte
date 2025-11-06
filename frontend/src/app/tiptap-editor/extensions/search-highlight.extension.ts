import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      /**
       * Set a search highlight mark
       */
      setSearchHighlight: (position: { from: number; to: number }) => ReturnType;
      /**
       * Unset a search highlight mark
       */
      unsetSearchHighlight: () => ReturnType;
      /**
       * Clear all search highlight marks
       */
      clearSearchHighlights: () => ReturnType;
    };
  }
}

export const SearchHighlight = Mark.create({
  name: 'searchHighlight',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'search-highlight',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark',
        getAttrs: (node) => (node as HTMLElement).classList.contains('search-highlight') && null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSearchHighlight:
        (position) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.addMark(position.from, position.to, this.type.create());
          }
          return true;
        },
      unsetSearchHighlight:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const { from, to } = tr.selection;
            tr.removeMark(from, to, this.type);
          }
          return true;
        },
      clearSearchHighlights:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const { tr, doc, schema } = state;
            const markType = schema.marks[this.name];

            if (markType) {
              tr.removeMark(0, doc.content.size, markType);
              tr.setMeta('addToHistory', false);
              dispatch(tr);
            }
          }
          return true;
        },
    };
  },
});

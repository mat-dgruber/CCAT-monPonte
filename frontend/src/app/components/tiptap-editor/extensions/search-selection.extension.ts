import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchSelection: {
      setSearchSelection: (position: { from: number; to: number }) => ReturnType;
      clearSearchSelection: () => ReturnType;
    };
  }
}

export const SearchSelection = Extension.create({
  name: 'searchSelection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('searchSelection'),
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => {
            set = set.map(tr.mapping, tr.doc);
            const action = tr.getMeta('search-selection');
            if (action && action.add) {
              const { from, to } = action.add;
              const deco = Decoration.inline(from, to, { class: 'search-selection' });
              set = set.add(tr.doc, [deco]);
            } else if (action && action.clear) {
              set = DecorationSet.empty;
            }
            return set;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearchSelection:
        (position) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta('search-selection', { add: { from: position.from, to: position.to } });
          }
          return true;
        },
      clearSearchSelection:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta('search-selection', { clear: true });
          }
          return true;
        },
    };
  },
});

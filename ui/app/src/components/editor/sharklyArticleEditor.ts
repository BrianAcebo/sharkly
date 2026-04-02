import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import CharacterCount from '@tiptap/extension-character-count';
import Youtube from '@tiptap/extension-youtube';
import { TableKit } from '@tiptap/extension-table';
import type { Extensions } from '@tiptap/core';

/** Prose surface inside the editor — keep in sync with Workspace article view. */
export const SHARKLY_ARTICLE_PROSE_CLASS =
	'w-full mx-auto focus:outline-none text-gray-800 dark:text-gray-300 p-10 min-h-[200px]';

/** EditorContent wrapper: flex + min height for the .tiptap root. */
export const SHARKLY_ARTICLE_EDITOR_CONTENT_CLASS =
	'flex h-full min-h-0 min-w-0 flex-1 flex-col [&_.tiptap]:min-h-[800px] [&_.tiptap]:min-w-0 [&_.tiptap]:flex-1';

export function createSharklyArticleExtensions(lowlight: any): Extensions {
	return [
		StarterKit.configure({ codeBlock: false, link: false, underline: false }),
		TableKit,
		CharacterCount,
		CodeBlockLowlight.configure({ lowlight }),
		LinkExtension.configure({
			openOnClick: false,
			enableClickSelection: true,
			validate: (href) => /^https?:\/\//.test(href),
			HTMLAttributes: { rel: null, target: null }
		}),
		Underline,
		Placeholder.configure({ placeholder: 'Write something awesome...' }),
		Image,
		TextAlign.configure({ types: ['heading', 'paragraph'] }),
		Youtube.configure({ controls: false, nocookie: true })
	];
}

/** Shared paste + link-in-editor behavior (no accidental navigation while editing). */
export function buildSharklyArticleEditorProps(cleanPastedHTML: (html: string) => string) {
	return {
		attributes: {
			class: SHARKLY_ARTICLE_PROSE_CLASS
		},
		transformPastedHTML: cleanPastedHTML,
		handleDOMEvents: {
			mousedown: (_view: any, event: Event) => {
				const target = event.target as HTMLElement;
				if (target.closest('a[href]')) event.preventDefault();
			},
			click: (_view: any, event: Event) => {
				const target = event.target as HTMLElement;
				if (target.closest('a[href]')) {
					event.preventDefault();
					event.stopPropagation();
					return true;
				}
				return false;
			}
		}
	};
}

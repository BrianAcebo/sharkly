import { useCallback, type ReactNode } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import {
	Bold,
	Italic,
	Strikethrough,
	Code,
	Underline as UnderlineIcon,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	List,
	ListOrdered,
	Quote,
	Link as LinkIcon,
	AlignLeft,
	AlignCenter,
	AlignRight,
	AlignJustify,
	Image as ImageIcon,
	Minus,
	Type,
	WrapText,
	RotateCcw,
	RotateCw,
	Eraser,
	ScrollText,
	Youtube as YoutubeIcon,
	Columns,
	Table2,
	Info
} from 'lucide-react';
import { Tooltip } from '../ui/tooltip';

const tbBtn = (active?: boolean) =>
	`rounded p-2 transition-colors ${
		active
			? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
			: 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'
	}`;

const bubbleBtn = (active?: boolean) =>
	`rounded p-1.5 transition-colors ${
		active
			? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white'
			: 'hover:bg-gray-100 dark:hover:bg-gray-700'
	}`;

const sep = <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />;

function useArticleEditorLinkMediaHandlers(editor: Editor | null) {
	const setLinkHandler = useCallback(() => {
		if (!editor) return;
		if (editor.isActive('link')) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		const previousUrl = editor.getAttributes('link').href as string | undefined;
		const url = window.prompt('URL', previousUrl);
		if (url === null) return;
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		if (!/^https?:\/\//.test(url)) {
			window.alert('Invalid Link');
			return;
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	}, [editor]);

	const addImageHandler = useCallback(() => {
		if (!editor) return;
		const url = window.prompt('Enter Image URL');
		if (url) editor.chain().focus().setImage({ src: url }).run();
	}, [editor]);

	const addYoutubeHandler = useCallback(() => {
		if (!editor) return;
		const url = window.prompt('Enter YouTube URL');
		if (url) {
			const height = window.prompt('Enter height in px', '480');
			editor.commands.setYoutubeVideo({
				src: url,
				width: 640,
				height: height ? Math.max(180, parseInt(height, 10)) : 480
			});
		}
	}, [editor]);

	return { setLinkHandler, addImageHandler, addYoutubeHandler };
}

export function ArticleEditorToolbar({
	editor,
	className,
	trailingSlot
}: {
	editor: Editor | null;
	/** Extra classes (e.g. `mx-6` for blog column gutters). */
	className?: string;
	/** Right side of the toolbar (e.g. Generate Video). */
	trailingSlot?: ReactNode;
}) {
	const { setLinkHandler, addImageHandler, addYoutubeHandler } = useArticleEditorLinkMediaHandlers(editor);
	if (!editor) return null;

	return (
		<div
			className={`sticky top-0 z-10 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900 ${className ?? ''}`}
		>
			<div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-1">
			<Tooltip content="Align left" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().setTextAlign('left').run()}
					className={tbBtn(editor.isActive({ textAlign: 'left' }))}
					aria-label="Align left"
				>
					<AlignLeft className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Align center" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().setTextAlign('center').run()}
					className={tbBtn(editor.isActive({ textAlign: 'center' }))}
					aria-label="Align center"
				>
					<AlignCenter className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Align right" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().setTextAlign('right').run()}
					className={tbBtn(editor.isActive({ textAlign: 'right' }))}
					aria-label="Align right"
				>
					<AlignRight className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Align justify" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().setTextAlign('justify').run()}
					className={tbBtn(editor.isActive({ textAlign: 'justify' }))}
					aria-label="Align justify"
				>
					<AlignJustify className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Unset text align" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().unsetTextAlign().run()}
					className={tbBtn()}
					aria-label="Unset align"
				>
					<Columns className="size-4" />
				</button>
			</Tooltip>
			{sep}
			<Tooltip content="Image" tooltipPosition="bottom">
				<button type="button" onClick={addImageHandler} className={tbBtn()} aria-label="Image">
					<ImageIcon className="size-4" />
				</button>
			</Tooltip>
			{sep}
			<Tooltip content="Bullet list" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					className={tbBtn(editor.isActive('bulletList'))}
					aria-label="Bullet list"
				>
					<List className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Ordered list" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					className={tbBtn(editor.isActive('orderedList'))}
					aria-label="Ordered list"
				>
					<ListOrdered className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Code block" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleCodeBlock().run()}
					className={tbBtn(editor.isActive('codeBlock'))}
					aria-label="Code block"
				>
					<Code className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Blockquote" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
					className={tbBtn(editor.isActive('blockquote'))}
					aria-label="Blockquote"
				>
					<Quote className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Horizontal rule" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().setHorizontalRule().run()}
					className={tbBtn()}
					aria-label="HR"
				>
					<Minus className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Insert table" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() =>
						editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()
					}
					className={tbBtn()}
					aria-label="Table"
				>
					<Table2 className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Hard break" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().setHardBreak().run()}
					className={tbBtn()}
					aria-label="Hard break"
				>
					<WrapText className="size-4" />
				</button>
			</Tooltip>
			{sep}
			<Tooltip content="Undo" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().undo().run()}
					disabled={!editor.can().undo()}
					className={tbBtn()}
					aria-label="Undo"
				>
					<RotateCcw className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Redo" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().redo().run()}
					disabled={!editor.can().redo()}
					className={tbBtn()}
					aria-label="Redo"
				>
					<RotateCw className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Unset all marks" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().unsetAllMarks().run()}
					className={tbBtn()}
					aria-label="Clear marks"
				>
					<Eraser className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Clear nodes" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().clearNodes().run()}
					className={tbBtn()}
					aria-label="Clear nodes"
				>
					<ScrollText className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="YouTube" tooltipPosition="bottom">
				<button type="button" onClick={addYoutubeHandler} className={tbBtn()} aria-label="YouTube">
					<YoutubeIcon className="size-4" />
				</button>
			</Tooltip>
			<Tooltip
				content="Styles you see here may not look the same on your website, as they depend on your website's styling."
				tooltipPosition="bottom"
				usePortal
				className="max-w-xs text-center whitespace-normal"
			>
				<button
					type="button"
					className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Editor styling note"
				>
					<Info className="size-4" />
				</button>
			</Tooltip>
			</div>
			{trailingSlot ? (
				<div className="flex shrink-0 items-center gap-2 border-l border-gray-200 pl-2 dark:border-gray-700">
					{trailingSlot}
				</div>
			) : null}
		</div>
	);
}

export function ArticleEditorBubbleMenu({ editor }: { editor: Editor | null }) {
	const { setLinkHandler } = useArticleEditorLinkMediaHandlers(editor);
	if (!editor) return null;

	return (
		<BubbleMenu
			editor={editor}
			className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
		>
			<Tooltip content="Bold" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleBold().run()}
					className={bubbleBtn(editor.isActive('bold'))}
					aria-label="Bold"
				>
					<Bold className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Italic" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleItalic().run()}
					className={bubbleBtn(editor.isActive('italic'))}
					aria-label="Italic"
				>
					<Italic className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Strikethrough" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleStrike().run()}
					className={bubbleBtn(editor.isActive('strike'))}
					aria-label="Strike"
				>
					<Strikethrough className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Underline" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleUnderline().run()}
					className={bubbleBtn(editor.isActive('underline'))}
					aria-label="Underline"
				>
					<UnderlineIcon className="size-4" />
				</button>
			</Tooltip>
			<Tooltip content="Code" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleCode().run()}
					className={bubbleBtn(editor.isActive('code'))}
					aria-label="Code"
				>
					<Code className="size-4" />
				</button>
			</Tooltip>
			<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-600" />
			<Tooltip content="Paragraph" tooltipPosition="bottom">
				<button
					type="button"
					onClick={() => editor.chain().focus().setParagraph().run()}
					className={tbBtn(editor.isActive('paragraph'))}
					aria-label="Paragraph"
				>
					<Type className="size-4" />
				</button>
			</Tooltip>
			{([1, 2, 3, 4, 5, 6] as const).map((level) => (
				<Tooltip key={level} content={`Heading ${level}`} tooltipPosition="bottom">
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
						className={tbBtn(editor.isActive('heading', { level }))}
						aria-label={`H${level}`}
					>
						{level === 1 && <Heading1 className="size-4" />}
						{level === 2 && <Heading2 className="size-4" />}
						{level === 3 && <Heading3 className="size-4" />}
						{level === 4 && <Heading4 className="size-4" />}
						{level === 5 && <Heading5 className="size-4" />}
						{level === 6 && <Heading6 className="size-4" />}
					</button>
				</Tooltip>
			))}
			<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-600" />
			<Tooltip content="Link" tooltipPosition="bottom">
				<button
					type="button"
					onClick={setLinkHandler}
					className={bubbleBtn(editor.isActive('link'))}
					aria-label="Link"
				>
					<LinkIcon className="size-4" />
				</button>
			</Tooltip>
		</BubbleMenu>
	);
}

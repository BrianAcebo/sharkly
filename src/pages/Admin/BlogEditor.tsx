import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
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
import { createLowlight, all } from 'lowlight';
import 'highlight.js/styles/github.css';
import {
	ArrowLeft,
	Save,
	Globe,
	FileText,
	ChevronDown,
	ChevronUp,
	Loader2,
	Star,
	Info,
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
	Table2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Tooltip } from '../../components/ui/tooltip';
import PageMeta from '../../components/common/PageMeta';
import { useBlogCategories, fetchBlogPost, saveBlogPost, type BlogPost } from '../../hooks/useBlog';
import { cleanPastedHTML } from '../../lib/editorUtils';

const lowlight = createLowlight(all);

const CHAR_LIMITS = { meta_title: 60, meta_description: 160 };

function charColor(val: string, max: number) {
	const len = val.length;
	if (len > max) return 'text-red-500';
	if (len > max * 0.9) return 'text-amber-500';
	return 'text-gray-400';
}

function slugify(s: string) {
	return s
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

type FormState = {
	title: string;
	slug: string;
	excerpt: string;
	category_id: string;
	status: 'draft' | 'published' | 'archived';
	author_name: string;
	meta_title: string;
	meta_description: string;
	og_image_url: string;
	canonical_url: string;
	featured: boolean;
};

const EMPTY_FORM: FormState = {
	title: '',
	slug: '',
	excerpt: '',
	category_id: '',
	status: 'draft',
	author_name: 'Sharkly Team',
	meta_title: '',
	meta_description: '',
	og_image_url: '',
	canonical_url: '',
	featured: false
};

// Shared toolbar button class (matches Workspace exactly)
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

export default function BlogEditor() {
	const { id } = useParams<{ id?: string }>();
	const navigate = useNavigate();
	const { categories } = useBlogCategories();

	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [loading, setLoading] = useState(!!id);
	const [saving, setSaving] = useState(false);
	const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
	const [editorVersion, setEditorVersion] = useState(0);
	const [slugManual, setSlugManual] = useState(false);
	const [seoOpen, setSeoOpen] = useState(false);
	const [initialContent, setInitialContent] = useState<object | string | null>(null);
	const titleRef = useRef<HTMLInputElement>(null);

	// Fetch post data first — content is stored in state so editor can use it as initial value
	useEffect(() => {
		if (!id) {
			setLoading(false);
			return;
		}
		fetchBlogPost(id)
			.then((post) => {
				setForm({
					title: post.title,
					slug: post.slug,
					excerpt: post.excerpt ?? '',
					category_id: post.category_id ?? '',
					status: post.status as FormState['status'],
					author_name: post.author_name,
					meta_title: post.meta_title ?? '',
					meta_description: post.meta_description ?? '',
					og_image_url: post.og_image_url ?? '',
					canonical_url: post.canonical_url ?? '',
					featured: post.featured
				});
			setSlugManual(true);
			// Use Tiptap JSON if saved, fall back to raw HTML (e.g. seeded posts)
			setInitialContent(
				(post.content as object | null) ??
				(post.content_html ? post.content_html : null)
			);
			})
			.catch(() => toast.error('Failed to load post'))
			.finally(() => setLoading(false));
	}, [id]);

	// Pass initialContent as the editor's starting content.
	// The second argument ([initialContent]) is Tiptap v3's dependency array —
	// it recreates the editor when initialContent changes (i.e. after the fetch above).
	// Accepts either a Tiptap JSON object or an HTML string (fallback for seeded/legacy posts).
	const editor = useEditor(
		{
			extensions: [
				StarterKit.configure({ codeBlock: false, link: false }),
				TableKit,
				CharacterCount,
				CodeBlockLowlight.configure({ lowlight }),
				LinkExtension.configure({
					validate: (href) => /^https?:\/\//.test(href),
					HTMLAttributes: { rel: null, target: null }
				}),
				Underline,
				Placeholder.configure({ placeholder: 'Write something awesome...' }),
				Image,
				TextAlign.configure({ types: ['heading', 'paragraph'] }),
				Youtube.configure({ controls: false, nocookie: true })
			],
		content: (initialContent as string | object) ?? '',
		editorProps: {
			attributes: {
				class: 'w-full mx-auto focus:outline-none text-gray-800 dark:text-gray-300 p-10 min-h-[400px]'
			},
			transformPastedHTML: cleanPastedHTML
		},
		onTransaction: () => {
			setEditorVersion((v) => v + 1);
		}
	},
	[initialContent] // recreate editor once content arrives
);

// Auto-save: 2s debounce after editor changes, only for existing posts
useEffect(() => {
	if (!editor || !id || editorVersion === 0) return;
	setAutoSaveStatus('idle');
	const timer = setTimeout(async () => {
		if (!editor) return;
		setAutoSaveStatus('saving');
		try {
			const content = editor.getJSON();
			await saveBlogPost(id, { content: content as object });
			setAutoSaveStatus('saved');
		} catch {
			setAutoSaveStatus('idle');
		}
	}, 2000);
	return () => clearTimeout(timer);
}, [editor, id, editorVersion]);

	const set = useCallback(
		<K extends keyof FormState>(key: K, val: FormState[K]) => {
			setForm((f) => {
				const next = { ...f, [key]: val };
				if (key === 'title' && !slugManual) next.slug = slugify(val as string);
				return next;
			});
		},
		[slugManual]
	);

	// ── Link / Image / YouTube handlers (identical to Workspace) ────────────

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

	// ── Save ────────────────────────────────────────────────────────────────

	async function handleSave(publish?: boolean) {
		if (!form.title.trim()) {
			toast.error('Title is required');
			return;
		}
		setSaving(true);
		try {
			const content = editor?.getJSON() ?? null;
			const payload: Partial<BlogPost> = {
				...form,
				category_id: form.category_id || null,
				content: content as object,
				status: publish ? 'published' : form.status
			};
			const saved = await saveBlogPost(id ?? null, payload);
			toast.success(publish ? 'Published!' : 'Saved');
			if (!id) navigate(`/admin/blog/edit/${saved.id}`, { replace: true });
			else setForm((f) => ({ ...f, status: saved.status as FormState['status'] }));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Save failed');
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
			</div>
		);
	}

	const isPublished = form.status === 'published';
	const wordCount = editor ? editor.storage.characterCount.words() : 0;

	return (
		<>
			<PageMeta
				title={`${id ? 'Edit' : 'New'} Post | Blog CMS`}
				description="Write and publish blog content"
			/>

			<div className="flex h-screen flex-col bg-white dark:bg-gray-950">
				{/* ── Top bar ───────────────────────────────────────────────── */}
				<div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
					<div className="flex items-center gap-3">
						<button
							onClick={() => navigate('/admin/blog')}
							className="rounded p-1.5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
						>
							<ArrowLeft className="h-4 w-4" />
						</button>
						<span className="text-sm text-gray-500">{id ? 'Edit Post' : 'New Post'}</span>
						<span
							className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
								isPublished
									? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
									: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
							}`}
						>
							{form.status}
						</span>
						<span className="text-xs text-gray-400">{wordCount.toLocaleString()} words</span>
					</div>
				<div className="flex items-center gap-3">
					{/* Auto-save indicator */}
					{id && autoSaveStatus !== 'idle' && (
						<span className="flex items-center gap-1.5 text-[11px] text-gray-400">
							{autoSaveStatus === 'saving' ? (
								<><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
							) : (
								<><span className="text-green-500">✓</span> Saved</>
							)}
						</span>
					)}
					<Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
						{saving ? (
							<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
						) : (
							<Save className="mr-2 h-3.5 w-3.5" />
						)}
						Save Draft
					</Button>
						{!isPublished ? (
							<Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
								<Globe className="mr-2 h-3.5 w-3.5" />
								Publish
							</Button>
						) : (
							<Button size="sm" onClick={() => handleSave(false)} disabled={saving}>
								<Save className="mr-2 h-3.5 w-3.5" />
								Update
							</Button>
						)}
					</div>
				</div>

				{/* ── Body ──────────────────────────────────────────────────── */}
				<div className="flex min-h-0 flex-1 overflow-hidden">
					{/* Editor column — title + toolbar fixed; editor scrolls */}
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{/* Title + slug */}
					<div className="px-10 pt-8 pb-4 border-b border-gray-100 dark:border-gray-800 mb-2">
						<label className="mb-1 block text-xs font-medium text-gray-400 uppercase tracking-wide">
							Title
						</label>
						<input
							ref={titleRef}
							value={form.title}
							onChange={(e) => set('title', e.target.value)}
							placeholder="Post title"
							className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-2xl font-bold text-gray-900 placeholder:text-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
						/>
						<div className="mt-3 flex items-center gap-2">
							<label className="text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0">
								Slug
							</label>
							<div className="flex flex-1 items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-900/30">
								<span className="text-xs text-gray-400 shrink-0">sharkly.co/blog/…/</span>
								<input
									value={form.slug}
									onChange={(e) => {
										setSlugManual(true);
										set('slug', e.target.value);
									}}
									className="flex-1 bg-transparent font-mono text-sm text-blue-600 focus:outline-none dark:text-blue-400 min-w-0"
									spellCheck={false}
									placeholder="post-slug"
								/>
							</div>
						</div>
					</div>

						{/* ── Toolbar (exact copy of Workspace) ─────────────────── */}
						{editor && (
							<div className="z-10 mx-6 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
								<Tooltip content="Align left" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().setTextAlign('left').run()}
										className={tbBtn(editor.isActive({ textAlign: 'left' }))}
										aria-label="Align left"
									>
										<AlignLeft className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Align center" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().setTextAlign('center').run()}
										className={tbBtn(editor.isActive({ textAlign: 'center' }))}
										aria-label="Align center"
									>
										<AlignCenter className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Align right" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().setTextAlign('right').run()}
										className={tbBtn(editor.isActive({ textAlign: 'right' }))}
										aria-label="Align right"
									>
										<AlignRight className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Align justify" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().setTextAlign('justify').run()}
										className={tbBtn(editor.isActive({ textAlign: 'justify' }))}
										aria-label="Align justify"
									>
										<AlignJustify className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Unset text align" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().unsetTextAlign().run()}
										className={tbBtn()}
										aria-label="Unset align"
									>
										<Columns className="size-4" />
									</button>
								</Tooltip>
								{sep}
								<Tooltip content="Image" tooltipPosition="bottom">
									<button onClick={addImageHandler} className={tbBtn()} aria-label="Image">
										<ImageIcon className="size-4" />
									</button>
								</Tooltip>
								{sep}
								<Tooltip content="Bullet list" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().toggleBulletList().run()}
										className={tbBtn(editor.isActive('bulletList'))}
										aria-label="Bullet list"
									>
										<List className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Ordered list" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().toggleOrderedList().run()}
										className={tbBtn(editor.isActive('orderedList'))}
										aria-label="Ordered list"
									>
										<ListOrdered className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Code block" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().toggleCodeBlock().run()}
										className={tbBtn(editor.isActive('codeBlock'))}
										aria-label="Code block"
									>
										<Code className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Blockquote" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().toggleBlockquote().run()}
										className={tbBtn(editor.isActive('blockquote'))}
										aria-label="Blockquote"
									>
										<Quote className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Horizontal rule" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().setHorizontalRule().run()}
										className={tbBtn()}
										aria-label="HR"
									>
										<Minus className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Insert table" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}
										className={tbBtn()}
										aria-label="Table"
									>
										<Table2 className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Hard break" tooltipPosition="bottom">
									<button
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
										onClick={() => editor.chain().focus().unsetAllMarks().run()}
										className={tbBtn()}
										aria-label="Clear marks"
									>
										<Eraser className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="Clear nodes" tooltipPosition="bottom">
									<button
										onClick={() => editor.chain().focus().clearNodes().run()}
										className={tbBtn()}
										aria-label="Clear nodes"
									>
										<ScrollText className="size-4" />
									</button>
								</Tooltip>
								<Tooltip content="YouTube" tooltipPosition="bottom">
									<button onClick={addYoutubeHandler} className={tbBtn()} aria-label="YouTube">
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
										aria-label="Info"
									>
										<Info className="size-4" />
									</button>
								</Tooltip>
							</div>
						)}

						{/* ── Editor + BubbleMenu ────────────────────────────────── */}
						<div className="scrollbar-branded relative mx-6 mb-6 flex min-h-[300px] min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
							{editor && (
								<BubbleMenu
									editor={editor}
									className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
								>
									<Tooltip content="Bold" tooltipPosition="bottom">
										<button
											onClick={() => editor.chain().focus().toggleBold().run()}
											className={bubbleBtn(editor.isActive('bold'))}
											aria-label="Bold"
										>
											<Bold className="size-4" />
										</button>
									</Tooltip>
									<Tooltip content="Italic" tooltipPosition="bottom">
										<button
											onClick={() => editor.chain().focus().toggleItalic().run()}
											className={bubbleBtn(editor.isActive('italic'))}
											aria-label="Italic"
										>
											<Italic className="size-4" />
										</button>
									</Tooltip>
									<Tooltip content="Strikethrough" tooltipPosition="bottom">
										<button
											onClick={() => editor.chain().focus().toggleStrike().run()}
											className={bubbleBtn(editor.isActive('strike'))}
											aria-label="Strike"
										>
											<Strikethrough className="size-4" />
										</button>
									</Tooltip>
									<Tooltip content="Underline" tooltipPosition="bottom">
										<button
											onClick={() => editor.chain().focus().toggleUnderline().run()}
											className={bubbleBtn(editor.isActive('underline'))}
											aria-label="Underline"
										>
											<UnderlineIcon className="size-4" />
										</button>
									</Tooltip>
									<Tooltip content="Code" tooltipPosition="bottom">
										<button
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
											onClick={setLinkHandler}
											className={bubbleBtn(editor.isActive('link'))}
											aria-label="Link"
										>
											<LinkIcon className="size-4" />
										</button>
									</Tooltip>
								</BubbleMenu>
							)}
							<EditorContent
								editor={editor}
								className="flex min-h-0 min-w-0 flex-1 flex-col [&_.tiptap]:min-h-[300px] [&_.tiptap]:min-w-0 [&_.tiptap]:flex-1"
							/>
						</div>
					</div>

					{/* ── Sidebar ───────────────────────────────────────────── */}
					<div className="w-90 shrink-0 space-y-4 overflow-y-auto border-l border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
						<Section title="Post Settings" icon={<FileText className="h-4 w-4" />}>
							<label className="block">
								<span className="text-xs font-medium text-gray-500">Status</span>
								<select
									value={form.status}
									onChange={(e) => set('status', e.target.value as FormState['status'])}
									className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
								>
									<option value="draft">Draft</option>
									<option value="published">Published</option>
									<option value="archived">Archived</option>
								</select>
							</label>

							<label className="block">
								<span className="text-xs font-medium text-gray-500">Category</span>
								<select
									value={form.category_id}
									onChange={(e) => set('category_id', e.target.value)}
									className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
								>
									<option value="">— No category —</option>
									{categories.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							</label>

							<label className="block">
								<span className="text-xs font-medium text-gray-500">Author</span>
								<input
									value={form.author_name}
									onChange={(e) => set('author_name', e.target.value)}
									className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
								/>
							</label>

							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									checked={form.featured}
									onChange={(e) => set('featured', e.target.checked)}
									className="rounded"
								/>
								<div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
									<Star className="h-3.5 w-3.5 text-amber-400" />
									Featured post
								</div>
							</label>

							<label className="block">
								<span className="text-xs font-medium text-gray-500">Excerpt</span>
								<textarea
									value={form.excerpt}
									onChange={(e) => set('excerpt', e.target.value)}
									rows={5}
									placeholder="Brief summary shown in post cards..."
									className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
								/>
							</label>

							<label className="block">
								<span className="text-xs font-medium text-gray-500">Featured Image URL</span>
								<input
									value={form.og_image_url}
									onChange={(e) => set('og_image_url', e.target.value)}
									placeholder="https://..."
									className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
								/>
								{form.og_image_url && (
									<img
										src={form.og_image_url}
										alt=""
										className="mt-2 h-28 w-full rounded-lg object-cover"
										onError={(e) => (e.currentTarget.style.display = 'none')}
									/>
								)}
							</label>
						</Section>

						<Section
							title="SEO"
							icon={<Globe className="h-4 w-4" />}
							collapsible
							open={seoOpen}
							onToggle={() => setSeoOpen((o) => !o)}
						>
							<div className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
								<Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
								<p className="text-xs text-blue-600 dark:text-blue-400">
									Leave blank to auto-fill from title/excerpt
								</p>
							</div>

							<label className="block">
								<div className="flex items-center justify-between">
									<span className="text-xs font-medium text-gray-500">Meta Title</span>
									<span className={`text-xs ${charColor(form.meta_title, CHAR_LIMITS.meta_title)}`}>
										{form.meta_title.length}/{CHAR_LIMITS.meta_title}
									</span>
								</div>
								<input
									value={form.meta_title}
									onChange={(e) => set('meta_title', e.target.value)}
									placeholder={form.title || 'Meta title...'}
									className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
								/>
							</label>

							<label className="block">
								<div className="flex items-center justify-between">
									<span className="text-xs font-medium text-gray-500">Meta Description</span>
									<span
										className={`text-xs ${charColor(form.meta_description, CHAR_LIMITS.meta_description)}`}
									>
										{form.meta_description.length}/{CHAR_LIMITS.meta_description}
									</span>
								</div>
								<textarea
									value={form.meta_description}
									onChange={(e) => set('meta_description', e.target.value)}
									rows={3}
									placeholder={form.excerpt || 'Meta description...'}
									className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
								/>
							</label>

							<label className="block">
								<span className="text-xs font-medium text-gray-500">Canonical URL</span>
								<input
									value={form.canonical_url}
									onChange={(e) => set('canonical_url', e.target.value)}
									placeholder="https://sharkly.co/blog/..."
									className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
								/>
							</label>

							{/* SERP Preview */}
							<div className="space-y-0.5 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
								<p className="mb-1 text-xs font-medium text-gray-400">SERP Preview</p>
								<p className="line-clamp-1 text-sm font-medium text-blue-600 dark:text-blue-400">
									{form.meta_title || form.title || 'Post Title'}
								</p>
								<p className="font-mono text-xs text-green-600 dark:text-green-400">
									sharkly.co/blog › {form.slug || 'post-slug'}
								</p>
								<p className="line-clamp-2 text-xs text-gray-500">
									{form.meta_description ||
										form.excerpt ||
										'Your meta description will appear here...'}
								</p>
							</div>
						</Section>
					</div>
				</div>
			</div>
		</>
	);
}

// ── Section component ────────────────────────────────────────────────────────

function Section({
	title,
	icon,
	children,
	collapsible,
	open,
	onToggle
}: {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	collapsible?: boolean;
	open?: boolean;
	onToggle?: () => void;
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<button
				className={`flex w-full items-center justify-between px-3 py-2.5 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
				onClick={collapsible ? onToggle : undefined}
			>
				<div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
					{icon}
					{title}
				</div>
				{collapsible &&
					(open ? (
						<ChevronUp className="h-4 w-4 text-gray-400" />
					) : (
						<ChevronDown className="h-4 w-4 text-gray-400" />
					))}
			</button>
			{(!collapsible || open) && (
				<div className="space-y-3 border-t border-gray-100 px-3 py-3 dark:border-gray-800">
					{children}
				</div>
			)}
		</div>
	);
}

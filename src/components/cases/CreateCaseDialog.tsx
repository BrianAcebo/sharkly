import * as React from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Badge } from '../ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { createCase, ensureCaseCategory, ensureCaseTags, listCaseCategories, listCaseTags } from '../../api/cases';
import { listSubjects, createSubject, type SubjectRecord } from '../../api/subjects';
import { useAuth } from '../../contexts/AuthContext';
//

const schema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  tags: z.array(z.string()).optional().default([])
});

type FormValues = z.infer<typeof schema>;

export function CreateCaseDialog({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [categoryInput, setCategoryInput] = React.useState('');
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [tagOpen, setTagOpen] = React.useState(false);
  const [tagQuery, setTagQuery] = React.useState('');
  const [subjectQuery, setSubjectQuery] = React.useState('');
  const [categoryBrowseQuery, setCategoryBrowseQuery] = React.useState('');
  const [tagBrowseQuery, setTagBrowseQuery] = React.useState('');
  const [categoryOptions, setCategoryOptions] = React.useState<{ id: string; name: string }[]>([]);
  const [tagOptions, setTagOptions] = React.useState<{ id: string; name: string }[]>([]);
  const [subjectOptions, setSubjectOptions] = React.useState<SubjectRecord[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string | null>(null);
  const [newSubjectMode, setNewSubjectMode] = React.useState(false);
  const [newSubject, setNewSubject] = React.useState<{ type: 'person' | 'company'; name: string; email: string }>({ type: 'person', name: '', email: '' });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { title: '', description: '', category: '', priority: 'low', tags: [] },
  });

  React.useEffect(() => {
    async function loadOptions() {
      if (!user?.organization_id) return;
      const [cats, tags, subs] = await Promise.all([
        listCaseCategories(user.organization_id),
        listCaseTags(user.organization_id),
        listSubjects(user.organization_id)
      ]);
      setCategoryOptions(cats);
      setTagOptions(tags);
      setSubjectOptions(subs.results);
    }
    if (open) loadOptions();
  }, [open, user?.organization_id]);

  const onSubmit = async (values: FormValues) => {
    if (!user?.id || !user?.organization_id) return;
    setSubmitting(true);
    try {
      if (values.category && values.category.trim()) {
        await ensureCaseCategory(user.organization_id, values.category);
      }
      if (values.tags && values.tags.length > 0) {
        await ensureCaseTags(user.organization_id, values.tags);
      }

      let subject_id: string | undefined = selectedSubjectId ?? undefined;
      if (!subject_id && newSubjectMode && newSubject.name.trim()) {
        const created = await createSubject({
          organization_id: user.organization_id,
          type: newSubject.type,
          name: newSubject.name.trim(),
          email: newSubject.email.trim() || null
        });
        subject_id = created.id;
      }
      await createCase({
        organization_id: user.organization_id,
        created_by: user.id,
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        tags: values.tags,
        subject_id,
      });
      setOpen(false);
      form.reset();
      onCreated?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateClick = () => {
    void form.handleSubmit(onSubmit)();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New Case</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Case</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Case title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Brief description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {field.value && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        {field.value}
                        <button
                          type="button"
                          className="text-xs opacity-70 hover:opacity-100"
                          onClick={() => field.onChange('')}
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-col flex-start gap-2">
                    <Input
                      placeholder="Add or search category..."
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = categoryInput.trim();
                          if (!v) return;
                          field.onChange(v);
                          setCategoryInput('');
                        }
                      }}
                    />
                    <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button className="w-fit" type="button" variant="outline" onClick={() => setCategoryOpen(true)}>Browse</Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search categories" value={categoryBrowseQuery} onValueChange={setCategoryBrowseQuery} />
                          <CommandList>
                            <CommandEmpty>No results</CommandEmpty>
                            <CommandGroup>
                              {categoryOptions
                                .filter((c) => c.name.toLowerCase().includes(categoryBrowseQuery.toLowerCase()))
                                .map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    onSelect={() => {
                                      field.onChange(c.name);
                                      setCategoryBrowseQuery('');
                                      setCategoryOpen(false);
                                    }}
                                  >
                                    {c.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {/* Removed explicit Add button for simpler UX */}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

              {/* Tags column (same row as Category) */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {field.value?.map((t, idx) => (
                        <Badge key={t + idx} variant="outline" className="flex items-center gap-1">
                          {t}
                          <button
                            type="button"
                            className="text-xs opacity-70 hover:opacity-100"
                            onClick={() => field.onChange(field.value.filter((x) => x !== t))}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-col flex-start gap-2">
                      <Input
                        placeholder="Add or search tag..."
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const v = tagQuery.trim();
                            if (!v) return;
                            if (!field.value?.includes(v)) {
                              field.onChange([...(field.value ?? []), v]);
                            }
                            setTagQuery('');
                          }
                        }}
                      />
                      <Popover open={tagOpen} onOpenChange={setTagOpen}>
                        <PopoverTrigger asChild>
                          <Button className="w-fit" type="button" variant="outline" onClick={() => setTagOpen(true)}>Browse</Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search tags" value={tagBrowseQuery} onValueChange={setTagBrowseQuery} />
                            <CommandList>
                              <CommandEmpty>No results</CommandEmpty>
                              <CommandGroup>
                                {tagOptions
                                  .filter((t) => t.name.toLowerCase().includes(tagBrowseQuery.toLowerCase()))
                                  .map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      onSelect={() => {
                                        if (!field.value?.includes(c.name)) {
                                          field.onChange([...(field.value ?? []), c.name]);
                                        }
                                        setTagBrowseQuery('');
                                        setTagOpen(false);
                                      }}
                                    >
                                      {c.name}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          {/* Priority below */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          </form>
        </Form>

        {/* Subject selector/creator */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Attach Subject</span>
            {!newSubjectMode ? (
              <Button size="sm" variant="outline" onClick={() => setNewSubjectMode(true)}>New subject</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setNewSubjectMode(false)}>Select existing</Button>
            )}
          </div>

          {!newSubjectMode ? (
            <Popover>
              <PopoverTrigger asChild>
                <Input placeholder="Search subject by name" value={subjectQuery} onChange={(e) => setSubjectQuery(e.target.value)} />
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search subjects" value={subjectQuery} onValueChange={setSubjectQuery} />
                  <CommandList>
                    <CommandEmpty>No results</CommandEmpty>
                    <CommandGroup>
                      {subjectOptions
                        .filter((s) => (subjectQuery ? s.name.toLowerCase().includes(subjectQuery.toLowerCase()) : true))
                        .map((s) => (
                          <CommandItem
                            key={s.id}
                            onSelect={() => {
                              setSelectedSubjectId(s.id);
                            }}
                          >
                            {s.name} — {s.type}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newSubject.type} onValueChange={(v) => setNewSubject((ns) => ({ ...ns, type: v as 'person' | 'company' }))}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Person</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={newSubject.name} onChange={(e) => setNewSubject((ns) => ({ ...ns, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={newSubject.email} onChange={(e) => setNewSubject((ns) => ({ ...ns, email: e.target.value }))} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <DialogFooter>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreateClick} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Case'}
          </Button>
        </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCaseDialog;



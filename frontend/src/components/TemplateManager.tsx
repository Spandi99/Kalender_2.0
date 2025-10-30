import { FormEvent, useCallback, useEffect, useMemo, useState, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CreateDayTemplatePayload,
  DayTemplate,
  EventCategory,
  TemplateApplyOptions,
  applyTemplate,
  createTemplate,
  deleteTemplate,
  fetchTemplates,
} from "../api/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { ColorPicker } from "./ui/color-picker";
import { ApplyTemplateModal } from "./ApplyTemplateModal";

type StatusState = { type: "success" | "error"; message: string } | null;

type BlockFormState = {
  label: string;
  start_time: string;
  end_time: string;
  category: string;
  color: string | null;
};

type TemplateFormState = {
  name: string;
  description: string;
  blocks: BlockFormState[];
};

interface TemplateManagerProps {
  categories: EventCategory[];
}

const EMPTY_BLOCK: BlockFormState = {
  label: "",
  start_time: "08:00",
  end_time: "09:00",
  category: "",
  color: null,
};

interface TemplateBlockEditorProps {
  index: number;
  block: BlockFormState;
  categories: EventCategory[];
  disableRemove: boolean;
  onChange: (index: number, patch: Partial<BlockFormState>) => void;
  onRemove: (index: number) => void;
}

const TemplateBlockEditor = memo(function TemplateBlockEditor({
  index,
  block,
  categories,
  disableRemove,
  onChange,
  onRemove,
}: TemplateBlockEditorProps) {
  const handleChange = (patch: Partial<BlockFormState>) => {
    onChange(index, patch);
  };

  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-4 shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <Label className="font-medium">Block {index + 1}</Label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start border border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80"
          onClick={() => onRemove(index)}
          disabled={disableRemove}
        >
          Remove
        </Button>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`block-label-${index}`}>Label</Label>
          <Input
            id={`block-label-${index}`}
            className="border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
            value={block.label}
            onChange={(event) => handleChange({ label: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`block-category-${index}`}>Category</Label>
          <select
            id={`block-category-${index}`}
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            value={block.category}
            onChange={(event) => handleChange({ category: event.target.value })}
          >
            <option value="">Default (Work)</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <Label>Color</Label>
        <ColorPicker value={block.color} onChange={(value) => handleChange({ color: value })} />
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`block-start-${index}`}>Start time</Label>
          <Input
            id={`block-start-${index}`}
            type="time"
            className="border-slate-700 bg-slate-900/80 text-slate-100"
            value={block.start_time}
            onChange={(event) => handleChange({ start_time: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`block-end-${index}`}>End time</Label>
          <Input
            id={`block-end-${index}`}
            type="time"
            className="border-slate-700 bg-slate-900/80 text-slate-100"
            value={block.end_time}
            onChange={(event) => handleChange({ end_time: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
});

export function TemplateManager({ categories }: TemplateManagerProps) {
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({ queryKey: ["day-templates"], queryFn: fetchTemplates });
  const [formState, setFormState] = useState<TemplateFormState>({
    name: "",
    description: "",
    blocks: [{ ...EMPTY_BLOCK }],
  });
  const [status, setStatus] = useState<StatusState>(null);
  const [applyTarget, setApplyTarget] = useState<DayTemplate | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const categoryLookup = useMemo(() => {
    return categories.reduce<Record<string, string>>((acc, category) => {
      acc[category.slug] = category.name;
      return acc;
    }, {});
  }, [categories]);

  useEffect(() => {
    if (status) {
      const timeout = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [status]);

  const createTemplateMutation = useMutation({
    mutationFn: (payload: CreateDayTemplatePayload) => createTemplate(payload),
    onMutate: () => {
      setStatus(null);
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["day-templates"] });
      setFormState({ name: "", description: "", blocks: [{ ...EMPTY_BLOCK }] });
      setStatus({ type: "success", message: `Template "${template.name}" created.` });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to create template.";
      setStatus({ type: "error", message });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: number) => deleteTemplate(templateId),
    onMutate: () => {
      setStatus(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day-templates"] });
      setStatus({ type: "success", message: "Template deleted." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete template.";
      setStatus({ type: "error", message });
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: ({ templateId, options }: { templateId: number; options: TemplateApplyOptions }) =>
      applyTemplate(templateId, options),
    onMutate: () => {
      setApplyError(null);
      setStatus(null);
    },
    onSuccess: (events, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["events", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["events", "next-widget"] });
      setStatus({
        type: "success",
        message: events.length
          ? `Template ab ${variables.options.start_date} angewendet. ${events.length} Event(s) erstellt.`
          : `Template ab ${variables.options.start_date} angewendet. Keine freien Slots gefunden.`,
      });
      setApplyTarget(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to apply template.";
      setApplyError(message);
    },
  });

  useEffect(() => {
    if (!applyTarget) {
      applyTemplateMutation.reset();
      setApplyError(null);
    }
  }, [applyTarget, applyTemplateMutation]);

  const handleAddBlock = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      blocks: [...prev.blocks, { ...EMPTY_BLOCK }],
    }));
  }, []);

  const handleBlockChange = useCallback((index: number, patch: Partial<BlockFormState>) => {
    setFormState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, blockIndex) => (blockIndex === index ? { ...block, ...patch } : block)),
    }));
  }, []);

  const handleRemoveBlock = useCallback((index: number) => {
    setFormState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, blockIndex) => blockIndex !== index),
    }));
  }, []);

  const timeToMinutes = (value: string) => {
    const [hours, minutes] = value.split(":");
    return Number(hours) * 60 + Number(minutes);
  };

  const handleCreateTemplate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      setStatus({ type: "error", message: "Template name is required." });
      return;
    }

    if (!formState.blocks.length) {
      setStatus({ type: "error", message: "Add at least one time block." });
      return;
    }

    for (const block of formState.blocks) {
      if (!block.label.trim()) {
        setStatus({ type: "error", message: "Each block needs a label." });
        return;
      }
      if (!block.start_time || !block.end_time) {
        setStatus({ type: "error", message: "Provide start and end times for every block." });
        return;
      }
      if (timeToMinutes(block.end_time) <= timeToMinutes(block.start_time)) {
        setStatus({ type: "error", message: "Block end time must be after start time." });
        return;
      }
    }

    const payload: CreateDayTemplatePayload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      blocks: formState.blocks.map((block) => ({
        label: block.label.trim(),
        start_time: block.start_time,
        end_time: block.end_time,
        category: block.category.trim() ? block.category.trim() : undefined,
        color: block.color ?? undefined,
      })),
    };

    createTemplateMutation.mutate(payload);
  };

  const templates = templatesQuery.data ?? [];

  const formatTime = (value: string) => value.slice(0, 5);

  return (
    <Card className="border border-slate-700/80 bg-slate-950/85 shadow-2xl">
      <CardHeader className="border-b border-slate-700/70 bg-slate-900/60">
        <CardTitle className="text-lg font-semibold text-slate-100">Day Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6 text-sm text-slate-200">
        {status && (
          <div
            className={`rounded-md border px-3 py-2 text-sm shadow-inner ${
              status.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/15 text-rose-200"
            }`}
          >
            {status.message}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100">Saved templates</h3>
            <Button
              variant="secondary"
              size="sm"
              className="border border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80"
              onClick={() => templatesQuery.refetch()}
              disabled={templatesQuery.isFetching}
            >
              Refresh
            </Button>
          </div>
          {templatesQuery.isLoading ? (
            <p className="text-sm text-slate-400">Loading templates…</p>
          ) : templates.length ? (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      {template.description ? (
                        <p className="text-sm text-slate-400">{template.description}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setApplyTarget(template)}
                        disabled={applyTemplateMutation.isPending}
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-rose-600/90 text-slate-50 hover:bg-rose-500"
                        onClick={() => {
                          if (confirm("Delete this template?")) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                        disabled={deleteTemplateMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {template.blocks.map((block) => (
                      <li
                        key={block.id}
                        className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 shadow-inner"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{block.label}</p>
                          {block.color ? (
                            <span
                              className="inline-flex h-3 w-3 rounded-full border border-slate-300/60"
                              style={{ backgroundColor: block.color }}
                              aria-hidden
                            />
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-400">
                          {formatTime(block.start_time)} – {formatTime(block.end_time)}
                          {block.category ? ` • ${categoryLookup[block.category] ?? block.category}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No templates yet. Create your first day template below.</p>
          )}
          {templatesQuery.isError ? (
            <p className="text-sm text-red-600">Failed to load templates.</p>
          ) : null}
        </section>

        <Separator />

        <section>
          <h3 className="mb-4 text-base font-semibold">Create new template</h3>
          <form className="space-y-4" onSubmit={handleCreateTemplate}>
            <div className="space-y-2">
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                className="border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                className="border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Optional details about this template"
              />
            </div>

            <div className="space-y-4">
              {formState.blocks.map((block, index) => (
                <TemplateBlockEditor
                  key={index}
                  index={index}
                  block={block}
                  categories={categories}
                  disableRemove={formState.blocks.length === 1}
                  onChange={handleBlockChange}
                  onRemove={handleRemoveBlock}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="border border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80"
              onClick={handleAddBlock}
            >
              Add block
            </Button>
            <div className="flex justify-end">
              <Button type="submit" disabled={createTemplateMutation.isPending}>
                {createTemplateMutation.isPending ? "Creating…" : "Save template"}
              </Button>
            </div>
          </form>
        </section>
      </CardContent>

      <ApplyTemplateModal
        open={Boolean(applyTarget)}
        templateName={applyTarget?.name ?? ""}
        isApplying={applyTemplateMutation.isPending}
        errorMessage={applyError}
        onConfirm={(options) => {
          if (applyTarget) {
            applyTemplateMutation.mutate({ templateId: applyTarget.id, options });
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setApplyTarget(null);
          }
        }}
      />
    </Card>
  );
}

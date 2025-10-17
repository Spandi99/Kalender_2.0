import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CreateDayTemplatePayload,
  DayTemplate,
  EventCategory,
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
import { ApplyTemplateModal } from "./ApplyTemplateModal";

type StatusState = { type: "success" | "error"; message: string } | null;

type BlockFormState = {
  label: string;
  start_time: string;
  end_time: string;
  category: string;
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
};

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
    mutationFn: ({ templateId, date }: { templateId: number; date: string }) =>
      applyTemplate(templateId, date),
    onMutate: () => {
      setApplyError(null);
      setStatus(null);
    },
    onSuccess: (events, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setStatus({
        type: "success",
        message: events.length
          ? `Template applied to ${variables.date}. ${events.length} event(s) created.`
          : `Template applied to ${variables.date}. No free slots available.`,
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

  const handleAddBlock = () => {
    setFormState((prev) => ({
      ...prev,
      blocks: [...prev.blocks, { ...EMPTY_BLOCK }],
    }));
  };

  const handleBlockChange = (index: number, patch: Partial<BlockFormState>) => {
    setFormState((prev) => {
      const blocks = prev.blocks.map((block, blockIndex) =>
        blockIndex === index ? { ...block, ...patch } : block,
      );
      return { ...prev, blocks };
    });
  };

  const handleRemoveBlock = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, blockIndex) => blockIndex !== index),
    }));
  };

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
      })),
    };

    createTemplateMutation.mutate(payload);
  };

  const templates = templatesQuery.data ?? [];

  const formatTime = (value: string) => value.slice(0, 5);

  return (
    <Card className="border border-indigo-100 shadow-xl dark:border-indigo-900/40">
      <CardHeader className="border-b border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-indigo-400/10 to-blue-400/10 dark:border-indigo-900/40 dark:from-indigo-900/40 dark:via-indigo-900/20 dark:to-blue-900/20">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Day Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6 text-sm text-gray-700 dark:text-gray-300">
        {status && (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              status.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200"
            }`}
          >
            {status.message}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Saved templates</h3>
            <Button variant="outline" size="sm" onClick={() => templatesQuery.refetch()} disabled={templatesQuery.isFetching}>
              Refresh
            </Button>
          </div>
          {templatesQuery.isLoading ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading templates…</p>
          ) : templates.length ? (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      {template.description ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
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
                        variant="outline"
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
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2 shadow-inner dark:border-gray-700 dark:bg-gray-800/60"
                      >
                        <div>
                          <p className="font-medium">{block.label}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {formatTime(block.start_time)} – {formatTime(block.end_time)}
                            {block.category ? ` • ${categoryLookup[block.category] ?? block.category}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No templates yet. Create your first day template below.</p>
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
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Optional details about this template"
              />
            </div>

            <div className="space-y-4">
              {formState.blocks.map((block, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <Label className="font-medium">Block {index + 1}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveBlock(index)}
                      disabled={formState.blocks.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`block-label-${index}`}>Label</Label>
                      <Input
                        id={`block-label-${index}`}
                        value={block.label}
                        onChange={(event) => handleBlockChange(index, { label: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`block-category-${index}`}>Category</Label>
                      <select
                        id={`block-category-${index}`}
                        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        value={block.category}
                        onChange={(event) => handleBlockChange(index, { category: event.target.value })}
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
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`block-start-${index}`}>Start time</Label>
                      <Input
                        id={`block-start-${index}`}
                        type="time"
                        value={block.start_time}
                        onChange={(event) => handleBlockChange(index, { start_time: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`block-end-${index}`}>End time</Label>
                      <Input
                        id={`block-end-${index}`}
                        type="time"
                        value={block.end_time}
                        onChange={(event) => handleBlockChange(index, { end_time: event.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={handleAddBlock}>
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
        onConfirm={(selectedDate) => {
          if (applyTarget) {
            applyTemplateMutation.mutate({ templateId: applyTarget.id, date: selectedDate });
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

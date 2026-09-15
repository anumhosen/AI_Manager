import { useState } from "react";
import { Check, ExternalLink, Save } from "lucide-react";
import { Button, Card, Input } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { AiProvider, StoredSettings } from "../lib/store";
import { saveSettings } from "../lib/store";
import { ipc } from "../lib/ipc";

// ── Provider metadata ────────────────────────────────────────────────────────

const PROVIDERS: Array<{
  id: AiProvider;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  keyLabel: string;
  keyPlaceholder: string;
  keyRequired: boolean;
  docsUrl: string;
  docsLabel: string;
}> = [
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.0-flash-001",
    keyLabel: "API key",
    keyPlaceholder: "sk-or-v1-…",
    keyRequired: true,
    docsUrl: "https://openrouter.ai/keys",
    docsLabel: "Get a key",
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyLabel: "API key",
    keyPlaceholder: "sk-…",
    keyRequired: true,
    docsUrl: "https://platform.openai.com/api-keys",
    docsLabel: "Get a key",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-haiku-20240307",
    keyLabel: "API key",
    keyPlaceholder: "sk-ant-…",
    keyRequired: true,
    docsUrl: "https://console.anthropic.com/keys",
    docsLabel: "Get a key",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    keyLabel: "API key",
    keyPlaceholder: "AIza…",
    keyRequired: true,
    docsUrl: "https://aistudio.google.com/app/apikey",
    docsLabel: "Get a key",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    keyLabel: "API key (not required)",
    keyPlaceholder: "Leave empty",
    keyRequired: false,
    docsUrl: "https://ollama.com/download",
    docsLabel: "Install Ollama",
  },
  {
    id: "lmstudio",
    label: "LM Studio (local)",
    defaultBaseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    keyLabel: "API key (not required)",
    keyPlaceholder: "Leave empty",
    keyRequired: false,
    docsUrl: "https://lmstudio.ai/",
    docsLabel: "Install LM Studio",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function Settings(props: {
  settings: StoredSettings;
  onChange: (s: StoredSettings) => void;
}) {
  const [draft, setDraft] = useState<StoredSettings>(props.settings);
  const [saved, setSaved] = useState(false);
  const [autostartBusy, setAutostartBusy] = useState(false);

  const update = <K extends keyof StoredSettings>(k: K, v: StoredSettings[K]) =>
    setDraft({ ...draft, [k]: v });

  const onSave = async () => {
    await saveSettings(draft);
    props.onChange(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const currentProvider = PROVIDERS.find((p) => p.id === draft.ai_provider) ?? PROVIDERS[0];

  // When the provider changes, update base_url and model to that provider's defaults
  const onProviderChange = (id: AiProvider) => {
    const p = PROVIDERS.find((pr) => pr.id === id) ?? PROVIDERS[0];
    setDraft((d) => ({
      ...d,
      ai_provider: id,
      base_url: p.defaultBaseUrl,
      model: p.defaultModel,
    }));
  };

  const onAutostartToggle = async (enabled: boolean) => {
    setAutostartBusy(true);
    try {
      await ipc.setAutostart(enabled);
      update("launch_at_startup", enabled);
    } catch (e) {
      console.error("autostart toggle failed", e);
    } finally {
      setAutostartBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure the AI provider, sampling, and system tray. All data stays on this device."
      />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-4">

          {/* ── AI Provider ── */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-[var(--color-fg-strong)]">
              AI Provider
            </h2>
            <p className="mb-4 text-xs text-[var(--color-muted)]">
              Choose where AI queries are sent. Your API key stays local and is never shared.
            </p>

            <div className="space-y-3">
              <Field label="Provider">
                <select
                  value={draft.ai_provider}
                  onChange={(e) => onProviderChange(e.target.value as AiProvider)}
                  className="no-drag h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-fg-strong)] outline-none transition-colors focus:border-[var(--color-accent)]"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              {currentProvider.keyRequired ? (
                <Field label={currentProvider.keyLabel}>
                  <Input
                    type="password"
                    placeholder={currentProvider.keyPlaceholder}
                    value={draft.api_key}
                    onChange={(e) => update("api_key", e.target.value)}
                  />
                </Field>
              ) : (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-muted)]">
                  {currentProvider.label} runs locally — no API key required.
                </div>
              )}

              <Field label="Model">
                <Input
                  value={draft.model}
                  onChange={(e) => update("model", e.target.value)}
                  placeholder={currentProvider.defaultModel}
                />
              </Field>

              <Field label="Base URL">
                <Input
                  value={draft.base_url}
                  onChange={(e) => update("base_url", e.target.value)}
                  placeholder={currentProvider.defaultBaseUrl}
                />
              </Field>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openUrl(currentProvider.docsUrl)}
              >
                {currentProvider.docsLabel}
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button variant="primary" size="sm" onClick={onSave}>
                {saved ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Saved
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* ── Sampling ── */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-[var(--color-fg-strong)]">
              Sampling
            </h2>
            <p className="mb-4 text-xs text-[var(--color-muted)]">
              How often the UI refreshes its process and system view.
              Historical metrics are always stored every 5 seconds.
            </p>
            <Field label={`UI refresh rate · ${draft.refresh_hz}× per second`}>
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={draft.refresh_hz}
                onChange={(e) =>
                  update("refresh_hz", Number(e.target.value) as StoredSettings["refresh_hz"])
                }
                className="w-full"
              />
            </Field>
          </Card>

          {/* ── System Tray ── */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-[var(--color-fg-strong)]">
              System Tray
            </h2>
            <p className="mb-4 text-xs text-[var(--color-muted)]">
              Control how the app behaves when the window is closed.
              Minimize to tray keeps monitoring running in the background.
            </p>

            <div className="space-y-3">
              <ToggleField
                label="Minimize to tray on close"
                description="Hide to tray instead of quitting when the window is closed."
                checked={draft.minimize_to_tray}
                onChange={(v) => update("minimize_to_tray", v)}
              />
              <ToggleField
                label="Launch at Windows startup"
                description="Add AI Task Manager to the Windows startup registry."
                checked={draft.launch_at_startup}
                disabled={autostartBusy}
                onChange={onAutostartToggle}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="primary" size="sm" onClick={onSave}>
                {saved ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Saved
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* ── About ── */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-[var(--color-fg-strong)]">
              About
            </h2>
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              AI Task Manager v0.2 — A faster, smarter Windows Task Manager.
              Built with Rust, Tauri v2, and React. Features: process tree view,
              network connections, historical metrics (SQLite), system tray,
              multi-provider AI, and security risk analysis.
            </p>
            <div className="mt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  openUrl("https://github.com/Razee4315/AI_Manager")
                }
              >
                View source
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      {children}
    </label>
  );
}

function ToggleField(props: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs font-medium text-[var(--color-fg-strong)]">
          {props.label}
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">
          {props.description}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={props.checked}
        disabled={props.disabled}
        onClick={() => props.onChange(!props.checked)}
        className={
          "no-drag relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors disabled:opacity-50 " +
          (props.checked
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[var(--color-border)] bg-[var(--color-surface-2)]")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform " +
            (props.checked ? "translate-x-4" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}

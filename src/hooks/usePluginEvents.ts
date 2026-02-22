import { useEffect } from "react";
import { usePluginStore } from "./usePluginStore";
import {
  onPluginProgress,
  onPluginComplete,
  listPlugins,
  getEnrichments,
} from "../lib/tauri-bridge";

export function usePluginEvents() {
  const addProgress = usePluginStore((s) => s.addProgress);
  const setResult = usePluginStore((s) => s.setResult);
  const setRunningPlugin = usePluginStore((s) => s.setRunningPlugin);
  const setPlugins = usePluginStore((s) => s.setPlugins);
  const mergeEnrichments = usePluginStore((s) => s.mergeEnrichments);

  useEffect(() => {
    let cancelled = false;
    let unlistenProgress: (() => void) | undefined;
    let unlistenComplete: (() => void) | undefined;

    const setup = async () => {
      try {
        const plugins = await listPlugins();
        if (cancelled) return;
        setPlugins(plugins);

        const enrichments = await getEnrichments();
        if (cancelled) return;
        if (enrichments.length > 0) {
          mergeEnrichments(enrichments);
        }
      } catch {
        // Not in Tauri runtime — skip
      }

      try {
        const [unlProgress, unlComplete] = await Promise.all([
          onPluginProgress((progress) => {
            addProgress(progress);
          }),
          onPluginComplete((result) => {
            setResult(result.pluginName, result);
            setRunningPlugin(null);
            if (result.enrichments.length > 0) {
              mergeEnrichments(result.enrichments);
            }
          }),
        ]);
        if (cancelled) {
          unlProgress();
          unlComplete();
          return;
        }
        unlistenProgress = unlProgress;
        unlistenComplete = unlComplete;
      } catch {
        // Not in Tauri runtime — skip
      }
    };

    setup();

    return () => {
      cancelled = true;
      unlistenProgress?.();
      unlistenComplete?.();
    };
  }, []);
}

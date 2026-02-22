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
    let unlistenProgress: (() => void) | undefined;
    let unlistenComplete: (() => void) | undefined;

    const setup = async () => {
      try {
        // Load available plugins
        const plugins = await listPlugins();
        setPlugins(plugins);

        // Load any existing enrichments
        const enrichments = await getEnrichments();
        if (enrichments.length > 0) {
          mergeEnrichments(enrichments);
        }
      } catch {
        // Not in Tauri runtime — skip
      }

      try {
        unlistenProgress = await onPluginProgress((progress) => {
          addProgress(progress);
        });

        unlistenComplete = await onPluginComplete((result) => {
          setResult(result.pluginName, result);
          setRunningPlugin(null);
          if (result.enrichments.length > 0) {
            mergeEnrichments(result.enrichments);
          }
        });
      } catch {
        // Not in Tauri runtime — skip
      }
    };

    setup();

    return () => {
      unlistenProgress?.();
      unlistenComplete?.();
    };
  }, []);
}

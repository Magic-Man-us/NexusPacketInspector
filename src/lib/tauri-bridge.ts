import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ParsedPacket } from "../types/packet";
import { PacketStatistics } from "../types/statistics";
import {
  PacketEnrichment,
  PluginInfo,
  PluginProgress,
  PluginResult,
} from "../types/plugin";

// --- PCAP commands ---

export async function openPcap(path: string): Promise<number> {
  return invoke<number>("open_pcap", { path });
}

export async function getPacketRange(start: number, count: number): Promise<ParsedPacket[]> {
  return invoke<ParsedPacket[]>("get_packet_range", { start, count });
}

export async function applyFilter(filterText: string): Promise<number[]> {
  return invoke<number[]>("apply_filter", { filterText });
}

export async function getStatistics(): Promise<PacketStatistics> {
  return invoke<PacketStatistics>("get_statistics");
}

export function onPacketsChunk(callback: (packets: ParsedPacket[]) => void): Promise<UnlistenFn> {
  return listen<ParsedPacket[]>("packets-chunk", (event) => {
    callback(event.payload);
  });
}

// --- Plugin commands ---

export async function listPlugins(): Promise<PluginInfo[]> {
  return invoke<PluginInfo[]>("list_plugins");
}

export async function getPluginParams(name: string): Promise<unknown> {
  return invoke("get_plugin_params", { name });
}

export async function checkPluginAvailable(name: string): Promise<boolean> {
  return invoke<boolean>("check_plugin_available", { name });
}

export async function runPlugin(name: string, params: unknown): Promise<PluginResult> {
  return invoke<PluginResult>("run_plugin", { name, params });
}

export async function cancelPlugin(name: string): Promise<void> {
  return invoke("cancel_plugin", { name });
}

export async function getPluginResult(name: string): Promise<PluginResult | null> {
  return invoke<PluginResult | null>("get_plugin_result", { name });
}

export async function getEnrichments(): Promise<PacketEnrichment[]> {
  return invoke<PacketEnrichment[]>("get_enrichments");
}

// --- Plugin events ---

export function onPluginProgress(callback: (progress: PluginProgress) => void): Promise<UnlistenFn> {
  return listen<PluginProgress>("plugin-progress", (event) => {
    callback(event.payload);
  });
}

export function onPluginComplete(callback: (result: PluginResult) => void): Promise<UnlistenFn> {
  return listen<PluginResult>("plugin-complete", (event) => {
    callback(event.payload);
  });
}

import { usePluginStore } from "../../../hooks/usePluginStore";

interface Props {
  ip: string;
}

export function EnrichmentBadge({ ip }: Props) {
  const enrichment = usePluginStore((s) => s.enrichments[ip]);

  if (!enrichment) return null;

  const portCount = enrichment.openPorts.length;
  const label = enrichment.hostname || `${portCount} port${portCount !== 1 ? "s" : ""}`;

  return (
    <span
      title={[
        enrichment.hostname && `Hostname: ${enrichment.hostname}`,
        portCount > 0 && `Open ports: ${enrichment.openPorts.join(", ")}`,
        enrichment.osGuess && `OS: ${enrichment.osGuess}`,
        Object.keys(enrichment.services).length > 0 &&
          `Services: ${Object.entries(enrichment.services)
            .map(([p, s]) => `${p}/${s}`)
            .join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n")}
      style={{
        display: "inline-block",
        fontSize: "8px",
        padding: "1px 5px",
        marginLeft: "4px",
        backgroundColor: "rgba(0,184,255,0.15)",
        color: "#00b8ff",
        borderRadius: "3px",
        verticalAlign: "middle",
        cursor: "help",
      }}
    >
      {label}
    </span>
  );
}

# Nexus Inspector

A high-performance network packet analyzer built with **Tauri v2**, **React**, **D3.js**, and **Rust**. Analyze PCAP files with real-time visualizations across 12 interactive views — or explore the demo mode with simulated network traffic.

[**Live Demo**](https://nexus.mimsec.com/) (demo mode — no install required)

---

## Features

- **PCAP Analysis** — Load `.pcap` / `.pcapng` files with zero-copy parsing via `memmap2` + `etherparse`
- **12 Visualization Views** — Each tailored for a different analytical perspective
- **Stream Reconstruction** — Reassembled TCP streams with protocol-aware rendering (HTTP, DNS, SMTP, FTP, MQTT, and more)
- **Cross-Highlighting** — Hover a field in Structure view and the corresponding bytes light up in the Hex Viewer
- **Rust-Powered Filtering** — Wireshark-like syntax (`tcp`, `ip.src == 10.0.0.1`, `port 443`)
- **Parallel Parsing** — Rayon-based multi-threaded packet dissection
- **Plugin System** — Extensible adapter architecture (Nmap included)
- **Demo Mode** — Generates realistic synthetic traffic across 20 protocols with conversation-aware payloads
- **Configurable Themes** — Three color schemes (Nexus, Dark, Light) with optional grid overlays

---

## Views

### Dashboard
Home screen with a card grid linking to every view. Hover a card to see a description; click to navigate.

### Packets
Virtual-scrolled packet table with sortable columns (time, protocol, source, destination, size). Click any row to inspect it in the sidebar hex viewer.

### Structure
Layer-by-layer protocol dissection — Ethernet, IP, TCP/UDP, and Payload. Hover any field to open the **Field Encyclopedia** popover with descriptions, bit lengths, and hex offsets. Hovering also cross-highlights the corresponding bytes in the sidebar Hex Viewer.

### Livewire
Real-time stream reconstruction. Select a TCP/UDP stream and view reassembled content in three modes:

| Mode | Description |
|------|-------------|
| **Parsed** | Protocol-aware rendering — HTTP request/response headers, SMTP envelopes, DNS query/answer records, MQTT topics, FTP commands |
| **Raw** | Plain text reconstruction of payload |
| **Hex** | Hex dump of reassembled stream bytes |

Encrypted streams (HTTPS, SSH, TLS) are detected and clearly labeled. Toggle direction (client, server, or both).

### Route Trace
Visualize packet paths with three sub-views:

- **Graph** — Force-directed D3 topology with draggable nodes, zoom/pan, and directional arrows
- **Structured** — Hierarchical layout showing source → hops → destination
- **List** — Tabular hop-by-hop breakdown with RTT

### Matrix
Dense IP-to-IP conversation grid. Rows = sources, columns = destinations. Cell color intensity maps to traffic volume. Toggle between packet count and byte volume. Shows top 15 talkers.

### Sankey
Interactive flow diagram with four grouping modes:

| Mode | Left Column | Right Column |
|------|------------|--------------|
| Protocol → Port | Protocol | Destination port |
| IP → Service | Source IP | Service name |
| Subnet → Protocol | /16 subnet | Protocol |
| IP → IP | Source IP | Destination IP |

Hover any flow for a tooltip with source, target, and volume. Top 20 flows by bytes displayed.

### Sequence
UML-style message exchange timeline. Select a stream from the left panel to see chronological packet flow with arrows, TCP flags, timestamps, and sequence/ACK numbers. Animated pulse particles flow along each arrow.

### Topology
Hierarchical network tree: Network → Local/Remote → Subnets (/24) → Hosts. Color-coded by level. Shows top 5 local and 5 remote subnets.

### Services
Grid of service cards (top 12 by volume). Each card shows the service name, port, packet count, byte volume, number of source IPs, and protocol tags. Known ports are auto-mapped (80 → HTTP, 443 → HTTPS, 22 → SSH, etc.).

### Stats
Deep analytics dashboard with 10+ widgets: protocol donut chart, packet size histogram, packets/second timeline, top talkers, port distribution, TCP flag breakdown, anomaly detection (RST floods, oversized packets, unusual ports), conversation rankings, TTL distribution, and summary statistics.

### Plugins
Manage external tool integrations. Ships with an **Nmap** plugin:

- **Profiles**: Quick, Aggressive, Comprehensive, Custom
- **Live Progress**: Real-time scan output
- **Enrichment**: Discovered hosts, open ports, and OS guesses are injected back into packet data

---

## Sidebar

The sidebar is a persistent inspector panel with two tabs:

- **Packets** — Last 100 captured packets (click to select)
- **Hex Dump** — Full binary view of the selected packet, color-coded by protocol layer (Ethernet, IP, TCP/UDP, Payload), with ASCII decode

Additional controls:
- **Split View** — Show both tabs simultaneously
- **Detach** — Pop the sidebar into a draggable floating window (snaps to screen corners)
- **Collapse** — Minimize to a thin edge strip; hover to temporarily expand
- **Prev / Next / Latest** — Navigate between packets

---

## Filter Syntax

Type filters into the search bar in the header. Supported patterns:

```
tcp                          # Protocol match (case-insensitive)
udp
dns

ip.src == 192.168.1.100     # Source IP
ip.dst == 8.8.8.8           # Destination IP
ip.addr == 10.0.0.5         # Either source or destination

port 443                     # Source or destination port
src port 22                  # Source port only
dst port 3306                # Destination port only

192.168.1                    # Substring search (fallback) —
                             # matches protocol, IPs, or info fields
```

---

## Settings

Click **FX** in the header to open the settings panel.

| Setting | Options |
|---------|---------|
| Color Scheme | **Nexus** (green), **Dark** (blue), **Light** (light blue) |
| Matrix Grid | On / Off toggle |
| Grid Opacity | 1% – 10% slider (when grid is on) |

---

## Demo Mode

The app starts in demo mode by default. Click **DEMO** to begin generating synthetic traffic.

Demo mode simulates realistic network conversations across 20 protocols (HTTP, HTTPS, DNS, SSH, FTP, SMTP, DHCP, MQTT, MySQL, PostgreSQL, and more). Packets include:

- Bidirectional stream tracking with conversation-aware payloads
- Proper TCP flags (SYN/ACK/FIN/RST distribution)
- Realistic IP headers (TTL, DSCP, identification, fragmentation flags)
- Simulated traceroute paths (3–8 hops with increasing RTT)
- Protocol-specific message sequences (e.g., SMTP `EHLO` → `MAIL` → `RCPT` → `DATA`)

Click **OPEN PCAP** to load a real capture file instead, or visit the [live demo](https://nexus.mimsec.com/) to try it in the browser.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| App Shell | Tauri v2 |
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand |
| Visualizations | D3.js |
| Virtual Scrolling | @tanstack/react-virtual |
| PCAP Parsing | pcap-parser + etherparse (zero-copy) |
| Large Files | memmap2 (memory-mapped I/O) |
| Parallelism | Rayon |
| Plugin IPC | Tokio + serde_json |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
# Install frontend dependencies
npm install

# Run in development mode (starts both Vite + Rust)
npm run tauri dev
```

### Build

```bash
# Production build
npm run tauri build
```

The distributable binary will be in `src-tauri/target/release/bundle/`.

### Web-Only (No Rust)

```bash
# Run the frontend in demo mode without the Tauri backend
npm run dev
```

---

## Project Structure

```
src/                    # React frontend
  components/
    layout/             # Header, NavTabs, StatusBar, SettingsPanel
    views/              # 12 visualization views
    shared/             # Reusable components (HexViewer, Sidebar, EmptyState, NexusLogo)
  hooks/                # Zustand stores, Tauri event hooks
  lib/                  # Tauri bridge, demo mode, formatters, field byte offsets
  styles/               # Theme, global styles, component styles
  types/                # TypeScript interfaces

src-tauri/src/          # Rust backend
  commands/             # Tauri commands (file, filter, plugin)
  parser/               # PCAP reading, packet dissection, stream tracking
  analysis/             # Statistics, conversations
  plugins/              # Plugin system + NMAP adapter
```

---

## License

[GPL3](https://github.com/Magic-Man-us/NexusPacketInspector/blob/main/LICENSE)

## Author

magicman — [mimsec.com](https://mimsec.com)

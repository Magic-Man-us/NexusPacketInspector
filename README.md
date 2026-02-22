# Nexus Inspector

A high-performance network packet analyzer built with **Tauri v2**, **React**, **D3.js**, and **Rust**. Analyze PCAP files with real-time visualizations across 10 interactive views — or explore the demo mode with simulated network traffic.

[**Live Demo**](https://nexus.mimsec.com/) (demo mode — no install required)

## Features

- **PCAP Analysis** — Load `.pcap` / `.pcapng` files with zero-copy parsing via `memmap2` + `etherparse`
- **10 Visualization Views:**
  - Packet List — Virtual-scrolled table with detail panel
  - Structure — Protocol layer dissection (Ethernet / IP / TCP / UDP / Payload)
  - Route Trace — D3 force-directed graph of packet routes
  - Matrix — IP-to-IP conversation heatmap
  - Sankey — Protocol / source / destination flow diagram
  - Sequence — UML-style packet exchange timeline
  - Topology — Hierarchical network tree
  - Service Map — Traffic grouped by destination port
  - Statistics — Protocol distribution charts
  - Plugins — Extensible tool integration (NMAP first)
- **Plugin System** — Generic adapter architecture for external tools
  - NMAP integration with 5 scan profiles (Quick, Full, Stealth, Vuln, Custom)
  - Scan results enrich packet list with hostname, OS, and service data
- **Rust-Powered Filtering** — Wireshark-like syntax (`tcp`, `ip.src == 10.0.0.1`, `port 443`)
- **Parallel Parsing** — Rayon-based multi-threaded packet dissection
- **CRT Visual Effects** — Configurable scanlines, grid overlay, and flicker

## Screenshots

> Coming soon

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

### Demo Mode

The app starts in demo mode by default, generating simulated network traffic. Click **OPEN PCAP** to load a real capture file, or visit the [live demo](https://magic-man-us.github.io/NexusPacketInspector/) to try it in the browser.

## Project Structure

```
src/                    # React frontend
  components/
    layout/             # Header, NavTabs, StatusBar, SettingsPanel
    views/              # 10 visualization views
    shared/             # Reusable components
  hooks/                # Zustand stores, Tauri event hooks
  lib/                  # Tauri bridge, demo mode, formatters
  styles/               # Theme, global styles, component styles
  types/                # TypeScript interfaces

src-tauri/src/          # Rust backend
  commands/             # Tauri commands (file, filter, plugin)
  parser/               # PCAP reading, packet dissection, stream tracking
  analysis/             # Statistics, conversations
  plugins/              # Plugin system + NMAP adapter
```

## License

[GPL3](https://github.com/Magic-Man-us/NexusPacketInspector/blob/main/LICENSE)

## Author

magicman — [mimsec.com](https://mimsec.com)

export interface FieldEncyclopediaEntry {
  overview: string;
  sizeRationale: string;
  howItWorks: string;
  commonValues: string[];
  rfcReference: string;
}

const encyclopedia: Record<string, FieldEncyclopediaEntry> = {
  // ── Ethernet (3) ──────────────────────────────────────────────
  "ethernet.Dest MAC": {
    overview:
      "The Destination MAC address identifies the Layer 2 recipient of the frame on the local network segment. It is the first field in an Ethernet frame, allowing network interface cards to quickly determine whether the frame is relevant before processing the rest.",
    sizeRationale:
      "48 bits (6 bytes) were chosen in the original Ethernet specification to provide a large enough address space (~281 trillion addresses) that globally unique addresses could be assigned to every NIC ever manufactured without exhaustion.",
    howItWorks:
      "When a switch receives a frame, it reads the destination MAC from the first 6 bytes and performs a CAM table lookup to determine which port to forward to. If the address is FF:FF:FF:FF:FF:FF, the frame is broadcast to all ports. NICs in promiscuous mode capture all frames regardless of destination.",
    commonValues: [
      "FF:FF:FF:FF:FF:FF — Broadcast (all hosts on segment)",
      "01:00:5E:xx:xx:xx — IPv4 multicast",
      "33:33:xx:xx:xx:xx — IPv6 multicast",
      "First 3 bytes (OUI) identify the manufacturer",
    ],
    rfcReference: "IEEE 802.3, Section 3.2.4",
  },
  "ethernet.Src MAC": {
    overview:
      "The Source MAC address identifies the originating network interface that transmitted the frame. Switches use this field to learn which devices are reachable on which ports, building their forwarding tables dynamically.",
    sizeRationale:
      "48 bits matches the destination MAC for consistency. The first 24 bits form the Organizationally Unique Identifier (OUI) assigned by IEEE, and the remaining 24 bits are assigned by the manufacturer, ensuring global uniqueness.",
    howItWorks:
      "Switches read the source MAC and associate it with the ingress port in their MAC address table (CAM table). This learning process allows future frames destined for that MAC to be forwarded only to the correct port rather than flooded to all ports.",
    commonValues: [
      "00:00:00:00:00:00 — Invalid / unset",
      "Locally administered bit (bit 1 of first byte) = 1 indicates non-global address",
      "Unicast bit (bit 0 of first byte) = 0 for individual addresses",
    ],
    rfcReference: "IEEE 802.3, Section 3.2.3",
  },
  "ethernet.EtherType": {
    overview:
      "The EtherType field identifies which network-layer protocol is encapsulated in the Ethernet frame's payload. Values at or above 0x0600 indicate a protocol type; values below indicate frame length (IEEE 802.3 format).",
    sizeRationale:
      "16 bits provide 65,536 possible protocol identifiers, which is more than sufficient for all current and foreseeable network protocols while adding minimal overhead to every frame.",
    howItWorks:
      "The receiving NIC or OS network stack reads this field to determine which protocol handler should process the payload. This is the fundamental demultiplexing mechanism at Layer 2 that routes data to the correct Layer 3 protocol.",
    commonValues: [
      "0x0800 — IPv4",
      "0x0806 — ARP (Address Resolution Protocol)",
      "0x86DD — IPv6",
      "0x8100 — VLAN-tagged frame (802.1Q)",
      "0x8847 — MPLS unicast",
    ],
    rfcReference: "IEEE 802.3, Section 3.2.6; RFC 7042 Section 2",
  },

  // ── IP (13) ───────────────────────────────────────────────────
  "ip.Ver": {
    overview:
      "The Version field indicates the IP protocol version of the packet. It is the very first field in the IP header, allowing routers to immediately identify how to parse the remaining header fields.",
    sizeRationale:
      "4 bits allow 16 possible version numbers (0-15). Only versions 4 (IPv4) and 6 (IPv6) are in widespread use, but the small size minimizes header overhead while providing room for future versions.",
    howItWorks:
      "Routers and hosts read this field first to determine the header format. IPv4 (value 4) and IPv6 (value 6) have fundamentally different header structures, so this field is essential for correct parsing.",
    commonValues: [
      "4 — IPv4 (dominant Internet protocol)",
      "6 — IPv6 (next-generation, 128-bit addresses)",
    ],
    rfcReference: "RFC 791, Section 3.1",
  },
  "ip.IHL": {
    overview:
      "Internet Header Length specifies the length of the IPv4 header in 32-bit (4-byte) words. Since IP options make the header variable-length, this field tells the receiver where the header ends and the payload begins.",
    sizeRationale:
      "4 bits represent values 0-15, and since the unit is 32-bit words, the maximum header length is 60 bytes (15 x 4). The minimum valid value is 5 (20 bytes), covering the mandatory header fields.",
    howItWorks:
      "The receiver multiplies IHL by 4 to get the header length in bytes, then knows exactly where the payload starts. If IHL > 5, the bytes between offset 20 and (IHL * 4) contain IP options that must be parsed.",
    commonValues: [
      "5 — Standard 20-byte header (no options)",
      "6-15 — Header includes IP options (rare in modern traffic)",
    ],
    rfcReference: "RFC 791, Section 3.1",
  },
  "ip.DSCP": {
    overview:
      "Differentiated Services Code Point replaced the older Type of Service field to provide a standardized mechanism for classifying and managing network traffic through QoS (Quality of Service) policies.",
    sizeRationale:
      "6 bits provide 64 possible traffic classes (DSCPs), which is sufficient to cover all defined per-hop behaviors while fitting within the original 8-bit TOS field alongside the 2-bit ECN field.",
    howItWorks:
      "Routers read the DSCP value to determine per-hop behavior (PHB) for the packet — whether it gets priority queuing, guaranteed bandwidth, or best-effort treatment. ISPs and enterprise networks use DSCP for traffic engineering.",
    commonValues: [
      "0 (000000) — Best Effort (default)",
      "46 (101110) — Expedited Forwarding (EF) for low-latency traffic like VoIP",
      "26 (011010) — Assured Forwarding AF31",
      "34 (100010) — Assured Forwarding AF41",
    ],
    rfcReference: "RFC 2474, Section 3",
  },
  "ip.ECN": {
    overview:
      "Explicit Congestion Notification allows routers to signal network congestion to endpoints without dropping packets. This enables TCP to reduce its sending rate proactively, improving throughput and reducing retransmissions.",
    sizeRationale:
      "2 bits encode four states: not ECN-capable, ECN-capable transport (two codepoints), and Congestion Experienced. This minimal size was carved from the original TOS byte to avoid changing the header format.",
    howItWorks:
      "Senders set ECN bits to indicate capability. Congested routers set the CE (Congestion Experienced) codepoint instead of dropping the packet. The receiver echoes this signal back via TCP flags, and the sender reduces its congestion window.",
    commonValues: [
      "00 — Not ECN-Capable Transport",
      "01 — ECN-Capable Transport (ECT(1))",
      "10 — ECN-Capable Transport (ECT(0))",
      "11 — Congestion Experienced (CE)",
    ],
    rfcReference: "RFC 3168, Section 5",
  },
  "ip.Total Length": {
    overview:
      "Total Length specifies the entire packet size in bytes, including both the IP header and the payload. This is critical because the underlying data link layer may pad frames, and the receiver needs to know the actual IP data boundary.",
    sizeRationale:
      "16 bits allow a maximum packet size of 65,535 bytes. While typical MTU is 1500 bytes, this ceiling supports jumbograms and reassembled fragmented packets. The field must accommodate the largest possible IP datagram.",
    howItWorks:
      "Receivers use this field to determine exactly how many bytes belong to the IP packet, discarding any link-layer padding. It is also essential for IP reassembly — the total length of each fragment determines how they fit together.",
    commonValues: [
      "20 — Minimum (header only, no payload)",
      "40-60 — TCP ACK with no data",
      "1500 — Maximum for standard Ethernet MTU",
      "65535 — Maximum possible IP packet",
    ],
    rfcReference: "RFC 791, Section 3.1",
  },
  "ip.Identification": {
    overview:
      "The Identification field uniquely identifies a group of fragments belonging to the same original datagram. When a packet is fragmented, all fragments carry the same Identification value so the receiver can reassemble them.",
    sizeRationale:
      "16 bits provide 65,536 unique IDs. Combined with source IP, destination IP, and protocol, this is sufficient to distinguish fragments of different datagrams in transit, though the field can wrap around in high-traffic scenarios.",
    howItWorks:
      "The sending host assigns a unique value per datagram. If a router fragments the packet, all fragments inherit this ID. The destination host collects fragments with matching (Src IP, Dst IP, Protocol, ID) tuples and reassembles them using fragment offsets.",
    commonValues: [
      "Typically an incrementing counter per host",
      "Random values used by some OS stacks for security",
      "0x0000 — Sometimes used when DF bit is set",
    ],
    rfcReference: "RFC 791, Section 3.1; RFC 6864",
  },
  "ip.Flags": {
    overview:
      "The IP Flags field controls and identifies fragmentation. The Don't Fragment (DF) bit tells routers to drop the packet rather than fragment it, while More Fragments (MF) indicates additional fragments follow.",
    sizeRationale:
      "3 bits are the minimum needed: bit 0 is reserved (must be 0), bit 1 is DF, and bit 2 is MF. This compact encoding fits within the 32-bit word alignment of the IP header alongside the 13-bit fragment offset.",
    howItWorks:
      "Routers check the DF bit before fragmenting. If DF=1 and the packet exceeds the link MTU, the router drops it and sends an ICMP 'Fragmentation Needed' message. Path MTU Discovery relies on this mechanism to find the optimal packet size.",
    commonValues: [
      "DF=1, MF=0 — Don't fragment, last/only packet (most common)",
      "DF=0, MF=1 — Fragmentation allowed, more fragments follow",
      "DF=0, MF=0 — Last fragment or unfragmented packet",
    ],
    rfcReference: "RFC 791, Section 3.1",
  },
  "ip.Frag Offset": {
    overview:
      "Fragment Offset specifies where in the original datagram this fragment's data belongs. It is measured in 8-byte units, allowing the receiver to place each fragment in the correct position during reassembly.",
    sizeRationale:
      "13 bits in 8-byte units can address up to 65,528 bytes (8191 x 8), covering the maximum IP datagram size. The 8-byte granularity was chosen to keep the field small while allowing precise enough positioning for reassembly.",
    howItWorks:
      "The receiver multiplies the offset by 8 to get the byte position in the original datagram. It places each fragment's payload at that position in a reassembly buffer. When all fragments arrive (MF=0 in the last one), the complete datagram is delivered to the transport layer.",
    commonValues: [
      "0 — First fragment or unfragmented packet",
      "Non-zero — Subsequent fragment (multiply by 8 for byte offset)",
    ],
    rfcReference: "RFC 791, Section 3.1",
  },
  "ip.TTL": {
    overview:
      "Time To Live is a hop counter that prevents packets from circulating forever in routing loops. Each router decrements it by 1, and when it reaches 0, the packet is discarded and an ICMP Time Exceeded message is sent back to the source.",
    sizeRationale:
      "8 bits (max 255) provide enough headroom for even the most complex network topologies. The original design intended this as a seconds-based timer, but in practice every router simply decrements by 1 regardless of processing time.",
    howItWorks:
      "The sender sets an initial TTL value. Each router along the path decrements it by 1 and recalculates the header checksum. If TTL reaches 0, the router drops the packet and sends ICMP Type 11 (Time Exceeded). Traceroute exploits this by sending packets with incrementing TTL values.",
    commonValues: [
      "64 — Linux default",
      "128 — Windows default",
      "255 — Maximum / Cisco default",
      "1 — Multicast same-subnet only",
    ],
    rfcReference: "RFC 791, Section 3.1; RFC 1812, Section 5.3.1",
  },
  "ip.Protocol": {
    overview:
      "The Protocol field identifies the transport-layer protocol encapsulated in the IP payload. This is the primary demultiplexing key that tells the receiving host which protocol handler should process the data.",
    sizeRationale:
      "8 bits support 256 protocol numbers, assigned by IANA. While only a handful are commonly used (TCP, UDP, ICMP), the range accommodates experimental and specialized protocols like OSPF, GRE, and ESP.",
    howItWorks:
      "The destination host's IP layer reads this field to dispatch the payload to the correct transport module. For example, protocol 6 routes to the TCP stack, protocol 17 to UDP. Firewalls also use this field for protocol-based filtering.",
    commonValues: [
      "1 — ICMP (Internet Control Message Protocol)",
      "6 — TCP (Transmission Control Protocol)",
      "17 — UDP (User Datagram Protocol)",
      "47 — GRE (Generic Routing Encapsulation)",
      "50 — ESP (Encapsulating Security Payload / IPsec)",
    ],
    rfcReference: "RFC 791, Section 3.1; IANA Protocol Numbers",
  },
  "ip.Checksum": {
    overview:
      "The Header Checksum verifies the integrity of the IP header only (not the payload). Since the TTL changes at every hop, this checksum must be recalculated by every router, making it a relatively expensive per-hop operation.",
    sizeRationale:
      "16 bits provide a complement checksum that is fast to compute and verify. While not cryptographically strong, it catches common bit errors in the header. IPv6 dropped this field entirely, relying on link-layer and transport-layer checksums instead.",
    howItWorks:
      "The sender computes the ones' complement sum of all 16-bit words in the header (with the checksum field set to 0). Each router recomputes it after decrementing TTL. The receiver verifies by summing all header words including the checksum — the result should be 0xFFFF.",
    commonValues: [
      "Varies per packet — computed from all header fields",
      "0x0000 is invalid for IPv4 (indicates computation error)",
    ],
    rfcReference: "RFC 791, Section 3.1; RFC 1071",
  },
  "ip.Source IP": {
    overview:
      "The Source IP address identifies the originating host of the packet. It is used by the recipient to send responses and by routers for policy routing, ACLs, and reverse path verification.",
    sizeRationale:
      "32 bits provide approximately 4.3 billion unique addresses. This seemed sufficient when IPv4 was designed in 1981, but address exhaustion led to NAT, CIDR, and eventually IPv6 with its 128-bit addresses.",
    howItWorks:
      "The sending host places its IP address here. Routers generally don't modify it (except NAT devices). The destination uses it for return traffic. Reverse path filtering (uRPF) checks this field against routing tables to detect spoofed packets.",
    commonValues: [
      "10.0.0.0/8 — Private (Class A)",
      "172.16.0.0/12 — Private (Class B)",
      "192.168.0.0/16 — Private (Class C)",
      "127.0.0.1 — Loopback",
      "0.0.0.0 — Unspecified / DHCP discovery",
    ],
    rfcReference: "RFC 791, Section 3.1; RFC 1918",
  },
  "ip.Dest IP": {
    overview:
      "The Destination IP address specifies the intended recipient of the packet. Routers use this field as the primary key for forwarding decisions, performing longest-prefix matching against their routing tables.",
    sizeRationale:
      "32 bits, matching the source address size for consistency. The address space is hierarchically divided into network and host portions using subnet masks, enabling efficient route aggregation and lookup.",
    howItWorks:
      "Every router along the path performs a longest-prefix match of this address against its routing table (FIB) to determine the next-hop interface. The destination host recognizes packets addressed to it and passes them up the stack.",
    commonValues: [
      "255.255.255.255 — Limited broadcast",
      "224.0.0.0/4 — Multicast range",
      "x.x.x.255 — Directed broadcast (subnet-dependent)",
      "169.254.0.0/16 — Link-local (APIPA)",
    ],
    rfcReference: "RFC 791, Section 3.1; RFC 1918",
  },

  // ── TCP (15) ──────────────────────────────────────────────────
  "tcp.Src Port": {
    overview:
      "The TCP Source Port identifies the sending application or service on the originating host. Combined with the source IP address, it forms a socket that uniquely identifies one end of a TCP connection.",
    sizeRationale:
      "16 bits allow 65,536 port numbers (0-65535). This range provides ample space for well-known services (0-1023), registered ports (1024-49151), and ephemeral/dynamic ports (49152-65535).",
    howItWorks:
      "Client applications are typically assigned ephemeral ports by the OS. The source port is included in every segment so the receiver can direct responses to the correct application process via the socket pair.",
    commonValues: [
      "49152-65535 — Ephemeral ports (client-side, OS-assigned)",
      "1024-49151 — Registered ports",
      "0-1023 — Well-known / privileged ports",
    ],
    rfcReference: "RFC 9293, Section 3.1",
  },
  "tcp.Dst Port": {
    overview:
      "The TCP Destination Port identifies the target application or service on the receiving host. This is how the OS knows which process should receive incoming segments — web servers listen on 80/443, SSH on 22, etc.",
    sizeRationale:
      "16 bits match the source port size, providing the same 65,536-port namespace. The well-known port range (0-1023) requires elevated privileges on Unix systems, providing a basic security mechanism.",
    howItWorks:
      "The receiving OS demultiplexes incoming segments by matching the destination port to a listening socket. If no process is listening, the OS responds with a TCP RST segment, indicating the port is closed.",
    commonValues: [
      "80 — HTTP",
      "443 — HTTPS (TLS)",
      "22 — SSH",
      "53 — DNS",
      "25 — SMTP",
      "3306 — MySQL",
    ],
    rfcReference: "RFC 9293, Section 3.1; IANA Service Name and Transport Protocol Port Number Registry",
  },
  "tcp.Sequence": {
    overview:
      "The Sequence Number identifies the position of the first data byte in this segment within the overall byte stream. TCP treats data as an ordered stream of bytes, and this field enables reliable, in-order delivery.",
    sizeRationale:
      "32 bits allow numbering up to ~4.3 billion bytes before wrapping. For high-speed links where this wraps quickly, the PAWS (Protection Against Wrapped Sequences) extension uses TCP timestamps to disambiguate.",
    howItWorks:
      "During the 3-way handshake, each side chooses an Initial Sequence Number (ISN). Each subsequent byte of data increments the sequence number. The receiver uses these numbers to reorder segments, detect duplicates, and identify gaps for retransmission requests.",
    commonValues: [
      "Random ISN — Chosen during SYN to prevent spoofing attacks",
      "ISN+1 — First data byte after handshake",
      "Wraps around at 2^32 (4,294,967,296)",
    ],
    rfcReference: "RFC 9293, Section 3.3; RFC 6528 (ISN generation)",
  },
  "tcp.ACK Number": {
    overview:
      "The Acknowledgment Number indicates the next sequence number the sender expects to receive. It implicitly confirms receipt of all bytes up to that point, forming the basis of TCP's reliable delivery mechanism.",
    sizeRationale:
      "32 bits match the sequence number size, since this field references positions in the same byte-stream space. It must be able to acknowledge any valid sequence number.",
    howItWorks:
      "When the ACK flag is set, this field is valid. The receiver sets it to the next expected byte (last received sequence number + data length). Cumulative ACKs confirm all data up to this point. Duplicate ACKs (same number repeated) signal packet loss and trigger fast retransmit.",
    commonValues: [
      "ISN+1 — Acknowledges the SYN in the 3-way handshake",
      "3 duplicate ACKs trigger TCP fast retransmit",
      "Only valid when the ACK flag is set",
    ],
    rfcReference: "RFC 9293, Section 3.3",
  },
  "tcp.Offset": {
    overview:
      "The Data Offset (also called Header Length) specifies the size of the TCP header in 32-bit words. Like IP's IHL, this field is necessary because TCP options make the header variable-length.",
    sizeRationale:
      "4 bits represent values 0-15, and in 32-bit word units the maximum TCP header is 60 bytes (15 x 4). The minimum value is 5 (20 bytes), covering the standard header without options.",
    howItWorks:
      "The receiver multiplies this value by 4 to find where the TCP payload begins. If the offset exceeds 5, the extra bytes contain TCP options (MSS, Window Scale, Timestamps, SACK, etc.).",
    commonValues: [
      "5 — Standard 20-byte header (no options)",
      "8 — Common with Timestamps option (32 bytes)",
      "6-10 — Typical range during SYN with multiple options",
    ],
    rfcReference: "RFC 9293, Section 3.1",
  },
  "tcp.Reserved": {
    overview:
      "The Reserved field is set aside for future use and must be zero in current implementations. Originally 6 bits, it was reduced to 3 bits as ECN and other extensions claimed bits from this space.",
    sizeRationale:
      "3 bits remain reserved for potential future protocol extensions. The original 6-bit field was gradually consumed as new features like ECN (CWR, ECE flags) and the NS flag were standardized.",
    howItWorks:
      "Conforming implementations must set these bits to zero when sending and should ignore them when receiving. Some experimental protocols have proposed using these bits, but none have been standardized.",
    commonValues: [
      "000 — Must be zero in all conforming implementations",
    ],
    rfcReference: "RFC 9293, Section 3.1",
  },
  "tcp.URG": {
    overview:
      "The URG (Urgent) flag indicates that the Urgent Pointer field is valid and that urgent data exists in this segment. Urgent data can be processed by the receiver ahead of any buffered data.",
    sizeRationale:
      "1 bit is sufficient as it is a boolean indicator. Its state determines whether the Urgent Pointer field should be interpreted.",
    howItWorks:
      "When set, the Urgent Pointer points to the last byte of urgent data. The receiver's application can read urgent data out-of-band using mechanisms like TCP OOB in the socket API. In practice, urgent data is rarely used and many applications ignore it.",
    commonValues: [
      "0 — No urgent data (vast majority of segments)",
      "1 — Urgent data present (used by Telnet for interrupt signals)",
    ],
    rfcReference: "RFC 9293, Section 3.1; RFC 6093",
  },
  "tcp.ACK": {
    overview:
      "The ACK flag indicates that the Acknowledgment Number field is valid. After the initial SYN, virtually every TCP segment has this flag set, making it the most commonly seen TCP flag.",
    sizeRationale:
      "1 bit is sufficient for this boolean indicator. The ACK flag is set in all segments after the initial SYN, meaning it is essentially always on during an established connection.",
    howItWorks:
      "When set, the receiver should process the Acknowledgment Number field to update its send window and determine which data has been received. Pure ACK segments (no data) are used to confirm receipt and advance the sender's window.",
    commonValues: [
      "0 — Only in the initial SYN segment",
      "1 — Set in all other segments (SYN-ACK, data, FIN, RST)",
    ],
    rfcReference: "RFC 9293, Section 3.1",
  },
  "tcp.PSH": {
    overview:
      "The PSH (Push) flag tells the receiver to deliver the data to the application immediately rather than buffering it. This reduces latency for interactive applications like SSH and Telnet.",
    sizeRationale:
      "1 bit as a boolean signal. The push function was designed to be lightweight — a simple hint from sender to receiver to flush the receive buffer.",
    howItWorks:
      "The sending TCP sets PSH when the application performs a send/write with no more data pending. The receiving TCP stack then delivers all buffered data to the application without waiting for more segments. Most TCP stacks set PSH on the last segment of a burst.",
    commonValues: [
      "0 — Data may be buffered by receiver",
      "1 — Receiver should deliver data immediately",
    ],
    rfcReference: "RFC 9293, Section 3.1",
  },
  "tcp.RST": {
    overview:
      "The RST (Reset) flag abruptly terminates a TCP connection without the normal FIN handshake. It indicates an error condition such as a connection to a closed port, or is used to reject an invalid segment.",
    sizeRationale:
      "1 bit for a boolean signal. RST is an immediate, hard termination — no negotiation or acknowledgment is required or expected.",
    howItWorks:
      "When a host receives a SYN for a port with no listening process, it responds with RST. A host may also send RST to abort an existing connection. Upon receiving RST, the peer immediately closes the connection and discards buffered data. Firewalls often send RST to actively reject connections.",
    commonValues: [
      "0 — Normal operation",
      "1 — Connection reset / refused",
    ],
    rfcReference: "RFC 9293, Section 3.5.2",
  },
  "tcp.SYN": {
    overview:
      "The SYN (Synchronize) flag initiates a TCP connection and synchronizes sequence numbers between the two endpoints. It is used only during the three-way handshake that establishes every TCP connection.",
    sizeRationale:
      "1 bit for a boolean signal. SYN consumes one sequence number, which is why the ACK for a SYN always acknowledges ISN+1 even though no data was sent.",
    howItWorks:
      "The client sends SYN with its Initial Sequence Number. The server responds with SYN-ACK containing its own ISN. The client completes with ACK. This three-way handshake establishes both directions of the connection and negotiates options like MSS, Window Scale, and SACK.",
    commonValues: [
      "SYN (no ACK) — Connection request (first packet of handshake)",
      "SYN+ACK — Connection response (second packet)",
      "SYN flood — DDoS attack using many SYN packets without completing handshakes",
    ],
    rfcReference: "RFC 9293, Section 3.5.1",
  },
  "tcp.FIN": {
    overview:
      "The FIN (Finish) flag signals that the sender has no more data to transmit and wishes to close its half of the connection. TCP connections are bidirectional, so each side must send FIN independently.",
    sizeRationale:
      "1 bit for a boolean signal. Like SYN, FIN consumes one sequence number, ensuring it is reliably acknowledged by the receiver.",
    howItWorks:
      "The initiating side sends FIN, the other side acknowledges it (ACK). The second side then sends its own FIN when ready, which is also acknowledged. This four-way teardown (or three-way if FIN-ACK is combined) ensures both sides agree the connection is closed.",
    commonValues: [
      "FIN+ACK — Common combined teardown segment",
      "After FIN, the sender enters FIN-WAIT state",
      "TIME-WAIT state (2*MSL) prevents old segments from interfering with new connections",
    ],
    rfcReference: "RFC 9293, Section 3.5.1",
  },
  "tcp.Window": {
    overview:
      "The Window Size advertises how many bytes the sender of this segment is willing to receive. This is TCP's primary flow control mechanism, preventing a fast sender from overwhelming a slow receiver.",
    sizeRationale:
      "16 bits allow a maximum window of 65,535 bytes. For high-bandwidth connections, the Window Scale option (negotiated during handshake) provides a multiplier, effectively extending this to over 1 GB.",
    howItWorks:
      "The receiver advertises available buffer space via this field. The sender must not have more unacknowledged bytes in flight than the receiver's window allows. A window of 0 means the receiver's buffer is full, causing the sender to pause (persist timer keeps the connection alive).",
    commonValues: [
      "65535 — Maximum without Window Scale",
      "0 — Receiver buffer full (zero window)",
      "Common scale factors: 7 (x128), 8 (x256), 14 (x16384)",
    ],
    rfcReference: "RFC 9293, Section 3.1; RFC 7323 (Window Scale)",
  },
  "tcp.Checksum": {
    overview:
      "The TCP Checksum verifies the integrity of the entire TCP segment (header + data) plus a pseudo-header containing IP source/destination addresses. Unlike the IP checksum, it protects the payload as well.",
    sizeRationale:
      "16 bits provide the same ones' complement checksum as IP. While not as strong as CRC-32, it was designed for efficient computation in 1970s hardware. Modern NICs often perform checksum offloading in hardware.",
    howItWorks:
      "The sender computes the checksum over a pseudo-header (source IP, dest IP, protocol, TCP length) plus the full TCP segment. The receiver repeats this calculation; a mismatch causes silent discard. Checksum offload in modern NICs means the OS may send segments with invalid checksums that the NIC corrects.",
    commonValues: [
      "Varies per segment — covers pseudo-header + full TCP segment",
      "0x0000 is technically valid but extremely rare",
      "Hardware offload may show incorrect values in packet captures",
    ],
    rfcReference: "RFC 9293, Section 3.1; RFC 1071",
  },
  "tcp.Urg Ptr": {
    overview:
      "The Urgent Pointer indicates the offset from the sequence number where urgent data ends. It is only meaningful when the URG flag is set, allowing the receiver to identify the boundary of out-of-band data.",
    sizeRationale:
      "16 bits allow pointing up to 65,535 bytes ahead of the current sequence number, which is more than enough for the small amount of urgent data typically sent (usually just 1 byte for Telnet interrupt).",
    howItWorks:
      "When URG is set, the receiver reads this pointer to find the end of urgent data. The application can then read the urgent byte(s) out-of-band via the socket API (e.g., MSG_OOB). However, implementations vary and urgent data handling is considered unreliable in practice.",
    commonValues: [
      "0 — When URG flag is not set (field ignored)",
      "1 — One byte of urgent data (most common urgent use)",
    ],
    rfcReference: "RFC 9293, Section 3.1; RFC 6093",
  },

  // ── UDP (4) ───────────────────────────────────────────────────
  "udp.Src Port": {
    overview:
      "The UDP Source Port identifies the sending application. Unlike TCP, UDP is connectionless, so this port is optional — a source port of 0 indicates that no reply is expected.",
    sizeRationale:
      "16 bits match TCP's port range for consistency across transport protocols. This allows the same IANA port registry to serve both TCP and UDP services.",
    howItWorks:
      "The sending application binds to a port (or the OS assigns an ephemeral one). The receiver can use this port to send responses back. DNS clients, for example, send queries from a random ephemeral port and expect replies to that same port.",
    commonValues: [
      "0 — No reply expected (source port not used)",
      "49152-65535 — Ephemeral ports",
      "53 — DNS server responding",
      "67-68 — DHCP (server/client)",
    ],
    rfcReference: "RFC 768",
  },
  "udp.Dst Port": {
    overview:
      "The UDP Destination Port identifies the target application on the receiving host. This is the primary demultiplexing field for UDP, directing datagrams to the correct service.",
    sizeRationale:
      "16 bits provide the same 65,536-port namespace as TCP. Many services run on both TCP and UDP with the same port number (e.g., DNS on port 53).",
    howItWorks:
      "The receiving OS delivers the datagram to the socket bound to this port. If no socket is listening, the host typically responds with an ICMP Port Unreachable message. Unlike TCP, there is no connection state — any datagram to an open port is accepted.",
    commonValues: [
      "53 — DNS",
      "67/68 — DHCP (server/client)",
      "123 — NTP (Network Time Protocol)",
      "161 — SNMP",
      "443 — QUIC (HTTP/3)",
      "500 — IKE (IPsec key exchange)",
    ],
    rfcReference: "RFC 768; IANA Service Name and Transport Protocol Port Number Registry",
  },
  "udp.Length": {
    overview:
      "The UDP Length field specifies the total length of the UDP datagram (header + data) in bytes. The minimum value is 8, representing a UDP header with no payload.",
    sizeRationale:
      "16 bits allow a maximum UDP datagram of 65,535 bytes. In practice, datagrams larger than the path MTU will be fragmented at the IP layer, so most UDP datagrams stay within 1472 bytes (1500 MTU - 20 IP - 8 UDP).",
    howItWorks:
      "The receiver uses this field to determine the boundary of the UDP data within the IP payload. Since the IP Total Length also conveys this information, the UDP Length field is technically redundant but serves as an additional integrity check.",
    commonValues: [
      "8 — Minimum (header only, no data)",
      "Typically < 1472 bytes to avoid IP fragmentation on Ethernet",
      "512 — Traditional DNS maximum response size",
    ],
    rfcReference: "RFC 768",
  },
  "udp.Checksum": {
    overview:
      "The UDP Checksum covers the UDP header, data, and a pseudo-header from the IP layer. In IPv4, it is optional (a value of 0 means no checksum was computed), but in IPv6 it is mandatory.",
    sizeRationale:
      "16 bits provide the same ones' complement checksum as TCP and IP. Making it optional in IPv4 was a design choice favoring performance for applications that have their own integrity checks.",
    howItWorks:
      "The sender computes the checksum over the pseudo-header (source/dest IP, protocol, UDP length) plus the entire UDP datagram. If the computed checksum is 0, it is transmitted as 0xFFFF (since 0 means 'no checksum'). Receivers silently discard datagrams with incorrect checksums.",
    commonValues: [
      "0x0000 — Checksum not computed (IPv4 only)",
      "0xFFFF — Transmitted when computed checksum is 0",
      "Non-zero — Valid checksum covering pseudo-header + datagram",
    ],
    rfcReference: "RFC 768; RFC 8200, Section 8.1 (IPv6 requirement)",
  },

  // ── Payload (1) ───────────────────────────────────────────────
  "payload.Data": {
    overview:
      "The payload is the application-layer data encapsulated within the transport-layer segment. It contains the actual information being transmitted — HTTP requests, TLS records, DNS queries, or any other application protocol data.",
    sizeRationale:
      "The payload size is variable and determined by the application and the Maximum Segment Size (MSS) negotiated during the TCP handshake or the application's own framing for UDP. There is no fixed bit count in the protocol specification.",
    howItWorks:
      "The transport layer delivers the payload to the application identified by the destination port. For TCP, the payload is a stream of bytes reassembled in order. For UDP, each datagram's payload is delivered independently. The application interprets the raw bytes according to its own protocol (HTTP, DNS, TLS, etc.).",
    commonValues: [
      "HTTP — Starts with 'GET /', 'POST /', 'HTTP/1.1'",
      "TLS — Starts with 0x16 (handshake) or 0x17 (application data)",
      "DNS — Structured query/response with question and answer sections",
      "Empty — TCP segments with no data (ACK-only, SYN, FIN)",
    ],
    rfcReference: "Application-specific; see RFC 9110 (HTTP), RFC 8446 (TLS 1.3), RFC 1035 (DNS)",
  },
};

export function getFieldEncyclopedia(
  layer: string,
  fieldName: string,
): FieldEncyclopediaEntry | null {
  return encyclopedia[`${layer}.${fieldName}`] ?? null;
}

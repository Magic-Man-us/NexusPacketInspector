use memmap2::Mmap;
use pcap_parser::traits::PcapReaderIterator;
use pcap_parser::*;
use std::fs::File;
use std::io::Cursor;

/// Read a PCAP or PCAP-NG file and return the raw packet bytes for each record.
pub fn read_pcap(path: &str) -> Result<Vec<Vec<u8>>, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mmap = unsafe { Mmap::map(&file) }.map_err(|e| format!("Failed to mmap file: {}", e))?;

    if mmap.len() < 4 {
        return Err("File too small to be a valid capture file".into());
    }

    // Detect format from magic number
    let magic = &mmap[0..4];
    match magic {
        // PCAP little-endian or big-endian magic
        [0xd4, 0xc3, 0xb2, 0xa1] | [0xa1, 0xb2, 0xc3, 0xd4] => read_pcap_legacy(&mmap),
        // PCAP-NG magic (Section Header Block type = 0x0A0D0D0A)
        [0x0a, 0x0d, 0x0d, 0x0a] => read_pcapng(&mmap),
        _ => Err("Unrecognized capture file format".into()),
    }
}

fn read_pcap_legacy(data: &[u8]) -> Result<Vec<Vec<u8>>, String> {
    let mut packets = Vec::new();
    let cursor = Cursor::new(data);
    let mut reader = LegacyPcapReader::new(65536, cursor)
        .map_err(|e| format!("Failed to create PCAP reader: {}", e))?;

    loop {
        match reader.next() {
            Ok((offset, block)) => {
                match block {
                    PcapBlockOwned::Legacy(packet) => {
                        packets.push(packet.data.to_vec());
                    }
                    PcapBlockOwned::LegacyHeader(_) => {
                        // Skip the file header
                    }
                    _ => {}
                }
                reader.consume(offset);
            }
            Err(PcapError::Eof) => break,
            Err(PcapError::Incomplete(_)) => {
                if reader.refill().is_err() {
                    break;
                }
            }
            Err(e) => return Err(format!("Error reading PCAP: {}", e)),
        }
    }

    Ok(packets)
}

fn read_pcapng(data: &[u8]) -> Result<Vec<Vec<u8>>, String> {
    let mut packets = Vec::new();
    let cursor = Cursor::new(data);
    let mut reader = PcapNGReader::new(65536, cursor)
        .map_err(|e| format!("Failed to create PCAP-NG reader: {}", e))?;

    loop {
        match reader.next() {
            Ok((offset, block)) => {
                match block {
                    PcapBlockOwned::NG(ng_block) => match ng_block {
                        Block::EnhancedPacket(epb) => {
                            packets.push(epb.data.to_vec());
                        }
                        Block::SimplePacket(spb) => {
                            packets.push(spb.data.to_vec());
                        }
                        _ => {
                            // Skip section headers, interface description blocks, etc.
                        }
                    },
                    _ => {}
                }
                reader.consume(offset);
            }
            Err(PcapError::Eof) => break,
            Err(PcapError::Incomplete(_)) => {
                if reader.refill().is_err() {
                    break;
                }
            }
            Err(e) => return Err(format!("Error reading PCAP-NG: {}", e)),
        }
    }

    Ok(packets)
}

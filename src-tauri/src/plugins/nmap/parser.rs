use quick_xml::events::Event;
use quick_xml::Reader;

use super::types::{NmapHost, NmapOsMatch, NmapPort, NmapScanInfo, NmapScanResult};
use crate::plugins::traits::PluginError;

pub fn parse_nmap_xml(xml: &str) -> Result<NmapScanResult, PluginError> {
    let mut reader = Reader::from_str(xml);
    reader.trim_text(true);

    let mut hosts: Vec<NmapHost> = Vec::new();
    let mut scan_info = NmapScanInfo {
        scanner: String::new(),
        args: String::new(),
        start_time: String::new(),
        end_time: String::new(),
        elapsed: String::new(),
        summary: String::new(),
    };

    // Current host being parsed
    let mut current_host: Option<NmapHost> = None;

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let name = e.name();
                match name.as_ref() {
                    b"nmaprun" => {
                        for attr in e.attributes().flatten() {
                            match attr.key.as_ref() {
                                b"scanner" => {
                                    scan_info.scanner =
                                        String::from_utf8_lossy(&attr.value).to_string();
                                }
                                b"args" => {
                                    scan_info.args =
                                        String::from_utf8_lossy(&attr.value).to_string();
                                }
                                b"startstr" => {
                                    scan_info.start_time =
                                        String::from_utf8_lossy(&attr.value).to_string();
                                }
                                _ => {}
                            }
                        }
                    }
                    b"host" => {
                        current_host = Some(NmapHost {
                            address: String::new(),
                            hostname: None,
                            status: String::new(),
                            ports: Vec::new(),
                            os_matches: Vec::new(),
                        });
                    }
                    b"status" => {
                        if let Some(ref mut host) = current_host {
                            for attr in e.attributes().flatten() {
                                if attr.key.as_ref() == b"state" {
                                    host.status =
                                        String::from_utf8_lossy(&attr.value).to_string();
                                }
                            }
                        }
                    }
                    b"address" => {
                        if let Some(ref mut host) = current_host {
                            let mut addrtype = String::new();
                            let mut addr = String::new();
                            for attr in e.attributes().flatten() {
                                match attr.key.as_ref() {
                                    b"addrtype" => {
                                        addrtype =
                                            String::from_utf8_lossy(&attr.value).to_string();
                                    }
                                    b"addr" => {
                                        addr =
                                            String::from_utf8_lossy(&attr.value).to_string();
                                    }
                                    _ => {}
                                }
                            }
                            if addrtype == "ipv4" || addrtype == "ipv6" {
                                host.address = addr;
                            }
                        }
                    }
                    b"hostname" => {
                        if let Some(ref mut host) = current_host {
                            for attr in e.attributes().flatten() {
                                if attr.key.as_ref() == b"name" {
                                    host.hostname =
                                        Some(String::from_utf8_lossy(&attr.value).to_string());
                                }
                            }
                        }
                    }
                    b"port" => {
                        if let Some(ref mut host) = current_host {
                            let mut port = NmapPort {
                                port_id: 0,
                                protocol: String::new(),
                                state: String::new(),
                                service_name: None,
                                service_version: None,
                                service_product: None,
                            };
                            for attr in e.attributes().flatten() {
                                match attr.key.as_ref() {
                                    b"portid" => {
                                        port.port_id = String::from_utf8_lossy(&attr.value)
                                            .parse()
                                            .unwrap_or(0);
                                    }
                                    b"protocol" => {
                                        port.protocol =
                                            String::from_utf8_lossy(&attr.value).to_string();
                                    }
                                    _ => {}
                                }
                            }
                            host.ports.push(port);
                        }
                    }
                    b"state" => {
                        if let Some(ref mut host) = current_host {
                            if let Some(port) = host.ports.last_mut() {
                                for attr in e.attributes().flatten() {
                                    if attr.key.as_ref() == b"state" {
                                        port.state =
                                            String::from_utf8_lossy(&attr.value).to_string();
                                    }
                                }
                            }
                        }
                    }
                    b"service" => {
                        if let Some(ref mut host) = current_host {
                            if let Some(port) = host.ports.last_mut() {
                                for attr in e.attributes().flatten() {
                                    match attr.key.as_ref() {
                                        b"name" => {
                                            port.service_name = Some(
                                                String::from_utf8_lossy(&attr.value).to_string(),
                                            );
                                        }
                                        b"version" => {
                                            port.service_version = Some(
                                                String::from_utf8_lossy(&attr.value).to_string(),
                                            );
                                        }
                                        b"product" => {
                                            port.service_product = Some(
                                                String::from_utf8_lossy(&attr.value).to_string(),
                                            );
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }
                    b"osmatch" => {
                        if let Some(ref mut host) = current_host {
                            let mut os = NmapOsMatch {
                                name: String::new(),
                                accuracy: String::new(),
                            };
                            for attr in e.attributes().flatten() {
                                match attr.key.as_ref() {
                                    b"name" => {
                                        os.name =
                                            String::from_utf8_lossy(&attr.value).to_string();
                                    }
                                    b"accuracy" => {
                                        os.accuracy =
                                            String::from_utf8_lossy(&attr.value).to_string();
                                    }
                                    _ => {}
                                }
                            }
                            host.os_matches.push(os);
                        }
                    }
                    b"runstats" | b"finished" => {
                        for attr in e.attributes().flatten() {
                            match attr.key.as_ref() {
                                b"timestr" => {
                                    scan_info.end_time =
                                        String::from_utf8_lossy(&attr.value).to_string();
                                }
                                b"elapsed" => {
                                    scan_info.elapsed =
                                        String::from_utf8_lossy(&attr.value).to_string();
                                }
                                b"summary" => {
                                    scan_info.summary =
                                        String::from_utf8_lossy(&attr.value).to_string();
                                }
                                _ => {}
                            }
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::End(ref e)) => {
                if e.name().as_ref() == b"host" {
                    if let Some(host) = current_host.take() {
                        hosts.push(host);
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                return Err(PluginError::ParseError(format!(
                    "XML parse error: {}",
                    e
                )));
            }
            _ => {}
        }
        buf.clear();
    }

    Ok(NmapScanResult { hosts, scan_info })
}

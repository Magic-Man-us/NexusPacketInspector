/// Compute a canonical stream key by sorting endpoints so that
/// the same conversation always produces the same key, matching
/// the frontend pattern: `srcIP:srcPort-dstIP:dstPort`.
pub fn compute_stream_key(src_ip: &str, src_port: u16, dst_ip: &str, dst_port: u16) -> String {
    let a = format!("{}:{}", src_ip, src_port);
    let b = format!("{}:{}", dst_ip, dst_port);

    if a <= b {
        format!("{}-{}", a, b)
    } else {
        format!("{}-{}", b, a)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_key_canonical() {
        let key1 = compute_stream_key("10.0.0.1", 12345, "10.0.0.2", 80);
        let key2 = compute_stream_key("10.0.0.2", 80, "10.0.0.1", 12345);
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_stream_key_format() {
        let key = compute_stream_key("10.0.0.1", 12345, "10.0.0.2", 80);
        assert_eq!(key, "10.0.0.1:12345-10.0.0.2:80");
    }
}

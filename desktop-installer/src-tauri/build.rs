fn main() {
    // Ensure the payload file always exists so include_bytes!() compiles even
    // before the main EzzCloud build has produced its portable .exe (e.g. for
    // local checks). The CI workflow overwrites this with the real .exe.
    let payload = std::path::Path::new("payload").join("EzzCloud.exe");
    if !payload.exists() {
        let _ = std::fs::create_dir_all(payload.parent().unwrap());
        let _ = std::fs::write(&payload, b"");
    }
    println!("cargo:rerun-if-changed=payload/EzzCloud.exe");

    tauri_build::build()
}

fn main() {
    println!("cargo:rustc-link-search=native=mpv");
    println!("cargo:rustc-link-lib=mpv");
    tauri_build::build()
}

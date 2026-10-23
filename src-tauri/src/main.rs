// Mencegah jendela konsole tambahan pada build release Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    frp_recovery_assistant_lib::run()
}

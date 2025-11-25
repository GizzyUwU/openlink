use nanoserde::SerJson;
use tauri::Manager;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    WebviewUrl, WebviewWindowBuilder,
};
use url::form_urlencoded;
use url::Url;

#[derive(Debug, SerJson)]
struct OAuthRedirect {
    idp_token: String,
    server: String,
}

#[tauri::command]
async fn run_oauth(app_handle: tauri::AppHandle, url: String) -> Result<String, String> {
    let parsed_url = Url::parse(&url).map_err(|e| e.to_string())?;
    let (tx, rx) = tokio::sync::oneshot::channel::<String>();
    let tx = std::sync::Mutex::new(Some(tx));
    let app = app_handle.clone();

    WebviewWindowBuilder::new(&app_handle, "oauth", WebviewUrl::External(parsed_url))
        .on_navigation(move |url| {
            if let Some(host) = url.host_str() {
            if host.ends_with("edulinkone.com") {
                    let parse_kv = |pairs: url::form_urlencoded::Parse<'_>| -> (Option<String>, Option<String>) {
                        let mut idp_token = None;
                        let mut server = None;
                        for (k, v) in pairs {
                            match k.as_ref() {
                                "idp_token" => idp_token = Some(v.to_string()),
                                "server" => server = Some(v.to_string()),
                                _ => {}
                            }
                        }
                        (idp_token, server)
                    };

                    let (mut idp_token, mut server) = parse_kv(url.query_pairs());
                    if idp_token.is_none() || server.is_none() {
                        if let Some(fragment) = url.fragment() {
                            if let Some(qpos) = fragment.find('?') {
                                let frag_query = &fragment[qpos + 1..];
                                let (frag_idp, frag_server) = parse_kv(form_urlencoded::parse(frag_query.as_bytes()));
                                if idp_token.is_none() { idp_token = frag_idp; }
                                if server.is_none() { server = frag_server; }
                            }
                        }
                    }

                    if let (Some(idp_token), Some(server)) = (idp_token, server) {
                        let redirect = OAuthRedirect { idp_token, server };
                        let _ = tx.lock().unwrap().take().unwrap().send(redirect.serialize_json());
                        if let Some(window) = app.get_webview_window("oauth") {
                            let _ = window.close();
                        }
                    }
                }
            }
            true
        })
        .build()
        .map_err(|e| e.to_string())?;

    let redirect = rx
        .await
        .map_err(|_| "OAuth redirect not captured".to_string())?;
    Ok(redirect)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Webview,
                ))
                .max_file_size(50_000)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let open_i = MenuItem::with_id(app, "open", "Open Openlink", true, None::<&str>)?;
            let restart_i =
                MenuItem::with_id(app, "restart", "Restart Openlink", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &restart_i, &quit_i])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                        }
                    }
                    "restart" => {
                        app.restart();
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {
                        println!("menu item {:?} not handled", event.id);
                    }
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        println!("left click pressed and released");
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {
                        println!("unhandled event {event:?}");
                    }
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![run_oauth])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

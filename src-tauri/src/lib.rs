use tauri::Manager;
use tauri::{WebviewUrl, WebviewWindowBuilder};
use tokio::sync::oneshot;
use url::form_urlencoded;
use url::Url;

#[derive(Debug, serde::Serialize, Clone)]
struct OAuthRedirect {
    idp_token: String,
    server: String,
}

#[tauri::command]
async fn run_oauth(app_handle: tauri::AppHandle, url: String) -> Result<OAuthRedirect, String> {
    let parsed_url = Url::parse(&url).map_err(|e| e.to_string())?;
    let (tx, rx) = oneshot::channel();
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
                        if let Some(tx) = tx.lock().unwrap().take() {
                            let _ = tx.send(OAuthRedirect { idp_token, server });
                            if let Some(window) = app.get_webview_window("oauth") {
                                      let _ = window.close();
                                  }
                        }
                    }
                }
            }
            true
        })
        .build()
        .map_err(|e| e.to_string())?;

    rx.await
        .map_err(|_| "OAuth redirect not captured".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![run_oauth])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

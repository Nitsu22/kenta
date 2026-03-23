(function attachSupabaseClient() {
  const config = window.APP_CONFIG || {};

  function isPlaceholder(value) {
    return !value || value.includes("YOUR-");
  }

  function createSupabaseClient() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      return { client: null, error: "Supabaseライブラリの読み込みに失敗しました。" };
    }

    if (isPlaceholder(config.supabaseUrl) || isPlaceholder(config.supabaseAnonKey)) {
      return {
        client: null,
        error:
          "Supabase設定が未完了です。scripts/config.js の supabaseUrl と supabaseAnonKey を設定してください。"
      };
    }

    try {
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: false }
      });
      return { client, error: null };
    } catch (error) {
      return {
        client: null,
        error: "Supabaseクライアントの初期化に失敗しました。設定値を確認してください。"
      };
    }
  }

  window.createSupabaseClient = createSupabaseClient;
})();

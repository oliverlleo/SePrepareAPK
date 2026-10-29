package br.com.orador.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.speech.tts.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.lang.ref.WeakReference;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

public final class MainActivity extends Activity {
    private WebView web;
    private AppStore store;
    private DriveController drive;
    private AppUpdates updates;
    private AppUpdateInstaller updateInstaller;
    private TextToSpeech voices;
    private volatile boolean voicesReady = false;
    private volatile boolean voicesFailed = false;
    private int voicesGeneration = 0;
    private boolean refreshVoicesAfterSettings = false;
    private volatile boolean loaded = false;
    private String pendingId = "", exportContent = "";
    private final ArrayDeque<JSONObject> pendingImports = new ArrayDeque<>();
    private final ArrayDeque<String> pendingImportErrors = new ArrayDeque<>();
    private final ExecutorService jobs = Executors.newSingleThreadExecutor();
    private static final int REQ_RECORD_AUDIO = 52;
    private PermissionRequest pendingWebAudioRequest = null;
    private static WeakReference<MainActivity> current = new WeakReference<>(null);
    static void send(String name, JSONObject data) {
        MainActivity a = current.get();
        if (a != null) a.emit(name, data);
    }
    private void emit(String name, JSONObject data) {
        runOnUiThread(() -> {
            if (web != null && loaded) web.evaluateJavascript("window.dispatchEvent(new CustomEvent(" + JSONObject.quote(name) + ",{detail:" + data.toString() + "}));", null);
        });
    }
    static JSONObject object(Object... pairs) {
        JSONObject j = new JSONObject();
        try { for (int i=0; i+1<pairs.length; i+=2) j.put(String.valueOf(pairs[i]), pairs[i+1]); } catch (JSONException ignored) { }
        return j;
    }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        current = new WeakReference<>(this);
        store = new AppStore(this);
        drive = new DriveController(this);
        try {
            long code = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            updates = new AppUpdates(code, SystemClock::elapsedRealtime, info -> emit("nativeAppUpdate", object("available", info == null ? JSONObject.NULL : info)));
            updateInstaller = new AppUpdateInstaller(this, code, info -> emit("nativeAppUpdateDownload", info));
        } catch (PackageManager.NameNotFoundException ignored) { }
        consumeIntent(getIntent());
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        web = new WebView(this);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        web.setBackgroundColor(Color.rgb(248,245,239));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportZoom(false);
        web.addJavascriptInterface(new Bridge(), "OradorNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if ("app.orador.local".equals(uri.getHost()) && "https".equals(uri.getScheme())) {
                    String p = uri.getPath();
                    if (p == null || p.equals("/")) p = "/index.html";
                    if (p.contains("..")) return denied();
                    try {
                        String mime = (p.endsWith(".js") || p.endsWith(".mjs")) ? "text/javascript" : p.endsWith(".css") ? "text/css" : p.endsWith(".wasm") ? "application/wasm" : p.endsWith(".woff2") ? "font/woff2" : p.endsWith(".json") ? "application/json" : p.endsWith(".onnx") ? "application/octet-stream" : "text/html";
                        return new WebResourceResponse(mime, (p.endsWith(".wasm") || p.endsWith(".onnx") || p.endsWith(".woff2")) ? null : "UTF-8", getAssets().open(p.substring(1)));
                    } catch (IOException e) { return denied(); }
                }
                return denied();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if ("app.orador.local".equals(uri.getHost())) return false;
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                }
                return true;
            }
            private WebResourceResponse denied() { return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0])); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (request == null || isFinishing() || isDestroyed()) return;
                    Uri origin = request.getOrigin();
                    boolean trustedOrigin = origin != null && "https".equals(origin.getScheme()) && "app.orador.local".equals(origin.getHost());
                    boolean wantsAudio = false;
                    String[] resources = request.getResources();
                    if (resources != null) {
                        for (String r : resources) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) { wantsAudio = true; break; }
                        }
                    }
                    if (!trustedOrigin || !wantsAudio) {
                        try { request.deny(); } catch (RuntimeException ignored) { }
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        try { request.grant(new String[]{ PermissionRequest.RESOURCE_AUDIO_CAPTURE }); } catch (RuntimeException ignored) { }
                    } else {
                        if (pendingWebAudioRequest != null && pendingWebAudioRequest != request) {
                            try { pendingWebAudioRequest.deny(); } catch (RuntimeException ignored) { }
                        }
                        pendingWebAudioRequest = request;
                        requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO }, REQ_RECORD_AUDIO);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (pendingWebAudioRequest == request) pendingWebAudioRequest = null;
                });
            }
        });
        setContentView(web);
        initializeVoices();
        web.loadUrl("https://app.orador.local/index.html");
    }
    private void initializeVoices() {
        voicesReady = false; voicesFailed = false;
        final int generation = ++voicesGeneration;
        if (voices != null) voices.shutdown();
        voices = new TextToSpeech(this, status -> runOnUiThread(() -> {
            if (generation != voicesGeneration || isFinishing() || isDestroyed()) return;
            voicesReady = status == TextToSpeech.SUCCESS;
            voicesFailed = !voicesReady;
            emit("nativeVoicesReady", object("ready", voicesReady));
        }));
        if (loaded) emit("nativeVoicesReady", object("ready", false));
    }
    private void deliverImport(String name, String content, boolean speechOnly) {
        JSONObject data=object("name",name,"text",content,"speechOnly",speechOnly);
        synchronized(pendingImports){if(!loaded){pendingImports.addLast(data);return;}}
        emit("nativeImport",data);
    }
    private void importError(String message) {
        synchronized(pendingImports){if(!loaded){pendingImportErrors.addLast(message);return;}}
        emit("nativeError",object("message",message));
    }
    private void importUri(Uri uri, boolean speechOnly) {
        if(uri==null||!"content".equals(uri.getScheme())){importError("Abra o arquivo pelo WhatsApp ou pelo seletor de arquivos do Android.");return;}
        jobs.execute(() -> {
            try{
                String name="Discurso recebido.seprepare";
                try(android.database.Cursor cursor=getContentResolver().query(uri,new String[]{android.provider.OpenableColumns.DISPLAY_NAME},null,null,null)){
                    if(cursor!=null&&cursor.moveToFirst()&&!cursor.isNull(0))name=cursor.getString(0);
                }catch(Exception ignored) { }

                InputStream input=getContentResolver().openInputStream(uri);
                if(input==null)throw new IOException("Arquivo indisponível.");
                deliverImport(name,readLimited(input,12000000),speechOnly);
            }catch(Exception error){importError("Não foi possível abrir o discurso: "+(error.getMessage()==null?"arquivo indisponível.":error.getMessage()));}
        });
    }
    private void consumeIntent(Intent intent) {
        if(intent==null)return;
        String id=intent.getStringExtra("speechId");if(id!=null)pendingId=id;
        try{
            if(Intent.ACTION_VIEW.equals(intent.getAction()))importUri(intent.getData(),true);
            else if(Intent.ACTION_SEND.equals(intent.getAction())){
                Uri uri=(Uri)intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if(uri==null&&intent.getClipData()!=null&&intent.getClipData().getItemCount()>0)uri=intent.getClipData().getItemAt(0).getUri();
                if(uri==null)uri=intent.getData();
                if(uri!=null)importUri(uri,true);
                else{
                    CharSequence content=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
                    if(content!=null)deliverImport("Texto compartilhado.txt",content.toString(),false);
                }
            }
        }catch(Exception error){importError("Não foi possível abrir o conteúdo compartilhado.");}
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);setIntent(intent);consumeIntent(intent);
        if(loaded&&!pendingId.isEmpty()){emit("nativeOpenSpeech",object("id",pendingId));pendingId="";}
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.oradorBack ? window.oradorBack() : false", value -> { if (!"true".equals(value)) MainActivity.super.onBackPressed(); });
    }
    @Override protected void onPause() {
        DriveController.foreground(this,false);
        if (updateInstaller != null) updateInstaller.pause();
        if (loaded) emit("nativeBackground", object());
        if (web != null) web.evaluateJavascript("window.oradorFlush && window.oradorFlush()", null);
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        DriveController.foreground(this,true);
        if (refreshVoicesAfterSettings) { refreshVoicesAfterSettings = false; initializeVoices(); }
        if (updates != null) updates.check();
        if (updateInstaller != null) updateInstaller.resume();
        if (loaded) {
            emit("nativePermissions", object("status", permissions()));
            emit("nativeForeground", object());
            try { String state=store.get("state"); if(!state.isEmpty()) ReminderScheduler.sync(this,new JSONObject(state),false); } catch(Exception ignored) { }
        }
    }
    @Override protected void onDestroy() {
        ++voicesGeneration; voicesReady = false;
        if (pendingWebAudioRequest != null) {
            try { pendingWebAudioRequest.deny(); } catch (RuntimeException ignored) { }
            pendingWebAudioRequest = null;
        }
        if (updates != null) updates.close();
        if (updateInstaller != null) updateInstaller.close();
        if (voices != null) voices.shutdown();
        jobs.shutdown();
        if (current.get() == this) current.clear();
        if (web != null) { web.removeJavascriptInterface("OradorNative"); web.destroy(); web = null; }
        store.close();
        super.onDestroy();
    }
    private JSONObject permissions() {
        boolean notifications = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        AlarmManager alarm = (AlarmManager)getSystemService(ALARM_SERVICE);
        boolean exact = Build.VERSION.SDK_INT < 31 || alarm.canScheduleExactAlarms();
        return object("notifications", notifications, "exact", exact);
    }
    @Override public void onRequestPermissionsResult(int req, String[] perms, int[] granted) {
        super.onRequestPermissionsResult(req, perms, granted);
        if (req == REQ_RECORD_AUDIO) {
            PermissionRequest pending = pendingWebAudioRequest;
            pendingWebAudioRequest = null;
            if (pending != null) {
                boolean allowed = !isFinishing() && !isDestroyed() && granted != null && granted.length > 0 && granted[0] == PackageManager.PERMISSION_GRANTED;
                try {
                    if (allowed) pending.grant(new String[]{ PermissionRequest.RESOURCE_AUDIO_CAPTURE });
                    else pending.deny();
                } catch (RuntimeException ignored) { }
            }
        }
        emit("nativePermissions", object("status", permissions()));
    }
    public final class Bridge {
        @JavascriptInterface public String appUpdateStatus() { return updates == null ? "{\"available\":null}" : updates.status(); }
        @JavascriptInterface public boolean downloadAppUpdate(int code) {
            JSONObject offer = updates == null ? null : updates.offerFor(code);
            return offer != null && updateInstaller != null && !isFinishing() && updateInstaller.begin(offer);
        }
        @JavascriptInterface public String appUpdateDownloadStatus() { return updateInstaller == null ? "{\"phase\":\"idle\"}" : updateInstaller.snapshot().toString(); }
        @JavascriptInterface public boolean installAppUpdate() { return updateInstaller != null && updateInstaller.install(); }
        @JavascriptInterface public void cancelAppUpdate() { if (updateInstaller != null) updateInstaller.cancel(); }
        @JavascriptInterface public boolean retryAppUpdate() { return updateInstaller != null && updateInstaller.retry(); }
        @JavascriptInterface public String driveStatus(){return DriveController.status(MainActivity.this).toString();}
        @JavascriptInterface public boolean driveTakeOffer(){return drive.takeOffer();}
        @JavascriptInterface public String drivePending(){return drive.pendingRead();}
        @JavascriptInterface public boolean drivePrepareRestore(){return drive.prepareRestore();}
        @JavascriptInterface public boolean driveAckRead(String id){return drive.acknowledge(id);}
        @JavascriptInterface public String driveReadBaseline(){return drive.readBaseline();}
        @JavascriptInterface public String driveRestoreBase(){return drive.restoreBase();}
        @JavascriptInterface public String driveBackupIndex(){return drive.backupIndex();}
        @JavascriptInterface public boolean driveCompleteRead(String receipt){return drive.completeRead(receipt);}
        @JavascriptInterface public void driveAction(String kind,String id,String argument){drive.run(kind,id,argument);}
        @JavascriptInterface public void setAppLanguage(String language) { AppLanguage.set(MainActivity.this, language); }
        @JavascriptInterface public String getState() { return store.get("state"); }
        @JavascriptInterface public boolean isLegalNoticeAcknowledged() {
            try { return getSharedPreferences("seprepare-ui", MODE_PRIVATE).getBoolean("legal-notice-acknowledged", false); }
            catch (RuntimeException error) { return false; }
        }
        @JavascriptInterface public boolean acknowledgeLegalNotice() {
            try { return getSharedPreferences("seprepare-ui", MODE_PRIVATE).edit().putBoolean("legal-notice-acknowledged", true).commit(); }
            catch (RuntimeException error) { return false; }
        }
        @JavascriptInterface public boolean saveStateWithOrigin(String json,String origin) {
            if (!java.util.Arrays.asList("user","drive","shared-import","manual-restore","local-configuration","internal","migration").contains(origin)) return false;
            getSharedPreferences("seprepare-drive-v1", MODE_PRIVATE).edit().putString("lastChangeOrigin",origin).apply();
            return saveState(json);
        }
        @JavascriptInterface public boolean saveState(String json) {
            try {
                if (json.length() > 12000000) return false;
                if (json.equals(store.get("state"))) return true;
                JSONObject state = new JSONObject(json);
                if (state.optInt("schema") != 1 || state.optJSONArray("speeches") == null) return false;
                store.put("state", json);
                JSONObject settings=state.optJSONObject("settings");
                AppLanguage.set(MainActivity.this, settings==null?"pt-BR":settings.optString("language","pt-BR"));
                DriveController.changedAsync(MainActivity.this);
                ReminderScheduler.sync(MainActivity.this, state, false);
                return true;
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface public String ready() {
            JSONArray imports=new JSONArray(),errors=new JSONArray();
            synchronized(pendingImports){loaded=true;while(!pendingImports.isEmpty())imports.put(pendingImports.removeFirst());while(!pendingImportErrors.isEmpty())errors.put(pendingImportErrors.removeFirst());}
            JSONObject data=object("id",pendingId,"imports",imports,"errors",errors,"permissions",permissions());
            pendingId="";return data.toString();
        }
        @JavascriptInterface public void setTheme(boolean dark) {
            runOnUiThread(() -> {
                int c = dark ? Color.rgb(22,33,33) : Color.rgb(248,245,239);
                getWindow().setStatusBarColor(c); getWindow().setNavigationBarColor(c);
                getWindow().getDecorView().setSystemUiVisibility(dark ? 0 : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                web.setBackgroundColor(c);
            });
        }
        @JavascriptInterface public void keepAwake(boolean enabled) {
            runOnUiThread(() -> { if (enabled) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); });
        }
        @JavascriptInterface public String clipboard() {
            try {
                ClipboardManager manager = (ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                ClipData clip = manager.getPrimaryClip();
                if (clip == null || clip.getItemCount() == 0) return "{}";
                ClipData.Item item = clip.getItemAt(0);
                return object("text", String.valueOf(item.coerceToText(MainActivity.this)), "html", item.getHtmlText() == null ? "" : item.getHtmlText()).toString();
            } catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public void copy(String plain, String html) {
            ((ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newHtmlText("Discurso", plain, html));
        }
        @JavascriptInterface public void requestNotifications() {
            runOnUiThread(() -> { if (Build.VERSION.SDK_INT >= 33) requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 51); });
        }
        @JavascriptInterface public void requestExactAlarms() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 31) try { startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:"+getPackageName()))); } catch(Exception ignored) { }
            });
        }
        @JavascriptInterface public String getPermissions() { return permissions().toString(); }
        @JavascriptInterface public String getVoices() {
            return voiceList().toString();
        }
        private JSONArray voiceList() {
            JSONArray list = new JSONArray();
            TextToSpeech engine = voices;
            Set<Voice> available = voicesReady && engine != null ? engine.getVoices() : null;
            if (available != null) {
                Voice defaultVoice = engine.getDefaultVoice();
                for (Voice v : available) if (SpeechVoices.offline(v) && SpeechVoices.supported(v.getLocale()) && SpeechVoices.installed(v, available, engine)) {
                    JSONObject item=object("name", v.getName(), "locale", v.getLocale().toLanguageTag(), "offline", true, "installed", true, "quality", v.getQuality(), "engine", engine.getDefaultEngine(), "default", defaultVoice != null && v.getName().equals(defaultVoice.getName()));
                    String alias=SpeechVoices.defaultAlias(v,available,defaultVoice);
                    if (!alias.isEmpty()) try { item.put("aliasOf",alias); } catch (JSONException ignored) { }
                    list.put(item);
                }
            }
            return list;
        }
        @JavascriptInterface public String getVoiceCatalog(String language) {
            try {
                String status=voicesReady?"ready":voicesFailed?"error":"loading";
                Locale locale=SpeechVoices.locale(language,AppLanguage.locale(MainActivity.this));
                Voice defaultVoice=voicesReady&&voices!=null?voices.getDefaultVoice():null;
                String defaultName=defaultVoice!=null&&SpeechVoices.installed(defaultVoice)?defaultVoice.getName():"";
                return object("status",status,"voices",voiceList(),"language",locale.toLanguageTag(),"languageSupport",voicesReady?voices.isLanguageAvailable(locale):-99,"defaultVoice",defaultName).toString();
            } catch (RuntimeException error) {
                return object("status","error","voices",new JSONArray(),"languageSupport",-99,"defaultVoice","").toString();
            }
        }
        @JavascriptInterface public void installVoices() {
            runOnUiThread(() -> {
                try { String engine=voices==null?null:voices.getDefaultEngine();if(engine!=null&&!engine.isEmpty()){startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).setPackage(engine));refreshVoicesAfterSettings=true;return;} } catch(Exception ignored) { }
                try { startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA));refreshVoicesAfterSettings=true;return; } catch(Exception ignored) { }
                try { startActivity(new Intent("com.android.settings.TTS_SETTINGS"));refreshVoicesAfterSettings=true; } catch(Exception e) { Toast.makeText(MainActivity.this,AppLanguage.t(MainActivity.this,"Abra as configurações de conversão de texto em voz do Android."),Toast.LENGTH_LONG).show(); }
            });
        }
        @JavascriptInterface public void refreshVoices() { runOnUiThread(() -> initializeVoices()); }
        @JavascriptInterface public void speak(String title, String text, int offset, String voice, float rate) {
            speakInLanguage(title, text, offset, voice, rate, AppLanguage.locale(MainActivity.this).toLanguageTag());
        }
        @JavascriptInterface public void speakInLanguage(String title, String text, int offset, String voice, float rate, String language) {
            speakSession(title, text, offset, voice, rate, language, java.util.UUID.randomUUID().toString());
        }
        @JavascriptInterface public void speakSession(String title, String text, int offset, String voice, float rate, String language, String requestId) {
            Intent i = new Intent(MainActivity.this, SpeechService.class).setAction("speak");
            i.putExtra("title", title).putExtra("text", text).putExtra("offset", offset).putExtra("voice", voice).putExtra("rate", rate).putExtra("language", language).putExtra("requestId", requestId);
            runOnUiThread(() -> startForegroundService(i));
        }
        @JavascriptInterface public void stopSpeaking() { runOnUiThread(() -> startService(new Intent(MainActivity.this, SpeechService.class).setAction("stop"))); }
        @JavascriptInterface public void stopSpeechSession(String requestId) { runOnUiThread(() -> startService(new Intent(MainActivity.this, SpeechService.class).setAction("stop").putExtra("requestId", requestId))); }
        @JavascriptInterface public void exportFile(String name, String mime, String content) {
            exportContent = content;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).setType(mime).addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE, name);
                try { startActivityForResult(intent, 61); } catch (Exception e) { emit("nativeError", object("message", "Não foi possível abrir o seletor de arquivos.")); }
            });
        }
        @JavascriptInterface public void shareText(String title,String content) {
            runOnUiThread(() -> {
                try{
                    if(content.length()>100000)throw new IOException("Este discurso é muito longo para enviar como mensagem. Compartilhe como arquivo.");
                    Intent share=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,content).putExtra(Intent.EXTRA_SUBJECT,title).putExtra(Intent.EXTRA_TITLE,title);
                    startActivity(Intent.createChooser(share,AppLanguage.t(MainActivity.this,"Compartilhar discurso")));
                }catch(Exception error){emit("nativeError",object("message",error.getMessage()==null?"Não foi possível compartilhar o texto.":error.getMessage()));}
            });
        }
        @JavascriptInterface public void shareSpeechFile(String name,String content) {
            shareSpeechFileWithMessage(name,content,"Preparação compartilhada pelo SePrepare.\n\nAbra o arquivo .seprepare no SePrepare e confira antes de salvar. Você também pode usar o ícone de importar → Usar arquivo.\n\nBaixar ou acessar o SePrepare: https://seprepareapp.com.br/baixar/");
        }
        @JavascriptInterface public void shareSpeechFileWithMessage(String name,String content,String message) {
            jobs.execute(() -> {
                try{
                    String format=new JSONObject(content).optString("format");
                    if(message==null||message.length()>4000)throw new IOException("Mensagem de compartilhamento inválida.");
                    if(content.getBytes(StandardCharsets.UTF_8).length>12000000||(!"orador-speech-v1".equals(format)&&!"orador-part-v2".equals(format)))throw new IOException("O arquivo não contém um discurso válido.");
                    Uri uri=SpeechShareProvider.create(MainActivity.this,name,content);
                    runOnUiThread(() -> {
                        try{
                            Intent share=new Intent(Intent.ACTION_SEND).setType(SpeechShareProvider.MIME).putExtra(Intent.EXTRA_STREAM,uri).putExtra(Intent.EXTRA_TEXT,message).putExtra(Intent.EXTRA_TITLE,name).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            share.setClipData(ClipData.newUri(getContentResolver(),name,uri));
                            Intent chooser=Intent.createChooser(share,AppLanguage.t(MainActivity.this,"Compartilhar arquivo do SePrepare"));chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(chooser);
                        }catch(Exception error){emit("nativeError",object("message","Não foi possível abrir os aplicativos para compartilhar."));}
                    });
                }catch(Exception error){emit("nativeError",object("message","Não foi possível preparar o arquivo: "+error.getMessage()));}
            });
        }
        @JavascriptInterface public void importFile() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"text/plain","text/html","application/json","application/octet-stream",SpeechShareProvider.MIME,SpeechShareProvider.LEGACY_MIME});
                try { startActivityForResult(intent, 62); } catch (Exception e) { emit("nativeError", object("message", "Não foi possível abrir os arquivos.")); }
            });
        }
        @JavascriptInterface public void proofread(String text, String token, String endpoint) {
            jobs.execute(() -> {
                HttpURLConnection connection = null;
                try {
                    if (text.getBytes(StandardCharsets.UTF_8).length > 20000) throw new IOException("Selecione um trecho menor (até 20 KB) para a revisão online.");
                    URL url = new URL(endpoint);
                    if (!"https".equals(url.getProtocol()) || url.getUserInfo() != null) throw new IOException("Use um endereço HTTPS válido para o corretor.");
                    connection = (HttpURLConnection)url.openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setRequestMethod("POST"); connection.setConnectTimeout(15000); connection.setReadTimeout(20000);
                    connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                    connection.setDoOutput(true);
                    byte[] bytes = ("language=pt-BR&text=" + URLEncoder.encode(text, "UTF-8")).getBytes(StandardCharsets.UTF_8);
                    connection.setFixedLengthStreamingMode(bytes.length);
                    try (OutputStream out = connection.getOutputStream()) { out.write(bytes); }
                    int status = connection.getResponseCode();
                    if (status != 200) throw new IOException(status == 429 ? "O serviço atingiu seu limite. A revisão local continua disponível." : "O corretor online respondeu com erro " + status + ".");
                    String response = readLimited(connection.getInputStream(), 4000000);
                    emit("nativeProofread", object("token", token, "result", new JSONObject(response)));
                } catch(Exception e) { emit("nativeProofread", object("token", token, "error", e.getMessage() == null ? "Sem conexão com o corretor." : e.getMessage())); }
                finally { if (connection != null) connection.disconnect(); }
            });
        }
    }
    static String readLimited(InputStream in, int max) throws IOException {
        try (InputStream input = in; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int n;
            while ((n = input.read(buffer)) != -1) { if (output.size()+n > max) throw new IOException("Arquivo muito grande."); output.write(buffer,0,n); }
            return output.toString("UTF-8");
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        if(drive!=null&&drive.result(request,result,data))return;
        super.onActivityResult(request,result,data);
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        if (request == 61) {
            try (OutputStream out = getContentResolver().openOutputStream(uri,"wt")) {
                if (out == null) throw new IOException();
                out.write(exportContent.getBytes(StandardCharsets.UTF_8));
                emit("nativeSaved", object("ok",true)); exportContent="";
            } catch(Exception e) { emit("nativeError", object("message","Não foi possível salvar o arquivo.")); }
        } else if (request == 62) {
            importUri(uri,false);
        }
    }
}

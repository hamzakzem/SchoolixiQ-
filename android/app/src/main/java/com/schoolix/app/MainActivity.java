package com.schoolix.app;

import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * SchoolixiQ native shell.
 *
 * The WebView loads the live site (https://schoolixiq.com). When the device is
 * offline or the site is unreachable on a main-frame request, we replace the
 * default Android error page with a branded retry page bundled with the app
 * (public/offline.html -> android_asset/public/offline.html). The retry button
 * (and the "online" event) reload the live site automatically.
 */
public class MainActivity extends BridgeActivity {

    private static final String OFFLINE_PAGE = "file:///android_asset/public/offline.html";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final Bridge bridge = this.getBridge();
        if (bridge == null) {
            return;
        }

        final WebView webView = bridge.getWebView();
        if (webView != null) {
            webView.setWebViewClient(new OfflineWebViewClient(bridge));
        }
    }

    /**
     * Extends Capacitor's client so all default bridge behaviour is preserved;
     * we only add a graceful fallback for failed main-frame navigations.
     */
    private static class OfflineWebViewClient extends BridgeWebViewClient {

        OfflineWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request != null && request.isForMainFrame()) {
                view.loadUrl(OFFLINE_PAGE);
                return;
            }
            super.onReceivedError(view, request, error);
        }
    }
}

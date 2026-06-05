import 'dart:io';
import 'package:flutter/material';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'error_screen.dart';
import '../widgets/loading_widget.dart';

class WebViewScreen extends StatefulWidget {
  final String initialUrl;
  const WebViewScreen({Key? key, this.initialUrl = "https://schoolixiq.com"}) : super(key: key);

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  InAppWebViewController? _webViewController;
  PullToRefreshController? _pullToRefreshController;
  
  bool _isLoading = true;
  double _progress = 0;
  bool _isOffline = false;

  final String _mainHost = "schoolixiq.com";

  @override
  void initState() {
    super.initState();
    _checkConnectivity();

    // Setup pull to refresh
    _pullToRefreshController = PullToRefreshController(
      settings: PullToRefreshSettings(
        color: const Color(0xFF2563EB),
      ),
      onRefresh: () async {
        if (Platform.isAndroid) {
          _webViewController?.reload();
        } else if (Platform.isIOS) {
          _webViewController?.loadUrl(
            urlRequest: URLRequest(url: await _webViewController?.getUrl()),
          );
        }
      },
    );
  }

  Future<void> _checkConnectivity() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) {
      setState(() {
        _isOffline = true;
        _isLoading = false;
      });
    }
  }

  // Handle native file downloads professionally
  Future<void> _downloadFile(String url, String filename) async {
    // Request storage permission
    var status = await Permission.storage.request();
    if (status.isGranted || Platform.isIOS) {
      try {
        final dir = Platform.isAndroid 
            ? await getExternalStorageDirectory() 
            : await getApplicationDocumentsDirectory();
            
        final filePath = "${dir?.path}/$filename";
        
        // Simple download trigger
        final httpClient = HttpClient();
        final request = await httpClient.getUrl(Uri.parse(url));
        final response = await request.close();
        final bytes = await consolidateHttpClientResponseBytes(response);
        final file = File(filePath);
        await file.writeAsBytes(bytes);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("تم تحميل الملف بنجاح: $filename"),
            action: SnackBarAction(
              label: "مشاركة",
              onPressed: () {
                Share.shareXFiles([XFile(filePath)], text: filename);
              },
            ),
          ),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("فشل في تحميل الملف: $e")),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("الرجاء منح إذن الوصول للملفات لتحميل المرفقات")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isOffline) {
      return ErrorScreen(
        onRetry: () {
          setState(() {
            _isOffline = false;
            _isLoading = true;
          });
          _webViewController?.reload();
        },
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: WillPopScope(
          onWillPop: () async {
            if (_webViewController != null && await _webViewController!.canGoBack()) {
              _webViewController!.goBack();
              return false; // Prevent closing the app
            }
            return true; // Let Android close the app if we are at home page
          },
          child: Stack(
            children: [
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri(widget.initialUrl)),
                initialSettings: InAppWebViewSettings(
                  useShouldOverrideUrlLoading: true,
                  mediaPlaybackRequiresUserGesture: false,
                  javaScriptEnabled: true,
                  domStorageEnabled: true,
                  databaseEnabled: true,
                  cacheEnabled: true,
                  supportMultipleWindows: false,
                  useOnDownloadStart: true,
                  allowFileAccessFromFileURLs: true,
                  allowUniversalAccessFromFileURLs: true,
                ),
                pullToRefreshController: _pullToRefreshController,
                onWebViewCreated: (controller) {
                  _webViewController = controller;
                  
                  // Add Javascript Native Bridge to communicate with Flutter and vice versa
                  _webViewController?.addJavaScriptHandler(
                    handlerName: 'flutterNotificationToken',
                    callback: (args) {
                      // Call this from mobile website to get FCM token
                      return "TOKEN_PLACEHOLDER_FCM";
                    },
                  );
                },
                onLoadStart: (controller, url) {
                  setState(() {
                    _isLoading = true;
                  });
                },
                onLoadStop: (controller, url) async {
                  _pullToRefreshController?.endRefreshing();
                  setState(() {
                    _isLoading = false;
                  });
                },
                onProgressChanged: (controller, progress) {
                  if (progress == 100) {
                    _pullToRefreshController?.endRefreshing();
                  }
                  setState(() {
                    _progress = progress / 100;
                  });
                },
                onLoadError: (controller, url, code, message) {
                  _pullToRefreshController?.endRefreshing();
                  if (code == -2 || code == -1009) { // No internet connection codes
                    setState(() {
                      _isOffline = true;
                    });
                  }
                },
                onDownloadStartRequest: (controller, downloadStartRequest) async {
                  final url = downloadStartRequest.url.toString();
                  final filename = downloadStartRequest.suggestedFilename ?? 'downloaded_file';
                  await _downloadFile(url, filename);
                },
                shouldOverrideUrlLoading: (controller, navigationAction) async {
                  var uri = navigationAction.request.url;
                  
                  if (uri == null) return NavigationActionPolicy.ALLOW;

                  // Handle external deep links
                  if (uri.scheme == 'tel' || 
                      uri.scheme == 'mailto' || 
                      uri.scheme == 'sms' ||
                      uri.toString().startsWith('https://wa.me/') ||
                      uri.toString().contains('whatsapp.com')) {
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                      return NavigationActionPolicy.CANCEL;
                    }
                  }

                  // Production security: restrict browsing outside of verified Schoolix domains, except social login domains
                  final host = uri.host;
                  final secureHosts = [
                    _mainHost,
                    "www.$_mainHost",
                    "accounts.google.com",
                    "github.com",
                    "firebaseapp.com"
                  ];

                  bool isTrustworthy = false;
                  for (var secureHost in secureHosts) {
                    if (host.contains(secureHost)) {
                      isTrustworthy = true;
                      break;
                    }
                  }

                  if (!isTrustworthy) {
                    // Open in external browser for safety
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    }
                    return NavigationActionPolicy.CANCEL;
                  }

                  return NavigationActionPolicy.ALLOW;
                },
              ),
              if (_isLoading)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  child: LinearProgressIndicator(
                    value: _progress,
                    backgroundColor: Colors.transparent,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
                  ),
                ),
              if (_isLoading && _progress < 0.3)
                const LoadingWidget(),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material';
import 'package:flutter_spinkit/flutter_spinkit.dart';

class LoadingWidget extends StatelessWidget {
  const LoadingWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SpinKitThreeBounce(
              color: Color(0xFF2563EB), // Sleek loader matching brand blue
              size: 45.0,
            ),
            const SizedBox(height: 20),
            Text(
              "جاري تحميل منصة Schoolix...",
              style: TextStyle(
                fontSize: 14,
                color: Colors.slate[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

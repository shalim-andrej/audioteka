#!/usr/bin/env bash
set -e

echo "=== Building Android APK for Аудиотека PRO ==="
APK_DIR="/tmp/apk_build"
mkdir -p "$APK_DIR/src/ru/audioteka/pro"
mkdir -p "$APK_DIR/res/drawable"
mkdir -p "$APK_DIR/res/values"
mkdir -p "$APK_DIR/bin"
mkdir -p "$APK_DIR/gen"

cp public/icon-192.png "$APK_DIR/res/drawable/ic_launcher.png"

cd "$APK_DIR"
aapt package -f -m -J gen -M AndroidManifest.xml -S res -I /tmp/android.jar
javac -d bin -cp /tmp/android.jar:gen -source 1.8 -target 1.8 src/ru/audioteka/pro/MainActivity.java gen/ru/audioteka/pro/R.java
java -cp /tmp/r8.jar com.android.tools.r8.D8 --release --lib /tmp/android.jar --output bin $(find bin -name "*.class")
aapt package -f -M AndroidManifest.xml -S res -I /tmp/android.jar -F bin/unsigned.apk
cd bin && aapt add unsigned.apk classes.dex && cd ..
zipalign -f -v 4 bin/unsigned.apk bin/aligned.apk
apksigner sign --ks /tmp/audioteka.keystore --ks-key-alias audioteka --ks-pass pass:audioteka2026 --key-pass pass:audioteka2026 --out /home/user/next-audiobooks/public/audioteka-pro.apk bin/aligned.apk

echo "=== APK successfully generated at public/audioteka-pro.apk ==="

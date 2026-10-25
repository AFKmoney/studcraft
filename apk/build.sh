#!/bin/bash
# Studcraft APK builder — manual, no Gradle. Mirrors the proven LazySiren pipeline.
set -e
export JAVA_HOME=~/jdk17
export PATH=$JAVA_HOME/bin:$PATH
SDK=~/android-sdk
BT=$SDK/build-tools/android-14
PLATFORM=$SDK/platforms/android-34/android-34-ext12/android.jar
ROOT=~/workspace/studcraft-work/apk
OUT=$ROOT/build
KS=~/workspace/studcraft-work/studcraft.keystore
KSPASS=studcraft2026

echo "=== Studcraft APK Builder ==="
rm -rf $OUT && mkdir -p $OUT/classes $OUT/dex

echo "[1/6] javac..."
javac -encoding UTF-8 -source 8 -target 8 -cp $PLATFORM -d $OUT/classes $ROOT/src/main/java/com/studcraft/game/*.java

echo "[2/6] d8..."
(cd $OUT/classes && $JAVA_HOME/bin/jar cf $OUT/classes.jar $(find . -name "*.class"))
$BT/d8 --lib $PLATFORM --min-api 26 --output $OUT/dex $OUT/classes.jar

echo "[3/6] aapt2..."
$BT/aapt2 compile --dir $ROOT/src/main/res -o $OUT/res.zip
$BT/aapt2 link -o $OUT/base.apk --manifest $ROOT/src/main/AndroidManifest.xml -A $ROOT/src/main/assets -I $PLATFORM $OUT/res.zip --min-sdk-version 26 --target-sdk-version 34

echo "[4/6] package + align..."
cp $OUT/base.apk $OUT/unsigned.apk
(cd $OUT/dex && $JAVA_HOME/bin/jar uf $OUT/unsigned.apk classes.dex)
$BT/zipalign -f 4 $OUT/unsigned.apk $OUT/aligned.apk

echo "[5/6] sign..."
if [ ! -f $KS ]; then
  keytool -genkeypair -keystore $KS -alias studcraft -keyalg RSA -keysize 2048 -validity 10000 -storepass $KSPASS -keypass $KSPASS -dname "CN=Studcraft, O=Palier Labs, C=CA" 2>/dev/null
fi
$BT/apksigner sign --ks $KS --ks-pass pass:$KSPASS --out $OUT/Studcraft.apk $OUT/aligned.apk

echo "[6/6] verify..."
$BT/apksigner verify --print-certs $OUT/Studcraft.apk | head -3
ls -lh $OUT/Studcraft.apk
echo "=== DONE ==="

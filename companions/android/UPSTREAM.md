# Android companion

Based on Monika-Dream/live-dashboard, android-source branch, commit 3dc50fc002d472719897763a4c634a44e99d61ae. Original MIT license is included.

This fork adds Settings → Website nickname. The owner uses the configured server URL and device token to read or save the site's name. Changes are explicit; heartbeats never overwrite it. The server must include the site-nickname API and site_preferences migration.

The application ID is org.ofton.watching, so it can be installed alongside the upstream app without replacing it. No endpoint, token, nickname or device is preset. Configure one collector at a time for a given device.

Build with JDK 17 or newer, Android SDK 36 and the Gradle wrapper: ./gradlew assembleDebug. Release signing belongs to each distributor; do not commit signing files.

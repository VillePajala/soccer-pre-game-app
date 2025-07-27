# Google Play Store Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying MatchDay Coach to the Google Play Store using Trusted Web Activity (TWA) to wrap the PWA as a native Android app.

**Deployment Method**: TWA (Trusted Web Activity)
**Target API Level**: 33+ (Android 13+)
**Package Name**: com.matchdaycoach.app

---

## 1. Prerequisites

### 1.1 Accounts & Access
- [ ] Google Play Developer account ($25 one-time fee)
- [ ] Google Cloud Console account
- [ ] Domain verified in Google Search Console
- [ ] Signing certificate for app

### 1.2 Technical Requirements
- [ ] Android Studio installed
- [ ] Java Development Kit (JDK) 11+
- [ ] Node.js and npm
- [ ] Git

### 1.3 App Requirements
- [ ] PWA score 100 in Lighthouse
- [ ] HTTPS enabled with valid certificate
- [ ] Service worker implemented
- [ ] Web app manifest configured
- [ ] Offline functionality working

---

## 2. TWA Setup

### 2.1 Initialize Android Project

```bash
# Create new Android project
npx @bubblewrap/cli init --manifest https://matchdaycoach.com/manifest.json

# Answer prompts:
# Package name: com.matchdaycoach.app
# Name: MatchDay Coach
# Short name: MatchDay
# Theme color: #1e40af
# Background color: #0f172a
```

### 2.2 Project Configuration

```gradle
// app/build.gradle
android {
    compileSdkVersion 34
    buildToolsVersion "34.0.0"
    
    defaultConfig {
        applicationId "com.matchdaycoach.app"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        
        manifestPlaceholders = [
            hostName: "matchdaycoach.com",
            defaultUrl: "https://matchdaycoach.com",
            launcherName: "MatchDay Coach",
            assetStatements: '[{ "relation": ["delegate_permission/common.handle_all_urls"], "target": {"namespace": "web", "site": "https://matchdaycoach.com"}}]'
        ]
        
        resValue "color", "colorPrimary", "#1e40af"
        resValue "color", "colorPrimaryDark", "#1e3a8a"
        resValue "color", "colorAccent", "#fbbf24"
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    bundle {
        language {
            enableSplit = true
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }
}

dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
    implementation 'com.google.android.play:app-update:2.1.0'
}
```

### 2.3 Digital Asset Links

Create `.well-known/assetlinks.json` on your web server:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.matchdaycoach.app",
    "sha256_cert_fingerprints": [
      "YOUR_APP_SIGNING_CERTIFICATE_SHA256_FINGERPRINT"
    ]
  }
}]
```

### 2.4 MainActivity Configuration

```java
// MainActivity.java
package com.matchdaycoach.app;

import android.net.Uri;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class MainActivity extends LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        Uri uri = super.getLaunchingUrl();
        if (uri != null) {
            return uri;
        }
        return Uri.parse("https://matchdaycoach.com");
    }
}
```

---

## 3. Native Features Integration

### 3.1 Push Notifications

```java
// PushNotificationService.java
public class PushNotificationService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // Handle FCM messages
        if (remoteMessage.getNotification() != null) {
            sendNotification(
                remoteMessage.getNotification().getTitle(),
                remoteMessage.getNotification().getBody()
            );
        }
    }
    
    @Override
    public void onNewToken(String token) {
        // Send token to your server
        sendTokenToServer(token);
    }
}
```

### 3.2 App Update Prompts

```java
// UpdateManager.java
public class UpdateManager {
    private AppUpdateManager appUpdateManager;
    private static final int UPDATE_REQUEST_CODE = 123;
    
    public void checkForUpdates(Activity activity) {
        appUpdateManager = AppUpdateManagerFactory.create(activity);
        
        Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();
        
        appUpdateInfoTask.addOnSuccessListener(appUpdateInfo -> {
            if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                
                try {
                    appUpdateManager.startUpdateFlowForResult(
                        appUpdateInfo,
                        AppUpdateType.FLEXIBLE,
                        activity,
                        UPDATE_REQUEST_CODE
                    );
                } catch (IntentSender.SendIntentException e) {
                    e.printStackTrace();
                }
            }
        });
    }
}
```

### 3.3 Native Share

```javascript
// Web side implementation
if (navigator.share) {
  navigator.share({
    title: 'MatchDay Coach',
    text: 'Check out my team statistics!',
    url: window.location.href,
    files: [statsFile] // if sharing exported files
  });
}
```

---

## 4. App Bundle Creation

### 4.1 Generate Signed Bundle

```bash
# Generate keystore (first time only)
keytool -genkey -v -keystore matchday-coach.keystore -alias matchday -keyalg RSA -keysize 2048 -validity 10000

# Build release bundle
cd android
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

### 4.2 Test Bundle Locally

```bash
# Install bundletool
wget https://github.com/google/bundletool/releases/download/1.15.0/bundletool-all-1.15.0.jar

# Generate APKs from bundle
java -jar bundletool.jar build-apks \
  --bundle=app-release.aab \
  --output=app-release.apks \
  --ks=matchday-coach.keystore \
  --ks-pass=pass:your-keystore-password \
  --ks-key-alias=matchday \
  --key-pass=pass:your-key-password

# Install on connected device
java -jar bundletool.jar install-apks --apks=app-release.apks
```

---

## 5. Store Listing Preparation

### 5.1 App Information

**Title**: MatchDay Coach - Soccer Team Manager

**Short Description** (80 chars):
"Manage rosters, track games & stats for youth soccer coaches"

**Full Description** (4000 chars):
```
MatchDay Coach is the ultimate sideline companion for soccer coaches. Designed specifically for youth and amateur teams, it helps you manage every aspect of game day - from pre-match planning to post-game analysis.

🏆 KEY FEATURES

⚽ Tactics & Gameplay
• Interactive soccer field with drag-and-drop player positioning
• Dedicated tactics board for designing plays
• Live game timer with substitution alerts
• Real-time score tracking
• Draw directly on the field to visualize strategies

📊 Statistics & Analysis
• Track goals, assists, and player performance
• Season and tournament statistics
• Individual player performance trends
• Export data to CSV or PDF
• Advanced analytics for Pro users

👥 Team Management
• Manage unlimited rosters (Pro)
• Track player availability
• Season and tournament organization
• Quick player substitutions
• Team performance insights

📱 Works Everywhere
• Progressive Web App - works offline
• Syncs across all your devices
• No internet required during games
• Automatic backups
• Install on phone, tablet, or laptop

🎯 Perfect For
• Youth soccer coaches
• Amateur team managers
• Academy coaches
• Parent volunteers
• Soccer enthusiasts

💎 Pro Features
• Unlimited players and teams
• Advanced statistics
• Tactical animations
• Priority support
• API access
• Multi-coach collaboration

🌍 Languages
• English
• Finnish
• Spanish (coming soon)
• German (coming soon)

Join thousands of coaches who've transformed their game day experience with MatchDay Coach. Whether you're coaching U6 beginners or competitive youth teams, we've got the tools you need to succeed.

Download now and get a 7-day free trial of Pro features!

Questions? Contact us at support@matchdaycoach.com
```

### 5.2 Categorization

- **Category**: Sports
- **Content Rating**: Everyone
- **Target Audience**: Coaches and team managers
- **Tags**: soccer, football, coaching, team management, sports analytics

### 5.3 Visual Assets

#### App Icon Requirements
- **Size**: 512x512px
- **Format**: PNG (32-bit)
- **Shape**: Square (Google Play adds rounding)

```xml
<!-- Adaptive icon configuration -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

#### Screenshots Requirements
- **Minimum**: 2 per device type
- **Recommended**: 8 screenshots
- **Sizes**:
  - Phone: 1080x1920 (9:16)
  - 7" tablet: 1200x1920
  - 10" tablet: 1600x2560

Screenshot suggestions:
1. Main field view with players
2. Live game timer
3. Statistics dashboard
4. Tactics board
5. Player roster
6. Season overview
7. Game history
8. Settings/customization

#### Feature Graphic
- **Size**: 1024x500px
- **Format**: PNG or JPEG
- **Usage**: Displayed at top of store listing

#### Promotional Video (Optional)
- **Duration**: 30s - 2min
- **Format**: YouTube link
- **Content**: App walkthrough showing key features

---

## 6. Play Console Configuration

### 6.1 Create Application

1. Log into [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in app details:
   - App name: MatchDay Coach
   - Default language: English (US)
   - App type: App
   - Category: Sports
   - Free/Paid: Free (with in-app purchases)

### 6.2 Store Listing Setup

Navigate to "Main store listing" and fill in:
- [ ] App name
- [ ] Short description
- [ ] Full description
- [ ] App icon
- [ ] Feature graphic
- [ ] Screenshots (phone & tablet)
- [ ] Video URL (optional)
- [ ] Category selection
- [ ] Contact details
- [ ] Privacy policy URL
- [ ] Terms of service URL

### 6.3 App Content

Complete all sections:
- [ ] Privacy policy
- [ ] App access (any restrictions?)
- [ ] Ads declaration (no ads)
- [ ] Content rating questionnaire
- [ ] Target audience and content
- [ ] News apps declaration (N/A)
- [ ] COVID-19 contact tracing (N/A)
- [ ] Data safety form

### 6.4 Data Safety Declaration

```yaml
Data Collected:
  Personal Info:
    - Name: Optional, User-provided
    - Email: Required for account
  
  App Activity:
    - In-app actions: Yes, for analytics
    - Search history: No
    - Other actions: Game statistics
  
  Device/Other IDs:
    - Device IDs: No
    
Data Sharing: 
  - Not shared with third parties
  
Data Security:
  - Data encrypted in transit
  - Users can request data deletion
  
Data Usage:
  - App functionality
  - Analytics
  - Account management
```

---

## 7. Release Management

### 7.1 Testing Tracks

#### Internal Testing
- Limited to 100 testers
- Quick deployment (< 1 hour)
- Use for team testing

#### Closed Testing (Alpha)
- Invite-only testers
- Email or Google Groups
- Use for beta users

#### Open Testing (Beta)
- Public opt-in
- Limited slots available
- Generate feedback

### 7.2 Production Release

#### Staged Rollout
```
Week 1: 5% of users
Week 2: 25% of users
Week 3: 50% of users
Week 4: 100% of users
```

Monitor metrics:
- Crash rate
- ANR rate
- User ratings
- Uninstalls

### 7.3 Release Notes Template

```markdown
What's New in 1.0.1:

🎯 New Features
• Added Spanish language support
• New formation templates
• Enhanced statistics export

🐛 Bug Fixes
• Fixed timer pause issue on some devices
• Improved offline sync reliability
• Resolved crash when creating 50+ players

⚡ Performance
• 30% faster app startup
• Reduced battery usage during games
• Smaller app size

Thank you for your feedback! Keep it coming at support@matchdaycoach.com
```

---

## 8. Post-Launch Optimization

### 8.1 App Store Optimization (ASO)

#### Keyword Research
Primary keywords:
- soccer coach app
- football team manager
- youth soccer
- team lineup
- sports tactics

Long-tail keywords:
- youth soccer team management app
- soccer coaching tactics board
- football statistics tracker
- team roster manager

#### A/B Testing
Test elements:
- App icon variations
- Screenshot order
- Short description
- Feature graphic

### 8.2 Review Management

```javascript
// In-app review prompt
const requestReview = async () => {
  const { isAvailable } = await InAppReview.isAvailable();
  
  if (isAvailable) {
    const result = await InAppReview.RequestInAppReview();
    analytics.track('Review Requested', { result });
  }
};

// Trigger after positive events:
// - Successful game completion
// - 5th app session
// - Export success
```

### 8.3 Crash Monitoring

```gradle
// app/build.gradle
dependencies {
    implementation 'com.google.firebase:firebase-crashlytics:18.5.1'
}
```

```java
// Application.java
FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(true);
```

---

## 9. Monetization Setup

### 9.1 In-App Purchases Configuration

1. Navigate to "Monetize > Products > In-app products"
2. Create products:

```
Product ID: pro_monthly
Name: MatchDay Coach Pro (Monthly)
Price: $9.99

Product ID: pro_yearly  
Name: MatchDay Coach Pro (Yearly)
Price: $79.99
```

### 9.2 License Testing

Add test accounts:
1. Play Console > Settings > License testing
2. Add tester email addresses
3. Testers can make purchases without charges

---

## 10. Launch Checklist

### Pre-Launch
- [ ] App tested on multiple devices
- [ ] All content translated
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email configured
- [ ] Analytics implemented
- [ ] Crash reporting enabled

### Store Listing
- [ ] All text fields completed
- [ ] Screenshots uploaded
- [ ] Feature graphic created
- [ ] Content rating completed
- [ ] Data safety declared
- [ ] Target audience selected

### Technical
- [ ] Signed AAB generated
- [ ] ProGuard configured
- [ ] Version code incremented
- [ ] Digital Asset Links verified
- [ ] Offline functionality tested

### Release
- [ ] Internal testing completed
- [ ] Beta testing feedback incorporated
- [ ] Production APK tested
- [ ] Release notes written
- [ ] Staged rollout configured

### Post-Launch
- [ ] Monitor crash reports
- [ ] Respond to reviews
- [ ] Track installation metrics
- [ ] Monitor user feedback
- [ ] Plan next update

---

## 11. Troubleshooting

### Common Issues

**Issue**: TWA shows address bar
**Solution**: Verify Digital Asset Links are properly configured

**Issue**: App crashes on launch
**Solution**: Check ProGuard rules, ensure all classes are kept

**Issue**: Updates not appearing
**Solution**: Increment versionCode in build.gradle

**Issue**: In-app purchases failing
**Solution**: Verify products are active and app is signed with release key

---

## 12. Resources

### Official Documentation
- [TWA Quick Start](https://developers.google.com/web/android/trusted-web-activity)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android App Bundle](https://developer.android.com/guide/app-bundle)

### Tools
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
- [PWA Builder](https://www.pwabuilder.com/)
- [Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)

### Testing
- [Pre-launch Report](https://support.google.com/googleplay/android-developer/answer/7002270)
- [Firebase Test Lab](https://firebase.google.com/products/test-lab)

---

**Document Status**: Deployment Guide v1.0
**Last Updated**: 2025-07-27
**Next Update**: After first successful deployment
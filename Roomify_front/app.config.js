export default {
  expo: {
    name: "Roomify_front",
    slug: "Roomify_front",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "roomify",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.roomify.front"
    },
    android: {
      package: "com.roomify.front",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true
          }
        }
      ],
      // 👇 ADD THIS BLOCK 👇
      [
        "react-native-maps",
        {
          // A fake key to satisfy the build requirement.
          // It prevents the "your API key" crash.
          "apiKey": "AIzaSyFakeKeyForOSM_DoNotUse"
        }
      ],
      // 👆 END ADDITION 👆
      [
        "react-native-auth0",
        {
          domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN
        },
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
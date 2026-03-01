export default {
  expo: {
    name: "SinAdicciones",
    slug: "sinadicciones-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "sinadicciones",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "cl.sinadicciones.app",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "Tomar foto de perfil",
        NSPhotoLibraryUsageDescription: "Seleccionar foto de perfil"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#10B981"
      },
      edgeToEdgeEnabled: true,
      package: "cl.sinadicciones.app",
      versionCode: 16,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#10B981"
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Permite acceso a tus fotos para cambiar tu foto de perfil",
          cameraPermission: "Permite acceso a la cámara para tomar foto de perfil"
        }
      ],
      "expo-font",
      "expo-web-browser"
    ],
    experiments: {
      typedRoutes: false
    },
    extra: {
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://sinadicciones-app-production.up.railway.app",
      eas: {
        projectId: "302fcfa1-1223-4ccc-a546-2250183a5db6"
      }
    },
    owner: "sinadicciones.cl",
    privacy: "public",
    platforms: [
      "ios",
      "android",
      "web"
    ]
  }
};

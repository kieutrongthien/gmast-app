# GMAST APP

This is the official mobile application for GMAST, built using Ionic Vue and Capacitor. It provides a convenient interface for managing your SMS schedules on the go.

## Features

- View and manage pending SMS schedules
- Receive notifications for upcoming schedules
- Handle permissions for SIM, SMS, and notifications
- Responsive design for various screen sizes

## Prerequisites

- Node.js (v22 or later)
- npm (v9 or later)
- OpenJDK (v21 or later) for Android development
- Android SDK and emulator or physical device for testing

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kieutrongthien/gmast-app.git
   cd gmast-app
   ```
2. Install dependencies:
   ```bash
   npm install
    ```
3. Run the app in development mode:
    ```bash
    npm run dev
    ```
4. To build the app for production:
    ```bash
    npm run build
    ```
5. To run the app on an Android device or emulator:
    ```bash
    npx cap sync android
    cd android && ./gradlew :app:assembleDebug :app:installDebug
    ```

## Permissions

The app requires the following permissions to function correctly:
- **SIM Permission**: To access SIM information for scheduling SMS.
- **SMS Permission**: To send scheduled SMS messages.
- **Notification Permission**: To send notifications about upcoming schedules.
Please grant these permissions when prompted to ensure the app works as intended.

## License

Private repository. All rights reserved by the author.
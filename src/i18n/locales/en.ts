const en = {
  nav: {
    queue: 'Queue',
    simSelection: 'SIM Selection',
    setting: 'Setting'
  },
  common: {
    retry: 'Retry',
    close: 'Close',
    refresh: 'Refresh',
    loading: 'Loading...'
  },
  home: {
    title: 'Queue',
    refresherPulling: 'Pull to refresh',
    refresherLoading: 'Loading...',
    heroEyebrow: 'GMast · Queue Ops',
    heroTitle: 'Operations Hub',
    heroPendingCount: '{count} pending messages',
    heroSubtitle:
      'Track KPIs, prioritize SIM usage, and react quickly to synchronization issues before they impact customers.',
    scanQueue: 'Scan Queue',
    totalItems: 'Total',
    pageInfo: 'Page {page}/{total}',
    loadingMore: 'Loading more messages...',
    mockData: 'Mock data',
    apiError: 'API error',
    panelEyebrow: 'Priority Queue',
    panelTitle: 'Message List',
    filterLabel: 'Filter by status',
    updated: 'Updated {value}',
    syncErrorChip: 'Sync errors ({count})',
    syncing: 'Syncing data...',
    noData: 'No data yet',
    justNow: 'Just now',
    minutesAgo: '{count} minutes ago',
    hoursAgo: '{count} hours ago',
    statuses: {
      all: 'All',
      pending: 'Pending',
      processing: 'Processing',
      failed: 'Failed'
    },
    kpi: {
      pending: {
        label: 'Pending',
        support: 'Monitor 15-minute SLA',
        trend: '{count} pending'
      },
      processing: {
        label: 'Processing',
        support: 'Validate before send cycle',
        trend: '{count} high priority'
      },
      failed: {
        label: 'Failed',
        support: 'Tap retry to synchronize',
        trend: '{count} waiting for retry'
      },
      sla: {
        label: 'SLA Risk',
        support: 'Messages older than 30 minutes',
        trend: 'Average retry {count}'
      }
    },
    resultSync: {
      oneFailed: '{message}',
      multipleFailed: '{count} results are pending sync. Retry now?'
    }
  },
  queue: {
    fallbackTitle: 'Untitled',
    emptyTitle: 'No pending messages',
    emptySubtitle: 'The pending queue is currently empty.',
    status: {
      pending: 'Pending',
      processing: 'Processing',
      failed: 'Failed',
      sent: 'Sent',
      unknown: 'Unknown'
    }
  },
  sim: {
    selector: {
      title: 'Select SIM for sending',
      summaryRandom: 'The app will rotate available SIM cards automatically.',
      summaryManual: 'Prioritize {label}',
      modeManual: 'Manual',
      modeRandom: 'Random',
      scanAgain: 'Scan Again',
      details: 'Details',
      loading: 'Reading available SIM cards...',
      permissionHint: 'Grant SIM read permission for manual selection. Tap "Scan Again" to retry.',
      unsupported: 'This device does not support SIM information reading.',
      noSim: 'No SIM detected. Check physical SIM or eSIM status.',
      unknownCarrier: 'Unknown carrier',
      fetchedAt: 'Updated at {time}',
      state: {
        ready: 'ready',
        empty: 'empty',
        unknown: 'unknown'
      },
      fallbackFetchedAt: 'unknown'
    },
    sheet: {
      title: 'Available SIMs',
      status: 'Status',
      permission: 'Permission',
      platform: 'Platform',
      plugin: 'Plugin',
      scanAgain: 'Scan Again',
      loading: 'Reading SIM list...',
      permissionHint: 'SIM read permission is missing. Tap "Scan Again" to request it.',
      unsupported: 'This device does not support SIM/eSIM reading.',
      noSim: 'No available SIM found.',
      unknownCarrier: 'Unknown carrier',
      slotMeta: 'Slot #{slot} · MCC {mcc} / MNC {mnc}',
      fetchedAt: 'Updated at {time}',
      statusLabel: {
        ready: 'Active',
        denied: 'Permission denied',
        unsupported: 'Unsupported'
      },
      permissionLabel: {
        granted: 'Granted',
        denied: 'Denied',
        rationale: 'Needs rationale',
        prompt: 'Not requested'
      },
      platformLabel: {
        android: 'Android',
        ios: 'iOS',
        web: 'Web preview',
        unknown: 'Unknown'
      },
      reasonIosRestrictions: 'iOS may limit detailed carrier information.',
      slotState: {
        ready: 'Ready',
        empty: 'Empty',
        unknown: 'Unknown'
      },
      noPhone: 'No phone number'
    }
  },
  versionGate: {
    title: 'App Update Required',
    description:
      'Your current app version has expired and sending is blocked. Update to continue using the app.',
    currentBuild: 'Current build',
    minimumRequired: 'Minimum required',
    message: 'Message',
    unknown: 'unknown',
    download: 'Download Latest Version',
    retry: 'Retry Check'
  },
  setting: {
    title: 'Setting',
    heading: 'Settings',
    description: 'Configure application behavior and preferences.',
    languageSection: 'Language',
    languageLabel: 'App language',
    languageEnglish: 'English',
    languageKorean: 'Korean',
    accountSection: 'Account',
    currentUser: 'Current user',
    username: 'Username',
    email: 'Email',
    role: 'Role',
    smsWakeWorkerLabel: 'Allow FCM wake processing',
    smsWakeWorkerHint: 'When off, incoming FCM wake events will not start SmsWakeWorker.',
    unknownUser: 'Unknown',
    logout: 'Log out'
  },
  auth: {
    loginTitle: 'Login',
    loginHeading: 'Sign in',
    loginDescription: 'Login is required before using the app features.',
    username: 'Username',
    password: 'Password',
    usernamePlaceholder: 'Enter username',
    passwordPlaceholder: 'Enter password',
    loginButton: 'Login',
    missingCredentials: 'Please enter username and password.',
    loginFailed: 'Unable to login. Please check your credentials.'
  },
  startupPermission: {
    title: 'Permission Required',
    message:
      'This app requires SIM, SMS, and notification permissions to operate correctly.',
    guide:
      'Tap "Open Settings" to grant permissions, then tap "Check Again". You cannot continue until all required permissions are granted.',
    openSettings: 'Open Settings',
    checkAgain: 'Check Again',
    exit: 'Exit App'
  },
  notifications: {
    foreground: {
      channelName: 'Background Message Sending',
      channelDescription: 'Keep GMAST sending active when the app is in the background',
      title: 'GMAST is sending messages',
      body: 'Message sending continues even while your screen is locked.'
    },
    backgroundSend: {
      waitingQueue: 'Waiting for queue...',
      progressBody: 'Processed {attempted}/{total} · {sent} sent · {skipped} skipped · {percent}%',
      preparingTitle: 'Preparing background send',
      preparingBody: 'Preparing {total} messages...',
      preparingEmptyBody: 'No messages in queue.',
      runningTitle: 'Background send running',
      stoppingTitle: 'Stopping background send',
      completedTitle: 'Background send completed',
      stoppedTitle: 'Background send stopped',
      completedBody: 'Processed {attempted}/{total} messages · {sent} sent, {skipped} skipped.',
      emptyResultBody: 'No messages to process.',
      errorTitle: 'Background send failed',
      unknownError: 'Unknown error.'
    }
  },
  errors: {
    resultSyncFailed: 'Unable to sync the delivery result.',
    resultStatusSyncFailed: 'Unable to synchronize delivery status.'
  }
} as const;

export default en;

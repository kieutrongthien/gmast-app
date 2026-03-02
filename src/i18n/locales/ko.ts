const ko = {
  nav: {
    queue: '큐',
    simSelection: 'SIM 선택',
    setting: '설정'
  },
  common: {
    retry: '다시 시도',
    close: '닫기',
    refresh: '새로고침',
    loading: '불러오는 중...'
  },
  home: {
    title: '큐',
    refresherPulling: '당겨서 새로고침',
    refresherLoading: '불러오는 중...',
    heroEyebrow: 'GMast · Queue Ops',
    heroTitle: '운영 허브',
    heroPendingCount: '대기 메시지 {count}건',
    heroSubtitle:
      'KPI를 추적하고 SIM 우선순위를 조정하며 동기화 오류를 빠르게 대응해 고객 영향 전에 문제를 해결하세요.',
    scanQueue: '큐 스캔',
    mockData: '모의 데이터',
    apiError: 'API 오류',
    panelEyebrow: '우선순위 큐',
    panelTitle: '메시지 목록',
    filterLabel: '상태 필터',
    updated: '업데이트 {value}',
    syncErrorChip: '동기화 오류 ({count})',
    syncing: '데이터 동기화 중...',
    noData: '데이터 없음',
    justNow: '방금 전',
    minutesAgo: '{count}분 전',
    hoursAgo: '{count}시간 전',
    statuses: {
      all: '전체',
      pending: '대기',
      processing: '처리 중',
      failed: '실패'
    },
    kpi: {
      pending: {
        label: '대기',
        support: '15분 SLA 모니터링',
        trend: '대기 {count}건'
      },
      processing: {
        label: '처리 중',
        support: '발송 전 검증',
        trend: '높은 우선순위 {count}건'
      },
      failed: {
        label: '해결 필요',
        support: '재시도로 동기화',
        trend: '재시도 대기 {count}건'
      },
      sla: {
        label: 'SLA 위험',
        support: '30분 초과 메시지',
        trend: '평균 재시도 {count}'
      }
    },
    resultSync: {
      oneFailed: '{message}',
      multipleFailed: '동기화 대기 결과가 {count}건 있습니다. 다시 시도할까요?'
    }
  },
  queue: {
    fallbackTitle: '제목 없음',
    emptyTitle: '대기 메시지가 없습니다',
    emptySubtitle: '현재 대기열이 비어 있습니다.',
    status: {
      pending: '대기',
      processing: '처리 중',
      failed: '실패',
      sent: '전송됨',
      unknown: '알 수 없음'
    }
  },
  sim: {
    selector: {
      title: '발송용 SIM 선택',
      summaryRandom: '앱이 사용 가능한 SIM을 자동으로 순환합니다.',
      summaryManual: '{label} 우선 사용',
      modeManual: '수동',
      modeRandom: '자동',
      scanAgain: '다시 스캔',
      details: '상세',
      loading: '사용 가능한 SIM을 읽는 중...',
      permissionHint: '수동 선택을 위해 SIM 읽기 권한이 필요합니다. "다시 스캔"을 눌러 재시도하세요.',
      unsupported: '이 기기는 SIM 정보 읽기를 지원하지 않습니다.',
      noSim: 'SIM을 찾을 수 없습니다. 물리 SIM 또는 eSIM 상태를 확인하세요.',
      unknownCarrier: '통신사 정보 없음',
      fetchedAt: '{time}에 업데이트됨',
      state: {
        ready: '사용 가능',
        empty: '비어 있음',
        unknown: '알 수 없음'
      },
      fallbackFetchedAt: '알 수 없음'
    },
    sheet: {
      title: '사용 가능한 SIM',
      status: '상태',
      permission: '권한',
      platform: '플랫폼',
      plugin: '플러그인',
      scanAgain: '다시 스캔',
      loading: 'SIM 목록을 읽는 중...',
      permissionHint: 'SIM 읽기 권한이 없습니다. "다시 스캔"을 눌러 요청하세요.',
      unsupported: '이 기기는 SIM/eSIM 읽기를 지원하지 않습니다.',
      noSim: '사용 가능한 SIM이 없습니다.',
      unknownCarrier: '통신사 정보 없음',
      slotMeta: '슬롯 #{slot} · MCC {mcc} / MNC {mnc}',
      fetchedAt: '{time}에 업데이트됨',
      statusLabel: {
        ready: '활성',
        denied: '권한 거부됨',
        unsupported: '지원되지 않음'
      },
      permissionLabel: {
        granted: '허용됨',
        denied: '거부됨',
        rationale: '설명 필요',
        prompt: '요청 전'
      },
      platformLabel: {
        android: 'Android',
        ios: 'iOS',
        web: '웹 미리보기',
        unknown: '알 수 없음'
      },
      reasonIosRestrictions: 'iOS는 통신사 상세 정보 제공에 제한이 있을 수 있습니다.',
      slotState: {
        ready: '준비됨',
        empty: '비어 있음',
        unknown: '알 수 없음'
      },
      noPhone: '전화번호 없음'
    }
  },
  versionGate: {
    title: '앱 업데이트 필요',
    description:
      '현재 앱 버전이 만료되어 발송이 차단되었습니다. 계속 사용하려면 업데이트하세요.',
    currentBuild: '현재 빌드',
    minimumRequired: '최소 요구 빌드',
    message: '메시지',
    unknown: '알 수 없음',
    download: '최신 버전 다운로드',
    retry: '다시 확인'
  },
  setting: {
    title: '설정',
    heading: '설정',
    description: '앱 동작 및 기본 설정을 구성합니다.',
    languageSection: '언어',
    languageLabel: '앱 언어',
    languageEnglish: '영어',
    languageKorean: '한국어'
  },
  startupPermission: {
    title: '권한 필요',
    message: '앱을 정상적으로 사용하려면 SIM 및 알림 권한이 필요합니다. 권한 허용 후 앱을 다시 실행하세요.',
    exit: '앱 종료'
  },
  notifications: {
    foreground: {
      channelName: '백그라운드 메시지 전송',
      channelDescription: '앱이 백그라운드일 때도 GMAST 전송을 유지합니다.',
      title: 'GMAST가 메시지를 전송 중입니다',
      body: '화면이 잠겨 있어도 메시지 전송이 계속됩니다.'
    },
    backgroundSend: {
      waitingQueue: '큐 대기 중...',
      progressBody: '{attempted}/{total} 처리 · {sent} 전송 · {skipped} 건너뜀 · {percent}%',
      preparingTitle: '백그라운드 전송 준비 중',
      preparingBody: '{total}개 메시지 준비 중...',
      preparingEmptyBody: '큐에 메시지가 없습니다.',
      runningTitle: '백그라운드 전송 실행 중',
      stoppingTitle: '백그라운드 전송 중지 중',
      completedTitle: '백그라운드 전송 완료',
      stoppedTitle: '백그라운드 전송 중지됨',
      completedBody: '{attempted}/{total}개 처리 · 전송 {sent}, 건너뜀 {skipped}.',
      emptyResultBody: '처리할 메시지가 없습니다.',
      errorTitle: '백그라운드 전송 실패',
      unknownError: '알 수 없는 오류입니다.'
    }
  },
  errors: {
    resultSyncFailed: '전송 결과를 동기화할 수 없습니다.',
    resultStatusSyncFailed: '전송 상태를 동기화할 수 없습니다.'
  }
} as const;

export default ko;

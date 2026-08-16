# 입금 자동매칭 — 폰 자동화 설정

사장님 폰에 도착하는 은행 앱 입금 알림을 읽어서, 카페 관리 서비스 백엔드의 웹훅으로 자동 전달하는 스크립트입니다.
Termux 위에서 파이썬 표준 라이브러리만으로 동작해서 별도 pip 설치가 필요 없습니다.

⚠️ **이 폴더의 스크립트는 사장님 본인 안드로이드 폰에서 직접 설치/실행해야 합니다** — 제가 대신 설치해드릴 수 없는 부분이에요.

## 1. 앱 설치

- **Termux**: Play스토어 버전은 업데이트가 끊겨 있으니 [F-Droid](https://f-droid.org/packages/com.termux/)에서 설치
- **Termux:API**: 같은 F-Droid에서 설치 (Termux와 별개 앱, 반드시 같이 설치)
- **Termux:Boot** (선택, 폰 재부팅 시 자동 시작하려면): F-Droid에서 설치

## 2. Termux 안에서 초기 설정

Termux 앱을 열고:

```bash
pkg update && pkg install python termux-api -y
termux-setup-storage
```

## 3. 알림 접근 권한 허용

안드로이드 **설정 → 앱 → 특별한 접근 권한(또는 알림 접근) → Termux:API** 를 켜주세요.
이게 없으면 `termux-notification-list`가 빈 목록만 반환합니다.

## 4. 스크립트 가져오기 + 설정값 입력

이 폴더의 `deposit_watcher.py`를 폰으로 옮기세요 (예: 이 저장소를 `git clone`하거나, 카카오톡/이메일로 파일 전송 후 `~/storage/downloads/`에서 Termux 홈으로 복사).

```bash
cp ~/storage/downloads/deposit_watcher.py ~/
nano ~/deposit_watcher.py
```

파일 상단의 두 값을 **관리자 → 설정** 페이지에 표시된 값으로 바꿔주세요:

```python
WEBHOOK_URL = "https://cafe-management-backend-kf1r.onrender.com/api/webhook/deposit/<업장 URL>"
WEBHOOK_SECRET = "<웹훅 시크릿 키>"
```

## 5. 테스트 (실제로 웹훅을 보내지 않는 모드)

```bash
python ~/deposit_watcher.py --dry-run
```

이 상태에서 소액(예: 1,000원)을 본인 계좌로 이체해보고, 터미널에 알림이 잡히는지 확인하세요.

- `[dry-run] would send amount=1000 raw_text='...'` 가 뜨면 정상 — 금액 파싱이 잘 되고 있다는 뜻
- **아무것도 안 뜨면**: 은행 알림 텍스트에 "입금"이라는 단어가 없을 수 있어요. `deposit_watcher.py`의 `INCLUDE_KEYWORDS`를 실제 알림 문구에 맞게 수정하세요
- **알림은 잡히는데 금액이 안 잡히면**: `AMOUNT_PATTERN` 정규식을 은행 알림의 실제 금액 표기 형식에 맞게 조정하세요

## 6. 실제 실행

```bash
termux-wake-lock
python ~/deposit_watcher.py
```

`termux-wake-lock`은 안드로이드가 배터리 최적화로 Termux를 죽이지 못하게 막아줍니다. 터미널을 앱 스위처에서 스와이프로 완전히 종료하면 스크립트도 멈추니, 백그라운드에 남겨두세요 (홈 버튼으로 나가는 건 괜찮습니다).

## 7. 재부팅해도 자동으로 켜지게 (선택)

Termux:Boot 앱을 한 번 실행해서 권한을 허용한 뒤:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-deposit-watcher.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
python ~/deposit_watcher.py >> ~/deposit_watcher.log 2>&1
EOF
chmod +x ~/.termux/boot/start-deposit-watcher.sh
```

## 안전장치

- 이 스크립트가 죽거나 매칭에 실패해도, **관리자 페이지의 "입금확인" 버튼으로 언제든 수동 확정 가능**합니다 — 이 자동화는 편의 기능이지 필수 경로가 아닙니다.
- 은행 앱이 업데이트되어 알림 문구가 바뀌면 정규식을 다시 맞춰야 할 수 있어요. `--dry-run`으로 주기적으로 점검해보세요.

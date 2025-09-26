# Gabin의 단일 문제 변형 생성기

텍스트나 이미지로 입력한 단일 수학 문제의 숫자를 변형한 새로운 문제를 생성하는 웹 애플리케이션입니다.

## ✨ 주요 기능

- 📝 **텍스트 입력**: 수학 문제를 직접 텍스트로 입력
- 📷 **이미지 OCR**: 문제 이미지에서 텍스트 자동 추출 (Tesseract.js)
- 🤖 **AI 숫자 변형**: Gemini AI를 사용한 스마트한 숫자 변형 (1-3개)
- 📐 **수학 렌더링**: MathJax를 사용한 수학 수식 표시
- 📊 **미리보기**: 원본과 변형 문제 비교 표시
- 📄 **TXT 다운로드**: 생성된 문제를 텍스트 파일로 다운로드

## 🚀 배포 방법

### 1. Vercel 배포 (추천)

1. 이 저장소를 GitHub에 업로드
2. [vercel.com](https://vercel.com)에서 GitHub 계정으로 로그인
3. "New Project" → 저장소 선택 → 배포

### 2. 환경 변수 설정

배포 플랫폼에서 다음 환경변수를 설정하세요:

```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

Gemini API 키는 [Google AI Studio](https://aistudio.google.com/)에서 발급받으세요.

## 🛠 로컬 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# http://localhost:3001 에서 확인
```

## 📋 환경 설정

1. `.env.local` 파일 생성:
```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

2. 자세한 설정 방법은 `GEMINI_SETUP.md` 참고

## 🔧 기술 스택

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **OCR**: Tesseract.js
- **AI**: Google Gemini API
- **Math Rendering**: MathJax 3

## 📄 라이선스

MIT License
<!-- Force redeploy -->

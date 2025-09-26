# Gemini AI 설정 가이드

## 1. Google AI Studio에서 API 키 발급

1. [Google AI Studio](https://aistudio.google.com/) 접속
2. 로그인 후 "Get API Key" 클릭
3. "Create API Key" 버튼 클릭
4. API 키 복사

## 2. 환경 변수 설정

`.env.local` 파일에서 다음과 같이 설정:

```
NEXT_PUBLIC_GEMINI_API_KEY=여기에_복사한_API_키_입력
```

## 3. 기능

- **스마트 숫자 변형**: Gemini AI가 문제의 맥락을 이해하고 적절한 숫자로 변형
- **변형 개수 제한**: 최소 1개, 최대 3개까지만 숫자 변형
- **폴백 시스템**: API 오류 시 기존 방식으로 자동 전환

## 4. 주의사항

- API 키는 절대 공개하지 마세요
- 사용량에 따라 과금될 수 있습니다
- `.env.local` 파일은 git에 커밋하지 마세요
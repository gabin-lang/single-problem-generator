import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface NumberVariation {
  originalNumbers: string[];
  modifiedNumbers: string[];
  positions: number[];
  modifiedText: string;
}

export async function generateNumberVariation(problemText: string, solutionText?: string): Promise<NumberVariation> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
다음 수학 문제에서 숫자를 1-3개만 선택해서 합리적으로 변형해주세요. 변형된 숫자는 원래 문제의 난이도와 패턴을 유지해야 합니다.

규칙:
1. 숫자 변형은 최소 1개, 최대 3개까지만
2. 변형된 숫자는 5자리를 넘지 않음
3. 단서 조항 "(단, ...)" 부분의 숫자는 변형하지 않음
4. 문제의 교육적 목적과 난이도를 유지
5. 0이 되지 않도록 주의

문제: ${problemText}
${solutionText ? `해설: ${solutionText}` : ''}

응답은 반드시 다음 JSON 형식으로만 답변해주세요:
{
  "originalNumbers": ["원본숫자1", "원본숫자2", ...],
  "modifiedNumbers": ["변형숫자1", "변형숫자2", ...],
  "positions": [위치1, 위치2, ...],
  "modifiedText": "숫자가 변형된 완전한 문제 텍스트"
}

예시:
입력: "철수는 사과 5개와 배 3개를 가지고 있다. 총 몇 개인가?"
출력:
{
  "originalNumbers": ["5", "3"],
  "modifiedNumbers": ["7", "4"],
  "positions": [4, 8],
  "modifiedText": "철수는 사과 7개와 배 4개를 가지고 있다. 총 몇 개인가?"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON 응답 파싱
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON 응답을 찾을 수 없습니다');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 응답 검증
      if (!parsed.originalNumbers || !parsed.modifiedNumbers || !parsed.modifiedText) {
        throw new Error('응답 형식이 올바르지 않습니다');
      }

      // 변형 개수 제한 (1-3개)
      const maxChanges = Math.min(3, parsed.originalNumbers.length);
      if (parsed.originalNumbers.length > maxChanges) {
        parsed.originalNumbers = parsed.originalNumbers.slice(0, maxChanges);
        parsed.modifiedNumbers = parsed.modifiedNumbers.slice(0, maxChanges);
        if (parsed.positions) {
          parsed.positions = parsed.positions.slice(0, maxChanges);
        }
      }

      return {
        originalNumbers: parsed.originalNumbers,
        modifiedNumbers: parsed.modifiedNumbers,
        positions: parsed.positions || [],
        modifiedText: parsed.modifiedText
      };

    } catch (parseError) {
      console.warn('Gemini 응답 파싱 실패, 폴백 사용:', parseError);
      throw new Error('AI 응답 파싱 실패');
    }

  } catch (error) {
    console.error('Gemini API 오류:', error);
    throw error;
  }
}

// 폴백 함수 (Gemini 실패시 사용)
export function fallbackNumberVariation(text: string): NumberVariation {
  const numbers = text.match(/\d+(?:\.\d+)?/g) || [];

  if (numbers.length === 0) {
    return {
      originalNumbers: [],
      modifiedNumbers: [],
      positions: [],
      modifiedText: text
    };
  }

  // 1-3개만 선택
  const numToChange = Math.min(3, Math.max(1, numbers.length));
  const selectedIndices = [];
  const selectedNumbers = [];

  for (let i = 0; i < numToChange; i++) {
    selectedIndices.push(i);
    selectedNumbers.push(numbers[i]);
  }

  const modifiedNumbers = selectedNumbers.map(num => {
    const n = parseFloat(num);
    const multiplier = 0.7 + Math.random() * 0.6; // 0.7 ~ 1.3
    let modified = n * multiplier;

    if (Number.isInteger(n)) {
      modified = Math.max(1, Math.round(modified));
      modified = Math.min(99999, modified);
    } else {
      modified = Math.max(0.1, Math.round(modified * 10) / 10);
      modified = Math.min(9999.9, modified);
    }

    return modified.toString();
  });

  let modifiedText = text;
  selectedNumbers.forEach((original, index) => {
    modifiedText = modifiedText.replace(original, modifiedNumbers[index]);
  });

  return {
    originalNumbers: selectedNumbers,
    modifiedNumbers: modifiedNumbers,
    positions: selectedIndices,
    modifiedText: modifiedText
  };
}
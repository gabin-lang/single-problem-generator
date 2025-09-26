'use client';

import { useState } from 'react';
import { SingleProblem } from '@/app/page';
import Image from 'next/image';
import MathRenderer from './MathRenderer';
import { generateNumberVariation, fallbackNumberVariation } from '@/lib/gemini';

interface ProblemGeneratorProps {
  problem: SingleProblem;
  setIsLoading: (loading: boolean) => void;
}

interface GeneratedProblem {
  sequence: string;
  problemText?: string;
  problemImage?: string | null;
  solutionText?: string;
  solutionImage?: string | null;
  isGenerated: boolean;
}

export default function ProblemGenerator({ problem, setIsLoading }: ProblemGeneratorProps) {
  const [numVariations, setNumVariations] = useState(5);
  const [generatedProblems, setGeneratedProblems] = useState<GeneratedProblem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Gemini AI를 사용한 스마트 숫자 변형 함수
  const transformNumbers = async (problemText: string, solutionText?: string): Promise<string> => {
    try {
      console.log('Gemini AI로 숫자 변형 시도...');
      const result = await generateNumberVariation(problemText, solutionText);
      console.log('Gemini 변형 성공:', result);
      return result.modifiedText;
    } catch (error) {
      console.warn('Gemini API 실패, 폴백 사용:', error);

      // 폴백: 기존 로직 사용하되 1-3개만 변형
      const fallbackResult = fallbackNumberVariation(problemText);
      return fallbackResult.modifiedText;
    }
  };

  const generateVariations = async () => {
    setIsGenerating(true);
    setIsLoading(true);

    try {
      const generated: GeneratedProblem[] = [];

      // 원본 문제 추가
      generated.push({
        sequence: '원본',
        problemText: problem.problemText,
        problemImage: problem.problemImage,
        solutionText: problem.solutionText,
        solutionImage: problem.solutionImage,
        isGenerated: false
      });

      // 변형 문제들 생성
      for (let i = 1; i <= numVariations; i++) {
        let transformedProblemText = '';
        let transformedSolutionText = '';

        if (problem.problemText) {
          transformedProblemText = await transformNumbers(problem.problemText, problem.solutionText);
        }
        if (problem.solutionText) {
          transformedSolutionText = await transformNumbers(problem.solutionText, problem.problemText);
        }

        generated.push({
          sequence: `변형-${i}`,
          problemText: problem.problemText ? transformedProblemText : undefined,
          problemImage: problem.problemImage || undefined,
          solutionText: problem.solutionText ? transformedSolutionText : undefined,
          solutionImage: problem.solutionImage || undefined,
          isGenerated: true
        });
      }

      setGeneratedProblems(generated);
    } catch (error) {
      console.error('문제 생성 중 오류:', error);
      alert('문제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const downloadTXT = () => {
    if (generatedProblems.length === 0) {
      alert('생성된 문제가 없습니다.');
      return;
    }

    // 원본 문제는 제외하고 변형된 문제만 다운로드
    const generatedOnly = generatedProblems.filter(prob => prob.isGenerated);

    let txtContent = '';
    txtContent += `Gabin의 단일 문제 변형 생성기 결과\n`;
    txtContent += `생성 일시: ${new Date().toLocaleString('ko-KR')}\n`;
    txtContent += `총 변형 문제 수: ${generatedOnly.length}개\n`;
    txtContent += `${'='.repeat(50)}\n\n`;

    generatedOnly.forEach((prob, index) => {
      txtContent += `[${prob.sequence}]\n`;
      txtContent += `\n【문제】\n`;
      txtContent += `${prob.problemText || '[원본 이미지 사용]'}\n\n`;
      txtContent += `【해설】\n`;
      txtContent += `${prob.solutionText || '[원본 이미지 사용]'}\n`;

      if (index < generatedOnly.length - 1) {
        txtContent += `\n${'-'.repeat(30)}\n\n`;
      }
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `generated_problems_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 원본 문제 미리보기 */}
      <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-800 mb-3">입력된 문제</h3>

        <div className="space-y-3">
          <div>
            <strong className="text-sm text-gray-700">문제:</strong>
            {problem.problemText ? (
              <div className="mt-1 p-2 bg-white rounded border text-sm">
                <MathRenderer
                  content={problem.problemText.length > 150
                    ? problem.problemText.substring(0, 150) + '...'
                    : problem.problemText
                  }
                />
              </div>
            ) : problem.problemImage ? (
              <div className="mt-1">
                <Image
                  src={problem.problemImage}
                  alt="문제 이미지"
                  width={300}
                  height={150}
                  className="rounded border object-contain max-h-32"
                />
              </div>
            ) : (
              <p className="text-gray-500 text-sm">없음</p>
            )}
          </div>

          <div>
            <strong className="text-sm text-gray-700">해설:</strong>
            {problem.solutionText ? (
              <div className="mt-1 p-2 bg-white rounded border text-sm">
                <MathRenderer
                  content={problem.solutionText.length > 150
                    ? problem.solutionText.substring(0, 150) + '...'
                    : problem.solutionText
                  }
                />
              </div>
            ) : problem.solutionImage ? (
              <div className="mt-1">
                <Image
                  src={problem.solutionImage}
                  alt="해설 이미지"
                  width={300}
                  height={150}
                  className="rounded border object-contain max-h-32"
                />
              </div>
            ) : (
              <p className="text-gray-500 text-sm">없음</p>
            )}
          </div>
        </div>
      </div>

      {/* 변형 개수 설정 */}
      <div>
        <label className="block text-lg font-medium text-gray-800 mb-2">
          생성할 변형 개수
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="1"
            max="10"
            value={numVariations}
            onChange={(e) => setNumVariations(parseInt(e.target.value))}
            className="flex-1"
          />
          <div className="text-lg font-semibold text-blue-600 min-w-[3rem] text-center">
            {numVariations}개
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          총 생성될 문제 수: {numVariations + 1}개 (원본 포함)
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={generateVariations}
        disabled={isGenerating}
        className={`
          w-full py-3 px-4 rounded-md font-medium text-white transition-colors
          ${isGenerating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
          }
        `}
      >
        {isGenerating ? '문제 생성 중...' : '변형 문제 생성'}
      </button>

      {/* 결과 */}
      {generatedProblems.length > 0 && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              생성 결과 ({generatedProblems.length}개)
            </h3>
            <button
              onClick={downloadTXT}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              TXT 다운로드
            </button>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            원본: {generatedProblems.filter(p => !p.isGenerated).length}개,
            변형: {generatedProblems.filter(p => p.isGenerated).length}개
          </div>

        </div>
      )}

      {/* 상세 문제 미리보기 섹션 */}
      {generatedProblems.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            📖 생성된 문제 상세 미리보기
          </h3>

          {/* 원본 문제 표시 */}
          {generatedProblems.filter(p => !p.isGenerated).map((originalProb) => (
            <div key={`original-${originalProb.sequence}`} className="mb-8">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-800">
                    📋 원본 문제
                  </h4>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {originalProb.sequence}
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-3 text-lg">【원본 문제】</h5>
                    <div className="bg-white p-6 rounded-lg border-2 border-gray-300 min-h-[150px]">
                      {originalProb.problemText ? (
                        <div className="text-lg leading-relaxed">
                          <MathRenderer content={originalProb.problemText} />
                        </div>
                      ) : originalProb.problemImage ? (
                        <Image
                          src={originalProb.problemImage}
                          alt="원본 문제 이미지"
                          width={800}
                          height={400}
                          className="rounded border object-contain max-w-full mx-auto"
                        />
                      ) : (
                        <p className="text-gray-500 text-center text-lg">문제 내용 없음</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-3 text-lg">【원본 해설】</h5>
                    <div className="bg-white p-6 rounded-lg border-2 border-gray-300 min-h-[150px]">
                      {originalProb.solutionText ? (
                        <div className="text-lg leading-relaxed">
                          <MathRenderer content={originalProb.solutionText} />
                        </div>
                      ) : originalProb.solutionImage ? (
                        <Image
                          src={originalProb.solutionImage}
                          alt="원본 해설 이미지"
                          width={800}
                          height={400}
                          className="rounded border object-contain max-w-full mx-auto"
                        />
                      ) : (
                        <p className="text-gray-500 text-center text-lg">해설 내용 없음</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 해당 원본에서 생성된 변형 문제들 */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-blue-800 flex items-center">
                  🔄 변형된 문제들
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {generatedProblems.filter(p => p.isGenerated).length}개
                  </span>
                </h4>

                {generatedProblems
                  .filter(p => p.isGenerated)
                  .map((variantProb, variantIndex) => (
                    <div key={`variant-${variantProb.sequence}`}
                         className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-blue-800">
                          📝 {variantProb.sequence}
                        </h5>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          변형 {variantIndex + 1}
                        </span>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h6 className="font-medium text-blue-700 mb-3 text-lg">【변형된 문제】</h6>
                          <div className="bg-white p-6 rounded-lg border-2 border-blue-200 min-h-[150px]">
                            {variantProb.problemText ? (
                              <div className="text-lg leading-relaxed">
                                <MathRenderer content={variantProb.problemText} />
                              </div>
                            ) : variantProb.problemImage ? (
                              <Image
                                src={variantProb.problemImage}
                                alt="변형 문제 이미지"
                                width={800}
                                height={400}
                                className="rounded border object-contain max-w-full mx-auto"
                              />
                            ) : (
                              <p className="text-gray-500 text-center text-lg">변형된 문제 없음</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <h6 className="font-medium text-blue-700 mb-3 text-lg">【변형된 해설】</h6>
                          <div className="bg-white p-6 rounded-lg border-2 border-blue-200 min-h-[150px]">
                            {variantProb.solutionText ? (
                              <div className="text-lg leading-relaxed">
                                <MathRenderer content={variantProb.solutionText} />
                              </div>
                            ) : variantProb.solutionImage ? (
                              <Image
                                src={variantProb.solutionImage}
                                alt="변형 해설 이미지"
                                width={800}
                                height={400}
                                className="rounded border object-contain max-w-full mx-auto"
                              />
                            ) : (
                              <p className="text-gray-500 text-center text-lg">변형된 해설 없음</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 변형 포인트 하이라이트 */}
                      {variantProb.problemText && originalProb.problemText && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="text-xs text-yellow-800">
                            💡 <strong>변형 포인트:</strong> 문제 내 숫자들이 자동으로 변형되어 새로운 계산 값을 가집니다.
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* 문제 비교 도구 */}
          {generatedProblems.length > 1 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2 text-green-800">
                <span className="text-lg">🎯</span>
                <div>
                  <strong>생성 완료!</strong>
                  <p className="text-sm mt-1">
                    원본 1개 문제에서 {generatedProblems.filter(p => p.isGenerated).length}개의 변형 문제가 생성되었습니다.
                    각 변형 문제는 동일한 패턴이지만 다른 숫자 값을 사용합니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
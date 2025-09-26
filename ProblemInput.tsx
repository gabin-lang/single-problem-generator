'use client';

import { useState, useRef } from 'react';
import { SingleProblem } from '@/app/page';
import Image from 'next/image';
import Tesseract from 'tesseract.js';

interface ProblemInputProps {
  onSubmit: (problem: SingleProblem) => void;
  isLoading: boolean;
}

export default function ProblemInput({ onSubmit, isLoading }: ProblemInputProps) {
  const [problemText, setProblemText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [problemImage, setProblemImage] = useState<string | null>(null);
  const [solutionImage, setSolutionImage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [ocrStatus, setOcrStatus] = useState<{
    problem: 'idle' | 'processing' | 'completed' | 'error';
    solution: 'idle' | 'processing' | 'completed' | 'error';
  }>({ problem: 'idle', solution: 'idle' });
  const [ocrConfidence, setOcrConfidence] = useState<{
    problem: number;
    solution: number;
  }>({ problem: 0, solution: 0 });
  const [extractedText, setExtractedText] = useState<{
    problem: string;
    solution: string;
  }>({ problem: '', solution: '' });

  const problemFileRef = useRef<HTMLInputElement>(null);
  const solutionFileRef = useRef<HTMLInputElement>(null);

  // 이미지를 base64로 변환하는 함수
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // 이미지 전처리 함수 (오류 처리 강화)
  const preprocessImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new window.Image();

        img.onerror = () => {
          console.warn('이미지 로드 실패, 원본 파일 사용');
          resolve(file);
        };

        img.onload = () => {
          try {
            // 이미지 크기 검증
            if (!img.width || !img.height || img.width > 5000 || img.height > 5000) {
              console.warn('이미지 크기가 부적절합니다, 원본 파일 사용');
              resolve(file);
              return;
            }

            // 수학 문제 OCR에 최적화된 크기 설정 (더 큰 해상도)
            const scale = Math.min(3, 3000 / Math.max(img.width, img.height)); // 최대 3000px로 증가
            canvas.width = Math.floor(img.width * scale);
            canvas.height = Math.floor(img.height * scale);

            if (!ctx) {
              console.warn('캔버스 컨텍스트 생성 실패, 원본 파일 사용');
              resolve(file);
              return;
            }

            // 고품질 이미지 렌더링 설정
            ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in ctx) {
              ctx.imageSmoothingQuality = 'high';
            }

            // 배경을 흰색으로 설정
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 이미지를 확대하여 그리기
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 수학 문제에 최적화된 이미지 처리
            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;

              // 1단계: 히스토그램 기반 적응적 임계값 계산
              const histogram = new Array(256).fill(0);
              const pixels = [];

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                histogram[gray]++;
                pixels.push(gray);
              }

              // Otsu 임계값 계산 (더 정확한 이진화)
              const totalPixels = pixels.length;
              let sum = 0;
              for (let i = 0; i < 256; i++) {
                sum += i * histogram[i];
              }

              let sumB = 0;
              let wB = 0;
              let wF = 0;
              let mB = 0;
              let mF = 0;
              let max = 0.0;
              let between = 0.0;
              let threshold1 = 0.0;

              for (let i = 0; i < 256; i++) {
                wB += histogram[i];
                if (wB === 0) continue;

                wF = totalPixels - wB;
                if (wF === 0) break;

                sumB += i * histogram[i];
                mB = sumB / wB;
                mF = (sum - sumB) / wF;

                between = wB * wF * (mB - mF) * (mB - mF);

                if (between > max) {
                  max = between;
                  threshold1 = i;
                }
              }

              // 2단계: 적응적 임계값 적용 및 노이즈 제거
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // 그레이스케일 변환
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                // 적응적 임계값 사용
                let newValue;
                if (gray > threshold1 * 1.1) {
                  newValue = 255; // 배경 (흰색)
                } else if (gray < threshold1 * 0.9) {
                  newValue = 0;   // 텍스트 (검은색)
                } else {
                  // 중간값은 더 세밀하게 처리
                  newValue = gray > threshold1 ? 255 : 0;
                }

                data[i] = newValue;     // R
                data[i + 1] = newValue; // G
                data[i + 2] = newValue; // B
                // Alpha는 그대로 유지
              }

              ctx.putImageData(imageData, 0, 0);

              // 3단계: 추가 선명화 필터 적용
              ctx.filter = 'contrast(1.2) brightness(1.1)';
              ctx.drawImage(canvas, 0, 0);
              ctx.filter = 'none';
            } catch (imageProcessError) {
              console.warn('이미지 처리 실패, 원본 이미지 사용:', imageProcessError);
              // 처리 실패 시 원본 이미지 다시 그리기
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }

            // 처리된 이미지를 파일로 변환
            canvas.toBlob((blob) => {
              if (blob) {
                const processedFile = new File([blob], `processed_${file.name}`, {
                  type: 'image/png',
                  lastModified: Date.now()
                });
                resolve(processedFile);
              } else {
                console.warn('Blob 생성 실패, 원본 파일 사용');
                resolve(file);
              }
            }, 'image/png', 0.9);
          } catch (processError) {
            console.warn('이미지 전처리 실패, 원본 파일 사용:', processError);
            resolve(file);
          } finally {
            // 메모리 정리
            URL.revokeObjectURL(img.src);
          }
        };

        // 이미지 로드 시작
        const imageUrl = URL.createObjectURL(file);
        img.src = imageUrl;

        // 타임아웃 설정 (10초)
        setTimeout(() => {
          console.warn('이미지 전처리 타임아웃, 원본 파일 사용');
          URL.revokeObjectURL(imageUrl);
          resolve(file);
        }, 10000);

      } catch (error) {
        console.warn('이미지 전처리 초기화 실패, 원본 파일 사용:', error);
        resolve(file);
      }
    });
  };

  // OCR로 텍스트 추출하는 함수 (오류 처리 강화 및 단순화)
  const extractTextFromImage = async (file: File, type: 'problem' | 'solution') => {
    try {
      setOcrStatus(prev => ({ ...prev, [type]: 'processing' }));
      console.log(`OCR ${type} 시작`);

      // 이미지 전처리 (오류 시 원본 사용)
      let processedFile: File;
      try {
        processedFile = await preprocessImage(file);
        console.log(`이미지 전처리 완료: ${processedFile.name}`);
      } catch (preprocessError) {
        console.warn('이미지 전처리 실패, 원본 사용:', preprocessError);
        processedFile = file;
      }

      // 수학 문제에 최적화된 OCR 설정들
      const ocrConfigs = [
        {
          name: '수학+한영(PSM_6)',
          lang: 'kor+eng',
          options: {
            tessedit_pageseg_mode: '6', // 단일 블록 텍스트
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz가-힣()[]{}+-×÷=.,?!:;/$%^&*<>≤≥±∞π√∑∫αβγδθλμσφχψω', // 수학 기호 포함
            preserve_interword_spaces: '1'
          }
        },
        {
          name: '수학+한영(PSM_8)',
          lang: 'kor+eng',
          options: {
            tessedit_pageseg_mode: '8', // 단일 단어
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz가-힣()[]{}+-×÷=.,?!:;/$%^&*<>≤≥±∞π√∑∫αβγδθλμσφχψω',
            preserve_interword_spaces: '1'
          }
        },
        {
          name: '수학+영어(PSM_6)',
          lang: 'eng',
          options: {
            tessedit_pageseg_mode: '6',
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz()[]{}+-×÷=.,?!:;/$%^&*<>≤≥±∞π√∑∫αβγδθλμσφχψω',
            preserve_interword_spaces: '1'
          }
        },
        {
          name: '한국어(PSM_3)',
          lang: 'kor',
          options: {
            tessedit_pageseg_mode: '3', // 완전 자동 페이지 분할
            preserve_interword_spaces: '1'
          }
        },
        {
          name: '기본설정',
          lang: 'kor+eng',
          options: {
            preserve_interword_spaces: '1'
          }
        }
      ];

      let bestResult = '';
      let bestConfidence = 0;

      for (const config of ocrConfigs) {
        try {
          console.log(`OCR ${type} 시도: ${config.name}`);

          const result = await Tesseract.recognize(processedFile, config.lang, {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`OCR ${type} (${config.name}) 진행률: ${(m.progress * 100).toFixed(1)}%`);
              }
            },
            ...config.options
          });

          const text = result.data.text?.trim() || '';
          const confidence = result.data.confidence || 0;

          console.log(`OCR ${type} (${config.name}) 결과:`, {
            textLength: text.length,
            confidence: confidence.toFixed(1),
            preview: text.substring(0, 30) + '...'
          });

          // 더 나은 결과인지 판단
          if ((confidence > bestConfidence) ||
              (confidence > 50 && text.length > bestResult.length)) {
            bestResult = text;
            bestConfidence = confidence;
            console.log(`새로운 최적 결과: ${config.name} (신뢰도: ${confidence.toFixed(1)}%)`);
          }

          // 충분히 좋은 결과면 중단
          if (confidence > 80 && text.length > 5) {
            console.log(`만족스러운 결과 획득, 추가 시도 중단`);
            break;
          }

        } catch (configError) {
          console.warn(`OCR ${type} (${config.name}) 실패:`, configError);
          continue; // 다음 설정으로 계속
        }
      }

      // 수학 문제에 특화된 텍스트 후처리
      let cleanedText = bestResult;

      if (cleanedText) {
        try {
          cleanedText = cleanedText
            // 기본 정리
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\s+/g, ' ')

            // 수학 기호 정리
            .replace(/([0-9])\s+([0-9])/g, '$1$2') // 숫자 사이 공백 제거
            .replace(/([0-9])\s*([+\-×÷=])\s*([0-9])/g, '$1$2$3') // 연산자 주변 공백 정리
            .replace(/\(\s+/g, '(') // 괄호 안쪽 공백 제거
            .replace(/\s+\)/g, ')') // 괄호 안쪽 공백 제거
            .replace(/\[\s+/g, '[') // 대괄호 안쪽 공백 제거
            .replace(/\s+\]/g, ']') // 대괄호 안쪽 공백 제거

            // LaTeX 수식 정리
            .replace(/\$\s+/g, '$') // $ 기호 뒤 공백 제거
            .replace(/\s+\$/g, '$') // $ 기호 앞 공백 제거
            .replace(/\\\s+/g, '\\') // 백슬래시 뒤 공백 제거
            .replace(/\{\s+/g, '{') // 중괄호 안쪽 공백 제거
            .replace(/\s+\}/g, '}') // 중괄호 안쪽 공백 제거

            // 한국어 수학 용어 정리
            .replace(/문 제/g, '문제')
            .replace(/해 설/g, '해설')
            .replace(/정 답/g, '정답')
            .replace(/풀 이/g, '풀이')
            .replace(/계 산/g, '계산')

            // 분수 표기 정리
            .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2')
            .replace(/(\d+)\s*분\s*의\s*(\d+)/g, '$2/$1')

            // 지수 표기 정리
            .replace(/\^\s*\{/g, '^{')
            .replace(/\^\s*([0-9])/g, '^$1')

            // 최종 정리
            .replace(/\s+/g, ' ')
            .trim();

          console.log(`텍스트 후처리 완료: "${cleanedText.substring(0, 100)}..."`);
        } catch (cleanError) {
          console.warn('텍스트 후처리 실패, 원본 사용:', cleanError);
        }
      }

      // 최소한의 결과라도 있어야 함
      if (!cleanedText) {
        throw new Error('OCR 결과가 비어있습니다.');
      }

      setExtractedText(prev => ({ ...prev, [type]: cleanedText }));
      setOcrConfidence(prev => ({ ...prev, [type]: bestConfidence }));
      setOcrStatus(prev => ({ ...prev, [type]: 'completed' }));

      console.log(`OCR ${type} 최종 완료:`, {
        confidence: bestConfidence.toFixed(1),
        textLength: cleanedText.length,
        preview: cleanedText.substring(0, 50) + '...'
      });

      return cleanedText;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`OCR ${type} 전체 실패:`, error);

      // 사용자에게 더 구체적인 오류 메시지 제공
      setExtractedText(prev => ({
        ...prev,
        [type]: `OCR 처리 실패: ${errorMessage}\n\n수동으로 텍스트를 입력해주세요.`
      }));
      setOcrConfidence(prev => ({ ...prev, [type]: 0 }));
      setOcrStatus(prev => ({ ...prev, [type]: 'error' }));

      return ''; // 빈 문자열 반환 (오류를 throw하지 않음)
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'problem' | 'solution'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`이미지 업로드 시작: ${file.name} (${file.size} bytes)`);

    // 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.\n지원 형식: JPG, PNG, GIF, WebP');
      return;
    }

    // 파일 크기 검사 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 사용해주세요.');
      return;
    }

    try {
      // 미리보기용 base64 생성
      console.log('이미지를 base64로 변환 중...');
      const base64 = await convertToBase64(file);

      // 상태 업데이트
      if (type === 'problem') {
        setProblemImage(base64);
      } else {
        setSolutionImage(base64);
      }

      console.log('이미지 미리보기 설정 완료');

      // OCR 처리 시작 (비동기로 실행하되 오류가 발생해도 계속 진행)
      console.log('OCR 처리 시작...');
      try {
        await extractTextFromImage(file, type);
      } catch (ocrError) {
        console.warn('OCR 처리 실패하지만 이미지는 유지:', ocrError);
        // OCR 실패해도 이미지는 그대로 두고 사용자에게 알림
        alert('텍스트 인식에 실패했습니다.\n이미지는 그대로 사용하거나, 텍스트 모드로 전환하여 직접 입력해주세요.');
      }

    } catch (error) {
      console.error('이미지 업로드 처리 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`이미지 업로드 중 오류가 발생했습니다:\n${errorMessage}\n\n다른 이미지를 시도하거나 텍스트 모드를 사용해주세요.`);

      // 오류 발생 시 상태 초기화
      if (type === 'problem') {
        setProblemImage(null);
        setOcrStatus(prev => ({ ...prev, problem: 'idle' }));
        setExtractedText(prev => ({ ...prev, problem: '' }));
        setOcrConfidence(prev => ({ ...prev, problem: 0 }));
      } else {
        setSolutionImage(null);
        setOcrStatus(prev => ({ ...prev, solution: 'idle' }));
        setExtractedText(prev => ({ ...prev, solution: '' }));
        setOcrConfidence(prev => ({ ...prev, solution: 0 }));
      }
    }
  };

  const handleSubmit = () => {
    if (inputMode === 'text') {
      if (!problemText.trim() || !solutionText.trim()) {
        alert('문제와 해설을 모두 입력해주세요.');
        return;
      }
    } else {
      if (!problemImage || !solutionImage) {
        alert('문제와 해설 이미지를 모두 업로드해주세요.');
        return;
      }
      if (ocrStatus.problem !== 'completed' || ocrStatus.solution !== 'completed') {
        alert('이미지에서 텍스트를 추출하는 중입니다. 잠시 기다려주세요.');
        return;
      }
    }

    const problemData: SingleProblem = {
      // 이미지 모드에서는 OCR로 추출된 텍스트 사용
      problemText: inputMode === 'text' ? problemText : extractedText.problem,
      problemImage: inputMode === 'image' ? problemImage : null,
      solutionText: inputMode === 'text' ? solutionText : extractedText.solution,
      solutionImage: inputMode === 'image' ? solutionImage : null,
    };

    onSubmit(problemData);
  };

  const resetInputs = () => {
    setProblemText('');
    setSolutionText('');
    setProblemImage(null);
    setSolutionImage(null);
    setOcrStatus({ problem: 'idle', solution: 'idle' });
    setOcrConfidence({ problem: 0, solution: 0 });
    setExtractedText({ problem: '', solution: '' });
    if (problemFileRef.current) problemFileRef.current.value = '';
    if (solutionFileRef.current) solutionFileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 입력 모드 선택 */}
      <div className="flex space-x-4 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setInputMode('text')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            inputMode === 'text'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          텍스트 입력
        </button>
        <button
          onClick={() => setInputMode('image')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            inputMode === 'image'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          이미지 업로드
        </button>
      </div>

      {inputMode === 'text' ? (
        /* 텍스트 입력 모드 */
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문제 내용
            </label>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="문제를 입력하세요 (LaTeX 수식 지원: $...$, $$...$$)"
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              예시: 다음은 근의 공식을 이용하여 이차방정식 $31x^{2}+96x-50=0$의 해를 구하는 과정이다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              해설 내용
            </label>
            <textarea
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              placeholder="해설을 입력하세요 (LaTeX 수식 지원: $...$, $$...$$)"
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              예시: 따라서 $\square$ 안에 알맞은 수는 $96^{2}=9216$이다
            </p>
          </div>
        </div>
      ) : (
        /* 이미지 업로드 모드 */
        <div className="space-y-4">
          {/* 문제 이미지 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문제 이미지
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => problemFileRef.current?.click()}
            >
              {problemImage ? (
                <div className="space-y-2">
                  <div className="relative mx-auto max-w-md">
                    <Image
                      src={problemImage}
                      alt="문제 이미지"
                      width={400}
                      height={200}
                      className="rounded-md object-contain max-h-32"
                    />
                  </div>

                  {/* OCR 상태 표시 */}
                  <div className="text-sm">
                    {ocrStatus.problem === 'processing' && (
                      <p className="text-blue-600">🔍 텍스트 인식 중... (다중 엔진 시도)</p>
                    )}
                    {ocrStatus.problem === 'completed' && (
                      <div className="space-y-1">
                        <p className="text-green-600">✅ 텍스트 인식 완료</p>
                        <p className={`text-xs ${ocrConfidence.problem > 80 ? 'text-green-600' : ocrConfidence.problem > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          신뢰도: {ocrConfidence.problem.toFixed(1)}%
                          {ocrConfidence.problem < 70 && ' (낮음 - 수동 확인 권장)'}
                        </p>
                      </div>
                    )}
                    {ocrStatus.problem === 'error' && (
                      <p className="text-red-600">❌ 텍스트 인식 실패</p>
                    )}
                  </div>

                  {/* 추출된 텍스트 편집 */}
                  {extractedText.problem && (
                    <div className="mt-2 p-2 bg-gray-50 border rounded text-xs">
                      <div className="flex justify-between items-center mb-2">
                        <strong>추출된 텍스트 (편집 가능):</strong>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newText = prompt('텍스트를 수정하세요:', extractedText.problem);
                            if (newText !== null) {
                              setExtractedText(prev => ({ ...prev, problem: newText }));
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️ 편집
                        </button>
                      </div>
                      <textarea
                        value={extractedText.problem}
                        onChange={(e) => setExtractedText(prev => ({ ...prev, problem: e.target.value }))}
                        className="w-full h-16 p-1 text-xs border rounded resize-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProblemImage(null);
                      setOcrStatus(prev => ({ ...prev, problem: 'idle' }));
                      setOcrConfidence(prev => ({ ...prev, problem: 0 }));
                      setExtractedText(prev => ({ ...prev, problem: '' }));
                      if (problemFileRef.current) problemFileRef.current.value = '';
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    이미지 제거
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-600">문제 이미지를 클릭하여 업로드하세요</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF 지원</p>
                </div>
              )}
            </div>
            <input
              ref={problemFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'problem')}
              className="hidden"
            />
          </div>

          {/* 해설 이미지 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              해설 이미지
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => solutionFileRef.current?.click()}
            >
              {solutionImage ? (
                <div className="space-y-2">
                  <div className="relative mx-auto max-w-md">
                    <Image
                      src={solutionImage}
                      alt="해설 이미지"
                      width={400}
                      height={200}
                      className="rounded-md object-contain max-h-32"
                    />
                  </div>

                  {/* OCR 상태 표시 */}
                  <div className="text-sm">
                    {ocrStatus.solution === 'processing' && (
                      <p className="text-blue-600">🔍 텍스트 인식 중... (다중 엔진 시도)</p>
                    )}
                    {ocrStatus.solution === 'completed' && (
                      <div className="space-y-1">
                        <p className="text-green-600">✅ 텍스트 인식 완료</p>
                        <p className={`text-xs ${ocrConfidence.solution > 80 ? 'text-green-600' : ocrConfidence.solution > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          신뢰도: {ocrConfidence.solution.toFixed(1)}%
                          {ocrConfidence.solution < 70 && ' (낮음 - 수동 확인 권장)'}
                        </p>
                      </div>
                    )}
                    {ocrStatus.solution === 'error' && (
                      <p className="text-red-600">❌ 텍스트 인식 실패</p>
                    )}
                  </div>

                  {/* 추출된 텍스트 편집 */}
                  {extractedText.solution && (
                    <div className="mt-2 p-2 bg-gray-50 border rounded text-xs">
                      <div className="flex justify-between items-center mb-2">
                        <strong>추출된 텍스트 (편집 가능):</strong>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newText = prompt('텍스트를 수정하세요:', extractedText.solution);
                            if (newText !== null) {
                              setExtractedText(prev => ({ ...prev, solution: newText }));
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️ 편집
                        </button>
                      </div>
                      <textarea
                        value={extractedText.solution}
                        onChange={(e) => setExtractedText(prev => ({ ...prev, solution: e.target.value }))}
                        className="w-full h-16 p-1 text-xs border rounded resize-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSolutionImage(null);
                      setOcrStatus(prev => ({ ...prev, solution: 'idle' }));
                      setOcrConfidence(prev => ({ ...prev, solution: 0 }));
                      setExtractedText(prev => ({ ...prev, solution: '' }));
                      if (solutionFileRef.current) solutionFileRef.current.value = '';
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    이미지 제거
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-600">해설 이미지를 클릭하여 업로드하세요</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF 지원</p>
                </div>
              )}
            </div>
            <input
              ref={solutionFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'solution')}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* 제출 버튼 */}
      <div className="flex space-x-4">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`
            flex-1 py-3 px-4 rounded-md font-medium text-white transition-colors
            ${isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }
          `}
        >
          {isLoading ? '처리중...' : '문제 등록'}
        </button>

        <button
          onClick={resetInputs}
          disabled={isLoading}
          className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  );
}
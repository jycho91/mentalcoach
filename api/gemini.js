// Vercel Serverless Function: Gemini 2.0 Flash 프록시
// 엔드포인트: POST /api/gemini
// 요청 바디: { prompt: string, systemPrompt?: string, responseMimeType?: string }
// 응답: Gemini API 원본 응답을 그대로 전달

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 메서드만 허용됩니다.' });
  }

  try {
    const { prompt, systemPrompt, responseMimeType } = req.body || {};

    // 입력 검증
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt(문자열)가 필요합니다.' });
    }
    if (systemPrompt !== undefined && typeof systemPrompt !== 'string') {
      return res.status(400).json({ error: 'systemPrompt는 문자열이어야 합니다.' });
    }

    // API 키 확인
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.',
      });
    }

    // Gemini 요청 바디 구성
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    // systemPrompt가 있으면 systemInstruction으로 전달
    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    // JSON 응답 요청 옵션
    if (responseMimeType) {
      requestBody.generationConfig = {
        responseMimeType,
      };
    }

    // Gemini 2.0 Flash 호출
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // Gemini가 에러를 준 경우
    if (!geminiRes.ok) {
      let errorDetail;
      try {
        errorDetail = await geminiRes.json();
      } catch {
        errorDetail = await geminiRes.text();
      }
      return res.status(geminiRes.status).json({
        error: 'Gemini API 호출 실패',
        status: geminiRes.status,
        detail: errorDetail,
      });
    }

    // 성공 응답을 그대로 전달
    const data = await geminiRes.json();
    return res.status(200).json(data);
  } catch (err) {
    // 네트워크 오류, 파싱 오류 등
    return res.status(500).json({
      error: '서버 내부 오류',
      detail: err?.message || String(err),
    });
  }
}

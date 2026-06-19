import { NextResponse } from 'next/server';
import { parseEmailContent } from '@/lib/aiParser';
import { appendSheetData } from '@/lib/googleSheets';

function getJstDate() {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

export async function POST(request: Request) {
  try {
    // Depending on the email webhook provider (SendGrid, Postmark, etc.),
    // the payload format varies. Here we handle a generic JSON payload for testing.
    
    let subject = 'No Subject';
    let text = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      subject = (formData.get('subject') as string) || '';
      text = (formData.get('text') as string) || '';
    } else {
      const payload = await request.json();
      subject = payload.subject || '';
      text = payload.text || '';
    }

    if (!text) {
      return NextResponse.json({ error: 'No email body found' }, { status: 400 });
    }

    // 1. AIによるメール解析
    const parsedData = await parseEmailContent(subject, text);
    
    if (!parsedData || !parsedData.targetSheet || !parsedData.data) {
      throw new Error('AI returned invalid format');
    }

    // 2. Googleスプレッドシートへの反映
    await appendSheetData(parsedData.targetSheet, parsedData.data);

    // 3. 受信ログへの記録（成功）
    await appendSheetData('受信ログ', {
      '受信日時': getJstDate(),
      '件名': subject,
      '解析ステータス': '完了',
      '反映先': parsedData.targetSheet,
      'エラー内容': '-'
    });

    return NextResponse.json({ success: true, parsedData });
  } catch (error: any) {
    console.error('Webhook error:', error);
    
    // エラー時の受信ログへの記録（失敗）
    // ※ subjectが取得できていないケースも考慮
    try {
      await appendSheetData('受信ログ', {
        '受信日時': getJstDate(),
        '件名': 'エラー発生時の件名不明',
        '解析ステータス': 'エラー',
        '反映先': '-',
        'エラー内容': error.message || String(error)
      });
    } catch (logError) {
      console.error('Failed to write error log:', logError);
    }

    return NextResponse.json({ error: 'Internal Server Error', details: error.message || String(error) }, { status: 500 });
  }
}

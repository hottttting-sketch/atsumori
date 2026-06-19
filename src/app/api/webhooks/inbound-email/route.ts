import { NextResponse } from 'next/server';
import { parseEmailContent } from '@/lib/aiParser';
import { appendSheetData } from '@/lib/googleSheets';

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

    // Note: To show logs in the UI, we would typically save this result to a Database 
    // or a dedicated "Logs" sheet.

    return NextResponse.json({ success: true, parsedData });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message || String(error) }, { status: 500 });
  }
}

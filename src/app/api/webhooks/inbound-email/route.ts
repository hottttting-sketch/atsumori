import { NextResponse } from 'next/server';
import { parseEmailContent } from '@/lib/aiParser';
import { appendSheetData, getSheetData, updateSheetRow } from '@/lib/googleSheets';

function getJstDate() {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

export async function POST(request: Request) {
  try {
    // Depending on the email webhook provider (SendGrid, Postmark, etc.),
    // the payload format varies. Here we handle a generic JSON payload for testing.
    
    let subject = 'No Subject';
    let text = '';
    let file: File | undefined = undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      subject = (formData.get('subject') as string) || '';
      text = (formData.get('text') as string) || '';
      
      const fileEntry = formData.get('file');
      if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry) {
        file = fileEntry as File;
      }
    } else {
      const payload = await request.json();
      subject = payload.subject || '';
      text = payload.text || '';
    }

    if (!text) {
      return NextResponse.json({ error: 'No email body found' }, { status: 400 });
    }

    // 1. AIによるメール解析（添付ファイル対応）
    const parsedData = await parseEmailContent(subject, text, file);
    
    if (!parsedData || !parsedData.targetSheet || !parsedData.data) {
      throw new Error('AI returned invalid format');
    }

    // 2. Googleスプレッドシートへの反映
    const targetSheet = parsedData.targetSheet;
    const items = Array.isArray(parsedData.data) ? parsedData.data : [parsedData.data];
    
    // 裏数字が含まれているかチェック
    const hasBackEndFigures = items.some((item: any) => item['ＲＮＢ'] || item['ＩＴＶ'] || item['ＥＢＣ'] || item['ｅａｔ']);
    
    let existingSheetData: any[] = [];
    if (hasBackEndFigures) {
      existingSheetData = await getSheetData(targetSheet);
    }

    for (const item of items) {
      const itemHasFigures = item['ＲＮＢ'] || item['ＩＴＶ'] || item['ＥＢＣ'] || item['ｅａｔ'];
      
      if (!itemHasFigures) {
        // 通常の見積（裏数字なし）：裏数字列を強制的に空にして新規追加
        item['ＲＮＢ'] = '';
        item['ＩＴＶ'] = '';
        item['ＥＢＣ'] = '';
        item['ｅａｔ'] = '';
        await appendSheetData(targetSheet, item);
      } else {
        // 裏数字が含まれる場合、既存行を探す
        const match = existingSheetData.find(row => {
          const sameMonth = row['開始月'] === item['開始月'];
          if (!sameMonth) return false;
          
          const itemAd = String(item['広告主'] || '');
          const itemContract = String(item['契約名'] || '');
          const rowAd = String(row['広告主'] || '');
          const rowContract = String(row['契約名'] || '');
          
          const matchAd = itemAd && rowAd && (rowAd.includes(itemAd) || itemAd.includes(rowAd));
          const matchContract = itemContract && rowContract && (rowContract.includes(itemContract) || itemContract.includes(rowContract));
          
          return matchAd || matchContract;
        });

        if (match) {
          // 既存の見積が見つかった場合：裏数字のみを上書き更新
          const updatedRow = { ...match };
          updatedRow['ＲＮＢ'] = item['ＲＮＢ'] || match['ＲＮＢ'] || '';
          updatedRow['ＩＴＶ'] = item['ＩＴＶ'] || match['ＩＴＶ'] || '';
          updatedRow['ＥＢＣ'] = item['ＥＢＣ'] || match['ＥＢＣ'] || '';
          updatedRow['ｅａｔ'] = item['ｅａｔ'] || match['ｅａｔ'] || '';
          
          await updateSheetRow(targetSheet, match.rowIndex, updatedRow);
        } else {
          // 見つからなかった場合は新規追加
          await appendSheetData(targetSheet, item);
        }
      }
    }

    const rowCount = Array.isArray(parsedData.data) ? parsedData.data.length : 1;

    // 3. 受信ログへの記録（成功）
    await appendSheetData('受信ログ', {
      '受信日時': getJstDate(),
      '件名': subject,
      '解析ステータス': `完了（${rowCount}行）`,
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

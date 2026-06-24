import { NextResponse } from 'next/server';
import { parseEmailContent } from '@/lib/aiParser';
import { appendSheetData, getSheetData, updateSheetRow } from '@/lib/googleSheets';

function getJstDate() {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

export const maxDuration = 60; // Allow up to 60 seconds for execution

export async function POST(request: Request) {
  try {
    // Depending on the email webhook provider (SendGrid, Postmark, etc.),
    // the payload format varies. Here we handle a generic JSON payload for testing.
    
    let subject = 'No Subject';
    let text = '';
    const files: File[] = [];

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      subject = (formData.get('subject') as string) || '';
      text = (formData.get('text') as string) || '';
      
      for (let i = 0; i < 5; i++) {
        const fileEntry = formData.get(`file${i}`);
        if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry) {
          files.push(fileEntry as File);
        }
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
    const parsedData = await parseEmailContent(subject, text, files);
    
    if (!parsedData || !parsedData.data) {
      throw new Error('AI returned invalid format');
    }

    const items = Array.isArray(parsedData.data) ? parsedData.data : [parsedData.data];
    
    const sheetDataCache: { [sheetName: string]: any[] } = {};

    // 2. Googleスプレッドシートへの反映
    for (const item of items) {
      const targetSheet = item.targetSheet;
      if (!targetSheet) {
        console.warn('Item missing targetSheet, skipping:', item);
        continue;
      }

      const itemHasFigures = item['ＲＮＢ'] || item['ＩＴＶ'] || item['ＥＢＣ'] || item['ｅａｔ'];
      
      if (!itemHasFigures) {
        // 通常の見積（裏数字なし）：裏数字列を強制的に空にして新規追加
        item['ＲＮＢ'] = '';
        item['ＩＴＶ'] = '';
        item['ＥＢＣ'] = '';
        item['ｅａｔ'] = '';
        await appendSheetData(targetSheet, item);
      } else {
        // 裏数字が含まれる場合、キャッシュから既存行を探す
        if (!sheetDataCache[targetSheet]) {
          sheetDataCache[targetSheet] = await getSheetData(targetSheet);
        }
        const existingSheetData = sheetDataCache[targetSheet];

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

    const rowCount = items.length;
    const targetSheetsUsed = Array.from(new Set(items.map((i: any) => i.targetSheet).filter(Boolean))).join(', ') || '-';

    // 3. 受信ログへの記録（成功）
    await appendSheetData('受信ログ', {
      '受信日時': getJstDate(),
      '件名': subject,
      '解析ステータス': `完了（${rowCount}行）`,
      '反映先': targetSheetsUsed,
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
